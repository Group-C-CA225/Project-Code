<?php
// Function to simulate AI Grading (or call external API)
function gradeAnswerAI($questionType, $modelAnswer, $studentAnswer) {
    
    // 1. Exact Match for Objective Questions
    if ($questionType === 'MCQ' || $questionType === 'TRUE_FALSE') {
        if (trim(strtolower($modelAnswer)) === trim(strtolower($studentAnswer))) {
            return ['score' => 10, 'feedback' => 'Correct choice.'];
        } else {
            return ['score' => 0, 'feedback' => 'Incorrect choice.'];
        }
    }

    // 2. Semantic Analysis for Written Answers (Mocked Logic)
    // In production, replace this with an OpenAI/Gemini API call.
    
    // Simple keyword matching algorithm for demo purposes
    $keywords = explode(' ', strtolower($modelAnswer));
    $matches = 0;
    $studentWords = strtolower($studentAnswer);

    foreach ($keywords as $word) {
        if (strlen($word) > 3 && strpos($studentWords, $word) !== false) {
            $matches++;
        }
    }

    $accuracy = ($matches / count($keywords)) * 100;
    
    if ($accuracy > 80) {
        return ['score' => 10, 'feedback' => 'Excellent explanation, matches model answer concepts.'];
    } elseif ($accuracy > 40) {
        return ['score' => 5, 'feedback' => 'Partially correct, but missing key details.'];
    } else {
        return ['score' => 0, 'feedback' => 'Answer does not align with the model answer.'];
    }
}

// Example pseudocode for real AI integration
$payload = [
    "model" => "gpt-4",
    "messages" => [
        ["role" => "system", "content" => "You are a strict teacher grading an exam."],
        ["role" => "user", "content" => "Question: $q. Student Answer: $a. Model Answer: $m. Rate 0-10 and give feedback."]
    ]
];
// ... execute curl ...


?>