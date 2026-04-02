<?php
require_once 'php-backend/config/database.php';
$db = getDB();

echo "=== PAYMENT RECORDS ===\n";
echo "Total: " . $db->query("SELECT COUNT(*) FROM payment_records")->fetchColumn() . "\n";

echo "\n=== ATTENDANCE RECORDS ===\n";
echo "Total: " . $db->query("SELECT COUNT(*) FROM attendance_records")->fetchColumn() . "\n";
$range = $db->query("SELECT MIN(date), MAX(date) FROM attendance_records")->fetch();
echo "Range: " . $range['MIN(date)'] . " to " . $range['MAX(date)'] . "\n";

echo "\n=== LEAVE REQUESTS ===\n";
echo "Total: " . $db->query("SELECT COUNT(*) FROM leave_requests")->fetchColumn() . "\n";

echo "\n=== USERS WITH SALARY ===\n";
echo "Has salary: " . $db->query("SELECT COUNT(*) FROM users WHERE salary > 0 AND salary IS NOT NULL")->fetchColumn() . "\n";
echo "No salary: " . $db->query("SELECT COUNT(*) FROM users WHERE salary IS NULL OR salary = 0")->fetchColumn() . "\n";
echo "Total users: " . $db->query("SELECT COUNT(*) FROM users")->fetchColumn() . "\n";

echo "\n=== UNITS ===\n";
foreach($db->query("SELECT u.id, u.name, COUNT(us.id) as emp_count FROM units u LEFT JOIN departments d ON d.unit_id=u.id LEFT JOIN users us ON us.department_id=d.id GROUP BY u.id,u.name") as $r) {
    echo "Unit " . $r['id'] . ": " . $r['name'] . " - " . $r['emp_count'] . " employees\n";
}
