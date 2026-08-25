const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', '..')
const envPath = path.join(root, '.env')

if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    const rawValue = trimmed.slice(index + 1).trim()
    const value = rawValue.replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

const env = {
  port: Number(process.env.PORT || 5000),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  appName: process.env.APP_NAME || 'LearnFlow',
  publicUrl: process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`,
  paymentProvider: process.env.PAYMENT_PROVIDER || 'demo',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-this-secret',
  accessTtlMs: 2 * 60 * 60 * 1000,
  refreshTtlMs: 7 * 24 * 60 * 60 * 1000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lms_db',
  },
  // SMTP host/port/creds AND recipient addresses (to/cc/bcc) now live in the
  // `email_configs` DB table (per module+action row) — nothing mail-related here anymore.
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
  },
}

module.exports = env
