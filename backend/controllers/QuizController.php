<?php
require_once 'config/Database.php';

class QuizController {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->connect();
    }

    // Helper: Validate Token to get Teacher ID
    private function getAuthTeacherId() {
        $authHeader = null;
        
        // Method 1: getallheaders() - works on Apache with mod_php
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            $headers = array_change_key_case($headers, CASE_LOWER);
            if (isset($headers['authorization'])) {
                $authHeader = $headers['authorization'];
            }
        }
        
        // Method 2: apache_request_headers() - alternative Apache function
        if (!$authHeader && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $headers = array_change_key_case($headers, CASE_LOWER);
            if (isset($headers['authorization'])) {
                $authHeader = $headers['authorization'];
            }
        }
        
        // Method 3: $_SERVER variables (CGI/FastCGI)
        if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        
        // Method 4: REDIRECT_HTTP_AUTHORIZATION (mod_rewrite)
        if (!$authHeader && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
        
        if (!$authHeader) {
            http_response_code(401);
            echo json_encode([
                "success" => false,
                "message" => "Unauthorized - No token provided"
            ]);
            exit;
        }
        
        // Extract token from "Bearer <token>"
        $token = preg_replace('/^Bearer\s+/i', '', $authHeader);
        
        $stmt = $this->db->prepare("SELECT id FROM teachers WHERE api_token = :token");
        $stmt->execute([':token' => $token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            http_response_code(401);
            echo json_encode([
                "success" => false,
                "message" => "Invalid Token"
            ]);
            exit;
        }
        return $user['id'];
    }

    public function create() {
        $teacher_id = $this->getAuthTeacherId();
        $data = json_decode(file_get_contents("php://input"));

        // Validate input
        if (!isset($data->title) || empty(trim($data->title))) {
            http_response_code(400);
            echo json_encode(["error" => "Quiz title is required"]);
            exit;
        }

        if (!isset($data->questions) || !is_array($data->questions) || count($data->questions) === 0) {
            http_response_code(400);
            echo json_encode(["error" => "At least one question is required"]);
            exit;
        }

        try {
            // 1. Start Transaction
            $this->db->beginTransaction();

            // 2. Insert Quiz Header
            // Generate a random 6-char access code
            $access_code = strtoupper(substr(md5(uniqid()), 0, 6)); 
            
            // Status defaults to 'INACTIVE' in database - teachers need to activate it
            $showResults = isset($data->show_results_to_students) ? ($data->show_results_to_students ? 1 : 0) : 0;
            $sql = "INSERT INTO quizzes (teacher_id, title, description, access_code, duration_minutes, is_active, status, show_results_to_students, class) 
                    VALUES (:tid, :title, :desc, :code, :dur, 1, 'INACTIVE', :show_results, :class)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':tid' => $teacher_id,
                ':title' => $data->title,
                ':desc' => $data->description ?? '',
                ':code' => $access_code,
                ':dur' => $data->duration ?? 60,
                ':show_results' => $showResults,
                ':class' => $data->class ?? null
            ]);
            
            $quiz_id = $this->db->lastInsertId();

            // 3. Insert Questions (Loop)
            $qSql = "INSERT INTO questions (quiz_id, type, question_text, options, correct_answer, points) 
                     VALUES (:qid, :type, :text, :opts, :ans, :pts)";
            $qStmt = $this->db->prepare($qSql);

            $questionCount = 0;
            foreach ($data->questions as $q) {
                // Validate question data
                if (empty(trim($q->question_text ?? ''))) {
                    throw new Exception("Question text cannot be empty");
                }
                
                $optionsJson = isset($q->options) && is_array($q->options) ? json_encode($q->options) : null;
                
                $qStmt->execute([
                    ':qid' => $quiz_id,
                    ':type' => $q->type ?? 'MCQ',
                    ':text' => $q->question_text,
                    ':opts' => $optionsJson,
                    ':ans' => $q->correct_answer ?? '',
                    ':pts' => $q->points ?? 1
                ]);
                $questionCount++;
            }

            if ($questionCount === 0) {
                throw new Exception("No valid questions were created");
            }

            // 4. Commit Transaction
            $this->db->commit();
            
            http_response_code(201);
            echo json_encode([
                "success" => true,
                "message" => "Quiz Created!",
                "access_code" => $access_code,
                "quiz_id" => $quiz_id,
                "questions_count" => $questionCount
            ]);

        } catch (Exception $e) {
            // 5. Rollback on Error
            $this->db->rollBack();
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => "Failed to create quiz: " . $e->getMessage()
            ]);
        }
    }

    public function list() {
        $teacher_id = $this->getAuthTeacherId();

        $sql = "SELECT * FROM quizzes WHERE teacher_id = :tid ORDER BY created_at DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':tid' => $teacher_id]);
        $quizzes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "quizzes" => $quizzes
        ]);
    }

    // PUT /api/quiz/{id} - Update quiz metadata
    public function update() {
        $teacher_id = $this->getAuthTeacherId();
        $quiz_id = isset($_GET['id']) ? $_GET['id'] : null;
        $data = json_decode(file_get_contents("php://input"));

        if (!$quiz_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Quiz ID is required"]);
            exit;
        }

        if (!$this->verifyQuizOwnership($quiz_id, $teacher_id)) {
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Unauthorized"]);
            exit;
        }

        try {
            // Build dynamic update query
            $updates = [];
            $params = [':qid' => $quiz_id];

            if (isset($data->title)) {
                $updates[] = "title = :title";
                $params[':title'] = $data->title;
            }

            if (isset($data->description)) {
                $updates[] = "description = :desc";
                $params[':desc'] = $data->description;
            }

            if (isset($data->duration_minutes)) {
                $updates[] = "duration_minutes = :dur";
                $params[':dur'] = $data->duration_minutes;
            }

            if (isset($data->class)) {
                $updates[] = "class = :class";
                $params[':class'] = $data->class;
            }

            if (empty($updates)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "No fields to update"]);
                exit;
            }

            $sql = "UPDATE quizzes SET " . implode(", ", $updates) . " WHERE id = :qid";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Quiz updated successfully"
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => "Failed to update quiz: " . $e->getMessage()
            ]);
        }
    }

    // DELETE /api/quiz/{id} - Delete quiz
    public function delete() {
        $teacher_id = $this->getAuthTeacherId();
        $quiz_id = isset($_GET['id']) ? $_GET['id'] : null;

        if (!$quiz_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Quiz ID is required"]);
            exit;
        }

        if (!$this->verifyQuizOwnership($quiz_id, $teacher_id)) {
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Unauthorized"]);
            exit;
        }

        try {
            // Delete questions first (foreign key constraint)
            $stmt = $this->db->prepare("DELETE FROM questions WHERE quiz_id = :qid");
            $stmt->execute([':qid' => $quiz_id]);

            // Delete student answers if table exists
            try {
                $stmt = $this->db->prepare("DELETE FROM student_answers WHERE quiz_id = :qid");
                $stmt->execute([':qid' => $quiz_id]);
            } catch (Exception $e) {
                // Table might not exist, continue
            }

            // Delete quiz
            $stmt = $this->db->prepare("DELETE FROM quizzes WHERE id = :qid");
            $stmt->execute([':qid' => $quiz_id]);

            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Quiz deleted successfully"
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => "Failed to delete quiz: " . $e->getMessage()
            ]);
        }
    }

    public function toggleStatus() {
        $teacher_id = $this->getAuthTeacherId();
        $data = json_decode(file_get_contents("php://input"));

        // Verify ownership
        $check = $this->db->prepare("SELECT id FROM quizzes WHERE id = :qid AND teacher_id = :tid");
        $check->execute([':qid' => $data->quiz_id, ':tid' => $teacher_id]);
        
        if ($check->rowCount() == 0) {
            http_response_code(403);
            echo json_encode(["message" => "Unauthorized"]);
            return;
        }

        // Update status
        $sql = "UPDATE quizzes SET status = :status WHERE id = :qid";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':status' => $data->status, ':qid' => $data->quiz_id]);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Quiz status updated",
            "status" => $data->status
        ]);
    }

    public function schedule() {
        $teacher_id = $this->getAuthTeacherId();
        $data = json_decode(file_get_contents("php://input"));

        // Verify ownership
        $check = $this->db->prepare("SELECT id FROM quizzes WHERE id = :qid AND teacher_id = :tid");
        $check->execute([':qid' => $data->quiz_id, ':tid' => $teacher_id]);
        
        if ($check->rowCount() == 0) {
            http_response_code(403);
            echo json_encode(["message" => "Unauthorized"]);
            return;
        }

        // Update schedule
        $sql = "UPDATE quizzes SET start_time = :start, end_time = :end WHERE id = :qid";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':start' => $data->start_time,
            ':end' => $data->end_time,
            ':qid' => $data->quiz_id
        ]);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Quiz scheduled successfully"
        ]);
    }

    // POST /api/quiz/{id}/duplicate - Duplicate a quiz with all questions
    public function duplicate() {
        $teacher_id = $this->getAuthTeacherId();
        $quiz_id = isset($_GET['id']) ? $_GET['id'] : null;

        if (!$quiz_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Quiz ID is required"]);
            exit;
        }

        if (!$this->verifyQuizOwnership($quiz_id, $teacher_id)) {
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Unauthorized"]);
            exit;
        }

        try {
            $this->db->beginTransaction();

            // Get original quiz
            $stmt = $this->db->prepare("SELECT title, description, duration_minutes, show_results_to_students, class FROM quizzes WHERE id = :qid");
            $stmt->execute([':qid' => $quiz_id]);
            $originalQuiz = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$originalQuiz) {
                throw new Exception("Quiz not found");
            }

            // Create new quiz with "(Copy)" suffix
            $access_code = strtoupper(substr(md5(uniqid()), 0, 6));
            $newTitle = $originalQuiz['title'] . ' (Copy)';
            
            $sql = "INSERT INTO quizzes (teacher_id, title, description, access_code, duration_minutes, is_active, status, show_results_to_students, class) 
                    VALUES (:tid, :title, :desc, :code, :dur, 1, 'INACTIVE', :show_results, :class)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':tid' => $teacher_id,
                ':title' => $newTitle,
                ':desc' => $originalQuiz['description'],
                ':code' => $access_code,
                ':dur' => $originalQuiz['duration_minutes'],
                ':show_results' => $originalQuiz['show_results_to_students'],
                ':class' => $originalQuiz['class']
            ]);
            
            $new_quiz_id = $this->db->lastInsertId();

            // Copy all questions
            $qStmt = $this->db->prepare("SELECT type, question_text, options, correct_answer, points FROM questions WHERE quiz_id = :qid");
            $qStmt->execute([':qid' => $quiz_id]);
            $questions = $qStmt->fetchAll(PDO::FETCH_ASSOC);

            $insertStmt = $this->db->prepare("INSERT INTO questions (quiz_id, type, question_text, options, correct_answer, points) 
                                              VALUES (:qid, :type, :text, :opts, :ans, :pts)");

            foreach ($questions as $q) {
                $insertStmt->execute([
                    ':qid' => $new_quiz_id,
                    ':type' => $q['type'],
                    ':text' => $q['question_text'],
                    ':opts' => $q['options'],
                    ':ans' => $q['correct_answer'],
                    ':pts' => $q['points']
                ]);
            }

            $this->db->commit();

            http_response_code(201);
            echo json_encode([
                "success" => true,
                "message" => "Quiz duplicated successfully",
                "new_quiz_id" => $new_quiz_id,
                "access_code" => $access_code
            ]);
        } catch (Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => "Failed to duplicate quiz: " . $e->getMessage()
            ]);
        }
    }

    // Helper: Verify quiz ownership
    private function verifyQuizOwnership($quiz_id, $teacher_id) {
        $check = $this->db->prepare("SELECT id FROM quizzes WHERE id = :qid AND teacher_id = :tid");
        $check->execute([':qid' => $quiz_id, ':tid' => $teacher_id]);
        return $check->rowCount() > 0;
    }

    // GET /api/quiz/{id}/questions - Get all questions for a quiz
    public function getQuestions() {
        $teacher_id = $this->getAuthTeacherId();
        $quiz_id = isset($_GET['id']) ? $_GET['id'] : null;

        if (!$quiz_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Quiz ID is required"]);
            exit;
        }

        if (!$this->verifyQuizOwnership($quiz_id, $teacher_id)) {
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Unauthorized"]);
            exit;
        }

        $stmt = $this->db->prepare("SELECT id, type, question_text, options, correct_answer, points FROM questions WHERE quiz_id = :qid ORDER BY id ASC");
        $stmt->execute([':qid' => $quiz_id]);
        $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Decode JSON options
        foreach ($questions as &$q) {
            if (!empty($q['options'])) {
                $decoded = json_decode($q['options'], true);
                $q['options'] = $decoded !== null ? $decoded : [];
            } else {
                $q['options'] = [];
            }
        }
        unset($q);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "questions" => $questions
        ]);
    }

    // GET /api/quiz/{id} - Get quiz details with questions
    public function getQuiz() {
        $teacher_id = $this->getAuthTeacherId();
        $quiz_id = isset($_GET['id']) ? $_GET['id'] : null;

        if (!$quiz_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Quiz ID is required"]);
            exit;
        }

        if (!$this->verifyQuizOwnership($quiz_id, $teacher_id)) {
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Unauthorized"]);
            exit;
        }

        // Get quiz info
        $stmt = $this->db->prepare("SELECT id, title, description, access_code, duration_minutes, is_active, status, start_time, end_time, class FROM quizzes WHERE id = :qid");
        $stmt->execute([':qid' => $quiz_id]);
        $quiz = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$quiz) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Quiz not found"]);
            exit;
        }

        // Get questions
        $qStmt = $this->db->prepare("SELECT id, type, question_text, options, correct_answer, points FROM questions WHERE quiz_id = :qid ORDER BY id ASC");
        $qStmt->execute([':qid' => $quiz_id]);
        $questions = $qStmt->fetchAll(PDO::FETCH_ASSOC);

        // Decode JSON options
        foreach ($questions as &$q) {
            if (!empty($q['options'])) {
                $decoded = json_decode($q['options'], true);
                $q['options'] = $decoded !== null ? $decoded : [];
            } else {
                $q['options'] = [];
            }
        }
        unset($q);

        $quiz['questions'] = $questions;

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "quiz" => $quiz
        ]);
    }

    // POST /api/quiz/{id}/questions - Add a new question to a quiz
    public function addQuestion() {
        $teacher_id = $this->getAuthTeacherId();
        $quiz_id = isset($_GET['id']) ? $_GET['id'] : null;
        $data = json_decode(file_get_contents("php://input"));

        if (!$quiz_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Quiz ID is required"]);
            exit;
        }

        if (!$this->verifyQuizOwnership($quiz_id, $teacher_id)) {
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Unauthorized"]);
            exit;
        }

        // Validate question data
        if (empty(trim($data->question_text ?? ''))) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Question text is required"]);
            exit;
        }

        try {
            $optionsJson = isset($data->options) && is_array($data->options) ? json_encode($data->options) : null;
            
            $sql = "INSERT INTO questions (quiz_id, type, question_text, options, correct_answer, points) 
                    VALUES (:qid, :type, :text, :opts, :ans, :pts)";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':qid' => $quiz_id,
                ':type' => $data->type ?? 'MCQ',
                ':text' => $data->question_text,
                ':opts' => $optionsJson,
                ':ans' => $data->correct_answer ?? '',
                ':pts' => $data->points ?? 1
            ]);

            $questionId = $this->db->lastInsertId();

            http_response_code(201);
            echo json_encode([
                "success" => true,
                "message" => "Question added successfully",
                "question_id" => $questionId
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => "Failed to add question: " . $e->getMessage()
            ]);
        }
    }

    // PUT /api/quiz/{id}/questions/{questionId} - Update a question
    public function updateQuestion() {
        $teacher_id = $this->getAuthTeacherId();
        $quiz_id = isset($_GET['id']) ? $_GET['id'] : null;
        $question_id = isset($_GET['questionId']) ? $_GET['questionId'] : null;
        $data = json_decode(file_get_contents("php://input"));

        if (!$quiz_id || !$question_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Quiz ID and Question ID are required"]);
            exit;
        }

        if (!$this->verifyQuizOwnership($quiz_id, $teacher_id)) {
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Unauthorized"]);
            exit;
        }

        // Verify question belongs to quiz
        $check = $this->db->prepare("SELECT id FROM questions WHERE id = :qid AND quiz_id = :quiz_id");
        $check->execute([':qid' => $question_id, ':quiz_id' => $quiz_id]);
        if ($check->rowCount() == 0) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Question not found"]);
            exit;
        }

        // Validate question data
        if (empty(trim($data->question_text ?? ''))) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Question text is required"]);
            exit;
        }

        try {
            $optionsJson = isset($data->options) && is_array($data->options) ? json_encode($data->options) : null;
            
            $sql = "UPDATE questions SET type = :type, question_text = :text, options = :opts, correct_answer = :ans, points = :pts WHERE id = :qid";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':qid' => $question_id,
                ':type' => $data->type ?? 'MCQ',
                ':text' => $data->question_text,
                ':opts' => $optionsJson,
                ':ans' => $data->correct_answer ?? '',
                ':pts' => $data->points ?? 1
            ]);

            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Question updated successfully"
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => "Failed to update question: " . $e->getMessage()
            ]);
        }
    }

    // DELETE /api/quiz/{id}/questions/{questionId} - Delete a question
    public function deleteQuestion() {
        $teacher_id = $this->getAuthTeacherId();
        $quiz_id = isset($_GET['id']) ? $_GET['id'] : null;
        $question_id = isset($_GET['questionId']) ? $_GET['questionId'] : null;

        if (!$quiz_id || !$question_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Quiz ID and Question ID are required"]);
            exit;
        }

        if (!$this->verifyQuizOwnership($quiz_id, $teacher_id)) {
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Unauthorized"]);
            exit;
        }

        // Verify question belongs to quiz
        $check = $this->db->prepare("SELECT id FROM questions WHERE id = :qid AND quiz_id = :quiz_id");
        $check->execute([':qid' => $question_id, ':quiz_id' => $quiz_id]);
        if ($check->rowCount() == 0) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Question not found"]);
            exit;
        }

        try {
            $sql = "DELETE FROM questions WHERE id = :qid";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':qid' => $question_id]);

            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Question deleted successfully"
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "error" => "Failed to delete question: " . $e->getMessage()
            ]);
        }
    }
}
?>