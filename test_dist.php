<?php
require_once 'php-backend/config/database.php';
$db = getDB();
echo "--- USER DEPARTMENTS --- \n";
$stmt = $db->query("SELECT department_id, COUNT(*) as cnt FROM users GROUP BY department_id");
while ($row = $stmt->fetch()) {
    echo "Dept ID: " . ($row['department_id'] ?: 'NULL') . " Count: " . $row['cnt'] . "\n";
}

echo "\n--- DEPT DETAILS --- \n";
$stmt = $db->query("SELECT id, name, unit_id FROM departments");
while ($row = $stmt->fetch()) {
    echo "ID: " . $row['id'] . " Name: " . $row['name'] . " Unit ID: " . $row['unit_id'] . "\n";
}
