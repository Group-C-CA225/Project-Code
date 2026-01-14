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

require_once '../config/Database.php';

// Handle different HTTP methods
$method = $_SERVER['REQUEST_METHOD'];

try {
    // Database connection
    $database = new Database();
    $db = $database->getConnection();
    
    switch ($method) {
        case 'GET':
            // Get exams
            if (isset($_GET['id'])) {
                // Get specific exam
                $query = "SELECT * FROM exams WHERE id = ?";
                $stmt = $db->prepare($query);
                $stmt->execute([$_GET['id']]);
                $exam = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($exam) {
                    echo json_encode(['success' => true, 'exam' => $exam]);
                } else {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'Exam not found']);
                }
            } else {
                // Get all exams
                $query = "SELECT * FROM exams ORDER BY created_at DESC";
                $stmt = $db->prepare($query);
                $stmt->execute();
                $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode(['success' => true, 'exams' => $exams]);
            }
            break;
            
        case 'POST':
            // Create new exam
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                throw new Exception('Invalid JSON input');
            }
            
            // Validate required fields
            if (empty($input['title'])) {
                throw new Exception('Exam title is required');
            }
            
            $query = "INSERT INTO exams (title, description, created_at) VALUES (?, ?, NOW())";
            $stmt = $db->prepare($query);
            
            if ($stmt->execute([$input['title'], $input['description'] ?? ''])) {
                $exam_id = $db->lastInsertId();
                echo json_encode([
                    'success' => true,
                    'message' => 'Exam created successfully',
                    'exam_id' => $exam_id
                ]);
            } else {
                throw new Exception('Failed to create exam');
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>