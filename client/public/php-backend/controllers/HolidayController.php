<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';

class HolidayController {

    public function index(): void {
        $db   = getDB();
        $stmt = $db->query('SELECT * FROM holidays ORDER BY date ASC');
        Response::json($stmt->fetchAll());
    }

    public function create(array $body): void {
        $name = trim($body['name'] ?? '');
        $date = trim($body['date'] ?? '');
        if (!$name || !$date) Response::error("'name' and 'date' are required");

        $db   = getDB();
        $stmt = $db->prepare('INSERT INTO holidays (name, date, description) VALUES (?, ?, ?)');
        $stmt->execute([$name, date('Y-m-d H:i:s', strtotime($date)), $body['description'] ?? null]);
        $id   = (int)$db->lastInsertId();
        $row  = $db->prepare('SELECT * FROM holidays WHERE id=? LIMIT 1');
        $row->execute([$id]);
        Response::json($row->fetch(), 201);
    }

    public function update(int $id, array $body): void {
        $db   = getDB();
        $check = $db->prepare('SELECT id FROM holidays WHERE id=? LIMIT 1');
        $check->execute([$id]);
        if (!$check->fetch()) Response::notFound('Holiday not found');

        $sets = []; $values = [];
        if (array_key_exists('name', $body))        { $sets[] = 'name=?';        $values[] = $body['name']; }
        if (array_key_exists('description', $body)) { $sets[] = 'description=?'; $values[] = $body['description']; }
        if (array_key_exists('date', $body))        { $sets[] = 'date=?';        $values[] = date('Y-m-d H:i:s', strtotime($body['date'])); }

        if (!empty($sets)) {
            $values[] = $id;
            $db->prepare('UPDATE holidays SET ' . implode(', ', $sets) . ' WHERE id=?')->execute($values);
        }
        $stmt = $db->prepare('SELECT * FROM holidays WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        Response::json($stmt->fetch());
    }

    public function delete(int $id): void {
        $db   = getDB();
        $stmt = $db->prepare('DELETE FROM holidays WHERE id=?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) Response::notFound('Holiday not found');
        Response::noContent();
    }
}
