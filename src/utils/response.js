const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

const ok = (res, payload = {}) => sendJson(res, 200, payload)
const created = (res, payload = {}) => sendJson(res, 201, payload)
const noContent = (res) => {
  res.writeHead(204)
  res.end()
}

const fail = (res, statusCode, message, details) =>
  sendJson(res, statusCode, { success: false, message, ...(details ? { details } : {}) })

module.exports = { sendJson, ok, created, noContent, fail }