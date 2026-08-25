const env = require('../config/env')
const db = require('../config/db')
const { makeId } = require('../utils/id')

const hydratePaymentRows = (rows) =>
  rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    providerPaymentId: row.provider_payment_id,
    provider: row.provider,
    studentId: row.student_id,
    coachId: row.coach_id,
    courseId: row.course_id,
    amount: Number(row.amount || 0),
    currency: row.currency,
    status: row.status,
    details: parseJson(row.student_details, {}),
    gatewayResponse: parseJson(row.gateway_response, {}),
    paidAt: row.paid_at,
    createdAt: row.created_at,
    student: row.student_name ? { id: row.student_id, name: row.student_name, email: row.student_email, role: 'student' } : null,
    coach: row.coach_name ? { id: row.coach_id, name: row.coach_name, email: row.coach_email, role: 'coach' } : null,
    course: row.course_title ? { id: row.course_id, title: row.course_title, price: Number(row.course_price || 0), currency: row.course_currency } : null,
  }))

const parseJson = (value, fallback) => {
  if (!value) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const paymentSelect = `
  SELECT p.*,
         s.name AS student_name, s.email AS student_email,
         co.name AS coach_name, co.email AS coach_email,
         c.title AS course_title, c.price AS course_price, c.currency AS course_currency
  FROM payments p
  LEFT JOIN users s ON s.id = p.student_id
  LEFT JOIN users co ON co.id = p.coach_id
  LEFT JOIN courses c ON c.id = p.course_id
`

const createOrder = async ({ studentId, courseId, studentDetails }) => {
  const course = await db.first(
    `SELECT c.*, u.name AS coach_name
     FROM courses c
     LEFT JOIN users u ON u.id = c.coach_id
     WHERE c.id = ? AND c.status = 'published'`,
    [courseId]
  )
  if (!course) return null
  return {
    orderId: makeId('order'),
    amount: Number(course.price),
    currency: course.currency,
    courseId,
    studentId,
    coachId: course.coach_id,
    studentDetails,
    provider: env.paymentProvider,
    acceptsDemoDetails: env.paymentProvider === 'demo',
    demoPayment: env.paymentProvider === 'demo' ? {
      message: 'Demo mode accepts any non-empty payment details.',
      cardNumber: 'any fake card number',
      expiry: 'any future/past expiry',
      cvc: 'any cvc',
    } : null,
    publicKey: env.paymentProvider === 'razorpay' ? env.razorpay.keyId : null,
  }
}

const completePurchase = async ({ student, courseId, orderId, paymentId, studentDetails = {}, payment = {} }) => {
  const course = await db.first('SELECT * FROM courses WHERE id = ? AND status = "published"', [courseId])
  if (!course) return { notFound: true }

  const existing = await db.first(
    'SELECT * FROM enrollments WHERE student_id = ? AND course_id = ? AND status = "active"',
    [student.id, courseId]
  )
  if (existing) return { alreadyEnrolled: true, enrollment: existing }

  const paymentRowId = makeId('payment')
  const enrollmentId = makeId('enrollment')
  const provider = payment.provider || env.paymentProvider || 'demo'
  const demoApproved = env.paymentProvider === 'demo' || provider === 'demo' || payment.demo === true
  const status = demoApproved ? 'success' : (payment.status === 'failed' ? 'failed' : 'success')
  const gatewayResponse = {
    ...payment,
    provider,
    demoApproved,
    note: demoApproved ? 'Demo mode accepted the submitted payment details.' : payment.note,
  }

  await db.withTransaction(async (connection) => {
    await connection.execute(
      `INSERT INTO payments
       (id, order_id, provider_payment_id, provider, student_id, coach_id, course_id, amount, currency, status, student_details, gateway_response, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentRowId,
        orderId || makeId('order'),
        paymentId || payment.providerPaymentId || `demo_${Date.now()}`,
        provider,
        student.id,
        course.coach_id,
        course.id,
        Number(course.price),
        course.currency,
        status,
        JSON.stringify(studentDetails),
        JSON.stringify(gatewayResponse),
        status === 'success' ? new Date() : null,
      ]
    )

    if (status === 'success') {
      await connection.execute(
        `INSERT INTO enrollments
         (id, student_id, coach_id, course_id, payment_id, amount, currency, status, progress)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 0)`,
        [enrollmentId, student.id, course.coach_id, course.id, paymentRowId, Number(course.price), course.currency]
      )
    }
  })

  if (status !== 'success') return { failed: true }

  return {
    enrollment: await db.first('SELECT * FROM enrollments WHERE id = ?', [enrollmentId]),
    payment: (await listPayments({ paymentId: paymentRowId }))[0],
    course,
  }
}

const listPayments = async ({ role, userId, paymentId } = {}) => {
  const conditions = []
  const params = []
  if (paymentId) {
    conditions.push('p.id = ?')
    params.push(paymentId)
  }
  if (role === 'coach') {
    conditions.push('p.coach_id = ?')
    params.push(userId)
  }
  if (role === 'student') {
    conditions.push('p.student_id = ?')
    params.push(userId)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const rows = await db.query(`${paymentSelect} ${where} ORDER BY p.created_at DESC`, params)
  return hydratePaymentRows(rows)
}

module.exports = { createOrder, completePurchase, listPayments }
