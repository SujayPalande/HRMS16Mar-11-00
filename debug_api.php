<?php
$_SERVER['REQUEST_URI'] = '/api/employees';
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SESSION['user_id'] = 1; // Simulate admin

require_once 'php-backend/index.php';
// This will output JSON to stdout.
