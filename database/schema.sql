-- LearnFlow LMS MySQL schema
-- Database name: lms_db
-- Run this whole file in MySQL Workbench/phpMyAdmin/terminal.

CREATE DATABASE IF NOT EXISTS lms_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lms_db;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  role ENUM('superadmin', 'coach', 'student') NOT NULL,
  title VARCHAR(120) NULL,
  status ENUM('active', 'blocked', 'pending') NOT NULL DEFAULT 'active',
  avatar_url VARCHAR(500) NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(64) NOT NULL,
  email_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id VARCHAR(64) PRIMARY KEY,
  phone VARCHAR(30) NULL,
  city VARCHAR(120) NULL,
  bio TEXT NULL,
  expertise VARCHAR(190) NULL,
  education VARCHAR(190) NULL,
  address_line1 VARCHAR(255) NULL,
  address_line2 VARCHAR(255) NULL,
  state VARCHAR(120) NULL,
  country VARCHAR(120) NULL DEFAULT 'India',
  pincode VARCHAR(20) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(64) PRIMARY KEY,
  coach_id VARCHAR(64) NOT NULL,
  title VARCHAR(220) NOT NULL,
  slug VARCHAR(240) NOT NULL UNIQUE,
  category VARCHAR(120) NOT NULL,
  difficulty VARCHAR(80) NOT NULL DEFAULT 'Beginner',
  language VARCHAR(80) NOT NULL DEFAULT 'Hinglish',
  category_id VARCHAR(64) NULL,
  difficulty_id VARCHAR(64) NULL,
  language_id VARCHAR(64) NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  thumbnail_url VARCHAR(500) NULL,
  promo_video VARCHAR(500) NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_courses_coach FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_courses_coach (coach_id),
  INDEX idx_courses_status (status),
  INDEX idx_courses_category (category),
  INDEX idx_courses_category_id (category_id),
  INDEX idx_courses_difficulty_id (difficulty_id),
  INDEX idx_courses_language_id (language_id),
  FULLTEXT KEY ft_courses_search (title, category, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_master_options (
  id VARCHAR(64) PRIMARY KEY,
  type ENUM('category', 'difficulty', 'language') NOT NULL,
  name VARCHAR(160) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_by VARCHAR(64) NULL,
  creator_role ENUM('system', 'superadmin', 'coach') NOT NULL DEFAULT 'system',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_course_master_options_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_course_master_options_type_name (type, name),
  INDEX idx_course_master_options_type (type),
  INDEX idx_course_master_options_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE courses
  ADD CONSTRAINT fk_courses_category FOREIGN KEY (category_id) REFERENCES course_master_options(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_courses_difficulty FOREIGN KEY (difficulty_id) REFERENCES course_master_options(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_courses_language FOREIGN KEY (language_id) REFERENCES course_master_options(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS course_requirements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  requirement_text VARCHAR(500) NOT NULL,
  CONSTRAINT fk_course_requirements_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_course_requirements_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_outcomes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  outcome_text VARCHAR(500) NOT NULL,
  CONSTRAINT fk_course_outcomes_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_course_outcomes_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lessons (
  id VARCHAR(64) PRIMARY KEY,
  course_id VARCHAR(64) NOT NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT NULL,
  content_type ENUM('video', 'document', 'link', 'text') NOT NULL DEFAULT 'video',
  content_url VARCHAR(500) NULL,
  duration_minutes INT NOT NULL DEFAULT 0,
  is_preview TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lessons_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_lessons_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_topics (
  id VARCHAR(64) PRIMARY KEY,
  lesson_id VARCHAR(64) NOT NULL,
  title VARCHAR(220) NOT NULL,
  body LONGTEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lesson_topics_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  INDEX idx_lesson_topics_lesson (lesson_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assignments (
  id VARCHAR(64) PRIMARY KEY,
  course_id VARCHAR(64) NOT NULL,
  lesson_id VARCHAR(64) NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT NOT NULL,
  attachment_url VARCHAR(500) NULL,
  attachment_name VARCHAR(255) NULL,
  due_at DATETIME NULL,
  max_score DECIMAL(6,2) NOT NULL DEFAULT 100.00,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_assignments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignments_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
  INDEX idx_assignments_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quizzes (
  id VARCHAR(64) PRIMARY KEY,
  course_id VARCHAR(64) NOT NULL,
  lesson_id VARCHAR(64) NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT NULL,
  passing_score DECIMAL(6,2) NOT NULL DEFAULT 50.00,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quizzes_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_quizzes_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
  INDEX idx_quizzes_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_questions (
  id VARCHAR(64) PRIMARY KEY,
  quiz_id VARCHAR(64) NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('mcq', 'true_false', 'short_answer') NOT NULL DEFAULT 'mcq',
  options_json JSON NULL,
  correct_answer_json JSON NULL,
  marks DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quiz_questions_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  INDEX idx_quiz_questions_quiz (quiz_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(120) NOT NULL,
  provider_payment_id VARCHAR(160) NULL,
  provider VARCHAR(80) NOT NULL DEFAULT 'demo',
  student_id VARCHAR(64) NOT NULL,
  coach_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('pending', 'success', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  student_details JSON NULL,
  gateway_response JSON NULL,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payments_coach FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  INDEX idx_payments_student (student_id),
  INDEX idx_payments_coach (coach_id),
  INDEX idx_payments_course (course_id),
  INDEX idx_payments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enrollments (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  coach_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  payment_id VARCHAR(64) NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status ENUM('active', 'cancelled', 'completed') NOT NULL DEFAULT 'active',
  progress DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_coach FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enrollments_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
  UNIQUE KEY uq_enrollments_student_course (student_id, course_id),
  INDEX idx_enrollments_coach (coach_id),
  INDEX idx_enrollments_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_progress (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  enrollment_id VARCHAR(64) NOT NULL,
  lesson_id VARCHAR(64) NOT NULL,
  status ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
  watched_seconds INT NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lesson_progress_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  CONSTRAINT fk_lesson_progress_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE KEY uq_lesson_progress_enrollment_lesson (enrollment_id, lesson_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id VARCHAR(64) PRIMARY KEY,
  assignment_id VARCHAR(64) NOT NULL,
  student_id VARCHAR(64) NOT NULL,
  enrollment_id VARCHAR(64) NOT NULL,
  answer_text LONGTEXT NULL,
  file_url VARCHAR(500) NULL,
  status ENUM('pending', 'submitted', 'graded') NOT NULL DEFAULT 'submitted',
  score DECIMAL(6,2) NULL,
  feedback TEXT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  graded_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_assignment_submissions_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignment_submissions_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_assignment_submissions_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  UNIQUE KEY uq_assignment_submission_student (assignment_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id VARCHAR(64) PRIMARY KEY,
  quiz_id VARCHAR(64) NOT NULL,
  student_id VARCHAR(64) NOT NULL,
  enrollment_id VARCHAR(64) NOT NULL,
  answers_json JSON NULL,
  score DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  status ENUM('started', 'submitted', 'passed', 'failed') NOT NULL DEFAULT 'started',
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quiz_attempts_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  CONSTRAINT fk_quiz_attempts_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_quiz_attempts_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  INDEX idx_quiz_attempts_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS certificates (
  id VARCHAR(64) PRIMARY KEY,
  student_id VARCHAR(64) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  enrollment_id VARCHAR(64) NOT NULL,
  certificate_no VARCHAR(120) NOT NULL UNIQUE,
  file_url VARCHAR(500) NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_certificates_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_certificates_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_certificates_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  UNIQUE KEY uq_certificates_enrollment (enrollment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(40) NOT NULL DEFAULT 'info',
  sender_id VARCHAR(64) NULL,
  recipient_id VARCHAR(64) NULL,
  recipient_role ENUM('superadmin', 'coach', 'student') NULL,
  title VARCHAR(220) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_recipient (recipient_id),
  INDEX idx_notifications_role (recipient_role),
  INDEX idx_notifications_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  access_token_id VARCHAR(120) NOT NULL,
  refresh_token_id VARCHAR(120) NOT NULL,
  revoked_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_access_token (access_token_id),
  INDEX idx_sessions_refresh_token (refresh_token_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS revoked_tokens (
  token_id VARCHAR(120) PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  revoked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  CONSTRAINT fk_revoked_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_otps (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(64) NOT NULL,
  used_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_otps_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reset_tokens (
  token VARCHAR(120) PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  used_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reset_tokens_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS uploads (
  id VARCHAR(64) PRIMARY KEY,
  owner_id VARCHAR(64) NOT NULL,
  file_type ENUM('image', 'video', 'document') NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NULL,
  size_bytes BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_uploads_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_uploads_owner (owner_id),
  INDEX idx_uploads_type (file_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO course_master_options (id, type, name, status, creator_role)
VALUES
('option-category-web-development', 'category', 'Web Development', 'active', 'system'),
('option-category-backend', 'category', 'Backend', 'active', 'system'),
('option-category-design', 'category', 'Design', 'active', 'system'),
('option-category-database', 'category', 'Database', 'active', 'system'),
('option-category-mobile', 'category', 'Mobile', 'active', 'system'),
('option-category-data-science', 'category', 'Data Science', 'active', 'system'),
('option-category-devops', 'category', 'DevOps', 'active', 'system'),
('option-difficulty-beginner', 'difficulty', 'Beginner', 'active', 'system'),
('option-difficulty-intermediate', 'difficulty', 'Intermediate', 'active', 'system'),
('option-difficulty-advanced', 'difficulty', 'Advanced', 'active', 'system'),
('option-language-hindi', 'language', 'Hindi', 'active', 'system'),
('option-language-english', 'language', 'English', 'active', 'system'),
('option-language-hinglish', 'language', 'Hinglish', 'active', 'system');
-- Demo users. Password for all three accounts is: password123
INSERT INTO users (id, name, email, role, title, status, password_hash, salt, email_verified_at)
VALUES
('admin-demo', 'Aarav Admin', 'admin@learnflow.local', 'superadmin', 'Platform Admin', 'active', 'a960ba69cd4c24c6f294b9b08980aa9b60a59a1613d7f935e4b494f7cba2bc061a1e951cc2dc706cfc250ee2b0adb1200f412efdd58fc15332c9bd6c6bd51144', '322a7bdfc3da7925f55dcfa4a3f689e2', NOW()),
('coach-demo', 'Meera Coach', 'coach@learnflow.local', 'coach', 'Course Coach', 'active', 'df68845839f873ed8241d2b36b122813f61cbc70592b7c21378426854d9ca2b74594d25a836238d677d55d6297d9245d60b522840540291528471c03022e544c', '168aab52dd396dfd1c14f11f879f2e49', NOW()),
('student-demo', 'Rohan Student', 'student@learnflow.local', 'student', 'Learner', 'active', '58c4df3872d7ec2c13b63a1fecd928947e07c16e677c22791434e5f7fa8e0b96b187ca1f7955b80ad37b5691d85a4615382fce5bb56af17ae34504aae13865c0', '7f7f247e77e8e08ea72732288da42df0', NOW())
ON DUPLICATE KEY UPDATE email = VALUES(email);

INSERT INTO user_profiles (user_id, phone, city, bio, expertise, education)
VALUES
('admin-demo', '9999999999', 'Delhi', 'Runs the LearnFlow platform.', NULL, NULL),
('coach-demo', '8888888888', 'Mumbai', NULL, 'Web Development', NULL),
('student-demo', '7777777777', 'Jaipur', NULL, NULL, 'B.Tech')
ON DUPLICATE KEY UPDATE phone = VALUES(phone), city = VALUES(city);

INSERT INTO courses (id, coach_id, title, slug, category, difficulty, language, description, price, currency, status, published_at)
VALUES
('course-react-masterclass', 'coach-demo', 'React Masterclass 2026', 'react-masterclass-2026', 'Web Development', 'Beginner', 'Hinglish', 'Build production-ready React apps with routing, APIs, state, and dashboards.', 999.00, 'INR', 'published', NOW())
ON DUPLICATE KEY UPDATE title = VALUES(title);

INSERT INTO course_requirements (course_id, sort_order, requirement_text)
SELECT 'course-react-masterclass', 1, 'Basic JavaScript'
WHERE NOT EXISTS (
  SELECT 1 FROM course_requirements WHERE course_id = 'course-react-masterclass' AND requirement_text = 'Basic JavaScript'
);

INSERT INTO course_outcomes (course_id, sort_order, outcome_text)
SELECT 'course-react-masterclass', 1, 'Build React dashboards'
WHERE NOT EXISTS (
  SELECT 1 FROM course_outcomes WHERE course_id = 'course-react-masterclass' AND outcome_text = 'Build React dashboards'
);

INSERT INTO platform_settings (setting_key, setting_value)
VALUES
('platform_fee_percent', '10'),
('currency', '"INR"')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

