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
            $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->db_name, $this->username, $this->password);
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