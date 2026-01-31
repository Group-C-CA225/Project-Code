<?php
class Router {
    private $routes = [];

    public function post($path, $action) { $this->routes['POST'][$path] = $action; }
    public function get($path, $action) { $this->routes['GET'][$path] = $action; }
    public function put($path, $action) { $this->routes['PUT'][$path] = $action; }
    public function delete($path, $action) { $this->routes['DELETE'][$path] = $action; }

    public function dispatch() {
        try {
            $method = $_SERVER['REQUEST_METHOD'];
            
            // Handle method override for PUT/DELETE (some clients send POST with _method)
            if ($method === 'POST' && isset($_POST['_method'])) {
                $method = strtoupper($_POST['_method']);
            }
            
            $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
            
            // Remove common folder prefixes (for local development)
            // This handles both local and production environments
            $path = preg_replace('#^/quiz_platform/backend#i', '', $path);
            $path = preg_replace('#^/backend#i', '', $path);
            
            // Ensure path starts with /
            if (empty($path) || $path[0] !== '/') {
                $path = '/' . $path;
            }
            
            // If path is just "/", redirect to a default route or show API info
            if ($path === '/' || $path === '') {
                http_response_code(200);
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => true,
                    'message' => 'Quiz Platform API',
                    'version' => '2.0',
                    'endpoints' => [
                        'POST /api/teacher/register' => 'Register teacher account',
                        'POST /api/teacher/login' => 'Login teacher',
                        'GET /api/quiz/list' => 'List all quizzes (requires auth)',
                        'GET /api/exam/start?code=XXX' => 'Start exam with access code',
                        'POST /api/exam/submit' => 'Submit exam answers'
                    ]
                ]);
                return;
            }

            // Try exact match first
            if (isset($this->routes[$method][$path])) {
                $this->executeRoute($this->routes[$method][$path]);
                return;
            }

            // Try pattern matching for dynamic routes (e.g., /api/quiz/{id}/questions)
            foreach ($this->routes[$method] ?? [] as $routePath => $action) {
                $pattern = $this->convertToPattern($routePath);
                if (preg_match($pattern, $path, $matches)) {
                    // Extract parameters and store in $_GET for easy access
                    array_shift($matches); // Remove full match
                    $paramNames = $this->extractParamNames($routePath);
                    foreach ($paramNames as $index => $paramName) {
                        if (isset($matches[$index])) {
                            $_GET[$paramName] = $matches[$index];
                        }
                    }
                    $this->executeRoute($action);
                    return;
                }
            }

            // No route found
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => "Route not found: $method $path",
                'available_routes' => array_keys($this->routes[$method] ?? []),
                'debug' => [
                    'request_uri' => $_SERVER['REQUEST_URI'],
                    'parsed_path' => $path,
                    'method' => $method
                ]
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Router error: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
        }
    }

    private function executeRoute($action) {
        $actionParts = explode('@', $action);
        $controllerName = $actionParts[0];
        $methodName = $actionParts[1];

        $controllerFile = "controllers/$controllerName.php";
        if (!file_exists($controllerFile)) {
            throw new Exception("Controller file not found: $controllerFile");
        }

        require_once $controllerFile;
        
        if (!class_exists($controllerName)) {
            throw new Exception("Controller class not found: $controllerName");
        }

        $controller = new $controllerName();
        
        if (!method_exists($controller, $methodName)) {
            throw new Exception("Method not found: $controllerName::$methodName");
        }

        $controller->$methodName();
    }

    private function convertToPattern($routePath) {
        // Convert {id} to regex pattern
        $pattern = preg_replace('#\{(\w+)\}#', '([^/]+)', $routePath);
        return '#^' . $pattern . '$#';
    }

    private function extractParamNames($routePath) {
        preg_match_all('#\{(\w+)\}#', $routePath, $matches);
        return $matches[1] ?? [];
    }
}
?>
