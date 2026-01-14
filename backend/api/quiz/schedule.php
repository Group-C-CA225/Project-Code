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

// Get request data
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->quiz_id) || !isset($data->start_time) || !isset($data->end_time)) {
    http_response_code(400);
    echo json_encode(["message" => "Missing required fields"]);
    exit;
}

// Verify ownership
$check = $db->prepare("SELECT id FROM quizzes WHERE id = :qid AND teacher_id = :tid");
$check->execute([':qid' => $data->quiz_id, ':tid' => $teacher_id]);

if ($check->rowCount() == 0) {
    http_response_code(403);
    echo json_encode(["message" => "Unauthorized - You don't own this quiz"]);
    exit;
}

// Update schedule
$sql = "UPDATE quizzes SET start_time = :start, end_time = :end WHERE id = :qid";
$stmt = $db->prepare($sql);
$stmt->execute([
    ':start' => $data->start_time,
    ':end' => $data->end_time,
    ':qid' => $data->quiz_id
]);

echo json_encode([
    "message" => "Quiz scheduled successfully",
    "start_time" => $data->start_time,
    "end_time" => $data->end_time
]);
?>
