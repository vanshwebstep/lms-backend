const crypto = require('crypto')
const env = require('../config/env')
const db = require('../config/db')
const { ROLES } = require('../config/constants')
const { ok, created, fail } = require('../utils/response')
const { makeId } = require('../utils/id')
const { hashPassword, verifyPassword } = require('../utils/password')
const { createToken, readToken } = require('../services/token')
const { sendMail } = require('../services/mail')
const userModel = require('../models/user.model')
const sessionModel = require('../models/session.model')
const notificationModel = require('../models/notification.model')
const { saveUploadedFile } = require('../services/upload')

const makeSession = async (user) => {
  const access = createToken(user, 'access', env.accessTtlMs)
  const refresh = createToken(user, 'refresh', env.refreshTtlMs)
  await sessionModel.createSession({
    userId: user.id,
    accessTokenId: access.tokenId,
    refreshTokenId: refresh.tokenId,
    refreshExpiresAt: refresh.payload.exp,
  })
  return { user: userModel.toPublicUser(user), accessToken: access.token, refreshToken: refresh.token }
}

const login = async (ctx) => {
  const { email, password, role } = ctx.body
  if (!email || !password) return fail(ctx.res, 400, 'Email and password are required')
  const user = await userModel.findByEmail(email)
  if (!user || !verifyPassword(password, user)) return fail(ctx.res, 401, 'Invalid credentials')
  if (role && user.role !== role) return fail(ctx.res, 403, `This account is not a ${role}`)
  if (user.status !== 'active') return fail(ctx.res, 403, 'Your account is not active')
  return ok(ctx.res, await makeSession(user))
}

const register = async (ctx) => {
  const body = ctx.body
  if (!body.name || !body.email || !body.password) return fail(ctx.res, 400, 'Name, email and password are required')
  if (await userModel.findByEmail(body.email)) return fail(ctx.res, 409, 'Email is already registered')

  const faceImage = body.files?.find((file) => file.fieldName === 'faceImage' || file.fieldName === 'avatar')
  if (!faceImage) return fail(ctx.res, 400, 'Student face image is required')
  if (!String(faceImage.mimeType || '').startsWith('image/')) return fail(ctx.res, 400, 'Student face image must be an image file')

  const uploaded = saveUploadedFile(faceImage)
  const role = ROLES.STUDENT
  const hashed = hashPassword(body.password)
  const user = {
    id: makeId(role),
    name: String(body.name).trim(),
    email: userModel.cleanEmail(body.email),
    role,
    title: 'Learner',
    avatar: `${env.publicUrl}${uploaded.url}`,
    passwordHash: hashed.passwordHash,
    salt: hashed.salt,
  }
  const profile = {
    ...(body.profile && typeof body.profile === 'object' ? body.profile : {}),
    phone: body.phone || body.profile?.phone,
    city: body.city || body.profile?.city,
    education: body.education || body.profile?.education,
    state: body.state || body.profile?.state,
    country: body.country || body.profile?.country || 'India',
  }

  await db.withTransaction(async (connection) => userModel.create(connection, user, profile))
  const saved = await userModel.findById(user.id)
  await notificationModel.create({
    recipientRole: ROLES.ADMIN,
    title: 'New account registered',
    message: `${saved.name} joined as ${saved.role}.`,
  })

  await sendMail({
    module: 'student',
    action: 'student-registered',
    to: saved.email,
    vars: { name: saved.name, appName: env.appName },
  })

  return created(ctx.res, await makeSession(saved))
}

const me = async (ctx) => ok(ctx.res, { user: userModel.toPublicUser(ctx.user) })
const verifyToken = async (ctx) => ok(ctx.res, { valid: true, user: userModel.toPublicUser(ctx.user) })
const verifyEmail = async (ctx) => ok(ctx.res, { success: true, verified: true, token: ctx.body.token || ctx.query.get('token') || null })

const refreshToken = async (ctx) => {
  const { refreshToken } = ctx.body
  if (!refreshToken) return fail(ctx.res, 400, 'Refresh token is required')

  let payload
  try {
    payload = readToken(refreshToken)
  } catch (error) {
    return fail(ctx.res, 401, error.message)
  }
  if (payload.type !== 'refresh') return fail(ctx.res, 401, 'Use a refresh token')
  if (await sessionModel.isRevoked(payload.jti)) return fail(ctx.res, 401, 'Refresh token is invalidated')

  const user = await userModel.findById(payload.sub)
  if (!user) return fail(ctx.res, 401, 'User not found')
  const access = createToken(user, 'access', env.accessTtlMs)
  await sessionModel.createSession({
    userId: user.id,
    accessTokenId: access.tokenId,
    refreshTokenId: payload.jti,
    refreshExpiresAt: access.payload.exp,
  })
  return ok(ctx.res, { accessToken: access.token })
}

const logout = async (ctx) => {
  await sessionModel.revokeToken({
    tokenId: ctx.tokenPayload.jti,
    userId: ctx.user.id,
    expiresAt: ctx.tokenPayload.exp,
  })
  if (ctx.body.refreshToken) {
    try {
      const refresh = readToken(ctx.body.refreshToken)
      await sessionModel.revokeToken({ tokenId: refresh.jti, userId: ctx.user.id, expiresAt: refresh.exp })
    } catch {
      // Logout should still succeed for the access token.
    }
  }
  return ok(ctx.res, { success: true })
}

const forgotPassword = async (ctx) => {
  const email = userModel.cleanEmail(ctx.body.email)
  if (!email) return fail(ctx.res, 400, 'Email is required')
  const user = await userModel.findByEmail(email)
  if (!user) return fail(ctx.res, 404, 'No account found for this email')

  const resetToken = makeId('reset')
  const otp = String(crypto.randomInt(100000, 999999))
  const hashedOtp = hashPassword(otp)
  await db.withTransaction(async (connection) => {
    await connection.execute('DELETE FROM reset_tokens WHERE email = ?', [email])
    await connection.execute('DELETE FROM password_otps WHERE email = ?', [email])
    await connection.execute('INSERT INTO reset_tokens (token, email, expires_at) VALUES (?, ?, ?)', [
      resetToken,
      email,
      new Date(Date.now() + 15 * 60 * 1000),
    ])
    await connection.execute('INSERT INTO password_otps (email, otp_hash, salt, expires_at) VALUES (?, ?, ?, ?)', [
      email,
      hashedOtp.passwordHash,
      hashedOtp.salt,
      new Date(Date.now() + 10 * 60 * 1000),
    ])
  })
  await sendMail({
    module: 'admin',
    action: 'forgot-password',
    to: email,
    vars: { name: user.name, appName: env.appName, otp, resetToken },
  })
  return ok(ctx.res, { resetToken, demoOtp: otp, message: 'Reset token and OTP generated' })
}

const requestPasswordOtp = async (ctx) => {
  const email = userModel.cleanEmail(ctx.body.email)
  if (!email) return fail(ctx.res, 400, 'Email is required')
  const user = await userModel.findByEmail(email)
  if (!user) return fail(ctx.res, 404, 'No account found for this email')
  const otp = String(crypto.randomInt(100000, 999999))
  const hashed = hashPassword(otp)
  await db.query('DELETE FROM password_otps WHERE email = ?', [email])
  await db.query('INSERT INTO password_otps (email, otp_hash, salt, expires_at) VALUES (?, ?, ?, ?)', [
    email,
    hashed.passwordHash,
    hashed.salt,
    new Date(Date.now() + 10 * 60 * 1000),
  ])
  await sendMail({
    module: 'admin',
    action: 'forgot-password',
    to: email,
    vars: { name: user.name, appName: env.appName, otp },
  })
  return ok(ctx.res, { success: true, demoOtp: otp })
}

const resetPassword = async (ctx) => {
  const { token, email, otp, password } = ctx.body
  if (!password) return fail(ctx.res, 400, 'New password is required')
  let targetEmail = userModel.cleanEmail(email)

  if (token) {
    const reset = await db.first('SELECT * FROM reset_tokens WHERE token = ? AND used_at IS NULL AND expires_at > NOW()', [token])
    if (!reset) return fail(ctx.res, 400, 'Reset token is invalid or expired')
    targetEmail = reset.email
  }
  if (otp) {
    const savedOtp = await db.first('SELECT * FROM password_otps WHERE email = ? AND used_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1', [targetEmail])
    if (!savedOtp || !verifyPassword(otp, { salt: savedOtp.salt, passwordHash: savedOtp.otp_hash })) {
      return fail(ctx.res, 400, 'OTP is invalid or expired')
    }
    await db.query('UPDATE password_otps SET used_at = NOW() WHERE id = ?', [savedOtp.id])
  }
  const user = await userModel.findByEmail(targetEmail)
  if (!user) return fail(ctx.res, 404, 'User not found')
  await userModel.changePassword(user.id, hashPassword(password))
  if (token) await db.query('UPDATE reset_tokens SET used_at = NOW() WHERE token = ?', [token])
  return ok(ctx.res, { success: true })
}

const changePassword = async (ctx) => {
  const { oldPassword, newPassword } = ctx.body
  if (!oldPassword || !newPassword) return fail(ctx.res, 400, 'Old password and new password are required')
  if (!verifyPassword(oldPassword, ctx.user)) return fail(ctx.res, 400, 'Old password is incorrect')
  await userModel.changePassword(ctx.user.id, hashPassword(newPassword))
  return ok(ctx.res, { success: true })
}

const changePasswordWithOtp = async (ctx) => {
  ctx.body = { email: ctx.body.email, otp: ctx.body.otp, password: ctx.body.newPassword }
  return resetPassword(ctx)
}

module.exports = {
  login,
  register,
  me,
  verifyToken,
  verifyEmail,
  refreshToken,
  logout,
  forgotPassword,
  requestPasswordOtp,
  resetPassword,
  changePassword,
  changePasswordWithOtp,
}
