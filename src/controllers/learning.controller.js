const { ok, created, fail } = require('../utils/response')
const learningModel = require('../models/learning.model')
const quizModel = require('../models/quiz.model')
const assignmentModel = require('../models/assignment.model')
const resourceModel = require('../models/resource.model')

const listCoachLessons = async (ctx) =>
  ok(ctx.res, { lessons: await learningModel.listLessonsForCoach(ctx.user.id, { courseId: ctx.query.get('courseId') }) })

const createCoachLesson = async (ctx) => {
  if (!ctx.body.courseId || !ctx.body.title) return fail(ctx.res, 400, 'Course and lesson title are required')
  const lesson = await learningModel.createLesson(ctx.user.id, ctx.body)
  if (!lesson) return fail(ctx.res, 404, 'Course not found for this coach')
  return created(ctx.res, { lesson })
}

const updateCoachLesson = async (ctx) => {
  const lesson = await learningModel.updateLesson(ctx.params.id, ctx.user.id, ctx.body)
  if (!lesson) return fail(ctx.res, 404, 'Lesson not found')
  return ok(ctx.res, { lesson })
}

const deleteCoachLesson = async (ctx) => {
  const removed = await learningModel.removeLesson(ctx.params.id, ctx.user.id)
  if (!removed) return fail(ctx.res, 404, 'Lesson not found')
  return ok(ctx.res, { success: true })
}

const listCoachTopics = async (ctx) =>
  ok(ctx.res, {
    topics: await learningModel.listTopicsForCoach(ctx.user.id, {
      lessonId: ctx.query.get('lessonId'),
      courseId: ctx.query.get('courseId'),
    }),
  })

const createCoachTopic = async (ctx) => {
  if (!ctx.body.lessonId || !(ctx.body.title || ctx.body.name)) return fail(ctx.res, 400, 'Lesson and topic title are required')
  const topic = await learningModel.createTopic(ctx.user.id, ctx.body)
  if (!topic) return fail(ctx.res, 404, 'Lesson not found for this coach')
  return created(ctx.res, { topic })
}

const updateCoachTopic = async (ctx) => {
  const topic = await learningModel.updateTopic(ctx.params.id, ctx.user.id, ctx.body)
  if (!topic) return fail(ctx.res, 404, 'Topic not found')
  return ok(ctx.res, { topic })
}

const deleteCoachTopic = async (ctx) => {
  const removed = await learningModel.removeTopic(ctx.params.id, ctx.user.id)
  if (!removed) return fail(ctx.res, 404, 'Topic not found')
  return ok(ctx.res, { success: true })
}

const listCoachQuizzes = async (ctx) =>
  ok(ctx.res, { quizzes: await quizModel.listForCoach(ctx.user.id, { courseId: ctx.query.get('courseId') }) })

const getCoachQuiz = async (ctx) => {
  const quiz = await quizModel.findForCoach(ctx.params.id, ctx.user.id)
  if (!quiz) return fail(ctx.res, 404, 'Quiz not found')
  return ok(ctx.res, { quiz })
}

const createCoachQuiz = async (ctx) => {
  if (!ctx.body.courseId || !ctx.body.title) return fail(ctx.res, 400, 'Course and quiz title are required')
  const quiz = await quizModel.create(ctx.user.id, ctx.body)
  if (!quiz) return fail(ctx.res, 404, 'Course not found for this coach')
  return created(ctx.res, { quiz })
}

const updateCoachQuiz = async (ctx) => {
  const quiz = await quizModel.update(ctx.params.id, ctx.user.id, ctx.body)
  if (!quiz) return fail(ctx.res, 404, 'Quiz not found')
  return ok(ctx.res, { quiz })
}

const deleteCoachQuiz = async (ctx) => {
  const removed = await quizModel.remove(ctx.params.id, ctx.user.id)
  if (!removed) return fail(ctx.res, 404, 'Quiz not found')
  return ok(ctx.res, { success: true })
}

const listCoachMaterials = async (ctx) => ok(ctx.res, { materials: await resourceModel.listMaterials(ctx.user.id) })

const createCoachMaterial = async (ctx) => {
  const material = await resourceModel.createMaterial(ctx.user.id, ctx.body, ctx.body.type || 'document')
  return created(ctx.res, { material })
}

const deleteCoachMaterial = async (ctx) => {
  const removed = await resourceModel.removeMaterial(ctx.user.id, ctx.params.id)
  if (!removed) return fail(ctx.res, 404, 'Material not found')
  return ok(ctx.res, { success: true })
}

const listPricingPlans = async (ctx) => ok(ctx.res, { plans: await resourceModel.listPricingPlans(ctx.user.id) })

const createPricingPlan = async (ctx) => {
  if (!ctx.body.name) return fail(ctx.res, 400, 'Plan name is required')
  const plan = await resourceModel.createPricingPlan(ctx.user.id, ctx.body)
  if (!plan) return fail(ctx.res, 404, 'Course not found for this coach')
  return created(ctx.res, { plan })
}

const updatePricingPlan = async (ctx) => {
  const plan = await resourceModel.updatePricingPlan(ctx.user.id, ctx.params.id, ctx.body)
  if (!plan) return fail(ctx.res, 404, 'Pricing plan not found')
  return ok(ctx.res, { plan })
}

const deletePricingPlan = async (ctx) => {
  const removed = await resourceModel.removePricingPlan(ctx.user.id, ctx.params.id)
  if (!removed) return fail(ctx.res, 404, 'Pricing plan not found')
  return ok(ctx.res, { success: true })
}

const studentCourseContent = async (ctx) => {
  const content = await learningModel.listLessonsForStudentCourse(ctx.user.id, ctx.params.courseId)
  if (!content) return fail(ctx.res, 404, 'Enrollment not found')
  return ok(ctx.res, content)
}

const updateStudentLessonProgress = async (ctx) => {
  const progress = await learningModel.updateLessonProgress(ctx.user.id, ctx.params.id, ctx.body)
  if (!progress) return fail(ctx.res, 404, 'Lesson not found in your enrolled courses')
  return ok(ctx.res, { progress })
}

const listStudentQuizzes = async (ctx) => ok(ctx.res, { quizzes: await quizModel.listForStudent(ctx.user.id) })

const attemptStudentQuiz = async (ctx) => {
  const attempt = await quizModel.attempt(ctx.user.id, ctx.params.id, ctx.body.answers || {})
  if (!attempt) return fail(ctx.res, 404, 'Quiz not found in your enrolled courses')
  return created(ctx.res, { attempt })
}

const listStudentAssignments = async (ctx) => ok(ctx.res, { assignments: await assignmentModel.listForStudent(ctx.user.id) })

const submitStudentAssignment = async (ctx) => {
  const submission = await assignmentModel.submitForStudent(ctx.user.id, ctx.params.id, ctx.body)
  if (!submission) return fail(ctx.res, 404, 'Assignment not found in your enrolled courses')
  return created(ctx.res, { submission })
}

const listStudentCertificates = async (ctx) =>
  ok(ctx.res, { certificates: await resourceModel.autoIssueCertificates(ctx.user.id) })

module.exports = {
  listCoachLessons,
  createCoachLesson,
  updateCoachLesson,
  deleteCoachLesson,
  listCoachTopics,
  createCoachTopic,
  updateCoachTopic,
  deleteCoachTopic,
  listCoachQuizzes,
  getCoachQuiz,
  createCoachQuiz,
  updateCoachQuiz,
  deleteCoachQuiz,
  listCoachMaterials,
  createCoachMaterial,
  deleteCoachMaterial,
  listPricingPlans,
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  studentCourseContent,
  updateStudentLessonProgress,
  listStudentQuizzes,
  attemptStudentQuiz,
  listStudentAssignments,
  submitStudentAssignment,
  listStudentCertificates,
}
