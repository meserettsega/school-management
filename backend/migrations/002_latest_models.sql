-- Additive schema for Family and national exam models in the current backend.
-- Safe to import after 001_initial_mysql_schema.sql; it does not drop data.

CREATE TABLE IF NOT EXISTS families (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  school_code VARCHAR(100) NOT NULL DEFAULT '',
  school_name VARCHAR(255) NOT NULL DEFAULT '',
  family_id VARCHAR(100) NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'family',
  avatar TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login DATETIME(3) NULL,
  password_changed_at DATETIME(3) NULL,
  password_reset_token VARCHAR(255) NULL,
  password_reset_expires DATETIME(3) NULL,
  first_name VARCHAR(100) NOT NULL DEFAULT '',
  last_name VARCHAR(100) NOT NULL DEFAULT '',
  gender VARCHAR(20) NOT NULL DEFAULT 'Male',
  date_of_birth DATE NULL,
  relationship_to_student VARCHAR(100) NOT NULL DEFAULT 'Parent',
  preferred_contact_phone VARCHAR(50) NOT NULL DEFAULT '',
  preferred_contact_email VARCHAR(255) NOT NULL DEFAULT '',
  absence_reason_approval BOOLEAN NOT NULL DEFAULT TRUE,
  fee_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  result_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  event_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  sms_alerts BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_families_school FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE KEY uq_families_email_school_role (email, school_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS family_children (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  family_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  student_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  relation VARCHAR(100) NOT NULL DEFAULT 'Parent',
  student_name VARCHAR(255) NOT NULL DEFAULT '',
  student_class VARCHAR(100) NOT NULL DEFAULT '',
  admission_number VARCHAR(100) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  position INT NOT NULL,
  CONSTRAINT fk_family_children_family FOREIGN KEY (family_id) REFERENCES families(id),
  CONSTRAINT fk_family_children_student FOREIGN KEY (student_id) REFERENCES students(id),
  UNIQUE KEY uq_family_children_position (family_id, position),
  KEY ix_family_children_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS family_responsibilities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  family_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  responsibility TEXT NOT NULL,
  position INT NOT NULL,
  CONSTRAINT fk_family_responsibilities_family FOREIGN KEY (family_id) REFERENCES families(id),
  UNIQUE KEY uq_family_responsibilities_position (family_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS national_exams (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  grade VARCHAR(10) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  duration_minutes INT NOT NULL,
  attempts_allowed INT NOT NULL DEFAULT 0,
  available_from DATETIME(3) NULL,
  available_until DATETIME(3) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_by CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_by_model VARCHAR(30) NOT NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_national_exams_school FOREIGN KEY (school_id) REFERENCES schools(id),
  KEY ix_national_exams_school_grade_status_created (school_id, grade, status, created_at),
  KEY ix_national_exams_creator (created_by_model, created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS national_exam_questions (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  exam_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  position INT NOT NULL,
  prompt TEXT NOT NULL,
  correct_option INT NOT NULL,
  explanation TEXT NOT NULL,
  points INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_national_exam_questions_exam FOREIGN KEY (exam_id) REFERENCES national_exams(id),
  UNIQUE KEY uq_national_exam_question_position (exam_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS national_exam_question_options (
  question_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  option_index INT NOT NULL,
  option_text TEXT NOT NULL,
  PRIMARY KEY (question_id, option_index),
  CONSTRAINT fk_national_exam_question_options_question
    FOREIGN KEY (question_id) REFERENCES national_exam_questions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS national_exam_resources (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  exam_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  position INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'other',
  CONSTRAINT fk_national_exam_resources_exam FOREIGN KEY (exam_id) REFERENCES national_exams(id),
  UNIQUE KEY uq_national_exam_resource_position (exam_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS national_exam_attempts (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  exam_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  student_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'in-progress',
  started_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  submitted_at DATETIME(3) NULL,
  score DECIMAL(10,2) NULL,
  max_score DECIMAL(10,2) NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_national_exam_attempts_school FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_national_exam_attempts_exam FOREIGN KEY (exam_id) REFERENCES national_exams(id),
  CONSTRAINT fk_national_exam_attempts_student FOREIGN KEY (student_id) REFERENCES students(id),
  KEY ix_national_exam_attempts_school_student_exam_status (school_id, student_id, exam_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS national_exam_attempt_answers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  attempt_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  question_index INT NOT NULL,
  selected_option INT NULL,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_national_exam_attempt_answers_attempt
    FOREIGN KEY (attempt_id) REFERENCES national_exam_attempts(id),
  UNIQUE KEY uq_national_exam_attempt_answer (attempt_id, question_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS national_questions (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  grade VARCHAR(10) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  topic VARCHAR(255) NOT NULL DEFAULT '',
  difficulty VARCHAR(20) NOT NULL DEFAULT 'Standard',
  prompt TEXT NOT NULL,
  correct_option INT NOT NULL,
  explanation TEXT NOT NULL,
  points INT NOT NULL DEFAULT 1,
  created_by CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_by_model VARCHAR(30) NOT NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_national_questions_school FOREIGN KEY (school_id) REFERENCES schools(id),
  KEY ix_national_questions_school_grade_subject_topic (school_id, grade, subject, topic),
  KEY ix_national_questions_creator (created_by_model, created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS national_question_options (
  question_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  option_index INT NOT NULL,
  option_text TEXT NOT NULL,
  PRIMARY KEY (question_id, option_index),
  CONSTRAINT fk_national_question_options_question
    FOREIGN KEY (question_id) REFERENCES national_questions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS national_resources (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  grade VARCHAR(10) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  topic VARCHAR(255) NOT NULL DEFAULT '',
  type VARCHAR(30) NOT NULL DEFAULT 'other',
  url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL DEFAULT '',
  created_by CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_by_model VARCHAR(30) NOT NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_national_resources_school FOREIGN KEY (school_id) REFERENCES schools(id),
  KEY ix_national_resources_school_grade_subject_created (school_id, grade, subject, created_at),
  KEY ix_national_resources_creator (created_by_model, created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (version, applied_at)
VALUES ('002_latest_models', CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE applied_at = CURRENT_TIMESTAMP(3);
