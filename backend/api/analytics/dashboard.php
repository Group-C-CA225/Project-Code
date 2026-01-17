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
    echo json_encode(["message" => "Unauthorized - No token provided"]);
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
    echo json_encode(["message" => "Invalid token"]);
    exit;
}

$tid = $teacher['id'];

// 1. Total unique Students across all quizzes
$sqlStudents = "SELECT COUNT(DISTINCT s.student_identifier) as total FROM students s 
                JOIN quizzes q ON s.quiz_id = q.id 
                WHERE q.teacher_id = :tid";
$stmt = $db->prepare($sqlStudents);
$stmt->execute([':tid' => $tid]);
$totalStudents = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

// 2. Average Score
$sqlAvg = "SELECT AVG(final_score) as avg_score FROM students s 
           JOIN quizzes q ON s.quiz_id = q.id 
           WHERE q.teacher_id = :tid AND s.status = 'SUBMITTED'";
$stmt = $db->prepare($sqlAvg);
$stmt->execute([':tid' => $tid]);
$avgScore = $stmt->fetch(PDO::FETCH_ASSOC)['avg_score'];

// 3. Recent Quizzes with unique student attempt counts (only SUBMITTED students count as attempts)
$sqlRecent = "SELECT q.id, q.title, q.access_code, q.created_at, q.status, q.start_time, q.end_time,
                     (SELECT COUNT(DISTINCT student_identifier) FROM students WHERE quiz_id = q.id AND status = 'SUBMITTED') as attempt_count
              FROM quizzes q 
              WHERE q.teacher_id = :tid 
              ORDER BY q.created_at DESC LIMIT 10";
$stmt = $db->prepare($sqlRecent);
$stmt->execute([':tid' => $tid]);
$recent = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    "total_students" => (int)$totalStudents,
    "avg_score" => $avgScore ? round($avgScore, 1) : 0,
    "recent_quizzes" => $recent
]);
?>
