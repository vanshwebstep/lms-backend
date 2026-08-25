const profileController = require('../controllers/profile.controller')
const { auth } = require('../middleware/auth')
const { ROLES } = require('../config/constants')

const register = (route) => {
  route('GET', '/api/profile', [auth(), profileController.getProfile])
  route('PUT', '/api/profile', [auth(), profileController.updateProfile])
  route('GET', '/api/admin/profile', [auth([ROLES.ADMIN]), profileController.getProfile])
  route('PUT', '/api/admin/profile', [auth([ROLES.ADMIN]), profileController.updateProfile])
  route('GET', '/api/coach/profile', [auth([ROLES.COACH]), profileController.getProfile])
  route('PUT', '/api/coach/profile', [auth([ROLES.COACH]), profileController.updateProfile])
  route('GET', '/api/student/profile', [auth([ROLES.STUDENT]), profileController.getProfile])
  route('PUT', '/api/student/profile', [auth([ROLES.STUDENT]), profileController.updateProfile])
}

module.exports = { register }