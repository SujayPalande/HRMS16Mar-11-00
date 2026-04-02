<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../helpers/Response.php';

class PayrollController {

    public function calculate(array $user, array $body): void {
        $salary          = (float)($body['salary']           ?? 0);
        $overtimeHours   = (float)($body['overtimeHours']    ?? 0);
        $daysWorked      = (float)($body['daysWorked']       ?? 25);
        $totalDays       = (float)($body['totalDaysInMonth'] ?? 30);

        $settings        = $this->getSettings();
        $sc              = $settings['salaryComponents'] ?? [];
        $basicPct        = (float)($sc['basicSalaryPercentage'] ?? 50);
        $hraPct          = (float)($sc['hraPercentage']         ?? 50);

        // Pro-rated gross
        $gross   = ($salary / $totalDays) * $daysWorked;
        $basic   = $gross * ($basicPct / 100);
        $hra     = $basic * ($hraPct / 100);
        $da      = $basic * 0.10;
        $transAll = $basic * 0.16;
        $lta     = $basic * 0.04;
        $childAll = $basic * 0.04;
        $medAll  = $basic * 0.10;
        $othAll  = $basic * 0.06;

        $otRate   = (($basic + $da) / 26 / 8) * 2;
        $otAmount = $overtimeHours * $otRate;

        $earningsBeforeSpecial = $basic + $da + $hra + $transAll + $lta + $childAll + $medAll + $othAll + $otAmount;
        $specialAllowance      = max(0, $gross - $earningsBeforeSpecial);

        // Statutory deductions
        $basicLimit  = 15000;
        $epfEmployee = min($basic, $basicLimit) * 0.12;

        $esicEmployee = $gross <= 21000 ? round($gross * 0.0075) : 0;
        $esicEmployer = $gross <= 21000 ? round($gross * 0.0325) : 0;

        $pt  = 200;
        $mo  = (int)date('m');
        $lwf = ($mo === 6 || $mo === 12) ? 25 : 0;

        $totalDeductions = $epfEmployee + $esicEmployee + $pt + $lwf;
        $netSalary       = $gross - $totalDeductions;

        Response::json([
            'earnings'   => ['basic'=>$basic,'da'=>$da,'hra'=>$hra,'conveyance'=>0,'medical'=>0,'otAmount'=>$otAmount,'specialAllowance'=>$specialAllowance,'gross'=>$gross],
            'deductions' => ['epf'=>$epfEmployee,'esic'=>$esicEmployee,'pt'=>$pt,'lwf'=>$lwf,'totalDeductions'=>$totalDeductions],
            'netSalary'  => $netSalary,
            'period'     => ['daysWorked'=>$daysWorked,'totalDaysInMonth'=>$totalDays]
        ]);
    }

    public function getPaymentRecords(array $user, array $query): void {
        $db         = getDB();
        $employeeId = isset($query['employeeId']) ? (int)$query['employeeId'] : null;
        $month      = $query['month'] ?? null;

        $canViewAll  = Auth::hasPermission($user, 'payroll.view');
        $canViewOwn  = Auth::hasPermission($user, 'payroll.view_own');

        if ($canViewAll) {
            if ($employeeId) {
                $stmt = $db->prepare('SELECT * FROM payment_records WHERE employee_id=? ORDER BY created_at DESC');
                $stmt->execute([$employeeId]);
            } elseif ($month) {
                $stmt = $db->prepare('SELECT * FROM payment_records WHERE month=? ORDER BY created_at DESC');
                $stmt->execute([$month]);
            } else {
                $stmt = $db->query('SELECT * FROM payment_records ORDER BY created_at DESC');
            }
            Response::json($stmt->fetchAll());
        }

        if ($canViewOwn) {
            $stmt = $db->prepare('SELECT * FROM payment_records WHERE employee_id=? ORDER BY created_at DESC');
            $stmt->execute([$user['id']]);
            $records = $stmt->fetchAll();
            if ($month) {
                $records = array_filter($records, fn($r) => $r['month'] === $month);
            }
            Response::json(array_values($records));
        }

        Response::forbidden();
    }

    public function createPaymentRecord(array $user, array $body): void {
        if (!Auth::hasPermission($user, 'payroll.process')) Response::forbidden();
        $db   = getDB();
        $stmt = $db->prepare(
            'INSERT INTO payment_records (employee_id, month, payment_status, amount, payment_date, payment_mode, reference_no, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())'
        );
        $stmt->execute([
            (int)($body['employeeId']    ?? 0),
            $body['month']               ?? '',
            $body['paymentStatus']       ?? 'pending',
            (int)($body['amount']        ?? 0),
            $body['paymentDate']         ?? null,
            $body['paymentMode']         ?? null,
            $body['referenceNo']         ?? null,
        ]);
        $id  = (int)$db->lastInsertId();
        $row = $db->prepare('SELECT * FROM payment_records WHERE id=? LIMIT 1');
        $row->execute([$id]);
        Response::json($row->fetch(), 201);
    }

    public function updatePaymentRecord(array $user, int $id, array $body): void {
        if (!Auth::hasPermission($user, 'payroll.process')) Response::forbidden();
        $db   = getDB();
        $check = $db->prepare('SELECT id FROM payment_records WHERE id=? LIMIT 1');
        $check->execute([$id]);
        if (!$check->fetch()) Response::notFound('Payment record not found');

        $sets = []; $values = [];
        $cols = ['paymentStatus'=>'payment_status','amount'=>'amount','paymentDate'=>'payment_date','paymentMode'=>'payment_mode','referenceNo'=>'reference_no','month'=>'month'];
        foreach ($cols as $key => $col) {
            if (array_key_exists($key, $body)) { $sets[] = "`{$col}`=?"; $values[] = $body[$key]; }
        }
        if (!empty($sets)) { $values[] = $id; $db->prepare('UPDATE payment_records SET ' . implode(', ', $sets) . ' WHERE id=?')->execute($values); }
        $stmt = $db->prepare('SELECT * FROM payment_records WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        Response::json($stmt->fetch());
    }

    public function deletePaymentRecord(array $user, int $id): void {
        if (!Auth::hasPermission($user, 'payroll.process')) Response::forbidden();
        $db   = getDB();
        $stmt = $db->prepare('DELETE FROM payment_records WHERE id=?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() === 0) Response::notFound('Payment record not found');
        Response::noContent();
    }

    private function getSettings(): array {
        $file = SETTINGS_FILE;
        if (file_exists($file)) return json_decode(file_get_contents($file), true) ?? [];
        return ['salaryComponents' => ['basicSalaryPercentage'=>50,'hraPercentage'=>50,'epfPercentage'=>12,'esicPercentage'=>0.75,'professionalTax'=>200]];
    }
}
