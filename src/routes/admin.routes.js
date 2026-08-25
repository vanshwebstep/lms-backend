const adminController = require('../controllers/admin.controller')
const { auth } = require('../middleware/auth')
const { ROLES } = require('../config/constants')

const adminOnly = auth([ROLES.ADMIN])

const register = (route) => {
  route('GET', '/api/admin/stats', [adminOnly, adminController.stats])
  route('GET', '/api/admin/coaches', [adminOnly, adminController.coaches])
  route('POST', '/api/admin/coaches', [adminOnly, adminController.createCoach])
  route('PUT', '/api/admin/coaches/:id', [adminOnly, adminController.updateCoach])
  route('PATCH', '/api/admin/coaches/:id', [adminOnly, adminController.updateCoach])
  route('DELETE', '/api/admin/coaches/:id', [adminOnly, adminController.deleteCoach])
  route('GET', '/api/admin/students', [adminOnly, adminController.students])
  route('GET', '/api/admin/payments', [adminOnly, adminController.payments])
  route('GET', '/api/admin/reports', [adminOnly, adminController.reports])
  route('GET', '/api/admin/settings', [adminOnly, adminController.getSettings])
  route('PUT', '/api/admin/settings', [adminOnly, adminController.updateSettings])
  route('GET', '/api/admin/subscriptions', [adminOnly, adminController.subscriptions])
  route('POST', '/api/admin/users/block', [adminOnly, adminController.blockUser])
  route('POST', '/api/admin/users/unblock', [adminOnly, adminController.unblockUser])
}

module.exports = { register }
