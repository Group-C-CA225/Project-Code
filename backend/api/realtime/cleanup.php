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
$db = $database->connect();

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
    $stmt = $db->prepare("SELECT id FROM quizzes WHERE id = :quiz_id AND teacher_id = :teacher_id");
    $stmt->execute([':quiz_id' => $quiz_id, ':teacher_id' => $teacher_id]);
    $quiz = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$quiz) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Quiz not found or access denied"]);
        exit;
    }

    // Clean up duplicate sessions - keep only the latest session per student
    $cleanup_query = "DELETE es1 FROM exam_sessions es1
                      INNER JOIN exam_sessions es2 
                      WHERE es1.student_id = es2.student_id 
                      AND es1.quiz_id = es2.quiz_id 
                      AND es1.status IN ('ACTIVE', 'PAUSED')
                      AND es2.status IN ('ACTIVE', 'PAUSED')
                      AND es1.id < es2.id";

    $stmt = $db->prepare($cleanup_query);
    $stmt->execute([':quiz_id' => $quiz_id]);
    $deleted_count = $stmt->rowCount();

    // Also clean up orphaned question progress
    $progress_cleanup = "DELETE eqp FROM exam_question_progress eqp
                         LEFT JOIN exam_sessions es ON eqp.session_id = es.id 
                         WHERE es.id IS NULL";

    $stmt = $db->prepare($progress_cleanup);
    $stmt->execute();
    $progress_deleted = $stmt->rowCount();

    echo json_encode([
        'success' => true,
        'message' => 'Cleanup completed successfully',
        'deleted_sessions' => $deleted_count,
        'deleted_progress' => $progress_deleted,
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
