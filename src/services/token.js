const crypto = require('crypto')
const env = require('../config/env')
const { makeId } = require('../utils/id')

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const sign = (input) =>
  crypto.createHmac('sha256', env.jwtSecret).update(input).digest('base64url')

const createToken = (user, type, ttlMs, tokenId = makeId(type)) => {
  const payload = {
    sub: user.id,
    role: user.role,
    type,
    jti: tokenId,
    iat: Date.now(),
    exp: Date.now() + ttlMs,
  }
  const body = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`
  return { token: `${body}.${sign(body)}`, tokenId, payload }
}

const readToken = (token) => {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) throw new Error('Malformed token')
  const [header, payload, signature] = parts
  const expected = sign(`${header}.${payload}`)
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Invalid token signature')
  }
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  if (Date.now() > parsed.exp) throw new Error('Token expired')
  return parsed
}

module.exports = { createToken, readToken }