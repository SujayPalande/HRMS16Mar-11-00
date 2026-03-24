const fs = require('fs');
const path = require('path');

const PASSWORD_HASH = '3c8a0cb4a9d8dad59971b43e2391955baf3f051b82f9e751c2eec666ed702c898bb05c67708a74fc08ef82ce04f973fd905e4a7d5c618f1604389e650b56fc65.5ffd1ee9d5cb63db47761f9f9dba20da';

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────
// Cybaem Tech Pvt Ltd  → dept IDs 1–5
// Nexora Solutions Pvt Ltd → dept IDs 6–11

const departments = [
  { id: 1, name: 'Human Resources',     description: 'Manages hiring, employee relations and policies',                company: 'Cybaem Tech Pvt Ltd' },
  { id: 2, name: 'Engineering',         description: 'Software development and product engineering',                   company: 'Cybaem Tech Pvt Ltd' },
  { id: 3, name: 'Finance',             description: 'Financial planning, accounting and compliance',                  company: 'Cybaem Tech Pvt Ltd' },
  { id: 4, name: 'Marketing',           description: 'Brand strategy, campaigns and market research',                  company: 'Cybaem Tech Pvt Ltd' },
  { id: 5, name: 'Operations',          description: 'Business operations, logistics and process management',          company: 'Cybaem Tech Pvt Ltd' },
  { id: 6, name: 'Engineering',         description: 'Core software development and infrastructure',                   company: 'Nexora Solutions Pvt Ltd' },
  { id: 7, name: 'HR & Administration', description: 'People operations and office administration',                    company: 'Nexora Solutions Pvt Ltd' },
  { id: 8, name: 'Sales',               description: 'Revenue generation, client acquisition and partnerships',        company: 'Nexora Solutions Pvt Ltd' },
  { id: 9, name: 'Finance & Accounts',  description: 'Accounting, payroll and financial reporting',                    company: 'Nexora Solutions Pvt Ltd' },
  { id: 10, name: 'Product Management', description: 'Product roadmap, design and delivery',                          company: 'Nexora Solutions Pvt Ltd' },
  { id: 11, name: 'Customer Success',   description: 'Client onboarding, support and retention',                      company: 'Nexora Solutions Pvt Ltd' },
];

// ─── EMPLOYEE DEFINITIONS ─────────────────────────────────────────────────────
// id, firstName, lastName, role, departmentId, position, salary, gender, joinDate, dob, city, phone, maritalStatus, reportingTo(id), company prefix
const employeeDefs = [
  // ── CYBAEM TECH PVT LTD (IDs 1–20) ────────────────────────────────────────
  { id:1,  f:'Navnath',   l:'Kshirsagar', role:'admin',    deptId:1,  pos:'Chief Executive Officer',        sal:250000, gen:'Male',   join:'2022-04-01', dob:'1980-05-12', city:'Pune',      phone:'9876500001', ms:'Married',  rt:null, co:'CYB' },
  { id:2,  f:'Nikita',    l:'Nagargoje',  role:'hr',       deptId:1,  pos:'HR Manager',                     sal:85000,  gen:'Female', join:'2022-05-15', dob:'1990-08-23', city:'Pune',      phone:'9876500002', ms:'Single',   rt:1,    co:'CYB' },
  { id:3,  f:'Ganesh',    l:'Kale',       role:'hr',       deptId:1,  pos:'HR Executive',                   sal:45000,  gen:'Male',   join:'2023-02-01', dob:'1995-03-11', city:'Nashik',    phone:'9876500003', ms:'Single',   rt:2,    co:'CYB' },
  { id:4,  f:'Priya',     l:'Desai',      role:'hr',       deptId:1,  pos:'Recruiter',                      sal:40000,  gen:'Female', join:'2023-06-10', dob:'1997-07-19', city:'Pune',      phone:'9876500004', ms:'Single',   rt:2,    co:'CYB' },
  { id:5,  f:'Amit',      l:'Sharma',     role:'manager',  deptId:2,  pos:'Engineering Manager',            sal:130000, gen:'Male',   join:'2022-06-01', dob:'1985-11-04', city:'Mumbai',    phone:'9876500005', ms:'Married',  rt:1,    co:'CYB' },
  { id:6,  f:'Sujay',     l:'Palande',    role:'employee', deptId:2,  pos:'Senior Software Engineer',       sal:95000,  gen:'Male',   join:'2022-09-15', dob:'1992-02-17', city:'Pune',      phone:'9876500006', ms:'Married',  rt:5,    co:'CYB' },
  { id:7,  f:'Deepa',     l:'Nair',       role:'employee', deptId:2,  pos:'Software Engineer',              sal:75000,  gen:'Female', join:'2023-03-20', dob:'1996-09-08', city:'Pune',      phone:'9876500007', ms:'Single',   rt:5,    co:'CYB' },
  { id:8,  f:'Rohit',     l:'Patil',      role:'employee', deptId:2,  pos:'Junior Software Engineer',       sal:55000,  gen:'Male',   join:'2024-01-10', dob:'1999-12-25', city:'Satara',    phone:'9876500008', ms:'Single',   rt:5,    co:'CYB' },
  { id:9,  f:'Snehal',    l:'More',       role:'employee', deptId:2,  pos:'QA Engineer',                   sal:60000,  gen:'Female', join:'2023-07-01', dob:'1995-04-30', city:'Pune',      phone:'9876500009', ms:'Single',   rt:5,    co:'CYB' },
  { id:10, f:'Vinay',     l:'Shinde',     role:'manager',  deptId:3,  pos:'Finance Manager',                sal:100000, gen:'Male',   join:'2022-08-01', dob:'1983-06-22', city:'Pune',      phone:'9876500010', ms:'Married',  rt:1,    co:'CYB' },
  { id:11, f:'Pooja',     l:'Kulkarni',   role:'employee', deptId:3,  pos:'Senior Accountant',              sal:65000,  gen:'Female', join:'2022-11-01', dob:'1988-10-14', city:'Pune',      phone:'9876500011', ms:'Married',  rt:10,   co:'CYB' },
  { id:12, f:'Suresh',    l:'Jadhav',     role:'employee', deptId:3,  pos:'Accounts Executive',             sal:45000,  gen:'Male',   join:'2023-04-15', dob:'1994-01-06', city:'Kolhapur',  phone:'9876500012', ms:'Single',   rt:10,   co:'CYB' },
  { id:13, f:'Meera',     l:'Joshi',      role:'manager',  deptId:4,  pos:'Marketing Manager',              sal:95000,  gen:'Female', join:'2022-07-01', dob:'1987-03-28', city:'Mumbai',    phone:'9876500013', ms:'Married',  rt:1,    co:'CYB' },
  { id:14, f:'Akash',     l:'Bhandari',   role:'employee', deptId:4,  pos:'Digital Marketing Executive',    sal:50000,  gen:'Male',   join:'2023-01-15', dob:'1996-08-05', city:'Pune',      phone:'9876500014', ms:'Single',   rt:13,   co:'CYB' },
  { id:15, f:'Tanvi',     l:'Pawar',      role:'employee', deptId:4,  pos:'Content Writer',                 sal:42000,  gen:'Female', join:'2023-08-01', dob:'1998-02-14', city:'Pune',      phone:'9876500015', ms:'Single',   rt:13,   co:'CYB' },
  { id:16, f:'Rajesh',    l:'Yadav',      role:'manager',  deptId:5,  pos:'Operations Manager',             sal:90000,  gen:'Male',   join:'2022-06-15', dob:'1984-07-18', city:'Pune',      phone:'9876500016', ms:'Married',  rt:1,    co:'CYB' },
  { id:17, f:'Lata',      l:'Gaikwad',    role:'employee', deptId:5,  pos:'Operations Executive',           sal:48000,  gen:'Female', join:'2023-05-01', dob:'1993-11-22', city:'Pune',      phone:'9876500017', ms:'Single',   rt:16,   co:'CYB' },
  { id:18, f:'Prathamesh',l:'Mane',       role:'employee', deptId:5,  pos:'Logistics Coordinator',          sal:44000,  gen:'Male',   join:'2023-09-15', dob:'1997-05-09', city:'Aurangabad',phone:'9876500018', ms:'Single',   rt:16,   co:'CYB' },
  { id:19, f:'Ashwini',   l:'Sawant',     role:'employee', deptId:2,  pos:'DevOps Engineer',                sal:80000,  gen:'Female', join:'2023-11-01', dob:'1994-09-17', city:'Pune',      phone:'9876500019', ms:'Married',  rt:5,    co:'CYB' },
  { id:20, f:'Kunal',     l:'Mehta',      role:'employee', deptId:3,  pos:'Tax Analyst',                    sal:52000,  gen:'Male',   join:'2024-03-01', dob:'1998-06-30', city:'Nagpur',    phone:'9876500020', ms:'Single',   rt:10,   co:'CYB' },

  // ── NEXORA SOLUTIONS PVT LTD (IDs 21–50) ──────────────────────────────────
  { id:21, f:'Arjun',     l:'Reddy',      role:'admin',    deptId:7,  pos:'Managing Director',              sal:300000, gen:'Male',   join:'2021-01-01', dob:'1978-03-15', city:'Hyderabad', phone:'9876500021', ms:'Married',  rt:null, co:'NXR' },
  { id:22, f:'Kavitha',   l:'Rao',        role:'hr',       deptId:7,  pos:'Head of HR',                     sal:110000, gen:'Female', join:'2021-03-01', dob:'1983-09-07', city:'Hyderabad', phone:'9876500022', ms:'Married',  rt:21,   co:'NXR' },
  { id:23, f:'Sunil',     l:'Varma',      role:'hr',       deptId:7,  pos:'HR Generalist',                  sal:52000,  gen:'Male',   join:'2022-01-10', dob:'1994-06-19', city:'Hyderabad', phone:'9876500023', ms:'Single',   rt:22,   co:'NXR' },
  { id:24, f:'Ananya',    l:'Krishnan',   role:'hr',       deptId:7,  pos:'Talent Acquisition Specialist',  sal:48000,  gen:'Female', join:'2022-04-01', dob:'1996-12-03', city:'Bangalore', phone:'9876500024', ms:'Single',   rt:22,   co:'NXR' },
  { id:25, f:'Vijay',     l:'Menon',      role:'manager',  deptId:6,  pos:'VP of Engineering',              sal:200000, gen:'Male',   join:'2021-02-01', dob:'1980-01-25', city:'Hyderabad', phone:'9876500025', ms:'Married',  rt:21,   co:'NXR' },
  { id:26, f:'Harish',    l:'Babu',       role:'employee', deptId:6,  pos:'Lead Engineer',                  sal:140000, gen:'Male',   join:'2021-06-15', dob:'1987-04-12', city:'Hyderabad', phone:'9876500026', ms:'Married',  rt:25,   co:'NXR' },
  { id:27, f:'Preethi',   l:'Subramaniam',role:'employee', deptId:6,  pos:'Senior Backend Engineer',        sal:115000, gen:'Female', join:'2021-09-01', dob:'1990-07-28', city:'Hyderabad', phone:'9876500027', ms:'Single',   rt:25,   co:'NXR' },
  { id:28, f:'Kiran',     l:'Naik',       role:'employee', deptId:6,  pos:'Frontend Engineer',              sal:95000,  gen:'Male',   join:'2022-02-01', dob:'1993-10-16', city:'Pune',      phone:'9876500028', ms:'Single',   rt:25,   co:'NXR' },
  { id:29, f:'Divya',     l:'Iyer',       role:'employee', deptId:6,  pos:'Full Stack Developer',           sal:90000,  gen:'Female', join:'2022-07-10', dob:'1995-02-22', city:'Hyderabad', phone:'9876500029', ms:'Single',   rt:25,   co:'NXR' },
  { id:30, f:'Manoj',     l:'Pillai',     role:'manager',  deptId:8,  pos:'Sales Director',                 sal:175000, gen:'Male',   join:'2021-04-01', dob:'1979-08-30', city:'Chennai',   phone:'9876500030', ms:'Married',  rt:21,   co:'NXR' },
  { id:31, f:'Sowmya',    l:'Chandran',   role:'employee', deptId:8,  pos:'Key Account Manager',            sal:85000,  gen:'Female', join:'2021-08-15', dob:'1988-05-17', city:'Chennai',   phone:'9876500031', ms:'Married',  rt:30,   co:'NXR' },
  { id:32, f:'Nikhil',    l:'Shetty',     role:'employee', deptId:8,  pos:'Business Development Executive', sal:60000,  gen:'Male',   join:'2022-03-01', dob:'1994-11-08', city:'Mangalore', phone:'9876500032', ms:'Single',   rt:30,   co:'NXR' },
  { id:33, f:'Reshma',    l:'Patel',      role:'employee', deptId:8,  pos:'Sales Executive',                sal:52000,  gen:'Female', join:'2022-09-01', dob:'1997-01-15', city:'Hyderabad', phone:'9876500033', ms:'Single',   rt:30,   co:'NXR' },
  { id:34, f:'Tarun',     l:'Kapoor',     role:'employee', deptId:8,  pos:'Inside Sales Representative',    sal:45000,  gen:'Male',   join:'2023-02-15', dob:'1998-09-21', city:'Delhi',     phone:'9876500034', ms:'Single',   rt:30,   co:'NXR' },
  { id:35, f:'Sneha',     l:'Ghosh',      role:'manager',  deptId:9,  pos:'CFO',                            sal:220000, gen:'Female', join:'2021-01-15', dob:'1977-12-10', city:'Kolkata',   phone:'9876500035', ms:'Married',  rt:21,   co:'NXR' },
  { id:36, f:'Ramesh',    l:'Agarwal',    role:'employee', deptId:9,  pos:'Senior Finance Analyst',         sal:80000,  gen:'Male',   join:'2021-07-01', dob:'1986-03-24', city:'Hyderabad', phone:'9876500036', ms:'Married',  rt:35,   co:'NXR' },
  { id:37, f:'Lalitha',   l:'Nambiar',    role:'employee', deptId:9,  pos:'Accounts Manager',               sal:70000,  gen:'Female', join:'2022-01-20', dob:'1990-06-05', city:'Kochi',     phone:'9876500037', ms:'Single',   rt:35,   co:'NXR' },
  { id:38, f:'Abhinav',   l:'Gupta',      role:'employee', deptId:9,  pos:'Payroll Specialist',             sal:55000,  gen:'Male',   join:'2022-06-01', dob:'1995-08-27', city:'Hyderabad', phone:'9876500038', ms:'Single',   rt:35,   co:'NXR' },
  { id:39, f:'Aarti',     l:'Shah',       role:'manager',  deptId:10, pos:'Chief Product Officer',          sal:210000, gen:'Female', join:'2021-02-15', dob:'1981-11-18', city:'Mumbai',    phone:'9876500039', ms:'Married',  rt:21,   co:'NXR' },
  { id:40, f:'Siddharth', l:'Rao',        role:'employee', deptId:10, pos:'Senior Product Manager',         sal:130000, gen:'Male',   join:'2021-05-01', dob:'1985-07-09', city:'Hyderabad', phone:'9876500040', ms:'Married',  rt:39,   co:'NXR' },
  { id:41, f:'Hema',      l:'Venkat',     role:'employee', deptId:10, pos:'Product Manager',                sal:100000, gen:'Female', join:'2022-01-01', dob:'1991-04-14', city:'Hyderabad', phone:'9876500041', ms:'Single',   rt:39,   co:'NXR' },
  { id:42, f:'Praveen',   l:'Kumar',      role:'employee', deptId:10, pos:'Associate Product Manager',      sal:75000,  gen:'Male',   join:'2022-10-01', dob:'1996-02-28', city:'Bangalore', phone:'9876500042', ms:'Single',   rt:39,   co:'NXR' },
  { id:43, f:'Nandita',   l:'Bose',       role:'employee', deptId:10, pos:'UX Designer',                   sal:80000,  gen:'Female', join:'2022-12-01', dob:'1994-10-31', city:'Hyderabad', phone:'9876500043', ms:'Single',   rt:39,   co:'NXR' },
  { id:44, f:'Raghav',    l:'Sharma',     role:'manager',  deptId:11, pos:'Head of Customer Success',       sal:145000, gen:'Male',   join:'2021-03-15', dob:'1982-05-06', city:'Hyderabad', phone:'9876500044', ms:'Married',  rt:21,   co:'NXR' },
  { id:45, f:'Padmini',   l:'Rajan',      role:'employee', deptId:11, pos:'Senior Customer Success Manager',sal:75000,  gen:'Female', join:'2021-07-01', dob:'1989-09-11', city:'Chennai',   phone:'9876500045', ms:'Single',   rt:44,   co:'NXR' },
  { id:46, f:'Gautam',    l:'Tiwari',     role:'employee', deptId:11, pos:'Customer Success Manager',       sal:62000,  gen:'Male',   join:'2022-02-14', dob:'1993-03-07', city:'Hyderabad', phone:'9876500046', ms:'Single',   rt:44,   co:'NXR' },
  { id:47, f:'Shruti',    l:'Mishra',     role:'employee', deptId:11, pos:'Customer Success Executive',     sal:48000,  gen:'Female', join:'2022-07-01', dob:'1997-07-20', city:'Lucknow',   phone:'9876500047', ms:'Single',   rt:44,   co:'NXR' },
  { id:48, f:'Aditya',    l:'Verma',      role:'employee', deptId:11, pos:'Support Analyst',                sal:42000,  gen:'Male',   join:'2023-01-02', dob:'1998-04-13', city:'Hyderabad', phone:'9876500048', ms:'Single',   rt:44,   co:'NXR' },
  { id:49, f:'Bhavana',   l:'Singh',      role:'employee', deptId:11, pos:'Onboarding Specialist',          sal:45000,  gen:'Female', join:'2023-05-15', dob:'1998-11-26', city:'Patna',     phone:'9876500049', ms:'Single',   rt:44,   co:'NXR' },
  { id:50, f:'Vikram',    l:'Jain',       role:'employee', deptId:6,  pos:'Data Engineer',                  sal:105000, gen:'Male',   join:'2023-08-01', dob:'1992-01-09', city:'Hyderabad', phone:'9876500050', ms:'Married',  rt:25,   co:'NXR' },
];

// ─── BANKS ────────────────────────────────────────────────────────────────────
const banks = [
  { name:'HDFC Bank',     ifsc:'HDFC0001234' },
  { name:'ICICI Bank',    ifsc:'ICIC0002345' },
  { name:'State Bank of India', ifsc:'SBIN0003456' },
  { name:'Axis Bank',     ifsc:'UTIB0004567' },
  { name:'Kotak Mahindra Bank', ifsc:'KKBK0005678' },
  { name:'Bank of Baroda',ifsc:'BARB0006789' },
];

function bank(id) { return banks[id % banks.length]; }

// ─── BUILD USERS ─────────────────────────────────────────────────────────────
const users = employeeDefs.map(e => {
  const b = bank(e.id);
  const username = `${e.f.toLowerCase().replace(/\s/,'')}${e.id}`;
  const emailDomain = e.co === 'CYB' ? 'cybaemtech.com' : 'nexorasolutions.com';
  const empIdPrefix = e.co;
  const empId = `${empIdPrefix}2026${e.id.toString().padStart(2,'0')}`;
  const accNum = `50100${String(e.id).padStart(9,'0')}`;
  const pan = `ABX${String(e.id).padStart(4,'0')}P`;
  const aadhaar = `${String(e.id * 1234 % 9999).padStart(4,'0')} ${String(e.id * 5678 % 9999).padStart(4,'0')} ${String(e.id * 9012 % 9999).padStart(4,'0')}`;

  return {
    id: e.id,
    username,
    password: PASSWORD_HASH,
    email: `${e.f.toLowerCase()}.${e.l.toLowerCase()}@${emailDomain}`,
    firstName: e.f,
    lastName: e.l,
    role: e.role,
    departmentId: e.deptId,
    position: e.pos,
    salary: e.sal,
    isActive: true,
    joinDate: new Date(e.join + 'T09:00:00.000Z').toISOString(),
    status: 'active',
    employeeId: empId,
    workLocation: e.city,
    phoneNumber: e.phone,
    address: `${e.city}, ${e.co === 'CYB' ? 'Maharashtra' : 'Telangana'}`,
    gender: e.gen,
    maritalStatus: e.ms,
    dateOfBirth: new Date(e.dob + 'T00:00:00.000Z').toISOString(),
    reportingTo: e.rt,
    bankName: b.name,
    bankAccountNumber: accNum,
    bankAccountHolderName: `${e.f} ${e.l}`,
    bankIFSCCode: b.ifsc,
    bankAccountType: 'savings',
    panCard: `${pan}${e.co}`,
    aadhaarCard: aadhaar,
    photoUrl: '',
    customPermissions: [],
    documents: [],
  };
});

// ─── ATTENDANCE RECORDS ───────────────────────────────────────────────────────
// Generate for Oct 2025 – Mar 2026 (working days Mon-Fri)
function getWorkingDays(year, month) {
  const days = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d);
    const dow = dt.getDay();
    if (dow !== 0 && dow !== 6) days.push(dt);
  }
  return days;
}

const months = [
  [2025, 10], [2025, 11], [2025, 12],
  [2026, 1],  [2026, 2],  [2026, 3],
];

const statusOptions = ['present','present','present','present','present','present','present','present','late','halfday'];
const leaveMonths = {}; // userId -> Set of date strings on leave

let attId = 1;
const attendanceRecords = [];

function isoDate(d, hour=9, min=0) {
  const dt = new Date(d);
  dt.setUTCHours(hour, min, 0, 0);
  return dt.toISOString();
}

for (const [yr, mo] of months) {
  const workDays = getWorkingDays(yr, mo);
  for (const emp of users) {
    for (const day of workDays) {
      // Skip ~8% of days as absent; mark a few as leave
      const rand = Math.random();
      let status;
      if (rand < 0.04) {
        status = 'absent';
      } else if (rand < 0.06) {
        status = 'on_leave';
        if (!leaveMonths[emp.id]) leaveMonths[emp.id] = new Set();
        leaveMonths[emp.id].add(day.toISOString().split('T')[0]);
      } else {
        status = statusOptions[Math.floor(Math.random() * statusOptions.length)];
      }

      const checkIn = status === 'absent' || status === 'on_leave' ? null : isoDate(day, 9, Math.floor(Math.random() * 30));
      const checkOut = (status === 'present' || status === 'late') ? isoDate(day, 18, Math.floor(Math.random() * 30)) :
                       status === 'halfday' ? isoDate(day, 13, Math.floor(Math.random() * 30)) : null;

      attendanceRecords.push({
        id: attId++,
        userId: emp.id,
        date: isoDate(day, 0, 0),
        checkInTime: checkIn,
        checkOutTime: checkOut,
        status,
        notes: '',
      });
    }
  }
}

// ─── LEAVE REQUESTS ───────────────────────────────────────────────────────────
const leaveTypes = ['annual','sick','casual','maternity','emergency'];
let lvId = 1;
const leaveRequests = [];

const leaveSeed = [
  // A handful of leave requests per company across different statuses
  // Each: [userId, typeIdx, yr, mo, startDay, days, status]
];

// Generate 3 leaves per employee
for (const emp of users) {
  for (let i = 0; i < 3; i++) {
    const typeIdx = Math.floor(Math.random() * leaveTypes.length);
    const moChoice = months[Math.floor(Math.random() * months.length)];
    const [yr, mo] = moChoice;
    const maxDay = new Date(yr, mo, 0).getDate();
    const startDay = Math.floor(Math.random() * (maxDay - 5)) + 1;
    const days = Math.floor(Math.random() * 3) + 1;
    const endDay = Math.min(startDay + days - 1, maxDay);
    const statuses = ['approved','approved','pending','rejected'];
    const lvStatus = statuses[Math.floor(Math.random() * statuses.length)];

    // Find an approver (hr or admin in same company)
    const companyUsers = users.filter(u => u.departmentId <= (emp.departmentId <= 5 ? 5 : 11) && (u.role === 'hr' || u.role === 'admin'));
    const approver = companyUsers.length > 0 ? companyUsers[0] : users[0];

    leaveRequests.push({
      id: lvId++,
      userId: emp.id,
      type: leaveTypes[typeIdx],
      startDate: new Date(yr, mo - 1, startDay, 9, 0, 0).toISOString(),
      endDate: new Date(yr, mo - 1, endDay, 18, 0, 0).toISOString(),
      status: lvStatus,
      reason: ['Family emergency','Medical appointment','Vacation','Personal work','Festival'][i % 5],
      approvedById: lvStatus === 'approved' ? approver.id : null,
      createdAt: new Date(yr, mo - 1, Math.max(1, startDay - 3)).toISOString(),
    });
  }
}

// ─── PAYMENT RECORDS ──────────────────────────────────────────────────────────
const monthLabels = ['October 2025','November 2025','December 2025','January 2026','February 2026','March 2026'];
const monthNums   = [[2025,10],[2025,11],[2025,12],[2026,1],[2026,2],[2026,3]];
const payModes = ['bank_transfer','bank_transfer','bank_transfer','cheque','upi'];
let pmtId = 1;
const paymentRecords = [];

for (const emp of users) {
  for (let mi = 0; mi < monthLabels.length; mi++) {
    const [yr, mo] = monthNums[mi];
    const label = monthLabels[mi];
    // Count working days for the month
    const workDays = getWorkingDays(yr, mo);
    // Count attendance
    const empAtt = attendanceRecords.filter(a => a.userId === emp.id && new Date(a.date).getMonth() === mo - 1 && new Date(a.date).getFullYear() === yr);
    const presentDays = empAtt.filter(a => a.status === 'present' || a.status === 'late' || a.status === 'halfday' || a.status === 'on_leave').length;
    const totalWorkDays = workDays.length;
    const proRata = emp.salary * presentDays / totalWorkDays;
    const amount = Math.round(proRata);
    const payDate = new Date(yr, mo, 5); // Pay on 5th of next month
    const refNo = `PAY${Math.random().toString(36).substring(2,8).toUpperCase()}`;

    paymentRecords.push({
      id: pmtId++,
      employeeId: emp.id,
      month: label,
      amount,
      paymentStatus: 'paid',
      paymentDate: payDate.toISOString(),
      paymentMode: payModes[emp.id % payModes.length],
      referenceNo: refNo,
      remarks: presentDays < totalWorkDays ? `${totalWorkDays - presentDays} day(s) absent` : 'Full month',
      createdAt: payDate.toISOString(),
    });
  }
}

// ─── HOLIDAYS (keep existing ones, they're general Indian holidays) ────────────
const existingData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/hr-data.json'), 'utf8'));
const holidayRecords = existingData.holidayRecords;

// ─── FINAL DATA OBJECT ────────────────────────────────────────────────────────
const freshData = {
  users,
  departments,
  attendanceRecords,
  leaveRequests,
  holidayRecords,
  notifications: [],
  currentUserId: 51,
  currentDepartmentId: 12,
  currentAttendanceId: attId,
  currentLeaveRequestId: lvId,
  currentHolidayId: existingData.currentHolidayId,
  currentNotificationId: 1,
  paymentRecords,
  currentPaymentRecordId: pmtId,
  employeeInvitations: [],
  currentInvitationId: 1,
};

const outPath = path.join(__dirname, '../data/hr-data.json');
fs.writeFileSync(outPath, JSON.stringify(freshData, null, 2));

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
const cyb = users.filter(u => u.departmentId <= 5);
const nxr = users.filter(u => u.departmentId >= 6);
console.log('✅ Data generated successfully!');
console.log(`   Cybaem Tech Pvt Ltd:      ${cyb.length} employees`);
console.log(`   Nexora Solutions Pvt Ltd: ${nxr.length} employees`);
console.log(`   Total employees:           ${users.length}`);
console.log(`   Departments:               ${departments.length}`);
console.log(`   Attendance records:        ${attendanceRecords.length}`);
console.log(`   Leave requests:            ${leaveRequests.length}`);
console.log(`   Payment records:           ${paymentRecords.length}`);
console.log(`   Holiday records:           ${holidayRecords.length}`);
console.log('');
console.log('📧 Login credentials (all employees use the same password as existing users)');
console.log(`   Cybaem Admin:  navnath.kshirsagar@cybaemtech.com`);
console.log(`   Nexora Admin:  arjun.reddy@nexorasolutions.com`);
