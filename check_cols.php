<?php
require 'c:/inetpub/wwwroot/HRMS26Mar-09-20/php-backend/config/database.php';
$pdo = getDB();
$stmt = $pdo->query('SELECT id, username, first_name, last_name, work_location FROM users LIMIT 3');
foreach($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
    print_r($row);
}
