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

// Get quiz ID from URL
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));
$quiz_id = end($pathParts);

if (!is_numeric($quiz_id)) {
    http_response_code(400);
    echo json_encode(["message" => "Invalid quiz ID"]);
    exit;
}

// Get request data
$data = json_decode(file_get_contents("php://input"));

// Verify quiz belongs to teacher
$stmt = $db->prepare("SELECT id FROM quizzes WHERE id = :id AND teacher_id = :tid");
$stmt->execute([':id' => $quiz_id, ':tid' => $teacher_id]);
$quiz = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$quiz) {
    http_response_code(404);
    echo json_encode(["message" => "Quiz not found or unauthorized"]);
    exit;
}

try {
    // Update quiz metadata
    $sql = "UPDATE quizzes SET ";
    $params = [':id' => $quiz_id];
    $updates = [];
    
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
    
    if (empty($updates)) {
        echo json_encode(["message" => "No fields to update"]);
        exit;
    }
    
    $sql .= implode(", ", $updates) . " WHERE id = :id";
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    echo json_encode([
        "message" => "Quiz updated successfully",
        "quiz_id" => $quiz_id
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to update quiz: " . $e->getMessage()]);
}
?>
