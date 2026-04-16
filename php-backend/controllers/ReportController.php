<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../helpers/Response.php';

class ReportController {

    public function attendance(array $user, array $query): void {
        $startDate  = $query['startDate']   ?? null;
        $endDate    = $query['endDate']     ?? null;
        $deptId     = isset($query['departmentId']) && $query['departmentId'] !== 'all' ? (int)$query['departmentId'] : null;
        $unitId     = isset($query['unitId']) && $query['unitId'] !== 'all' ? (int)$query['unitId'] : null;

        if (!$startDate || !$endDate) Response::error('startDate and endDate are required');

        $db     = getDB();
        $users  = $this->getUsers($user, $db, $deptId, $unitId);
        $result = [];

        foreach ($users as $u) {
            $stmt = $db->prepare(
                'SELECT * FROM attendance_records WHERE user_id=? AND date >= ? AND date <= ? ORDER BY date'
            );
            $stmt->execute([$u['id'], $startDate . ' 00:00:00', $endDate . ' 23:59:59']);
            $recs = $stmt->fetchAll();
            if ($recs) {
                $result[] = [
                    'user'    => [
                        'id'           => (int)$u['id'],
                        'firstName'    => $u['first_name'],
                        'lastName'     => $u['last_name'],
                        'position'     => $u['position'],
                        'departmentId' => (int)$u['department_id'],
                    ],
                    'records' => Auth::camelize($recs)
                ];
            }
        }
        Response::json($result);
    }

    public function leave(array $user, array $query): void {
        $startDate = $query['startDate'] ?? null;
        $endDate   = $query['endDate']   ?? null;
        $deptId    = isset($query['departmentId']) && $query['departmentId'] !== 'all' ? (int)$query['departmentId'] : null;
        $unitId    = isset($query['unitId']) && $query['unitId'] !== 'all' ? (int)$query['unitId'] : null;
        $status    = $query['status']    ?? null;

        if (!$startDate || !$endDate) Response::error('startDate and endDate are required');

        $db     = getDB();
        $users  = $this->getUsers($user, $db, $deptId, $unitId);
        $result = [];

        foreach ($users as $u) {
            $stmt = $db->prepare(
                'SELECT * FROM leave_requests WHERE user_id=?
                 AND (start_date BETWEEN ? AND ? OR end_date BETWEEN ? AND ?)
                 ORDER BY start_date'
            );
            $s = $startDate . ' 00:00:00'; $e = $endDate . ' 23:59:59';
            $stmt->execute([$u['id'], $s, $e, $s, $e]);
            $recs = $stmt->fetchAll();
            if ($status) $recs = array_values(array_filter($recs, fn($r) => $r['status'] === $status));
            if ($recs) {
                $result[] = [
                    'user'          => [
                        'id'           => (int)$u['id'],
                        'firstName'    => $u['first_name'],
                        'lastName'     => $u['last_name'],
                        'position'     => $u['position'],
                        'departmentId' => (int)$u['department_id'],
                    ],
                    'leaveRequests' => Auth::camelize($recs)
                ];
            }
        }
        Response::json($result);
    }

    private function getUsers(array $currentUser, PDO $db, ?int $deptId, ?int $unitId = null): array {
        $authorizedUnit = Auth::getAuthorizedUnitId($currentUser);
        
        // Enforce unit restriction
        if ($authorizedUnit !== null) {
            if ($authorizedUnit === false) return [];
            $unitId = $authorizedUnit;
        }

        if ($deptId) {
            $sql = "SELECT u.* FROM users u 
                    LEFT JOIN departments d ON d.id = u.department_id 
                    WHERE u.department_id=? AND u.role!='developer' AND u.is_active=1";
            if ($unitId) {
                $sql .= " AND d.unit_id=?";
                $stmt = $db->prepare($sql . " ORDER BY u.first_name");
                $stmt->execute([$deptId, $unitId]);
            } else {
                $stmt = $db->prepare($sql . " ORDER BY u.first_name");
                $stmt->execute([$deptId]);
            }
        } elseif ($unitId) {
            $stmt = $db->prepare("
                SELECT u.* FROM users u
                JOIN departments d ON d.id = u.department_id
                WHERE d.unit_id=? AND u.role!='developer' AND u.is_active=1
                ORDER BY u.first_name
            ");
            $stmt->execute([$unitId]);
        } else {
            $stmt = $db->query("SELECT u.* FROM users u WHERE u.role!='developer' AND u.is_active=1 ORDER BY u.first_name");
        }
        return $stmt->fetchAll();
    }
}
