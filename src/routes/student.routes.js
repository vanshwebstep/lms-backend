const studentController = require('../controllers/student.controller')
const learningController = require('../controllers/learning.controller')
const { auth } = require('../middleware/auth')
const { ROLES } = require('../config/constants')

const studentOnly = auth([ROLES.STUDENT])

const register = (route) => {
  route('GET', '/api/student/stats', [studentOnly, studentController.stats])
  route('GET', '/api/student/courses/enrolled', [studentOnly, studentController.enrolledCourses])
  route('GET', '/api/student/courses/:courseId/content', [studentOnly, learningController.studentCourseContent])
  route('GET', '/api/student/progress', [studentOnly, studentController.progress])
  route('PATCH', '/api/student/lessons/:id/progress', [studentOnly, learningController.updateStudentLessonProgress])
  route('POST', '/api/student/lessons/:id/progress', [studentOnly, learningController.updateStudentLessonProgress])
  route('GET', '/api/student/quizzes', [studentOnly, learningController.listStudentQuizzes])
  route('POST', '/api/student/quizzes/:id/attempts', [studentOnly, learningController.attemptStudentQuiz])
  route('GET', '/api/student/assignments', [studentOnly, learningController.listStudentAssignments])
  route('POST', '/api/student/assignments/:id/submit', [studentOnly, learningController.submitStudentAssignment])
  route('GET', '/api/student/certificates', [studentOnly, learningController.listStudentCertificates])
}

module.exports = { register }
