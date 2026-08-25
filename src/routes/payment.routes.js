const paymentController = require('../controllers/payment.controller')
const { auth } = require('../middleware/auth')
const { ROLES } = require('../config/constants')

const register = (route) => {
  route('POST', '/api/payments/checkout', [auth([ROLES.STUDENT]), paymentController.checkout])
  route('POST', '/api/students/enrollment/checkout', [auth([ROLES.STUDENT]), paymentController.checkout])
  route('POST', '/api/payments/create-order', [auth([ROLES.STUDENT]), paymentController.createOrder])
  route('POST', '/api/payments/verify', [auth([ROLES.STUDENT]), paymentController.verify])
  route('POST', '/api/student/enroll', [auth([ROLES.STUDENT]), paymentController.enroll])
  route('GET', '/api/payments/history', [auth(), paymentController.history])
}

module.exports = { register }