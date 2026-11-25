-- Initial MySQL schema for the MongoDB collections in backend/models.
-- Mongo ObjectIds are preserved as 24-character strings during migration.
-- Target MySQL 8.0+ or MariaDB 10.11+; do not apply to a live database
-- without a verified backup.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) NOT NULL PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schools (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  admin_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address JSON NULL,
  logo TEXT NULL,
  website VARCHAR(500) NULL,
  principal_name VARCHAR(255) NULL,
  principal_email VARCHAR(255) NULL,
  student_count INT NOT NULL DEFAULT 0,
  teacher_count INT NOT NULL DEFAULT 0,
  class_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  UNIQUE KEY uq_schools_code (code),
  UNIQUE KEY uq_schools_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  role VARCHAR(20) NOT NULL,
  avatar TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login DATETIME(3) NULL,
  password_changed_at DATETIME(3) NULL,
  password_reset_token VARCHAR(255) NULL,
  password_reset_expires DATETIME(3) NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_users_school FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE KEY uq_users_email_school_role (email, school_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_model VARCHAR(20) NOT NULL,
  token TEXT NOT NULL,
  created_at DATETIME(3) NULL,
  KEY ix_refresh_tokens_owner (user_model, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classes (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  standard VARCHAR(50) NOT NULL,
  division VARCHAR(50) NOT NULL,
  class_teacher_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  capacity INT NOT NULL DEFAULT 40,
  student_count INT NOT NULL DEFAULT 0,
  room VARCHAR(100) NULL,
  academic_year VARCHAR(30) NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_classes_school FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE KEY uq_classes_school_standard_division (school_id, standard, division),
  KEY ix_classes_teacher (class_teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS students (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  school_code VARCHAR(100) NOT NULL DEFAULT '',
  school_name VARCHAR(255) NOT NULL DEFAULT '',
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student',
  avatar TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login DATETIME(3) NULL,
  password_changed_at DATETIME(3) NULL,
  password_reset_token VARCHAR(255) NULL,
  password_reset_expires DATETIME(3) NULL,
  student_id VARCHAR(100) NULL,
  admission_number VARCHAR(100) NULL,
  roll_number VARCHAR(100) NULL,
  first_name VARCHAR(100) NOT NULL DEFAULT '',
  middle_name VARCHAR(100) NOT NULL DEFAULT '',
  last_name VARCHAR(100) NOT NULL DEFAULT '',
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  gender VARCHAR(20) NOT NULL DEFAULT 'Male',
  date_of_birth DATE NULL,
  blood_group VARCHAR(20) NULL,
  photo TEXT NULL,
  aadhaar_number VARCHAR(100) NOT NULL DEFAULT '',
  nationality VARCHAR(100) NOT NULL DEFAULT 'Indian',
  religion VARCHAR(100) NOT NULL DEFAULT '',
  caste_category VARCHAR(100) NOT NULL DEFAULT '',
  mobile_number VARCHAR(50) NULL,
  alternate_mobile_number VARCHAR(50) NULL,
  current_address TEXT NULL,
  permanent_address TEXT NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  pin_code VARCHAR(30) NULL,
  father JSON NULL,
  mother JSON NULL,
  guardian JSON NULL,
  class_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  division VARCHAR(50) NULL,
  house VARCHAR(100) NOT NULL DEFAULT '',
  academic_year VARCHAR(30) NOT NULL DEFAULT '',
  admission_date DATETIME(3) NULL,
  previous_school VARCHAR(255) NOT NULL DEFAULT 'Fresh',
  student_status VARCHAR(30) NOT NULL DEFAULT 'Active',
  medium VARCHAR(100) NOT NULL DEFAULT 'English',
  emergency_contact JSON NULL,
  allergies TEXT NOT NULL,
  medical_conditions TEXT NOT NULL,
  disability TEXT NOT NULL,
  doctor_name VARCHAR(255) NOT NULL DEFAULT '',
  medical_notes TEXT NOT NULL,
  uses_school_bus VARCHAR(10) NOT NULL DEFAULT 'No',
  bus_route VARCHAR(100) NOT NULL DEFAULT '',
  bus_stop VARCHAR(100) NOT NULL DEFAULT '',
  bus_number VARCHAR(100) NOT NULL DEFAULT '',
  driver_name VARCHAR(255) NOT NULL DEFAULT '',
  driver_contact VARCHAR(50) NOT NULL DEFAULT '',
  library_card_number VARCHAR(100) NOT NULL DEFAULT '',
  books_issued INT NOT NULL DEFAULT 0,
  issue_date DATE NULL,
  return_date DATE NULL,
  fine DECIMAL(12,2) NOT NULL DEFAULT 0,
  book_status VARCHAR(100) NOT NULL DEFAULT '',
  username VARCHAR(255) NULL,
  account_status VARCHAR(30) NOT NULL DEFAULT 'Active',
  documents JSON NULL,
  attendance_percentage DECIMAL(6,2) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_students_school FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_students_class FOREIGN KEY (class_id) REFERENCES classes(id),
  UNIQUE KEY uq_students_email_school (email, school_id),
  KEY ix_students_roll_class (school_id, class_id, roll_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subjects (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  description TEXT NULL,
  max_marks DECIMAL(10,2) NOT NULL DEFAULT 100,
  min_marks DECIMAL(10,2) NOT NULL DEFAULT 35,
  standard VARCHAR(50) NULL,
  default_weekly_lectures INT NOT NULL DEFAULT 5,
  weightage DECIMAL(8,2) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_subjects_school FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE KEY uq_subjects_school_code (school_id, code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_subjects (
  student_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  subject_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (student_id, subject_id),
  CONSTRAINT fk_student_subjects_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_student_subjects_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teachers (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  school_code VARCHAR(100) NOT NULL DEFAULT '',
  school_name VARCHAR(255) NOT NULL DEFAULT '',
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'teacher',
  avatar TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login DATETIME(3) NULL,
  password_changed_at DATETIME(3) NULL,
  password_reset_token VARCHAR(255) NULL,
  password_reset_expires DATETIME(3) NULL,
  teacher_id VARCHAR(100) NULL,
  employee_id VARCHAR(100) NULL,
  staff_code VARCHAR(100) NULL,
  first_name VARCHAR(100) NOT NULL DEFAULT '',
  middle_name VARCHAR(100) NOT NULL DEFAULT '',
  last_name VARCHAR(100) NOT NULL DEFAULT '',
  gender VARCHAR(20) NOT NULL DEFAULT 'Male',
  date_of_birth DATE NULL,
  blood_group VARCHAR(20) NULL,
  aadhaar_number VARCHAR(100) NOT NULL DEFAULT '',
  pan_number VARCHAR(100) NOT NULL DEFAULT '',
  nationality VARCHAR(100) NOT NULL DEFAULT 'Indian',
  marital_status VARCHAR(30) NOT NULL DEFAULT 'Single',
  alternate_mobile_number VARCHAR(50) NULL,
  emergency_contact_number VARCHAR(50) NULL,
  current_address TEXT NULL,
  permanent_address TEXT NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  pin_code VARCHAR(30) NULL,
  designation VARCHAR(255) NULL,
  department VARCHAR(255) NULL,
  joining_date DATE NULL,
  employment_type VARCHAR(30) NOT NULL DEFAULT 'Full-Time',
  experience DECIMAL(8,2) NOT NULL DEFAULT 0,
  previous_school VARCHAR(255) NULL,
  employee_status VARCHAR(30) NOT NULL DEFAULT 'Active',
  reporting_to VARCHAR(255) NULL,
  salary_details JSON NULL,
  is_class_teacher BOOLEAN NOT NULL DEFAULT FALSE,
  class_teacher_of CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  documents JSON NULL,
  username VARCHAR(255) NULL,
  account_status VARCHAR(30) NOT NULL DEFAULT 'Active',
  created_by CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_by_model VARCHAR(30) NULL,
  updated_by CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  updated_by_model VARCHAR(30) NULL,
  soft_delete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_teachers_school FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_teachers_class_teacher_of FOREIGN KEY (class_teacher_of) REFERENCES classes(id),
  UNIQUE KEY uq_teachers_employee_id (employee_id),
  UNIQUE KEY uq_teachers_email_school (email, school_id),
  KEY ix_teachers_created_by (created_by_model, created_by),
  KEY ix_teachers_updated_by (updated_by_model, updated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subject_lectures (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  subject_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  standard VARCHAR(50) NOT NULL,
  weekly_lectures INT NOT NULL DEFAULT 5,
  lecture_duration VARCHAR(10) NOT NULL DEFAULT '60',
  total_portion_lectures INT NOT NULL DEFAULT 40,
  weightage DECIMAL(8,2) NOT NULL DEFAULT 1,
  CONSTRAINT fk_subject_lectures_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_qualifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  degree VARCHAR(100) NULL,
  university VARCHAR(255) NULL,
  year VARCHAR(20) NULL,
  percentage_cgpa VARCHAR(50) NULL,
  CONSTRAINT fk_teacher_qualifications_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_leaves (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  leave_type VARCHAR(100) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  number_of_days DECIMAL(8,2) NULL,
  reason TEXT NULL,
  supporting_document TEXT NULL,
  approval_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  approved_by VARCHAR(255) NULL,
  CONSTRAINT fk_teacher_leaves_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_subjects (
  teacher_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  subject_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (teacher_id, subject_id),
  CONSTRAINT fk_teacher_subjects_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  CONSTRAINT fk_teacher_subjects_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_classes (
  teacher_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  class_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  PRIMARY KEY (teacher_id, class_id),
  CONSTRAINT fk_teacher_classes_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  CONSTRAINT fk_teacher_classes_class FOREIGN KEY (class_id) REFERENCES classes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_assigned_standards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  subject_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  standard VARCHAR(50) NOT NULL,
  CONSTRAINT fk_teacher_standards_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  CONSTRAINT fk_teacher_standards_subject FOREIGN KEY (subject_id) REFERENCES subjects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_subject_class_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  teacher_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  subject_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  class_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  CONSTRAINT fk_teacher_subject_class_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  CONSTRAINT fk_teacher_subject_class_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_teacher_subject_class_class FOREIGN KEY (class_id) REFERENCES classes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exams (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(255) NOT NULL,
  class_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  subject_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  date DATETIME(3) NOT NULL,
  start_time VARCHAR(20) NULL,
  end_time VARCHAR(20) NULL,
  total_marks DECIMAL(10,2) NOT NULL DEFAULT 100,
  passing_marks DECIMAL(10,2) NOT NULL DEFAULT 35,
  duration VARCHAR(100) NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_exams_school FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_exams_class FOREIGN KEY (class_id) REFERENCES classes(id),
  CONSTRAINT fk_exams_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  KEY ix_exams_school_date (school_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  student_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  class_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  subject_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  teacher_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  subject_key CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL
    DEFAULT '000000000000000000000000',
  date DATETIME(3) NOT NULL,
  period_start_time VARCHAR(20) NULL,
  period_end_time VARCHAR(20) NULL,
  status VARCHAR(20) NOT NULL,
  remarks TEXT NULL,
  marked_by CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  marked_by_model VARCHAR(30) NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_attendance_school FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_attendance_class FOREIGN KEY (class_id) REFERENCES classes(id),
  CONSTRAINT fk_attendance_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_attendance_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  KEY ix_attendance_school_student_date (school_id, student_id, date),
  UNIQUE KEY uq_attendance_school_student_date_subject (school_id, student_id, date, subject_key),
  KEY ix_attendance_marker (marked_by_model, marked_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marks (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  exam_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  student_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  subject_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  marks DECIMAL(10,2) NOT NULL,
  out_of_marks DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(7,3) NULL,
  grade VARCHAR(30) NULL,
  pass_status VARCHAR(20) NULL,
  remarks TEXT NULL,
  entered_by CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  entered_by_model VARCHAR(30) NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_marks_school FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_marks_exam FOREIGN KEY (exam_id) REFERENCES exams(id),
  CONSTRAINT fk_marks_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_marks_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  UNIQUE KEY uq_marks_exam_student_subject (school_id, exam_id, student_id, subject_id),
  KEY ix_marks_entered_by (entered_by_model, entered_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timetable_configs (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  school_start_time VARCHAR(10) NOT NULL DEFAULT '08:00',
  school_end_time VARCHAR(10) NOT NULL DEFAULT '14:00',
  lecture_duration_minutes INT NOT NULL DEFAULT 45,
  academic_year VARCHAR(30) NOT NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_timetable_configs_school FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE KEY uq_timetable_configs_school (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timetable_working_days (
  config_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  PRIMARY KEY (config_id, day_of_week),
  CONSTRAINT fk_timetable_working_days_config FOREIGN KEY (config_id) REFERENCES timetable_configs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timetable_breaks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  config_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(100) NOT NULL DEFAULT 'Break',
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  CONSTRAINT fk_timetable_breaks_config FOREIGN KEY (config_id) REFERENCES timetable_configs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timetables (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  class_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  day_of_week VARCHAR(20) NOT NULL,
  academic_year VARCHAR(30) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_timetables_school FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_timetables_class FOREIGN KEY (class_id) REFERENCES classes(id),
  UNIQUE KEY uq_timetables_class_day (school_id, class_id, day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timetable_slots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  timetable_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  start_time VARCHAR(10) NULL,
  end_time VARCHAR(10) NULL,
  subject_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  teacher_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  is_break BOOLEAN NOT NULL DEFAULT FALSE,
  break_name VARCHAR(100) NOT NULL DEFAULT '',
  room VARCHAR(100) NULL,
  CONSTRAINT fk_timetable_slots_timetable FOREIGN KEY (timetable_id) REFERENCES timetables(id),
  CONSTRAINT fk_timetable_slots_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_timetable_slots_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fee_structures (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  standard VARCHAR(50) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  total_months INT NOT NULL DEFAULT 12,
  total_installments INT NOT NULL DEFAULT 4,
  academic_year VARCHAR(30) NOT NULL DEFAULT '',
  q1_amount DECIMAL(12,2) NOT NULL,
  q2_amount DECIMAL(12,2) NOT NULL,
  q3_amount DECIMAL(12,2) NOT NULL,
  q4_amount DECIMAL(12,2) NOT NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_fee_structures_school FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE KEY uq_fee_structures_school_standard (school_id, standard)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_fees (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  student_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  class_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  q1_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  q2_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  q3_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  q4_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  q1_paid_date DATETIME(3) NULL,
  q2_paid_date DATETIME(3) NULL,
  q3_paid_date DATETIME(3) NULL,
  q4_paid_date DATETIME(3) NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_student_fees_school FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_student_fees_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_student_fees_class FOREIGN KEY (class_id) REFERENCES classes(id),
  UNIQUE KEY uq_student_fees_school_student (school_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_fee_installments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_fee_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  installment_number INT NOT NULL,
  paid_date DATETIME(3) NULL,
  UNIQUE KEY uq_student_fee_installment (student_fee_id, installment_number),
  CONSTRAINT fk_student_fee_installments_fee FOREIGN KEY (student_fee_id) REFERENCES student_fees(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notices (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'General',
  content LONGTEXT NOT NULL,
  created_by CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_by_model VARCHAR(30) NOT NULL,
  target_audience VARCHAR(30) NOT NULL,
  target_class_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  target_user_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
  expires_at DATETIME(3) NULL,
  exam_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_notices_school FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_notices_class FOREIGN KEY (target_class_id) REFERENCES classes(id),
  CONSTRAINT fk_notices_exam FOREIGN KEY (exam_id) REFERENCES exams(id),
  KEY ix_notices_author (created_by_model, created_by),
  KEY ix_notices_target_user (target_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notice_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  notice_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  url TEXT NOT NULL,
  CONSTRAINT fk_notice_attachments_notice FOREIGN KEY (notice_id) REFERENCES notices(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notice_views (
  notice_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  viewed_date DATETIME(3) NULL,
  PRIMARY KEY (notice_id, user_id),
  CONSTRAINT fk_notice_views_notice FOREIGN KEY (notice_id) REFERENCES notices(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaints (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  raised_by CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  raised_by_model VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description LONGTEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Pending',
  priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
  assigned_to CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  assigned_to_model VARCHAR(30) NULL,
  resolution TEXT NULL,
  resolved_date DATETIME(3) NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_complaints_school FOREIGN KEY (school_id) REFERENCES schools(id),
  KEY ix_complaints_raised_by (raised_by_model, raised_by),
  KEY ix_complaints_assigned_to (assigned_to_model, assigned_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  complaint_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  url TEXT NOT NULL,
  CONSTRAINT fk_complaint_attachments_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_comments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  complaint_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  user_model VARCHAR(30) NULL,
  comment TEXT NULL,
  created_at DATETIME(3) NULL,
  CONSTRAINT fk_complaint_comments_complaint FOREIGN KEY (complaint_id) REFERENCES complaints(id),
  KEY ix_complaint_comments_user (user_model, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  event_type VARCHAR(50) NOT NULL,
  start_date DATETIME(3) NOT NULL,
  end_date DATETIME(3) NULL,
  location VARCHAR(255) NULL,
  is_holiday BOOLEAN NOT NULL DEFAULT FALSE,
  created_by CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_by_model VARCHAR(30) NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_events_school FOREIGN KEY (school_id) REFERENCES schools(id),
  KEY ix_events_creator (created_by_model, created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  url TEXT NOT NULL,
  CONSTRAINT fk_event_attachments_event FOREIGN KEY (event_id) REFERENCES events(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  sender_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  sender_model VARCHAR(30) NOT NULL,
  recipient_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  recipient_model VARCHAR(30) NOT NULL,
  subject VARCHAR(255) NULL,
  message LONGTEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_messages_school FOREIGN KEY (school_id) REFERENCES schools(id),
  KEY ix_messages_sender (sender_model, sender_id),
  KEY ix_messages_recipient (recipient_model, recipient_id),
  KEY ix_messages_school_sender_recipient (school_id, sender_id, recipient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  message_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  url TEXT NOT NULL,
  CONSTRAINT fk_message_attachments_message FOREIGN KEY (message_id) REFERENCES messages(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS homework (
  id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  school_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  class_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  subject_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  teacher_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  title VARCHAR(255) NOT NULL,
  description LONGTEXT NULL,
  file_url TEXT NULL,
  due_date DATETIME(3) NOT NULL,
  total_students INT NULL,
  submitted_count INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NULL,
  updated_at DATETIME(3) NULL,
  CONSTRAINT fk_homework_school FOREIGN KEY (school_id) REFERENCES schools(id),
  CONSTRAINT fk_homework_class FOREIGN KEY (class_id) REFERENCES classes(id),
  CONSTRAINT fk_homework_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT fk_homework_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  KEY ix_homework_class_due (class_id, due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS homework_submissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  homework_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  student_id CHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  file_url TEXT NULL,
  submitted_date DATETIME(3) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Not Submitted',
  reason_for_missing TEXT NOT NULL,
  marks DECIMAL(10,2) NULL,
  feedback TEXT NULL,
  CONSTRAINT fk_homework_submissions_homework FOREIGN KEY (homework_id) REFERENCES homework(id),
  CONSTRAINT fk_homework_submissions_student FOREIGN KEY (student_id) REFERENCES students(id),
  KEY ix_homework_submissions_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
