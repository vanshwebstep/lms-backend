const db = require("../config/db");

const recalculateEnrollmentProgress = async (enrollmentId) => {
  const enrollment = await db.first(
    "SELECT id, course_id FROM enrollments WHERE id = ?",
    [enrollmentId],
  );
  if (!enrollment) return null;

  const totals = await db.first(
    `SELECT
       (SELECT COUNT(*) FROM lessons WHERE course_id = ? AND status = 'published') AS total_lessons,
       (SELECT COUNT(*) FROM assignments WHERE course_id = ? AND status = 'published') AS total_assignments,
       (SELECT COUNT(*) FROM quizzes WHERE course_id = ? AND status = 'published') AS total_quizzes,
       (SELECT COUNT(*)
        FROM lesson_progress lp
        JOIN lessons l ON l.id = lp.lesson_id
        WHERE lp.enrollment_id = ? AND lp.status = 'completed' AND l.status = 'published') AS completed_lessons,
       (SELECT COUNT(*)
        FROM assignment_submissions s
        JOIN assignments a ON a.id = s.assignment_id
        WHERE s.enrollment_id = ? AND s.status IN ('submitted', 'graded') AND a.status = 'published') AS submitted_assignments,
       (SELECT COUNT(DISTINCT qa.quiz_id)
        FROM quiz_attempts qa
        JOIN quizzes q ON q.id = qa.quiz_id
        WHERE qa.enrollment_id = ? AND qa.status = 'passed' AND q.status = 'published') AS passed_quizzes`,
    [
      enrollment.course_id,
      enrollment.course_id,
      enrollment.course_id,
      enrollmentId,
      enrollmentId,
      enrollmentId,
    ],
  );

  const total =
    Number(totals?.total_lessons || 0) +
    Number(totals?.total_assignments || 0) +
    Number(totals?.total_quizzes || 0);
  const completed =
    Number(totals?.completed_lessons || 0) +
    Number(totals?.submitted_assignments || 0) +
    Number(totals?.passed_quizzes || 0);
  const progress = total ? Math.round((completed / total) * 100) : 0;

  await db.query(
    `UPDATE enrollments
     SET progress = ?,
         completed_at = CASE WHEN ? >= 100 THEN COALESCE(completed_at, NOW()) ELSE NULL END
     WHERE id = ?`,
    [progress, progress, enrollmentId],
  );

  return { progress, total, completed, ...totals };
};

module.exports = { recalculateEnrollmentProgress };
