<?php
require_once 'config/Database.php';
require_once 'services/AIService.php';

class ExamController {
    private $db;
    private $ai;

    public function __construct() {
        $database = new Database();
        // ERROR WAS HERE: Ensure this says 'connect()', NOT 'getConnection()'
        $this->db = $database->connect(); 
        $this->ai = new AIService();
    }

    // GET /api/exam/start?code=XYZ123
    public function start() {
        $code = isset($_GET['code']) ? $_GET['code'] : '';
        
        if (empty($code)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Access code is required"
            ]);
            exit;
        }
        
        // 1. Find Quiz
        $stmt = $this->db->prepare("SELECT id, title, duration_minutes, is_active, status, start_time, end_time, description, class FROM quizzes WHERE access_code = :code");
        $stmt->execute([':code' => $code]);
        $quiz = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$quiz) {
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "message" => "Invalid Access Code"
            ]);
            exit;
        }

        // Normalize status (handle NULL, trim, uppercase)
        $quizStatus = isset($quiz['status']) ? strtoupper(trim($quiz['status'])) : 'INACTIVE';
        $quiz['status'] = $quizStatus;

        // Check if quiz is within scheduled time (if scheduling is set)
        if ($quiz['start_time'] && $quiz['end_time']) {
            try {
                $now = new DateTime();
                $start = new DateTime($quiz['start_time']);
                $end = new DateTime($quiz['end_time']);

                if ($now < $start || $now > $end) {
                    $quiz['status'] = 'INACTIVE';
                    $quizStatus = 'INACTIVE';
                }
            } catch (Exception $e) {
                // Invalid date format, continue with existing status
            }
        }

        // Check if quiz is active and status is ACTIVE
        $isQuizActive = ($quiz['is_active'] == 1 || $quiz['is_active'] === true) && $quizStatus === 'ACTIVE';

        // 2. Always fetch questions to check if quiz has questions
        $qStmt = $this->db->prepare("SELECT id, type, question_text, options, points FROM questions WHERE quiz_id = :qid ORDER BY id ASC");
        $qStmt->execute([':qid' => $quiz['id']]);
        $questions = $qStmt->fetchAll(PDO::FETCH_ASSOC);

        // Decode JSON options
        foreach ($questions as &$q) {
            if (!empty($q['options'])) {
                $decoded = json_decode($q['options'], true);
                $q['options'] = $decoded !== null ? $decoded : $q['options'];
            }
        }
        unset($q); // Break reference

        // If quiz is not active, return quiz info but no questions (for waiting room)
        if (!$isQuizActive) {
            http_response_code(200);
            echo json_encode([
                "success" => true,
                "quiz" => $quiz,
                "questions" => []
            ]);
            exit;
        }

        // Quiz is active but has no questions - this is an error state
        if (empty($questions)) {
            http_response_code(200);
            echo json_encode([
                "success" => true,
                "quiz" => $quiz,
                "questions" => []
            ]);
            exit;
        }

        // Quiz is active and has questions - return everything
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "quiz" => $quiz,
            "questions" => $questions
        ]);
    }

    // POST /api/exam/submit
    public function submit() {
        $data = json_decode(file_get_contents("php://input"));
        
        if (!$data || !isset($data->student_identifier) || !isset($data->answers)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Missing required fields"
            ]);
            exit;
        }

        if (!is_array($data->answers) || count($data->answers) === 0) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "No answers provided"
            ]);
            exit;
        }

        $totalScore = 0;
        $questionCount = 0;

        try {
            $this->db->beginTransaction();

            // Get quiz_id from first answer's question
            $firstQuestionId = $data->answers[0]->question_id;
            $quizStmt = $this->db->prepare("SELECT quiz_id FROM questions WHERE id = :qid");
            $quizStmt->execute([':qid' => $firstQuestionId]);
            $quizId = $quizStmt->fetchColumn();
            
            if (!$quizId) {
                throw new Exception("Invalid question ID");
            }

            // Get quiz class filter
            $quizClassStmt = $this->db->prepare("SELECT class FROM quizzes WHERE id = :qid");
            $quizClassStmt->execute([':qid' => $quizId]);
            $quizClass = $quizClassStmt->fetchColumn();
            
            // Validate class if quiz has a class filter set
            if ($quizClass && !empty(trim($quizClass))) {
                $studentClass = isset($data->student_class) ? trim($data->student_class) : '';
                if (strcasecmp($studentClass, trim($quizClass)) !== 0) {
                    throw new Exception("Class mismatch. This quiz is for class: " . $quizClass);
                }
            }

            // Check if student already submitted for this quiz (prevent duplicates)
            $checkStmt = $this->db->prepare("SELECT id, final_score FROM students WHERE quiz_id = :qid AND student_identifier = :sid AND status = 'SUBMITTED'");
            $checkStmt->execute([
                ':qid' => $quizId,
                ':sid' => $data->student_identifier
            ]);
            $existingSubmission = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingSubmission) {
                // Student already submitted - return existing results
                $this->db->commit();
                
                // Get show_results setting
                $quizStmt = $this->db->prepare("SELECT show_results_to_students FROM quizzes WHERE id = :qid");
                $quizStmt->execute([':qid' => $quizId]);
                $showResults = $quizStmt->fetchColumn();
                
                http_response_code(200);
                echo json_encode([
                    "success" => true,
                    "message" => "Already submitted",
                    "final_score" => $existingSubmission['final_score'],
                    "student_id" => $existingSubmission['id'],
                    "show_results" => (bool)$showResults,
                    "duplicate" => true
                ]);
                exit;
            }

            // Create student record
            $studentSql = "INSERT INTO students (quiz_id, student_identifier, student_class, status, started_at) 
                          VALUES (:qid, :sid, :class, 'IN_PROGRESS', NOW())";
            $studentStmt = $this->db->prepare($studentSql);
            $studentStmt->execute([
                ':qid' => $quizId,
                ':sid' => $data->student_identifier,
                ':class' => $data->student_class ?? ''
            ]);
            $studentId = $this->db->lastInsertId();

            // Process each answer
            foreach ($data->answers as $ans) {
                $qId = $ans->question_id;
                $studentVal = $ans->value;

                // Fetch Question Data (including question_text for AI grading context)
                $stmt = $this->db->prepare("SELECT type, correct_answer, question_text FROM questions WHERE id = :id");
                $stmt->execute([':id' => $qId]);
                $qData = $stmt->fetch(PDO::FETCH_ASSOC);

                $score = 0;
                $feedback = "";

                // Grading Logic
                if ($qData['type'] == 'MCQ' || $qData['type'] == 'TRUE_FALSE') {
                    if (trim(strtolower($studentVal)) == trim(strtolower($qData['correct_answer']))) {
                        $score = 100;
                        $feedback = "Correct selection.";
                    } else {
                        $feedback = "Incorrect. The correct answer is: " . $qData['correct_answer'];
                    }
                } 
                elseif ($qData['type'] == 'WRITTEN') {
                    // Use AI grading with full question context
                    $grading = $this->ai->gradeWrittenAnswer(
                        $qData['question_text'], 
                        $qData['correct_answer'], 
                        $studentVal
                    );
                    $score = isset($grading['score']) ? $grading['score'] : 0;
                    $feedback = isset($grading['feedback']) ? $grading['feedback'] : "No feedback available.";
                }

                // Save Result - Use student_answers table matching schema (including feedback)
                $isCorrect = ($score >= 50) ? 1 : 0; // Consider 50+ as correct for written answers
                $ins = "INSERT INTO student_answers (student_id, question_id, answer_text, is_correct, points_earned, feedback) 
                        VALUES (:sid, :qid, :ans, :correct, :points, :feedback)";
                $this->db->prepare($ins)->execute([
                    ':sid' => $studentId,
                    ':qid' => $qId,
                    ':ans' => $studentVal,
                    ':correct' => $isCorrect,
                    ':points' => $score,
                    ':feedback' => $feedback
                ]);

                $totalScore += $score;
                $questionCount++;
            }

            $finalAverage = $questionCount > 0 ? ($totalScore / $questionCount) : 0;
            
            // Update Student Status
            $upd = "UPDATE students SET status = 'SUBMITTED', final_score = :score, finished_at = NOW() WHERE id = :sid";
            $this->db->prepare($upd)->execute([
                ':score' => $finalAverage,
                ':sid' => $studentId
            ]);

            // Get quiz settings to check if results should be shown
            $quizStmt = $this->db->prepare("SELECT show_results_to_students FROM quizzes WHERE id = :qid");
            $quizStmt->execute([':qid' => $quizId]);
            $showResults = $quizStmt->fetchColumn();
            
            $this->db->commit();
            
            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Exam Submitted",
                "final_score" => round($finalAverage, 2),
                "student_id" => $studentId,
                "quiz_id" => $quizId,
                "show_results" => (bool)$showResults
            ]);

        } catch (Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => $e->getMessage()
            ]);
        }
    }

    // GET /api/exam/check-submission?code=XYZ&student_id=123
    public function checkSubmission() {
        $code = isset($_GET['code']) ? $_GET['code'] : '';
        $studentId = isset($_GET['student_id']) ? $_GET['student_id'] : '';
        
        if (empty($code) || empty($studentId)) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "Code and student ID required"
            ]);
            exit;
        }
        
        // Get quiz ID from code
        $stmt = $this->db->prepare("SELECT id FROM quizzes WHERE access_code = :code");
        $stmt->execute([':code' => $code]);
        $quiz = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$quiz) {
            http_response_code(404);
            echo json_encode([
                "success" => false,
                "message" => "Quiz not found"
            ]);
            exit;
        }
        
        // Check if student already submitted
        $checkStmt = $this->db->prepare("SELECT id FROM students WHERE quiz_id = :qid AND student_identifier = :sid AND status = 'SUBMITTED'");
        $checkStmt->execute([
            ':qid' => $quiz['id'],
            ':sid' => $studentId
        ]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
        
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "already_submitted" => $existing ? true : false
        ]);
    }

    // GET /api/exam/results?student_id=123
    public function getResults() {
        $studentId = isset($_GET['student_id']) ? $_GET['student_id'] : null;
        
        if (!$studentId) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => "Student ID is required"
            ]);
            exit;
        }

        try {
            // Get student and quiz info
            $stmt = $this->db->prepare("
                SELECT s.id, s.student_identifier, s.student_class, s.final_score, s.finished_at,
                       q.id as quiz_id, q.title as quiz_title, q.show_results_to_students
                FROM students s
                JOIN quizzes q ON s.quiz_id = q.id
                WHERE s.id = :sid
            ");
            $stmt->execute([':sid' => $studentId]);
            $student = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$student) {
                http_response_code(404);
                echo json_encode([
                    "success" => false,
                    "error" => "Submission not found"
                ]);
                exit;
            }

            // Check if results should be shown
            if (!$student['show_results_to_students']) {
                http_response_code(403);
                echo json_encode([
                    "success" => false,
                    "error" => "Results are not available for this quiz"
                ]);
                exit;
            }

            // Get all questions for the quiz
            $qStmt = $this->db->prepare("
                SELECT id, type, question_text, options, correct_answer, points
                FROM questions
                WHERE quiz_id = :qid
                ORDER BY id ASC
            ");
            $qStmt->execute([':qid' => $student['quiz_id']]);
            $questions = $qStmt->fetchAll(PDO::FETCH_ASSOC);

            // Get student answers
            $ansStmt = $this->db->prepare("
                SELECT question_id, answer_text, is_correct, points_earned, feedback
                FROM student_answers
                WHERE student_id = :sid
                ORDER BY question_id ASC
            ");
            $ansStmt->execute([':sid' => $studentId]);
            $answers = $ansStmt->fetchAll(PDO::FETCH_ASSOC);

            // Create answer map for easy lookup
            $answerMap = [];
            foreach ($answers as $ans) {
                $answerMap[$ans['question_id']] = $ans;
            }

            // Combine questions with student answers
            $results = [];
            foreach ($questions as $q) {
                $qId = $q['id'];
                $studentAnswer = $answerMap[$qId] ?? null;
                
                $result = [
                    'question_id' => $qId,
                    'type' => $q['type'],
                    'question_text' => $q['question_text'],
                    'correct_answer' => $q['correct_answer'],
                    'points' => $q['points'],
                    'student_answer' => $studentAnswer ? $studentAnswer['answer_text'] : null,
                    'points_earned' => $studentAnswer ? $studentAnswer['points_earned'] : 0,
                    'is_correct' => $studentAnswer ? (bool)$studentAnswer['is_correct'] : false,
                    'feedback' => $studentAnswer ? $studentAnswer['feedback'] : null
                ];

                // Decode options if MCQ
                if ($q['type'] === 'MCQ' && !empty($q['options'])) {
                    $decoded = json_decode($q['options'], true);
                    $result['options'] = $decoded !== null ? $decoded : [];
                }

                $results[] = $result;
            }

            http_response_code(200);
            echo json_encode([
                "success" => true,
                "quiz_title" => $student['quiz_title'],
                "student_identifier" => $student['student_identifier'],
                "student_class" => $student['student_class'],
                "final_score" => $student['final_score'],
                "finished_at" => $student['finished_at'],
                "results" => $results
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => $e->getMessage()
            ]);
        }
    }
}
?>