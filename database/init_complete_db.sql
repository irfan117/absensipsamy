-- Skema lengkap aplikasi Absensi PSA (kompatibel dengan server/db.ts).
-- Database mengikuti TIDB_DATABASE pada .env (saat ini: dumypsa).
-- Jalankan dengan memilih database yang benar di SQL editor. Untuk database
-- lama gunakan `npm run migrate:schema` agar kolom/index yang belum ada ditambahkan.

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  nim CHAR(8) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(128) NOT NULL UNIQUE,
  role ENUM('admin','mentor','trainee') NOT NULL,
  avatar TEXT,
  phone VARCHAR(32),
  kejuruan_id VARCHAR(64),
  kejuruan_name VARCHAR(255),
  status ENUM('active','inactive') DEFAULT 'active',
  joined_date VARCHAR(32),
  login_code CHAR(8) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kejuruan (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL,
  category VARCHAR(128) NOT NULL,
  color VARCHAR(16) NOT NULL,
  description TEXT,
  mentor_id VARCHAR(64),
  mentor_name VARCHAR(128),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_kejuruan_code (code),
  INDEX idx_kejuruan_mentor (mentor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(128) NOT NULL,
  user_nim VARCHAR(64) NOT NULL,
  user_role ENUM('admin','mentor','trainee') NOT NULL DEFAULT 'trainee',
  kejuruan_id VARCHAR(64),
  kejuruan_name VARCHAR(255),
  attendance_date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  work_mode ENUM('WFO','WFH') NULL,
  status ENUM('hadir','terlambat','izin','sakit','alpha') NOT NULL,
  verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  verified_by VARCHAR(64),
  verified_at DATETIME,
  location TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  notes TEXT,
  photo_url LONGTEXT,
  rejection_reason TEXT,
  late_minutes INT NOT NULL DEFAULT 0,
  late_penalty_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_attendance_user_date (user_id, attendance_date),
  INDEX idx_attendance_date_status (attendance_date, verification_status),
  INDEX idx_attendance_kejuruan_date (kejuruan_id, attendance_date),
  INDEX idx_attendance_late_penalty_user (late_penalty_points, user_id),
  UNIQUE KEY uq_attendance_user_date (user_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(128) NOT NULL,
  user_nim VARCHAR(64) NOT NULL,
  kejuruan_id VARCHAR(64),
  kejuruan_name VARCHAR(255),
  request_type ENUM('izin','sakit') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INT NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  attachment_name VARCHAR(255),
  attachment_url LONGTEXT,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  submitted_at DATETIME NOT NULL,
  reviewed_by VARCHAR(64),
  reviewed_at DATETIME,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_leave_user (user_id),
  INDEX idx_leave_status_dates (status, start_date, end_date),
  INDEX idx_leave_kejuruan_status (kejuruan_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_settings (
  id VARCHAR(64) PRIMARY KEY,
  start_time TIME NOT NULL,
  late_limit_time TIME NOT NULL,
  end_time TIME NOT NULL,
  allow_checkout_start TIME NOT NULL,
  work_days JSON NOT NULL,
  office_location JSON NOT NULL,
  late_point_penalty_per_minute INT NOT NULL DEFAULT 1,
  absent_point_penalty_per_day INT NOT NULL DEFAULT 1,
  updated_by VARCHAR(64),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS missions (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  kejuruan_id VARCHAR(64) NOT NULL,
  kejuruan_name VARCHAR(255) NOT NULL,
  mentor_id VARCHAR(64) NOT NULL,
  mentor_name VARCHAR(128) NOT NULL,
  points INT NOT NULL DEFAULT 0,
  difficulty ENUM('Mudah','Sedang','Tantangan') NOT NULL,
  due_date DATE NOT NULL,
  created_at DATETIME NOT NULL,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  category VARCHAR(128),
  submission_guide TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_missions_kejuruan_status (kejuruan_id, status),
  INDEX idx_missions_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_submissions (
  id VARCHAR(64) PRIMARY KEY,
  mission_id VARCHAR(64) NOT NULL,
  mission_title VARCHAR(200) NOT NULL,
  trainee_id VARCHAR(64) NOT NULL,
  trainee_name VARCHAR(128) NOT NULL,
  trainee_nim VARCHAR(64) NOT NULL,
  trainee_avatar LONGTEXT,
  kejuruan_id VARCHAR(64),
  kejuruan_name VARCHAR(255),
  submission_link TEXT,
  notes TEXT,
  points INT NOT NULL DEFAULT 0,
  submitted_at DATETIME NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by VARCHAR(64),
  reviewed_at DATETIME,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_submissions_mission (mission_id, status),
  INDEX idx_submissions_trainee (trainee_id, submitted_at),
  INDEX idx_submissions_kejuruan (kejuruan_id, status),
  INDEX idx_submissions_status_trainee_points (status, trainee_id, points)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_reports (
  id VARCHAR(64) PRIMARY KEY,
  trainee_id VARCHAR(64) NOT NULL,
  trainee_name VARCHAR(128) NOT NULL,
  trainee_nim VARCHAR(64) NOT NULL,
  trainee_avatar LONGTEXT,
  kejuruan_id VARCHAR(64),
  kejuruan_name VARCHAR(255),
  report_date DATE NOT NULL,
  description TEXT NOT NULL,
  photo_url LONGTEXT,
  photo_name VARCHAR(255),
  submission_link TEXT,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  submitted_at DATETIME NOT NULL,
  reviewed_by VARCHAR(64),
  reviewed_at DATETIME,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_daily_report_trainee_date (trainee_id, report_date),
  INDEX idx_daily_reports_status_date (status, report_date),
  INDEX idx_daily_reports_kejuruan (kejuruan_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
