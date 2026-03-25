<?php
/**
 * HR Connect — First-time setup script
 * =====================================
 * Run this ONCE from the browser or CLI after deploying to create the admin
 * user and verify the database connection. DELETE this file afterwards.
 *
 * CLI:   php setup.php
 * Browser: https://yourdomain.com/api/setup.php  (then delete it!)
 */

header('Content-Type: text/plain; charset=utf-8');
echo "HR Connect Setup\n";
echo str_repeat('=', 40) . "\n\n";

require_once __DIR__ . '/config/database.php';

// 1. Test DB connection
echo "1. Testing database connection...\n";
try {
    $db = getDB();
    echo "   OK — connected to MySQL.\n\n";
} catch (Throwable $e) {
    die("   FAILED: " . $e->getMessage() . "\n");
}

// 2. Import schema
echo "2. Importing schema...\n";
$schemaFile = __DIR__ . '/schema.sql';
if (!file_exists($schemaFile)) {
    echo "   SKIP — schema.sql not found (already imported?).\n\n";
} else {
    try {
        $sql = file_get_contents($schemaFile);
        // Split on semicolons (simple approach — no stored procedures)
        $statements = array_filter(array_map('trim', explode(';', $sql)));
        foreach ($statements as $stmt) {
            if ($stmt) $db->exec($stmt);
        }
        echo "   OK — schema imported.\n\n";
    } catch (Throwable $e) {
        echo "   WARNING: " . $e->getMessage() . "\n\n";
    }
}

// 3. Create / update admin user
echo "3. Creating admin user...\n";
$adminUsername = 'admin';
$adminEmail    = 'admin@hrconnect.com';
$adminPassword = 'Admin@1234'; // Change this!

$hash = password_hash($adminPassword, PASSWORD_DEFAULT);

$existing = $db->prepare('SELECT id FROM users WHERE username=? LIMIT 1');
$existing->execute([$adminUsername]);
if ($existing->fetch()) {
    $db->prepare('UPDATE users SET password=?, email=?, role=? WHERE username=?')
       ->execute([$hash, $adminEmail, 'admin', $adminUsername]);
    echo "   OK — admin password updated.\n";
} else {
    $db->prepare(
        "INSERT INTO users (username, password, email, first_name, last_name, role, status, is_active, join_date)
         VALUES (?, ?, ?, 'Admin', 'User', 'admin', 'active', 1, NOW())"
    )->execute([$adminUsername, $hash, $adminEmail]);
    echo "   OK — admin user created.\n";
}

echo "\n";
echo str_repeat('=', 40) . "\n";
echo "Setup complete!\n\n";
echo "Login credentials:\n";
echo "  Username : {$adminUsername}\n";
echo "  Password : {$adminPassword}\n";
echo "  Email    : {$adminEmail}\n\n";
echo "IMPORTANT: Change the default password after first login.\n";
echo "IMPORTANT: Delete this setup.php file from the server!\n";
