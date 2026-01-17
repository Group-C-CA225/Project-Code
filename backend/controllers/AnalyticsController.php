<?php
require_once 'config/Database.php';

class AnalyticsController {
    private $db;

    public function __construct() {
        $database = new Database();
        $this->db = $database->connect();
    }

    private function getAuthTeacherId() {
        $authHeader = null;
        
        // Method 1: getallheaders() - works on Apache with mod_php
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            $headers = array_change_key_case($headers, CASE_LOWER);
            if (isset($headers['authorization'])) {
                $authHeader = $headers['authorization'];
            }
        }
        
        // Method 2: apache_request_headers() - alternative Apache function
        if (!$authHeader && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $headers = array_change_key_case($headers, CASE_LOWER);
            if (isset($headers['authorization'])) {
                $authHeader = $headers['authorization'];
            }
        }
        
        // Method 3: $_SERVER variables (CGI/FastCGI)
        if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }
        
        // Method 4: REDIRECT_HTTP_AUTHORIZATION (mod_rewrite)
        if (!$authHeader && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }
        
        // Method 5: Check PHP_AUTH_USER/PHP_AUTH_PW for Basic auth (fallback)
        if (!$authHeader && isset($_SERVER['PHP_AUTH_USER'])) {
            $authHeader = 'Basic ' . base64_encode($_SERVER['PHP_AUTH_USER'] . ':' . ($_SERVER['PHP_AUTH_PW'] ?? ''));
        }
        
        if (!$authHeader) {
            http_response_code(401);
            echo json_encode([
                "success" => false,
                "message" => "Unauthorized - No token provided"
            ]);
            exit;
        }
        
        // Extract token from "Bearer <token>"
        $token = preg_replace('/^Bearer\s+/i', '', $authHeader);
        
        $stmt = $this->db->prepare("SELECT id FROM teachers WHERE api_token = :token");
        $stmt->execute([':token' => $token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(401);
            echo json_encode([
                "success" => false,
                "message" => "Invalid Token"
            ]);
            exit;
        }
        
        return $user['id'];
    }

    // GET /api/analytics/dashboard
    public function getDashboardStats() {
        $tid = $this->getAuthTeacherId();
        if(!$tid) {
            http_response_code(401);
            echo json_encode([
                "success" => false,
                "error" => "Unauthorized - Please login first"
            ]);
            return;
        }

        // 1. Total Students across all quizzes
        $sqlStudents = "SELECT COUNT(*) as total FROM students s 
                        JOIN quizzes q ON s.quiz_id = q.id 
                        WHERE q.teacher_id = :tid";
        $stmt = $this->db->prepare($sqlStudents);
        $stmt->execute([':tid' => $tid]);
        $totalStudents = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

        // 2. Average Score (only from submitted students)
        $sqlAvg = "SELECT AVG(final_score) as avg_score FROM students s 
                   JOIN quizzes q ON s.quiz_id = q.id 
                   WHERE q.teacher_id = :tid AND s.status = 'SUBMITTED' AND s.final_score IS NOT NULL";
        $stmt = $this->db->prepare($sqlAvg);
        $stmt->execute([':tid' => $tid]);
        $avgScore = $stmt->fetch(PDO::FETCH_ASSOC)['avg_score'];
        
        // Ensure avg_score is valid (between 0-100 or null)
        $avgScore = $avgScore !== null ? round(floatval($avgScore), 1) : 0;

        // 3. Recent Quizzes with Submission Counts (only SUBMITTED students count as attempts)
        $sqlRecent = "SELECT q.id, q.title, q.access_code, q.created_at, q.status, q.start_time, q.end_time, q.class, q.description,
                             (SELECT COUNT(*) FROM students WHERE quiz_id = q.id AND status = 'SUBMITTED') as attempt_count
                      FROM quizzes q 
                      WHERE q.teacher_id = :tid 
                      ORDER BY q.created_at DESC LIMIT 10";
        $stmt = $this->db->prepare($sqlRecent);
        $stmt->execute([':tid' => $tid]);
        $recent = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "total_students" => $totalStudents,
            "avg_score" => $avgScore,
            "recent_quizzes" => $recent
        ]);
    }

    // GET /api/analytics/quiz/:id
    public function getQuizDetails() {
        $tid = $this->getAuthTeacherId();
        $quiz_id = $_GET['id'];

        // Verify ownership
        $check = $this->db->prepare("SELECT id, title FROM quizzes WHERE id = :qid AND teacher_id = :tid");
        $check->execute([':qid' => $quiz_id, ':tid' => $tid]);
        if($check->rowCount() == 0) {
            http_response_code(403); 
            echo json_encode(["message" => "Unauthorized"]); 
            exit;
        }
        $quizParams = $check->fetch(PDO::FETCH_ASSOC);

        // Fetch Student Results
        $sql = "SELECT id, student_identifier, final_score, status, finished_at 
                FROM students WHERE quiz_id = :qid ORDER BY final_score DESC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':qid' => $quiz_id]);
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate Grade Distribution for Chart
        $distribution = ["A" => 0, "B" => 0, "C" => 0, "D" => 0, "F" => 0];
        foreach($students as $s) {
            $score = $s['final_score'];
            if($score >= 90) $distribution["A"]++;
            elseif($score >= 80) $distribution["B"]++;
            elseif($score >= 70) $distribution["C"]++;
            elseif($score >= 60) $distribution["D"]++;
            else $distribution["F"]++;
        }

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "quiz_title" => $quizParams['title'],
            "students" => $students,
            "distribution" => $distribution
        ]);
    }

    // GET /api/students/list
    public function getStudentsList() {
        $tid = $this->getAuthTeacherId();
        if(!$tid) {
            http_response_code(401);
            echo json_encode(["message" => "Unauthorized"]);
            return;
        }

        $sql = "SELECT s.id, s.student_identifier, s.student_class, s.quiz_id, 
                       COUNT(DISTINCT s.quiz_id) as quizzes_taken,
                       AVG(s.final_score) as avg_score
                FROM students s
                JOIN quizzes q ON s.quiz_id = q.id
                WHERE q.teacher_id = :tid AND s.status = 'SUBMITTED'
                GROUP BY s.student_identifier, s.student_class
                ORDER BY s.student_identifier";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':tid' => $tid]);
        $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Round avg_score
        foreach($students as &$student) {
            $student['avg_score'] = $student['avg_score'] ? round($student['avg_score'], 1) : null;
        }

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "students" => $students
        ]);
    }

    // GET /api/submissions/list
    public function getSubmissionsList() {
        $tid = $this->getAuthTeacherId();
        if(!$tid) {
            http_response_code(401);
            echo json_encode(["message" => "Unauthorized"]);
            return;
        }

        $sql = "SELECT s.id, s.student_identifier, q.title as quiz_title, 
                       s.final_score, s.status, s.finished_at
                FROM students s
                JOIN quizzes q ON s.quiz_id = q.id
                WHERE q.teacher_id = :tid
                ORDER BY s.finished_at DESC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':tid' => $tid]);
        $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "submissions" => $submissions
        ]);
    }
}
?>