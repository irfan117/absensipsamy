-- ============================================================
-- SISTEM PRESENSI MAGANG (HADIRKU) - INIT TOTAL DATABASE
-- TiDB / MySQL Script untuk Database Pengembangan Baru
-- ============================================================
-- File ini menyertakan SEMUA tabel yang dibutuhkan oleh backend
-- Pastikan database absensi_db sudah dibuat sebelum menjalankan script ini
-- ============================================================

-- 1. Buat Database jika belum ada
CREATE DATABASE IF NOT EXISTS absensi_db;
USE absensi_db;

-- ============================================================
-- TABEL 1: users
-- Menyimpan data akun admin, mentor, dan trainees
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  nim VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(128) NOT NULL UNIQUE,
  role ENUM('admin', 'mentor', 'trainee') NOT NULL,
  avatar TEXT,
  phone VARCHAR(32),
  kejuruan_id VARCHAR(64),
  kejuruan_name VARCHAR(128),
  status ENUM('active', 'inactive') DEFAULT 'active',
  joined_date VARCHAR(32),
  login_code VARCHAR(32) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_nim (nim),
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL 2: kejuruan
-- Menyimpan data kejuruan/program studi (SB-04, ST-04, WEB-04)
-- ============================================================
CREATE TABLE IF NOT EXISTS kejuruan (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(16) NOT NULL,
  category VARCHAR(64),
  color VARCHAR(7) DEFAULT '#6366f1',
  description TEXT,
  mentor_id VARCHAR(64),
  mentor_name VARCHAR(128),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_kejuruan_code (code),
  INDEX idx_kejuruan_mentor (mentor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL 3: missions
-- Menyimpan data misi/tugas dengan reward poin
-- ============================================================
CREATE TABLE IF NOT EXISTS missions (
  id VARCHAR(96) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  kejuruan_id VARCHAR(64),
  kejuruan_name VARCHAR(128),
  mentor_id VARCHAR(64),
  mentor_name VARCHAR(128),
  points INT DEFAULT 0,
  difficulty ENUM('mudah', 'sedang', 'sulit') DEFAULT 'sedang',
  due_date VARCHAR(32),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status ENUM('active', 'completed', 'archived') DEFAULT 'active',
  category VARCHAR(64),
  submission_guide LONGTEXT,
  INDEX idx_missions_kejuruan (kejuruan_id),
  INDEX idx_missions_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL 4: mission_submissions
-- Menyimpan hasil submit tugas mahasiswa/participan
-- ============================================================
CREATE TABLE IF NOT EXISTS mission_submissions (
  id VARCHAR(96) PRIMARY KEY,
  mission_id VARCHAR(96) NOT NULL,
  mission_title VARCHAR(255) NOT NULL,
  trainee_id VARCHAR(64) NOT NULL,
  trainee_name VARCHAR(128) NOT NULL,
  trainee_nim VARCHAR(64) NOT NULL,
  trainee_avatar TEXT,
  kejuruan_id VARCHAR(64),
  kejuruan_name VARCHAR(128),
  submission_link LONGTEXT,
  notes TEXT,
  points INT DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reviewed_by VARCHAR(64),
  reviewed_at TIMESTAMP,
  feedback TEXT,
  awarded_points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_submission_mission (mission_id),
  INDEX idx_submission_trainee (trainee_id),
  INDEX idx_submission_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL 5: daily_reports
-- Menyimpan laporan harian aktivitas peserta
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_reports (
  id VARCHAR(96) PRIMARY KEY,
  trainee_id VARCHAR(64) NOT NULL,
  trainee_name VARCHAR(128) NOT NULL,
  trainee_nim VARCHAR(64) NOT NULL,
  kejuruan_id VARCHAR(64),
  kejuruan_name VARCHAR(128),
  report_date DATE NOT NULL,
  description TEXT,
  photo_url LONGTEXT,
  photo_name VARCHAR(255),
  submission_link LONGTEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_by VARCHAR(64),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_report_trainee (trainee_id),
  INDEX idx_report_date (report_date),
  INDEX idx_report_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL 6: attendance_records
-- Menyimpan riwayat presensi check-in/check-out harian
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(96) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(128) NOT NULL,
  user_nim VARCHAR(64) NOT NULL,
  kejuruan_id VARCHAR(64),
  kejuruan_name VARCHAR(128),
  attendance_date DATE NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  status ENUM('hadir', 'terlambat', 'izin', 'alpha') DEFAULT 'hadir',
  work_mode ENUM('on_site', 'remote', 'hybrid') DEFAULT 'on_site',
  verification_status ENUM('verified', 'pending', 'rejected') DEFAULT 'pending',
  verified_at TIMESTAMP,
  verified_by VARCHAR(64),
  location_lat DECIMAL(10, 7),
  location_lng DECIMAL(10, 7),
  notes TEXT,
  late_minutes INT DEFAULT 0,
  late_penalty_points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_attendance_user (user_id),
  INDEX idx_attendance_date (attendance_date),
  INDEX idx_attendance_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL 7: attendance_settings
-- Menyimpan konfigurasi sistem presensi (jam masuk, batas keterlambatan, poin)
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  key_name VARCHAR(64) NOT NULL UNIQUE,
  key_value TEXT NOT NULL,
  key_description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_settings_key (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABEL 8: leave_requests
-- Sudah ada di init_admin.sql, tetapi kita ulang saja untuk lengkapnya
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(96) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(128) NOT NULL,
  user_nim VARCHAR(64) NOT NULL,
  kejuruan_id VARCHAR(64),
  kejuruan_name VARCHAR(255),
  request_type ENUM('izin', 'sakit') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count INT NOT NULL,
  reason TEXT NOT NULL,
  attachment_name VARCHAR(255),
  attachment_url LONGTEXT,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
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

-- ============================================================
-- TAMBAHAN: Insert Admin Default (seperti di init_admin.sql)
-- ============================================================
-- Password asli: "admin123"
-- Hash bcrypt telah dihitung dan disertakan
--=================================================================
-- Admin Default (password: admin123)
--=================================================================
INSERT INTO users (
  id,
  nim,
  name,
  email,
  role,
  avatar,
  phone,
  kejuruan_id,
  kejuruan_name,
  status,
  joined_date,
  login_code,
  password_hash
) VALUES (
  'user-admin-1',
  'ADM-2026-001',
  'Abdul Rozzak Junaidi',
  'admin@hadirku.id',
  'admin',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  '0812-3456-7890',
  NULL,
  NULL,
  'active',
  '2025-01-10',
  '10000001',
  '$2b$10$7EqJtq98hPqEX7fNZaFWoO0V6jG/g7u8U7/K4gR6N1eH2m8L5P1b2'
) ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role),
  password_hash = VALUES(password_hash);

-- ─────────────────────────────────────────────
-- Contoh: Insert Kejuruan Default (3 program)
-- ─────────────────────────────────────────────
INSERT INTO kejuruan (id, name, code, category, color, description) VALUES
('kejuruan-1', 'Pemasangan Sistem Integrasi Bangunan Cerdas', 'SB-04', 'Teknik', '#ef4444', 'Program pasca Sarjana teknologi bangunan cerdas'),
('kejuruan-2', 'Pembuatan Sistem Informasi Pariwisata Berbasis Website', 'ST-04', 'Sistem Informasi', '#f97316', 'Program pembuatan aplikasi website & mobile'),
('kejuruan-3', 'Pengembangan Web dengan Node.js dan React', 'WEB-04', 'Teknologi Web', '#10b981', 'Program pengembangan front-end & full-stack'),
ON DUPLICATE KEY UPDATE name = VALUES(name), code = VALUES(code);

-- ─────────────────────────────────────────────
-- Contoh: Insert Setting Presensi Default
-- ─────────────────────────────────────────────
INSERT INTO attendance_settings (key_name, key_value, key_description) VALUES
('late_limit_time', '09:00', 'Batas waktu check-in maksimal'),
('late_point_penalty_per_minute', '1', 'Poin kurangi per menit keterlambatan'),
('absent_penalty_per_day', '5', 'Poin kurangi per hari alfa/tidak hadir'),
('work_mode_default', 'on_site', 'Mode kerja default'),
('tidb_ssl_enabled', 'true', 'Aktifkan koneksi SSL TiDB'),
('jwt_secret', 'hadirku-jwt-secret-vokasi-2026-super-secure', 'Secret kunci JWT untuk token');

-- ─────────────────────────────────────────────
-- Verifikasi: Lihat semua tabel yang sudah dibuat
-- ─────────────────────────────────────────────
-- SHOW TABLES;

-- ─────────────────────────────────────────────
-- Cek akun admin yang tersedia
-- ─────────────────────────────────────────────
-- SELECT id, nim, name, email, role, status FROM users ORDER BY role;

-- ─────────────────────────────────────────────
-- Cek setting yang tersedia
-- ─────────────────────────────────────────────
-- SELECT key_name, key_value FROM attendance_settings;
-- ============================================================
-- SELESAI. Database siap digunakan.
-- Cara pakai:
-- 1. Jalankan script ini di TiDB SQL Editor pada database absensi_db
-- 2. Akun admin bisa login via NIM: ADM-2026-001, Password: admin123
-- 3. Akun Mentor & Trainee bisa dibuat melalui UI aplikasi atau Import Excel
-- ============================================================