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

if (!isset($data->title) || !isset($data->questions)) {
    http_response_code(400);
    echo json_encode(["message" => "Missing required fields"]);
    exit;
}

try {
    // Start Transaction
    $db->beginTransaction();

    // Generate a random 6-char access code
    $access_code = strtoupper(substr(md5(uniqid()), 0, 6));
    
    // Insert Quiz Header
    $sql = "INSERT INTO quizzes (teacher_id, title, description, access_code, duration_minutes, is_active, status) 
            VALUES (:tid, :title, :desc, :code, :dur, 1, 'INACTIVE')";
    $stmt = $db->prepare($sql);
    $stmt->execute([
        ':tid' => $teacher_id,
        ':title' => $data->title,
        ':desc' => $data->description ?? '',
        ':code' => $access_code,
        ':dur' => $data->duration ?? 60
    ]);
    
    $quiz_id = $db->lastInsertId();

    // Insert Questions
    $qSql = "INSERT INTO questions (quiz_id, type, question_text, options, correct_answer, points) 
             VALUES (:qid, :type, :text, :opts, :ans, :pts)";
    $qStmt = $db->prepare($qSql);

    foreach ($data->questions as $q) {
        $optionsJson = isset($q->options) ? json_encode($q->options) : null;
        
        $qStmt->execute([
            ':qid' => $quiz_id,
            ':type' => $q->type,
            ':text' => $q->question_text,
            ':opts' => $optionsJson,
            ':ans' => $q->correct_answer ?? '',
            ':pts' => $q->points ?? 1
        ]);
    }

    // Commit Transaction
    $db->commit();
    
    echo json_encode([
        "message" => "Quiz created successfully!",
        "access_code" => $access_code,
        "quiz_id" => $quiz_id
    ]);

} catch (Exception $e) {
    // Rollback on Error
    $db->rollBack();
    http_response_code(500);
    echo json_encode(["error" => "Failed to create quiz: " . $e->getMessage()]);
}
?>
