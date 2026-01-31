<?php
class SimpleEmailService {
    private $lastError = '';
    
    public function sendEmail($to, $subject, $htmlBody) {
        // Get settings from environment
        $fromEmail = getenv('SMTP_FROM_EMAIL') ?: getenv('SMTP_USERNAME') ?: 'noreply@quizplatform.com';
        $fromName = getenv('SMTP_FROM_NAME') ?: 'Quiz Platform';
        
        // Simple headers for HTML email
        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            "From: {$fromName} <{$fromEmail}>",
            "Reply-To: {$fromEmail}",
            'X-Mailer: PHP/' . phpversion()
        ];
        
        // Try to send with PHP mail()
        $success = mail($to, $subject, $htmlBody, implode("\r\n", $headers));
        
        if (!$success) {
            $this->lastError = 'PHP mail() function failed. Check server mail configuration.';
        }
        
        return $success;
    }
    
    public function getLastError() {
        return $this->lastError;
    }
}