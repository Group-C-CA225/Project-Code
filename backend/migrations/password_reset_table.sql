-- Password Reset Table
CREATE TABLE IF NOT EXISTS `password_resets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `teacher_id` INT NOT NULL,
    `token` VARCHAR(64) NOT NULL UNIQUE,
    `expires_at` DATETIME NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `used_at` TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE CASCADE,
    INDEX `idx_token` (`token`),
    INDEX `idx_teacher_id` (`teacher_id`),
    INDEX `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add violations and pause columns to exam_sessions if they don't exist
ALTER TABLE `exam_sessions` 
ADD COLUMN IF NOT EXISTS `violations_count` INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS `last_violation` TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `paused_at` TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS `paused_by_teacher` BOOLEAN DEFAULT FALSE;
