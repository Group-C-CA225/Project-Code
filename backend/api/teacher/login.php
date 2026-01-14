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

// Catch any errors and ensure CORS headers are sent
try {
    require_once __DIR__ . '/../../config/Database.php';
    require_once __DIR__ . '/../../controllers/AuthController.php';

    $controller = new AuthController();
    $controller->login();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(["error" => "Server error: " . $e->getMessage()]);
    exit();
}
