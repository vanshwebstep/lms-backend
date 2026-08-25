const resourceModel = require('../models/resource.model')
const { auth } = require('../middleware/auth')
const { created } = require('../utils/response')

const createUpload = (fileType) => async (ctx) => {
  const material = await resourceModel.createMaterial(ctx.user.id, ctx.body, fileType)
  return created(ctx.res, { upload: material, material })
}

const register = (route) => {
  route('POST', '/api/upload/image', [auth(), createUpload('image')])
  route('POST', '/api/upload/video', [auth(), createUpload('video')])
  route('POST', '/api/upload/document', [auth(), createUpload('document')])
}

module.exports = { register }
