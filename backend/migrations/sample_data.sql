-- Sample Quiz 3: Computer Skills Quiz (Windows + Office)
INSERT INTO `quizzes` (`title`, `description`, `teacher_id`, `access_code`, `duration_minutes`, `status`, `class`, `show_results_to_students`) 
VALUES ('Basic Computer Skills - Windows & Office', 'Test your skills in Windows and Microsoft Office basics[SHUFFLE:true]', 1, 'COMP101', 30, 'ACTIVE', 'Grade 10', TRUE);

-- Sample Questions for Quiz 3 (Computer Skills)
INSERT INTO `questions` (`quiz_id`, `type`, `question_text`, `options`, `correct_answer`, `points`) VALUES
-- Q1
(3, 'MCQ', 'Which shortcut opens File Explorer in Windows?', '["Win + E", "Ctrl + E", "Alt + E", "Shift + E"]', 'Win + E', 2),

-- Q2
(3, 'MCQ', 'Which application is used to write letters and documents?', '["Microsoft Word", "Microsoft Excel", "Microsoft PowerPoint", "Microsoft Paint"]', 'Microsoft Word', 2),

-- Q3
(3, 'TRUE_FALSE', 'You can rename a file by right-clicking it and selecting Rename.', '["True", "False"]', 'True', 1),

-- Q4
(3, 'MCQ', 'Which shortcut copies selected text or files?', '["Ctrl + C", "Ctrl + V", "Ctrl + X", "Ctrl + Z"]', 'Ctrl + C', 2),

-- Q5
(3, 'TRUE_FALSE', 'Ctrl + S is used to save your work in most Office programs.', '["True", "False"]', 'True', 1),

-- Q6
(3, 'ESSAY', 'Explain the difference between a file and a folder. Give one example of each.', NULL, 'A file stores data like a document or image. A folder is used to organize files. Example file: homework.docx. Example folder: Documents.', 5);

-- Sample Students for Quiz 3 (Computer Skills)
INSERT INTO `students` (`quiz_id`, `student_identifier`, `student_class`, `final_score`, `status`) VALUES
(3, 'david_lee', 'Grade 10-A', NULL, 'IN_PROGRESS'),
(3, 'lisa_wang', 'Grade 10-B', NULL, 'IN_PROGRESS'),
(3, 'tom_harris', 'Grade 10-A', 95.0, 'SUBMITTED');

-- Sample Student Answers for Computer Skills Quiz (Tom Harris - completed)
INSERT INTO `student_answers` (`student_id`, `question_id`, `answer_text`, `is_correct`, `points_earned`) VALUES
(9, 14, 'Win + E', TRUE, 2),
(9, 15, 'Microsoft Word', TRUE, 2),
(9, 16, 'True', TRUE, 1),
(9, 17, 'Ctrl + C', TRUE, 2),
(9, 18, 'True', TRUE, 1),
(9, 19, 'A file is a single document or program, while a folder is a container that holds multiple files and folders. Example file: report.docx. Example folder: My Documents.', TRUE, 5);

-- Sample Active Session for Computer Skills Quiz
INSERT INTO `exam_sessions` (`student_id`, `quiz_id`, `session_token`, `current_question_index`, `questions_answered`, `total_questions`, `time_remaining_seconds`, `status`) VALUES
-- Active session for David Lee
(10, 3, 'session_david_12345678901234567890123456789012', 2, 3, 6, 900, 'ACTIVE'),
-- Active session for Lisa Wang (paused)
(11, 3, 'session_lisa_12345678901234567890123456789012', 0, 0, 6, 1800, 'PAUSED');

-- Sample Progress for Computer Skills Quiz
INSERT INTO `exam_question_progress` (`session_id`, `question_id`, `started_at`, `answered_at`, `time_spent_seconds`, `is_answered`) VALUES
-- David Lee's progress
(4, 14, NOW() - INTERVAL 3 MINUTE, NOW() - INTERVAL 2 MINUTE, 60, TRUE),
(4, 15, NOW() - INTERVAL 2 MINUTE, NOW() - INTERVAL 1 MINUTE, 60, TRUE),
(4, 16, NOW() - INTERVAL 1 MINUTE, NOW() - INTERVAL 30 SECOND, 30, TRUE),
(4, 17, NOW() - INTERVAL 30 SECOND, NULL, 0, FALSE);
UPDATE `quizzes`
SET
  `title` = 'Basic Computer Skills - Windows & Office',
  `description` = 'Test your skills in Windows and Microsoft Office basics[SHUFFLE:true]',
  `access_code` = 'COMP101',
  `duration_minutes` = 30,
  `class` = 'Grade 10'
WHERE `id` = 1;

-- Updated Questions for Quiz 1 (Computer Basics)
UPDATE `questions` SET
  `type` = 'MCQ',
  `question_text` = 'Which shortcut opens File Explorer in Windows?',
  `options` = '["Win + E", "Ctrl + E", "Alt + E", "Shift + E"]',
  `correct_answer` = 'Win + E',
  `points` = 2
WHERE `id` = 1;

UPDATE `questions` SET
  `type` = 'MCQ',
  `question_text` = 'Which app is mainly used to create documents like letters?',
  `options` = '["Microsoft Word", "Microsoft Excel", "Microsoft PowerPoint", "Microsoft Paint"]',
  `correct_answer` = 'Microsoft Word',
  `points` = 2
WHERE `id` = 2;

UPDATE `questions` SET
  `type` = 'TRUE_FALSE',
  `question_text` = 'You can rename a file in Windows by right-clicking it and choosing Rename.',
  `options` = '["True", "False"]',
  `correct_answer` = 'True',
  `points` = 1
WHERE `id` = 3;

UPDATE `questions` SET
  `type` = 'MCQ',
  `question_text` = 'Which shortcut is used to copy selected text or files?',
  `options` = '["Ctrl + C", "Ctrl + V", "Ctrl + X", "Ctrl + Z"]',
  `correct_answer` = 'Ctrl + C',
  `points` = 2
WHERE `id` = 4;

UPDATE `questions` SET
  `type` = 'TRUE_FALSE',
  `question_text` = 'Ctrl + S is used to save your work in most Office apps.',
  `options` = '["True", "False"]',
  `correct_answer` = 'True',
  `points` = 1
WHERE `id` = 5;

UPDATE `questions` SET
  `type` = 'ESSAY',
  `question_text` = 'Explain the difference between a file and a folder. Give one example of each.',
  `options` = NULL,
  `correct_answer` = 'A file is a single item that stores data, like a Word document or a photo. A folder is a container used to organize files. Example file: Report.docx. Example folder: School Work.',
  `points` = 5
WHERE `id` = 6;
