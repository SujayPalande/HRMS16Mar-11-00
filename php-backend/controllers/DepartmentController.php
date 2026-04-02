<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../helpers/Response.php';

class DepartmentController {

    public function index(): void {
        $db   = getDB();
        $stmt = $db->query(
            'SELECT d.*, u.name AS unit_name,
             (SELECT COUNT(*) FROM users WHERE department_id=d.id AND is_active=1) AS employee_count
             FROM departments d
             LEFT JOIN units u ON u.id=d.unit_id
             ORDER BY d.name'
        );
        Response::json(Auth::camelize($stmt->fetchAll()));
    }

    public function show(int $id): void {
        $db   = getDB();
        $stmt = $db->prepare('SELECT * FROM departments WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        $dept = $stmt->fetch();
        if (!$dept) Response::notFound('Department not found');
        Response::json($dept);
    }

    public function create(array $body): void {
        $name = trim($body['name'] ?? '');
        $code = trim($body['code'] ?? '');
        if (!$name || !$code) Response::error("'name' and 'code' are required");

        $db   = getDB();
        $stmt = $db->prepare(
            'INSERT INTO departments (name, code, manager, location, description, unit_id)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $name, $code,
            $body['manager']     ?? null,
            $body['location']    ?? null,
            $body['description'] ?? null,
            !empty($body['unitId']) ? (int)$body['unitId'] : null,
        ]);
        $id   = (int)$db->lastInsertId();
        $row  = $db->prepare('SELECT * FROM departments WHERE id=? LIMIT 1');
        $row->execute([$id]);
        Response::json($row->fetch(), 201);
    }

    public function update(int $id, array $body): void {
        $db    = getDB();
        $check = $db->prepare('SELECT id FROM departments WHERE id=? LIMIT 1');
        $check->execute([$id]);
        if (!$check->fetch()) Response::notFound('Department not found');

        $sets   = [];
        $values = [];
        $colMap = [
            'name' => 'name', 'code' => 'code', 'manager' => 'manager',
            'location' => 'location', 'description' => 'description', 'unitId' => 'unit_id'
        ];
        foreach ($colMap as $key => $col) {
            if (array_key_exists($key, $body)) {
                $sets[]   = "`{$col}` = ?";
                $values[] = $body[$key];
            }
        }
        if (!empty($sets)) {
            $values[] = $id;
            $db->prepare('UPDATE departments SET ' . implode(', ', $sets) . ' WHERE id=?')->execute($values);
        }

        $stmt = $db->prepare('SELECT * FROM departments WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        Response::json($stmt->fetch());
    }

    public function delete(int $id): void {
        $db   = getDB();
        $stmt = $db->prepare('DELETE FROM departments WHERE id=?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) Response::notFound('Department not found');
        Response::noContent();
    }
}
