const masterDataController = require('../controllers/masterData.controller')
const { auth } = require('../middleware/auth')
const { ROLES } = require('../config/constants')

const adminOnly = auth([ROLES.ADMIN])
const coachOnly = auth([ROLES.COACH])
const anyUser = auth([ROLES.ADMIN, ROLES.COACH, ROLES.STUDENT])

const register = (route) => {
  route('GET', '/api/master-data', [anyUser, masterDataController.listPublic])
  route('POST', '/api/coach/categories', [coachOnly, masterDataController.createCoachCategory])
  route('GET', '/api/admin/master-data', [adminOnly, masterDataController.listAdminAll])
  route('GET', '/api/admin/master-data/:type', [adminOnly, masterDataController.listAdmin])
  route('POST', '/api/admin/master-data/:type', [adminOnly, masterDataController.createAdmin])
  route('PUT', '/api/admin/master-data/:type/:id', [adminOnly, masterDataController.updateAdmin])
  route('PATCH', '/api/admin/master-data/:type/:id', [adminOnly, masterDataController.updateAdmin])
  route('DELETE', '/api/admin/master-data/:type/:id', [adminOnly, masterDataController.deleteAdmin])
}

module.exports = { register }