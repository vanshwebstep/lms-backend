const { ok } = require('../utils/response')
const enrollmentModel = require('../models/enrollment.model')
const paymentModel = require('../models/payment.model')
const statsModel = require('../models/stats.model')

const stats = async (ctx) => ok(ctx.res, { stats: await statsModel.coachStats(ctx.user.id) })

const students = async (ctx) =>
  ok(ctx.res, {
    students: await enrollmentModel.listForCoach(ctx.user.id),
    stats: await statsModel.coachStats(ctx.user.id),
  })

const earnings = async (ctx) => {
  const payments = await paymentModel.listPayments({ role: 'coach', userId: ctx.user.id })
  const grossRevenue = payments.filter((p) => p.status === 'success').reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const platformFee = grossRevenue * 0.1
  return ok(ctx.res, {
    earnings: {
      grossRevenue,
      platformFee,
      netRevenue: grossRevenue - platformFee,
      history: payments,
    },
  })
}

module.exports = { stats, students, earnings }