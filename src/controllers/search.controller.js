const { ok } = require('../utils/response')
const searchModel = require('../models/search.model')

const run = async (ctx) => ok(ctx.res, await searchModel.search(ctx.user, ctx.query.get('q') || ''))

module.exports = { run }