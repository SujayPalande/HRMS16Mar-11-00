<?php
require_once 'php-backend/config/database.php';
$db = getDB();
foreach($db->query('SELECT * FROM units') as $row) {
    echo $row['id'] . " - " . $row['name'] . "\n";
}
