const { jsPDF } = require("jspdf");
const autoTableModule = require("jspdf-autotable");
const applyPlugin = autoTableModule.default || autoTableModule;
const fs = require("fs");

const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const marginLeft = 15;
const marginRight = 15;
const contentWidth = pageWidth - marginLeft - marginRight;
let y = 20;

function checkPage(needed = 15) {
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    y = 20;
  }
}

function addTitle(text, size = 18) {
  checkPage(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.setTextColor(0, 51, 102);
  doc.text(text, pageWidth / 2, y, { align: "center" });
  y += size * 0.6;
}

function addSubTitle(text, size = 14) {
  checkPage(15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.setTextColor(0, 51, 102);
  doc.text(text, marginLeft, y);
  y += size * 0.5 + 2;
}

function addSubSubTitle(text, size = 11) {
  checkPage(12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(size);
  doc.setTextColor(51, 51, 51);
  doc.text(text, marginLeft, y);
  y += size * 0.5 + 2;
}

function addText(text, indent = 0) {
  checkPage(10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  const lines = doc.splitTextToSize(text, contentWidth - indent);
  lines.forEach((line) => {
    checkPage(6);
    doc.text(line, marginLeft + indent, y);
    y += 5;
  });
}

function addBoldText(text) {
  checkPage(10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  doc.text(text, marginLeft, y);
  y += 6;
}

function addBullet(text, indent = 5) {
  checkPage(8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  doc.text("\u2022", marginLeft + indent, y);
  const lines = doc.splitTextToSize(text, contentWidth - indent - 6);
  lines.forEach((line, i) => {
    checkPage(6);
    doc.text(line, marginLeft + indent + 6, y);
    y += 5;
  });
  y += 1;
}

function addNumbered(num, text, indent = 5) {
  checkPage(8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  doc.text(`${num}.`, marginLeft + indent, y);
  const lines = doc.splitTextToSize(text, contentWidth - indent - 8);
  lines.forEach((line) => {
    checkPage(6);
    doc.text(line, marginLeft + indent + 8, y);
    y += 5;
  });
  y += 1;
}

function addTable(headers, rows) {
  checkPage(20);
  applyPlugin(doc, {
    startY: y,
    head: [headers],
    body: rows,
    margin: { left: marginLeft, right: marginRight },
    styles: { fontSize: 9, cellPadding: 2.5, textColor: [51, 51, 51], lineColor: [200, 200, 200], lineWidth: 0.3 },
    headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 8;
}

function addLine() {
  checkPage(5);
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 5;
}

function addSpace(s = 5) {
  y += s;
}

// ============ COVER PAGE ============
y = 60;
doc.setFont("helvetica", "bold");
doc.setFontSize(28);
doc.setTextColor(0, 51, 102);
doc.text("Statement of Work", pageWidth / 2, y, { align: "center" });
y += 12;
doc.text("(SOW)", pageWidth / 2, y, { align: "center" });
y += 20;

doc.setDrawColor(0, 51, 102);
doc.setLineWidth(1);
doc.line(50, y, pageWidth - 50, y);
y += 15;

doc.setFontSize(18);
doc.text("HR Connect", pageWidth / 2, y, { align: "center" });
y += 10;
doc.setFontSize(14);
doc.setFont("helvetica", "normal");
doc.text("Comprehensive HR Management System", pageWidth / 2, y, { align: "center" });
y += 30;

doc.setFontSize(11);
const metaData = [
  ["Document Version:", "1.0"],
  ["Date:", "02 March 2026"],
  ["Prepared By:", "Cybaem Tech Pvt Ltd"],
  ["Client:", "[Client Name]"],
  ["Project Name:", "HR Connect HRMS"],
];

metaData.forEach(([label, value]) => {
  doc.setFont("helvetica", "bold");
  doc.text(label, 60, y);
  doc.setFont("helvetica", "normal");
  doc.text(value, 105, y);
  y += 8;
});

y += 30;
doc.setFontSize(9);
doc.setTextColor(128, 128, 128);
doc.text("This document is confidential and intended for the named parties only.", pageWidth / 2, y, { align: "center" });
y += 5;
doc.text("Distribution or reproduction without written consent is prohibited.", pageWidth / 2, y, { align: "center" });

// ============ TABLE OF CONTENTS ============
doc.addPage();
y = 20;
addTitle("Table of Contents", 16);
addSpace(5);
const tocItems = [
  "1.  Project Overview",
  "2.  Scope of Work",
  "3.  Technology Stack",
  "4.  Application Modules & Features",
  "5.  Bank API Integration",
  "6.  Hardware Attendance Machine Integration",
  "7.  GPS Location Tracking for Check-In / Check-Out",
  "8.  Offline Attendance with Auto-Sync",
  "9.  Roles & Access Control",
  "10. Deliverables",
  "11. Timeline & Milestones",
  "12. Assumptions & Dependencies",
  "13. Acceptance Criteria",
];
tocItems.forEach((item) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(0, 51, 102);
  doc.text(item, marginLeft + 10, y);
  y += 8;
});

// ============ SECTION 1: PROJECT OVERVIEW ============
doc.addPage();
y = 20;
addTitle("1. Project Overview", 16);
addLine();
addSpace(3);
addText("HR Connect is a comprehensive, web-based Human Resource Management System (HRMS) designed to manage the complete employee lifecycle - from recruitment and onboarding to attendance, payroll, compliance, and performance management.");
addSpace(3);
addText("The system is built to comply with Indian statutory requirements (EPF, ESIC, Professional Tax, MLWF, Bonus Act) and supports multi-unit, multi-department organizational structures.");
addSpace(5);
addBoldText("Key Objectives:");
addSpace(2);
addBullet("Digitize and automate all HR processes across the organization");
addBullet("Ensure accurate and real-time attendance tracking through multiple channels (web, mobile, biometric hardware)");
addBullet("Enable seamless payroll processing with statutory compliance");
addBullet("Provide role-based access control for data security");
addBullet("Integrate with banking systems for salary disbursement");
addBullet("Support offline attendance in areas with limited internet connectivity");

// ============ SECTION 2: SCOPE OF WORK ============
addSpace(8);
addTitle("2. Scope of Work", 16);
addLine();
addSpace(3);
addText("This SOW covers the design, development, deployment, and maintenance of the HR Connect application with the following major areas:");
addSpace(3);
addTable(
  ["Area", "Description"],
  [
    ["Core HRMS Application", "Web-based application with all modules listed in Section 4"],
    ["Bank API Integration", "Salary disbursement via banking APIs (NEFT/IMPS/UPI)"],
    ["Biometric/Hardware Integration", "Auto-sync attendance from biometric/RFID machines"],
    ["GPS Location Tracking", "Geo-tagged check-in and check-out for field employees"],
    ["Offline Attendance", "Attendance marking without internet, with auto-sync on reconnection"],
    ["Statutory Compliance", "PF, ESI, PT, MLWF, Bonus calculations and reporting"],
    ["Reports & Exports", "PDF/Excel reports in government-compliant formats"],
  ]
);

// ============ SECTION 3: TECHNOLOGY STACK ============
addTitle("3. Technology Stack", 16);
addLine();
addSpace(3);
addSubSubTitle("3.1 Languages & Frameworks");
addTable(
  ["Layer", "Technology"],
  [
    ["Frontend", "React.js, TypeScript, Tailwind CSS, shadcn/ui"],
    ["Backend", "PHP (Laravel / Core PHP)"],
    ["Database", "MySQL"],
    ["Authentication", "PHP session-based authentication with bcrypt/password_hash"],
    ["API Architecture", "RESTful APIs"],
    ["PDF Generation", "jsPDF with autoTable plugin (Frontend), TCPDF / Dompdf (Backend)"],
    ["Excel Export", "XLSX / SheetJS (Frontend), PhpSpreadsheet (Backend)"],
    ["Build Tool", "Vite (Frontend)"],
    ["Package Manager", "npm (Frontend), Composer (Backend)"],
    ["Version Control", "Git / GitHub"],
  ]
);

addSubSubTitle("3.2 Third-Party Integrations");
addTable(
  ["Integration", "Purpose"],
  [
    ["PHP Mail (SMTP)", "Email notifications, onboarding invitations, payslip delivery via configured SMTP server"],
    ["GitHub", "Source code management and CI/CD"],
    ["Banking API", "Salary disbursement (NEFT/IMPS/UPI)"],
    ["Biometric SDK", "Attendance hardware integration (ZKTeco, eSSL, BioMax)"],
    ["Google Maps API", "GPS location services for check-in/check-out"],
  ]
);

addSubSubTitle("3.3 Deployment");
addTable(
  ["Environment", "Platform"],
  [
    ["Development", "Local Development Environment"],
    ["Staging", "Staging Server (SpeedCloud)"],
    ["Production", "SpeedCloud (PHP + MySQL) / VPS / Cloud (AWS/Azure)"],
  ]
);

// ============ SECTION 4: APPLICATION MODULES ============
doc.addPage();
y = 20;
addTitle("4. Application Modules & Features", 16);
addLine();
addSpace(3);

addSubSubTitle("4.1 Dashboard");
addTable(
  ["Feature", "Description"],
  [
    ["Executive Dashboard", "Revenue, payroll cost, profit metrics (Admin view)"],
    ["HR Dashboard", "Workforce statistics, attendance overview, pending approvals"],
    ["Manager Dashboard", "Team attendance, leave requests, performance tracking"],
    ["Employee Dashboard", "Personal attendance stats, leave balance, upcoming holidays"],
  ]
);

addSubSubTitle("4.2 Employee Management");
addTable(
  ["Feature", "Description"],
  [
    ["Employee Directory", "Searchable grid/table view of all employees with filters"],
    ["Employee Onboarding", "Multi-step form (Personal, Professional, Bank, Statutory details)"],
    ["Email Invitation", "Send onboarding links via PHP SMTP mailer for new hires to self-register"],
    ["Profile Management", "Edit personal, bank, emergency contact, and document details"],
    ["Department Management", "Create, edit, delete departments with hierarchy"],
    ["Role & Permission Management", "Assign roles (Admin, HR, Manager, Employee, Developer)"],
    ["Document Management", "Upload, store, and manage employee documents (Aadhaar, PAN, etc.)"],
    ["Employee Limit/License", "Configure maximum employee capacity per license"],
  ]
);

addSubSubTitle("4.3 Attendance & Time Management");
addTable(
  ["Feature", "Description"],
  [
    ["Web Check-In/Check-Out", "Real-time attendance clocking via browser"],
    ["Attendance Calendar", "Monthly calendar view with color-coded status indicators"],
    ["Status Tracking", "Present, Absent, Late, Half-Day, On Leave, Holiday"],
    ["Team Attendance", "Manager view for monitoring team attendance"],
    ["Attendance Goals", "Visual progress bars for monthly attendance targets"],
    ["Muster Roll (Form II)", "Government-compliant wage register with PDF/Excel export"],
    ["Shift Management", "Create and assign shifts, rotation scheduling"],
    ["Overtime Tracking", "Track and calculate overtime hours"],
  ]
);

addSubSubTitle("4.4 Leave Management");
addTable(
  ["Feature", "Description"],
  [
    ["Leave Application", "Apply for leave with type, dates, and reason"],
    ["Multi-Level Approval", "Manager > HR approval workflow"],
    ["Leave Balance", "Auto-calculated balances for Annual, Sick, Personal, Casual leave"],
    ["Leave Register (Form 20)", "Statutory leave register with PDF/Excel export"],
    ["Holiday Calendar", "Company holidays and regional holiday management"],
    ["Leave Policy Configuration", "Configurable leave types, carry-forward rules, accrual policies"],
  ]
);

addSubSubTitle("4.5 Payroll Management");
addTable(
  ["Feature", "Description"],
  [
    ["CTC Calculator", "Automatic salary breakdown from CTC (Basic, HRA, DA, etc.)"],
    ["Salary Structure", "Configurable earnings and deduction components"],
    ["Monthly Payroll Processing (Auto)", "Automated bulk payroll run with attendance and leave integration"],
    ["Monthly Payroll Processing (Manual)", "Manual salary entry and adjustment for delayed or partial payments (useful for factories with irregular pay cycles)"],
    ["Payroll Mode Selection", "Admin can choose between Automatic payroll (system-calculated) or Manual payroll (HR-entered amounts) per employee or per month"],
    ["Partial Payment Support", "Process partial salary payments; track pending balances and release remaining amount later"],
    ["Payslip Generation", "Professional PDF payslips with company branding"],
    ["Payslip Delivery", "Email payslips via PHP SMTP mailer"],
    ["Bank Transfer File", "Generate bank-specific files for salary transfers"],
    ["Payroll Reports", "Monthly/annual payroll summaries with PDF/Excel export"],
    ["Salary Revision", "Track and manage salary revisions with effective dates"],
  ]
);

addSubSubTitle("4.6 Statutory Compliance");
addTable(
  ["Feature", "Description"],
  [
    ["Provident Fund (PF)", "12% Employee + 12% Employer contribution, Rs.15,000 ceiling"],
    ["PF ECR File", "Generate ECR text file for EPFO portal upload"],
    ["ESIC", "0.75% Employee + 3.25% Employer, <= Rs.21,000 gross eligibility"],
    ["Professional Tax (PT)", "State-wise slab-based deduction (Maharashtra, Karnataka, etc.)"],
    ["MLWF", "Maharashtra Labour Welfare Fund - half-yearly (June & December)"],
    ["Bonus", "8.33% calculation under Payment of Bonus Act (capped at Rs.7,000)"],
    ["Form 16 / TDS", "Tax deduction at source and Form 16 generation"],
    ["Challan Management", "Upload and track PF/ESI payment challans"],
    ["Compliance Reports", "PF/ESI/PT/MLWF reports with PDF and Excel exports"],
  ]
);

addSubSubTitle("4.7 Recruitment & Onboarding");
addTable(
  ["Feature", "Description"],
  [
    ["Offer Letter Generation", "Templated offer letters with dynamic data"],
    ["Digital Joining", "Online document submission and verification"],
    ["Onboarding Checklist", "Track onboarding steps and progress"],
  ]
);

addSubSubTitle("4.8 Performance Management");
addTable(
  ["Feature", "Description"],
  [
    ["Goals & KPIs", "Set, track, and measure employee goals"],
    ["360 Degree Feedback", "Multi-source feedback from peers, managers, and subordinates"],
    ["Appraisal Cycles", "Periodic performance review management"],
    ["Performance Reports", "Individual and team performance analytics"],
  ]
);

addSubSubTitle("4.9 Training & Development");
addTable(
  ["Feature", "Description"],
  [
    ["Training Calendar", "Schedule and manage training sessions"],
    ["Skill Matrix", "Track employee skills and competencies"],
    ["Certification Tracking", "Manage employee certifications and expiry dates"],
  ]
);

addSubSubTitle("4.10 Expense & Reimbursement");
addTable(
  ["Feature", "Description"],
  [
    ["Expense Claims", "Submit expense claims with receipts"],
    ["Approval Workflow", "Manager/HR approval for reimbursements"],
    ["Reimbursement Reports", "Track and export reimbursement data"],
  ]
);

addSubSubTitle("4.11 Reports & Analytics");
addTable(
  ["Feature", "Description"],
  [
    ["Attendance Reports", "Daily, weekly, monthly attendance with filters (Unit, Department)"],
    ["Leave Reports", "Leave utilization and balance reports"],
    ["Payroll Reports", "Salary registers, bank statements, pay summaries"],
    ["Compliance Reports", "PF/ESI/PT/Bonus statutory reports"],
    ["Performance Reports", "KPI tracking and appraisal reports"],
    ["Custom Exports", "PDF and Excel exports on all report pages"],
  ]
);

addSubSubTitle("4.12 Employee Self-Service");
addTable(
  ["Feature", "Description"],
  [
    ["My Profile", "View and update personal details"],
    ["My Payslips", "Download current and historical payslips"],
    ["My Documents", "Personal document vault"],
    ["My Attendance", "Individual attendance log and calendar view"],
  ]
);

addSubSubTitle("4.13 Master Data Configuration");
addTable(
  ["Feature", "Description"],
  [
    ["Company Setup", "Company name, logo, address, registration details"],
    ["Bank Master", "Bank names and codes for salary processing"],
    ["Department Master", "Department hierarchy configuration"],
    ["Designation Master", "Job titles and designation levels"],
    ["Cost Center", "Cost center management for budget allocation"],
    ["Category Master", "Employee categories (Permanent, Contract, Intern)"],
    ["Sub-Code Configuration", "MLWF, PF, ESI sub-codes for compliance"],
  ]
);

addSubSubTitle("4.14 Notification System");
addTable(
  ["Feature", "Description"],
  [
    ["Real-Time Notifications", "In-app alerts for approvals, updates, and system events"],
    ["Email Notifications", "PHP SMTP-powered email alerts for leave, payroll, onboarding"],
  ]
);

// ============ SECTION 5: BANK API INTEGRATION ============
doc.addPage();
y = 20;
addTitle("5. Bank API Integration", 16);
addLine();
addSpace(3);

addSubSubTitle("5.1 Overview");
addText("The system will integrate with banking APIs to enable direct salary disbursement from the employer's bank account to employee accounts, eliminating manual bank file uploads.");
addSpace(5);

addSubSubTitle("5.2 Supported Payment Modes");
addTable(
  ["Mode", "Description"],
  [
    ["NEFT", "National Electronic Funds Transfer - batch processing"],
    ["RTGS", "Real Time Gross Settlement - for high-value transfers"],
    ["IMPS", "Immediate Payment Service - instant 24x7 transfers"],
    ["UPI", "Unified Payments Interface - for smaller disbursements"],
  ]
);

addSubSubTitle("5.3 Integration Flow");
addSpace(2);
addText("Step-by-step process:");
addSpace(2);
addNumbered(1, "HR processes monthly payroll in HR Connect");
addNumbered(2, "System generates salary disbursement data (employee bank details, amounts)");
addNumbered(3, "HR initiates bulk transfer via the Bank Transfers module");
addNumbered(4, "System sends API request to the banking gateway with: Employer account details, Beneficiary list (employee name, account number, IFSC, amount), Payment mode (NEFT/IMPS/UPI), Narration/Reference number");
addNumbered(5, "Bank processes the payment and returns transaction status");
addNumbered(6, "HR Connect updates payment status in real-time (Success / Failed / Pending)");
addNumbered(7, "Failed transactions are flagged for retry or manual intervention");
addSpace(3);

addSubSubTitle("5.4 Security Measures");
addTable(
  ["Measure", "Description"],
  [
    ["API Authentication", "OAuth 2.0 / API Key + Secret based authentication"],
    ["Encryption", "TLS 1.2+ for all API communication"],
    ["IP Whitelisting", "Bank restricts API access to registered server IPs"],
    ["Two-Factor Authorization", "OTP verification for bulk payment initiation"],
    ["Audit Trail", "Complete log of all payment transactions with timestamps"],
    ["Data Masking", "Account numbers masked in UI (show last 4 digits only)"],
  ]
);

addSubSubTitle("5.5 Bank Compatibility");
addText("The system is designed to integrate with major Indian banks:");
addSpace(2);
addBullet("State Bank of India (SBI)");
addBullet("HDFC Bank");
addBullet("ICICI Bank");
addBullet("Axis Bank");
addBullet("Kotak Mahindra Bank");
addBullet("Yes Bank");
addBullet("Bank of Baroda");
addBullet("Punjab National Bank");
addSpace(2);
addText("Note: Actual integration depends on the bank's API availability and merchant onboarding process.");

// ============ SECTION 6: HARDWARE ATTENDANCE ============
doc.addPage();
y = 20;
addTitle("6. Hardware Attendance Machine Integration", 16);
addLine();
addSpace(3);

addSubSubTitle("6.1 Overview");
addText("The system will integrate with biometric and RFID attendance machines to automatically push attendance data into HR Connect without manual intervention.");
addSpace(5);

addSubSubTitle("6.2 Supported Hardware");
addTable(
  ["Type", "Devices"],
  [
    ["Fingerprint Scanners", "ZKTeco, eSSL, BioMax, Mantra"],
    ["Face Recognition", "ZKTeco SpeedFace, Hikvision"],
    ["RFID/Proximity Card", "eSSL, HID Global"],
    ["Iris Scanners", "IriTech, EyeLock"],
  ]
);

addSubSubTitle("6.3 How It Works");
addSpace(2);
addBoldText("Method 1: Push Mode (Recommended)");
addSpace(2);
addNumbered(1, "Employee scans fingerprint/face/card at the biometric machine");
addNumbered(2, "Machine records timestamp, employee ID, and punch direction (IN/OUT)");
addNumbered(3, "Machine pushes data to the middleware service via HTTP/TCP");
addNumbered(4, "Middleware transforms data into HR Connect API format");
addNumbered(5, "Middleware calls HR Connect Attendance API endpoint");
addNumbered(6, "HR Connect processes the record: Maps device employee ID to HR Connect employee ID, Determines check-in vs check-out based on punch sequence, Calculates working hours automatically, Updates attendance calendar in real-time");
addNumbered(7, "Attendance is immediately visible in the application");
addSpace(3);
addBoldText("Method 2: Pull Mode (Fallback)");
addSpace(2);
addNumbered(1, "Middleware service polls the biometric device at configurable intervals (1-5 minutes)");
addNumbered(2, "Retrieves new punch records since last sync");
addNumbered(3, "Sends batch data to HR Connect API");
addNumbered(4, "HR Connect processes and stores attendance records");
addSpace(3);

addSubSubTitle("6.4 Data Format");
addText("Each attendance record from the hardware device contains:");
addSpace(2);
addTable(
  ["Field", "Description"],
  [
    ["Device Employee ID", "Employee ID registered on the biometric device"],
    ["Punch Time", "Timestamp of the punch (YYYY-MM-DD HH:MM:SS)"],
    ["Punch Type", "IN / OUT"],
    ["Device ID", "Unique identifier of the machine"],
    ["Verify Mode", "Fingerprint / Face / Card / Password"],
    ["Device Location", 'Location name of the machine (e.g., "Main Office Gate 1")'],
  ]
);

addSubSubTitle("6.5 Auto-Sync Features");
addTable(
  ["Feature", "Description"],
  [
    ["Real-Time Sync", "Attendance appears in HR Connect within 1-5 minutes of punch"],
    ["Duplicate Prevention", "System rejects duplicate entries for same employee at same time"],
    ["Multi-Device Support", "Multiple machines across locations sync to single HR Connect instance"],
    ["Employee Mapping", "Device employee IDs mapped to HR Connect employee records"],
    ["Error Logging", "Failed syncs are logged and retried automatically"],
    ["Sync Dashboard", "Admin dashboard showing last sync time, success/failure counts"],
    ["Offline Device Buffering", "Devices store data locally until sync is restored"],
  ]
);

// ============ SECTION 7: GPS LOCATION TRACKING ============
doc.addPage();
y = 20;
addTitle("7. GPS Location Tracking", 16);
addLine();
addSpace(3);

addSubSubTitle("7.1 Overview");
addText("Field employees and remote workers can check in and check out using their mobile devices with automatic GPS location capture. This ensures accountability and tracks work locations in real-time.");
addSpace(5);

addSubSubTitle("7.2 Location Capture Process");
addSpace(2);
addNumbered(1, "Employee opens HR Connect on their mobile browser or PWA");
addNumbered(2, 'Clicks "Check In" button');
addNumbered(3, "Browser requests GPS permission (one-time)");
addNumbered(4, "System captures current location: Latitude and Longitude (high accuracy), Accuracy radius (in meters), Timestamp of capture");
addNumbered(5, "Location is sent to backend along with attendance record");
addNumbered(6, "Backend uses reverse geocoding (Google Maps API) to convert coordinates to a readable address");
addNumbered(7, "HR/Manager can view employee check-in/check-out locations on a map");
addSpace(3);

addSubSubTitle("7.3 Features");
addTable(
  ["Feature", "Description"],
  [
    ["Geo-Fencing", "Define allowed check-in zones (office, client site, etc.); alert if employee checks in from outside the zone"],
    ["Location History", "Complete trail of check-in/check-out locations for each employee"],
    ["Map View", "Interactive map showing all employee locations for the day"],
    ["Address Resolution", "Automatic conversion of GPS coordinates to readable addresses"],
    ["Accuracy Indicator", "Show GPS accuracy level (high/medium/low) for each entry"],
    ["Photo Capture", "Optional selfie with check-in for identity verification"],
    ["Distance Calculation", "Calculate distance between check-in and check-out locations"],
    ["Route Tracking", "For field staff, track the route taken during the day"],
  ]
);

addSubSubTitle("7.4 Geo-Fence Configuration");
addText("Administrators can define geo-fence zones:");
addSpace(2);
addTable(
  ["Setting", "Description"],
  [
    ["Zone Name", "Office, Client Site, Warehouse, etc."],
    ["Center Point", "Latitude and Longitude of the zone center"],
    ["Radius", "Allowed radius in meters (e.g., 100m, 500m, 1km)"],
    ["Allowed Roles", "Which roles can check in from this zone"],
    ["Alert on Violation", "Notify HR/Manager if check-in is outside any defined zone"],
  ]
);

addSubSubTitle("7.5 Privacy & Compliance");
addTable(
  ["Measure", "Description"],
  [
    ["Consent-Based", "Location is captured only on check-in/out action (not continuous tracking)"],
    ["Permission Required", "Browser prompts user for GPS permission"],
    ["Data Retention", "Location data retained as per company policy (configurable)"],
    ["Employee Visibility", "Employees can see their own location history"],
    ["GDPR Compliance", "Location data handling follows privacy regulations"],
  ]
);

// ============ SECTION 8: OFFLINE ATTENDANCE ============
doc.addPage();
y = 20;
addTitle("8. Offline Attendance with Auto-Sync", 16);
addLine();
addSpace(3);

addSubSubTitle("8.1 Overview");
addText("For locations with limited or no internet connectivity (factories, remote sites, underground areas), the system supports offline attendance marking. Data is stored locally on the device and automatically synced to the server when internet connectivity is restored.");
addSpace(5);

addSubSubTitle("8.2 When Internet is NOT Available");
addSpace(2);
addNumbered(1, "Employee opens the HR Connect app (Progressive Web App)");
addNumbered(2, "App detects no internet connectivity automatically");
addNumbered(3, 'UI shows "Offline Mode" indicator (banner/badge)');
addNumbered(4, 'Employee clicks "Check In" or "Check Out"');
addNumbered(5, "System captures: Employee ID, Timestamp (device local time), GPS location (if available offline), Punch type (IN/OUT), Offline flag");
addNumbered(6, "Data is saved to IndexedDB (browser's local database)");
addNumbered(7, 'A visual queue counter shows number of pending sync records (e.g., "2 records pending sync")');
addNumbered(8, "Employee can continue marking attendance multiple times while offline");
addSpace(5);

addSubSubTitle("8.3 When Internet is Restored");
addSpace(2);
addNumbered(1, "App detects internet connectivity via online event listener");
addNumbered(2, "Background Sync (Service Worker) triggers automatically");
addNumbered(3, "Sync service reads all pending records from IndexedDB");
addNumbered(4, "Records are sent to the server in batch via Attendance API");
addNumbered(5, "Server validates each record: Verifies employee exists, Checks for duplicate entries, Validates timestamp is reasonable, Flags records that exceed the allowed offline window");
addNumbered(6, "Server responds with sync status for each record (success/failed/duplicate)");
addNumbered(7, "Successfully synced records are removed from IndexedDB");
addNumbered(8, "Failed records are flagged for manual review");
addNumbered(9, "Employee and HR receive notification of successful sync");
addSpace(3);

addSubSubTitle("8.4 Technical Implementation");
addTable(
  ["Component", "Technology"],
  [
    ["Offline Storage", "IndexedDB (via Dexie.js wrapper)"],
    ["Offline Detection", "navigator.onLine + online/offline event listeners"],
    ["Background Sync", "Service Worker with Background Sync API"],
    ["PWA Support", "Web App Manifest + Service Worker for installable app"],
    ["Conflict Resolution", "Server-side timestamp validation + duplicate detection"],
  ]
);

addSubSubTitle("8.5 Offline Mode Features");
addTable(
  ["Feature", "Description"],
  [
    ["Automatic Detection", "App automatically detects online/offline status"],
    ["Visual Indicator", 'Clear "Offline Mode" banner shown to the user'],
    ["Local Storage", "Attendance data stored securely in browser's IndexedDB"],
    ["Queue Counter", "Shows number of records pending sync"],
    ["Auto-Sync", "Automatic background sync when internet is restored"],
    ["Batch Upload", "All pending records uploaded in a single API call"],
    ["Conflict Handling", "Duplicates detected and rejected; conflicts flagged"],
    ["Retry Logic", "Failed syncs retried automatically (3 attempts with exponential backoff)"],
    ["Data Integrity", "Timestamps from device clock; server validates against allowed window"],
    ["Manual Sync", '"Sync Now" button for forced sync attempt'],
    ["Sync History", "Log of all sync operations (timestamp, records synced, status)"],
  ]
);

addSubSubTitle("8.6 Offline Limitations & Handling");
addTable(
  ["Limitation", "Solution"],
  [
    ["GPS may not work indoors", 'Store "location unavailable" flag; allow manual location entry'],
    ["Device clock may be incorrect", "Server compares device time with server time; flags large discrepancies"],
    ["Browser storage limits", "IndexedDB supports large storage; periodic cleanup of synced data"],
    ["Multiple devices", "Sync merges data by employee ID and timestamp; prevents duplicates"],
  ]
);

// ============ SECTION 9: ROLES & ACCESS CONTROL ============
addTitle("9. Roles & Access Control", 16);
addLine();
addSpace(3);
addTable(
  ["Role", "Access Level"],
  [
    ["Admin", "Full system access - all modules, settings, reports, and configurations"],
    ["HR", "Employee management, payroll, compliance, leave approvals, reports"],
    ["Manager", "Team attendance, leave approvals, performance reviews, team reports"],
    ["Employee", "Self-service only - own profile, attendance, leave, payslips, documents"],
    ["Developer", "Full system access for development and debugging"],
  ]
);

// ============ SECTION 10: DELIVERABLES ============
addTitle("10. Deliverables", 16);
addLine();
addSpace(3);
addTable(
  ["#", "Deliverable", "Format"],
  [
    ["1", "HR Connect Web Application", "Deployed web application"],
    ["2", "Admin Panel", "Part of main application with role-based views"],
    ["3", "Employee Self-Service Portal", "Part of main application"],
    ["4", "Mobile-Responsive PWA", "Progressive Web App for mobile access"],
    ["5", "Bank API Integration Module", "Backend service with payment gateway"],
    ["6", "Biometric Middleware Service", "PHP service for hardware sync"],
    ["7", "GPS Location Tracking Module", "Frontend + Backend with Maps integration"],
    ["8", "Offline Attendance Module", "Service Worker + IndexedDB implementation"],
    ["9", "API Documentation", "Swagger/OpenAPI specification"],
    ["10", "User Manual", "PDF document with screenshots"],
    ["11", "Deployment Guide", "Step-by-step deployment instructions"],
    ["12", "Source Code", "GitHub repository with full version history"],
  ]
);

// ============ SECTION 11: TIMELINE ============
doc.addPage();
y = 20;
addTitle("11. Timeline & Milestones", 16);
addLine();
addSpace(3);
addTable(
  ["Phase", "Milestone", "Duration"],
  [
    ["Phase 1", "Bank API Integration (Salary Disbursement)", "1 week"],
    ["Phase 2", "Hardware Attendance Machine Integration (Biometric Auto-Sync)", "1 week"],
    ["Phase 3", "GPS Location Tracking (Check-In / Check-Out)", "1 week"],
    ["Phase 4", "Offline Attendance & PWA (Auto-Sync on Reconnect)", "0.5 week"],
    ["Phase 5", "Integration Testing, Bug Fixes & UAT", "0.5 week"],
    ["", "Total Estimated Duration", "4 weeks (1 month)"],
  ]
);
addText("Note: Core HRMS modules (Employee Management, Attendance, Leave, Payroll, Statutory Compliance, Reports, Performance, Training, Recruitment, and Self-Service) are already developed and functional. The above timeline covers only the remaining integration work. Phases may overlap where dependencies allow parallel development.");

// ============ SECTION 12: ASSUMPTIONS ============
addSpace(8);
addTitle("12. Assumptions & Dependencies", 16);
addLine();
addSpace(3);

addBoldText("Assumptions:");
addSpace(2);
addNumbered(1, "Client will provide necessary bank API credentials and merchant onboarding documentation");
addNumbered(2, "Biometric hardware devices will be procured by the client");
addNumbered(3, "Client will provide test environment access for bank API sandbox");
addNumbered(4, "Employee data for initial migration will be provided in Excel/CSV format");
addNumbered(5, "Client's IT team will assist with network configuration for biometric device connectivity");
addNumbered(6, "Google Maps API key will be provided/procured for geo-location services");
addNumbered(7, "SSL certificate will be available for production deployment");
addSpace(5);
addBoldText("Dependencies:");
addSpace(2);
addNumbered(1, "Bank API availability and documentation from the chosen banking partner");
addNumbered(2, "Biometric device SDK/API documentation from hardware vendor");
addNumbered(3, "Stable internet connectivity at primary office locations");
addNumbered(4, "Client approval at each milestone before proceeding to the next phase");

// ============ SECTION 13: ACCEPTANCE CRITERIA ============
addSpace(8);
addTitle("13. Acceptance Criteria", 16);
addLine();
addSpace(3);
addTable(
  ["Module", "Criteria"],
  [
    ["Core HRMS", "All employee lifecycle operations functional; role-based access verified"],
    ["Attendance", "Web check-in/out working; calendar view accurate; muster roll exportable"],
    ["Leave", "Leave application, approval, and balance tracking working correctly"],
    ["Payroll", "Salary calculation accurate in both automatic and manual modes; payslips generated; partial payments tracked; statutory deductions correct"],
    ["Bank Integration", "Successful test transaction via API; status updates received in real-time"],
    ["Hardware Sync", "Attendance from biometric device reflected in HR Connect within 5 minutes"],
    ["GPS Tracking", "Location captured on check-in/out; geo-fence alerts functional"],
    ["Offline Attendance", "Attendance marked offline; data synced correctly on reconnection"],
    ["Reports", "All reports exportable to PDF and Excel; data accuracy verified"],
    ["Compliance", "PF ECR file accepted by EPFO portal; ESI data matches statutory format"],
  ]
);

// ============ SIGNATURES ============
addSpace(10);
addTitle("Signatures", 14);
addLine();
addSpace(5);

addTable(
  ["", "Name", "Designation", "Date", "Signature"],
  [
    ["Client", "", "", "", ""],
    ["Provider", "", "Cybaem Tech Pvt Ltd", "", ""],
  ]
);

addSpace(10);
doc.setFontSize(9);
doc.setTextColor(128, 128, 128);
doc.setFont("helvetica", "italic");
checkPage(10);
doc.text("This document is confidential and intended for the named parties only.", pageWidth / 2, y, { align: "center" });
y += 5;
doc.text("Distribution or reproduction without written consent is prohibited.", pageWidth / 2, y, { align: "center" });

// ============ SAVE ============
const output = doc.output("arraybuffer");
fs.writeFileSync("docs/SOW-HR-Connect.pdf", Buffer.from(output));
console.log("PDF generated successfully: docs/SOW-HR-Connect.pdf");
