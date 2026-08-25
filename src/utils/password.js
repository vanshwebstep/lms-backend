const crypto = require('crypto')

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => ({
  salt,
  passwordHash: crypto.pbkdf2Sync(String(password), salt, 120000, 64, 'sha512').toString('hex'),
})

const verifyPassword = (password, user) => {
  if (!user?.salt || !user?.passwordHash) return false
  const check = hashPassword(password, user.salt).passwordHash
  return crypto.timingSafeEqual(Buffer.from(check), Buffer.from(user.passwordHash))
}

module.exports = { hashPassword, verifyPassword }