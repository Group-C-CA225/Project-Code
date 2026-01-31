<?php
class CORSHandler {
    
    public static function setup() {
        // Always set CORS headers FIRST, before any other output
        
        // Get the request origin
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        // List of allowed origins
        $allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            'https://quizapp-swart-alpha.vercel.app',
        ];
        
        // Check if origin is in allowed list
        if (in_array($origin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: $origin");
        } else {
            // Fallback to production domain
            header("Access-Control-Allow-Origin: https://quizapp-swart-alpha.vercel.app");
        }
        
        // Essential CORS headers
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Max-Age: 3600");
        
        // Handle preflight OPTIONS request
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
        
        // Set content type for JSON responses
        header("Content-Type: application/json; charset=UTF-8");
    }
}
?>
