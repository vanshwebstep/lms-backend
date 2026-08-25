const emailConfigController = require('../controllers/emailConfig.controller')
const { auth } = require('../middleware/auth')
const { ROLES } = require('../config/constants')

const register = (route) => {
  const staffOnly = auth([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.COACH])
  const adminOnly = auth([ROLES.ADMIN, ROLES.SUPER_ADMIN])

  // Email Templates CRUD (Accessible by Superadmin and Coach)
  route('GET', '/api/email-templates', [staffOnly, emailConfigController.list])
  route('GET', '/api/email-templates/:id', [staffOnly, emailConfigController.getById])
  route('POST', '/api/email-templates', [adminOnly, emailConfigController.create])
  route('PUT', '/api/email-templates/:id', [staffOnly, emailConfigController.update])
  route('POST', '/api/email-templates/:id/reset', [staffOnly, emailConfigController.reset])
  route('DELETE', '/api/email-templates/:id', [adminOnly, emailConfigController.remove])
  route('POST', '/api/email-templates/:id/test-send', [staffOnly, emailConfigController.testSend])

  // Aliases for admin email configs
  route('GET', '/api/admin/email-configs', [adminOnly, emailConfigController.list])
  route('GET', '/api/admin/email-configs/:id', [adminOnly, emailConfigController.getById])
  route('PUT', '/api/admin/email-configs/:id', [adminOnly, emailConfigController.update])
  route('POST', '/api/admin/email-configs/:id/test-send', [adminOnly, emailConfigController.testSend])
}

module.exports = { register }
