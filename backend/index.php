<?php
// Prevent any implicit output
ob_start();

// Configuration
$allowed_origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://quizapp-swart-alpha.vercel.app'
];

// Get origin
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Handle CORS
if ($origin && in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $origin);
} else {
    // Default to the production frontend for security, or handle specific cases
    header("Access-Control-Allow-Origin: https://quizapp-swart-alpha.vercel.app");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400"); // Cache for 24 hours

// Handle Preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Clear buffer just in case
    ob_clean();
    http_response_code(200);
    exit();
}

// Set Content-Type
header("Content-Type: application/json; charset=UTF-8");

// Flush low-level buffer
ob_end_clean();

// Load Dependencies
require_once 'config/Database.php';
require_once 'core/Router.php';

// Define Routes
$router = new Router();

// Auth Routes
$router->post('/api/teacher/register', 'AuthController@register');
$router->post('/api/verify-email', 'AuthController@verifyEmail');
$router->post('/api/teacher/login', 'AuthController@login');
$router->get('/api/teacher/profile', 'AuthController@getProfile');
$router->put('/api/teacher/profile', 'AuthController@updateProfile');
$router->post('/api/teacher/change-password', 'AuthController@changePassword');

// Quiz Routes (Protected)
$router->post('/api/quiz/create', 'QuizController@create');
$router->get('/api/quiz/list', 'QuizController@list');
$router->get('/api/quiz/{id}', 'QuizController@getQuiz');
$router->put('/api/quiz/{id}', 'QuizController@update');
$router->delete('/api/quiz/{id}', 'QuizController@delete');
$router->post('/api/quiz/{id}/duplicate', 'QuizController@duplicate');
$router->post('/api/quiz/toggle-status', 'QuizController@toggleStatus');
$router->post('/api/quiz/schedule', 'QuizController@schedule');

// Quiz Question Routes (Protected)
$router->get('/api/quiz/{id}/questions', 'QuizController@getQuestions');
$router->post('/api/quiz/{id}/questions', 'QuizController@addQuestion');
$router->put('/api/quiz/{id}/questions/{questionId}', 'QuizController@updateQuestion');
$router->delete('/api/quiz/{id}/questions/{questionId}', 'QuizController@deleteQuestion');

// Analytics & Exam Routes
$router->get('/api/analytics/dashboard', 'AnalyticsController@getDashboardStats');
$router->get('/api/analytics/quiz', 'AnalyticsController@getQuizDetails');
$router->post('/api/exam/submit', 'ExamController@submit');
$router->get('/api/exam/start', 'ExamController@start');
$router->get('/api/exam/check-submission', 'ExamController@checkSubmission');
$router->get('/api/exam/results', 'ExamController@getResults');
$router->get('/api/students/list', 'AnalyticsController@getStudentsList');
$router->get('/api/submissions/list', 'AnalyticsController@getSubmissionsList');

// Real-time Monitoring Routes
$router->post('/api/realtime/session/start', 'RealtimeController@startSession');
$router->post('/api/realtime/session/update', 'RealtimeController@updateSession');
$router->post('/api/realtime/session/end', 'RealtimeController@endSession');
$router->post('/api/realtime/session/violation', 'RealtimeController@reportViolation');
$router->get('/api/realtime/monitor', 'RealtimeController@getQuizMonitoring');
$router->post('/api/realtime/cleanup', 'RealtimeController@cleanupSessions');
$router->post('/api/realtime/control', 'RealtimeController@controlExam');

// Run the router
$router->dispatch();
?>