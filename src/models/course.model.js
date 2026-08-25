const db = require('../config/db')
const { makeId } = require('../utils/id')
const { ensureSchema: ensureMasterDataSchema, resolveOptionId } = require('./masterData.model')

const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const optionMeta = (row, prefix, type) => {
  if (!row[`${prefix}_option_id`]) return null
  return {
    id: row[`${prefix}_option_id`],
    type,
    name: row[prefix],
    status: row[`${prefix}_option_status`],
    creatorRole: row[`${prefix}_creator_role`],
    createdBy: row[`${prefix}_created_by`]
      ? {
          id: row[`${prefix}_created_by`],
          name: row[`${prefix}_creator_name`],
          email: row[`${prefix}_creator_email`],
          role: row[`${prefix}_creator_user_role`] || row[`${prefix}_creator_role`],
        }
      : null,
  }
}

const mapCourse = async (row) => {
  if (!row) return null
  const [requirements, outcomes] = await Promise.all([
    db.query('SELECT requirement_text FROM course_requirements WHERE course_id = ? ORDER BY sort_order, id', [row.id]),
    db.query('SELECT outcome_text FROM course_outcomes WHERE course_id = ? ORDER BY sort_order, id', [row.id]),
  ])
  return {
    id: row.id,
    coachId: row.coach_id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    difficulty: row.difficulty,
    language: row.language,
    categoryMeta: optionMeta(row, 'category', 'category'),
    difficultyMeta: optionMeta(row, 'difficulty', 'difficulty'),
    languageMeta: optionMeta(row, 'language', 'language'),
    description: row.description,
    requirements: requirements.map((item) => item.requirement_text),
    outcomes: outcomes.map((item) => item.outcome_text),
    price: Number(row.price || 0),
    currency: row.currency,
    status: row.status,
    thumbnailUrl: row.thumbnail_url || '',
    promoVideo: row.promo_video || '',
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    students: Number(row.students || 0),
    revenue: Number(row.revenue || 0),
    coach: row.coach_id
      ? {
          id: row.coach_id,
          name: row.coach_name,
          email: row.coach_email,
          role: 'coach',
          title: row.coach_title,
        }
      : null,
    isEnrolled: Boolean(row.enrollment_id),
    enrollment: row.enrollment_id
      ? {
          id: row.enrollment_id,
          progress: Number(row.enrollment_progress || 0),
          status: row.enrollment_status,
          enrolledAt: row.enrolled_at,
        }
      : null,
  }
}

const baseSelect = `
  SELECT c.*,
         u.name AS coach_name, u.email AS coach_email, u.title AS coach_title,
         cat.id AS category_option_id, cat.status AS category_option_status, cat.created_by AS category_created_by, cat.creator_role AS category_creator_role,
         cat_user.name AS category_creator_name, cat_user.email AS category_creator_email, cat_user.role AS category_creator_user_role,
         diff.id AS difficulty_option_id, diff.status AS difficulty_option_status, diff.created_by AS difficulty_created_by, diff.creator_role AS difficulty_creator_role,
         diff_user.name AS difficulty_creator_name, diff_user.email AS difficulty_creator_email, diff_user.role AS difficulty_creator_user_role,
         lang.id AS language_option_id, lang.status AS language_option_status, lang.created_by AS language_created_by, lang.creator_role AS language_creator_role,
         lang_user.name AS language_creator_name, lang_user.email AS language_creator_email, lang_user.role AS language_creator_user_role,
         (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') AS students,
         (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.course_id = c.id AND p.status = 'success') AS revenue
  FROM courses c
  LEFT JOIN users u ON u.id = c.coach_id
  LEFT JOIN course_master_options cat ON cat.id = c.category_id
  LEFT JOIN users cat_user ON cat_user.id = cat.created_by
  LEFT JOIN course_master_options diff ON diff.id = c.difficulty_id
  LEFT JOIN users diff_user ON diff_user.id = diff.created_by
  LEFT JOIN course_master_options lang ON lang.id = c.language_id
  LEFT JOIN users lang_user ON lang_user.id = lang.created_by
`

const mapCourses = async (rows) => Promise.all(rows.map(mapCourse))

const attachStudentEnrollment = async (courses, studentId) => {
  if (!studentId || courses.length === 0) return courses
  const placeholders = courses.map(() => '?').join(', ')
  const rows = await db.query(
    `SELECT id, course_id, progress, status, enrolled_at
     FROM enrollments
     WHERE student_id = ? AND status = 'active' AND course_id IN (${placeholders})`,
    [studentId, ...courses.map((course) => course.id)]
  )
  const byCourse = new Map(rows.map((row) => [row.course_id, row]))
  return courses.map((course) => {
    const enrollment = byCourse.get(course.id)
    if (!enrollment) return { ...course, isEnrolled: false, enrollment: null }
    return {
      ...course,
      isEnrolled: true,
      enrollment: {
        id: enrollment.id,
        progress: Number(enrollment.progress || 0),
        status: enrollment.status,
        enrolledAt: enrollment.enrolled_at,
      },
    }
  })
}

const findById = async (id) => {
  await ensureMasterDataSchema()
  return mapCourse(await db.first(`${baseSelect} WHERE c.id = ?`, [id]))
}

const listAll = async () => {
  await ensureMasterDataSchema()
  return mapCourses(await db.query(`${baseSelect} ORDER BY c.created_at DESC`))
}

const listByCoach = async (coachId) => {
  await ensureMasterDataSchema()
  return mapCourses(await db.query(`${baseSelect} WHERE c.coach_id = ? ORDER BY c.created_at DESC`, [coachId]))
}

const listPublished = async (q = '', studentId = null) => {
  await ensureMasterDataSchema()
  const like = `%${q}%`
  const rows = q
    ? await db.query(
        `${baseSelect} WHERE c.status = 'published' AND (c.title LIKE ? OR c.category LIKE ? OR c.description LIKE ?) ORDER BY c.created_at DESC`,
        [like, like, like]
      )
    : await db.query(`${baseSelect} WHERE c.status = 'published' ORDER BY c.created_at DESC`)
  const courses = await mapCourses(rows)
  return attachStudentEnrollment(courses, studentId)
}

const normalizeInput = (body, existing = {}) => ({
  title: String(body.title ?? existing.title ?? '').trim(),
  category: String(body.category ?? existing.category ?? '').trim(),
  difficulty: String(body.difficulty ?? existing.difficulty ?? 'Beginner').trim(),
  language: String(body.language ?? existing.language ?? 'Hinglish').trim(),
  description: String(body.description ?? existing.description ?? '').trim(),
  requirements: toArray(body.requirements ?? existing.requirements),
  outcomes: toArray(body.outcomes ?? existing.outcomes),
  price: Number(body.price ?? existing.price ?? 999),
  currency: String(body.currency ?? existing.currency ?? 'INR').trim(),
  status: body.status || existing.status || 'draft',
  thumbnailUrl: body.thumbnailUrl ?? existing.thumbnailUrl ?? '',
  promoVideo: body.promoVideo ?? existing.promoVideo ?? '',
})

const saveRequirements = async (connection, courseId, requirements, outcomes) => {
  await connection.execute('DELETE FROM course_requirements WHERE course_id = ?', [courseId])
  await connection.execute('DELETE FROM course_outcomes WHERE course_id = ?', [courseId])
  for (const [index, text] of requirements.entries()) {
    await connection.execute(
      'INSERT INTO course_requirements (course_id, sort_order, requirement_text) VALUES (?, ?, ?)',
      [courseId, index + 1, text]
    )
  }
  for (const [index, text] of outcomes.entries()) {
    await connection.execute(
      'INSERT INTO course_outcomes (course_id, sort_order, outcome_text) VALUES (?, ?, ?)',
      [courseId, index + 1, text]
    )
  }
}

// Resolves the free-text category/difficulty/language onto a real course_master_options id
// (creating the option if it's brand new), so the course row is linked by id instead of
// relying on the text matching a master option's name at read time.
const resolveOptionIds = async (input) => {
  const [categoryId, difficultyId, languageId] = await Promise.all([
    resolveOptionId('category', input.category),
    resolveOptionId('difficulty', input.difficulty),
    resolveOptionId('language', input.language),
  ])
  return { categoryId, difficultyId, languageId }
}

const create = async (coachId, body) => {
  await ensureMasterDataSchema()
  const input = normalizeInput(body)
  const { categoryId, difficultyId, languageId } = await resolveOptionIds(input)
  const courseId = makeId('course')
  const slug = `${slugify(input.title)}-${Date.now()}`
  await db.withTransaction(async (connection) => {
    await connection.execute(
      `INSERT INTO courses
       (id, coach_id, title, slug, category, difficulty, language, category_id, difficulty_id, language_id, description, price, currency, status, thumbnail_url, promo_video, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        coachId,
        input.title,
        slug,
        input.category,
        input.difficulty,
        input.language,
        categoryId,
        difficultyId,
        languageId,
        input.description,
        input.price,
        input.currency,
        input.status,
        input.thumbnailUrl,
        input.promoVideo,
        input.status === 'published' ? new Date() : null,
      ]
    )
    await saveRequirements(connection, courseId, input.requirements, input.outcomes)
  })
  return findById(courseId)
}

const update = async (courseId, body) => {
  await ensureMasterDataSchema()
  const existing = await findById(courseId)
  if (!existing) return null
  const input = normalizeInput(body, existing)
  const { categoryId, difficultyId, languageId } = await resolveOptionIds(input)
  await db.withTransaction(async (connection) => {
    await connection.execute(
      `UPDATE courses
       SET title = ?, category = ?, difficulty = ?, language = ?,
           category_id = ?, difficulty_id = ?, language_id = ?, description = ?, price = ?,
           currency = ?, status = ?, thumbnail_url = ?, promo_video = ?,
           published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END
       WHERE id = ?`,
      [
        input.title,
        input.category,
        input.difficulty,
        input.language,
        categoryId,
        difficultyId,
        languageId,
        input.description,
        input.price,
        input.currency,
        input.status,
        input.thumbnailUrl,
        input.promoVideo,
        input.status,
        courseId,
      ]
    )
    await saveRequirements(connection, courseId, input.requirements, input.outcomes)
  })
  return findById(courseId)
}

module.exports = { toArray, findById, listAll, listByCoach, listPublished, create, update }