const db = require('../config/db')

const findConfig = async (module, action) =>
  db.first(
    'SELECT * FROM email_configs WHERE module = ? AND action = ? LIMIT 1',
    [module, action]
  )

module.exports = { findConfig }
