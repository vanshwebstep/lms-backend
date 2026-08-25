const db = require('../config/db')

const totalRevenue = async (where = '', params = []) => {
  const row = await db.first(`SELECT COALESCE(SUM(amount), 0) AS revenue FROM payments WHERE status = 'success' ${where}`, params)
  return Number(row?.revenue || 0)
}

const adminStats = async () => ({
  coaches: Number((await db.first("SELECT COUNT(*) AS n FROM users WHERE role = 'coach'"))?.n || 0),
  students: Number((await db.first("SELECT COUNT(*) AS n FROM users WHERE role = 'student'"))?.n || 0),
  courses: Number((await db.first('SELECT COUNT(*) AS n FROM courses'))?.n || 0),
  publishedCourses: Number((await db.first("SELECT COUNT(*) AS n FROM courses WHERE status = 'published'"))?.n || 0),
  revenue: await totalRevenue(),
  enrollments: Number((await db.first('SELECT COUNT(*) AS n FROM enrollments'))?.n || 0),
})

const coachStats = async (coachId) => ({
  courses: Number((await db.first('SELECT COUNT(*) AS n FROM courses WHERE coach_id = ?', [coachId]))?.n || 0),
  publishedCourses: Number((await db.first("SELECT COUNT(*) AS n FROM courses WHERE coach_id = ? AND status = 'published'", [coachId]))?.n || 0),
  students: Number((await db.first('SELECT COUNT(DISTINCT student_id) AS n FROM enrollments WHERE coach_id = ?', [coachId]))?.n || 0),
  enrollments: Number((await db.first('SELECT COUNT(*) AS n FROM enrollments WHERE coach_id = ?', [coachId]))?.n || 0),
  revenue: await totalRevenue('AND coach_id = ?', [coachId]),
})

const studentStats = async (studentId) => ({
  enrolledCourses: Number((await db.first('SELECT COUNT(*) AS n FROM enrollments WHERE student_id = ?', [studentId]))?.n || 0),
  avgProgress: Number((await db.first('SELECT COALESCE(AVG(progress), 0) AS n FROM enrollments WHERE student_id = ?', [studentId]))?.n || 0),
  totalSpent: await totalRevenue('AND student_id = ?', [studentId]),
})

module.exports = { adminStats, coachStats, studentStats, totalRevenue }