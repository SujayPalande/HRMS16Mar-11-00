# HR Connect — SpeedCloud IIS Deployment Guide

## Overview

This folder contains the complete PHP backend for HR Connect, designed to run on SpeedCloud's Windows IIS hosting with PHP + MySQL. The React frontend (built with Vite) is served as static files by IIS, while all `/api/*` requests are handled by the PHP backend.

```
Web Root (public_html / wwwroot)
├── index.html          ← React SPA entry point (from npm run build)
├── assets/             ← Built JS/CSS/images
├── web.config          ← IIS URL rewrite rules  ← Copy from php-backend/
└── api/                ← PHP backend folder
    ├── index.php       ← PHP router (entry point for all API calls)
    ├── config/
    │   └── database.php
    ├── controllers/    ← Business logic
    ├── helpers/        ← Auth, Response, Mail
    ├── setup.php       ← First-time setup (delete after use!)
    └── schema.sql      ← MySQL schema
```

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| PHP         | 8.0 or higher |
| PHP Extensions | PDO, PDO_MySQL, mbstring, openssl, json, session |
| MySQL       | 5.7+ or MariaDB 10.3+ |
| IIS         | 8.5+ with URL Rewrite Module |
| Node.js     | 18+ (build machine only, not on server) |

---

## Step 1 — Build the React Frontend

Run this on your local machine (or CI/CD pipeline):

```bash
npm install
npm run build
```

This creates a `dist/` folder with:
- `dist/index.html` — SPA entry point
- `dist/assets/` — JS, CSS, images

---

## Step 2 — Prepare Files for Upload

Create the following folder structure for upload:

```
upload/
├── index.html          ← from dist/index.html
├── assets/             ← from dist/assets/
├── web.config          ← from php-backend/web.config
└── api/
    ├── index.php
    ├── setup.php
    ├── schema.sql
    ├── config/
    │   └── database.php
    ├── controllers/
    │   ├── AuthController.php
    │   ├── EmployeeController.php
    │   ├── DepartmentController.php
    │   ├── AttendanceController.php
    │   ├── LeaveController.php
    │   ├── HolidayController.php
    │   ├── NotificationController.php
    │   ├── PayrollController.php
    │   ├── ReportController.php
    │   ├── MasterController.php
    │   └── SettingsController.php
    └── helpers/
        ├── Auth.php
        ├── Response.php
        └── Mail.php
```

---

## Step 3 — Create MySQL Database

1. Log in to SpeedCloud Control Panel → **MySQL Databases**
2. Create a new database: `hrconnect`
3. Create a database user with full privileges on `hrconnect`
4. Note down: hostname, database name, username, password

---

## Step 4 — Configure the PHP Backend

Edit `api/config/database.php` OR set environment variables in SpeedCloud:

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | MySQL hostname | `localhost` |
| `DB_NAME` | Database name | `hrconnect` |
| `DB_USER` | Database username | `hrconnect_user` |
| `DB_PASS` | Database password | `your_password` |
| `SESSION_SECRET` | Random secret key (min 32 chars) | `a3f8k2...` |
| `APP_BASE_URL` | Your site URL (no trailing slash) | `https://hr.yourcompany.com` |
| `SMTP_HOST` | SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username/email | `noreply@yourcompany.com` |
| `SMTP_PASS` | SMTP password | `your_app_password` |
| `SMTP_FROM` | From address | `noreply@yourcompany.com` |
| `SMTP_FROM_NAME` | From name | `HR Connect` |

**To set via SpeedCloud Control Panel:**
SpeedCloud → PHP → Environment Variables → Add each key-value pair.

**Alternative — edit config directly (not recommended for production):**
Open `api/config/database.php` and replace the `getenv()` fallback values.

---

## Step 5 — Upload Files

Upload the entire `upload/` folder structure to your **web root** (usually `public_html` or `wwwroot`) via FTP/SFTP or SpeedCloud File Manager.

---

## Step 6 — Import Database Schema & Create Admin

Open your browser and navigate to:
```
https://yourdomain.com/api/setup.php
```

This will:
1. Test the database connection
2. Import the MySQL schema (create all tables)
3. Create the default admin account

**Default credentials:**
- Username: `admin`
- Password: `Admin@1234`

**⚠️ IMPORTANT:** Delete `api/setup.php` from the server immediately after setup!

---

## Step 7 — Verify IIS URL Rewrite

The `web.config` file configures IIS to:
1. Route `/api/*` requests to `api/index.php` (PHP backend)
2. Serve static files (JS, CSS, images) directly
3. Route all other requests to `index.html` (SPA fallback)

If you see 404 errors on `/api/*`:
1. Verify the URL Rewrite module is installed in IIS
2. Check that PHP FastCGI is registered for `.php` files
3. Confirm `web.config` is in the web root directory

---

## Step 8 — Configure the React Frontend API URL

The React frontend uses relative URLs (`/api/...`) which work with the IIS rewrite rules. No frontend changes are needed.

If you deploy to a subdirectory (e.g., `/hrms/`), you need to rebuild the frontend:

```bash
VITE_BASE_PATH=/hrms npm run build
```

And update `web.config` to match the subdirectory.

---

## Troubleshooting

### 500 Internal Server Error
- Check PHP error logs in SpeedCloud → Logs
- Verify all required PHP extensions are enabled (PDO, PDO_MySQL)
- Ensure the `api/config/database.php` has correct credentials

### 401 Unauthorized on all requests
- PHP sessions may not be persisting — verify `session.save_path` is writable
- Check that cookies are being sent (`Access-Control-Allow-Credentials: true`)

### Emails not sending
- Verify SMTP credentials are correct
- For Gmail: use App Password (not your regular Gmail password)
- Enable SMTP in SpeedCloud if required

### Password Migration (from Node.js)
The existing Node.js backend used scrypt for password hashing. The PHP backend uses bcrypt (password_hash). Existing users with scrypt hashes **will not be able to log in** until their password is reset.

**Migration options:**
1. Use `setup.php` to reset the admin password, then have each user reset their own via "Forgot Password"
2. Or re-use the existing PostgreSQL data and re-hash passwords in a migration script

---

## File Permissions (if using Linux/cPanel instead of IIS)

```bash
chmod 755 api/
chmod 644 api/*.php api/config/*.php api/controllers/*.php api/helpers/*.php
chmod 775 data/         # Writable for system-settings.json
```

---

## Security Checklist

- [ ] Delete `api/setup.php` after initial setup
- [ ] Set a strong `SESSION_SECRET` (min 32 random characters)
- [ ] Change default admin password immediately after first login
- [ ] Use HTTPS — SpeedCloud provides free SSL certificates
- [ ] Keep `api/config/database.php` outside web root if possible
- [ ] Disable PHP error display in production (`display_errors = Off`)
- [ ] Set up regular database backups in SpeedCloud

---

## API Endpoints Reference

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/login` | No | Login |
| POST | `/api/logout` | Yes | Logout |
| GET | `/api/user` | Yes | Current user |
| GET | `/api/employees` | Yes | List employees |
| POST | `/api/employees` | Admin/HR | Create employee |
| GET/PUT/DELETE | `/api/employees/:id` | Yes | Employee CRUD |
| POST | `/api/employees/invite` | Admin/HR | Send invitation |
| GET | `/api/invitations/:token` | No | Get invitation |
| POST | `/api/invitations/:token/accept` | No | Accept invitation |
| GET | `/api/departments` | Yes | List departments |
| POST/PUT/DELETE | `/api/departments/:id` | Admin/HR | Department CRUD |
| GET | `/api/attendance` | Yes | Attendance records |
| POST | `/api/attendance` | Yes | Create record |
| POST | `/api/attendance/check-in` | Yes | Check in |
| POST | `/api/attendance/check-out` | Yes | Check out |
| GET | `/api/leave-requests` | Yes | Leave requests |
| POST | `/api/leave-requests` | Yes | Apply for leave |
| PUT/DELETE | `/api/leave-requests/:id` | Yes | Update/cancel leave |
| GET | `/api/holidays` | Yes | Holidays list |
| POST/PUT/DELETE | `/api/holidays/:id` | Admin/HR | Holiday CRUD |
| GET | `/api/notifications` | Yes | Notifications |
| PUT | `/api/notifications/read-all` | Yes | Mark all read |
| POST | `/api/payroll/calculate` | Yes | Calculate payroll |
| GET/POST | `/api/payment-records` | Yes | Payment records |
| GET | `/api/reports/attendance` | Yes | Attendance report |
| GET | `/api/reports/leave` | Yes | Leave report |
| GET/PUT | `/api/settings/system` | Admin | System settings |
| GET/POST | `/api/masters/units` | Yes | Unit masters |
| GET/POST | `/api/masters/banks` | Yes | Bank masters |
| GET/POST | `/api/masters/companies` | Yes | Company masters |
