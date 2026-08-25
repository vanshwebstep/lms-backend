const db = require('../config/db')
const { makeId } = require('../utils/id')

const create = async ({ type = 'info', senderId = null, recipientId = null, recipientRole = null, title, message }) => {
  const id = makeId('notification')
  await db.query(
    `INSERT INTO notifications (id, type, sender_id, recipient_id, recipient_role, title, message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, type, senderId, recipientId, recipientRole, title, message]
  )
  return findById(id)
}

const findById = async (id) => db.first('SELECT * FROM notifications WHERE id = ?', [id])

const listForUser = async (user) =>
  db.query(
    `SELECT * FROM notifications
     WHERE recipient_id = ? OR recipient_role = ?
     ORDER BY created_at DESC`,
    [user.id, user.role]
  )

const markRead = async (id, user) => {
  const item = await findById(id)
  if (!item) return null
  if (item.recipient_id && item.recipient_id !== user.id) return false
  await db.query('UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?', [id])
  return findById(id)
}

module.exports = { create, listForUser, markRead }