const { created, ok, fail } = require('../utils/response')
const notificationModel = require('../models/notification.model')

const list = async (ctx) => ok(ctx.res, { notifications: await notificationModel.listForUser(ctx.user) })

const create = async (ctx) => {
  const { recipientId, recipientRole, title, message, type } = ctx.body
  if (!title || !message) return fail(ctx.res, 400, 'Title and message are required')
  if (ctx.user.role !== 'superadmin' && recipientRole) return fail(ctx.res, 403, 'Only admin can send role-wide notifications')
  const notification = await notificationModel.create({
    recipientId,
    recipientRole,
    title,
    message,
    type,
    senderId: ctx.user.id,
  })
  return created(ctx.res, { notification })
}

const markRead = async (ctx) => {
  const notification = await notificationModel.markRead(ctx.params.id, ctx.user)
  if (!notification) return fail(ctx.res, 404, 'Notification not found')
  if (notification === false) return fail(ctx.res, 403, 'Cannot update this notification')
  return ok(ctx.res, { notification })
}

module.exports = { list, create, markRead }