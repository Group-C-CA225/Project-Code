<?php
// CORS headers - must be first
header("Access-Control-Allow-Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'http://localhost:5173'));
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/Database.php';

// Get Authorization header
$headers = getallheaders();
if (!isset($headers['Authorization'])) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized - No token provided"]);
    exit;
}

$token = str_replace('Bearer ', '', $headers['Authorization']);

// Connect to database
$database = new Database();
$db = $database->getConnection();

// Verify token and get teacher ID
$stmt = $db->prepare("SELECT id FROM teachers WHERE api_token = :token");
$stmt->execute([':token' => $token]);
$teacher = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$teacher) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Invalid token"]);
    exit;
}

$teacher_id = $teacher['id'];

// Get quiz_id from query parameters
if (!isset($_GET['quiz_id'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Quiz ID is required"]);
    exit;
}

$quiz_id = $_GET['quiz_id'];

try {
    // Verify quiz belongs to teacher
    $stmt = $db->prepare("SELECT id, title, duration_minutes FROM quizzes WHERE id = :quiz_id AND teacher_id = :teacher_id");
    $stmt->execute([':quiz_id' => $quiz_id, ':teacher_id' => $teacher_id]);
    $quiz = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$quiz) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Quiz not found or access denied"]);
        exit;
    }

    // Get active exam sessions with student details (latest session per student, only recent heartbeats)
    // Filter by heartbeat to only show sessions that are actually active (within last 5 seconds)
    // Include violations_count to show tab switching violations
    $query = "SELECT 
                es.id as session_id,
                es.current_question_index,
                es.questions_answered,
                es.total_questions,
                es.time_remaining_seconds,
                es.status,
                es.last_heartbeat,
                es.last_activity,
                COALESCE(es.violations_count, 0) as violations_count,
                es.last_violation,
                TIMESTAMPDIFF(SECOND, es.last_heartbeat, NOW()) as seconds_since_heartbeat,
                TIMESTAMPDIFF(SECOND, es.last_violation, NOW()) as seconds_since_violation,
                s.student_identifier,
                s.student_class
              FROM exam_sessions es
              JOIN students s ON es.student_id = s.id
              INNER JOIN (
                  SELECT student_id, MAX(id) as max_id
                  FROM exam_sessions
                  WHERE quiz_id = :quiz_id 
                  AND status IN ('ACTIVE', 'PAUSED')
                  GROUP BY student_id
              ) latest ON es.student_id = latest.student_id AND es.id = latest.max_id
              WHERE es.quiz_id = :quiz_id 
              AND es.status IN ('ACTIVE', 'PAUSED')
              AND es.last_heartbeat IS NOT NULL 
              AND TIMESTAMPDIFF(SECOND, es.last_heartbeat, NOW()) < 5
              ORDER BY COALESCE(es.last_activity, es.last_heartbeat) DESC, es.id DESC";

    $stmt = $db->prepare($query);
    $stmt->execute([':quiz_id' => $quiz_id]);
    $active_sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate statistics
    $total_active = count($active_sessions);
    $total_questions = $quiz['total_questions'] ?? 0;
    
    // Calculate average progress
    $avg_progress = 0;
    if ($total_active > 0 && $total_questions > 0) {
        $total_progress = array_sum(array_map(function($session) use ($total_questions) {
            return ($session['questions_answered'] / $total_questions) * 100;
        }, $active_sessions));
        $avg_progress = round($total_progress / $total_active, 1);
    }

    // Calculate completion rate (students who finished vs total attempts)
    // Only count SUBMITTED students as attempts (students who start but leave don't count)
    $completion_query = "SELECT 
                           COUNT(CASE WHEN s.status = 'SUBMITTED' THEN 1 END) as completed,
                           COUNT(CASE WHEN s.status = 'SUBMITTED' THEN 1 END) as total_attempts
                         FROM students s 
                         WHERE s.quiz_id = :quiz_id";
    
    $stmt = $db->prepare($completion_query);
    $stmt->execute([':quiz_id' => $quiz_id]);
    $completion_stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $completion_rate = 0;
    if ($completion_stats['total_attempts'] > 0) {
        $completion_rate = round(($completion_stats['completed'] / $completion_stats['total_attempts']) * 100, 1);
    }

    // Return monitoring data
    echo json_encode([
        'success' => true,
        'quiz_id' => $quiz_id,
        'quiz_title' => $quiz['title'],
        'quiz_duration' => $quiz['duration_minutes'],
        'total_active' => $total_active,
        'avg_progress' => $avg_progress,
        'completion_rate' => $completion_rate,
        'active_sessions' => $active_sessions,
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
