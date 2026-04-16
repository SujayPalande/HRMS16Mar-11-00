import fs from 'fs';
import path from 'path';

const filePath = 'c:\\inetpub\\wwwroot\\HRMS26Mar-09-20\\data\\hr-data.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

// Add 2026 Holidays
const holidays2026 = [
  { id: 101, name: "New Year's Day", date: "2026-01-01T00:00:00.000Z", description: "New Year Celebration" },
  { id: 102, name: "Republic Day", date: "2026-01-26T00:00:00.000Z", description: "Republic Day Celebration" },
  { id: 103, name: "Holi", date: "2026-03-03T00:00:00.000Z", description: "Festival of Colors" },
  { id: 104, name: "Good Friday", date: "2026-04-03T00:00:00.000Z", description: "Good Friday" },
  { id: 105, name: "Eid-ul-Fitr", date: "2026-04-10T00:00:00.000Z", description: "Eid-ul-Fitr" },
  { id: 106, name: "Independence Day", date: "2026-08-15T00:00:00.000Z", description: "Independence Day" },
  { id: 107, name: "Gandhi Jayanti", date: "2026-10-02T00:00:00.000Z", description: "Mahatma Gandhi's Birthday" },
  { id: 108, name: "Diwali", date: "2026-11-09T00:00:00.000Z", description: "Festival of Lights" },
  { id: 109, name: "Christmas", date: "2026-12-25T00:00:00.000Z", description: "Christmas Day" }
];

// Combine or replace? User says it's empty, so let's add them.
// Keep existing ones if they exist, but add 2026.
const existingIds = new Set(data.holidayRecords.map(h => h.id));
holidays2026.forEach(h => {
  if (!existingIds.has(h.id)) {
    data.holidayRecords.push(h);
  }
});
data.currentHolidayId = Math.max(data.currentHolidayId, ...data.holidayRecords.map(h => h.id)) + 1;

// Add Gauri if missing
const gauriEmail = 'gauri.d@cybaemtech.com';
let gauri = data.users.find(u => u.email === gauriEmail);
if (!gauri) {
  gauri = {
    id: 1561,
    employeeId: "CYB1561",
    username: "gauri.d",
    password: "3c8a0cb4a9d8dad59971b43e2391955baf3f051b82f9e751c2eec666ed702c898bb05c67708a74fc08ef82ce04f973fd905e4a7d5c618f1604389e650b56fc65.5ffd1ee9d5cb63db47761f9f9dba20da",
    email: gauriEmail,
    firstName: "Gauri",
    lastName: "Dhapte",
    dateOfBirth: "1995-05-15T00:00:00.000Z",
    gender: "Female",
    role: "employee",
    departmentId: 2,
    position: "Software Engineer",
    joinDate: "2025-01-01T09:00:00.000Z",
    isActive: true,
    status: "active",
    salary: 65000,
    phoneNumber: "9876543210",
    address: "Pune",
    customPermissions: [],
    documents: []
  };
  data.users.push(gauri);
}

// Add 2026 Payment Records for Gauri
const months2026 = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026'];
months2026.forEach((month, index) => {
  const exists = data.paymentRecords.find(p => p.employeeId === gauri.id && p.month === month);
  if (!exists) {
    data.paymentRecords.push({
      employeeId: gauri.id,
      month: month,
      paymentStatus: (month === 'Apr 2026') ? 'pending' : 'paid',
      amount: 65000,
      paymentDate: (month === 'Apr 2026') ? null : `2026-0${index + 2}-30T00:00:00.000Z`,
      paymentMode: "bank_transfer",
      referenceNo: `TXN_2026_G_${index}`,
      id: data.currentPaymentRecordId++,
      createdAt: new Date().toISOString()
    });
  }
});

// Add Certifications for Gauri
if (!data.certifications) data.certifications = [];
const gauriCerts = [
  { id: 201, userId: 1561, certificationName: "Advanced React & Next.js", issuer: "Meta", issueDate: "2026-01-15T00:00:00.000Z", expiryDate: "2029-01-15T00:00:00.000Z", status: "Active", credentialId: "META-RN-2026-001" },
  { id: 202, userId: 1561, certificationName: "AWS Certified Developer", issuer: "Amazon", issueDate: "2025-11-20T00:00:00.000Z", expiryDate: "2028-11-20T00:00:00.000Z", status: "Active", credentialId: "AWS-D-998877" }
];

const existingCertIds = new Set(data.certifications.map(c => c.id));
gauriCerts.forEach(c => {
  if (!existingCertIds.has(c.id)) {
    data.certifications.push(c);
  }
});
data.currentCertificationId = Math.max(data.currentCertificationId || 1, ...data.certifications.map(c => c.id)) + 1;

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log("Updated hr-data.json with 2026 holidays, Gauri user, her payslips, and her certifications.");
