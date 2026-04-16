<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Mail.php';

class EmployeeController {

    public function index(array $user): void {
        $db   = getDB();
        $sql  = 'SELECT u.*, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id=u.department_id';
        $params = [];
        $where = [];

        if ($user['role'] !== 'developer') {
            $where[] = "u.role != ?";
            $params[] = 'developer';
        }

        // HR and manager: scope to their own unit only
        $authorizedUnit = Auth::getAuthorizedUnitId($user);
        if ($authorizedUnit !== null) {
            if ($authorizedUnit === false) {
                // Restricted role but no unit assigned? Can only see self (optional fallback)
                $where[] = "u.id = ?";
                $params[] = $user['id'];
            } else {
                $where[] = "d.unit_id = ?";
                $params[] = $authorizedUnit;
            }
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY u.id';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        Response::json(array_map([Auth::class, 'sanitizeUser'], $rows));
    }

    public function show(array $user, int $id): void {
        $db   = getDB();
        $stmt = $db->prepare('SELECT u.*, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id=u.department_id WHERE u.id=? LIMIT 1');
        $stmt->execute([$id]);
        $emp  = $stmt->fetch();
        if (!$emp) Response::notFound('Employee not found');
        if ($emp['role'] === 'developer' && $user['role'] !== 'developer') Response::notFound('Employee not found');
        Response::json(Auth::sanitizeUser($emp));
    }

    public function create(array $user, array $body): void {
        Auth::requireRole($user, ['admin', 'hr', 'developer']);
        $db = getDB();

        $required = ['username', 'email', 'firstName', 'lastName'];
        foreach ($required as $f) {
            if (empty($body[$f])) Response::error("Field '{$f}' is required");
        }

        $dup = $db->prepare('SELECT id FROM users WHERE username=? OR email=? LIMIT 1');
        $dup->execute([$body['username'], $body['email']]);
        if ($dup->fetch()) Response::error('Username or email already exists');

        $hash = Auth::hashPassword($body['password'] ?? 'Welcome@123');
        $id   = $this->insertUser($body, $hash);
        $stmt = $db->prepare('SELECT u.*, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id=u.department_id WHERE u.id=? LIMIT 1');
        $stmt->execute([$id]);
        Response::json(Auth::sanitizeUser($stmt->fetch()), 201);
    }

    public function update(array $user, int $id, array $body): void {
        $canUpdate = $user['id'] === $id || in_array($user['role'], ['admin','hr','manager','developer']);
        if (!$canUpdate) Response::forbidden('Access denied');

        unset($body['password'], $body['id']);
        $db = getDB();
        $this->doUpdate($id, $body, $db);
        $stmt = $db->prepare('SELECT u.*, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id=u.department_id WHERE u.id=? LIMIT 1');
        $stmt->execute([$id]);
        $emp = $stmt->fetch();
        if (!$emp) Response::notFound('Employee not found');
        Response::json(Auth::sanitizeUser($emp));
    }

    public function delete(array $user, int $id): void {
        Auth::requireRole($user, ['admin', 'hr', 'developer']);
        $db   = getDB();
        $stmt = $db->prepare('DELETE FROM users WHERE id=?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) Response::notFound('Employee not found');
        Response::noContent();
    }

    public function leaveBalance(array $user, int $id): void {
        $canAccess = $user['id'] === $id || in_array($user['role'], ['hr','admin','manager','developer']);
        if (!$canAccess) Response::forbidden('Access denied');

        $db = getDB();
        $emp = $db->prepare('SELECT id FROM users WHERE id=? LIMIT 1');
        $emp->execute([$id]);
        if (!$emp->fetch()) Response::notFound('Employee not found');

        Response::json($this->calculateLeaveBalance($id, $db));
    }

    public function allLeaveBalances(array $user): void {
        if (!in_array($user['role'], ['admin','hr','developer'])) Response::forbidden();
        $db    = getDB();
        $emps  = $db->query("SELECT id FROM users WHERE is_active=1 AND role!='developer'")->fetchAll();
        $result = [];
        foreach ($emps as $emp) {
            $result[$emp['id']] = $this->calculateLeaveBalance($emp['id'], $db);
        }
        Response::json($result);
    }

    public function changePassword(array $user, array $body): void {
        $current = $body['currentPassword'] ?? '';
        $new     = $body['newPassword']     ?? '';
        if (!$current || !$new) Response::error('Current and new passwords are required');

        $db   = getDB();
        $stmt = $db->prepare('SELECT password FROM users WHERE id=? LIMIT 1');
        $stmt->execute([$user['id']]);
        $row  = $stmt->fetch();
        if (!$row) Response::notFound('User not found');

        if (!Auth::verifyPassword($current, $row['password'])) {
            Response::error('Current password is incorrect');
        }

        $hash = Auth::hashPassword($new);
        $db->prepare('UPDATE users SET password=? WHERE id=?')->execute([$hash, $user['id']]);
        Response::json(['message' => 'Password changed successfully']);
    }

    public function updatePermissions(array $user, array $body): void {
        if ($user['role'] !== 'admin') Response::forbidden('Only admin users can modify permissions');
        $userId = (int)($body['userId'] ?? 0);
        $role   = $body['role'] ?? '';
        if (!$userId || !$role) Response::error('userId and role are required');

        $db   = getDB();
        $perms = json_encode($body['customPermissions'] ?? []);
        $db->prepare('UPDATE users SET role=?, custom_permissions=? WHERE id=?')->execute([$role, $perms, $userId]);
        $stmt = $db->prepare('SELECT u.*, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id=u.department_id WHERE u.id=? LIMIT 1');
        $stmt->execute([$userId]);
        Response::json(Auth::sanitizeUser($stmt->fetch()));
    }

    public function byDepartment(array $user, int $deptId): void {
        $db   = getDB();
        $sql  = 'SELECT u.*, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id=u.department_id WHERE u.department_id=?';
        $params = [$deptId];
        if ($user['role'] !== 'developer') {
            $sql .= ' AND u.role != ?';
            $params[] = 'developer';
        }
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::json(array_map([Auth::class, 'sanitizeUser'], $stmt->fetchAll()));
    }

    public function invite(array $user, array $body): void {
        if (!in_array($user['role'], ['hr','admin'])) Response::forbidden('Only HR and admin can send invitations');
        $firstName = trim($body['firstName'] ?? '');
        $lastName  = trim($body['lastName']  ?? '');
        $email     = trim($body['email']     ?? '');
        if (!$firstName || !$lastName || !$email) Response::error('First name, last name, and email are required');

        $db  = getDB();
        $dup = $db->prepare('SELECT id FROM users WHERE email=? LIMIT 1');
        $dup->execute([$email]);
        if ($dup->fetch()) Response::error('A user with this email already exists');

        $token     = bin2hex(random_bytes(16));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+7 days'));

        $db->prepare(
            'INSERT INTO employee_invitations (token, email, first_name, last_name, invited_by_id, expires_at, created_at) VALUES (?,?,?,?,?,?,NOW())'
        )->execute([$token, $email, $firstName, $lastName, $user['id'], $expiresAt]);
        $invId = (int)$db->lastInsertId();

        $tpl      = Mail::invitationEmail($firstName, $lastName, $token);
        $tpl['to'] = $email;
        $sent     = Mail::send($tpl);

        Response::json([
            'message'       => $sent ? 'Invitation sent successfully' : 'Invitation created (email delivery failed)',
            'invitation'    => ['id'=>$invId,'email'=>$email,'firstName'=>$firstName,'lastName'=>$lastName,'expiresAt'=>$expiresAt,
                                'invitationUrl' => APP_BASE_URL . '/invitation/' . $token],
            'emailSent'     => $sent
        ], 201);
    }

    public function getInvitation(string $token): void {
        $db   = getDB();
        $stmt = $db->prepare('SELECT * FROM employee_invitations WHERE token=? LIMIT 1');
        $stmt->execute([$token]);
        $inv  = $stmt->fetch();
        if (!$inv) Response::notFound('Invitation not found');
        if (strtotime($inv['expires_at']) < time()) Response::error('Invitation has expired');
        if ($inv['used_at']) Response::error('Invitation has already been used');
        Response::json([
            'firstName' => $inv['first_name'],
            'lastName'  => $inv['last_name'],
            'email'     => $inv['email'],
            'expiresAt' => $inv['expires_at']
        ]);
    }

    public function acceptInvitation(string $token, array $body): void {
        $firstName = trim($body['firstName'] ?? '');
        $lastName  = trim($body['lastName']  ?? '');
        $password  = $body['password'] ?? '';
        if (!$firstName || !$lastName || !$password) Response::error('First name, last name, and password are required');

        $db   = getDB();
        $stmt = $db->prepare('SELECT * FROM employee_invitations WHERE token=? LIMIT 1');
        $stmt->execute([$token]);
        $inv  = $stmt->fetch();
        if (!$inv) Response::notFound('Invitation not found');
        if (strtotime($inv['expires_at']) < time()) Response::error('Invitation has expired');
        if ($inv['used_at']) Response::error('Invitation has already been used');

        $dupEmail = $db->prepare('SELECT id FROM users WHERE email=? LIMIT 1');
        $dupEmail->execute([$inv['email']]);
        if ($dupEmail->fetch()) Response::error('User with this email already exists');

        $hash = Auth::hashPassword($password);
        $id   = $this->insertUser([
            'username'   => $inv['email'],
            'email'      => $inv['email'],
            'firstName'  => $firstName,
            'lastName'   => $lastName,
            'role'       => 'employee',
            'status'     => 'invited',
            'position'   => 'Employee',
        ], $hash);

        $db->prepare('UPDATE employee_invitations SET used_at=NOW() WHERE id=?')->execute([$inv['id']]);

        // Notify active admins
        $inviterRow = null;
        if ($inv['invited_by_id']) {
            $iStmt = $db->prepare('SELECT * FROM users WHERE id=? LIMIT 1');
            $iStmt->execute([$inv['invited_by_id']]);
            $inviterRow = $iStmt->fetch();
        }
        $inviterName = $inviterRow ? "{$inviterRow['first_name']} {$inviterRow['last_name']}" : 'System Administrator';
        $inviterRole = $inviterRow ? ($inviterRow['role'] === 'hr' ? 'HR Manager' : 'Administrator') : 'Admin';

        $admins = $db->query("SELECT * FROM users WHERE (role='hr' OR role='admin') AND is_active=1")->fetchAll();
        foreach ($admins as $admin) {
            $tpl = Mail::registrationCompletionEmail(
                ['firstName'=>$firstName,'lastName'=>$lastName,'email'=>$inv['email']],
                ['originalInviter'=>$inviterName,'inviterRole'=>$inviterRole],
                'HR Connect'
            );
            $tpl['to'] = $admin['email'];
            Mail::send($tpl);
        }

        Response::json([
            'message' => 'Registration completed successfully',
            'user'    => ['id'=>$id,'firstName'=>$firstName,'lastName'=>$lastName,'email'=>$inv['email'],'role'=>'employee']
        ], 201);
    }

    public function updateProfile(array $user, array $body): void {
        $update = [];
        if (isset($body['firstName']))   $update['first_name']     = $body['firstName'];
        if (isset($body['lastName']))    $update['last_name']      = $body['lastName'];
        if (isset($body['email']))       $update['email']          = $body['email'];
        if (isset($body['phone']))       $update['phone_number']   = $body['phone'];
        if (isset($body['address']))     $update['address']        = $body['address'];
        if (isset($body['department']))  $update['department_id']  = (int)$body['department'];

        $db = getDB();
        $this->doUpdate($user['id'], $update, $db);
        $stmt = $db->prepare('SELECT u.*, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id=u.department_id WHERE u.id=? LIMIT 1');
        $stmt->execute([$user['id']]);
        Response::json(Auth::sanitizeUser($stmt->fetch()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function insertUser(array $data, string $hash): int {
        $db  = getDB();
        $map = [
            'username'          => $data['username']         ?? null,
            'email'             => $data['email']            ?? null,
            'password'          => $hash,
            'first_name'        => $data['firstName']        ?? ($data['first_name']  ?? ''),
            'last_name'         => $data['lastName']         ?? ($data['last_name']   ?? ''),
            'role'              => $data['role']             ?? 'employee',
            'status'            => $data['status']           ?? 'active',
            'department_id'     => $data['departmentId']     ?? ($data['department_id'] ?? null),
            'position'          => $data['position']         ?? null,
            'phone_number'      => $data['phoneNumber']      ?? null,
            'address'           => $data['address']          ?? null,
            'date_of_birth'     => $data['dateOfBirth']      ?? null,
            'gender'            => $data['gender']           ?? null,
            'photo_url'         => $data['photoUrl']         ?? null,
            'bank_name'         => $data['bankName']         ?? null,
            'bank_account_number' => $data['bankAccountNumber'] ?? null,
            'bank_ifsc_code'    => $data['bankIFSCCode']     ?? null,
            'bank_account_type' => $data['bankAccountType']  ?? null,
            'salary'            => isset($data['salary']) ? (int)$data['salary'] : null,
            'employee_id'       => $data['employeeId']       ?? null,
            'employment_type'   => $data['employmentType']   ?? 'permanent',
            'is_active'         => 1,
            'pf_applicable'     => 1,
            'esic_applicable'   => 1,
            'pt_applicable'     => 1,
            'custom_permissions'=> json_encode($data['customPermissions'] ?? []),
            'documents'         => json_encode($data['documents'] ?? []),
            'join_date'         => date('Y-m-d H:i:s'),
        ];
        $cols = implode(', ', array_keys($map));
        $phs  = implode(', ', array_fill(0, count($map), '?'));
        $stmt = $db->prepare("INSERT INTO users ({$cols}) VALUES ({$phs})");
        $stmt->execute(array_values($map));
        return (int)$db->lastInsertId();
    }

    private function doUpdate(int $id, array $data, PDO $db): void {
        // Map camelCase frontend keys to snake_case DB columns
        $colMap = [
            'firstName' => 'first_name', 'lastName' => 'last_name',
            'email' => 'email', 'phoneNumber' => 'phone_number',
            'address' => 'address', 'departmentId' => 'department_id',
            'position' => 'position', 'role' => 'role', 'status' => 'status',
            'salary' => 'salary', 'employeeId' => 'employee_id',
            'joinDate' => 'join_date', 'workLocation' => 'work_location',
            'reportingTo' => 'reporting_to', 'photoUrl' => 'photo_url',
            'gender' => 'gender', 'maritalStatus' => 'marital_status',
            'dateOfBirth' => 'date_of_birth', 'bankName' => 'bank_name',
            'bankAccountNumber' => 'bank_account_number', 'bankIFSCCode' => 'bank_ifsc_code',
            'bankAccountType' => 'bank_account_type', 'uanNumber' => 'uan_number',
            'esicNumber' => 'esic_number', 'aadhaarCard' => 'aadhaar_card',
            'panCard' => 'pan_card', 'employmentType' => 'employment_type',
            'pfApplicable' => 'pf_applicable', 'esicApplicable' => 'esic_applicable',
            'ptApplicable' => 'pt_applicable', 'incomeTaxApplicable' => 'income_tax_applicable',
            'mlwfApplicable' => 'mlwf_applicable', 'overtimeApplicable' => 'overtime_applicable',
            'bonusApplicable' => 'bonus_applicable', 'isActive' => 'is_active',
            'customPermissions' => 'custom_permissions', 'documents' => 'documents',
        ];

        $sets   = [];
        $values = [];
        foreach ($data as $key => $val) {
            $col = $colMap[$key] ?? $key; // fall back to snake_case as-is
            if ($col === 'custom_permissions' || $col === 'documents') {
                $val = is_array($val) ? json_encode($val) : $val;
            }
            $sets[]   = "`{$col}` = ?";
            $values[] = $val;
        }
        if (empty($sets)) return;
        $values[] = $id;
        $db->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE id=?')->execute($values);
    }

    private function calculateLeaveBalance(int $userId, PDO $db): array {
        $year  = (int)date('Y');
        $today = date('Y-m-d');

        // Accrual: 1.5 days/month from join date
        $empStmt = $db->prepare('SELECT join_date FROM users WHERE id=? LIMIT 1');
        $empStmt->execute([$userId]);
        $emp = $empStmt->fetch();
        $joinDate = $emp['join_date'] ? new DateTime($emp['join_date']) : new DateTime("{$year}-01-01");
        $yearStart = new DateTime("{$year}-01-01");
        $startCalc = $joinDate > $yearStart ? $joinDate : $yearStart;
        $now = new DateTime($today);
        $monthsWorked = max(0, ($now->format('Y') - $startCalc->format('Y')) * 12 + ($now->format('m') - $startCalc->format('m')));
        $accrued = $monthsWorked * 1.5;

        $takenStmt = $db->prepare(
            "SELECT COUNT(*) FROM leave_requests
             WHERE user_id=? AND status='approved' AND type NOT IN ('workfromhome','halfday')
             AND YEAR(start_date)=?"
        );
        $takenStmt->execute([$userId, $year]);
        $taken = (float)$takenStmt->fetchColumn();

        $pendingStmt = $db->prepare("SELECT COUNT(*) FROM leave_requests WHERE user_id=? AND status='pending' AND YEAR(start_date)=?");
        $pendingStmt->execute([$userId, $year]);
        $pending = (float)$pendingStmt->fetchColumn();

        return [
            'totalAccrued'     => round($accrued, 1),
            'totalTaken'       => $taken,
            'pendingRequests'  => $pending,
            'remainingBalance' => max(0, round($accrued - $taken, 1)),
            'accruedThisYear'  => round($accrued, 1),
            'takenThisYear'    => $taken,
        ];
    }
}
