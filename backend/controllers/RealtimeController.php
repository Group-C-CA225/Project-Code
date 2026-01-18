<?php
require_once 'config/Database.php';

class RealtimeController {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->connect();
    }

    private function getAuthTeacherId() {
        $authHeader = null;
        
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            $headers = array_change_key_case($headers, CASE_LOWER);
            if (isset($headers['authorization'])) {
                $authHeader = $headers['authorization'];
            }
        }
        
        if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        
        if (!$authHeader && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
        
        if (!$authHeader) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            exit;
        }
        
        $token = preg_replace('/^Bearer\s+/i', '', $authHeader);
        
        $stmt = $this->db->prepare("SELECT id FROM teachers WHERE api_token = :token");
        $stmt->execute([':token' => $token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Invalid Token"]);
            exit;
        }
        
        return $user['id'];
    }

    // POST /api/realtime/session/start
    public function startSession() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $studentIdentifier = $data['student_identifier'] ?? null;
        $studentClass = $data['student_class'] ?? '';
        $quizId = $data['quiz_id'] ?? null;
        $totalQuestions = $data['total_questions'] ?? 0;
        $timeRemaining = $data['time_remaining_seconds'] ?? null;
        
        if (!$studentIdentifier || !$quizId) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            return;
        }
        
        try {
            // Check if student record exists, create if not
            $checkStmt = $this->db->prepare("SELECT id FROM students WHERE quiz_id = :qid AND student_identifier = :sid");
            $checkStmt->execute([':qid' => $quizId, ':sid' => $studentIdentifier]);
            $existingStudent = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            $studentId = null;
            if ($existingStudent) {
                $studentId = $existingStudent['id'];
            } else {
                // Create temporary student record for tracking
                $insertStmt = $this->db->prepare(
                    "INSERT INTO students (quiz_id, student_identifier, student_class, status, started_at) 
                     VALUES (:qid, :sid, :class, 'IN_PROGRESS', NOW())"
                );
                $insertStmt->execute([
                    ':qid' => $quizId,
                    ':sid' => $studentIdentifier,
                    ':class' => $studentClass
                ]);
                $studentId = $this->db->lastInsertId();
            }
            
            // End any existing active sessions for this student/quiz combination
            $endExistingStmt = $this->db->prepare("
                UPDATE exam_sessions 
                SET status = 'ABANDONED', last_heartbeat = NOW() 
                WHERE student_id = :sid AND quiz_id = :qid AND status IN ('ACTIVE', 'PAUSED')
            ");
            $endExistingStmt->execute([':sid' => $studentId, ':qid' => $quizId]);
            
            // Generate new session token
            $sessionToken = bin2hex(random_bytes(32));
            
            // Create new session
            $sql = "INSERT INTO exam_sessions 
                    (student_id, quiz_id, session_token, total_questions, time_remaining_seconds, status, last_activity, last_heartbeat) 
                    VALUES (:sid, :qid, :token, :total, :time, 'ACTIVE', NOW(), NOW())";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                ':sid' => $studentId,
                ':qid' => $quizId,
                ':token' => $sessionToken,
                ':total' => $totalQuestions,
                ':time' => $timeRemaining
            ]);
            
            $sessionId = $this->db->lastInsertId();
            
            // Update quiz active sessions count
            $this->updateActiveSessionsCount($quizId);
            
            http_response_code(201);
            echo json_encode([
                "success" => true,
                "session_id" => $sessionId,
                "session_token" => $sessionToken
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    // POST /api/realtime/session/update
    public function updateSession() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $sessionToken = $data['session_token'] ?? null;
        $currentQuestionIndex = $data['current_question_index'] ?? null;
        $questionsAnswered = $data['questions_answered'] ?? null;
        $timeRemaining = $data['time_remaining_seconds'] ?? null;
        
        if (!$sessionToken) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Session token required"]);
            return;
        }
        
        try {
            $updates = [];
            $params = [':token' => $sessionToken];
            
            if ($currentQuestionIndex !== null) {
                $updates[] = "current_question_index = :index";
                $params[':index'] = $currentQuestionIndex;
            }
            if ($questionsAnswered !== null) {
                $updates[] = "questions_answered = :answered";
                $params[':answered'] = $questionsAnswered;
            }
            if ($timeRemaining !== null) {
                $updates[] = "time_remaining_seconds = :time";
                $params[':time'] = $timeRemaining;
            }
            
            // Update both last_heartbeat and last_activity for proper monitoring
            $updates[] = "last_heartbeat = NOW()";
            $updates[] = "last_activity = NOW()";
            
            $sql = "UPDATE exam_sessions SET " . implode(', ', $updates) . " WHERE session_token = :token AND status IN ('ACTIVE', 'PAUSED')";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            // Get current session status to return to client
            $statusStmt = $this->db->prepare("SELECT status, paused_by_teacher FROM exam_sessions WHERE session_token = :token");
            $statusStmt->execute([':token' => $sessionToken]);
            $session = $statusStmt->fetch(PDO::FETCH_ASSOC);
            
            http_response_code(200);
            echo json_encode([
                "success" => true,
                "status" => $session['status'] ?? 'ACTIVE',
                "paused_by_teacher" => (bool)($session['paused_by_teacher'] ?? false)
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    // POST /api/realtime/session/end
    public function endSession() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $sessionToken = $data['session_token'] ?? null;
        
        if (!$sessionToken) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Session token required"]);
            return;
        }
        
        try {
            // Get quiz_id before ending
            $stmt = $this->db->prepare("SELECT quiz_id FROM exam_sessions WHERE session_token = :token");
            $stmt->execute([':token' => $sessionToken]);
            $session = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($session) {
                $sql = "UPDATE exam_sessions SET status = 'COMPLETED', last_heartbeat = NOW() WHERE session_token = :token";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([':token' => $sessionToken]);
                
                // Decrement active sessions count
                $this->db->exec("UPDATE quizzes SET active_sessions_count = GREATEST(active_sessions_count - 1, 0) WHERE id = {$session['quiz_id']}");
            }
            
            http_response_code(200);
            echo json_encode(["success" => true]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    // POST /api/realtime/session/violation
    public function reportViolation() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $sessionToken = $data['session_token'] ?? null;
        $violationType = $data['violation_type'] ?? 'TAB_SWITCH';
        
        if (!$sessionToken) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Session token required"]);
            return;
        }
        
        try {
            // Increment violations count for this session
            // Note: If violations_count column doesn't exist, this will fail gracefully
            try {
                $sql = "UPDATE exam_sessions 
                        SET violations_count = COALESCE(violations_count, 0) + 1,
                            last_violation = NOW(),
                            last_heartbeat = NOW()
                        WHERE session_token = :token AND status IN ('ACTIVE', 'PAUSED')";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([':token' => $sessionToken]);
            } catch (PDOException $e) {
                // If violations_count column doesn't exist, try without it
                if (strpos($e->getMessage(), 'violations_count') !== false) {
                    $sql = "UPDATE exam_sessions 
                            SET last_heartbeat = NOW()
                            WHERE session_token = :token AND status IN ('ACTIVE', 'PAUSED')";
                    $stmt = $this->db->prepare($sql);
                    $stmt->execute([':token' => $sessionToken]);
                } else {
                    throw $e;
                }
            }
            
            http_response_code(200);
            echo json_encode(["success" => true, "message" => "Violation reported"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }

    // GET /api/realtime/monitor/:quizId
    public function getQuizMonitoring() {
        $tid = $this->getAuthTeacherId();
        $quizId = $_GET['quiz_id'] ?? null;
        
        if (!$quizId) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Quiz ID required"]);
            return;
        }
        
        // Verify ownership
        $stmt = $this->db->prepare("SELECT id, title, duration_minutes FROM quizzes WHERE id = :qid AND teacher_id = :tid");
        $stmt->execute([':qid' => $quizId, ':tid' => $tid]);
        $quiz = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$quiz) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            return;
        }
        
        // Get active sessions with student info
        $sql = "SELECT 
                    es.id as session_id,
                    es.current_question_index,
                    es.questions_answered,
                    es.total_questions,
                    es.time_remaining_seconds,
                    es.started_at,
                    es.last_heartbeat,
                    es.status,
                    s.student_identifier,
                    s.student_class,
                    TIMESTAMPDIFF(SECOND, es.last_heartbeat, NOW()) as seconds_since_heartbeat
                FROM exam_sessions es
                JOIN students s ON es.student_id = s.id
                WHERE es.quiz_id = :qid 
                AND es.status = 'ACTIVE'
                AND TIMESTAMPDIFF(SECOND, es.last_heartbeat, NOW()) < 30
                ORDER BY es.last_heartbeat DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':qid' => $quizId]);
        $activeSessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate statistics
        $totalActive = count($activeSessions);
        $avgProgress = 0;
        $completionRate = 0;
        
        if ($totalActive > 0) {
            $totalProgress = array_sum(array_map(function($s) {
                return ($s['questions_answered'] / $s['total_questions']) * 100;
            }, $activeSessions));
            $avgProgress = round($totalProgress / $totalActive, 1);
            
            $completed = array_filter($activeSessions, function($s) {
                return $s['questions_answered'] == $s['total_questions'];
            });
            $completionRate = round((count($completed) / $totalActive) * 100, 1);
        }
        
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "quiz_title" => $quiz['title'],
            "quiz_duration" => $quiz['duration_minutes'],
            "total_active" => $totalActive,
            "avg_progress" => $avgProgress,
            "completion_rate" => $completionRate,
            "active_sessions" => $activeSessions
        ]);
    }

    // Cleanup abandoned sessions (called periodically)
    public function cleanupSessions() {
        try {
            // Mark sessions as abandoned if no heartbeat for 2 minutes
            $sql = "UPDATE exam_sessions 
                    SET status = 'ABANDONED' 
                    WHERE status = 'ACTIVE' 
                    AND TIMESTAMPDIFF(SECOND, last_heartbeat, NOW()) > 120";
            $this->db->exec($sql);
            
            // Update active sessions counts
            $sql = "UPDATE quizzes q 
                    SET active_sessions_count = (
                        SELECT COUNT(*) FROM exam_sessions 
                        WHERE quiz_id = q.id AND status = 'ACTIVE'
                    )";
            $this->db->exec($sql);
            
            http_response_code(200);
            echo json_encode(["success" => true, "message" => "Cleanup completed"]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }
    
    // POST /api/realtime/control - Pause/Resume controls
    public function controlExam() {
        $tid = $this->getAuthTeacherId();
        $data = json_decode(file_get_contents('php://input'), true);
        
        $quizId = $data['quiz_id'] ?? null;
        $action = $data['action'] ?? null;
        $sessionId = $data['session_id'] ?? null;
        
        if (!$quizId || !$action) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Missing required fields"]);
            return;
        }
        
        // Verify quiz ownership
        $stmt = $this->db->prepare("SELECT id FROM quizzes WHERE id = :qid AND teacher_id = :tid");
        $stmt->execute([':qid' => $quizId, ':tid' => $tid]);
        if (!$stmt->fetch()) {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Unauthorized"]);
            return;
        }
        
        try {
            switch ($action) {
                case 'pause':
                    // Pause all active sessions for this quiz
                    $stmt = $this->db->prepare("
                        UPDATE exam_sessions 
                        SET status = 'PAUSED', paused_at = NOW(), paused_by_teacher = TRUE 
                        WHERE quiz_id = :qid AND status = 'ACTIVE'
                    ");
                    $stmt->execute([':qid' => $quizId]);
                    $affected = $stmt->rowCount();
                    echo json_encode(["success" => true, "message" => "Paused $affected sessions"]);
                    break;
                    
                case 'resume':
                    // Resume all paused sessions for this quiz
                    $stmt = $this->db->prepare("
                        UPDATE exam_sessions 
                        SET status = 'ACTIVE', paused_at = NULL, paused_by_teacher = FALSE 
                        WHERE quiz_id = :qid AND status = 'PAUSED'
                    ");
                    $stmt->execute([':qid' => $quizId]);
                    $affected = $stmt->rowCount();
                    echo json_encode(["success" => true, "message" => "Resumed $affected sessions"]);
                    break;
                    
                case 'pause_student':
                    // Pause specific student session
                    if (!$sessionId) {
                        http_response_code(400);
                        echo json_encode(["success" => false, "message" => "Session ID required"]);
                        return;
                    }
                    $stmt = $this->db->prepare("
                        UPDATE exam_sessions 
                        SET status = 'PAUSED', paused_at = NOW(), paused_by_teacher = TRUE 
                        WHERE id = :sid AND quiz_id = :qid AND status = 'ACTIVE'
                    ");
                    $stmt->execute([':sid' => $sessionId, ':qid' => $quizId]);
                    echo json_encode(["success" => true, "message" => "Student session paused"]);
                    break;
                    
                case 'resume_student':
                    // Resume specific student session
                    if (!$sessionId) {
                        http_response_code(400);
                        echo json_encode(["success" => false, "message" => "Session ID required"]);
                        return;
                    }
                    $stmt = $this->db->prepare("
                        UPDATE exam_sessions 
                        SET status = 'ACTIVE', paused_at = NULL, paused_by_teacher = FALSE 
                        WHERE id = :sid AND quiz_id = :qid AND status = 'PAUSED'
                    ");
                    $stmt->execute([':sid' => $sessionId, ':qid' => $quizId]);
                    echo json_encode(["success" => true, "message" => "Student session resumed"]);
                    break;
                    
                default:
                    http_response_code(400);
                    echo json_encode(["success" => false, "message" => "Invalid action"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $e->getMessage()]);
        }
    }
    
    private function updateActiveSessionsCount($quizId) {
        $stmt = $this->db->prepare("
            UPDATE quizzes 
            SET active_sessions_count = (
                SELECT COUNT(*) FROM exam_sessions 
                WHERE quiz_id = ? AND status = 'ACTIVE'
            ) 
            WHERE id = ?
        ");
        $stmt->execute([$quizId, $quizId]);
    }
}
?>
