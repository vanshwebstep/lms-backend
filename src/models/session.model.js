const db = require('../config/db')
const { makeId } = require('../utils/id')

const createSession = async ({ userId, accessTokenId, refreshTokenId, refreshExpiresAt }) => {
  await db.query(
    `INSERT INTO sessions (id, user_id, access_token_id, refresh_token_id, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [makeId('session'), userId, accessTokenId, refreshTokenId, new Date(refreshExpiresAt)]
  )
}

const revokeToken = async ({ tokenId, userId, expiresAt }) => {
  await db.query(
    `INSERT INTO revoked_tokens (token_id, user_id, expires_at)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE revoked_at = NOW()`,
    [tokenId, userId || null, expiresAt ? new Date(expiresAt) : null]
  )
}

const isRevoked = async (tokenId) => {
  const row = await db.first('SELECT token_id FROM revoked_tokens WHERE token_id = ?', [tokenId])
  return Boolean(row)
}

module.exports = { createSession, revokeToken, isRevoked }