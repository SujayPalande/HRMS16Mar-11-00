<?php
require_once 'php-backend/config/database.php';
require_once 'php-backend/helpers/Auth.php';

$db = getDB();

echo "--- DEPARTMENTS (FULL QUERY) --- \n";
$stmt = $db->query('SELECT d.*, u.name AS unit_name, (SELECT COUNT(*) FROM users WHERE department_id=d.id AND is_active=1) AS employee_count FROM departments d LEFT JOIN units u ON u.id=d.unit_id ORDER BY d.name');
$depts = $stmt->fetchAll();
$sanDepts = Auth::camelize($depts);
var_dump($sanDepts[0]['unitId']);

echo "\n--- EMPLOYEES --- \n";
$emps = $db->query("SELECT * FROM users LIMIT 1")->fetchAll();
$sanEmps = array_map([Auth::class, 'sanitizeUser'], $emps);
print_r($sanEmps[0] ?? []);
