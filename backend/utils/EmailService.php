<?php
class EmailService {
    private $lastError = '';
    
    public function sendEmail($to, $subject, $htmlBody) {
        // Get SMTP settings from environment
        $smtpHost = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
        $smtpPort = getenv('SMTP_PORT') ?: 587;
        $smtpUsername = getenv('SMTP_USERNAME') ?: '';
        $smtpPassword = getenv('SMTP_PASSWORD') ?: '';
        $fromEmail = getenv('SMTP_FROM_EMAIL') ?: $smtpUsername;
        $fromName = getenv('SMTP_FROM_NAME') ?: 'Quiz Platform';
        
        // Try SMTP first if configured
        if (!empty($smtpUsername) && !empty($smtpPassword)) {
            $smtpResult = $this->sendWithSMTP($to, $subject, $htmlBody, $smtpHost, $smtpPort, $smtpUsername, $smtpPassword, $fromEmail, $fromName);
            if ($smtpResult) {
                return true;
            }
            // If SMTP fails, log the error and try fallback
            error_log("SMTP failed: " . $this->lastError . ". Trying PHP mail() fallback.");
        }
        
        // Fallback to PHP mail()
        return $this->sendWithPHPMail($to, $subject, $htmlBody, $fromEmail, $fromName);
    }
    
    private function sendWithPHPMail($to, $subject, $htmlBody, $fromEmail, $fromName) {
        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            "From: {$fromName} <{$fromEmail}>",
            "Reply-To: {$fromEmail}",
            'X-Mailer: PHP/' . phpversion()
        ];
        
        $success = mail($to, $subject, $htmlBody, implode("\r\n", $headers));
        
        if (!$success) {
            $this->lastError = 'PHP mail() function failed';
        }
        
        return $success;
    }
    
    private function sendWithSMTP($to, $subject, $htmlBody, $host, $port, $username, $password, $fromEmail, $fromName) {
        // Simple SMTP implementation without external dependencies
        $socket = fsockopen($host, $port, $errno, $errstr, 30);
        
        if (!$socket) {
            $this->lastError = "Failed to connect to SMTP server: {$errstr} ({$errno})";
            return false;
        }
        
        // Read initial response
        $response = fgets($socket, 512);
        if (substr($response, 0, 3) != '220') {
            $this->lastError = "SMTP server not ready: {$response}";
            fclose($socket);
            return false;
        }
        
        // EHLO
        fputs($socket, "EHLO " . ($_SERVER['HTTP_HOST'] ?? 'localhost') . "\r\n");
        
        // Read all EHLO responses (multi-line response)
        do {
            $response = fgets($socket, 512);
        } while (substr($response, 3, 1) == '-'); // Continue reading while response has continuation
        
        // STARTTLS
        fputs($socket, "STARTTLS\r\n");
        $response = fgets($socket, 512);
        if (substr($response, 0, 3) != '220') {
            $this->lastError = "STARTTLS failed: {$response}";
            fclose($socket);
            return false;
        }
        
        // Enable crypto
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            $this->lastError = "Failed to enable TLS encryption";
            fclose($socket);
            return false;
        }
        
        // EHLO again after TLS
        fputs($socket, "EHLO " . ($_SERVER['HTTP_HOST'] ?? 'localhost') . "\r\n");
        
        // Read all EHLO responses (multi-line response)
        do {
            $response = fgets($socket, 512);
        } while (substr($response, 3, 1) == '-'); // Continue reading while response has continuation
        
        // AUTH LOGIN
        fputs($socket, "AUTH LOGIN\r\n");
        $response = fgets($socket, 512);
        if (substr($response, 0, 3) != '334') {
            $this->lastError = "AUTH LOGIN failed: {$response}";
            fclose($socket);
            return false;
        }
        
        // Send username
        fputs($socket, base64_encode($username) . "\r\n");
        $response = fgets($socket, 512);
        if (substr($response, 0, 3) != '334') {
            $this->lastError = "Username authentication failed: {$response}";
            fclose($socket);
            return false;
        }
        
        // Send password
        fputs($socket, base64_encode($password) . "\r\n");
        $response = fgets($socket, 512);
        if (substr($response, 0, 3) != '235') {
            $this->lastError = "Password authentication failed: {$response}";
            fclose($socket);
            return false;
        }
        
        // MAIL FROM
        fputs($socket, "MAIL FROM: <{$fromEmail}>\r\n");
        $response = fgets($socket, 512);
        if (substr($response, 0, 3) != '250') {
            $this->lastError = "MAIL FROM failed: {$response}";
            fclose($socket);
            return false;
        }
        
        // RCPT TO
        fputs($socket, "RCPT TO: <{$to}>\r\n");
        $response = fgets($socket, 512);
        if (substr($response, 0, 3) != '250') {
            $this->lastError = "RCPT TO failed: {$response}";
            fclose($socket);
            return false;
        }
        
        // DATA
        fputs($socket, "DATA\r\n");
        $response = fgets($socket, 512);
        if (substr($response, 0, 3) != '354') {
            $this->lastError = "DATA command failed: {$response}";
            fclose($socket);
            return false;
        }
        
        // Email headers and body
        $email = "From: {$fromName} <{$fromEmail}>\r\n";
        $email .= "To: {$to}\r\n";
        $email .= "Subject: {$subject}\r\n";
        $email .= "MIME-Version: 1.0\r\n";
        $email .= "Content-Type: text/html; charset=UTF-8\r\n";
        $email .= "\r\n";
        $email .= $htmlBody;
        $email .= "\r\n.\r\n";
        
        fputs($socket, $email);
        $response = fgets($socket, 512);
        if (substr($response, 0, 3) != '250') {
            $this->lastError = "Email sending failed: {$response}";
            fclose($socket);
            return false;
        }
        
        // QUIT
        fputs($socket, "QUIT\r\n");
        fclose($socket);
        
        return true;
    }
    
    public function getLastError() {
        return $this->lastError;
    }
}