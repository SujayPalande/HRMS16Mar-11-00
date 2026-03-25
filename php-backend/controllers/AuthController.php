<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../helpers/Response.php';

class AuthController {

    public function login(array $body): void {
        $username = trim($body['username'] ?? '');
        $password = $body['password'] ?? '';

        if (!$username || !$password) {
            Response::error('Username and password are required');
        }

        $db   = getDB();
        $stmt = $db->prepare(
            'SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1 LIMIT 1'
        );
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch();

        if (!$user || !Auth::verifyPassword($password, $user['password'])) {
            Response::error('Invalid username or password', 401);
        }

        Auth::login($user['id']);

        // Login notification (non-developer users)
        if ($user['role'] !== 'developer') {
            $this->createNotification($user['id'], 'login', 'Successful Login',
                'You have successfully logged in at ' . date('d/m/Y'));

            if (in_array($user['role'], ['employee', 'manager'])) {
                $adminStmt = $db->query("SELECT id FROM users WHERE role='admin' AND is_active=1");
                foreach ($adminStmt->fetchAll() as $admin) {
                    $this->createNotification($admin['id'], 'login', 'Employee Login',
                        "{$user['first_name']} {$user['last_name']} ({$user['role']}) logged in at " . date('d/m/Y'),
                        $user['id']);
                }
            }
        }

        Response::json(Auth::sanitizeUser($user));
    }

    public function logout(array $user): void {
        if ($user['role'] !== 'developer') {
            $this->createNotification($user['id'], 'logout', 'Logged Out',
                'You have successfully logged out at ' . date('d/m/Y'));

            if (in_array($user['role'], ['employee', 'manager'])) {
                $db = getDB();
                $adminStmt = $db->query("SELECT id FROM users WHERE role='admin' AND is_active=1");
                foreach ($adminStmt->fetchAll() as $admin) {
                    $this->createNotification($admin['id'], 'logout', 'Employee Logout',
                        "{$user['first_name']} {$user['last_name']} ({$user['role']}) logged out at " . date('d/m/Y'),
                        $user['id']);
                }
            }
        }
        Auth::logout();
        Response::noContent();
    }

    public function register(array $body): void {
        $db = getDB();

        // Check employee limit
        $settings = $this->getSettings();
        $maxEmp   = $settings['systemLimits']['maxEmployees'] ?? 10;
        $count    = (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn();
        if ($count >= $maxEmp) {
            Response::error('Employee limit reached', 429, [
                'currentCount'  => $count,
                'maxEmployees'  => $maxEmp,
                'contactInfo'   => $settings['systemLimits'] ?? []
            ]);
        }

        $username = trim($body['username'] ?? '');
        $email    = trim($body['email']    ?? '');
        if (!$username || !$email) {
            Response::error('Username and email are required');
        }

        $dup = $db->prepare('SELECT id FROM users WHERE username=? OR email=? LIMIT 1');
        $dup->execute([$username, $email]);
        if ($dup->fetch()) {
            Response::error('Username or email already exists');
        }

        $hash = Auth::hashPassword($body['password'] ?? 'Welcome@123');
        $id   = $this->createUser([
            'username'   => $username,
            'email'      => $email,
            'password'   => $hash,
            'first_name' => $body['firstName']  ?? '',
            'last_name'  => $body['lastName']   ?? '',
            'role'       => $body['role']        ?? 'employee',
        ]);

        $stmt = $db->prepare('SELECT * FROM users WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        Auth::login($user['id']);
        Response::json(Auth::sanitizeUser($user), 201);
    }

    public function me(array $user): void {
        Response::json($user);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function createNotification(int $userId, string $type, string $title, string $message, ?int $relatedUserId = null): void {
        try {
            $db   = getDB();
            $stmt = $db->prepare(
                'INSERT INTO notifications (user_id, type, title, message, is_read, related_user_id, created_at)
                 VALUES (?, ?, ?, ?, 0, ?, NOW())'
            );
            $stmt->execute([$userId, $type, $title, $message, $relatedUserId]);
        } catch (Throwable $e) {
            error_log('[AuthController] Notification error: ' . $e->getMessage());
        }
    }

    private function createUser(array $data): int {
        $db   = getDB();
        $keys = array_keys($data);
        $cols = implode(', ', $keys);
        $phs  = implode(', ', array_fill(0, count($keys), '?'));
        $stmt = $db->prepare("INSERT INTO users ({$cols}) VALUES ({$phs})");
        $stmt->execute(array_values($data));
        return (int)$db->lastInsertId();
    }

    private function getSettings(): array {
        $file = SETTINGS_FILE;
        if (file_exists($file)) {
            return json_decode(file_get_contents($file), true) ?? [];
        }
        return ['systemLimits' => ['maxEmployees' => 10]];
    }
}
