<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';

class NotificationController {

    public function index(array $user): void {
        $db   = getDB();
        $stmt = $db->prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC');
        $stmt->execute([$user['id']]);
        Response::json($stmt->fetchAll());
    }

    public function unread(array $user): void {
        $db   = getDB();
        $stmt = $db->prepare('SELECT * FROM notifications WHERE user_id=? AND is_read=0 ORDER BY created_at DESC');
        $stmt->execute([$user['id']]);
        Response::json($stmt->fetchAll());
    }

    public function create(array $user, array $body): void {
        $db   = getDB();
        $userId = $body['userId'] ?? $user['id'];
        $db->prepare(
            'INSERT INTO notifications (user_id, type, title, message, is_read, related_user_id, related_leave_id, created_at)
             VALUES (?, ?, ?, ?, 0, ?, ?, NOW())'
        )->execute([
            $userId,
            $body['type']          ?? 'login',
            $body['title']         ?? '',
            $body['message']       ?? '',
            $body['relatedUserId'] ?? null,
            $body['relatedLeaveId'] ?? null,
        ]);
        $id  = (int)$db->lastInsertId();
        $row = $db->prepare('SELECT * FROM notifications WHERE id=? LIMIT 1');
        $row->execute([$id]);
        Response::json($row->fetch(), 201);
    }

    public function markRead(array $user, int $id): void {
        $db   = getDB();
        $stmt = $db->prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?');
        $stmt->execute([$id, $user['id']]);
        if ($stmt->rowCount() === 0) Response::notFound('Notification not found');
        Response::json(['message' => 'Notification marked as read']);
    }

    public function markAllRead(array $user): void {
        $db = getDB();
        $db->prepare('UPDATE notifications SET is_read=1 WHERE user_id=?')->execute([$user['id']]);
        Response::json(['message' => 'All notifications marked as read']);
    }

    public function delete(array $user, int $id): void {
        $db   = getDB();
        $stmt = $db->prepare('DELETE FROM notifications WHERE id=? AND user_id=?');
        $stmt->execute([$id, $user['id']]);
        if ($stmt->rowCount() === 0) Response::notFound('Notification not found');
        Response::noContent();
    }
}
