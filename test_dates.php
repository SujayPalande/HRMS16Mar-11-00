<?php
require_once 'php-backend/config/database.php';
$db = getDB();
echo "Attendance Range: " . $db->query("SELECT MIN(date) FROM attendance_records")->fetchColumn() . " to " . $db->query("SELECT MAX(date) FROM attendance_records")->fetchColumn() . "\n";
echo "Specific Check (Feb 2026): " . $db->query("SELECT COUNT(*) FROM attendance_records WHERE date >= '2026-02-01' AND date <= '2026-02-28'")->fetchColumn() . "\n";
