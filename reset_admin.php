<?php
try {
    $db = new PDO("mysql:host=localhost;dbname=hrconnect", "root", "");
    $hash = password_hash("Admin@1234", PASSWORD_DEFAULT);
    $stmt = $db->prepare("UPDATE users SET password = ? WHERE role = ?");
    $stmt->execute([$hash, "admin"]);
    echo "Successfully reset " . $stmt->rowCount() . " admin passwords to: Admin@1234\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
