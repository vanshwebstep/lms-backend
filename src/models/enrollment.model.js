const db = require('../config/db')
const { recalculateEnrollmentProgress } = require('./progress.model')

const refreshProgressRows = async (rows) => {
  const progressByEnrollment = new Map()
  for (const row of rows) {
    const result = await recalculateEnrollmentProgress(row.id)
    if (result) progressByEnrollment.set(row.id, result.progress)
  }
  return rows.map((row) => ({
    ...row,
    progress: progressByEnrollment.has(row.id) ? progressByEnrollment.get(row.id) : row.progress,
  }))
}

const listForStudent = async (studentId) => {
  const initialRows = await db.query(
    `SELECT e.*, c.title AS course_title, c.category, c.price, c.currency AS course_currency,
            u.name AS coach_name, u.email AS coach_email
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     JOIN users u ON u.id = e.coach_id
     WHERE e.student_id = ? AND e.status = 'active'
     ORDER BY e.created_at DESC`,
    [studentId]
  )
  const rows = await refreshProgressRows(initialRows)
  return rows.map((row) => ({
    enrollment: row,
    course: {
      id: row.course_id,
      title: row.course_title,
      category: row.category,
      price: Number(row.price || 0),
      currency: row.course_currency,
      coach: { id: row.coach_id, name: row.coach_name, email: row.coach_email },
    },
  }))
}

const listForCoach = async (coachId) => {
  const initialRows = await db.query(
    `SELECT e.*, s.name AS student_name, s.email AS student_email, c.title AS course_title,
            p.id AS payment_id, p.amount AS payment_amount, p.status AS payment_status
     FROM enrollments e
     JOIN users s ON s.id = e.student_id
     JOIN courses c ON c.id = e.course_id
     LEFT JOIN payments p ON p.id = e.payment_id
     WHERE e.coach_id = ?
     ORDER BY e.created_at DESC`,
    [coachId]
  )
  const rows = await refreshProgressRows(initialRows)
  return rows.map((row) => ({
    enrollment: row,
    student: { id: row.student_id, name: row.student_name, email: row.student_email, role: 'student' },
    course: { id: row.course_id, title: row.course_title },
    payment: row.payment_id
      ? { id: row.payment_id, amount: Number(row.payment_amount || 0), status: row.payment_status }
      : null,
  }))
}

module.exports = { listForStudent, listForCoach }
