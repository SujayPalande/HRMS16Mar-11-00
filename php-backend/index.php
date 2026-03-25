<?php
/**
 * HR Connect — PHP Backend
 * Front-controller / router for SpeedCloud IIS deployment.
 *
 * All /api/* requests are routed here via web.config URL rewriting.
 * Static React assets are served directly by IIS.
 */

declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0'); // Never expose PHP errors to client
ini_set('log_errors',     '1');

// ── Bootstrap ────────────────────────────────────────────────────────────────
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/Auth.php';
require_once __DIR__ . '/helpers/Mail.php';

// ── CORS headers (adjust origins for production) ──────────────────────────────
$allowedOrigin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: {$allowedOrigin}");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Parse request ─────────────────────────────────────────────────────────────
$requestUri    = $_SERVER['REQUEST_URI']    ?? '/';
$requestMethod = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// Strip query string
$path = parse_url($requestUri, PHP_URL_PATH);

// Normalise — remove /api prefix if present (IIS may or may not strip it)
$path = preg_replace('#^/api#', '', $path);
$path = rtrim($path, '/') ?: '/';

// Parse JSON body
$rawBody = file_get_contents('php://input');
$body    = [];
if ($rawBody) {
    $decoded = json_decode($rawBody, true);
    if (json_last_error() === JSON_ERROR_NONE) $body = $decoded;
}

// ── Simple router ─────────────────────────────────────────────────────────────

try {
    route($path, $requestMethod, $body, $_GET);
} catch (Throwable $e) {
    error_log('[Router] Unhandled error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
    Response::serverError($e->getMessage());
}

// ─────────────────────────────────────────────────────────────────────────────
// Route dispatcher
// ─────────────────────────────────────────────────────────────────────────────

function route(string $path, string $method, array $body, array $query): void {

    // Lazy-load controllers
    $dir = __DIR__ . '/controllers/';
    $loadAuth    = fn() => require_once $dir . 'AuthController.php';
    $loadEmp     = fn() => require_once $dir . 'EmployeeController.php';
    $loadDept    = fn() => require_once $dir . 'DepartmentController.php';
    $loadAtt     = fn() => require_once $dir . 'AttendanceController.php';
    $loadLeave   = fn() => require_once $dir . 'LeaveController.php';
    $loadHol     = fn() => require_once $dir . 'HolidayController.php';
    $loadNotif   = fn() => require_once $dir . 'NotificationController.php';
    $loadPayroll = fn() => require_once $dir . 'PayrollController.php';
    $loadReport  = fn() => require_once $dir . 'ReportController.php';
    $loadMaster  = fn() => require_once $dir . 'MasterController.php';
    $loadSetting = fn() => require_once $dir . 'SettingsController.php';

    // ── Auth ────────────────────────────────────────────────────────────────

    if ($path === '/login' && $method === 'POST') {
        $loadAuth(); (new AuthController)->login($body); return;
    }
    if ($path === '/logout' && $method === 'POST') {
        $loadAuth(); $user = Auth::requireAuth(); (new AuthController)->logout($user); return;
    }
    if ($path === '/register' && $method === 'POST') {
        $loadAuth(); (new AuthController)->register($body); return;
    }
    if ($path === '/user' && $method === 'GET') {
        $loadAuth(); $user = Auth::requireAuth(); (new AuthController)->me($user); return;
    }

    // ── Departments ─────────────────────────────────────────────────────────

    if ($path === '/departments' && $method === 'GET') {
        Auth::requireAuth(); $loadDept(); (new DepartmentController)->index(); return;
    }
    if ($path === '/departments' && $method === 'POST') {
        $user = Auth::requireAuth(); Auth::requireRole($user, ['admin','hr','developer']); $loadDept(); (new DepartmentController)->create($body); return;
    }
    if (preg_match('#^/departments/(\d+)/employees$#', $path, $m) && $method === 'GET') {
        $user = Auth::requireAuth(); $loadEmp(); (new EmployeeController)->byDepartment($user, (int)$m[1]); return;
    }
    if (preg_match('#^/departments/(\d+)$#', $path, $m)) {
        Auth::requireAuth(); $loadDept(); $c = new DepartmentController;
        if ($method === 'GET')    { $c->show((int)$m[1]); return; }
        if ($method === 'PUT')    { $c->update((int)$m[1], $body); return; }
        if ($method === 'DELETE') { $c->delete((int)$m[1]); return; }
    }

    // ── Employees ───────────────────────────────────────────────────────────

    if ($path === '/employees/leave-balances' && $method === 'GET') {
        $user = Auth::requireAuth(); $loadEmp(); (new EmployeeController)->allLeaveBalances($user); return;
    }
    if ($path === '/employees/invite' && $method === 'POST') {
        $user = Auth::requireAuth(); $loadEmp(); (new EmployeeController)->invite($user, $body); return;
    }
    if ($path === '/employees' && $method === 'GET') {
        $user = Auth::requireAuth(); $loadEmp(); (new EmployeeController)->index($user); return;
    }
    if ($path === '/employees' && $method === 'POST') {
        $user = Auth::requireAuth(); $loadEmp(); (new EmployeeController)->create($user, $body); return;
    }
    if (preg_match('#^/employees/(\d+)/leave-balance$#', $path, $m) && $method === 'GET') {
        $user = Auth::requireAuth(); $loadEmp(); (new EmployeeController)->leaveBalance($user, (int)$m[1]); return;
    }
    if (preg_match('#^/employees/(\d+)$#', $path, $m)) {
        $user = Auth::requireAuth(); $loadEmp(); $c = new EmployeeController;
        if ($method === 'GET')                      { $c->show($user, (int)$m[1]); return; }
        if ($method === 'PUT' || $method === 'PATCH') { $c->update($user, (int)$m[1], $body); return; }
        if ($method === 'DELETE')                   { $c->delete($user, (int)$m[1]); return; }
    }

    // ── User profile / password ──────────────────────────────────────────────

    if ($path === '/user/profile' && $method === 'PUT') {
        $user = Auth::requireAuth(); $loadEmp(); (new EmployeeController)->updateProfile($user, $body); return;
    }
    if (($path === '/user/change-password' || $path === '/change-password') && ($method === 'POST' || $method === 'PUT')) {
        $user = Auth::requireAuth(); $loadEmp(); (new EmployeeController)->changePassword($user, $body); return;
    }
    if ($path === '/users/permissions' && $method === 'PATCH') {
        $user = Auth::requireAuth(); $loadEmp(); (new EmployeeController)->updatePermissions($user, $body); return;
    }

    // ── Invitations ─────────────────────────────────────────────────────────

    if (preg_match('#^/invitations/([a-f0-9]+)/accept$#', $path, $m) && $method === 'POST') {
        $loadEmp(); (new EmployeeController)->acceptInvitation($m[1], $body); return;
    }
    if (preg_match('#^/invitations/([a-f0-9]+)$#', $path, $m) && $method === 'GET') {
        $loadEmp(); (new EmployeeController)->getInvitation($m[1]); return;
    }

    // ── Attendance ──────────────────────────────────────────────────────────

    if ($path === '/attendance/check-in' && $method === 'POST') {
        $user = Auth::requireAuth(); $loadAtt(); (new AttendanceController)->checkIn($user); return;
    }
    if ($path === '/attendance/check-out' && $method === 'POST') {
        $user = Auth::requireAuth(); $loadAtt(); (new AttendanceController)->checkOut($user); return;
    }
    if ($path === '/attendance/bulk' && $method === 'POST') {
        $user = Auth::requireAuth(); $loadAtt(); (new AttendanceController)->bulk($user, $body); return;
    }
    if ($path === '/attendance' && $method === 'GET') {
        $user = Auth::requireAuth(); $loadAtt(); (new AttendanceController)->index($user, $query); return;
    }
    if ($path === '/attendance' && $method === 'POST') {
        $user = Auth::requireAuth(); $loadAtt(); (new AttendanceController)->create($user, $body); return;
    }
    if (preg_match('#^/attendance/(\d+)$#', $path, $m) && $method === 'PUT') {
        $user = Auth::requireAuth(); $loadAtt(); (new AttendanceController)->update($user, (int)$m[1], $body); return;
    }

    // ── Leave Requests ──────────────────────────────────────────────────────

    if ($path === '/leave-requests/bulk' && $method === 'POST') {
        $user = Auth::requireAuth(); Response::json(['message'=>'Bulk leave upload processed','results'=>['success'=>0,'failed'=>0]]); return;
    }
    if ($path === '/leave-requests' && $method === 'GET') {
        $user = Auth::requireAuth(); $loadLeave(); (new LeaveController)->index($user, $query); return;
    }
    if ($path === '/leave-requests' && $method === 'POST') {
        $user = Auth::requireAuth(); $loadLeave(); (new LeaveController)->create($user, $body); return;
    }
    if (preg_match('#^/leave-requests/(\d+)$#', $path, $m)) {
        $user = Auth::requireAuth(); $loadLeave(); $c = new LeaveController;
        if ($method === 'PUT')    { $c->update($user, (int)$m[1], $body); return; }
        if ($method === 'DELETE') { $c->delete($user, (int)$m[1]); return; }
    }

    // ── Holidays ────────────────────────────────────────────────────────────

    if ($path === '/holidays' && $method === 'GET') {
        Auth::requireAuth(); $loadHol(); (new HolidayController)->index(); return;
    }
    if ($path === '/holidays' && $method === 'POST') {
        Auth::requireAuth(); $loadHol(); (new HolidayController)->create($body); return;
    }
    if (preg_match('#^/holidays/(\d+)$#', $path, $m)) {
        Auth::requireAuth(); $loadHol(); $c = new HolidayController;
        if ($method === 'PUT')    { $c->update((int)$m[1], $body); return; }
        if ($method === 'DELETE') { $c->delete((int)$m[1]); return; }
    }

    // ── Notifications ───────────────────────────────────────────────────────

    if ($path === '/notifications/read-all' && $method === 'PUT') {
        $user = Auth::requireAuth(); $loadNotif(); (new NotificationController)->markAllRead($user); return;
    }
    if ($path === '/notifications/unread' && $method === 'GET') {
        $user = Auth::requireAuth(); $loadNotif(); (new NotificationController)->unread($user); return;
    }
    if ($path === '/notifications' && $method === 'GET') {
        $user = Auth::requireAuth(); $loadNotif(); (new NotificationController)->index($user); return;
    }
    if ($path === '/notifications' && $method === 'POST') {
        $user = Auth::requireAuth(); $loadNotif(); (new NotificationController)->create($user, $body); return;
    }
    if (preg_match('#^/notifications/(\d+)/read$#', $path, $m) && $method === 'PUT') {
        $user = Auth::requireAuth(); $loadNotif(); (new NotificationController)->markRead($user, (int)$m[1]); return;
    }
    if (preg_match('#^/notifications/(\d+)$#', $path, $m) && $method === 'DELETE') {
        $user = Auth::requireAuth(); $loadNotif(); (new NotificationController)->delete($user, (int)$m[1]); return;
    }

    // ── Payroll ─────────────────────────────────────────────────────────────

    if ($path === '/payroll/calculate' && $method === 'POST') {
        $user = Auth::requireAuth(); $loadPayroll(); (new PayrollController)->calculate($user, $body); return;
    }
    if ($path === '/payment-records' && $method === 'GET') {
        $user = Auth::requireAuth(); $loadPayroll(); (new PayrollController)->getPaymentRecords($user, $query); return;
    }
    if ($path === '/payment-records' && $method === 'POST') {
        $user = Auth::requireAuth(); $loadPayroll(); (new PayrollController)->createPaymentRecord($user, $body); return;
    }
    if (preg_match('#^/payment-records/(\d+)$#', $path, $m)) {
        $user = Auth::requireAuth(); $loadPayroll(); $c = new PayrollController;
        if ($method === 'PUT')    { $c->updatePaymentRecord($user, (int)$m[1], $body); return; }
        if ($method === 'DELETE') { $c->deletePaymentRecord($user, (int)$m[1]); return; }
    }

    // ── Reports ─────────────────────────────────────────────────────────────

    if ($path === '/reports/attendance' && $method === 'GET') {
        $user = Auth::requireAuth(); $loadReport(); (new ReportController)->attendance($user, $query); return;
    }
    if ($path === '/reports/leave' && $method === 'GET') {
        $user = Auth::requireAuth(); $loadReport(); (new ReportController)->leave($user, $query); return;
    }

    // ── Settings ────────────────────────────────────────────────────────────

    if ($path === '/settings/system' && $method === 'GET') {
        $user = Auth::requireAuth(); $loadSetting(); (new SettingsController)->get($user); return;
    }
    if ($path === '/settings/system' && $method === 'PUT') {
        $user = Auth::requireAuth(); $loadSetting(); (new SettingsController)->update($user, $body); return;
    }

    // ── Masters ─────────────────────────────────────────────────────────────

    if (str_starts_with($path, '/masters')) {
        Auth::requireAuth(); $loadMaster(); $c = new MasterController;
        match(true) {
            $path === '/masters/units'               && $method === 'GET'  => $c->getUnits(),
            $path === '/masters/units'               && $method === 'POST' => $c->createUnit($body),
            $path === '/masters/banks'               && $method === 'GET'  => $c->getBanks(),
            $path === '/masters/banks'               && $method === 'POST' => $c->createBank($body),
            $path === '/masters/categories'          && $method === 'GET'  => $c->getCategories(),
            $path === '/masters/categories'          && $method === 'POST' => $c->createCategory($body),
            $path === '/masters/companies'           && $method === 'GET'  => $c->getCompanies(),
            $path === '/masters/companies'           && $method === 'POST' => $c->createCompany($body),
            $path === '/masters/cost-centers'        && $method === 'GET'  => $c->getCostCenters(),
            $path === '/masters/cost-centers'        && $method === 'POST' => $c->createCostCenter($body),
            $path === '/masters/document-approvals'  && $method === 'GET'  => $c->getDocumentApprovals(),
            $path === '/masters/document-approvals'  && $method === 'POST' => $c->createDocumentApproval($body),
            $path === '/masters/employee-deductions' && $method === 'GET'  => $c->getEmployeeDeductions(),
            $path === '/masters/employee-deductions' && $method === 'POST' => $c->createEmployeeDeduction($body),
            default => Response::notFound("Master endpoint not found: {$path}")
        };
        return;
    }

    // ── 404 ─────────────────────────────────────────────────────────────────
    Response::notFound("API endpoint not found: {$method} {$path}");
}
