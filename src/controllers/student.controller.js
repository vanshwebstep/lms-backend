const { ok } = require('../utils/response')
const enrollmentModel = require('../models/enrollment.model')
const statsModel = require('../models/stats.model')
const db = require('../config/db')

const stats = async (ctx) => ok(ctx.res, { stats: await statsModel.studentStats(ctx.user.id) })
const enrolledCourses = async (ctx) => ok(ctx.res, { courses: await enrollmentModel.listForStudent(ctx.user.id) })

const progress = async (ctx) => {
  const courses = await enrollmentModel.listForStudent(ctx.user.id)
  const summary = await statsModel.studentStats(ctx.user.id)
  const activity = await db.query(
    `SELECT lp.*, l.title AS lesson_title, c.title AS course_title
     FROM lesson_progress lp
     JOIN enrollments e ON e.id = lp.enrollment_id
     JOIN lessons l ON l.id = lp.lesson_id
     JOIN courses c ON c.id = e.course_id
     WHERE e.student_id = ?
     ORDER BY lp.updated_at DESC
     LIMIT 20`,
    [ctx.user.id]
  )
  return ok(ctx.res, { summary, courses, activity })
}

module.exports = { stats, enrolledCourses, progress }
