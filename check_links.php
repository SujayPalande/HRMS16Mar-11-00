<?php
require_once 'php-backend/config/database.php';
$db = getDB();
echo "--- DEPARTMENTS ---\n";
foreach($db->query("SELECT * FROM departments") as $d) {
    echo "ID: " . $d['id'] . " Name: " . $d['name'] . " UnitID: " . $d['unit_id'] . "\n";
}
echo "--- USERS SAMPLE ---\n";
foreach($db->query("SELECT id, first_name, department_id FROM users LIMIT 10") as $u) {
    echo "ID: " . $u['id'] . " Name: " . $u['first_name'] . " DeptID: " . $u['department_id'] . "\n";
}
