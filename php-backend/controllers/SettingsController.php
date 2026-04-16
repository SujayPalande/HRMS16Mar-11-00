<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Auth.php';
require_once __DIR__ . '/../helpers/Response.php';

class SettingsController {

    public function get(array $user): void {
        // Any authenticated user should be able to read general system settings
        Response::json($this->read());
    }

    public function update(array $user, array $body): void {
        if (!in_array($user['role'], ['admin', 'developer'])) Response::forbidden('Admin or Developer access required');

        $existing = $this->read();
        $merged   = array_replace_recursive($existing, $body);

        // Basic validation
        if (isset($merged['organizationEmail']) && !filter_var($merged['organizationEmail'], FILTER_VALIDATE_EMAIL)) {
            Response::error('Invalid organization email');
        }
        if (isset($merged['systemLimits']['maxEmployees'])) {
            $max = (int)$merged['systemLimits']['maxEmployees'];
            if ($max < 1 || $max > 1000) Response::error('maxEmployees must be between 1 and 1000');
        }

        $this->write($merged);
        Response::json(['message' => 'Settings updated successfully', 'data' => $merged]);
    }

    private function read(): array {
        $file = SETTINGS_FILE;
        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true);
            if (is_array($data)) return $data;
        }
        return $this->defaults();
    }

    private function write(array $data): void {
        $file = SETTINGS_FILE;
        $dir  = dirname($file);
        if (!is_dir($dir)) mkdir($dir, 0775, true);
        file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    private function defaults(): array {
        return [
            'organizationName'  => 'HR Connect',
            'organizationEmail' => 'admin@hrconnect.com',
            'timeZone'          => 'Asia/Kolkata',
            'dateFormat'        => 'DD/MM/YYYY',
            'workingHours'      => ['start' => '09:00', 'end' => '18:00'],
            'notifications'     => ['email' => true, 'push' => true, 'attendance' => true, 'leave' => true],
            'systemLimits'      => ['maxEmployees' => 10, 'contactEmail' => 'support@hrconnect.com', 'contactPhone' => '+91-0000000000', 'upgradeLink' => 'https://hrconnect.com/upgrade'],
            'salaryComponents'  => ['basicSalaryPercentage' => 50, 'hraPercentage' => 50, 'epfPercentage' => 12, 'esicPercentage' => 0.75, 'professionalTax' => 200],
        ];
    }
}
