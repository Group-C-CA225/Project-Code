<?php
class AIService {
    private $apiKey;
    private $apiUrl = "https://api.openai.com/v1/chat/completions"; // Or Google Gemini Endpoint

    public function __construct() {
        // Load environment variables from .env file
        $this->loadEnv();
        
        // Get API key from environment variable
        $this->apiKey = getenv('OPENAI_API_KEY') ?: '';
    }
    
    private function loadEnv() {
        $envFile = __DIR__ . '/../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                list($key, $value) = explode('=', $line, 2);
                putenv(trim($key) . '=' . trim($value));
            }
        }
    }

    public function gradeWrittenAnswer($questionText, $modelAnswer, $studentAnswer) {
        // If answer is too short, auto-fail to save API costs
        if (strlen(trim($studentAnswer)) < 5) {
            return ["score" => 0, "feedback" => "Answer too short or empty."];
        }

        // If API key not configured, use simple similarity check
        if (empty($this->apiKey) || $this->apiKey === "YOUR_API_KEY_HERE") {
            return $this->fallbackGrading($modelAnswer, $studentAnswer);
        }

        // Escape JSON special characters in inputs
        $questionTextEscaped = addslashes($questionText);
        $modelAnswerEscaped = addslashes($modelAnswer);
        $studentAnswerEscaped = addslashes($studentAnswer);

        $prompt = "
You are a fair and understanding academic grader. Evaluate a student's written answer by focusing on CONCEPTUAL UNDERSTANDING and MEANING, not exact word matching.

CRITICAL GRADING PRINCIPLES:
- ACCEPT answers that demonstrate understanding of the core concepts, even if phrased differently
- Use CONCEPTUAL MATCHING: Does the student understand the main ideas? If yes, score 70-100
- Accept different phrasings, word choices, and ways of explaining the same concept
- Look for KEY CONCEPTS being addressed, not exact word-for-word matching
- Ignore grammar mistakes, typos, and informal language if meaning is clear
- If student shows understanding but explains it differently, give FULL or HIGH credit (80-100)
- Only give LOW scores (0-40) if the answer is clearly wrong, off-topic, or shows no understanding
- For PARTIALLY correct answers that show some understanding, give 50-70 points

Question: {$questionTextEscaped}

Model Answer (Expected Response): {$modelAnswerEscaped}

Student Answer: {$studentAnswerEscaped}

GRADING INSTRUCTIONS:
1. Analyze if the student's answer demonstrates UNDERSTANDING of the key concepts in the model answer
2. If the concepts match (even with different wording), score 80-100
3. If mostly correct with minor omissions, score 70-79
4. If partially correct, score 50-69
5. Only score below 50 if the answer is incorrect or shows little/no understanding

IMPORTANT: Be GENEROUS. If the student's answer shows they understand the concepts, even if worded differently, give a HIGH score (80-100).

Return ONLY valid JSON (no markdown, no code blocks):
{
    \"score\": 85,
    \"feedback\": \"Your answer demonstrates good understanding of the concept.\"
}
        ";

        $data = [
            "model" => "gpt-4o-mini", // Use a cheaper/faster model
            "messages" => [
                ["role" => "system", "content" => "You are a JSON-only API. Do not output markdown."],
                ["role" => "user", "content" => $prompt]
            ],
            "temperature" => 0.5 // Medium temperature = balanced between consistency and understanding flexibility
        ];

        $ch = curl_init($this->apiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Content-Type: application/json",
            "Authorization: Bearer " . $this->apiKey
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $response = curl_exec($ch);
        
        if (curl_errno($ch)) {
            error_log("AI Grading Error: " . curl_error($ch));
            curl_close($ch);
            return $this->fallbackGrading($modelAnswer, $studentAnswer);
        }
        curl_close($ch);

        // Parse Response
        $result = json_decode($response, true);
        
        // Check for API errors
        if (isset($result['error'])) {
            error_log("OpenAI API Error: " . json_encode($result['error']));
            return $this->fallbackGrading($modelAnswer, $studentAnswer);
        }
        
        $aiContent = $result['choices'][0]['message']['content'] ?? '{}';
        
        // Clean markdown if AI adds it (e.g. ```json ... ```)
        $aiContent = str_replace(['```json', '```'], '', $aiContent);
        
        $grading = json_decode($aiContent, true);
        
        // Validate response
        if (!isset($grading['score']) || !isset($grading['feedback'])) {
            error_log("Invalid AI response format: " . $aiContent);
            return $this->fallbackGrading($modelAnswer, $studentAnswer);
        }
        
        return $grading;
    }

    // Fallback grading when AI is not available
    private function fallbackGrading($modelAnswer, $studentAnswer) {
        $model = strtolower(trim($modelAnswer));
        $student = strtolower(trim($studentAnswer));
        
        // Exact match
        if ($model === $student) {
            return ["score" => 100, "feedback" => "Perfect match!"];
        }
        
        // Check if student answer contains all key words from model answer
        $modelWords = preg_split('/\s+/', $model);
        $matchCount = 0;
        
        foreach ($modelWords as $word) {
            if (strlen($word) > 3 && stripos($student, $word) !== false) {
                $matchCount++;
            }
        }
        
        $similarity = count($modelWords) > 0 ? ($matchCount / count($modelWords)) * 100 : 0;
        
        if ($similarity >= 80) {
            return ["score" => 90, "feedback" => "Good answer! Contains most key concepts."];
        } elseif ($similarity >= 50) {
            return ["score" => 70, "feedback" => "Partially correct. Some key concepts are present."];
        } elseif ($similarity >= 30) {
            return ["score" => 40, "feedback" => "Answer is incomplete or missing key concepts."];
        } else {
            return ["score" => 10, "feedback" => "Answer does not match the expected response."];
        }
    }
}
?>