const ROLES = {
  ADMIN: 'superadmin',
  COACH: 'coach',
  STUDENT: 'student',
}

const COURSE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
}

const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
}

module.exports = { ROLES, COURSE_STATUS, PAYMENT_STATUS }