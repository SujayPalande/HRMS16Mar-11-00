<?php
require_once 'php-backend/config/database.php';
$db = getDB();
echo "Active Users: " . $db->query("SELECT COUNT(*) FROM users WHERE is_active=1")->fetchColumn() . "\n";
echo "Total Users: " . $db->query("SELECT COUNT(*) FROM users")->fetchColumn() . "\n";
