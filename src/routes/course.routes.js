const courseController = require('../controllers/course.controller')
const { auth } = require('../middleware/auth')
const { ROLES } = require('../config/constants')

const register = (route) => {
  route('POST', '/api/coach/courses', [auth([ROLES.COACH]), courseController.createCourse])
  route('GET', '/api/coach/courses', [auth([ROLES.COACH]), courseController.coachCourses])
  route('GET', '/api/coach/courses/:id', [auth([ROLES.COACH]), courseController.coachCourseDetail])
  route('PUT', '/api/coach/courses/:id', [auth([ROLES.COACH]), courseController.updateCoachCourse])
  route('PATCH', '/api/coach/courses/:id', [auth([ROLES.COACH]), courseController.updateCoachCourse])
  route('GET', '/api/student/courses/browse', [auth([ROLES.STUDENT]), courseController.browseCourses])
  route('GET', '/api/admin/courses', [auth([ROLES.ADMIN]), courseController.allCourses])
  route('GET', '/api/admin/courses/:id', [auth([ROLES.ADMIN]), courseController.adminCourseDetail])
  route('PUT', '/api/admin/courses/:id', [auth([ROLES.ADMIN]), courseController.updateAdminCourse])
  route('PATCH', '/api/admin/courses/:id', [auth([ROLES.ADMIN]), courseController.updateAdminCourse])
}

module.exports = { register }