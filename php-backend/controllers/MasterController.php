<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';

class MasterController {

    // ── Units ─────────────────────────────────────────────────────────────────

    public function getUnits(): void {
        $db = getDB();
        Response::json($db->query('SELECT * FROM units ORDER BY name')->fetchAll());
    }

    public function createUnit(array $body): void {
        $name = trim($body['name'] ?? '');
        $code = trim($body['code'] ?? '');
        if (!$name || !$code) Response::error("'name' and 'code' are required");
        $db = getDB();
        $db->prepare('INSERT INTO units (name, code, description) VALUES (?,?,?)')->execute([$name, $code, $body['description'] ?? null]);
        $id = (int)$db->lastInsertId();
        $stmt = $db->prepare('SELECT * FROM units WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        Response::json($stmt->fetch(), 201);
    }

    // ── Banks ─────────────────────────────────────────────────────────────────

    public function getBanks(): void {
        $db = getDB();
        Response::json($db->query('SELECT * FROM bank_masters ORDER BY bank_name')->fetchAll());
    }

    public function createBank(array $body): void {
        $bankName = trim($body['bankName'] ?? '');
        $branch   = trim($body['branch']   ?? '');
        if (!$bankName || !$branch) Response::error("'bankName' and 'branch' are required");
        $db = getDB();
        $db->prepare('INSERT INTO bank_masters (bank_name, branch, branch_code, address, account_no, ifsc_code, micr_code) VALUES (?,?,?,?,?,?,?)')
           ->execute([$bankName, $branch, $body['branchCode'] ?? null, $body['address'] ?? null, $body['accountNo'] ?? null, $body['ifscCode'] ?? null, $body['micrCode'] ?? null]);
        $id = (int)$db->lastInsertId();
        $stmt = $db->prepare('SELECT * FROM bank_masters WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        Response::json($stmt->fetch(), 201);
    }

    // ── Categories ────────────────────────────────────────────────────────────

    public function getCategories(): void {
        $db = getDB();
        Response::json($db->query('SELECT * FROM category_masters ORDER BY category_description')->fetchAll());
    }

    public function createCategory(array $body): void {
        $desc  = trim($body['categoryDescription'] ?? '');
        $class = trim($body['class']               ?? '');
        if (!$desc || !$class) Response::error("'categoryDescription' and 'class' are required");
        $db = getDB();
        $db->prepare('INSERT INTO category_masters (category_description, class) VALUES (?,?)')->execute([$desc, $class]);
        $id = (int)$db->lastInsertId();
        $stmt = $db->prepare('SELECT * FROM category_masters WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        Response::json($stmt->fetch(), 201);
    }

    // ── Companies ─────────────────────────────────────────────────────────────

    public function getCompanies(): void {
        $db = getDB();
        Response::json($db->query('SELECT * FROM company_masters ORDER BY company_name')->fetchAll());
    }

    public function createCompany(array $body): void {
        $code = trim($body['companyCode'] ?? '');
        $name = trim($body['companyName'] ?? '');
        if (!$code || !$name) Response::error("'companyCode' and 'companyName' are required");
        $db = getDB();
        $db->prepare(
            'INSERT INTO company_masters (company_code, company_name, address, state, pin_code, regd_no, pfc_code, esic_code, pan_no, tan_no, gst_no, email, nature_of_business, esi_employee_contribution, esi_employer_contribution, pf_employer_contribution)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $code, $name, $body['address'] ?? null, $body['state'] ?? null, $body['pinCode'] ?? null,
            $body['regdNo'] ?? null, $body['pfcCode'] ?? null, $body['esicCode'] ?? null,
            $body['panNo'] ?? null, $body['tanNo'] ?? null, $body['gstNo'] ?? null,
            $body['email'] ?? null, $body['natureOfBusiness'] ?? null,
            $body['esiEmployeeContribution'] ?? null, $body['esiEmployerContribution'] ?? null, $body['pfEmployerContribution'] ?? null
        ]);
        $id = (int)$db->lastInsertId();
        $stmt = $db->prepare('SELECT * FROM company_masters WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        Response::json($stmt->fetch(), 201);
    }

    // ── Cost Centers ──────────────────────────────────────────────────────────

    public function getCostCenters(): void {
        $db = getDB();
        Response::json($db->query('SELECT * FROM cost_centers ORDER BY name')->fetchAll());
    }

    public function createCostCenter(array $body): void {
        $name = trim($body['name'] ?? '');
        if (!$name) Response::error("'name' is required");
        $db = getDB();
        $db->prepare('INSERT INTO cost_centers (name) VALUES (?)')->execute([$name]);
        $id = (int)$db->lastInsertId();
        $stmt = $db->prepare('SELECT * FROM cost_centers WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        Response::json($stmt->fetch(), 201);
    }

    // ── Document Approvals ────────────────────────────────────────────────────

    public function getDocumentApprovals(): void {
        $db = getDB();
        Response::json($db->query('SELECT * FROM document_approvals ORDER BY id')->fetchAll());
    }

    public function createDocumentApproval(array $body): void {
        $docType    = trim($body['documentType'] ?? '');
        $approverId = (int)($body['approverId']  ?? 0);
        if (!$docType || !$approverId) Response::error("'documentType' and 'approverId' are required");
        $db = getDB();
        $db->prepare('INSERT INTO document_approvals (document_type, approver_id, status, remarks) VALUES (?,?,?,?)')
           ->execute([$docType, $approverId, $body['status'] ?? 'pending', $body['remarks'] ?? null]);
        $id = (int)$db->lastInsertId();
        $stmt = $db->prepare('SELECT * FROM document_approvals WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        Response::json($stmt->fetch(), 201);
    }

    // ── Employee Deductions ────────────────────────────────────────────────────

    public function getEmployeeDeductions(): void {
        $db = getDB();
        Response::json($db->query('SELECT * FROM employee_deductions ORDER BY id')->fetchAll());
    }

    public function createEmployeeDeduction(array $body): void {
        $empId  = (int)($body['employeeId']    ?? 0);
        $type   = trim($body['deductionType']  ?? '');
        $amount = (int)($body['amount']        ?? 0);
        $month  = trim($body['month']          ?? '');
        if (!$empId || !$type || !$month) Response::error("'employeeId', 'deductionType', and 'month' are required");
        $db = getDB();
        $db->prepare('INSERT INTO employee_deductions (employee_id, deduction_type, amount, month) VALUES (?,?,?,?)')
           ->execute([$empId, $type, $amount, $month]);
        $id = (int)$db->lastInsertId();
        $stmt = $db->prepare('SELECT * FROM employee_deductions WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        Response::json($stmt->fetch(), 201);
    }
}
