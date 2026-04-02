<?php
// Database configuration for MySQL (SpeedCloud / IIS deployment)
// Edit these values to match your hosting environment

define('DB_HOST',     getenv('DB_HOST')     ?: 'localhost');
define('DB_PORT',     getenv('DB_PORT')     ?: '3306');
define('DB_NAME',     getenv('DB_NAME')     ?: 'hrconnect');
define('DB_USER',     getenv('DB_USER')     ?: 'root');
define('DB_PASS',     getenv('DB_PASS')     ?: '');
define('DB_CHARSET',  'utf8mb4');

// Session secret key — change this to a long random string in production
define('SESSION_SECRET', getenv('SESSION_SECRET') ?: 'hr-connect-secret-2024-change-me');

// Application base URL (used for invitation links)
define('APP_BASE_URL', getenv('APP_BASE_URL') ?: 'http://localhost');

// Email configuration (SMTP)
define('SMTP_HOST',     getenv('SMTP_HOST')     ?: 'smtp.gmail.com');
define('SMTP_PORT',     getenv('SMTP_PORT')     ?: 587);
define('SMTP_USER',     getenv('SMTP_USER')     ?: '');
define('SMTP_PASS',     getenv('SMTP_PASS')     ?: '');
define('SMTP_FROM',     getenv('SMTP_FROM')     ?: '');
define('SMTP_FROM_NAME', getenv('SMTP_FROM_NAME') ?: 'HR Connect');
define('SMTP_SECURE',   getenv('SMTP_SECURE')   ?: 'tls'); // tls or ssl

// Settings file path (JSON fallback when DB not used for settings)
define('SETTINGS_FILE', __DIR__ . '/../../data/system-settings.json');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
        );
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['message' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
    }
    return $pdo;
}
