const { created, ok, fail } = require('../utils/response')
const paymentModel = require('../models/payment.model')
const notificationModel = require('../models/notification.model')
const userModel = require('../models/user.model')
const { sendMail } = require('../services/mail')
const env = require('../config/env')

const createOrder = async (ctx) => {
  const order = await paymentModel.createOrder({
    studentId: ctx.user.id,
    courseId: ctx.body.courseId,
    studentDetails: ctx.body.studentDetails || {},
  })
  if (!order) return fail(ctx.res, 404, 'Published course not found')
  return created(ctx.res, order)
}

const verify = async (ctx) => {
  const result = await paymentModel.completePurchase({
    student: ctx.user,
    courseId: ctx.body.courseId,
    orderId: ctx.body.orderId,
    paymentId: ctx.body.paymentId,
    studentDetails: ctx.body.studentDetails || {},
    payment: ctx.body.payment || {},
  })
  if (result.notFound) return fail(ctx.res, 404, 'Published course not found')
  if (result.failed) return fail(ctx.res, 402, 'Payment failed')
  if (result.alreadyEnrolled) return ok(ctx.res, result)

  await notificationModel.create({
    recipientId: result.course.coach_id,
    senderId: ctx.user.id,
    title: 'Course purchased',
    message: `${ctx.user.name} purchased ${result.course.title}.`,
  })
  await notificationModel.create({
    recipientRole: 'superadmin',
    senderId: ctx.user.id,
    title: 'New enrollment',
    message: `${ctx.user.name} enrolled in ${result.course.title}.`,
  })

  const coach = await userModel.findById(result.course.coach_id)

  const mailVars = {
    appName: env.appName,
    studentName: ctx.user.name,
    studentEmail: ctx.user.email,
    coachName: coach?.name || 'Coach',
    courseName: result.course.title,
    amount: result.payment.amount,
    currency: result.payment.currency,
  }

  await Promise.allSettled([
    sendMail({
      module: 'student',
      action: 'course-purchased',
      to: ctx.user.email,
      vars: { ...mailVars, name: ctx.user.name },
    }),
    coach?.email &&
      sendMail({
        module: 'coach',
        action: 'course-enrolled',
        to: coach.email,
        vars: { ...mailVars, name: coach.name },
      }),
    sendMail({
      module: 'admin',
      action: 'new-enrollment',
      vars: { ...mailVars, name: 'Admin' },
    }),
  ])

  return created(ctx.res, result)
}

const enroll = verify

const history = async (ctx) =>
  ok(ctx.res, { payments: await paymentModel.listPayments({ role: ctx.user.role, userId: ctx.user.id }) })

module.exports = { createOrder, verify, enroll, history }