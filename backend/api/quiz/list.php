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

$teacher_id = $teacher['id'];

// Get all quizzes for this teacher
$sql = "SELECT * FROM quizzes WHERE teacher_id = :tid ORDER BY created_at DESC";
$stmt = $db->prepare($sql);
$stmt->execute([':tid' => $teacher_id]);
$quizzes = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($quizzes);
?>
