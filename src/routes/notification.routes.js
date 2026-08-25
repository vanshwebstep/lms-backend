const notificationController = require('../controllers/notification.controller')
const { auth } = require('../middleware/auth')

const register = (route) => {
  route('GET', '/api/notifications', [auth(), notificationController.list])
  route('POST', '/api/notifications', [auth(), notificationController.create])
  route('PATCH', '/api/notifications/:id/read', [auth(), notificationController.markRead])
}

module.exports = { register }