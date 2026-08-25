const nodemailer = require('nodemailer')
const emailConfigModel = require('../models/emailConfig.model')

// Cache one transporter per smtp_host+username combo so we don't reconnect on every email.
const transporterCache = new Map()

const getTransporter = (config) => {
  const key = `${config.smtp_host}:${config.smtp_port}:${config.smtp_username}`
  if (!transporterCache.has(key)) {
    transporterCache.set(
      key,
      nodemailer.createTransport({
        host: config.smtp_host,
        port: Number(config.smtp_port),
        secure: Boolean(Number(config.smtp_secure)),
        auth: { user: config.smtp_username, pass: config.smtp_password },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      })
    )
  }
  return transporterCache.get(key)
}

// Replaces {{key}} placeholders in a template string with values from vars.
const interpolate = (template, vars = {}) =>
  String(template || '').replace(/{{\s*(\w+)\s*}}/g, (_, key) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''
  )

// The to/cc/bcc columns in email_configs may hold a single email, a comma/semicolon
// separated list, or a JSON array string — this normalizes all three into an array.
const parseRecipients = (raw) => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  const text = String(raw).trim()
  if (!text) return []
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch {
      // fall through to comma-split below
    }
  }
  return text.split(/[,;]/).map((item) => item.trim()).filter(Boolean)
}

// module + action look up a row in email_configs (e.g. module='student', action='course-purchased').
// vars fill {{placeholders}} in the subject/html_template columns.
// `to` is optional — if omitted, the recipient stored on the config row's `to` column is used
// (useful for fixed-recipient mails like admin notifications). `cc`/`bcc` passed in are merged
// with whatever is already saved on the config row.
const sendMail = async ({ module, action, to, cc, bcc, vars = {} }) => {
  const config = await emailConfigModel.findConfig(module, action)
  if (!config) {
    console.log(`[mail:dev] no email_configs row for module="${module}" action="${action}"`)
    return { sent: false, reason: `No email_configs row for module="${module}" action="${action}"` }
  }

  if (config.status !== undefined && config.status !== null && Number(config.status) === 0) {
    console.log(`[mail:dev] email_configs row disabled for module="${module}" action="${action}"`)
    return { sent: false, reason: 'Email config is disabled (status = 0)' }
  }

  const toList = to ? parseRecipients(to) : parseRecipients(config.to)
  const ccList = [...parseRecipients(config.cc), ...parseRecipients(cc)]
  const bccList = [...parseRecipients(config.bcc), ...parseRecipients(bcc)]

  if (!toList.length) {
    console.log(`[mail:dev] no recipient for module="${module}" action="${action}" (pass "to" or set the config row's "to" column)`)
    return { sent: false, reason: 'Missing recipient email' }
  }

  const subject = interpolate(config.subject, vars)
  const html = interpolate(config.html_template, vars)
  const from = config.from_name ? `"${config.from_name}" <${config.from_email}>` : config.from_email

  if (!config.smtp_host || !config.smtp_username || !config.smtp_password) {
    console.log(`[mail:dev] to=${toList.join(',')} subject="${subject}" (SMTP fields missing in email_configs row)`)
    return { sent: false, reason: 'SMTP fields missing in email_configs row' }
  }

  try {
    const transporter = getTransporter(config)
    const info = await transporter.sendMail({
      from,
      to: toList,
      cc: ccList.length ? ccList : undefined,
      bcc: bccList.length ? bccList : undefined,
      subject,
      html,
    })
    console.log(`[mail:sent] to=${toList.join(',')} subject="${subject}" messageId=${info.messageId}`)  
    return { sent: true, messageId: info.messageId }
  } catch (error) {
    console.log(`[mail:error] to=${toList.join(',')} subject="${subject}" ${error.message}`)
    return { sent: false, reason: error.message }
  }
}

module.exports = { sendMail }
