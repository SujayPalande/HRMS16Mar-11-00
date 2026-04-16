import { promises as fs } from "fs";
import path from "path";
import session from "express-session";
import createMemoryStore from "memorystore";
import {
  User, InsertUser, Department, InsertDepartment,
  Attendance, InsertAttendance, LeaveRequest, InsertLeaveRequest,
  Holiday, InsertHoliday, Notification, InsertNotification,
  PaymentRecord, InsertPaymentRecord, EmployeeInvitation, InsertEmployeeInvitation,
  LeaveBalance, Unit, InsertUnit,
  Certification, InsertCertification,
  BankMaster, InsertBankMaster, CategoryMaster, InsertCategoryMaster,
  CompanyMaster, InsertCompanyMaster, CostCenter, InsertCostCenter,
  DocumentApproval, InsertDocumentApproval, EmployeeDeduction, InsertEmployeeDeduction,
  Goal, InsertGoal
} from "@shared/schema";
import { IStorage } from "./storage";
import { differenceInMonths, startOfYear, endOfYear, addMonths } from "date-fns";

const MemoryStore = createMemoryStore(session);

interface StorageData {
  users: User[];
  departments: Department[];
  units: Unit[];
  attendanceRecords: Attendance[];
  leaveRequests: LeaveRequest[];
  holidayRecords: Holiday[];
  notifications: Notification[];
  paymentRecords: PaymentRecord[];
  employeeInvitations: EmployeeInvitation[];
  certifications: Certification[];
  bankMasters: BankMaster[];
  categoryMasters: CategoryMaster[];
  companyMasters: CompanyMaster[];
  costCenters: CostCenter[];
  documentApprovals: DocumentApproval[];
  employeeDeductions: EmployeeDeduction[];
  goals: Goal[];
  systemSettings: any;
  currentUserId: number;
  currentDepartmentId: number;
  currentUnitId: number;
  currentAttendanceId: number;
  currentLeaveRequestId: number;
  currentHolidayId: number;
  currentNotificationId: number;
  currentPaymentRecordId: number;
  currentInvitationId: number;
  currentCertificationId: number;
  currentBankMasterId: number;
  currentCategoryMasterId: number;
  currentCompanyMasterId: number;
  currentCostCenterId: number;
  currentDocumentApprovalId: number;
  currentEmployeeDeductionId: number;
  currentGoalId: number;
}

export class FileStorage implements IStorage {
  private dataFilePath: string;
  private data: StorageData;
  sessionStore: session.Store;

  constructor(dataPath: string = "data/hr-data.json") {
    this.dataFilePath = dataPath;
    this.data = {
      users: [],
      departments: [],
      units: [],
      attendanceRecords: [],
      leaveRequests: [],
      holidayRecords: [],
      notifications: [],
      paymentRecords: [],
      employeeInvitations: [],
      certifications: [],
      bankMasters: [],
      categoryMasters: [],
      companyMasters: [],
      costCenters: [],
      documentApprovals: [],
      employeeDeductions: [],
      goals: [],
      systemSettings: {},
      currentUserId: 1,
      currentDepartmentId: 1,
      currentUnitId: 1,
      currentAttendanceId: 1,
      currentLeaveRequestId: 1,
      currentHolidayId: 1,
      currentNotificationId: 1,
      currentPaymentRecordId: 1,
      currentInvitationId: 1,
      currentCertificationId: 1,
      currentBankMasterId: 1,
      currentCategoryMasterId: 1,
      currentCompanyMasterId: 1,
      currentCostCenterId: 1,
      currentDocumentApprovalId: 1,
      currentEmployeeDeductionId: 1,
      currentGoalId: 1,
    };

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  async initialize() {
    await this.ensureDataDirectory();
    await this.loadData();

    // Initialize with sample data if empty
    if (this.data.departments.length === 0) {
      await this.initializeDefaultData();
    }
  }

  private async ensureDataDirectory() {
    const dir = path.dirname(this.dataFilePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory already exists or couldn't create
    }
  }

  private async loadData() {
    try {
      const fileContent = await fs.readFile(this.dataFilePath, 'utf-8');
      this.data = JSON.parse(fileContent);

      // Convert date strings back to Date objects
      this.data.users = this.data.users.map(user => ({
        ...user,
        joinDate: user.joinDate ? new Date(user.joinDate) : new Date()
      }));

      this.data.attendanceRecords = this.data.attendanceRecords.map(record => ({
        ...record,
        checkInTime: record.checkInTime ? new Date(record.checkInTime) : null,
        checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : null,
        date: record.date ? new Date(record.date) : null,
      }));

      this.data.leaveRequests = this.data.leaveRequests.map(request => ({
        ...request,
        startDate: new Date(request.startDate),
        endDate: new Date(request.endDate),
        createdAt: request.createdAt ? new Date(request.createdAt) : new Date()
      }));

      this.data.holidayRecords = this.data.holidayRecords.map(holiday => ({
        ...holiday,
        date: new Date(holiday.date)
      }));

      // Handle payment records if they exist in the data
      if (this.data.paymentRecords) {
        this.data.paymentRecords = this.data.paymentRecords.map(record => ({
          ...record,
          paymentDate: record.paymentDate ? new Date(record.paymentDate) : null,
          createdAt: record.createdAt ? new Date(record.createdAt) : null,
        }));
      } else {
        this.data.paymentRecords = [];
      }

      // Handle employee invitations if they exist in the data
      if (this.data.employeeInvitations) {
        this.data.employeeInvitations = this.data.employeeInvitations.map(invitation => ({
          ...invitation,
          createdAt: invitation.createdAt ? new Date(invitation.createdAt) : new Date(),
          usedAt: invitation.usedAt ? new Date(invitation.usedAt) : null
        }));
      } else {
        this.data.employeeInvitations = [];
      }

      // Ensure invitation ID counter exists
      if (!this.data.currentInvitationId) {
        this.data.currentInvitationId = 1;
      }

      // Handle units
      if (!this.data.units) {
        this.data.units = [];
      }
      if (!this.data.currentUnitId) {
        this.data.currentUnitId = (this.data.units.length > 0
          ? Math.max(...this.data.units.map(u => u.id)) + 1
          : 1);
      }

    } catch (error) {
      // File doesn't exist, start with empty data
      console.log("No existing data file found, starting with empty data");
    }
  }

  private async saveData() {
    await this.ensureDataDirectory();
    await fs.writeFile(this.dataFilePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  private async initializeDefaultData() {
    // Initialize with sample departments
    await this.createDepartment({ name: "Human Resources", code: "HR", description: "Manages employee relations, hiring, and company policies" });
    await this.createDepartment({ name: "Engineering", code: "ENG", description: "Software development and technical operations" });
    await this.createDepartment({ name: "Marketing", code: "MKT", description: "Handles brand awareness and promotional activities" });
    await this.createDepartment({ name: "Finance", code: "FIN", description: "Manages financial planning and accounting" });

    // Initialize with default users (pre-hashed passwords)

    // Admin user - Password: admin123
    await this.initializeUser({
      username: "admin",
      password: "c56a7d8799d79a96bd917d2aea44a92cd3525c4313b14bf45467e40ee4a5b4b4b2d9cab3fe0aac89a56a4c00060a28226ef445e9969fce314e41a9fffd1b3ff4.6a2da20943931e46",
      email: "admin@hrconnect.com",
      firstName: "Admin",
      lastName: "User",
      role: "admin" as const,
      departmentId: 1,
      position: "HR Director",
      phoneNumber: "123-456-7890",
      address: "123 Main St, Anytown, USA",
      joinDate: new Date(),
      isActive: true
    } as any);

    // HR user - Password: hr123
    await this.initializeUser({
      username: "hr",
      password: "4ed0c57d4e5b87cd80d3a2060e82c30e6e8cddea45e9655bd2eb471192c1e8bb6e7a15d7f8134c04dcbe56f5ee49b249f38a63ddcd4d81a64ca0c8c06aa67154.b1d6f9fdf91e77c8",
      email: "hr@hrconnect.com",
      firstName: "HR",
      lastName: "Manager",
      role: "hr" as const,
      departmentId: 1,
      position: "HR Manager",
      phoneNumber: "123-456-7891",
      address: "124 Main St, Anytown, USA",
      joinDate: new Date(),
      isActive: true
    } as any);

    // Manager user - Password: manager123
    await this.initializeUser({
      username: "manager",
      password: "f064cc778f9ee67f2a3b2d8a7a0e4a8f06e1b12e7d68b1cb0b5c87ca3ad13cefc8e22f3bb8a0d9f5ce78ca28ba9ecc20889c27b20e93917545a85979fc92987.9a3992ad0c5f4ce2",
      email: "manager@hrconnect.com",
      firstName: "Department",
      lastName: "Manager",
      role: "manager" as const,
      departmentId: 2,
      position: "Engineering Manager",
      phoneNumber: "123-456-7892",
      address: "125 Main St, Anytown, USA",
      joinDate: new Date(),
      isActive: true
    } as any);

    // Regular employee - Password: employee123
    await this.initializeUser({
      username: "employee",
      password: "2d8e6f2a8dd8c5ec52e499bbc1415cff0ea8af36aca4cac16d8bcbe5c967f0cbf5af81f0c1b5ce23b1b7122dea5562d7c1b83d66a5d76deb7f092ab7df283e4.ba4b61d276ab9d68",
      email: "employee@hrconnect.com",
      firstName: "Regular",
      lastName: "Employee",
      role: "employee" as const,
      departmentId: 2,
      position: "Software Developer",
      phoneNumber: "123-456-7893",
      address: "126 Main St, Anytown, USA",
      joinDate: new Date(),
      isActive: true
    } as any);

    // Seed 2026 holidays for India
    const holidays2026 = [
      { name: "Republic Day", date: new Date("2026-01-26"), description: "Republic Day of India" },
      { name: "Holi", date: new Date("2026-03-17"), description: "Festival of Colors" },
      { name: "Good Friday", date: new Date("2026-04-03"), description: "Good Friday" },
      { name: "Eid ul-Fitr", date: new Date("2026-03-31"), description: "End of Ramadan" },
      { name: "Dr. Ambedkar Jayanti", date: new Date("2026-04-14"), description: "Birth Anniversary of Dr. B.R. Ambedkar" },
      { name: "May Day", date: new Date("2026-05-01"), description: "International Workers' Day" },
      { name: "Independence Day", date: new Date("2026-08-15"), description: "Independence Day of India" },
      { name: "Ganesh Chaturthi", date: new Date("2026-08-27"), description: "Birthday of Lord Ganesha" },
      { name: "Mahatma Gandhi Jayanti", date: new Date("2026-10-02"), description: "Birth Anniversary of Mahatma Gandhi" },
      { name: "Dussehra", date: new Date("2026-10-02"), description: "Victory of Good over Evil" },
      { name: "Diwali", date: new Date("2026-10-21"), description: "Festival of Lights" },
      { name: "Guru Nanak Jayanti", date: new Date("2026-11-08"), description: "Birthday of Guru Nanak Dev Ji" },
      { name: "Christmas", date: new Date("2026-12-25"), description: "Christmas Day" },
    ];
    for (const h of holidays2026) {
      await this.createHoliday(h);
    }
  }

  // Helper method for initializing users with pre-hashed passwords
  private async initializeUser(user: any) {
    const id = this.data.currentUserId++;
    const newUser: User = {
      employeeId: null, dateOfBirth: null, gender: null, maritalStatus: null, photoUrl: null,
      workLocation: null, reportingTo: null, uanNumber: null, esicNumber: null, aadhaarCard: null,
      panCard: null, employmentType: 'permanent', pfApplicable: true, esicApplicable: true, ptApplicable: true,
      incomeTaxApplicable: false, mlwfApplicable: false, overtimeApplicable: false, bonusApplicable: false,
      bankName: null, bankAccountNumber: null, bankIFSCCode: null, bankAccountType: null,
      salary: null, status: 'active', customPermissions: null, documents: null,
      ...user, id
    };
    this.data.users.push(newUser);
    await this.saveData();
    return newUser;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.data.users.find(u => u.id === id);
  }

  async getUsers(): Promise<User[]> {
    return this.data.users;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.data.users.find(u => u.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.data.users.find(u => u.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.data.currentUserId++;
    const user: User = {
      employeeId: null, dateOfBirth: null, gender: null, maritalStatus: null, photoUrl: null,
      workLocation: null, reportingTo: null, uanNumber: null, esicNumber: null, aadhaarCard: null,
      panCard: null, employmentType: 'permanent', pfApplicable: true, esicApplicable: true, ptApplicable: true,
      incomeTaxApplicable: false, mlwfApplicable: false, overtimeApplicable: false, bonusApplicable: false,
      bankName: null, bankAccountNumber: null, bankIFSCCode: null, bankAccountType: null,
      salary: null, status: 'active', customPermissions: null, documents: null, isActive: true,
      role: 'employee' as const,
      ...insertUser,
      id,
      joinDate: insertUser.joinDate || new Date(),
      departmentId: insertUser.departmentId ?? null,
      position: insertUser.position ?? null,
      phoneNumber: insertUser.phoneNumber ?? null,
      address: insertUser.address ?? null
    };
    this.data.users.push(user);
    await this.saveData();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;

    const updatedUser = { ...this.data.users[index], ...userData };
    this.data.users[index] = updatedUser;
    await this.saveData();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return false;

    this.data.users.splice(index, 1);
    await this.saveData();
    return true;
  }

  async getUsersByDepartment(departmentId: number): Promise<User[]> {
    return this.data.users.filter(u => u.departmentId === departmentId);
  }

  async getAdminUsers(): Promise<User[]> {
    return this.data.users.filter(u => u.role === 'admin' || u.role === 'hr');
  }

  // Department methods
  async getDepartment(id: number): Promise<Department | undefined> {
    return this.data.departments.find(d => d.id === id);
  }

  async getDepartments(): Promise<Department[]> {
    return this.data.departments;
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const id = this.data.currentDepartmentId++;
    const department: Department = {
      ...insertDepartment,
      id,
      code: insertDepartment.code ?? 'GEN',
      manager: insertDepartment.manager ?? null,
      location: insertDepartment.location ?? null,
      description: insertDepartment.description ?? null,
      unitId: null,
    };
    this.data.departments.push(department);
    await this.saveData();
    return department;
  }

  async updateDepartment(id: number, departmentData: Partial<Department>): Promise<Department | undefined> {
    const index = this.data.departments.findIndex(d => d.id === id);
    if (index === -1) return undefined;

    const updatedDepartment = { ...this.data.departments[index], ...departmentData };
    this.data.departments[index] = updatedDepartment;
    await this.saveData();
    return updatedDepartment;
  }

  // Unit methods
  async getUnits(): Promise<Unit[]> {
    return this.data.units;
  }

  async createUnit(insertUnit: InsertUnit): Promise<Unit> {
    const id = this.data.currentUnitId++;
    const unit: Unit = {
      ...insertUnit,
      id,
      description: insertUnit.description ?? null,
    };
    this.data.units.push(unit);
    await this.saveData();
    return unit;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    const index = this.data.departments.findIndex(d => d.id === id);
    if (index === -1) return false;

    this.data.departments.splice(index, 1);
    await this.saveData();
    return true;
  }

  // Attendance methods
  async getAttendance(id: number): Promise<Attendance | undefined> {
    return this.data.attendanceRecords.find(a => a.id === id);
  }

  async getAttendanceByUser(userId: number): Promise<Attendance[]> {
    return this.data.attendanceRecords.filter(a => a.userId === userId);
  }

  async getAttendanceByDate(date: Date): Promise<Attendance[]> {
    const dateString = date.toDateString();
    return this.data.attendanceRecords.filter(
      record => record.date && new Date(record.date).toDateString() === dateString
    );
  }

  async getAllAttendance(): Promise<Attendance[]> {
    return this.data.attendanceRecords;
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const id = this.data.currentAttendanceId++;
    const attendance: Attendance = {
      ...insertAttendance,
      id,
      date: insertAttendance.date ?? null,
      status: insertAttendance.status ?? 'present',
      checkInTime: insertAttendance.checkInTime ?? null,
      checkOutTime: insertAttendance.checkOutTime ?? null,
      notes: insertAttendance.notes ?? null
    };
    this.data.attendanceRecords.push(attendance);
    await this.saveData();
    return attendance;
  }

  async updateAttendance(id: number, attendanceData: Partial<Attendance>): Promise<Attendance | undefined> {
    const index = this.data.attendanceRecords.findIndex(a => a.id === id);
    if (index === -1) return undefined;

    const updatedAttendance = { ...this.data.attendanceRecords[index], ...attendanceData };
    this.data.attendanceRecords[index] = updatedAttendance;
    await this.saveData();
    return updatedAttendance;
  }

  // Leave methods
  async getLeaveRequest(id: number): Promise<LeaveRequest | undefined> {
    return this.data.leaveRequests.find(l => l.id === id);
  }

  async getLeaveRequestsByUser(userId: number): Promise<LeaveRequest[]> {
    return this.data.leaveRequests.filter(l => l.userId === userId);
  }

  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    return this.data.leaveRequests;
  }

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return this.data.leaveRequests.filter(l => l.status === 'pending');
  }

  async createLeaveRequest(insertLeaveRequest: InsertLeaveRequest): Promise<LeaveRequest> {
    const id = this.data.currentLeaveRequestId++;
    const leaveRequest: LeaveRequest = {
      ...insertLeaveRequest,
      id,
      status: insertLeaveRequest.status ?? 'pending',
      reason: insertLeaveRequest.reason ?? null,
      approvedById: insertLeaveRequest.approvedById ?? null,
      createdAt: new Date()
    };
    this.data.leaveRequests.push(leaveRequest);
    await this.saveData();
    return leaveRequest;
  }

  async updateLeaveRequest(id: number, leaveRequestData: Partial<LeaveRequest>): Promise<LeaveRequest | undefined> {
    const index = this.data.leaveRequests.findIndex(l => l.id === id);
    if (index === -1) return undefined;

    const updatedLeaveRequest = { ...this.data.leaveRequests[index], ...leaveRequestData };
    this.data.leaveRequests[index] = updatedLeaveRequest;
    await this.saveData();
    return updatedLeaveRequest;
  }

  async deleteLeaveRequest(id: number): Promise<boolean> {
    const index = this.data.leaveRequests.findIndex(l => l.id === id);
    if (index === -1) return false;

    this.data.leaveRequests.splice(index, 1);
    await this.saveData();
    return true;
  }

  // Holiday methods
  async getHoliday(id: number): Promise<Holiday | undefined> {
    return this.data.holidayRecords.find(h => h.id === id);
  }

  async getHolidays(): Promise<Holiday[]> {
    return this.data.holidayRecords;
  }

  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> {
    const id = this.data.currentHolidayId++;
    const holiday: Holiday = {
      ...insertHoliday,
      id,
      description: insertHoliday.description ?? null
    };
    this.data.holidayRecords.push(holiday);
    await this.saveData();
    return holiday;
  }

  async updateHoliday(id: number, holidayData: Partial<Holiday>): Promise<Holiday | undefined> {
    const index = this.data.holidayRecords.findIndex(h => h.id === id);
    if (index === -1) return undefined;

    const updatedHoliday = { ...this.data.holidayRecords[index], ...holidayData };
    this.data.holidayRecords[index] = updatedHoliday;
    await this.saveData();
    return updatedHoliday;
  }

  async deleteHoliday(id: number): Promise<boolean> {
    const index = this.data.holidayRecords.findIndex(h => h.id === id);
    if (index === -1) return false;

    this.data.holidayRecords.splice(index, 1);
    await this.saveData();
    return true;
  }

  // Notification methods
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.data.notifications.find(n => n.id === id);
  }

  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return this.data.notifications
      .filter(notification => notification.userId === userId)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  async getUnreadNotificationsByUser(userId: number): Promise<Notification[]> {
    return this.data.notifications
      .filter(notification => notification.userId === userId && !notification.isRead)
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.data.currentNotificationId++;
    const notification: Notification = {
      ...insertNotification,
      id,
      isRead: insertNotification.isRead ?? false,
      createdAt: new Date(),
      relatedUserId: insertNotification.relatedUserId ?? null,
      relatedLeaveId: insertNotification.relatedLeaveId ?? null
    };
    this.data.notifications.push(notification);
    await this.saveData();
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const notification = this.data.notifications.find(n => n.id === id);
    if (!notification) return false;

    notification.isRead = true;
    await this.saveData();
    return true;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const userNotifications = this.data.notifications
      .filter(notification => notification.userId === userId && !notification.isRead);

    userNotifications.forEach(notification => {
      notification.isRead = true;
    });

    await this.saveData();
    return true;
  }

  async deleteNotification(id: number): Promise<boolean> {
    const index = this.data.notifications.findIndex(n => n.id === id);
    if (index === -1) return false;

    this.data.notifications.splice(index, 1);
    await this.saveData();
    return true;
  }

  // Payment Record methods
  async getPaymentRecord(id: number): Promise<PaymentRecord | undefined> {
    return this.data.paymentRecords.find(pr => pr.id === id);
  }

  async getPaymentRecords(): Promise<PaymentRecord[]> {
    return [...this.data.paymentRecords];
  }

  async getPaymentRecordsByEmployee(employeeId: number): Promise<PaymentRecord[]> {
    return this.data.paymentRecords.filter(pr => pr.employeeId === employeeId);
  }

  async getPaymentRecordsByMonth(month: string): Promise<PaymentRecord[]> {
    return this.data.paymentRecords.filter(pr => pr.month === month);
  }

  async createPaymentRecord(paymentRecord: InsertPaymentRecord): Promise<PaymentRecord> {
    const id = this.data.currentPaymentRecordId++;
    const newPaymentRecord: PaymentRecord = {
      ...paymentRecord,
      id,
      createdAt: new Date(),
      paymentStatus: paymentRecord.paymentStatus ?? 'pending',
      paymentDate: paymentRecord.paymentDate ?? null,
      paymentMode: paymentRecord.paymentMode ?? null,
      referenceNo: paymentRecord.referenceNo ?? null,
    };

    this.data.paymentRecords.push(newPaymentRecord);
    await this.saveData();
    return newPaymentRecord;
  }

  async updatePaymentRecord(id: number, paymentRecord: Partial<PaymentRecord>): Promise<PaymentRecord | undefined> {
    const index = this.data.paymentRecords.findIndex(pr => pr.id === id);
    if (index === -1) return undefined;

    this.data.paymentRecords[index] = { ...this.data.paymentRecords[index], ...paymentRecord };
    await this.saveData();
    return this.data.paymentRecords[index];
  }

  async deletePaymentRecord(id: number): Promise<boolean> {
    const index = this.data.paymentRecords.findIndex(pr => pr.id === id);
    if (index === -1) return false;

    this.data.paymentRecords.splice(index, 1);
    await this.saveData();
    return true;
  }

  // System settings
  async getSystemSettings(): Promise<any> {
    return this.data.systemSettings ?? {};
  }

  // Bank master methods
  async getBankMasters(): Promise<BankMaster[]> {
    return this.data.bankMasters ?? [];
  }
  async createBankMaster(bank: InsertBankMaster): Promise<BankMaster> {
    const id = this.data.currentBankMasterId++;
    const record: BankMaster = {
      ...bank,
      id,
      address: bank.address ?? null,
      branchCode: bank.branchCode ?? null,
      accountNo: bank.accountNo ?? null,
      ifscCode: bank.ifscCode ?? null,
      micrCode: bank.micrCode ?? null,
    };
    this.data.bankMasters.push(record);
    await this.saveData();
    return record;
  }

  // Category master methods
  async getCategoryMasters(): Promise<CategoryMaster[]> {
    return this.data.categoryMasters ?? [];
  }
  async createCategoryMaster(category: InsertCategoryMaster): Promise<CategoryMaster> {
    const id = this.data.currentCategoryMasterId++;
    const record: CategoryMaster = { ...category, id };
    this.data.categoryMasters.push(record);
    await this.saveData();
    return record;
  }

  // Company master methods
  async getCompanyMasters(): Promise<CompanyMaster[]> {
    return this.data.companyMasters ?? [];
  }
  async createCompanyMaster(company: InsertCompanyMaster): Promise<CompanyMaster> {
    const id = this.data.currentCompanyMasterId++;
    const record: CompanyMaster = { ...company, id, address: company.address ?? null, state: company.state ?? null, pinCode: company.pinCode ?? null, regdNo: company.regdNo ?? null, pfcCode: company.pfcCode ?? null, esicCode: company.esicCode ?? null, panNo: company.panNo ?? null, tanNo: company.tanNo ?? null, gstNo: company.gstNo ?? null, email: company.email ?? null, natureOfBusiness: company.natureOfBusiness ?? null, esiEmployeeContribution: company.esiEmployeeContribution ?? null, esiEmployerContribution: company.esiEmployerContribution ?? null, pfEmployerContribution: company.pfEmployerContribution ?? null };
    this.data.companyMasters.push(record);
    await this.saveData();
    return record;
  }

  // Cost center methods
  async getCostCenters(): Promise<CostCenter[]> {
    return this.data.costCenters ?? [];
  }
  async createCostCenter(costCenter: InsertCostCenter): Promise<CostCenter> {
    const id = this.data.currentCostCenterId++;
    const record: CostCenter = { ...costCenter, id };
    this.data.costCenters.push(record);
    await this.saveData();
    return record;
  }

  // Document approval methods
  async getDocumentApprovals(): Promise<DocumentApproval[]> {
    return this.data.documentApprovals ?? [];
  }
  async createDocumentApproval(approval: InsertDocumentApproval): Promise<DocumentApproval> {
    const id = this.data.currentDocumentApprovalId++;
    const record: DocumentApproval = {
      ...approval,
      id,
      status: approval.status ?? 'pending',
      remarks: approval.remarks ?? null,
    };
    this.data.documentApprovals.push(record);
    await this.saveData();
    return record;
  }

  // Employee deduction methods
  async getEmployeeDeductions(): Promise<EmployeeDeduction[]> {
    return this.data.employeeDeductions ?? [];
  }
  async createEmployeeDeduction(deduction: InsertEmployeeDeduction): Promise<EmployeeDeduction> {
    const id = this.data.currentEmployeeDeductionId++;
    const record: EmployeeDeduction = { ...deduction, id };
    this.data.employeeDeductions.push(record);
    await this.saveData();
    return record;
  }

  // Employee invitation methods
  async getEmployeeInvitation(id: number): Promise<EmployeeInvitation | undefined> {
    return this.data.employeeInvitations.find(invitation => invitation.id === id);
  }

  async getEmployeeInvitationByToken(token: string): Promise<EmployeeInvitation | undefined> {
    return this.data.employeeInvitations.find(invitation => invitation.token === token);
  }

  async getEmployeeInvitations(): Promise<EmployeeInvitation[]> {
    return [...this.data.employeeInvitations];
  }

  async createEmployeeInvitation(insertInvitation: InsertEmployeeInvitation): Promise<EmployeeInvitation> {
    const id = this.data.currentInvitationId++;
    const invitation: EmployeeInvitation = {
      ...insertInvitation,
      id,
      usedAt: null,
      createdAt: new Date()
    };
    this.data.employeeInvitations.push(invitation);
    await this.saveData();
    return invitation;
  }

  async updateEmployeeInvitation(id: number, invitationData: Partial<EmployeeInvitation>): Promise<EmployeeInvitation | undefined> {
    const index = this.data.employeeInvitations.findIndex(invitation => invitation.id === id);
    if (index === -1) return undefined;

    this.data.employeeInvitations[index] = { ...this.data.employeeInvitations[index], ...invitationData };
    await this.saveData();
    return this.data.employeeInvitations[index];
  }

  async deleteEmployeeInvitation(id: number): Promise<boolean> {
    const index = this.data.employeeInvitations.findIndex(invitation => invitation.id === id);
    if (index === -1) return false;

    this.data.employeeInvitations.splice(index, 1);
    await this.saveData();
    return true;
  }

  // Leave Balance Calculation Method
  async calculateLeaveBalance(userId: number, asOfDate?: Date): Promise<LeaveBalance> {
    // Get the user to access joinDate
    const user = await this.getUser(userId);
    if (!user || !user.joinDate) {
      throw new Error(`User not found or missing join date for userId: ${userId}`);
    }

    // Use current date if no asOfDate provided
    const calculationDate = asOfDate || new Date();
    const joinDate = new Date(user.joinDate);

    // Calculate how many months the employee has been with the company
    const monthsWorked = differenceInMonths(calculationDate, joinDate);

    // Standard accrual: 1.5 days per month (18 days per year)
    const accrualPerMonth = 1.5;
    const totalAccrued = Math.max(0, monthsWorked * accrualPerMonth);

    // Get all leave requests for this user
    const allLeaveRequests = await this.getLeaveRequestsByUser(userId);

    // Calculate leave taken (approved requests)
    const approvedLeaves = allLeaveRequests.filter(request => request.status === 'approved');
    const totalTaken = approvedLeaves.reduce((total, request) => {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);

      // Only count if the leave was taken on or before the calculation date
      if (startDate <= calculationDate) {
        // Calculate days between start and end date (inclusive)
        const timeDifference = endDate.getTime() - startDate.getTime();
        const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1;
        return total + daysDifference;
      }
      return total;
    }, 0);

    // Calculate pending requests
    const pendingLeaves = allLeaveRequests.filter(request => request.status === 'pending');
    const pendingRequests = pendingLeaves.reduce((total, request) => {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);

      // Only count if the leave starts on or before the calculation date
      if (startDate <= calculationDate) {
        const timeDifference = endDate.getTime() - startDate.getTime();
        const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1;
        return total + daysDifference;
      }
      return total;
    }, 0);

    // Calculate remaining balance
    const remainingBalance = Math.max(0, totalAccrued - totalTaken - pendingRequests);

    // Calculate next accrual date (start of next month)
    const nextAccrualDate = addMonths(startOfYear(calculationDate), Math.floor(monthsWorked) + 1);

    // Calculate accrued and taken this year
    const currentYearStart = startOfYear(calculationDate);
    const monthsWorkedThisYear = Math.max(0, differenceInMonths(calculationDate, joinDate.getTime() > currentYearStart.getTime() ? joinDate : currentYearStart));
    const accruedThisYear = monthsWorkedThisYear * accrualPerMonth;

    // Calculate taken this year
    const takenThisYear = approvedLeaves.reduce((total, request) => {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);

      // Only count if the leave was taken in the current year
      if (startDate >= currentYearStart && startDate <= calculationDate) {
        const timeDifference = endDate.getTime() - startDate.getTime();
        const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1;
        return total + daysDifference;
      }
      return total;
    }, 0);

    return {
      asOfDate: calculationDate,
      totalAccrued,
      totalTaken,
      pendingRequests,
      remainingBalance,
      nextAccrualDate,
      accruedThisYear,
      takenThisYear
    };
  }

  // Certification methods
  async getCertification(id: number): Promise<Certification | undefined> {
    return this.data.certifications.find(c => c.id === id);
  }

  async getCertifications(): Promise<Certification[]> {
    return this.data.certifications;
  }

  async getCertificationsByUser(userId: number): Promise<Certification[]> {
    return this.data.certifications.filter(c => c.userId === userId);
  }

  async createCertification(insertCertification: InsertCertification): Promise<Certification> {
    const id = this.data.currentCertificationId++;
    const certification: Certification = {
      ...insertCertification,
      id,
      createdAt: new Date(),
      status: insertCertification.status ?? 'Active',
      credentialId: insertCertification.credentialId ?? null,
      issueDate: new Date(insertCertification.issueDate),
      expiryDate: insertCertification.expiryDate ? new Date(insertCertification.expiryDate) : null
    };
    this.data.certifications.push(certification);
    await this.saveData();
    return certification;
  }

  async updateCertification(id: number, certificationData: Partial<Certification>): Promise<Certification | undefined> {
    const index = this.data.certifications.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    const updated = {
      ...this.data.certifications[index],
      ...certificationData,
      issueDate: certificationData.issueDate ? new Date(certificationData.issueDate) : this.data.certifications[index].issueDate,
      expiryDate: certificationData.expiryDate !== undefined ? (certificationData.expiryDate ? new Date(certificationData.expiryDate) : null) : this.data.certifications[index].expiryDate,
    };
    this.data.certifications[index] = updated;
    await this.saveData();
    return updated;
  }

  async deleteCertification(id: number): Promise<boolean> {
    const index = this.data.certifications.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.data.certifications.splice(index, 1);
    await this.saveData();
    return true;
  }

  // Goals methods
  async getGoals(): Promise<Goal[]> {
    return this.data.goals || [];
  }

  async getGoalsByUser(userId: number): Promise<Goal[]> {
    return (this.data.goals || []).filter(g => g.userId === userId);
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    return (this.data.goals || []).find(g => g.id === id);
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    if (!this.data.goals) this.data.goals = [];
    if (!this.data.currentGoalId) this.data.currentGoalId = 1;
    const id = this.data.currentGoalId++;
    const newGoal: Goal = {
      id,
      title: goal.title,
      kpi: goal.kpi,
      owner: goal.owner,
      progress: goal.progress ?? 0,
      dueDate: goal.dueDate instanceof Date ? goal.dueDate : new Date(goal.dueDate),
      status: goal.status ?? 'On Track',
      description: goal.description ?? null,
      priority: goal.priority ?? 'medium',
      userId: goal.userId,
      createdAt: new Date(),
    };
    this.data.goals.push(newGoal);
    await this.saveData();
    return newGoal;
  }

  async updateGoal(id: number, goalData: Partial<Goal>): Promise<Goal | undefined> {
    if (!this.data.goals) return undefined;
    const index = this.data.goals.findIndex(g => g.id === id);
    if (index === -1) return undefined;
    const updated = { ...this.data.goals[index], ...goalData };
    this.data.goals[index] = updated;
    await this.saveData();
    return updated;
  }

  async deleteGoal(id: number): Promise<boolean> {
    if (!this.data.goals) return false;
    const index = this.data.goals.findIndex(g => g.id === id);
    if (index === -1) return false;
    this.data.goals.splice(index, 1);
    await this.saveData();
    return true;
  }

  // System settings methods
  async updateSystemSettings(settings: any): Promise<any> {
    this.data.systemSettings = { ...this.data.systemSettings, ...settings };
    await this.saveData();
    return this.data.systemSettings;
  }
}
