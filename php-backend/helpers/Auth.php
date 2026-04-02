<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/Response.php';

class Auth {

    /**
     * Hash a password using PHP's built-in bcrypt (password_hash).
     */
    public static function hashPassword(string $password): string {
        return password_hash($password, PASSWORD_DEFAULT);
    }

    /**
     * Verify a plain password against a stored hash.
     */
    public static function verifyPassword(string $supplied, string $stored): bool {
        if (str_starts_with($stored, '$2')) {
            return password_verify($supplied, $stored);
        }
        if (substr_count($stored, '.') === 1) {
            return false; // scrypt not supported
        }
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
        if (in_array(($user['role'] ?? ''), $adminRoles, true)) {
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

        $role = $user['role'] ?? 'employee';
        $defaults = $base[$role] ?? $base['employee'];

        $customRaw = $user['custom_permissions'] ?? ($user['customPermissions'] ?? []);
        $custom = [];
        if (!empty($customRaw)) {
            $custom = is_array($customRaw) ? $customRaw : (json_decode($customRaw, true) ?? []);
        }

        return array_unique(array_merge($defaults, $custom));
    }

    public static function hasPermission(array $user, string $permission): bool {
        $perms = self::getPermissions($user);
        return in_array('all', $perms, true) || in_array($permission, $perms, true);
    }

    /**
     * Map all snake_case keys in an array (or list of arrays) to camelCase.
     */
    public static function camelize(array $data): array {
        if (empty($data)) return [];
        
        // Handle list of objects
        if (isset($data[0]) && is_array($data[0])) {
            return array_map([self::class, 'camelize'], $data);
        }

        $sanitized = [];
        foreach ($data as $key => $value) {
            $camelKey = str_replace(' ', '', lcfirst(ucwords(str_replace('_', ' ', (string)$key))));
            
            // Explicitly cast common ID fields to integer for strict comparison in React
            if ($camelKey === 'id' || str_ends_with($camelKey, 'Id') || str_ends_with($camelKey, 'ID')) {
                if ($value !== null && is_numeric($value)) { $value = (int)$value; }
            }
            
            // Cast boolean flags
            if (str_ends_with($camelKey, 'Applicable') || $camelKey === 'isActive' || $camelKey === 'isRead') {
                $value = $value !== null ? (bool)$value : false;
            }
            
            $sanitized[$camelKey] = $value;
        }
        return $sanitized;
    }

    /**
     * Remove sensitive fields from user array and map to camelCase.
     */
    public static function sanitizeUser(array $user): array {
        unset($user['password']);
        $sanitized = self::camelize($user);
        
        // Ensure critical fields match the expected types and defaults
        if (isset($sanitized['customPermissions']) && is_string($sanitized['customPermissions'])) {
            $sanitized['customPermissions'] = json_decode($sanitized['customPermissions'], true) ?? [];
        }
        if (isset($sanitized['documents']) && is_string($sanitized['documents'])) {
            $sanitized['documents'] = json_decode($sanitized['documents'], true) ?? [];
        }

        $stringFields = ['firstName', 'lastName', 'username', 'email', 'role', 'position', 'employeeId', 'workLocation'];
        foreach ($stringFields as $field) {
            $sanitized[$field] = (string)($sanitized[$field] ?? '');
        }

        if (empty($sanitized['role'])) $sanitized['role'] = 'employee';
        if (!isset($sanitized['customPermissions']) || !is_array($sanitized['customPermissions'])) $sanitized['customPermissions'] = [];
        if (!isset($sanitized['documents']) || !is_array($sanitized['documents'])) $sanitized['documents'] = [];

        return $sanitized;
    }

    private static function startSession(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_name('hrconnect_session');
            session_set_cookie_params(['lifetime' => 86400, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
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
