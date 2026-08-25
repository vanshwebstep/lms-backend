const { created, ok, fail } = require('../utils/response')
const paymentModel = require('../models/payment.model')
const notificationModel = require('../models/notification.model')
const userModel = require('../models/user.model')
const { sendMail } = require('../services/mail')
const env = require('../config/env')

const notifyAndEmailPurchase = async ({ user, course, payment }) => {
  await notificationModel.create({
    recipientId: course.coach_id,
    senderId: user.id,
    title: 'Course purchased',
    message: `${user.name} purchased ${course.title}.`,
  })
  await notificationModel.create({
    recipientRole: 'superadmin',
    senderId: user.id,
    title: 'New enrollment',
    message: `${user.name} enrolled in ${course.title}.`,
  })

  const coach = await userModel.findById(course.coach_id)

  const mailVars = {
    appName: env.appName,
    studentName: user.name,
    studentEmail: user.email,
    coachName: coach?.name || 'Coach',
    courseName: course.title,
    amount: payment?.amount || course.price,
    currency: payment?.currency || course.currency || 'INR',
  }

  await Promise.allSettled([
    sendMail({
      module: 'student',
      action: 'course-purchased',
      coachId: course.coach_id,
      to: user.email,
      vars: { ...mailVars, name: user.name },
    }),
    coach?.email &&
      sendMail({
        module: 'coach',
        action: 'course-enrolled',
        coachId: course.coach_id,
        to: coach.email,
        vars: { ...mailVars, name: coach.name },
      }),
    sendMail({
      module: 'admin',
      action: 'new-enrollment',
      vars: { ...mailVars, name: 'Admin' },
    }),
  ])
}

const checkout = async (ctx) => {
  const body = ctx.body || {}
  const courseId = body.course_id || body.courseId
  const name = body.name || ctx.user.name
  const email = body.email || ctx.user.email
  const phone = body.phone
  const cardNumber = body.card_number || body.cardNumber
  const expiry = body.expiry
  const cvc = body.cvc

  if (!courseId) {
    return fail(ctx.res, 422, 'Course ID is required')
  }

  const result = await paymentModel.payAndEnrollWithStripe({
    student: ctx.user,
    courseId,
    name,
    email,
    phone,
    cardNumber,
    expiry,
    cvc,
  })

  if (result.notFound) return fail(ctx.res, 404, 'Published course not found')
  if (result.alreadyEnrolled) {
    return ok(ctx.res, {
      alreadyEnrolled: true,
      message: 'Already enrolled in this course',
      enrollment: result.enrollment,
    })
  }
  if (result.failed) {
    return fail(ctx.res, 400, result.message || 'Payment failed', result.details)
  }

  await notifyAndEmailPurchase({ user: ctx.user, course: result.course, payment: result.payment })

  return ok(ctx.res, {
    success: true,
    message: 'Payment successful, course enrolled',
    data: result.enrollment,
    enrollment: result.enrollment,
    payment: result.payment,
  })
}

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

  await notifyAndEmailPurchase({ user: ctx.user, course: result.course, payment: result.payment })

  return created(ctx.res, result)
}

const enroll = verify

const history = async (ctx) =>
  ok(ctx.res, { payments: await paymentModel.listPayments({ role: ctx.user.role, userId: ctx.user.id }) })

module.exports = { checkout, createOrder, verify, enroll, history }