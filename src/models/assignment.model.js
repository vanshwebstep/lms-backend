const db = require('../config/db')
const { makeId } = require('../utils/id')
const { recalculateEnrollmentProgress } = require('./progress.model')

const mapAssignment = (row) => row && ({
  id: row.id,
  courseId: row.course_id,
  lessonId: row.lesson_id,
  title: row.title,
  description: row.description,
  attachmentUrl: row.attachment_url || '',
  attachmentName: row.attachment_name || '',
  dueAt: row.due_at,
  maxScore: Number(row.max_score || 0),
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  course: row.course_title ? { id: row.course_id, title: row.course_title } : null,
  submissions: Number(row.submissions || 0),
  total: Number(row.total_students || 0),
})

const listByCoach = async (coachId) => {
  const rows = await db.query(
    `SELECT a.*, c.title AS course_title,
            (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) AS submissions,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = a.course_id AND e.status = 'active') AS total_students
     FROM assignments a
     JOIN courses c ON c.id = a.course_id
     WHERE c.coach_id = ?
     ORDER BY a.created_at DESC`,
    [coachId]
  )
  return rows.map(mapAssignment)
}

const findForCoach = async (assignmentId, coachId) => {
  const row = await db.first(
    `SELECT a.*, c.title AS course_title,
            (SELECT COUNT(*) FROM assignment_submissions s WHERE s.assignment_id = a.id) AS submissions,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = a.course_id AND e.status = 'active') AS total_students
     FROM assignments a
     JOIN courses c ON c.id = a.course_id
     WHERE a.id = ? AND c.coach_id = ?`,
    [assignmentId, coachId]
  )
  return row ? mapAssignment(row) : null
}

const create = async (coachId, body) => {
  const course = await db.first('SELECT id FROM courses WHERE id = ? AND coach_id = ?', [body.courseId, coachId])
  if (!course) return null

  const id = makeId('assignment')
  await db.query(
    `INSERT INTO assignments
     (id, course_id, lesson_id, title, description, attachment_url, attachment_name, due_at, max_score, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      body.courseId,
      body.lessonId || null,
      String(body.title || '').trim(),
      String(body.description || '').trim(),
      body.attachmentUrl || null,
      body.attachmentName || null,
      body.dueAt || body.dueDate || null,
      Number(body.maxScore || 100),
      body.status || 'published',
    ]
  )
  return findForCoach(id, coachId)
}

const update = async (assignmentId, coachId, body) => {
  const existing = await findForCoach(assignmentId, coachId)
  if (!existing) return null
  const courseId = body.courseId || existing.courseId
  const course = await db.first('SELECT id FROM courses WHERE id = ? AND coach_id = ?', [courseId, coachId])
  if (!course) return null

  await db.query(
    `UPDATE assignments
     SET course_id = ?, lesson_id = ?, title = ?, description = ?, attachment_url = ?, attachment_name = ?, due_at = ?, max_score = ?, status = ?
     WHERE id = ?`,
    [
      courseId,
      body.lessonId ?? existing.lessonId ?? null,
      String(body.title ?? existing.title).trim(),
      String(body.description ?? existing.description ?? '').trim(),
      body.attachmentUrl !== undefined ? body.attachmentUrl : existing.attachmentUrl || null,
      body.attachmentName !== undefined ? body.attachmentName : existing.attachmentName || null,
      body.dueAt || body.dueDate || existing.dueAt || null,
      Number(body.maxScore ?? existing.maxScore ?? 100),
      body.status || existing.status || 'published',
      assignmentId,
    ]
  )
  return findForCoach(assignmentId, coachId)
}

const remove = async (assignmentId, coachId) => {
  const existing = await findForCoach(assignmentId, coachId)
  if (!existing) return false
  await db.query('DELETE FROM assignments WHERE id = ?', [assignmentId])
  return true
}

const submissionsForCoach = async (coachId) =>
  db.query(
    `SELECT s.*, u.name AS student_name, u.email AS student_email, a.title AS assignment_title,
            a.max_score AS assignment_max_score, c.title AS course_title
     FROM assignment_submissions s
     JOIN assignments a ON a.id = s.assignment_id
     JOIN courses c ON c.id = a.course_id
     JOIN users u ON u.id = s.student_id
     WHERE c.coach_id = ?
     ORDER BY s.submitted_at DESC`,
    [coachId]
  )

const reviewSubmissionForCoach = async (submissionId, coachId, body) => {
  const row = await db.first(
    `SELECT s.*, a.max_score, c.coach_id
     FROM assignment_submissions s
     JOIN assignments a ON a.id = s.assignment_id
     JOIN courses c ON c.id = a.course_id
     WHERE s.id = ? AND c.coach_id = ?`,
    [submissionId, coachId]
  )
  if (!row) return null

  const decision = String(body.decision || body.status || '').toLowerCase()
  const accepted = ['accept', 'accepted', 'grade', 'graded'].includes(decision)
  const rejected = ['reject', 'rejected', 'pending'].includes(decision)
  if (!accepted && !rejected) return { invalid: true, message: 'Review decision must be accept or reject' }

  const rawScore = body.score === '' || body.score === undefined || body.score === null ? null : Number(body.score)
  if (accepted && (rawScore === null || Number.isNaN(rawScore))) {
    return { invalid: true, message: 'Score is required when accepting a submission' }
  }
  if (rawScore !== null && (rawScore < 0 || rawScore > Number(row.max_score || 100))) {
    return { invalid: true, message: `Score must be between 0 and ${Number(row.max_score || 100)}` }
  }

  await db.query(
    `UPDATE assignment_submissions
     SET status = ?, score = ?, feedback = ?, graded_at = NOW()
     WHERE id = ?`,
    [
      accepted ? 'graded' : 'pending',
      accepted ? rawScore : null,
      String(body.feedback || '').trim() || null,
      submissionId,
    ]
  )
  await recalculateEnrollmentProgress(row.enrollment_id)
  return db.first('SELECT * FROM assignment_submissions WHERE id = ?', [submissionId])
}

const listForStudent = async (studentId) => {
  const rows = await db.query(
    `SELECT a.*, c.title AS course_title, s.id AS submission_id, s.answer_text, s.file_url,
            s.status AS submission_status, s.score, s.feedback, s.submitted_at, s.graded_at
     FROM assignments a
     JOIN courses c ON c.id = a.course_id
     JOIN enrollments e ON e.course_id = a.course_id AND e.student_id = ? AND e.status = 'active'
     LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = ?
     WHERE a.status = 'published'
     ORDER BY COALESCE(a.due_at, a.created_at) DESC`,
    [studentId, studentId]
  )
  return rows.map((row) => ({
    assignment: mapAssignment(row),
    submission: row.submission_id
      ? {
          id: row.submission_id,
          answerText: row.answer_text || '',
          fileUrl: row.file_url || '',
          status: row.submission_status,
          score: row.score === null ? null : Number(row.score),
          feedback: row.feedback || '',
          submittedAt: row.submitted_at,
          gradedAt: row.graded_at,
        }
      : null,
  }))
}

const submitForStudent = async (studentId, assignmentId, body) => {
  const row = await db.first(
    `SELECT a.*, e.id AS enrollment_id
     FROM assignments a
     JOIN enrollments e ON e.course_id = a.course_id AND e.student_id = ? AND e.status = 'active'
     WHERE a.id = ? AND a.status = 'published'`,
    [studentId, assignmentId]
  )
  if (!row) return null
  const existing = await db.first('SELECT id FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?', [assignmentId, studentId])
  if (existing) {
    await db.query(
      `UPDATE assignment_submissions
       SET answer_text = ?, file_url = ?, status = 'submitted', score = NULL, feedback = NULL, graded_at = NULL, submitted_at = NOW()
       WHERE id = ?`,
      [body.answerText || body.answer || null, body.fileUrl || null, existing.id]
    )
    await recalculateEnrollmentProgress(row.enrollment_id)
    return db.first('SELECT * FROM assignment_submissions WHERE id = ?', [existing.id])
  }

  const id = makeId('submission')
  await db.query(
    `INSERT INTO assignment_submissions
     (id, assignment_id, student_id, enrollment_id, answer_text, file_url, status)
     VALUES (?, ?, ?, ?, ?, ?, 'submitted')`,
    [id, assignmentId, studentId, row.enrollment_id, body.answerText || body.answer || null, body.fileUrl || null]
  )
  await recalculateEnrollmentProgress(row.enrollment_id)
  return db.first('SELECT * FROM assignment_submissions WHERE id = ?', [id])
}

module.exports = {
  listByCoach,
  findForCoach,
  create,
  update,
  remove,
  submissionsForCoach,
  reviewSubmissionForCoach,
  listForStudent,
  submitForStudent,
}
