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

// Connect to database
$database = new Database();
$db = $database->connect();

// Get quiz code from query parameters
if (!isset($_GET['code'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Quiz code is required']);
    exit;
}

$code = $_GET['code'];

try {
    // Get quiz by access code
    $stmt = $db->prepare("SELECT * FROM quizzes WHERE access_code = :code");
    $stmt->execute([':code' => $code]);
    $quiz = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$quiz) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Quiz not found']);
        exit;
    }

    // Get questions for this quiz
    $stmt = $db->prepare("SELECT * FROM questions WHERE quiz_id = :quiz_id ORDER BY id ASC");
    $stmt->execute([':quiz_id' => $quiz['id']]);
    $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Convert options from JSON string to array if needed
    foreach ($questions as &$question) {
        if ($question['options'] && is_string($question['options'])) {
            $question['options'] = json_decode($question['options'], true);
        }
    }

    echo json_encode([
        'success' => true,
        'quiz' => $quiz,
        'questions' => $questions
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
