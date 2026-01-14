<?php
class CORSHandler {
    
    public static function setup() {
        // Get the request origin
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        // Determine environment (development or production)
        $isDevelopment = (
            $_SERVER['SERVER_NAME'] === 'localhost' || 
            $_SERVER['SERVER_NAME'] === '127.0.0.1' ||
            strpos($_SERVER['HTTP_HOST'] ?? '', 'localhost') !== false
        );
        
        // Allowed origins based on environment
        $allowedOrigins = [];
        
        if ($isDevelopment) {
            // Development origins
            $allowedOrigins = [
                'http://localhost:5173',
                'http://127.0.0.1:5173',
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://localhost:5174',
                'http://127.0.0.1:5174',
            ];
        } else {
            // Production origins - add your production domain here
            $allowedOrigins = [
                'https://yourdomain.com',
                'https://www.yourdomain.com',
            ];
            
            // For production, you can also use a wildcard or check against a database
            // For security, it's better to use specific domains
        }
        
        // Set the allowed origin
        // IMPORTANT: When using credentials, we CANNOT use wildcard (*)
        if ($origin && in_array($origin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: $origin");
        } elseif ($isDevelopment) {
            // Default fallback for development - use the first allowed origin
            header("Access-Control-Allow-Origin: " . $allowedOrigins[0]);
        }
        // Note: If origin is not in whitelist in production, CORS will fail (security)
        
        // Essential CORS headers
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Max-Age: 3600"); // Cache preflight for 1 hour
        
        // Handle preflight OPTIONS request - MUST set headers before exit
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            // Return 200 OK with no body for preflight
            http_response_code(200);
            exit();
        }
        
        // Always set content type for JSON responses (for actual requests, not OPTIONS)
        header("Content-Type: application/json; charset=UTF-8");
    }
}
