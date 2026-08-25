const db = require('../config/db')

const search = async (user, query) => {
  const q = `%${String(query || '').trim()}%`
  if (q === '%%') return { query: '', courses: [], students: [], coaches: [], payments: [] }

  let coursesSql = `SELECT id, coach_id AS coachId, title, category, description, status, price, currency FROM courses WHERE (title LIKE ? OR category LIKE ? OR description LIKE ?)`
  let coursesParams = [q, q, q]
  let studentsSql = `SELECT id, name, email, role, title, status FROM users WHERE role = 'student' AND (name LIKE ? OR email LIKE ? OR title LIKE ?)`
  let studentsParams = [q, q, q]
  let coachesSql = `SELECT id, name, email, role, title, status FROM users WHERE role = 'coach' AND (name LIKE ? OR email LIKE ? OR title LIKE ?)`
  let coachesParams = [q, q, q]
  let paymentsSql = `SELECT id, order_id AS orderId, provider_payment_id AS providerPaymentId, amount, currency, status FROM payments WHERE (id LIKE ? OR order_id LIKE ? OR provider_payment_id LIKE ?)`
  let paymentsParams = [q, q, q]

  if (user.role === 'coach') {
    coursesSql += ' AND coach_id = ?'
    coursesParams.push(user.id)
    studentsSql += ' AND id IN (SELECT student_id FROM enrollments WHERE coach_id = ?)'
    studentsParams.push(user.id)
    coachesSql += ' AND 1 = 0'
    paymentsSql += ' AND coach_id = ?'
    paymentsParams.push(user.id)
  }

  if (user.role === 'student') {
    coursesSql += " AND (status = 'published' OR id IN (SELECT course_id FROM enrollments WHERE student_id = ?))"
    coursesParams.push(user.id)
    studentsSql += ' AND 1 = 0'
    coachesSql += ' AND id IN (SELECT coach_id FROM enrollments WHERE student_id = ?)'
    coachesParams.push(user.id)
    paymentsSql += ' AND student_id = ?'
    paymentsParams.push(user.id)
  }

  const [courses, students, coaches, payments] = await Promise.all([
    db.query(coursesSql, coursesParams),
    db.query(studentsSql, studentsParams),
    db.query(coachesSql, coachesParams),
    db.query(paymentsSql, paymentsParams),
  ])

  return { query, courses, students, coaches, payments }
}

module.exports = { search }