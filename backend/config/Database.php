<?php
class Database {
    private $host = "localhost";
    private $db_name = "quiz_platform";
    private $username = "root";
    private $password = ""; // Change this
    public $conn;

    public function connect() {
        $this->conn = null;                 
        try {
            // Support Environment Variables for Production
            $host = getenv('DB_HOST') ?: $this->host;
            $db_name = getenv('DB_NAME') ?: $this->db_name;
            $username = getenv('DB_USERNAME') ?: $this->username;
            $password = getenv('DB_PASSWORD') ?: $this->password;

            $this->conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8mb4");
        } catch(PDOException $exception) {
            // Return JSON error instead of throwing exception
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'error' => 'Database connection failed',
                'details' => $exception->getMessage()
            ]);
            exit();
        }
        return $this->conn;
    }

    public function getConnection() {
        return $this->connect();
    }
}