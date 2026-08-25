const { ok } = require('../utils/response')

const placeholder = (name) => async (ctx) =>
  ok(ctx.res, {
    success: true,
    message: `${name} API placeholder is ready for schema-specific implementation`,
    items: [],
  })

module.exports = { placeholder }