const { ok, created, fail, noContent } = require('../utils/response')
const masterDataModel = require('../models/masterData.model')

const listPublic = async (ctx) => ok(ctx.res, await masterDataModel.grouped({ activeOnly: true }))

const listAdmin = async (ctx) => {
  const type = masterDataModel.normalizeType(ctx.params.type)
  if (!type) return fail(ctx.res, 400, 'Invalid master data type')
  return ok(ctx.res, { options: await masterDataModel.list({ type, activeOnly: false }) })
}

const listAdminAll = async (ctx) => ok(ctx.res, await masterDataModel.grouped({ activeOnly: false }))

const createAdmin = async (ctx) => {
  const type = masterDataModel.normalizeType(ctx.params.type)
  if (!type) return fail(ctx.res, 400, 'Invalid master data type')
  const result = await masterDataModel.create({ type, name: ctx.body.name, status: ctx.body.status, user: ctx.user })
  if (result.error) return fail(ctx.res, 400, result.error)
  return created(ctx.res, { option: result.option, existing: result.existing })
}

const createCoachCategory = async (ctx) => {
  const result = await masterDataModel.create({ type: 'category', name: ctx.body.name, status: 'active', user: ctx.user })
  if (result.error) return fail(ctx.res, 400, result.error)
  return created(ctx.res, { category: result.option, existing: result.existing })
}

const updateAdmin = async (ctx) => {
  const type = masterDataModel.normalizeType(ctx.params.type)
  if (!type) return fail(ctx.res, 400, 'Invalid master data type')
  const existing = await masterDataModel.findById(ctx.params.id)
  if (!existing || existing.type !== type) return fail(ctx.res, 404, 'Master data value not found')
  const option = await masterDataModel.update(ctx.params.id, ctx.body)
  if (option?.error) return fail(ctx.res, 400, option.error)
  return ok(ctx.res, { option })
}

const deleteAdmin = async (ctx) => {
  const type = masterDataModel.normalizeType(ctx.params.type)
  if (!type) return fail(ctx.res, 400, 'Invalid master data type')
  const existing = await masterDataModel.findById(ctx.params.id)
  if (!existing || existing.type !== type) return fail(ctx.res, 404, 'Master data value not found')
  const result = await masterDataModel.remove(ctx.params.id)
  if (result?.error) return fail(ctx.res, 409, result.error)
  return noContent(ctx.res)
}

module.exports = { listPublic, listAdmin, listAdminAll, createAdmin, createCoachCategory, updateAdmin, deleteAdmin }