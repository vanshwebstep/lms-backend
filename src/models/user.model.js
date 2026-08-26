const db = require('../config/db')

const cleanEmail = (email = '') => String(email).trim().toLowerCase()

const toPublicUser = (user) => {
  if (!user) return null
  const { passwordHash, salt, ...safe } = user
  return safe
}

const mapUser = (row) => {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    title: row.title,
    status: row.status,
    avatar: row.avatar_url,
    passwordHash: row.password_hash,
    salt: row.salt,
    emailVerifiedAt: row.email_verified_at,
    profile: {
      phone: row.phone || '',
      city: row.city || '',
      bio: row.bio || '',
      expertise: row.expertise || '',
      education: row.education || '',
      addressLine1: row.address_line1 || '',
      addressLine2: row.address_line2 || '',
      state: row.state || '',
      country: row.country || '',
      pincode: row.pincode || '',
      metadata: parseJson(row.metadata, {}),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const parseJson = (value, fallback) => {
  if (!value) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const userSelect = `
  SELECT u.*, p.phone, p.city, p.bio, p.expertise, p.education, p.address_line1,
         p.address_line2, p.state, p.country, p.pincode, p.metadata
  FROM users u
  LEFT JOIN user_profiles p ON p.user_id = u.id
`

const findByEmail = async (email) => {
  const row = await db.first(`${userSelect} WHERE u.email = ?`, [cleanEmail(email)])
  return mapUser(row)
}

const findById = async (id) => {
  const row = await db.first(`${userSelect} WHERE u.id = ?`, [id])
  return mapUser(row)
}

const create = async (connection, user, profile = {}) => {
  await connection.execute(
    `INSERT INTO users (id, name, email, role, title, status, avatar_url, password_hash, salt, email_verified_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, NOW())`,
    [user.id, user.name, cleanEmail(user.email), user.role, user.title || '', user.avatar || null, user.passwordHash, user.salt]
  )
  await connection.execute(
    `INSERT INTO user_profiles (user_id, phone, city, bio, expertise, education, address_line1, address_line2, state, country, pincode, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      profile.phone || null,
      profile.city || null,
      profile.bio || null,
      profile.expertise || null,
      profile.education || null,
      profile.addressLine1 || profile.address || null,
      profile.addressLine2 || null,
      profile.state || null,
      profile.country || 'India',
      profile.pincode || profile.zip || null,
      profile.metadata ? JSON.stringify(profile.metadata) : null,
    ]
  )
}

const updateProfile = async (userId, body) => {
  if (body.name !== undefined || body.title !== undefined || body.avatar !== undefined) {
    const current = await findById(userId)
    await db.query(
      `UPDATE users SET name = ?, title = ?, avatar_url = ? WHERE id = ?`,
      [
        body.name ?? current.name,
        body.title ?? current.title,
        body.avatar !== undefined ? body.avatar : current.avatar,
        userId,
      ]
    )
  }

  if (body.profile) {
    const p = body.profile
    await db.query(
      `INSERT INTO user_profiles
       (user_id, phone, city, bio, expertise, education, address_line1, address_line2, state, country, pincode, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       phone = VALUES(phone), city = VALUES(city), bio = VALUES(bio),
       expertise = VALUES(expertise), education = VALUES(education),
       address_line1 = VALUES(address_line1), address_line2 = VALUES(address_line2),
       state = VALUES(state), country = VALUES(country), pincode = VALUES(pincode),
       metadata = VALUES(metadata)`,
      [
        userId,
        p.phone || null,
        p.city || null,
        p.bio || null,
        p.expertise || null,
        p.education || null,
        p.addressLine1 || null,
        p.addressLine2 || null,
        p.state || null,
        p.country || 'India',
        p.pincode || null,
        p.metadata ? JSON.stringify(p.metadata) : null,
      ]
    )
  }

  return findById(userId)
}

const listByRole = async (role) => {
  const rows = await db.query(`${userSelect} WHERE u.role = ? ORDER BY u.created_at DESC`, [role])
  return rows.map(mapUser).map(toPublicUser)
}

const setStatus = async (userId, status) => {
  await db.query('UPDATE users SET status = ? WHERE id = ?', [status, userId])
  return findById(userId)
}

const changePassword = async (userId, password) => {
  await db.query('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?', [
    password.passwordHash,
    password.salt,
    userId,
  ])
}

module.exports = {
  cleanEmail,
  toPublicUser,
  mapUser,
  findByEmail,
  findById,
  create,
  updateProfile,
  listByRole,
  setStatus,
  changePassword,
}