<?php
try {
    $db = new PDO("mysql:host=localhost;dbname=hrconnect", "root", "");
    $stmt = $db->query("SELECT id, username, email, first_name, last_name, role FROM users WHERE id = 1561");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        printf("%-3s | %-15s | %-15s | %-15s | %s | %s\n", $row['id'], $row['username'], $row['first_name'], $row['last_name'], $row['role'], $row['email']);
    } else {
        echo "User 1561 not found\n";
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
