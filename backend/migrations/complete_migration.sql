-- ============================================================================
-- COMPLETE DATABASE MIGRATION FOR QUIZ PLATFORM
-- ============================================================================
-- This file contains the complete database schema for the Quiz Platform
-- Run this file to set up a fresh database with all required tables
-- 
-- Usage: mysql -u root -p quiz_platform < complete_migration.sql
-- 
-- Version: 1.0
-- Last Updated: 2026-01-14
-- ============================================================================

-- Set character set and collation
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================================================
-- 1. TEACHERS TABLE
-- ============================================================================
-- Stores teacher accounts with authentication credentials

CREATE TABLE IF NOT EXISTS `teachers` (
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
-- 2. QUIZZES TABLE
-- ============================================================================
-- Stores quiz/exam information with scheduling and access control

CREATE TABLE IF NOT EXISTS `quizzes` (
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
    `start_time` DATETIME NULL,
    `end_time` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE CASCADE,
    INDEX `idx_teacher` (`teacher_id`),
    INDEX `idx_access_code` (`access_code`),
    INDEX `idx_status` (`status`),
    INDEX `idx_class` (`class`),
    INDEX `idx_schedule` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. QUESTIONS TABLE
-- ============================================================================
-- Stores questions for each quiz with multiple question types

CREATE TABLE IF NOT EXISTS `questions` (
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
-- 4. STUDENTS TABLE
-- ============================================================================
-- Stores student submissions and overall quiz results

CREATE TABLE IF NOT EXISTS `students` (
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
-- 5. STUDENT ANSWERS TABLE
-- ============================================================================
-- Stores individual answers for each question with grading results

CREATE TABLE IF NOT EXISTS `student_answers` (
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
-- 6. EXAM SESSIONS TABLE
-- ============================================================================
-- Tracks real-time exam sessions for monitoring

CREATE TABLE IF NOT EXISTS `exam_sessions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `quiz_id` INT NOT NULL,
    `session_token` VARCHAR(64) NOT NULL UNIQUE,
    `current_question_index` INT DEFAULT 0,
    `questions_answered` INT DEFAULT 0,
    `total_questions` INT NOT NULL,
    `time_remaining_seconds` INT DEFAULT NULL,
    `started_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `last_activity` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `last_heartbeat` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `status` ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED') DEFAULT 'ACTIVE',
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON DELETE CASCADE,
    INDEX `idx_quiz_status` (`quiz_id`, `status`),
    INDEX `idx_student_quiz` (`student_id`, `quiz_id`),
    INDEX `idx_session_token` (`session_token`),
    INDEX `idx_last_activity` (`last_activity`),
    INDEX `idx_last_heartbeat` (`last_heartbeat`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. EXAM QUESTION PROGRESS TABLE
-- ============================================================================
-- Tracks detailed progress on individual questions during exam

CREATE TABLE IF NOT EXISTS `exam_question_progress` (
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
-- Password: password (hashed with bcrypt)
-- INSERT INTO `teachers` (`full_name`, `email`, `password_hash`) 
-- VALUES ('Demo Teacher', 'teacher@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Sample Quiz
-- INSERT INTO `quizzes` (`title`, `description`, `teacher_id`, `access_code`, `duration_minutes`, `status`, `class`) 
-- VALUES ('Sample Quiz', 'This is a demo quiz', 1, 'DEMO123', 30, 'ACTIVE', 'Grade 10');

-- Sample Questions
-- INSERT INTO `questions` (`quiz_id`, `type`, `question_text`, `options`, `correct_answer`, `points`) VALUES
-- (1, 'MCQ', 'What is 2 + 2?', '["2", "3", "4", "5"]', '4', 1),
-- (1, 'TRUE_FALSE', 'The Earth is flat.', '["True", "False"]', 'False', 1),
-- (1, 'ESSAY', 'Explain the water cycle.', NULL, 'The water cycle involves evaporation, condensation, and precipitation.', 5);

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
--     (SELECT COUNT(*) FROM exam_question_progress) as exam_question_progress;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All tables have been created successfully!
-- 
-- Next Steps:
-- 1. Create a teacher account (register through the app or insert manually)
-- 2. Configure backend/config/Database.php with your credentials
-- 3. Start the application and begin creating quizzes
-- 
-- For support, refer to the README.md file
-- ============================================================================
