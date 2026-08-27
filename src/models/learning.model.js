const db = require('../config/db')
const { makeId } = require('../utils/id')
const { recalculateEnrollmentProgress } = require('./progress.model')

const parseJson = (value, fallback) => {
  if (!value) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const normalizeContentType = (value) => {
  const type = String(value || 'video').toLowerCase()
  if (type === 'pdf' || type === 'file') return 'document'
  if (type === 'url') return 'link'
  return ['video', 'document', 'link', 'text'].includes(type) ? type : 'video'
}

const mapLesson = (row) => ({
  id: row.id,
  courseId: row.course_id,
  title: row.title,
  description: row.description || '',
  contentType: row.content_type,
  contentUrl: row.content_url || '',
  durationMinutes: Number(row.duration_minutes || 0),
  isPreview: Boolean(row.is_preview),
  sortOrder: Number(row.sort_order || 0),
  dripDays: Number(row.drip_days || 0),
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  course: row.course_title ? { id: row.course_id, title: row.course_title } : null,
  topics: Number(row.topics || 0),
})

const mapTopic = (row) => ({
  id: row.id,
  lessonId: row.lesson_id,
  title: row.title,
  body: row.body || '',
  sortOrder: Number(row.sort_order || 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lesson: row.lesson_title ? { id: row.lesson_id, title: row.lesson_title } : null,
  course: row.course_title ? { id: row.course_id, title: row.course_title } : null,
})

const listLessonsForCoach = async (coachId, { courseId } = {}) => {
  const params = [coachId]
  let where = 'WHERE c.coach_id = ?'
  if (courseId) {
    where += ' AND l.course_id = ?'
    params.push(courseId)
  }
  const rows = await db.query(
    `SELECT l.*, c.title AS course_title,
            (SELECT COUNT(*) FROM lesson_topics t WHERE t.lesson_id = l.id) AS topics
     FROM lessons l
     JOIN courses c ON c.id = l.course_id
     ${where}
     ORDER BY c.created_at DESC, l.sort_order, l.created_at DESC`,
    params
  )
  return rows.map(mapLesson)
}

const listLessonsForStudentCourse = async (studentId, courseId) => {
  const enrollment = await db.first(
    'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ? AND status = "active"',
    [studentId, courseId]
  )
  if (!enrollment) return null

  const rows = await db.query(
    `SELECT l.*, c.title AS course_title, lp.status AS progress_status, lp.watched_seconds, lp.completed_at,
            (SELECT COUNT(*) FROM lesson_topics t WHERE t.lesson_id = l.id) AS topics
     FROM lessons l
     JOIN courses c ON c.id = l.course_id
     LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.enrollment_id = ?
     WHERE l.course_id = ? AND l.status = 'published'
     ORDER BY l.sort_order, l.created_at`,
    [enrollment.id, courseId]
  )

  const enrollmentTime = new Date(enrollment.created_at).getTime()
  const now = Date.now()

  return {
    enrollment,
    lessons: rows.map((row) => {
      const lesson = mapLesson(row)
      const unlocksAt = new Date(enrollmentTime + lesson.dripDays * 24 * 60 * 60 * 1000)
      const isLocked = lesson.dripDays > 0 && unlocksAt.getTime() > now
      
      return {
        ...lesson,
        isLocked,
        unlocksAt: isLocked ? unlocksAt.toISOString() : null,
        progress: {
          status: row.progress_status || 'not_started',
          watchedSeconds: Number(row.watched_seconds || 0),
          completedAt: row.completed_at,
        },
      }
    }),
  }
}

const findLessonForCoach = async (lessonId, coachId) => {
  const row = await db.first(
    `SELECT l.*, c.title AS course_title,
            (SELECT COUNT(*) FROM lesson_topics t WHERE t.lesson_id = l.id) AS topics
     FROM lessons l
     JOIN courses c ON c.id = l.course_id
     WHERE l.id = ? AND c.coach_id = ?`,
    [lessonId, coachId]
  )
  return row ? mapLesson(row) : null
}

  const createLesson = async (coachId, body) => {
    const course = await db.first('SELECT id FROM courses WHERE id = ? AND coach_id = ?', [body.courseId, coachId])
    if (!course) return null
    const id = makeId('lesson')
    await db.query(
      `INSERT INTO lessons
       (id, course_id, title, description, content_type, content_url, duration_minutes, is_preview, sort_order, drip_days, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.courseId,
        String(body.title || '').trim(),
        String(body.description || '').trim() || null,
        normalizeContentType(body.contentType || body.type),
        body.contentUrl || body.videoUrl || body.url || null,
        Number(body.durationMinutes || body.duration || 0),
        body.isPreview || body.isFreePreview ? 1 : 0,
        Number(body.sortOrder || body.order || 0),
        Number(body.dripDays || 0),
        body.status || 'draft',
      ]
    )
    return findLessonForCoach(id, coachId)
  }

const updateLesson = async (lessonId, coachId, body) => {
  const existing = await findLessonForCoach(lessonId, coachId)
  if (!existing) return null
  const courseId = body.courseId || existing.courseId
  const course = await db.first('SELECT id FROM courses WHERE id = ? AND coach_id = ?', [courseId, coachId])
  if (!course) return null
  await db.query(
    `UPDATE lessons
     SET course_id = ?, title = ?, description = ?, content_type = ?, content_url = ?,
         duration_minutes = ?, is_preview = ?, sort_order = ?, drip_days = ?, status = ?
     WHERE id = ?`,
    [
      courseId,
      String(body.title ?? existing.title).trim(),
      String(body.description ?? existing.description ?? '').trim() || null,
      normalizeContentType(body.contentType || body.type || existing.contentType),
      body.contentUrl ?? body.videoUrl ?? body.url ?? existing.contentUrl ?? null,
      Number(body.durationMinutes ?? body.duration ?? existing.durationMinutes ?? 0),
      body.isPreview ?? body.isFreePreview ?? existing.isPreview ? 1 : 0,
      Number(body.sortOrder ?? body.order ?? existing.sortOrder ?? 0),
      Number(body.dripDays ?? existing.dripDays ?? 0),
      body.status || existing.status || 'draft',
      lessonId,
    ]
  )
  return findLessonForCoach(lessonId, coachId)
}

const removeLesson = async (lessonId, coachId) => {
  const existing = await findLessonForCoach(lessonId, coachId)
  if (!existing) return false
  await db.query('DELETE FROM lessons WHERE id = ?', [lessonId])
  return true
}

const listTopicsForCoach = async (coachId, { lessonId, courseId } = {}) => {
  const params = [coachId]
  let where = 'WHERE c.coach_id = ?'
  if (lessonId) {
    where += ' AND t.lesson_id = ?'
    params.push(lessonId)
  }
  if (courseId) {
    where += ' AND l.course_id = ?'
    params.push(courseId)
  }
  const rows = await db.query(
    `SELECT t.*, l.title AS lesson_title, c.id AS course_id, c.title AS course_title
     FROM lesson_topics t
     JOIN lessons l ON l.id = t.lesson_id
     JOIN courses c ON c.id = l.course_id
     ${where}
     ORDER BY c.created_at DESC, l.sort_order, t.sort_order, t.created_at`,
    params
  )
  return rows.map(mapTopic)
}

const findTopicForCoach = async (topicId, coachId) => {
  const row = await db.first(
    `SELECT t.*, l.title AS lesson_title, c.id AS course_id, c.title AS course_title
     FROM lesson_topics t
     JOIN lessons l ON l.id = t.lesson_id
     JOIN courses c ON c.id = l.course_id
     WHERE t.id = ? AND c.coach_id = ?`,
    [topicId, coachId]
  )
  return row ? mapTopic(row) : null
}

const createTopic = async (coachId, body) => {
  const lesson = await db.first(
    `SELECT l.id FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ? AND c.coach_id = ?`,
    [body.lessonId, coachId]
  )
  if (!lesson) return null
  const id = makeId('topic')
  await db.query(
    'INSERT INTO lesson_topics (id, lesson_id, title, body, sort_order) VALUES (?, ?, ?, ?, ?)',
    [id, body.lessonId, String(body.title || body.name || '').trim(), body.body || body.description || null, Number(body.sortOrder || body.order || 0)]
  )
  return findTopicForCoach(id, coachId)
}

const updateTopic = async (topicId, coachId, body) => {
  const existing = await findTopicForCoach(topicId, coachId)
  if (!existing) return null
  const lessonId = body.lessonId || existing.lessonId
  const lesson = await db.first(
    `SELECT l.id FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ? AND c.coach_id = ?`,
    [lessonId, coachId]
  )
  if (!lesson) return null
  await db.query(
    'UPDATE lesson_topics SET lesson_id = ?, title = ?, body = ?, sort_order = ? WHERE id = ?',
    [
      lessonId,
      String(body.title ?? body.name ?? existing.title).trim(),
      body.body ?? body.description ?? existing.body ?? null,
      Number(body.sortOrder ?? body.order ?? existing.sortOrder ?? 0),
      topicId,
    ]
  )
  return findTopicForCoach(topicId, coachId)
}

const removeTopic = async (topicId, coachId) => {
  const existing = await findTopicForCoach(topicId, coachId)
  if (!existing) return false
  await db.query('DELETE FROM lesson_topics WHERE id = ?', [topicId])
  return true
}

const updateLessonProgress = async (studentId, lessonId, body = {}) => {
  const row = await db.first(
    `SELECT e.id AS enrollment_id, e.course_id, e.created_at, l.drip_days
     FROM enrollments e
     JOIN lessons l ON l.course_id = e.course_id
     WHERE e.student_id = ? AND l.id = ? AND e.status = 'active'`,
    [studentId, lessonId]
  )
  if (!row) return null

  if (row.drip_days > 0) {
    const unlocksAt = new Date(new Date(row.created_at).getTime() + row.drip_days * 24 * 60 * 60 * 1000)
    if (unlocksAt.getTime() > Date.now()) {
      throw new Error('Lesson is locked')
    }
  }

  const status = body.status || (body.completed ? 'completed' : 'in_progress')
  await db.query(
    `INSERT INTO lesson_progress (enrollment_id, lesson_id, status, watched_seconds, completed_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status), watched_seconds = VALUES(watched_seconds),
       completed_at = VALUES(completed_at)`,
    [
      row.enrollment_id,
      lessonId,
      status,
      Number(body.watchedSeconds || body.watched_seconds || 0),
      status === 'completed' ? new Date() : null,
    ]
  )

  await recalculateEnrollmentProgress(row.enrollment_id)

  return db.first('SELECT * FROM lesson_progress WHERE enrollment_id = ? AND lesson_id = ?', [row.enrollment_id, lessonId])
}

module.exports = {
  parseJson,
  listLessonsForCoach,
  listLessonsForStudentCourse,
  findLessonForCoach,
  createLesson,
  updateLesson,
  removeLesson,
  listTopicsForCoach,
  findTopicForCoach,
  createTopic,
  updateTopic,
  removeTopic,
  updateLessonProgress,
}
