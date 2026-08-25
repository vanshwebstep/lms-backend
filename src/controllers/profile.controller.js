const { ok } = require('../utils/response')
const userModel = require('../models/user.model')

const getProfile = async (ctx) => ok(ctx.res, { profile: userModel.toPublicUser(ctx.user) })

const updateProfile = async (ctx) => {
  const body = { ...ctx.body }
  if (ctx.user.role === 'student') delete body.avatar
  const user = await userModel.updateProfile(ctx.user.id, body)
  return ok(ctx.res, { user: userModel.toPublicUser(user) })
}

module.exports = { getProfile, updateProfile }