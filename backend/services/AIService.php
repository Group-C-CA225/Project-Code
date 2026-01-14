<?php
class AIService {
    private $apiKey;
    private $apiUrl = "https://api.openai.com/v1/chat/completions"; // Or Google Gemini Endpoint

    public function __construct() {
        // Get API key from environment variable or use configured key
        $this->apiKey = getenv('OPENAI_API_KEY') ?: "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";
    }

    public function gradeWrittenAnswer($questionText, $modelAnswer, $studentAnswer) {
        // If answer is too short, auto-fail to save API costs
        if (strlen(trim($studentAnswer)) < 5) {
            return ["score" => 0, "feedback" => "Answer too short or empty."];
        }

        // If API key not configured, use simple similarity check
        if ($this->apiKey === "YOUR_API_KEY_HERE") {
            return $this->fallbackGrading($modelAnswer, $studentAnswer);
        }

        // Escape JSON special characters in inputs
        $questionTextEscaped = addslashes($questionText);
        $modelAnswerEscaped = addslashes($modelAnswer);
        $studentAnswerEscaped = addslashes($studentAnswer);

        $prompt = "
You are an intelligent academic grader. Your task is to evaluate a student's written answer against a model answer.

IMPORTANT GUIDELINES:
- Focus on MEANING and CONTENT, not exact word matching
- If the student's answer conveys the same meaning/concept as the model answer (even with different wording), it should receive a high score
- Consider synonyms, paraphrasing, and different ways of expressing the same idea
- Ignore minor spelling errors and typos if the meaning is clear
- The student answer may use different words but still be correct
- Rate accuracy from 0 to 100 based on how well the answer matches the model answer in meaning
- Provide clear, helpful feedback (1-2 sentences)

Question: {$questionTextEscaped}

Model Answer (Expected Response): {$modelAnswerEscaped}

Student Answer: {$studentAnswerEscaped}

Evaluate the student's answer. If it correctly addresses the question and conveys the same meaning as the model answer (even with different wording or minor typos), give it a high score. If it's partially correct, give partial credit. If it's incorrect or off-topic, give a low score.

Return ONLY valid JSON in this format (no markdown, no code blocks):
{
    \"score\": 85,
    \"feedback\": \"Your answer correctly explains the concept, though you used slightly different terminology.\"
}
        ";

        $data = [
            "model" => "gpt-4o-mini", // Use a cheaper/faster model
            "messages" => [
                ["role" => "system", "content" => "You are a JSON-only API. Do not output markdown."],
                ["role" => "user", "content" => $prompt]
            ],
            "temperature" => 0.3 // Low temperature = more consistent/strict grading
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