<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../helpers/Response.php';

class LeaveController {

    public function index(array $user, array $query): void {
        $db       = getDB();
        $userId   = isset($query['userId']) ? (int)$query['userId'] : null;
        $status   = $query['status'] ?? null;
        $role     = $user['role'];

        if ($userId) {
            // If they are checking a specific user, ensure they have access to that user
            // (Simplicity: just check if they are checking themselves OR if they are HR/Admin)
            if ($userId !== (int)$user['id'] && !in_array($role, ['admin', 'hr', 'manager', 'developer'])) {
                Response::forbidden();
            }
            $stmt = $db->prepare('SELECT * FROM leave_requests WHERE user_id=? ORDER BY created_at DESC');
            $stmt->execute([$userId]);
            Response::json(Auth::camelize($stmt->fetchAll()));
            return;
        }

        // Build a scoped query
        $sql = "SELECT lr.* FROM leave_requests lr 
                JOIN users u ON u.id = lr.user_id 
                LEFT JOIN departments d ON d.id = u.department_id";
        $where = [];
        $params = [];

        if ($status === 'pending') {
            $where[] = "lr.status = 'pending'";
        }

        $authorizedUnit = Auth::getAuthorizedUnitId($user);
        if ($authorizedUnit !== null) {
            if ($authorizedUnit === false) {
                $where[] = "lr.user_id = ?";
                $params[] = $user['id'];
            } else {
                $where[] = "d.unit_id = ?";
                $params[] = $authorizedUnit;
            }
        } elseif ($role === 'employee') {
            $where[] = "lr.user_id = ?";
            $params[] = $user['id'];
        }

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY lr.created_at DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::json(Auth::camelize($stmt->fetchAll()));
    }

    public function create(array $user, array $body): void {
        $db        = getDB();
        $userId    = isset($body['userId']) ? (int)$body['userId'] : $user['id'];
        $type      = $body['type']      ?? '';
        $startDate = $body['startDate'] ?? '';
        $endDate   = $body['endDate']   ?? '';
        $reason    = $body['reason']    ?? '';
        $leaveStatus = 'pending';

        $validTypes = ['annual','sick','personal','halfday','unpaid','other','workfromhome'];
        if (!in_array($type, $validTypes)) Response::error("Invalid leave type '{$type}'");
        if (!$startDate || !$endDate) Response::error("startDate and endDate are required");

        $stmt = $db->prepare(
            'INSERT INTO leave_requests (user_id, type, start_date, end_date, reason, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())'
        );
        $stmt->execute([$userId, $type, date('Y-m-d H:i:s', strtotime($startDate)), date('Y-m-d H:i:s', strtotime($endDate)), $reason, $leaveStatus]);
        $id  = (int)$db->lastInsertId();
        $row = $this->getById($db, $id);

        // Notifications
        try {
            $this->notify($db, $userId, 'leave_request', 'Leave Request Submitted',
                "Your leave request from " . date('d/m/Y', strtotime($startDate)) . " to " . date('d/m/Y', strtotime($endDate)) . " has been submitted.", $id);
            $empStmt = $db->prepare('SELECT first_name, last_name, d.unit_id FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.id=? LIMIT 1');
            $empStmt->execute([$userId]);
            $emp = $empStmt->fetch();
            $unitId = $emp['unit_id'] ?? null;

            // Notify Admins (all units) and HR of the SAME unit
            $sql = "SELECT u.id FROM users u LEFT JOIN departments d ON d.id = u.department_id 
                    WHERE u.role IN ('admin', 'developer', 'hr') AND u.is_active=1";
            $params = [];
            if ($unitId) {
                $sql .= " AND (u.role IN ('admin', 'developer') OR d.unit_id = ?)";
                $params[] = $unitId;
            }
            $notifiables = $db->prepare($sql);
            $notifiables->execute($params);
            
            foreach ($notifiables->fetchAll() as $target) {
                if ((int)$target['id'] === (int)$userId) continue;
                $this->notify($db, (int)$target['id'], 'leave_request', 'New Leave Request',
                    "{$emp['first_name']} {$emp['last_name']} submitted a leave request.", $id, $userId);
            }
        } catch (Throwable $e) {
            error_log('[LeaveController] Notification error: ' . $e->getMessage());
        }

        Response::json(Auth::camelize($row), 201);
    }

    public function update(array $user, int $id, array $body): void {
        $db  = getDB();
        $row = $this->getById($db, $id);
        if (!$row) Response::notFound('Leave request not found');

        $sets   = [];
        $values = [];
        $colMap = [
            'type'         => 'type',
            'startDate'    => 'start_date',
            'endDate'      => 'end_date',
            'reason'       => 'reason',
            'status'       => 'status',
            'approvedById' => 'approved_by_id',
        ];
        foreach ($colMap as $key => $col) {
            if (array_key_exists($key, $body)) {
                $val = $body[$key];
                if ($col === 'start_date' || $col === 'end_date') {
                    $val = date('Y-m-d H:i:s', strtotime($val));
                }
                $sets[]   = "`{$col}` = ?";
                $values[] = $val;
            }
        }

        if (isset($body['status']) && ($body['status'] === 'approved' || $body['status'] === 'rejected')) {
            $sets[]   = 'approved_by_id = ?';
            $values[] = $user['id'];
        }

        if (!empty($sets)) {
            $values[] = $id;
            $db->prepare('UPDATE leave_requests SET ' . implode(', ', $sets) . ' WHERE id=?')->execute($values);
        }

        $updated = $this->getById($db, $id);

        // Notifications on status change
        if (!empty($body['status']) && in_array($body['status'], ['approved','rejected'])) {
            $statusTitle = $body['status'] === 'approved' ? 'Leave Request Approved' : 'Leave Request Rejected';
            $statusMsg   = $body['status'] === 'approved'
                ? "Your leave request from {$updated['start_date']} to {$updated['end_date']} has been approved."
                : "Your leave request from {$updated['start_date']} to {$updated['end_date']} has been rejected.";
            $notifType   = $body['status'] === 'approved' ? 'leave_approved' : 'leave_rejected';
            try {
                $this->notify($db, (int)$updated['user_id'], $notifType, $statusTitle, $statusMsg, $id, $user['id']);
            } catch (Throwable $e) {}
        }

        Response::json(Auth::camelize($updated));
    }

    public function delete(array $user, int $id): void {
        $db  = getDB();
        $row = $this->getById($db, $id);
        if (!$row) Response::notFound('Leave request not found');

        if ($row['user_id'] !== $user['id'] && !in_array($user['role'], ['admin','hr'])) {
            Response::forbidden('You can only cancel your own leave requests');
        }
        if ($row['status'] !== 'pending') {
            Response::error('Only pending leave requests can be canceled');
        }

        $db->prepare('DELETE FROM leave_requests WHERE id=?')->execute([$id]);
        Response::noContent();
    }

    private function getById(PDO $db, int $id): ?array {
        $stmt = $db->prepare('SELECT * FROM leave_requests WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    private function notify(PDO $db, int $userId, string $type, string $title, string $message, ?int $leaveId = null, ?int $relatedUserId = null): void {
        $db->prepare(
            'INSERT INTO notifications (user_id, type, title, message, is_read, related_leave_id, related_user_id, created_at)
             VALUES (?, ?, ?, ?, 0, ?, ?, NOW())'
        )->execute([$userId, $type, $title, $message, $leaveId, $relatedUserId]);
    }
}
