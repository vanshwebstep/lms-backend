const fs = require('fs')
const path = require('path')
const { makeId } = require('../utils/id')

const root = path.resolve(__dirname, '..', '..')
const uploadRoot = path.join(root, 'uploads')

const ensureUploadRoot = () => {
  if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true })
}

const safeName = (name = 'file') =>
  String(name)
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 160)

const typeFromMime = (mime = '') => {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return 'document'
}

const saveUploadedFile = (file) => {
  ensureUploadRoot()
  const originalName = safeName(file.originalName || file.name || 'file')
  const storedName = `${makeId('file')}-${originalName}`
  const fullPath = path.join(uploadRoot, storedName)
  fs.writeFileSync(fullPath, file.buffer)
  return {
    originalName,
    storedName,
    fullPath,
    url: `/uploads/${encodeURIComponent(storedName)}`,
    mimeType: file.mimeType || 'application/octet-stream',
    sizeBytes: file.buffer.length,
    type: typeFromMime(file.mimeType || ''),
  }
}

const publicUploadPath = (pathname) => {
  const prefix = '/uploads/'
  if (!pathname.startsWith(prefix)) return null
  const name = decodeURIComponent(pathname.slice(prefix.length))
  const resolved = path.resolve(uploadRoot, name)
  if (!resolved.startsWith(path.resolve(uploadRoot))) return null
  return resolved
}

module.exports = { uploadRoot, saveUploadedFile, publicUploadPath, typeFromMime }
