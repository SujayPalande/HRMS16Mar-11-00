<?php
try {
    $db = new PDO("mysql:host=localhost;dbname=hrconnect", "root", "");
    $stmt = $db->query("SELECT id, username, email, role FROM users LIMIT 10");
    foreach($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        printf("%-3s | %-15s | %-30s | %s\n", $row['id'], $row['username'], $row['email'], $row['role']);
    }
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
