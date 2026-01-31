-- ============================================================================
-- QUIZ PLATFORM - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This file contains the complete database schema for the Quiz Platform
-- Run this file to set up a fresh database with all required tables
-- 
-- Usage: mysql -u root -p quiz_platform < database_schema.sql
-- 
-- Version: 2.0
-- Last Updated: 2026-01-31
-- ============================================================================

-- Set character set and collation
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Drop existing tables if they exist (for clean installation)
DROP TABLE IF EXISTS `exam_question_progress`;
DROP TABLE IF EXISTS `exam_sessions`;
DROP TABLE IF EXISTS `student_answers`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `questions`;
DROP TABLE IF EXISTS `quizzes`;
DROP TABLE IF EXISTS `pending_registrations`;
DROP TABLE IF EXISTS `password_resets`;
DROP TABLE IF EXISTS `teachers`;

-- ============================================================================
-- 1. TEACHERS TABLE
-- ============================================================================
-- Stores teacher accounts with authentication credentials

CREATE TABLE `teachers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `api_token` VARCHAR(64) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`),
    INDEX `idx_api_token` (`api_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. PENDING REGISTRATIONS TABLE
-- ============================================================================
-- Stores pending teacher registrations awaiting email verification

CREATE TABLE `pending_registrations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `otp` VARCHAR(6) NOT NULL,
    `otp_expires_at` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`),
    INDEX `idx_otp` (`otp`),
    INDEX `idx_expires` (`otp_expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. PASSWORD RESETS TABLE
-- ============================================================================
-- Stores password reset tokens for teachers

CREATE TABLE `password_resets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(100) NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `expires_at` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_email` (`email`),
    INDEX `idx_token` (`token`),
    INDEX `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. QUIZZES TABLE
-- ============================================================================
-- Stores quiz/exam information with scheduling and access control

CREATE TABLE `quizzes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `teacher_id` INT NOT NULL,
    `access_code` VARCHAR(10) NOT NULL UNIQUE,
    `duration_minutes` INT DEFAULT 60,
    `is_active` BOOLEAN DEFAULT TRUE,
    `status` VARCHAR(20) DEFAULT 'INACTIVE',
    `class` VARCHAR(100) NULL,
    `active_sessions_count` INT DEFAULT 0,
    `show_results_to_students` BOOLEAN DEFAULT FALSE,
    `allow_retake` BOOLEAN DEFAULT FALSE,
    `start_time` DATETIME NULL,
    `end_time` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE CASCADE,
    INDEX `idx_teacher` (`teacher_id`),
    INDEX `idx_access_code` (`access_code`),
    INDEX `idx_status` (`status`),
    INDEX `idx_class` (`class`),
    INDEX `idx_allow_retake` (`allow_retake`),
    INDEX `idx_schedule` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. QUESTIONS TABLE
-- ============================================================================
-- Stores questions for each quiz with multiple question types

CREATE TABLE `questions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `quiz_id` INT NOT NULL,
    `type` VARCHAR(50) DEFAULT 'multiple_choice',
    `question_text` TEXT NOT NULL,
    `options` JSON NULL,
    `correct_answer` TEXT NOT NULL,
    `points` INT DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE CASCADE,
    INDEX `idx_quiz` (`quiz_id`),
    INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. STUDENTS TABLE
-- ============================================================================
-- Stores student submissions and overall quiz results

CREATE TABLE `students` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `quiz_id` INT NOT NULL,
    `student_identifier` VARCHAR(100) NOT NULL,
    `student_class` VARCHAR(50) NULL,
    `final_score` DECIMAL(5,2) DEFAULT 0,
    `status` ENUM('IN_PROGRESS', 'SUBMITTED') DEFAULT 'IN_PROGRESS',
    `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `finished_at` TIMESTAMP NULL,
    FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE CASCADE,
    INDEX `idx_quiz` (`quiz_id`),
    INDEX `idx_identifier` (`student_identifier`),
    INDEX `idx_class` (`student_class`),
    INDEX `idx_status` (`status`),
    INDEX `idx_quiz_identifier` (`quiz_id`, `student_identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. STUDENT ANSWERS TABLE
-- ============================================================================
-- Stores individual answers for each question with grading results

CREATE TABLE `student_answers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `question_id` INT NOT NULL,
    `answer_text` TEXT,
    `is_correct` BOOLEAN DEFAULT FALSE,
    `points_earned` DECIMAL(5,2) DEFAULT 0,
    `feedback` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE,
    INDEX `idx_student` (`student_id`),
    INDEX `idx_question` (`question_id`),
    INDEX `idx_correct` (`is_correct`),
    UNIQUE KEY `unique_student_question` (`student_id`, `question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. EXAM SESSIONS TABLE
-- ============================================================================
-- Tracks real-time exam sessions for monitoring

CREATE TABLE `exam_sessions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `quiz_id` INT NOT NULL,
    `student_identifier` VARCHAR(100) NOT NULL,
    `session_token` VARCHAR(64) NOT NULL UNIQUE,
    `current_question_index` INT DEFAULT 0,
    `questions_answered` INT DEFAULT 0,
    `total_questions` INT NOT NULL,
    `time_remaining_seconds` INT DEFAULT NULL,
    `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `last_activity` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `last_heartbeat` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `status` ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED') DEFAULT 'ACTIVE',
    `paused_by_teacher` BOOLEAN DEFAULT FALSE,
    `paused_at` TIMESTAMP NULL,
    `violations_count` INT DEFAULT 0,
    `last_violation` TIMESTAMP NULL,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE CASCADE,
    INDEX `idx_quiz_status` (`quiz_id`, `status`),
    INDEX `idx_student_quiz` (`student_id`, `quiz_id`),
    INDEX `idx_session_token` (`session_token`),
    INDEX `idx_last_activity` (`last_activity`),
    INDEX `idx_last_heartbeat` (`last_heartbeat`),
    INDEX `idx_student_identifier` (`student_identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. EXAM QUESTION PROGRESS TABLE
-- ============================================================================
-- Tracks detailed progress on individual questions during exam

CREATE TABLE `exam_question_progress` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `session_id` INT NOT NULL,
    `question_id` INT NOT NULL,
    `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `answered_at` TIMESTAMP NULL DEFAULT NULL,
    `time_spent_seconds` INT DEFAULT 0,
    `is_answered` BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (`session_id`) REFERENCES `exam_sessions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON DELETE CASCADE,
    INDEX `idx_session` (`session_id`),
    INDEX `idx_question` (`question_id`),
    INDEX `idx_answered` (`is_answered`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SAMPLE DATA (OPTIONAL)
-- ============================================================================
-- Uncomment the following lines to insert sample data for testing

-- Sample Teacher Account
-- Password: password123 (hashed with bcrypt)
-- INSERT INTO `teachers` (`full_name`, `email`, `password_hash`) 
-- VALUES ('Demo Teacher', 'teacher@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Sample Quiz
-- INSERT INTO `quizzes` (`title`, `description`, `teacher_id`, `access_code`, `duration_minutes`, `status`, `class`, `show_results_to_students`, `allow_retake`) 
-- VALUES ('Sample Quiz', 'This is a demo quiz for testing', 1, 'DEMO123', 30, 'ACTIVE', 'Grade 10', TRUE, FALSE);

-- Sample Questions
-- INSERT INTO `questions` (`quiz_id`, `type`, `question_text`, `options`, `correct_answer`, `points`) VALUES
-- (1, 'MCQ', 'What is 2 + 2?', '["2", "3", "4", "5"]', '4', 10),
-- (1, 'TRUE_FALSE', 'The Earth is flat.', '["True", "False"]', 'False', 10),
-- (1, 'WRITTEN', 'Define Node.js', NULL, 'an open-source, cross-platform JavaScript runtime environment that allows developers to execute JavaScript code outside of a web browser', 10);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify the setup

-- Check all tables were created
-- SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
-- WHERE TABLE_SCHEMA = 'quiz_platform' ORDER BY TABLE_NAME;

-- Check table row counts
-- SELECT 
--     (SELECT COUNT(*) FROM teachers) as teachers,
--     (SELECT COUNT(*) FROM quizzes) as quizzes,
--     (SELECT COUNT(*) FROM questions) as questions,
--     (SELECT COUNT(*) FROM students) as students,
--     (SELECT COUNT(*) FROM student_answers) as student_answers,
--     (SELECT COUNT(*) FROM exam_sessions) as exam_sessions,
--     (SELECT COUNT(*) FROM exam_question_progress) as exam_question_progress,
--     (SELECT COUNT(*) FROM pending_registrations) as pending_registrations,
--     (SELECT COUNT(*) FROM password_resets) as password_resets;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All tables have been created successfully!
-- 
-- Key Features:
-- - Teacher authentication with email verification
-- - Quiz management with scheduling and class filtering
-- - Multiple question types (MCQ, True/False, Written)
-- - AI-powered grading for written answers
-- - Real-time exam monitoring with session tracking
-- - Student retake control (allow_retake setting)
-- - Comprehensive analytics and reporting
-- - Security features (violations tracking, session abandonment)
-- 
-- Next Steps:
-- 1. Configure backend/config/Database.php with your credentials
-- 2. Set up backend/.env with API keys (optional, for AI grading)
-- 3. Register a teacher account through the application
-- 4. Start creating quizzes and sharing access codes with students
-- 
-- For support, refer to the README.md file
-- ============================================================================
