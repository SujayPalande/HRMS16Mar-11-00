# Statement of Work (SOW)

## HR Connect – Comprehensive HR Management System

---

**Document Version:** 1.0
**Date:** 27 February 2026
**Prepared By:** Cybaem Tech Pvt Ltd
**Client:** [Client Name]
**Project Name:** HR Connect HRMS

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Scope of Work](#2-scope-of-work)
3. [Technology Stack](#3-technology-stack)
4. [Application Modules & Features](#4-application-modules--features)
5. [Bank API Integration](#5-bank-api-integration)
6. [Hardware Attendance Machine Integration](#6-hardware-attendance-machine-integration)
7. [GPS Location Tracking for Check-In / Check-Out](#7-gps-location-tracking-for-check-in--check-out)
8. [Offline Attendance with Auto-Sync](#8-offline-attendance-with-auto-sync)
9. [Roles & Access Control](#9-roles--access-control)
10. [Deliverables](#10-deliverables)
11. [Timeline & Milestones](#11-timeline--milestones)
12. [Assumptions & Dependencies](#12-assumptions--dependencies)
13. [Acceptance Criteria](#13-acceptance-criteria)

---

## 1. Project Overview

HR Connect is a comprehensive, web-based Human Resource Management System (HRMS) designed to manage the complete employee lifecycle — from recruitment and onboarding to attendance, payroll, compliance, and performance management.

The system is built to comply with Indian statutory requirements (EPF, ESIC, Professional Tax, MLWF, Bonus Act) and supports multi-unit, multi-department organizational structures.

**Key Objectives:**

- Digitize and automate all HR processes across the organization
- Ensure accurate and real-time attendance tracking through multiple channels (web, mobile, biometric hardware)
- Enable seamless payroll processing with statutory compliance
- Provide role-based access control for data security
- Integrate with banking systems for salary disbursement
- Support offline attendance in areas with limited internet connectivity

---

## 2. Scope of Work

This SOW covers the design, development, deployment, and maintenance of the HR Connect application with the following major areas:

| Area | Description |
|------|-------------|
| Core HRMS Application | Web-based application with all modules listed in Section 4 |
| Bank API Integration | Salary disbursement via banking APIs (NEFT/IMPS/UPI) |
| Biometric/Hardware Integration | Auto-sync attendance from biometric/RFID machines |
| GPS Location Tracking | Geo-tagged check-in and check-out for field employees |
| Offline Attendance | Attendance marking without internet, with auto-sync on reconnection |
| Statutory Compliance | PF, ESI, PT, MLWF, Bonus calculations and reporting |
| Reports & Exports | PDF/Excel reports in government-compliant formats |

---

## 3. Technology Stack

### 3.1 Languages & Frameworks

| Layer | Technology |
|-------|-----------|
| **Frontend** | React.js, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | PHP (Laravel / Core PHP) |
| **Database** | MySQL |
| **Authentication** | PHP session-based authentication with bcrypt/password_hash |
| **API Architecture** | RESTful APIs |
| **PDF Generation** | jsPDF with autoTable plugin (Frontend), TCPDF / Dompdf (Backend) |
| **Excel Export** | XLSX / SheetJS (Frontend), PhpSpreadsheet (Backend) |
| **Build Tool** | Vite (Frontend) |
| **Package Manager** | npm (Frontend), Composer (Backend) |
| **Version Control** | Git / GitHub |

### 3.2 Third-Party Integrations

| Integration | Purpose |
|-------------|---------|
| **PHP Mail (SMTP)** | Email notifications, onboarding invitations, payslip delivery via configured SMTP server |
| **GitHub** | Source code management and CI/CD |
| **Banking API** | Salary disbursement (NEFT/IMPS/UPI) |
| **Biometric SDK** | Attendance hardware integration (ZKTeco, eSSL, BioMax) |
| **Google Maps API** | GPS location services for check-in/check-out |

### 3.3 Deployment

| Environment | Platform |
|-------------|----------|
| Development | Local Development Environment |
| Staging | Staging Server (SpeedCloud) |
| Production | SpeedCloud (PHP + MySQL) / VPS / Cloud (AWS/Azure) |

---

## 4. Application Modules & Features

### 4.1 Dashboard

| Feature | Description |
|---------|-------------|
| Executive Dashboard | Revenue, payroll cost, profit metrics (Admin view) |
| HR Dashboard | Workforce statistics, attendance overview, pending approvals |
| Manager Dashboard | Team attendance, leave requests, performance tracking |
| Employee Dashboard | Personal attendance stats, leave balance, upcoming holidays |

### 4.2 Employee Management

| Feature | Description |
|---------|-------------|
| Employee Directory | Searchable grid/table view of all employees with filters |
| Employee Onboarding | Multi-step form (Personal, Professional, Bank, Statutory details) |
| Email Invitation | Send onboarding links via PHP SMTP mailer for new hires to self-register |
| Profile Management | Edit personal, bank, emergency contact, and document details |
| Department Management | Create, edit, delete departments with hierarchy |
| Role & Permission Management | Assign roles (Admin, HR, Manager, Employee, Developer) |
| Document Management | Upload, store, and manage employee documents (Aadhaar, PAN, etc.) |
| Employee Limit/License | Configure maximum employee capacity per license |

### 4.3 Attendance & Time Management

| Feature | Description |
|---------|-------------|
| Web Check-In/Check-Out | Real-time attendance clocking via browser |
| Attendance Calendar | Monthly calendar view with color-coded status indicators |
| Status Tracking | Present, Absent, Late, Half-Day, On Leave, Holiday |
| Team Attendance | Manager view for monitoring team attendance |
| Attendance Goals | Visual progress bars for monthly attendance targets |
| Muster Roll (Form II) | Government-compliant wage register with PDF/Excel export |
| Shift Management | Create and assign shifts, rotation scheduling |
| Overtime Tracking | Track and calculate overtime hours |

### 4.4 Leave Management

| Feature | Description |
|---------|-------------|
| Leave Application | Apply for leave with type, dates, and reason |
| Multi-Level Approval | Manager → HR approval workflow |
| Leave Balance | Auto-calculated balances for Annual, Sick, Personal, Casual leave |
| Leave Register (Form 20) | Statutory leave register with PDF/Excel export |
| Holiday Calendar | Company holidays and regional holiday management |
| Leave Policy Configuration | Configurable leave types, carry-forward rules, accrual policies |

### 4.5 Payroll Management

| Feature | Description |
|---------|-------------|
| CTC Calculator | Automatic salary breakdown from CTC (Basic, HRA, DA, etc.) |
| Salary Structure | Configurable earnings and deduction components |
| Monthly Payroll Processing (Auto) | Automated bulk payroll run with attendance and leave integration |
| Monthly Payroll Processing (Manual) | Manual salary entry and adjustment for delayed or partial payments (useful for factories with irregular pay cycles) |
| Payroll Mode Selection | Admin can choose between Automatic payroll (system-calculated) or Manual payroll (HR-entered amounts) per employee or per month |
| Partial Payment Support | Process partial salary payments; track pending balances and release remaining amount later |
| Payslip Generation | Professional PDF payslips with company branding |
| Payslip Delivery | Email payslips via PHP SMTP mailer |
| Bank Transfer File | Generate bank-specific files for salary transfers |
| Payroll Reports | Monthly/annual payroll summaries with PDF/Excel export |
| Salary Revision | Track and manage salary revisions with effective dates |

### 4.6 Statutory Compliance

| Feature | Description |
|---------|-------------|
| **Provident Fund (PF)** | 12% Employee + 12% Employer contribution, ₹15,000 ceiling |
| **PF ECR File** | Generate ECR text file for EPFO portal upload |
| **ESIC** | 0.75% Employee + 3.25% Employer, ≤ ₹21,000 gross eligibility |
| **Professional Tax (PT)** | State-wise slab-based deduction (Maharashtra, Karnataka, etc.) |
| **MLWF** | Maharashtra Labour Welfare Fund – half-yearly (June & December) |
| **Bonus** | 8.33% calculation under Payment of Bonus Act (capped at ₹7,000) |
| **Form 16 / TDS** | Tax deduction at source and Form 16 generation |
| **Challan Management** | Upload and track PF/ESI payment challans |
| **Compliance Reports** | PF/ESI/PT/MLWF reports with PDF and Excel exports |

### 4.7 Recruitment & Onboarding

| Feature | Description |
|---------|-------------|
| Offer Letter Generation | Templated offer letters with dynamic data |
| Digital Joining | Online document submission and verification |
| Onboarding Checklist | Track onboarding steps and progress |

### 4.8 Performance Management

| Feature | Description |
|---------|-------------|
| Goals & KPIs | Set, track, and measure employee goals |
| 360° Feedback | Multi-source feedback from peers, managers, and subordinates |
| Appraisal Cycles | Periodic performance review management |
| Performance Reports | Individual and team performance analytics |

### 4.9 Training & Development

| Feature | Description |
|---------|-------------|
| Training Calendar | Schedule and manage training sessions |
| Skill Matrix | Track employee skills and competencies |
| Certification Tracking | Manage employee certifications and expiry dates |

### 4.10 Expense & Reimbursement

| Feature | Description |
|---------|-------------|
| Expense Claims | Submit expense claims with receipts |
| Approval Workflow | Manager/HR approval for reimbursements |
| Reimbursement Reports | Track and export reimbursement data |

### 4.11 Reports & Analytics

| Feature | Description |
|---------|-------------|
| Attendance Reports | Daily, weekly, monthly attendance with filters (Unit, Department) |
| Leave Reports | Leave utilization and balance reports |
| Payroll Reports | Salary registers, bank statements, pay summaries |
| Compliance Reports | PF/ESI/PT/Bonus statutory reports |
| Performance Reports | KPI tracking and appraisal reports |
| Custom Exports | PDF and Excel exports on all report pages |

### 4.12 Employee Self-Service

| Feature | Description |
|---------|-------------|
| My Profile | View and update personal details |
| My Payslips | Download current and historical payslips |
| My Documents | Personal document vault |
| My Attendance | Individual attendance log and calendar view |

### 4.13 Master Data Configuration

| Feature | Description |
|---------|-------------|
| Company Setup | Company name, logo, address, registration details |
| Bank Master | Bank names and codes for salary processing |
| Department Master | Department hierarchy configuration |
| Designation Master | Job titles and designation levels |
| Cost Center | Cost center management for budget allocation |
| Category Master | Employee categories (Permanent, Contract, Intern) |
| Sub-Code Configuration | MLWF, PF, ESI sub-codes for compliance |

### 4.14 Notification System

| Feature | Description |
|---------|-------------|
| Real-Time Notifications | In-app alerts for approvals, updates, and system events |
| Email Notifications | PHP SMTP-powered email alerts for leave, payroll, onboarding |

---

## 5. Bank API Integration

### 5.1 Overview

The system will integrate with banking APIs to enable direct salary disbursement from the employer's bank account to employee accounts, eliminating manual bank file uploads.

### 5.2 Supported Payment Modes

| Mode | Description |
|------|-------------|
| **NEFT** | National Electronic Funds Transfer – batch processing |
| **RTGS** | Real Time Gross Settlement – for high-value transfers |
| **IMPS** | Immediate Payment Service – instant 24x7 transfers |
| **UPI** | Unified Payments Interface – for smaller disbursements |

### 5.3 Integration Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   HR Connect    │────▶│   Bank API       │────▶│  Employee Bank  │
│   Payroll       │     │   Gateway        │     │  Accounts       │
│   Module        │◀────│   (Response)     │◀────│                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**Step-by-step process:**

1. HR processes monthly payroll in HR Connect
2. System generates salary disbursement data (employee bank details, amounts)
3. HR initiates bulk transfer via the Bank Transfers module
4. System sends API request to the banking gateway with:
   - Employer account details
   - Beneficiary list (employee name, account number, IFSC, amount)
   - Payment mode (NEFT/IMPS/UPI)
   - Narration/Reference number
5. Bank processes the payment and returns transaction status
6. HR Connect updates payment status in real-time (Success / Failed / Pending)
7. Failed transactions are flagged for retry or manual intervention

### 5.4 Security Measures

| Measure | Description |
|---------|-------------|
| API Authentication | OAuth 2.0 / API Key + Secret based authentication |
| Encryption | TLS 1.2+ for all API communication |
| IP Whitelisting | Bank restricts API access to registered server IPs |
| Two-Factor Authorization | OTP verification for bulk payment initiation |
| Audit Trail | Complete log of all payment transactions with timestamps |
| Data Masking | Account numbers masked in UI (show last 4 digits only) |

### 5.5 Bank Compatibility

The system is designed to integrate with major Indian banks:

- State Bank of India (SBI)
- HDFC Bank
- ICICI Bank
- Axis Bank
- Kotak Mahindra Bank
- Yes Bank
- Bank of Baroda
- Punjab National Bank

*Note: Actual integration depends on the bank's API availability and merchant onboarding process.*

---

## 6. Hardware Attendance Machine Integration

### 6.1 Overview

The system will integrate with biometric and RFID attendance machines to automatically push attendance data into HR Connect without manual intervention.

### 6.2 Supported Hardware

| Type | Devices |
|------|---------|
| **Fingerprint Scanners** | ZKTeco, eSSL, BioMax, Mantra |
| **Face Recognition** | ZKTeco SpeedFace, Hikvision |
| **RFID/Proximity Card** | eSSL, HID Global |
| **Iris Scanners** | IriTech, EyeLock |

### 6.3 Integration Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Biometric       │     │  Middleware       │     │  HR Connect      │
│  Devices         │────▶│  Service          │────▶│  Server          │
│  (ZKTeco/eSSL)   │     │  (Auto-Push)      │     │  (Attendance API)│
└──────────────────┘     └──────────────────┘     └──────────────────┘
       │                        │                         │
  Employee scans          Middleware polls           Data saved to
  fingerprint/face        device every 1-5 min      database & shown
  at machine              or device pushes data     in attendance module
```

### 6.4 How It Works

**Method 1: Push Mode (Recommended)**

1. Employee scans fingerprint/face/card at the biometric machine
2. Machine records timestamp, employee ID, and punch direction (IN/OUT)
3. Machine pushes data to the middleware service via HTTP/TCP
4. Middleware transforms data into HR Connect API format
5. Middleware calls HR Connect API: `POST /api/attendance/hardware-sync`
6. HR Connect processes the record:
   - Maps device employee ID to HR Connect employee ID
   - Determines check-in vs check-out based on punch sequence
   - Calculates working hours automatically
   - Updates attendance calendar in real-time
7. Attendance is immediately visible in the application

**Method 2: Pull Mode (Fallback)**

1. Middleware service polls the biometric device at configurable intervals (1–5 minutes)
2. Retrieves new punch records since last sync
3. Sends batch data to HR Connect API
4. HR Connect processes and stores attendance records

### 6.5 Data Format

Each attendance record from the hardware device contains:

| Field | Description |
|-------|-------------|
| `deviceEmployeeId` | Employee ID registered on the biometric device |
| `punchTime` | Timestamp of the punch (YYYY-MM-DD HH:MM:SS) |
| `punchType` | IN / OUT |
| `deviceId` | Unique identifier of the machine |
| `verifyMode` | Fingerprint / Face / Card / Password |
| `deviceLocation` | Location name of the machine (e.g., "Main Office Gate 1") |

### 6.6 Auto-Sync Features

| Feature | Description |
|---------|-------------|
| Real-Time Sync | Attendance appears in HR Connect within 1–5 minutes of punch |
| Duplicate Prevention | System rejects duplicate entries for same employee at same time |
| Multi-Device Support | Multiple machines across locations sync to single HR Connect instance |
| Employee Mapping | Device employee IDs mapped to HR Connect employee records |
| Error Logging | Failed syncs are logged and retried automatically |
| Sync Dashboard | Admin dashboard showing last sync time, success/failure counts |
| Offline Device Buffering | Devices store data locally until sync is restored |

---

## 7. GPS Location Tracking for Check-In / Check-Out

### 7.1 Overview

Field employees and remote workers can check in and check out using their mobile devices with automatic GPS location capture. This ensures accountability and tracks work locations in real-time.

### 7.2 How It Works

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Employee        │     │  HR Connect      │     │  HR Connect      │
│  Mobile/Browser  │────▶│  Web App (PWA)   │────▶│  Backend Server  │
│  (GPS Enabled)   │     │  + Geolocation   │     │  + Maps API      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
       │                        │                         │
  Browser requests         Captures lat/long         Stores location,
  location permission      on check-in/out           resolves address,
  from employee            button click              validates geo-fence
```

### 7.3 Location Capture Process

1. Employee opens HR Connect on their mobile browser or PWA
2. Clicks "Check In" button
3. Browser requests GPS permission (one-time)
4. System captures current location:
   - **Latitude** and **Longitude** (high accuracy)
   - **Accuracy radius** (in meters)
   - **Timestamp** of capture
5. Location is sent to backend along with attendance record
6. Backend uses reverse geocoding (Google Maps API) to convert coordinates to a readable address
7. HR/Manager can view employee check-in/check-out locations on a map

### 7.4 Features

| Feature | Description |
|---------|-------------|
| **Geo-Fencing** | Define allowed check-in zones (office, client site, etc.); alert if employee checks in from outside the zone |
| **Location History** | Complete trail of check-in/check-out locations for each employee |
| **Map View** | Interactive map showing all employee locations for the day |
| **Address Resolution** | Automatic conversion of GPS coordinates to readable addresses |
| **Accuracy Indicator** | Show GPS accuracy level (high/medium/low) for each entry |
| **Photo Capture** | Optional selfie with check-in for identity verification |
| **Distance Calculation** | Calculate distance between check-in and check-out locations |
| **Route Tracking** | For field staff, track the route taken during the day |

### 7.5 Geo-Fence Configuration

Administrators can define geo-fence zones:

| Setting | Description |
|---------|-------------|
| Zone Name | Office, Client Site, Warehouse, etc. |
| Center Point | Latitude and Longitude of the zone center |
| Radius | Allowed radius in meters (e.g., 100m, 500m, 1km) |
| Allowed Roles | Which roles can check in from this zone |
| Alert on Violation | Notify HR/Manager if check-in is outside any defined zone |

### 7.6 Privacy & Compliance

| Measure | Description |
|---------|-------------|
| Consent-Based | Location is captured only on check-in/out action (not continuous tracking) |
| Permission Required | Browser prompts user for GPS permission |
| Data Retention | Location data retained as per company policy (configurable) |
| Employee Visibility | Employees can see their own location history |
| GDPR Compliance | Location data handling follows privacy regulations |

---

## 8. Offline Attendance with Auto-Sync

### 8.1 Overview

For locations with limited or no internet connectivity (factories, remote sites, underground areas), the system supports offline attendance marking. Data is stored locally on the device and automatically synced to the server when internet connectivity is restored.

### 8.2 How It Works

```
┌────────────────────────────────────────────────────────────┐
│                    OFFLINE MODE                            │
│                                                            │
│  ┌─────────────┐     ┌─────────────────┐                  │
│  │  Employee    │────▶│  Browser/PWA    │                  │
│  │  Check-In    │     │  (Service       │    NO INTERNET   │
│  │              │     │   Worker +      │    ────────────  │
│  │              │     │   IndexedDB)    │                  │
│  └─────────────┘     └─────────────────┘                  │
│                              │                             │
│                    Stored locally in                       │
│                    IndexedDB / LocalStorage                │
└────────────────────────────────────────────────────────────┘
                               │
                    Internet Restored ↓
┌────────────────────────────────────────────────────────────┐
│                    ONLINE MODE                             │
│                                                            │
│  ┌─────────────────┐     ┌──────────────────┐             │
│  │  Sync Service    │────▶│  HR Connect     │             │
│  │  (Background     │     │  Server          │             │
│  │   Sync Worker)   │     │  (Attendance API)│             │
│  └─────────────────┘     └──────────────────┘             │
│         │                         │                        │
│   Reads queued            Validates & saves               │
│   attendance records      to MySQL                         │
│   from IndexedDB          database                         │
└────────────────────────────────────────────────────────────┘
```

### 8.3 Detailed Flow

**When Internet is NOT Available:**

1. Employee opens the HR Connect app (Progressive Web App)
2. App detects no internet connectivity using `navigator.onLine` API
3. UI shows "Offline Mode" indicator (banner/badge)
4. Employee clicks "Check In" or "Check Out"
5. System captures:
   - Employee ID
   - Timestamp (device local time)
   - GPS location (if available offline)
   - Punch type (IN/OUT)
   - Offline flag: `true`
6. Data is saved to **IndexedDB** (browser's local database)
7. A visual queue counter shows number of pending sync records (e.g., "2 records pending sync")
8. Employee can continue marking attendance multiple times while offline

**When Internet is Restored:**

1. App detects internet connectivity via `online` event listener
2. **Background Sync** (Service Worker) triggers automatically
3. Sync service reads all pending records from IndexedDB
4. Records are sent to the server in batch: `POST /api/attendance/offline-sync`
5. Server validates each record:
   - Verifies employee exists
   - Checks for duplicate entries
   - Validates timestamp is reasonable (not too old)
   - Flags records that exceed the allowed offline window
6. Server responds with sync status for each record (success/failed/duplicate)
7. Successfully synced records are removed from IndexedDB
8. Failed records are flagged for manual review
9. Employee and HR receive notification of successful sync

### 8.4 Technical Implementation

| Component | Technology |
|-----------|-----------|
| **Offline Storage** | IndexedDB (via Dexie.js wrapper) |
| **Offline Detection** | `navigator.onLine` + `online`/`offline` event listeners |
| **Background Sync** | Service Worker with Background Sync API |
| **PWA Support** | Web App Manifest + Service Worker for installable app |
| **Conflict Resolution** | Server-side timestamp validation + duplicate detection |

### 8.5 Offline Mode Features

| Feature | Description |
|---------|-------------|
| **Automatic Detection** | App automatically detects online/offline status |
| **Visual Indicator** | Clear "Offline Mode" banner shown to the user |
| **Local Storage** | Attendance data stored securely in browser's IndexedDB |
| **Queue Counter** | Shows number of records pending sync |
| **Auto-Sync** | Automatic background sync when internet is restored |
| **Batch Upload** | All pending records uploaded in a single API call |
| **Conflict Handling** | Duplicates detected and rejected; conflicts flagged |
| **Retry Logic** | Failed syncs retried automatically (3 attempts with exponential backoff) |
| **Data Integrity** | Timestamps from device clock; server validates against allowed window |
| **Manual Sync** | "Sync Now" button for forced sync attempt |
| **Sync History** | Log of all sync operations (timestamp, records synced, status) |

### 8.6 Offline Limitations & Handling

| Limitation | Solution |
|-----------|----------|
| GPS may not work indoors | Store "location unavailable" flag; allow manual location entry |
| Device clock may be incorrect | Server compares device time with server time; flags large discrepancies |
| Browser storage limits | IndexedDB supports large storage; periodic cleanup of synced data |
| Multiple devices | Sync merges data by employee ID and timestamp; prevents duplicates |

---

## 9. Roles & Access Control

| Role | Access Level |
|------|-------------|
| **Admin** | Full system access – all modules, settings, reports, and configurations |
| **HR** | Employee management, payroll, compliance, leave approvals, reports |
| **Manager** | Team attendance, leave approvals, performance reviews, team reports |
| **Employee** | Self-service only – own profile, attendance, leave, payslips, documents |
| **Developer** | Full system access for development and debugging |

---

## 10. Deliverables

| # | Deliverable | Format |
|---|-------------|--------|
| 1 | HR Connect Web Application | Deployed web application |
| 2 | Admin Panel | Part of main application with role-based views |
| 3 | Employee Self-Service Portal | Part of main application |
| 4 | Mobile-Responsive PWA | Progressive Web App for mobile access |
| 5 | Bank API Integration Module | Backend service with payment gateway |
| 6 | Biometric Middleware Service | PHP service for hardware sync |
| 7 | GPS Location Tracking Module | Frontend + Backend with Maps integration |
| 8 | Offline Attendance Module | Service Worker + IndexedDB implementation |
| 9 | API Documentation | Swagger/OpenAPI specification |
| 10 | User Manual | PDF document with screenshots |
| 11 | Deployment Guide | Step-by-step deployment instructions |
| 12 | Source Code | GitHub repository with full version history |

---

## 11. Timeline & Milestones

| Phase | Milestone | Duration |
|-------|-----------|----------|
| **Phase 1** | Bank API Integration (Salary Disbursement) | 1 week |
| **Phase 2** | Hardware Attendance Machine Integration (Biometric Auto-Sync) | 1 week |
| **Phase 3** | GPS Location Tracking (Check-In / Check-Out) | 1 week |
| **Phase 4** | Offline Attendance & PWA (Auto-Sync on Reconnect) | 0.5 week |
| **Phase 5** | Integration Testing, Bug Fixes & UAT | 0.5 week |
| | **Total Estimated Duration** | **4 weeks (1 month)** |

*Note: Core HRMS modules (Employee Management, Attendance, Leave, Payroll, Statutory Compliance, Reports, Performance, Training, Recruitment, and Self-Service) are already developed and functional. The above timeline covers only the remaining integration work. Phases may overlap where dependencies allow parallel development.*

---

## 12. Assumptions & Dependencies

### Assumptions

1. Client will provide necessary bank API credentials and merchant onboarding documentation
2. Biometric hardware devices will be procured by the client
3. Client will provide test environment access for bank API sandbox
4. Employee data for initial migration will be provided in Excel/CSV format
5. Client's IT team will assist with network configuration for biometric device connectivity
6. Google Maps API key will be provided/procured for geo-location services
7. SSL certificate will be available for production deployment

### Dependencies

1. Bank API availability and documentation from the chosen banking partner
2. Biometric device SDK/API documentation from hardware vendor
3. Stable internet connectivity at primary office locations
4. Client approval at each milestone before proceeding to the next phase

---

## 13. Acceptance Criteria

| Module | Criteria |
|--------|----------|
| Core HRMS | All employee lifecycle operations functional; role-based access verified |
| Attendance | Web check-in/out working; calendar view accurate; muster roll exportable |
| Leave | Leave application, approval, and balance tracking working correctly |
| Payroll | Salary calculation accurate in both automatic and manual modes; payslips generated; partial payments tracked; statutory deductions correct |
| Bank Integration | Successful test transaction via API; status updates received in real-time |
| Hardware Sync | Attendance from biometric device reflected in HR Connect within 5 minutes |
| GPS Tracking | Location captured on check-in/out; geo-fence alerts functional |
| Offline Attendance | Attendance marked offline; data synced correctly on reconnection |
| Reports | All reports exportable to PDF and Excel; data accuracy verified |
| Compliance | PF ECR file accepted by EPFO portal; ESI data matches statutory format |

---

**Signatures**

| | Name | Designation | Date | Signature |
|---|------|------------|------|-----------|
| **Client** | | | | |
| **Provider** | | Cybaem Tech Pvt Ltd | | |

---

*This document is confidential and intended for the named parties only. Distribution or reproduction without written consent is prohibited.*
