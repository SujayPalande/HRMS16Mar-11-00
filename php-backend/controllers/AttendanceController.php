<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../helpers/Response.php';

class AttendanceController {

    private function computeStatus(?string $checkIn, ?string $checkOut): string {
        if (!$checkIn) return 'absent';
        if (!$checkOut) return 'present';
        $hours = (strtotime($checkOut) - strtotime($checkIn)) / 3600;
        if ($hours >= 8)  return 'present';
        if ($hours >= 4)  return 'halfday';
        return 'absent';
    }

    public function index(array $user, array $query): void {
        $db        = getDB();
        $userId    = isset($query['userId']) ? (int)$query['userId'] : null;
        $date      = $query['date']  ?? null;
        $month     = $query['month'] ?? null;
        $role      = $user['role'];
        $currentId = $user['id'];

        $sql = "SELECT ar.* FROM attendance_records ar 
                JOIN users u ON u.id = ar.user_id 
                LEFT JOIN departments d ON d.id = u.department_id";
        $where = [];
        $params = [];

        // Multi-tenancy / Unit Isolation
        $authorizedUnit = Auth::getAuthorizedUnitId($user);
        if ($authorizedUnit !== null) {
            if ($authorizedUnit === false) {
                $where[] = "ar.user_id = ?";
                $params[] = $currentId;
            } else {
                $where[] = "d.unit_id = ?";
                $params[] = $authorizedUnit;
            }
        } elseif ($role === 'employee') {
            $where[] = "ar.user_id = ?";
            $params[] = $currentId;
        }

        // Filters
        if ($userId) {
            $where[] = "ar.user_id = ?";
            $params[] = $userId;
        }
        if ($date) {
            $where[] = "DATE(ar.date) = ?";
            $params[] = date('Y-m-d', strtotime($date));
        }
        if ($month) {
            $parts = explode('-', $month);
            if (count($parts) === 2) {
                $where[] = "YEAR(ar.date) = ? AND MONTH(ar.date) = ?";
                $params[] = (int)$parts[0];
                $params[] = (int)$parts[1];
            }
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY ar.date DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::json(Auth::camelize($stmt->fetchAll()));
    }

    public function create(array $user, array $body): void {
        $db        = getDB();
        $role      = $user['role'];
        $currentId = $user['id'];

        $userId      = isset($body['userId']) ? (int)$body['userId'] : $currentId;
        $checkIn     = $body['checkInTime']  ?? null;
        $checkOut    = $body['checkOutTime'] ?? null;
        $date        = $body['date']         ?? date('Y-m-d H:i:s');
        $notes       = $body['notes']        ?? '';

        if ($role === 'employee' && $userId !== $currentId) {
            Response::forbidden('You can only create your own attendance records');
        }
        
        // HR/Manager can only create for their unit
        $authorizedUnit = Auth::getAuthorizedUnitId($user);
        if ($authorizedUnit !== null) {
            if ($authorizedUnit === false && $userId !== $currentId) Response::forbidden();
            if ($authorizedUnit !== false) {
                $checkStmt = $db->prepare("SELECT d.unit_id FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.id=?");
                $checkStmt->execute([$userId]);
                if ($checkStmt->fetchColumn() != $authorizedUnit) Response::forbidden('Target employee is not in your authorized unit');
            }
        }

        $status = $this->computeStatus($checkIn, $checkOut);

        $stmt = $db->prepare(
            'INSERT INTO attendance_records (user_id, check_in_time, check_out_time, date, status, notes)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $checkIn, $checkOut, $date, $status, $notes]);
        $id   = (int)$db->lastInsertId();
        $row  = $db->prepare('SELECT * FROM attendance_records WHERE id=? LIMIT 1');
        $row->execute([$id]);
        Response::json(Auth::camelize($row->fetch()), 201);
    }

    public function update(array $user, int $id, array $body): void {
        if (!in_array($user['role'], ['admin','hr','manager','developer'])) {
            Response::forbidden('Insufficient permissions to edit attendance records');
        }
        $db  = getDB();
        
        // Check unit access
        $authorizedUnit = Auth::getAuthorizedUnitId($user);
        if ($authorizedUnit !== null) {
            $checkStmt = $db->prepare("SELECT d.unit_id FROM attendance_records ar JOIN users u ON u.id = ar.user_id JOIN departments d ON d.id = u.department_id WHERE ar.id=?");
            $checkStmt->execute([$id]);
            $unitId = $checkStmt->fetchColumn();
            if ($unitId != $authorizedUnit) Response::forbidden('This record belongs to an employee outside your unit');
        }

        $cur = $db->prepare('SELECT * FROM attendance_records WHERE id=? LIMIT 1');
        $cur->execute([$id]);
        $existing = $cur->fetch();
        if (!$existing) Response::notFound('Attendance record not found');

        $checkIn  = $body['checkInTime']  ?? $existing['check_in_time'];
        $checkOut = $body['checkOutTime'] ?? $existing['check_out_time'];
        $date     = $body['date']         ?? $existing['date'];
        $notes    = $body['notes']        ?? $existing['notes'];
        $status   = $this->computeStatus($checkIn, $checkOut);

        $db->prepare(
            'UPDATE attendance_records SET check_in_time=?, check_out_time=?, date=?, status=?, notes=? WHERE id=?'
        )->execute([$checkIn, $checkOut, $date, $status, $notes, $id]);

        $row = $db->prepare('SELECT * FROM attendance_records WHERE id=? LIMIT 1');
        $row->execute([$id]);
        Response::json(Auth::camelize($row->fetch()));
    }

    public function checkIn(array $user): void {
        $db   = getDB();
        $today = date('Y-m-d');
        $now  = date('Y-m-d H:i:s');

        $exists = $db->prepare(
            "SELECT id FROM attendance_records WHERE user_id=? AND DATE(date)=? LIMIT 1"
        );
        $exists->execute([$user['id'], $today]);
        if ($exists->fetch()) Response::error('Already checked in today');

        $db->prepare(
            'INSERT INTO attendance_records (user_id, check_in_time, date, status, notes) VALUES (?,?,?,?,?)'
        )->execute([$user['id'], $now, $now, 'present', '']);
        $id  = (int)$db->lastInsertId();
        $row = $db->prepare('SELECT * FROM attendance_records WHERE id=? LIMIT 1');
        $row->execute([$id]);
        Response::json(Auth::camelize($row->fetch()), 201);
    }

    public function checkOut(array $user): void {
        $db    = getDB();
        $today = date('Y-m-d');
        $now   = date('Y-m-d H:i:s');

        $stmt = $db->prepare(
            "SELECT * FROM attendance_records WHERE user_id=? AND DATE(date)=? LIMIT 1"
        );
        $stmt->execute([$user['id'], $today]);
        $rec  = $stmt->fetch();
        if (!$rec) Response::notFound('No check-in record found for today');
        if ($rec['check_out_time']) Response::error('Already checked out today');

        $status = $this->computeStatus($rec['check_in_time'], $now);
        $db->prepare(
            'UPDATE attendance_records SET check_out_time=?, status=? WHERE id=?'
        )->execute([$now, $status, $rec['id']]);

        $row = $db->prepare('SELECT * FROM attendance_records WHERE id=? LIMIT 1');
        $row->execute([$rec['id']]);
        Response::json(Auth::camelize($row->fetch()));
    }

    public function bulk(array $user, array $body): void {
        $records = $body['records'] ?? [];
        if (!is_array($records)) Response::error('Invalid records format');
        $db      = getDB();
        $results = ['success' => 0, 'failed' => 0];

        foreach ($records as $rec) {
            try {
                $empStmt = $db->prepare(
                    "SELECT id FROM users WHERE employee_id=? OR CONCAT(first_name,' ',last_name)=? LIMIT 1"
                );
                $empStmt->execute([$rec['employeeId'] ?? '', $rec['fullName'] ?? '']);
                $emp = $empStmt->fetch();
                if (!$emp) { $results['failed']++; continue; }

                for ($day = 1; $day <= 31; $day++) {
                    $key = "Day {$day}";
                    if (empty($rec[$key])) continue;
                    $dateStr = sprintf('%04d-%02d-%02d', $rec['year'], $rec['month'], $day);
                    $dateObj = date_create($dateStr);
                    if (!$dateObj) continue;
                    $s = strtoupper($rec[$key]);
                    $status = match($s) { 'A' => 'absent', 'H' => 'halfday', default => 'present' };
                    $db->prepare(
                        'INSERT INTO attendance_records (user_id, date, status) VALUES (?,?,?)'
                    )->execute([$emp['id'], $dateStr . ' 00:00:00', $status]);
                }
                $results['success']++;
            } catch (Throwable $e) {
                $results['failed']++;
            }
        }
        Response::json(['message' => 'Bulk attendance processed', 'results' => $results]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function byUser(PDO $db, int $userId, ?string $month): array {
        if ($month) {
            [$yr, $mo] = explode('-', $month);
            $stmt = $db->prepare(
                'SELECT * FROM attendance_records WHERE user_id=? AND YEAR(date)=? AND MONTH(date)=? ORDER BY date'
            );
            $stmt->execute([$userId, (int)$yr, (int)$mo]);
        } else {
            $stmt = $db->prepare('SELECT * FROM attendance_records WHERE user_id=? ORDER BY date DESC');
            $stmt->execute([$userId]);
        }
        return $stmt->fetchAll();
    }

    private function byDate(PDO $db, string $date): array {
        $stmt = $db->prepare('SELECT * FROM attendance_records WHERE DATE(date)=? ORDER BY user_id');
        $stmt->execute([date('Y-m-d', strtotime($date))]);
        return $stmt->fetchAll();
    }

    private function byMonth(PDO $db, string $month): array {
        [$yr, $mo] = explode('-', $month);
        $stmt = $db->prepare('SELECT * FROM attendance_records WHERE YEAR(date)=? AND MONTH(date)=? ORDER BY date');
        $stmt->execute([(int)$yr, (int)$mo]);
        return $stmt->fetchAll();
    }
}
