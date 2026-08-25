const { ok, created, fail } = require('../utils/response')
const assignmentModel = require('../models/assignment.model')

const list = async (ctx) =>
  ok(ctx.res, {
    assignments: await assignmentModel.listByCoach(ctx.user.id),
    submissions: await assignmentModel.submissionsForCoach(ctx.user.id),
  })

const create = async (ctx) => {
  if (!ctx.body.title || !ctx.body.courseId) return fail(ctx.res, 400, 'Title and course are required')
  const assignment = await assignmentModel.create(ctx.user.id, ctx.body)
  if (!assignment) return fail(ctx.res, 404, 'Course not found for this coach')
  return created(ctx.res, { assignment })
}

const update = async (ctx) => {
  const assignment = await assignmentModel.update(ctx.params.id, ctx.user.id, ctx.body)
  if (!assignment) return fail(ctx.res, 404, 'Assignment not found')
  return ok(ctx.res, { assignment })
}

const reviewSubmission = async (ctx) => {
  const submission = await assignmentModel.reviewSubmissionForCoach(ctx.params.id, ctx.user.id, ctx.body)
  if (!submission) return fail(ctx.res, 404, 'Submission not found')
  if (submission.invalid) return fail(ctx.res, 400, submission.message)
  return ok(ctx.res, { submission })
}

const remove = async (ctx) => {
  const removed = await assignmentModel.remove(ctx.params.id, ctx.user.id)
  if (!removed) return fail(ctx.res, 404, 'Assignment not found')
  return ok(ctx.res, { success: true })
}

module.exports = { list, create, update, remove, reviewSubmission }