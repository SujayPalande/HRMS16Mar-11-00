<?php
require_once __DIR__ . '/../config/database.php';

/**
 * Simple SMTP mailer using PHP's built-in stream sockets.
 * No external library required. For production with complex needs,
 * drop in PHPMailer/SwiftMailer instead.
 */
class Mail {

    public static function send(array $opts): bool {
        // $opts: to, subject, html, text (optional)
        if (empty(SMTP_USER) || empty(SMTP_PASS)) {
            error_log('[Mail] SMTP credentials not configured — email skipped.');
            return false;
        }
        try {
            return self::smtpSend($opts);
        } catch (Throwable $e) {
            error_log('[Mail] Failed to send email: ' . $e->getMessage());
            return false;
        }
    }

    private static function smtpSend(array $opts): bool {
        $host    = SMTP_HOST;
        $port    = (int)SMTP_PORT;
        $secure  = strtolower(SMTP_SECURE); // tls or ssl
        $user    = SMTP_USER;
        $pass    = SMTP_PASS;
        $from    = SMTP_FROM    ?: $user;
        $fromName = SMTP_FROM_NAME ?: 'HR Connect';
        $to      = $opts['to'];
        $subject = $opts['subject'] ?? 'HR Connect Notification';
        $html    = $opts['html']    ?? '';
        $text    = $opts['text']    ?? strip_tags($html);

        $boundary = '----=_Part_' . md5(uniqid());

        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";
        $headers .= "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$from}>\r\n";
        $headers .= "To: {$to}\r\n";
        $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
        $headers .= "Date: " . date('r') . "\r\n";

        $body  = "--{$boundary}\r\n";
        $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body .= chunk_split(base64_encode($text)) . "\r\n";
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body .= chunk_split(base64_encode($html)) . "\r\n";
        $body .= "--{$boundary}--\r\n";

        $errno = 0; $errstr = '';
        $socketHost = ($secure === 'ssl') ? "ssl://{$host}" : $host;
        $sock = fsockopen($socketHost, $port, $errno, $errstr, 10);
        if (!$sock) throw new RuntimeException("Cannot connect to SMTP: {$errstr}");

        $read = function() use ($sock) {
            $res = '';
            while (!feof($sock)) {
                $line = fgets($sock, 1024);
                $res .= $line;
                if (isset($line[3]) && $line[3] === ' ') break;
            }
            return $res;
        };
        $cmd = function(string $c) use ($sock, $read) {
            fputs($sock, $c . "\r\n");
            return $read();
        };

        $read(); // banner
        $cmd("EHLO " . gethostname());
        if ($secure === 'tls') {
            $cmd("STARTTLS");
            stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            $cmd("EHLO " . gethostname());
        }
        $cmd("AUTH LOGIN");
        $cmd(base64_encode($user));
        $cmd(base64_encode($pass));
        $cmd("MAIL FROM: <{$from}>");
        $cmd("RCPT TO: <{$to}>");
        $cmd("DATA");
        fputs($sock, $headers . "\r\n" . $body . "\r\n.\r\n");
        $res = $read();
        $cmd("QUIT");
        fclose($sock);

        return str_starts_with(trim($res), '2');
    }

    // ── Email templates ──────────────────────────────────────────────────────

    public static function invitationEmail(string $firstName, string $lastName, string $token): array {
        $url = APP_BASE_URL . '/invitation/' . $token;
        $html = <<<HTML
<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
  <div style="background:#0f766e;padding:30px;text-align:center">
    <h1 style="color:#fff;margin:0">HR Connect</h1>
    <p style="color:#99f6e4;margin:8px 0 0">You're invited!</p>
  </div>
  <div style="padding:30px">
    <h2>Hello {$firstName} {$lastName},</h2>
    <p>You have been invited to join <strong>HR Connect</strong>. Click the button below to set up your account.</p>
    <div style="text-align:center;margin:30px 0">
      <a href="{$url}" style="background:#0f766e;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;display:inline-block">Accept Invitation</a>
    </div>
    <p style="color:#666;font-size:13px">This invitation expires in 7 days. If you did not expect this email, you can safely ignore it.</p>
    <p style="color:#999;font-size:12px">Link: <a href="{$url}">{$url}</a></p>
  </div>
</div>
</body></html>
HTML;
        return ['subject' => 'You\'re Invited to HR Connect', 'html' => $html];
    }

    public static function registrationCompletionEmail(array $employee, array $inviteInfo, string $appName): array {
        $name   = $employee['firstName'] . ' ' . $employee['lastName'];
        $email  = $employee['email'];
        $date   = date('d M Y');
        $html   = <<<HTML
<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
  <div style="background:#0f766e;padding:30px;text-align:center">
    <h1 style="color:#fff;margin:0">{$appName}</h1>
    <p style="color:#99f6e4;margin:8px 0 0">New Employee Registration</p>
  </div>
  <div style="padding:30px">
    <h2>Registration Completed</h2>
    <p><strong>{$name}</strong> ({$email}) has completed their registration on {$date}.</p>
    <p>Invited by: {$inviteInfo['originalInviter']} ({$inviteInfo['inviterRole']})</p>
    <p>Please log in to HR Connect to review the new employee profile and complete onboarding.</p>
  </div>
</div>
</body></html>
HTML;
        return ['subject' => "New Employee Registration: {$name}", 'html' => $html];
    }
}
