<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../helpers/Response.php';

class ReportController {

    public function attendance(array $user, array $query): void {
        $startDate  = $query['startDate']   ?? null;
        $endDate    = $query['endDate']     ?? null;
        $deptId     = isset($query['departmentId']) ? (int)$query['departmentId'] : null;

        if (!$startDate || !$endDate) Response::error('startDate and endDate are required');

        $db     = getDB();
        $users  = $this->getUsers($db, $deptId);
        $result = [];

        foreach ($users as $u) {
            $stmt = $db->prepare(
                'SELECT * FROM attendance_records WHERE user_id=? AND date >= ? AND date <= ? ORDER BY date'
            );
            $stmt->execute([$u['id'], $startDate . ' 00:00:00', $endDate . ' 23:59:59']);
            $recs = $stmt->fetchAll();
            if ($recs) {
                $result[] = [
                    'user'    => ['id'=>$u['id'],'firstName'=>$u['first_name'],'lastName'=>$u['last_name'],'position'=>$u['position'],'departmentId'=>$u['department_id']],
                    'records' => $recs
                ];
            }
        }
        Response::json($result);
    }

    public function leave(array $user, array $query): void {
        $startDate = $query['startDate'] ?? null;
        $endDate   = $query['endDate']   ?? null;
        $deptId    = isset($query['departmentId']) ? (int)$query['departmentId'] : null;
        $status    = $query['status']    ?? null;

        if (!$startDate || !$endDate) Response::error('startDate and endDate are required');

        $db     = getDB();
        $users  = $this->getUsers($db, $deptId);
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
                    'user'          => ['id'=>$u['id'],'firstName'=>$u['first_name'],'lastName'=>$u['last_name'],'position'=>$u['position'],'departmentId'=>$u['department_id']],
                    'leaveRequests' => $recs
                ];
            }
        }
        Response::json($result);
    }

    private function getUsers(PDO $db, ?int $deptId): array {
        if ($deptId) {
            $stmt = $db->prepare("SELECT * FROM users WHERE department_id=? AND role!='developer' AND is_active=1 ORDER BY first_name");
            $stmt->execute([$deptId]);
        } else {
            $stmt = $db->query("SELECT * FROM users WHERE role!='developer' AND is_active=1 ORDER BY first_name");
        }
        return $stmt->fetchAll();
    }
}
