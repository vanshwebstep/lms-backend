const searchController = require('../controllers/search.controller')
const { auth } = require('../middleware/auth')
const { ROLES } = require('../config/constants')

const register = (route) => {
  route('GET', '/api/search', [auth(), searchController.run])
  route('GET', '/api/admin/search', [auth([ROLES.ADMIN]), searchController.run])
  route('GET', '/api/coach/search', [auth([ROLES.COACH]), searchController.run])
  route('GET', '/api/student/search', [auth([ROLES.STUDENT]), searchController.run])
}

module.exports = { register }