const env = require('../config/env')
const { readToken } = require('../services/token')
const { fail } = require('../utils/response')
const userModel = require('../models/user.model')
const sessionModel = require('../models/session.model')

const auth = (roles = []) => async (ctx, next) => {
  const header = ctx.req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return fail(ctx.res, 401, 'Missing bearer token')

  let payload
  try {
    payload = readToken(token)
  } catch (error) {
    return fail(ctx.res, 401, error.message)
  }

  if (payload.type !== 'access') return fail(ctx.res, 401, 'Use an access token')
  if (await sessionModel.isRevoked(payload.jti)) return fail(ctx.res, 401, 'Token has been invalidated')

  const user = await userModel.findById(payload.sub)
  if (!user || user.status !== 'active') return fail(ctx.res, 401, 'User is not active')
  if (roles.length && !roles.includes(user.role)) return fail(ctx.res, 403, 'You are not allowed to access this resource')

  ctx.user = user
  ctx.tokenPayload = payload
  ctx.env = env
  return next()
}

module.exports = { auth }