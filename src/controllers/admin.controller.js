const db = require('../config/db')
const { ROLES } = require('../config/constants')
const { ok, created, fail } = require('../utils/response')
const userModel = require('../models/user.model')
const { makeId } = require('../utils/id')
const { hashPassword } = require('../utils/password')
const { parseJson } = require('../models/learning.model')
const courseModel = require('../models/course.model')
const paymentModel = require('../models/payment.model')
const statsModel = require('../models/stats.model')
const { sendMail } = require('../services/mail')
const env = require('../config/env')

const createCoach = async (ctx) => {
  const body = ctx.body || {}
  if (!body.name || !body.email) return fail(ctx.res, 400, 'Coach name and email are required')
  if (await userModel.findByEmail(body.email)) return fail(ctx.res, 409, 'Email is already registered')

  const password = body.password || 'password123'
  const hashed = hashPassword(password)
  const coach = {
    id: makeId('coach'),
    name: String(body.name).trim(),
    email: userModel.cleanEmail(body.email),
    role: ROLES.COACH,
    title: body.title || 'Course Coach',
    passwordHash: hashed.passwordHash,
    salt: hashed.salt,
  }

  await db.withTransaction(async (connection) => userModel.create(connection, coach, body.profile || {}))
  const saved = await userModel.findById(coach.id)
  console.log(`Sending coach-created email to ${saved.email}...`)
  await sendMail({
    module: 'admin',
    action: 'coach-created',
    to: saved.email,
    vars: {
      name: saved.name,
      appName: env.appName,
      email: saved.email,
      password,
    },
  })

  return created(ctx.res, { coach: userModel.toPublicUser(saved), defaultPassword: password })
}

const updateCoach = async (ctx) => {
  const coach = await userModel.findById(ctx.params.id)
  if (!coach || coach.role !== ROLES.COACH) return fail(ctx.res, 404, 'Coach not found')

  const body = ctx.body || {}
  if (body.email && userModel.cleanEmail(body.email) !== coach.email) {
    const existing = await userModel.findByEmail(body.email)
    if (existing && existing.id !== coach.id) return fail(ctx.res, 409, 'Email is already registered')
  }

  await db.query(
    `UPDATE users SET name = ?, email = ?, title = ?, status = ?, avatar_url = ? WHERE id = ? AND role = 'coach'`,
    [
      body.name ?? coach.name,
      body.email ? userModel.cleanEmail(body.email) : coach.email,
      body.title ?? coach.title,
      body.status ?? coach.status,
      body.avatar ?? coach.avatar,
      coach.id,
    ]
  )

  if (body.profile) await userModel.updateProfile(coach.id, { profile: body.profile })
  if (body.password) await userModel.changePassword(coach.id, hashPassword(body.password))

  const saved = await userModel.findById(coach.id)
  return ok(ctx.res, { coach: userModel.toPublicUser(saved) })
}

const deleteCoach = async (ctx) => {
  const coach = await userModel.findById(ctx.params.id)
  if (!coach || coach.role !== ROLES.COACH) return fail(ctx.res, 404, 'Coach not found')

  const transferToCoachId = ctx.body?.transferToCoachId || ctx.query.get('transferToCoachId')
  const impact = await db.first(
    `SELECT
       (SELECT COUNT(*) FROM courses WHERE coach_id = ?) AS courses,
       (SELECT COUNT(*) FROM enrollments WHERE coach_id = ?) AS enrollments,
       (SELECT COUNT(*) FROM payments WHERE coach_id = ?) AS payments`,
    [coach.id, coach.id, coach.id]
  )
  const hasSoldCourses = Number(impact.enrollments || 0) || Number(impact.payments || 0)

  if (hasSoldCourses) {
    const available = await db.query(
      `SELECT id, name, email FROM users
       WHERE role = 'coach' AND status = 'active' AND id <> ?
       ORDER BY name`,
      [coach.id]
    )
    if (!available.length) {
      return fail(ctx.res, 409, 'Coach has sold courses and no other active coach is available for transfer.', {
        courses: Number(impact.courses || 0),
        enrollments: Number(impact.enrollments || 0),
        payments: Number(impact.payments || 0),
        transferRequired: true,
        availableCoaches: [],
      })
    }

    const target = available.find((item) => String(item.id) === String(transferToCoachId))
    if (!target) {
      return fail(ctx.res, 409, 'Coach has sold courses. Select another active coach to receive assigned courses before deleting.', {
        courses: Number(impact.courses || 0),
        enrollments: Number(impact.enrollments || 0),
        payments: Number(impact.payments || 0),
        transferRequired: true,
        availableCoaches: available,
      })
    }

    const oldPlansRow = await db.first('SELECT setting_value FROM platform_settings WHERE setting_key = ?', [`pricing_plans:${coach.id}`])
    const newPlansRow = await db.first('SELECT setting_value FROM platform_settings WHERE setting_key = ?', [`pricing_plans:${target.id}`])
    const oldPlans = parseJson(oldPlansRow?.setting_value, [])
    const newPlans = parseJson(newPlansRow?.setting_value, [])
    const transferredPlans = oldPlans.map((plan) => ({ ...plan, transferredFromCoachId: coach.id, transferredAt: new Date().toISOString() }))

    await db.withTransaction(async (connection) => {
      await connection.execute('UPDATE courses SET coach_id = ? WHERE coach_id = ?', [target.id, coach.id])
      await connection.execute('UPDATE enrollments SET coach_id = ? WHERE coach_id = ?', [target.id, coach.id])
      await connection.execute('UPDATE payments SET coach_id = ? WHERE coach_id = ?', [target.id, coach.id])
      await connection.execute('UPDATE uploads SET owner_id = ? WHERE owner_id = ?', [target.id, coach.id])
      if (oldPlans.length) {
        await connection.execute(
          `INSERT INTO platform_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [`pricing_plans:${target.id}`, JSON.stringify([...transferredPlans, ...newPlans])]
        )
      }
      await connection.execute('DELETE FROM platform_settings WHERE setting_key = ?', [`pricing_plans:${coach.id}`])
      await connection.execute('DELETE FROM users WHERE id = ? AND role = ?', [coach.id, ROLES.COACH])
    })

    return ok(ctx.res, {
      deleted: true,
      transferred: true,
      coachId: coach.id,
      transferToCoachId: target.id,
      transferToCoachName: target.name,
      coursesTransferred: Number(impact.courses || 0),
      enrollmentsTransferred: Number(impact.enrollments || 0),
      paymentsTransferred: Number(impact.payments || 0),
    })
  }

  await db.withTransaction(async (connection) => {
    await connection.execute('DELETE FROM platform_settings WHERE setting_key = ?', [`pricing_plans:${coach.id}`])
    await connection.execute('DELETE FROM courses WHERE coach_id = ?', [coach.id])
    await connection.execute('DELETE FROM uploads WHERE owner_id = ?', [coach.id])
    await connection.execute('DELETE FROM users WHERE id = ? AND role = ?', [coach.id, ROLES.COACH])
  })

  return ok(ctx.res, { deleted: true, transferred: false, coachId: coach.id, deletedCourses: Number(impact.courses || 0) })
}
const stats = async (ctx) => ok(ctx.res, { stats: await statsModel.adminStats() })
const coaches = async (ctx) => {
  const list = await userModel.listByRole(ROLES.COACH)
  const rows = await Promise.all(list.map(async (coach) => {
    const stats = await db.first(
      `SELECT
         (SELECT COUNT(*) FROM courses WHERE coach_id = ?) AS courses,
         (SELECT COUNT(DISTINCT student_id) FROM enrollments WHERE coach_id = ?) AS students,
         (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE coach_id = ? AND status = 'success') AS revenue`,
      [coach.id, coach.id, coach.id]
    )
    return {
      ...coach,
      stats: {
        courses: Number(stats.courses || 0),
        students: Number(stats.students || 0),
        revenue: Number(stats.revenue || 0),
      },
    }
  }))
  return ok(ctx.res, { coaches: rows })
}

const students = async (ctx) => {
  const list = await userModel.listByRole(ROLES.STUDENT)
  return ok(ctx.res, { students: list })
}

const courses = async (ctx) => ok(ctx.res, { courses: await courseModel.listAll() })
const payments = async (ctx) => ok(ctx.res, { payments: await paymentModel.listPayments() })

const reports = async (ctx) => {
  const courseSales = await db.query(
    `SELECT c.id, c.title, COUNT(e.id) AS sales, COALESCE(SUM(p.amount), 0) AS revenue
     FROM courses c
     LEFT JOIN enrollments e ON e.course_id = c.id
     LEFT JOIN payments p ON p.id = e.payment_id AND p.status = 'success'
     GROUP BY c.id, c.title
     ORDER BY revenue DESC`
  )
  return ok(ctx.res, {
    reports: {
      revenue: await statsModel.totalRevenue(),
      courseSales,
    },
  })
}

const getSettings = async (ctx) => {
  const rows = await db.query('SELECT setting_key, setting_value FROM platform_settings')
  const settings = {}
  for (const row of rows) {
    try {
      settings[row.setting_key] = JSON.parse(row.setting_value)
    } catch {
      settings[row.setting_key] = row.setting_value
    }
  }
  return ok(ctx.res, { settings })
}

const updateSettings = async (ctx) => {
  for (const [key, value] of Object.entries(ctx.body || {})) {
    await db.query(
      `INSERT INTO platform_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, JSON.stringify(value)]
    )
  }
  return getSettings(ctx)
}

const blockUser = async (ctx) => updateUserStatus(ctx, 'blocked')
const unblockUser = async (ctx) => updateUserStatus(ctx, 'active')

const updateUserStatus = async (ctx, status) => {
  if (!ctx.body.userId) return fail(ctx.res, 400, 'User ID is required')
  const user = await userModel.setStatus(ctx.body.userId, status)
  if (!user) return fail(ctx.res, 404, 'User not found')
  return ok(ctx.res, { user: userModel.toPublicUser(user) })
}

const subscriptions = async (ctx) => {
  const rows = await db.query("SELECT setting_key, setting_value FROM platform_settings WHERE setting_key LIKE 'pricing_plans:%'")
  const plans = rows.flatMap((row) => {
    const coachId = row.setting_key.replace('pricing_plans:', '')
    return parseJson(row.setting_value, []).map((plan) => ({ ...plan, coachId }))
  })
  return ok(ctx.res, { subscriptions: plans, plans, total: plans.length })
}

module.exports = {
  createCoach,
  updateCoach,
  deleteCoach,
  stats,
  coaches,
  students,
  courses,
  payments,
  reports,
  getSettings,
  updateSettings,
  blockUser,
  unblockUser,
  subscriptions,
}
