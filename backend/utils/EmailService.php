<?php
// Simple SMTP Email Service without external dependencies
class EmailService {
    private $host;
    private $port;
    private $username;
    private $password;
    private $fromEmail;
    private $fromName;
    private $lastError = '';
    
    public function __construct() {
        $this->host = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
        $this->port = getenv('SMTP_PORT') ?: 587;
        $this->username = getenv('SMTP_USERNAME');
        $this->password = getenv('SMTP_PASSWORD');
        $this->fromEmail = getenv('SMTP_FROM_EMAIL');
        $this->fromName = getenv('SMTP_FROM_NAME') ?: 'Quiz Platform';
    }
    
    public function getLastError() {
        return $this->lastError;
    }
    
    public function sendEmail($to, $subject, $htmlBody) {
        if (empty($this->username) || empty($this->password)) {
            $this->lastError = "SMTP credentials not configured in .env file";
            error_log($this->lastError);
            return false;
        }
        
        try {
            // Connect to SMTP server
            $smtp = @fsockopen($this->host, $this->port, $errno, $errstr, 30);
            if (!$smtp) {
                $this->lastError = "Failed to connect to SMTP server: $errstr ($errno)";
                error_log($this->lastError);
                return false;
            }
            
            // Set timeout
            stream_set_timeout($smtp, 30);
            
            // Read server response
            $response = $this->getResponse($smtp);
            if (strpos($response, '220') === false) {
                $this->lastError = "SMTP connection failed: $response";
                fclose($smtp);
                return false;
            }
            
            // Send EHLO
            fputs($smtp, "EHLO " . $this->host . "\r\n");
            $response = $this->getResponse($smtp);
            
            // Start TLS
            fputs($smtp, "STARTTLS\r\n");
            $response = $this->getResponse($smtp);
            if (strpos($response, '220') === false) {
                $this->lastError = "STARTTLS failed: $response";
                fclose($smtp);
                return false;
            }
            
            // Enable crypto
            $crypto = @stream_socket_enable_crypto($smtp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            if (!$crypto) {
                $this->lastError = "Failed to enable TLS encryption";
                fclose($smtp);
                return false;
            }
            
            // Send EHLO again after TLS
            fputs($smtp, "EHLO " . $this->host . "\r\n");
            $this->getResponse($smtp);
            
            // Authenticate
            fputs($smtp, "AUTH LOGIN\r\n");
            $response = $this->getResponse($smtp);
            if (strpos($response, '334') === false) {
                $this->lastError = "AUTH LOGIN failed: $response";
                fclose($smtp);
                return false;
            }
            
            fputs($smtp, base64_encode($this->username) . "\r\n");
            $response = $this->getResponse($smtp);
            if (strpos($response, '334') === false) {
                $this->lastError = "Username authentication failed: $response";
                fclose($smtp);
                return false;
            }
            
            fputs($smtp, base64_encode($this->password) . "\r\n");
            $response = $this->getResponse($smtp);
            
            if (strpos($response, '235') === false) {
                $this->lastError = "Password authentication failed. Check your Gmail App Password: $response";
                fclose($smtp);
                return false;
            }
            
            // Send email
            fputs($smtp, "MAIL FROM: <{$this->fromEmail}>\r\n");
            $response = $this->getResponse($smtp);
            if (strpos($response, '250') === false) {
                $this->lastError = "MAIL FROM failed: $response";
                fclose($smtp);
                return false;
            }
            
            fputs($smtp, "RCPT TO: <{$to}>\r\n");
            $response = $this->getResponse($smtp);
            if (strpos($response, '250') === false) {
                $this->lastError = "RCPT TO failed: $response";
                fclose($smtp);
                return false;
            }
            
            fputs($smtp, "DATA\r\n");
            $response = $this->getResponse($smtp);
            if (strpos($response, '354') === false) {
                $this->lastError = "DATA command failed: $response";
                fclose($smtp);
                return false;
            }
            
            // Email headers and body
            $headers = "From: {$this->fromName} <{$this->fromEmail}>\r\n";
            $headers .= "To: <{$to}>\r\n";
            $headers .= "Subject: {$subject}\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $headers .= "\r\n";
            
            fputs($smtp, $headers . $htmlBody . "\r\n.\r\n");
            $response = $this->getResponse($smtp);
            if (strpos($response, '250') === false) {
                $this->lastError = "Email sending failed: $response";
                fclose($smtp);
                return false;
            }
            
            // Quit
            fputs($smtp, "QUIT\r\n");
            $this->getResponse($smtp);
            
            fclose($smtp);
            return true;
            
        } catch (Exception $e) {
            $this->lastError = "Exception: " . $e->getMessage();
            error_log("Email sending error: " . $this->lastError);
            return false;
        }
    }
    
    private function getResponse($smtp) {
        $response = '';
        while ($line = fgets($smtp, 515)) {
            $response .= $line;
            if (substr($line, 3, 1) == ' ') break;
        }
        return $response;
    }
}
