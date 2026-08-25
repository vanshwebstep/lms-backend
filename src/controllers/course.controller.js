const { ROLES } = require('../config/constants')
const { ok, created, fail } = require('../utils/response')
const courseModel = require('../models/course.model')
const notificationModel = require('../models/notification.model')

const createCourse = async (ctx) => {
  const body = ctx.body
  if (!body.title || !body.category || !body.description) {
    return fail(ctx.res, 400, 'Title, category and description are required')
  }
  const course = await courseModel.create(ctx.user.id, body)
  await notificationModel.create({
    recipientRole: ROLES.ADMIN,
    senderId: ctx.user.id,
    title: 'New course created',
    message: `${ctx.user.name} created ${course.title}.`,
  })
  return created(ctx.res, { course })
}

const coachCourses = async (ctx) => ok(ctx.res, { courses: await courseModel.listByCoach(ctx.user.id) })

const coachCourseDetail = async (ctx) => {
  const course = await courseModel.findById(ctx.params.id)
  if (!course || course.coachId !== ctx.user.id) return fail(ctx.res, 404, 'Course not found')
  return ok(ctx.res, { course })
}

const updateCoachCourse = async (ctx) => {
  const course = await courseModel.findById(ctx.params.id)
  if (!course || course.coachId !== ctx.user.id) return fail(ctx.res, 404, 'Course not found')
  return ok(ctx.res, { course: await courseModel.update(ctx.params.id, ctx.body) })
}

const updateAdminCourse = async (ctx) => {
  const course = await courseModel.update(ctx.params.id, ctx.body)
  if (!course) return fail(ctx.res, 404, 'Course not found')
  return ok(ctx.res, { course })
}

const browseCourses = async (ctx) => ok(ctx.res, { courses: await courseModel.listPublished(ctx.query.get('q') || '', ctx.user.id) })
const allCourses = async (ctx) => ok(ctx.res, { courses: await courseModel.listAll() })

const adminCourseDetail = async (ctx) => {
  const course = await courseModel.findById(ctx.params.id)
  if (!course) return fail(ctx.res, 404, 'Course not found')
  return ok(ctx.res, { course })
}

module.exports = {
  createCourse,
  coachCourses,
  coachCourseDetail,
  updateCoachCourse,
  updateAdminCourse,
  browseCourses,
  allCourses,
  adminCourseDetail,
}