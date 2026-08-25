const { ok, created, fail } = require('../utils/response')
const emailConfigModel = require('../models/emailConfig.model')
const { sendMail } = require('../services/mail')
const env = require('../config/env')

const samplePreviewVars = {
  name: 'Rohan Sharma',
  studentName: 'Rohan Sharma',
  studentEmail: 'student@example.com',
  coachName: 'Dr. Meera Patel',
  courseName: 'Complete React & Node.js Masterclass 2026',
  assignmentTitle: 'Responsive Portfolio Project',
  quizTitle: 'Full-Stack Architecture Assessment',
  score: '95',
  maxScore: '100',
  feedback: 'Excellent component structure, clean modular code and great UI design!',
  certificateNo: 'LF-CERT-984210',
  amount: '1,499.00',
  currency: 'INR',
  password: 'Password@2026!',
  otp: '748291',
  resetToken: 'rst_demo_token_849201',
  appName: env.appName || 'LearnFlow',
  loginUrl: `${env.appUrl || 'http://localhost:5173'}/login`,
}

const list = async (ctx) => {
  const module = ctx.query?.get('module') || 'all'
  const templates = await emailConfigModel.listAll({
    module,
    role: ctx.user.role,
    coachId: ctx.user.role === 'coach' ? ctx.user.id : null,
  })
  return ok(ctx.res, {
    templates,
    sampleVars: samplePreviewVars,
  })
}

const getById = async (ctx) => {
  const template = await emailConfigModel.findById(ctx.params.id)
  if (!template) return fail(ctx.res, 404, 'Email template not found')
  return ok(ctx.res, {
    template,
    sampleVars: samplePreviewVars,
  })
}

const create = async (ctx) => {
  const body = ctx.body || {}
  if (!body.subject || !body.action) {
    return fail(ctx.res, 422, 'Subject and Action are required')
  }

  const template = await emailConfigModel.create({
    coach_id: ctx.user.role === 'coach' ? ctx.user.id : null,
    module: body.module || (ctx.user.role === 'coach' ? 'coach' : 'student'),
    action: body.action,
    subject: body.subject,
    html_template: body.html_template || '',
    smtp_host: body.smtp_host,
    smtp_secure: body.smtp_secure,
    smtp_port: body.smtp_port,
    smtp_username: body.smtp_username,
    smtp_password: body.smtp_password,
    from_email: body.from_email,
    from_name: body.from_name,
    status: body.status !== undefined ? body.status : 1,
    variables: body.variables || ['name', 'appName', 'loginUrl'],
    to: body.to,
    cc: body.cc,
    bcc: body.bcc,
  })

  return created(ctx.res, { template })
}

const update = async (ctx) => {
  const body = ctx.body || {}
  const existing = await emailConfigModel.findById(ctx.params.id)
  if (!existing) return fail(ctx.res, 404, 'Email template not found')

  if (ctx.user.role === 'coach') {
    // Coach modifies their own personal copy of the template
    const template = await emailConfigModel.saveCoachTemplate(ctx.user.id, {
      module: existing.module,
      action: existing.action,
      subject: body.subject !== undefined ? body.subject : existing.subject,
      html_template: body.html_template !== undefined ? body.html_template : existing.html_template,
      status: body.status !== undefined ? body.status : existing.status,
    })
    return ok(ctx.res, { template, message: 'Your personalized template has been saved' })
  }

  // Admin updates global default template
  const template = await emailConfigModel.update(ctx.params.id, body)
  return ok(ctx.res, { template, message: 'Global email template updated successfully' })
}

const reset = async (ctx) => {
  const existing = await emailConfigModel.findById(ctx.params.id)
  if (!existing) return fail(ctx.res, 404, 'Email template not found')

  if (ctx.user.role === 'coach') {
    const template = await emailConfigModel.resetCoachTemplate(ctx.user.id, existing.module, existing.action)
    return ok(ctx.res, { template, message: 'Reset to Admin default template successfully' })
  }

  return ok(ctx.res, { message: 'Only coaches can reset to Admin default' })
}

const remove = async (ctx) => {
  const template = await emailConfigModel.remove(ctx.params.id)
  if (!template) return fail(ctx.res, 404, 'Email template not found')
  return ok(ctx.res, { message: 'Email template deleted successfully' })
}

const testSend = async (ctx) => {
  const template = await emailConfigModel.findById(ctx.params.id)
  if (!template) return fail(ctx.res, 404, 'Email template not found')

  const toEmail = ctx.body?.to || ctx.user.email
  if (!toEmail) return fail(ctx.res, 422, 'Recipient email address is required')

  const vars = {
    ...samplePreviewVars,
    ...(ctx.body?.vars || {}),
    email: toEmail,
    studentEmail: toEmail,
  }

  const result = await sendMail({
    module: template.module,
    action: template.action,
    to: toEmail,
    vars,
  })

  if (!result.sent) {
    return fail(ctx.res, 500, `Failed to send test email: ${result.reason || 'SMTP Error'}`)
  }

  return ok(ctx.res, {
    success: true,
    message: `Test email sent successfully to ${toEmail}`,
    messageId: result.messageId,
  })
}

module.exports = {
  list,
  getById,
  create,
  update,
  reset,
  remove,
  testSend,
}
