const db = require('../config/db')
const { makeId } = require('../utils/id')
const { parseJson } = require('./learning.model')
const { recalculateEnrollmentProgress } = require('./progress.model')

const mapQuestion = (row, exposeAnswer = true) => ({
  id: row.id,
  quizId: row.quiz_id,
  text: row.question_text,
  type: row.question_type,
  options: parseJson(row.options_json, []),
  correctAnswer: exposeAnswer ? parseJson(row.correct_answer_json, null) : undefined,
  marks: Number(row.marks || 1),
  sortOrder: Number(row.sort_order || 0),
})

const mapQuiz = (row) => ({
  id: row.id,
  courseId: row.course_id,
  lessonId: row.lesson_id,
  title: row.title,
  description: row.description || '',
  passingScore: Number(row.passing_score || 50),
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  course: row.course_title ? { id: row.course_id, title: row.course_title } : null,
  lesson: row.lesson_title ? { id: row.lesson_id, title: row.lesson_title } : null,
  questions: Number(row.questions || 0),
  attempts: Number(row.attempts || 0),
  avgScore: Number(row.avg_score || 0),
})

const listForCoach = async (coachId, { courseId } = {}) => {
  const params = [coachId]
  let where = 'WHERE c.coach_id = ?'
  if (courseId) {
    where += ' AND q.course_id = ?'
    params.push(courseId)
  }
  const rows = await db.query(
    `SELECT q.*, c.title AS course_title, l.title AS lesson_title,
            (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS questions,
            (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) AS attempts,
            (SELECT COALESCE(AVG(score), 0) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.status <> 'started') AS avg_score
     FROM quizzes q
     JOIN courses c ON c.id = q.course_id
     LEFT JOIN lessons l ON l.id = q.lesson_id
     ${where}
     ORDER BY q.created_at DESC`,
    params
  )
  return rows.map(mapQuiz)
}

const findForCoach = async (quizId, coachId) => {
  const row = await db.first(
    `SELECT q.*, c.title AS course_title, l.title AS lesson_title,
            (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS questions,
            (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) AS attempts,
            (SELECT COALESCE(AVG(score), 0) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.status <> 'started') AS avg_score
     FROM quizzes q
     JOIN courses c ON c.id = q.course_id
     LEFT JOIN lessons l ON l.id = q.lesson_id
     WHERE q.id = ? AND c.coach_id = ?`,
    [quizId, coachId]
  )
  if (!row) return null
  const questions = await db.query('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order, id', [quizId])
  return { ...mapQuiz(row), questionItems: questions.map((question) => mapQuestion(question, true)) }
}

const saveQuestions = async (connection, quizId, questions = []) => {
  await connection.execute('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId])
  for (const [index, question] of questions.entries()) {
    const options = question.options || []
    const correctAnswer = question.correctAnswer ?? question.correct ?? 0
    await connection.execute(
      `INSERT INTO quiz_questions
       (id, quiz_id, question_text, question_type, options_json, correct_answer_json, marks, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        makeId('question'),
        quizId,
        String(question.text || question.question || '').trim(),
        question.type || 'mcq',
        JSON.stringify(options),
        JSON.stringify(correctAnswer),
        Number(question.marks || 1),
        Number(question.sortOrder || index + 1),
      ]
    )
  }
}

const create = async (coachId, body) => {
  const course = await db.first('SELECT id FROM courses WHERE id = ? AND coach_id = ?', [body.courseId, coachId])
  if (!course) return null
  const id = makeId('quiz')
  await db.withTransaction(async (connection) => {
    await connection.execute(
      `INSERT INTO quizzes (id, course_id, lesson_id, title, description, passing_score, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        body.courseId,
        body.lessonId || null,
        String(body.title || '').trim(),
        body.description || null,
        Number(body.passingScore || body.passMark || 50),
        body.status || 'draft',
      ]
    )
    await saveQuestions(connection, id, body.questions || [])
  })
  return findForCoach(id, coachId)
}

const update = async (quizId, coachId, body) => {
  const existing = await findForCoach(quizId, coachId)
  if (!existing) return null
  const courseId = body.courseId || existing.courseId
  const course = await db.first('SELECT id FROM courses WHERE id = ? AND coach_id = ?', [courseId, coachId])
  if (!course) return null
  await db.withTransaction(async (connection) => {
    await connection.execute(
      `UPDATE quizzes SET course_id = ?, lesson_id = ?, title = ?, description = ?, passing_score = ?, status = ?
       WHERE id = ?`,
      [
        courseId,
        body.lessonId ?? existing.lessonId ?? null,
        String(body.title ?? existing.title).trim(),
        body.description ?? existing.description ?? null,
        Number(body.passingScore ?? body.passMark ?? existing.passingScore ?? 50),
        body.status || existing.status || 'draft',
        quizId,
      ]
    )
    if (Array.isArray(body.questions)) await saveQuestions(connection, quizId, body.questions)
  })
  return findForCoach(quizId, coachId)
}

const remove = async (quizId, coachId) => {
  const existing = await findForCoach(quizId, coachId)
  if (!existing) return false
  await db.query('DELETE FROM quizzes WHERE id = ?', [quizId])
  return true
}

const listForStudent = async (studentId) => {
  const rows = await db.query(
    `SELECT q.*, c.title AS course_title, l.title AS lesson_title,
            (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS questions,
            (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_id = ?) AS attempts,
            (SELECT COALESCE(MAX(score), 0) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.student_id = ?) AS avg_score
     FROM quizzes q
     JOIN courses c ON c.id = q.course_id
     JOIN enrollments e ON e.course_id = q.course_id AND e.student_id = ? AND e.status = 'active'
     LEFT JOIN lessons l ON l.id = q.lesson_id
     WHERE q.status = 'published'
     ORDER BY q.created_at DESC`,
    [studentId, studentId, studentId]
  )
  const quizzes = await Promise.all(rows.map(async (row) => {
    const questions = await db.query('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order, id', [row.id])
    return { ...mapQuiz(row), questionItems: questions.map((question) => mapQuestion(question, false)) }
  }))
  return quizzes
}

const attempt = async (studentId, quizId, answers = {}) => {
  const quiz = await db.first(
    `SELECT q.*, e.id AS enrollment_id
     FROM quizzes q
     JOIN enrollments e ON e.course_id = q.course_id AND e.student_id = ? AND e.status = 'active'
     WHERE q.id = ? AND q.status = 'published'`,
    [studentId, quizId]
  )
  if (!quiz) return null
  const questions = await db.query('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order, id', [quizId])
  const mapped = questions.map((question) => mapQuestion(question, true))
  const maxScore = mapped.reduce((sum, question) => sum + Number(question.marks || 1), 0)
  let correctAnswers = 0
  const score = mapped.reduce((sum, question) => {
    const answer = answers[question.id]
    const correct = JSON.stringify(answer) === JSON.stringify(question.correctAnswer)
    if (correct) correctAnswers += 1
    return correct ? sum + Number(question.marks || 1) : sum
  }, 0)
  const percent = maxScore ? Math.round((score / maxScore) * 100) : 0
  const status = percent >= Number(quiz.passing_score || 50) ? 'passed' : 'failed'
  const id = makeId('attempt')
  await db.query(
    `INSERT INTO quiz_attempts (id, quiz_id, student_id, enrollment_id, answers_json, score, status, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [id, quizId, studentId, quiz.enrollment_id, JSON.stringify(answers), percent, status]
  )
  await recalculateEnrollmentProgress(quiz.enrollment_id)
  const attempt = await db.first('SELECT * FROM quiz_attempts WHERE id = ?', [id])
  return {
    ...attempt,
    correctAnswers,
    totalQuestions: mapped.length,
    earnedScore: score,
    maxScore,
  }
}

module.exports = { listForCoach, findForCoach, create, update, remove, listForStudent, attempt }

