<?php
/**
 * Comprehensive Data Sync Script
 * - Add salary to all employees without one
 * - Add payment records for all employees for past 6 months
 * - Add attendance data for new employees (Oct 2025 - Mar 2026)
 * - Add leave requests for new employees
 */

require_once 'php-backend/config/database.php';
$db = getDB();

// ── CONFIG ────────────────────────────────────────────────────────────────────

// Salary ranges by position/role (annual CTC)
$salaryRanges = [
    'admin'    => [800000, 1500000],
    'hr'       => [500000, 900000],
    'manager'  => [700000, 1200000],
    'employee' => [250000, 700000],
];

$positions = [
    'Software Engineer', 'Senior Engineer', 'Team Lead', 'Project Manager',
    'HR Executive', 'HR Manager', 'Finance Executive', 'Operations Manager',
    'Sales Executive', 'Marketing Executive', 'Business Analyst', 'QA Engineer',
    'DevOps Engineer', 'Data Analyst', 'Product Manager', 'Accountant',
    'Customer Support', 'Technical Lead', 'Coordinator', 'Specialist'
];

$months = ['Oct 2025','Nov 2025','Dec 2025','Jan 2026','Feb 2026','Mar 2026'];

echo "=== Starting Comprehensive Data Sync ===\n\n";

// ── STEP 1: Assign salary & position to employees without one ─────────────────
echo "--- Step 1: Assigning salaries ---\n";
$stmt = $db->query("SELECT id, role FROM users WHERE salary IS NULL OR salary = 0");
$empsWithoutSalary = $stmt->fetchAll();
echo "Found " . count($empsWithoutSalary) . " employees without salary\n";

$salaryUpdated = 0;
foreach ($empsWithoutSalary as $emp) {
    $role = $emp['role'] ?? 'employee';
    if (!isset($salaryRanges[$role])) $role = 'employee';
    [$min, $max] = $salaryRanges[$role];
    $annualCTC = rand($min / 1000, $max / 1000) * 1000;
    $monthlyCTC = (int)($annualCTC / 12);
    $position = $positions[array_rand($positions)];
    
    $db->prepare("UPDATE users SET salary=?, position=? WHERE id=? AND (salary IS NULL OR salary = 0)")
       ->execute([$monthlyCTC, $position, $emp['id']]);
    $salaryUpdated++;
}
echo "Salaries assigned: $salaryUpdated\n\n";

// ── STEP 2: Add payment records for all employees for 6 months ───────────────
echo "--- Step 2: Adding payment records ---\n";

// Get all employees
$allEmps = $db->query("SELECT id, salary FROM users WHERE role != 'developer'")->fetchAll();
echo "Total employees: " . count($allEmps) . "\n";

$payAdded = 0;
$paySkipped = 0;

foreach ($allEmps as $emp) {
    foreach ($months as $month) {
        // Check if already exists
        $exists = $db->prepare("SELECT id FROM payment_records WHERE employee_id=? AND month=? LIMIT 1");
        $exists->execute([$emp['id'], $month]);
        if ($exists->fetch()) { $paySkipped++; continue; }

        $monthlySalary = (int)($emp['salary'] ?? 30000);
        if ($monthlySalary <= 0) $monthlySalary = rand(25000, 80000);
        
        // Calculate days worked (25-30 days)
        $daysWorked = rand(22, 26);
        $totalDays = 30;
        $gross = (int)(($monthlySalary / $totalDays) * $daysWorked);
        
        // For older months, mark as paid. Current month pending.
        $status = ($month === 'Mar 2026') ? 'pending' : 'paid';
        $payDate = ($status === 'paid') ? date('Y-m-d', strtotime("15 $month")) : null;
        $mode = ['bank_transfer','bank_transfer','bank_transfer','cheque'][rand(0,3)];

        $db->prepare("
            INSERT INTO payment_records 
            (employee_id, month, payment_status, amount, payment_date, payment_mode, reference_no, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ")->execute([
            $emp['id'], $month, $status, $gross, $payDate,
            $mode,
            $status === 'paid' ? 'TXN' . strtoupper(substr(md5(uniqid()), 0, 10)) : null
        ]);
        $payAdded++;
    }
}
echo "Payment records added: $payAdded, skipped (already exist): $paySkipped\n\n";

// ── STEP 3: Add attendance data for ALL employees ─────────────────────────────
echo "--- Step 3: Adding attendance records ---\n";

// Get employees that have NO attendance records at all
$empsWithAttendance = $db->query("SELECT DISTINCT user_id FROM attendance_records")->fetchAll(PDO::FETCH_COLUMN);
$allUsers = $db->query("SELECT id FROM users WHERE role != 'developer' AND is_active=1")->fetchAll(PDO::FETCH_COLUMN);
$empsWithoutAttendance = array_diff($allUsers, $empsWithAttendance);

echo "Employees without attendance: " . count($empsWithoutAttendance) . "\n";

$attAdded = 0;
$db->beginTransaction();

foreach ($empsWithoutAttendance as $userId) {
    // Add 6 months of attendance: Oct 2025 - Mar 2026
    $periods = [
        ['2025-10', 31], ['2025-11', 30], ['2025-12', 31],
        ['2026-01', 31], ['2026-02', 28], ['2026-03', 24], // Mar up to 24
    ];
    
    foreach ($periods as [$yearMonth, $days]) {
        for ($day = 1; $day <= $days; $day++) {
            $dateStr = "$yearMonth-" . str_pad($day, 2, '0', STR_PAD_LEFT);
            $dow = date('N', strtotime($dateStr)); // 1=Mon, 7=Sun
            
            // Skip weekends
            if ($dow >= 6) continue;
            
            // Status distribution: 85% present, 8% absent, 5% halfday, 2% late
            $rand = rand(1, 100);
            if ($rand <= 85) {
                $status = 'present';
                $checkIn = "$dateStr " . sprintf("%02d:%02d:00", rand(8,9), rand(0,30));
                $checkOut = "$dateStr " . sprintf("%02d:%02d:00", rand(17,18), rand(0,59));
            } elseif ($rand <= 93) {
                $status = 'absent';
                $checkIn = null; $checkOut = null;
            } elseif ($rand <= 97) {
                $status = 'halfday';
                $checkIn = "$dateStr " . sprintf("%02d:%02d:00", rand(9,10), rand(0,30));
                $checkOut = "$dateStr " . sprintf("%02d:%02d:00", rand(13,14), rand(0,59));
            } else {
                $status = 'late';
                $checkIn = "$dateStr " . sprintf("%02d:%02d:00", rand(10,11), rand(0,59));
                $checkOut = "$dateStr " . sprintf("%02d:%02d:00", rand(17,19), rand(0,59));
            }
            
            $db->prepare("
                INSERT IGNORE INTO attendance_records (user_id, check_in_time, check_out_time, date, status, notes)
                VALUES (?, ?, ?, ?, ?, '')
            ")->execute([$userId, $checkIn, $checkOut, "$dateStr 00:00:00", $status]);
            $attAdded++;
        }
    }
}
$db->commit();
echo "Attendance records added: $attAdded\n\n";

// ── STEP 4: Add leave requests for new employees ──────────────────────────────
echo "--- Step 4: Adding leave requests ---\n";

$leaveTypes = ['annual','sick','personal','halfday'];
$leaveAdded = 0;
$db->beginTransaction();

foreach ($empsWithoutAttendance as $userId) {
    // Give each employee 1-3 leave requests
    $numLeaves = rand(1, 3);
    for ($i = 0; $i < $numLeaves; $i++) {
        $type = $leaveTypes[array_rand($leaveTypes)];
        // Random month in last 6
        $month = rand(10, 15); // Oct=10 to Mar=15 (offset trick)
        if ($month > 12) { $year = 2026; $month -= 12; } else { $year = 2025; }
        $day = rand(1, 25);
        $startDate = sprintf('%04d-%02d-%02d', $year, $month, $day);
        $endDate = $type === 'halfday' ? $startDate : date('Y-m-d', strtotime($startDate . ' +' . rand(0,2) . ' days'));
        $statuses = ['approved','approved','approved','rejected','pending'];
        $status = $statuses[array_rand($statuses)];
        
        $db->prepare("
            INSERT INTO leave_requests (user_id, type, start_date, end_date, reason, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ")->execute([$userId, $type, $startDate, $endDate, 'Personal reasons', $status]);
        $leaveAdded++;
    }
}
$db->commit();
echo "Leave requests added: $leaveAdded\n\n";

// ── SUMMARY ───────────────────────────────────────────────────────────────────
echo "=== DONE ===\n";
echo "Payment records: " . $db->query("SELECT COUNT(*) FROM payment_records")->fetchColumn() . "\n";
echo "Attendance records: " . $db->query("SELECT COUNT(*) FROM attendance_records")->fetchColumn() . "\n";
echo "Leave requests: " . $db->query("SELECT COUNT(*) FROM leave_requests")->fetchColumn() . "\n";
echo "Users with salary: " . $db->query("SELECT COUNT(*) FROM users WHERE salary > 0")->fetchColumn() . "\n";
