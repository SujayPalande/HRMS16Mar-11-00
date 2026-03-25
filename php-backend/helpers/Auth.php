<?php
require_once __DIR__ . '/../config/database.php';

class Auth {

    /**
     * Hash a password using PHP's built-in bcrypt (password_hash).
     */
    public static function hashPassword(string $password): string {
        return password_hash($password, PASSWORD_DEFAULT);
    }

    /**
     * Verify a plain password against a stored hash.
     * Supports:
     *  - PHP bcrypt hashes (from password_hash)
     *  - Node.js scrypt hashes in the format  hex_hash.hex_salt
     */
    public static function verifyPassword(string $supplied, string $stored): bool {
        // bcrypt hash (starts with $2y$ or $2b$ or $argon2 etc)
        if (str_starts_with($stored, '$2')) {
            return password_verify($supplied, $stored);
        }

        // Node.js scrypt format: <64-byte-hex>.<16-byte-hex-salt>
        if (substr_count($stored, '.') === 1) {
            [$hashHex, $saltHex] = explode('.', $stored, 2);
            if (strlen($hashHex) === 128 && strlen($saltHex) === 32) {
                $derived = hash_hkdf('sha256', $supplied, 64, '', hex2bin($saltHex));
                // PHP doesn't have scrypt natively — we mark these as needing re-hash
                // Return false so user is prompted to change password on first login
                // Or uncomment the line below if you install a scrypt extension:
                // return hash_equals($hashHex, bin2hex(scrypt($supplied, hex2bin($saltHex), 16384, 8, 1, 64)));
                return false;
            }
        }

        // Fallback plain-text compare (legacy / initial setup only)
        return hash_equals($stored, $supplied);
    }

    /**
     * Return the current authenticated user from the session, or null.
     */
    public static function currentUser(): ?array {
        self::startSession();
        if (empty($_SESSION['user_id'])) {
            return null;
        }
        $db = getDB();
        $stmt = $db->prepare(
            'SELECT u.*, d.name AS department_name
             FROM users u
             LEFT JOIN departments d ON d.id = u.department_id
             WHERE u.id = ? AND u.is_active = 1 LIMIT 1'
        );
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        if (!$user) {
            unset($_SESSION['user_id']);
            return null;
        }
        return self::sanitizeUser($user);
    }

    /**
     * Require authentication. Sends 401 and exits if not logged in.
     */
    public static function requireAuth(): array {
        $user = self::currentUser();
        if (!$user) {
            Response::unauthorized();
        }
        return $user;
    }

    /**
     * Require a specific role (or array of roles).
     */
    public static function requireRole(array $user, $roles): void {
        $roles = (array)$roles;
        if (!in_array($user['role'], $roles, true)) {
            Response::forbidden('Insufficient permissions');
        }
    }

    /**
     * Get the effective permissions for a user.
     */
    public static function getPermissions(array $user): array {
        $adminRoles = ['admin', 'developer'];
        if (in_array($user['role'], $adminRoles, true)) {
            return ['all'];
        }

        $base = [
            'hr' => [
                'employees.view','employees.create','employees.edit',
                'departments.view','departments.create','departments.edit',
                'attendance.view','attendance.edit',
                'leave.view','leave.approve',
                'reports.view','roles.view',
                'payroll.view','payroll.process','payroll.edit'
            ],
            'manager' => [
                'employees.view','departments.view',
                'attendance.view','attendance.edit',
                'leave.view','leave.approve',
                'reports.view'
            ],
            'employee' => [
                'attendance.view','attendance.mark',
                'leave.view','leave.create',
                'payroll.view_own'
            ],
        ];

        $defaults = $base[$user['role']] ?? [];

        // Merge custom permissions stored as JSON array
        $custom = [];
        if (!empty($user['custom_permissions'])) {
            $custom = is_array($user['custom_permissions'])
                ? $user['custom_permissions']
                : json_decode($user['custom_permissions'], true) ?? [];
        }

        return array_unique(array_merge($defaults, $custom));
    }

    public static function hasPermission(array $user, string $permission): bool {
        $perms = self::getPermissions($user);
        return in_array('all', $perms, true) || in_array($permission, $perms, true);
    }

    /**
     * Remove sensitive fields from user array before returning to client.
     */
    public static function sanitizeUser(array $user): array {
        unset($user['password']);
        // Decode JSON fields
        if (isset($user['custom_permissions']) && is_string($user['custom_permissions'])) {
            $user['custom_permissions'] = json_decode($user['custom_permissions'], true) ?? [];
        }
        if (isset($user['documents']) && is_string($user['documents'])) {
            $user['documents'] = json_decode($user['documents'], true) ?? [];
        }
        return $user;
    }

    private static function startSession(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_name('hrconnect_session');
            session_set_cookie_params([
                'lifetime' => 86400,
                'path'     => '/',
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
            session_start();
        }
    }

    public static function login(int $userId): void {
        self::startSession();
        session_regenerate_id(true);
        $_SESSION['user_id'] = $userId;
    }

    public static function logout(): void {
        self::startSession();
        $_SESSION = [];
        session_destroy();
    }
}
