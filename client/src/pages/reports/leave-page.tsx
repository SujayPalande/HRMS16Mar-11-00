import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { differenceInMonths } from "date-fns";
import { 
  CalendarDays, 
  Calendar, 
  Users, 
  Clock, 
  Search, 
  Building2, 
  ChevronRight, 
  ChevronDown, 
  FileSpreadsheet,
  FileDown,
  CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, Fragment } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { addCompanyHeader, addWatermark, addHRSignature, addFooter, addDocumentDate, generateReferenceNumber, addReferenceNumber } from "@/lib/pdf-utils";
import { User, Department, Unit } from "@shared/schema";

export default function LeaveReportPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [expandedEmployees, setExpandedEmployees] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const monthsList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i);

  const { data: units = [] } = useQuery<Unit[]>({ queryKey: ["/api/masters/units"] });
  const { data: employees = [] } = useQuery<User[]>({ queryKey: ["/api/employees"] });
  const { data: departments = [] } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: leaveRequests = [] } = useQuery<any[]>({ queryKey: ["/api/leave-requests"] });
  const { data: leaveBalancesRaw } = useQuery<any>({ queryKey: ["/api/employees/leave-balances"] });

  const leaveBalances: Record<number, any> = useMemo(() => {
    if (!leaveBalancesRaw) return {};
    if (typeof leaveBalancesRaw === 'object' && !Array.isArray(leaveBalancesRaw)) {
      return leaveBalancesRaw;
    }
    return {};
  }, [leaveBalancesRaw]);

  const getReportPeriod = () => {
    let startDate: Date, endDate: Date;
    if (selectedPeriod === "day") {
      const date = new Date(selectedDate);
      startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    } else if (selectedPeriod === "week") {
      const date = new Date(selectedDate);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(date.getFullYear(), date.getMonth(), diff, 0, 0, 0, 0);
      endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6, 23, 59, 59, 999);
    } else if (selectedPeriod === "month") {
      startDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
      endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
    } else {
      const yr = selectedPeriod === "year" ? (new Date(selectedDate)).getFullYear() : selectedYear;
      startDate = new Date(yr, 0, 1, 0, 0, 0, 0);
      endDate = new Date(yr, 11, 31, 23, 59, 59, 999);
    }
    return { startDate, endDate };
  };

  const { startDate, endDate } = getReportPeriod();

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp: User) => {
      const dept = departments.find(d => d.id == emp.departmentId);
      const matchesUnit = selectedUnit === 'all' || (dept && dept.unitId == selectedUnit);
      const matchesDept = selectedDept === 'all' || emp.departmentId == selectedDept;
      const empIdFormatted = emp.employeeId || `EMP${String(emp.id).padStart(3, '0')}`;
      const matchesSearch = searchQuery === "" || 
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        empIdFormatted.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesUnit && matchesDept && matchesSearch;
    });
  }, [employees, departments, selectedUnit, selectedDept, searchQuery]);

  const filteredDepartments = departments.filter((dept: Department) => 
    (selectedUnit === "all" || dept.unitId == selectedUnit) &&
    (selectedDept === "all" || dept.id == selectedDept)
  );

  const toggleEmployee = (empId: number) => {
    const newSet = new Set(expandedEmployees);
    if (newSet.has(empId)) newSet.delete(empId);
    else newSet.add(empId);
    setExpandedEmployees(newSet);
  };

  const getLeaveBalance = (userId: number) => {
    const apiBalance = leaveBalances[userId];
    if (apiBalance && (apiBalance.totalAccrued > 0 || apiBalance.totalTaken > 0 || apiBalance.pendingRequests > 0)) {
      return {
        totalAccrued: apiBalance.totalAccrued || 0,
        totalTaken: apiBalance.totalTaken || 0,
        pendingRequests: apiBalance.pendingRequests || 0,
        remainingBalance: apiBalance.remainingBalance || 0,
        accruedThisYear: apiBalance.accruedThisYear || 0,
        takenThisYear: apiBalance.takenThisYear || 0,
        nextAccrualDate: apiBalance.nextAccrualDate ? new Date(apiBalance.nextAccrualDate).toLocaleDateString('en-GB') : 'N/A',
        accrualRate: '1.5 days/month'
      };
    }

    const emp = employees.find(e => e.id === userId);
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    let totalAccrued = 0;
    let accruedThisYear = 0;
    if (emp?.joinDate) {
      const joinDate = new Date(emp.joinDate);
      if (joinDate < now) {
        const months = Math.max(0, differenceInMonths(now, joinDate));
        totalAccrued = Math.round(months * 1.5 * 10) / 10;
        const yearStartForCalc = joinDate > yearStart ? joinDate : yearStart;
        const monthsThisYear = Math.max(0, differenceInMonths(now, yearStartForCalc));
        accruedThisYear = Math.round(monthsThisYear * 1.5 * 10) / 10;
      }
    }

    const allEmpLeaves = leaveRequests.filter((r: any) => r.userId === userId);
    const approvedLeaves = allEmpLeaves.filter((r: any) => r.status === 'approved');
    const pendingLeavesList = allEmpLeaves.filter((r: any) => r.status === 'pending');

    let totalTaken = 0;
    for (const leave of approvedLeaves) {
      if (leave.type === 'halfday') { totalTaken += 0.5; continue; }
      const s = new Date(leave.startDate);
      const e2 = new Date(leave.endDate);
      totalTaken += Math.ceil((e2.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
    }

    let pendingCount = 0;
    for (const leave of pendingLeavesList) {
      if (leave.type === 'halfday') { pendingCount += 0.5; continue; }
      const s = new Date(leave.startDate);
      const e2 = new Date(leave.endDate);
      pendingCount += Math.ceil((e2.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
    }

    const thisYearApproved = approvedLeaves.filter((r: any) => new Date(r.startDate) >= yearStart);
    let takenThisYear = 0;
    for (const leave of thisYearApproved) {
      if (leave.type === 'halfday') { takenThisYear += 0.5; continue; }
      const s = new Date(leave.startDate);
      const e2 = new Date(leave.endDate);
      takenThisYear += Math.ceil((e2.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
    }

    const remainingBalance = Math.round((totalAccrued - totalTaken) * 10) / 10;

    const nextAccrual = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      totalAccrued,
      totalTaken,
      pendingRequests: pendingCount,
      remainingBalance,
      accruedThisYear,
      takenThisYear,
      nextAccrualDate: nextAccrual.toLocaleDateString('en-GB'),
      accrualRate: '1.5 days/month'
    };
  };

  const getEmployeeLeaveRequests = (userId: number) => {
    return leaveRequests.filter((r: any) => {
      if (r.userId !== userId) return false;
      const leaveStart = new Date(r.startDate);
      const leaveEnd = new Date(r.endDate);
      return leaveStart <= endDate && leaveEnd >= startDate;
    });
  };

  const calculateLeaveDaysInPeriod = (leave: any) => {
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);
    const overlapStart = leaveStart > startDate ? leaveStart : startDate;
    const overlapEnd = leaveEnd < endDate ? leaveEnd : endDate;
    if (overlapStart > overlapEnd) return 0;
    return Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 3600 * 24)) + 1;
  };

  const getEmployeePeriodSummary = (userId: number) => {
    const periodLeaves = getEmployeeLeaveRequests(userId);
    const approved = periodLeaves.filter((r: any) => r.status === 'approved');
    const pending = periodLeaves.filter((r: any) => r.status === 'pending');
    const rejected = periodLeaves.filter((r: any) => r.status === 'rejected');

    const approvedDays = approved.reduce((sum: number, l: any) => sum + calculateLeaveDaysInPeriod(l), 0);
    const pendingDays = pending.reduce((sum: number, l: any) => sum + calculateLeaveDaysInPeriod(l), 0);
    const rejectedDays = rejected.reduce((sum: number, l: any) => sum + calculateLeaveDaysInPeriod(l), 0);

    return {
      totalRequests: periodLeaves.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      approvedDays,
      pendingDays,
      rejectedDays,
      totalDays: approvedDays + pendingDays,
      leaves: periodLeaves
    };
  };

  const getMonthlyBreakdown = (userId: number) => {
    const userLeaves = leaveRequests.filter((r: any) => r.userId === userId && r.status === 'approved');
    const monthlyData: Record<string, number> = {};
    userLeaves.forEach((leave: any) => {
      const leaveStartDate = new Date(leave.startDate);
      const leaveEndDate = new Date(leave.endDate);
      const monthKey = `${monthsList[leaveStartDate.getMonth()]} ${leaveStartDate.getFullYear()}`;
      const days = Math.ceil((leaveEndDate.getTime() - leaveStartDate.getTime()) / (1000 * 3600 * 24)) + 1;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + days;
    });
    return monthlyData;
  };

  const periodStats = useMemo(() => {
    let totalApproved = 0, totalPending = 0, totalRejected = 0, totalApprovedDays = 0;
    filteredEmployees.forEach(emp => {
      const summary = getEmployeePeriodSummary(emp.id);
      totalApproved += summary.approvedCount;
      totalPending += summary.pendingCount;
      totalRejected += summary.rejectedCount;
      totalApprovedDays += summary.approvedDays;
    });
    return { totalApproved, totalPending, totalRejected, totalApprovedDays };
  }, [filteredEmployees, leaveRequests, startDate, endDate]);

  const leaveStats = [
    { title: "Approved Leaves", value: periodStats.totalApproved.toString(), icon: <CheckCircle className="h-6 w-6" />, color: "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" },
    { title: "Pending Requests", value: periodStats.totalPending.toString(), icon: <Clock className="h-6 w-6" />, color: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
    { title: "Rejected", value: periodStats.totalRejected.toString(), icon: <CalendarDays className="h-6 w-6" />, color: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
    { title: "Total Employees", value: filteredEmployees.length.toString(), icon: <Users className="h-6 w-6" />, color: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  ];

  const getPeriodLabel = () => {
    if (selectedPeriod === "day") return new Date(selectedDate).toLocaleDateString('en-GB');
    if (selectedPeriod === "week") return `${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}`;
    if (selectedPeriod === "month") return `${monthsList[selectedMonth]} ${selectedYear}`;
    return `Year ${selectedYear}`;
  };

  const getExportFilename = (ext: string) => {
    if (selectedPeriod === "day") return `leave_report_${selectedDate}.${ext}`;
    if (selectedPeriod === "week") return `leave_report_week_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.${ext}`;
    if (selectedPeriod === "month") return `leave_report_${monthsList[selectedMonth]}_${selectedYear}.${ext}`;
    return `leave_report_${selectedYear}.${ext}`;
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' }) as any;
      addWatermark(doc);
      const periodLabels: Record<string, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' };
      const periodLabel = periodLabels[selectedPeriod] || selectedPeriod;
      const dateOptions: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
      addCompanyHeader(doc, { 
        title: "Leave Management Report", 
        subtitle: `Period: ${periodLabel} (${startDate.toLocaleDateString('en-GB', dateOptions)} - ${endDate.toLocaleDateString('en-GB', dateOptions)})` 
      });

      let totApproved = 0, totPending = 0, totRejected = 0, totApprovedDays = 0, totPendingDays = 0, totRejectedDays = 0;

      const tableData = filteredEmployees.map((emp, index) => {
        const summary = getEmployeePeriodSummary(emp.id);
        const empIdFormatted = emp.employeeId || `EMP${String(emp.id).padStart(3, '0')}`;
        const deptName = departments.find(d => d.id === emp.departmentId)?.name || '-';

        totApproved += summary.approvedCount;
        totPending += summary.pendingCount;
        totRejected += summary.rejectedCount;
        totApprovedDays += summary.approvedDays;
        totPendingDays += summary.pendingDays;
        totRejectedDays += summary.rejectedDays;

        return [
          (index + 1).toString(),
          empIdFormatted,
          `${emp.firstName} ${emp.lastName}`,
          deptName,
          summary.totalRequests.toString(),
          summary.approvedCount.toString(),
          summary.approvedDays.toFixed(1),
          summary.pendingCount.toString(),
          summary.pendingDays.toFixed(1),
          summary.rejectedCount.toString(),
          summary.rejectedDays.toFixed(1),
        ];
      });

      tableData.push([
        '', '', '', 'Total',
        (totApproved + totPending + totRejected).toString(),
        totApproved.toString(),
        totApprovedDays.toFixed(1),
        totPending.toString(),
        totPendingDays.toFixed(1),
        totRejected.toString(),
        totRejectedDays.toFixed(1),
      ]);

      autoTable(doc, { 
        head: [['Sr.', 'Emp ID', 'Employee Name', 'Department', 'Total Req.', 'Approved', 'Approved Days', 'Pending', 'Pending Days', 'Rejected', 'Rejected Days']], 
        body: tableData, 
        startY: 70,
        theme: 'grid',
        headStyles: { 
          fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', 
          fontSize: 7, lineWidth: 0.1, lineColor: [0, 0, 0], halign: 'center',
          cellPadding: 2.5
        },
        styles: { 
          fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 7, 
          cellPadding: 2, lineWidth: 0.1, lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { cellWidth: 20 },
          2: { cellWidth: 38 },
          3: { cellWidth: 30 },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 24, halign: 'center' },
          7: { cellWidth: 16, halign: 'center' },
          8: { cellWidth: 22, halign: 'center' },
          9: { cellWidth: 16, halign: 'center' },
          10: { cellWidth: 22, halign: 'center' },
        },
        margin: { top: 70, left: 14, right: 14 },
        didParseCell: (data: any) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      const detailData = filteredEmployees.flatMap((emp) => {
        const userLeaves = getEmployeeLeaveRequests(emp.id);
        const empIdFormatted = emp.employeeId || `EMP${String(emp.id).padStart(3, '0')}`;
        if (userLeaves.length === 0) return [];
        return userLeaves.map((leave: any) => [
          empIdFormatted,
          `${emp.firstName} ${emp.lastName}`,
          leave.leaveType || leave.type || '-',
          new Date(leave.startDate).toLocaleDateString('en-GB'),
          new Date(leave.endDate).toLocaleDateString('en-GB'),
          calculateLeaveDaysInPeriod(leave).toString(),
          leave.status ? leave.status.charAt(0).toUpperCase() + leave.status.slice(1) : 'Pending',
          leave.reason || '-'
        ]);
      });

      if (detailData.length > 0) {
        doc.addPage();
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Leave Requests Detail:', 14, 20);
        autoTable(doc, {
          head: [['Emp ID', 'Employee Name', 'Type', 'From', 'To', 'Days', 'Status', 'Reason']],
          body: detailData,
          startY: 25,
          theme: 'grid',
          headStyles: { 
            fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', 
            fontSize: 7, lineWidth: 0.1, lineColor: [0, 0, 0], halign: 'center',
            cellPadding: 2.5
          },
          styles: { 
            fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 7, 
            cellPadding: 2, lineWidth: 0.1, lineColor: [0, 0, 0]
          }
        });
      }

      addFooter(doc);
      const refNumber = generateReferenceNumber("LEV");
      doc.setPage(1);
      addReferenceNumber(doc, refNumber, 57);
      addDocumentDate(doc, undefined, 57);
      doc.save(getExportFilename("pdf"));
      toast({ title: "PDF Exported Successfully" });
    } catch (error) { 
      console.error(error);
      toast({ title: "Export Failed", variant: "destructive" }); 
    }
  };

  const calculateAllLeaveDays = (leave: any) => {
    const s = new Date(leave.startDate);
    const e = new Date(leave.endDate);
    if (leave.type === 'halfday') return 0.5;
    return Math.ceil((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
  };

  const handleExportExcel = () => {
    const summaryData = filteredEmployees.map(emp => {
      const summary = getEmployeePeriodSummary(emp.id);
      const balance = getLeaveBalance(emp.id);
      const empIdFormatted = emp.employeeId || `EMP${String(emp.id).padStart(3, '0')}`;
      const deptName = departments.find(d => d.id === emp.departmentId)?.name || '-';

      // Compute pending and rejected from ALL leave requests (not period-filtered)
      const allEmpLeaves = (leaveRequests as any[]).filter((r: any) => r.userId === emp.id);
      const pendingDays = allEmpLeaves
        .filter((r: any) => r.status === 'pending')
        .reduce((sum: number, l: any) => sum + calculateAllLeaveDays(l), 0);
      const rejectedDays = allEmpLeaves
        .filter((r: any) => r.status === 'rejected')
        .reduce((sum: number, l: any) => sum + calculateAllLeaveDays(l), 0);

      return {
        'Emp ID': empIdFormatted,
        'Emp Name': `${emp.firstName} ${emp.lastName}`,
        'Department': deptName,
        'Approved Days': summary.approvedDays,
        'Pending Days': pendingDays,
        'Rejected Days': rejectedDays,
        'Total Requests': summary.totalRequests,
        'Remaining Balance': Number(balance.remainingBalance.toFixed(1)),
        'Total Accrued': Number(balance.totalAccrued.toFixed(1)),
        'Accrual Rate': balance.accrualRate,
      };
    });

    const detailData = filteredEmployees.flatMap(emp => {
      const userLeaves = getEmployeeLeaveRequests(emp.id);
      const empIdFormatted = emp.employeeId || `EMP${String(emp.id).padStart(3, '0')}`;
      const deptName = departments.find(d => d.id === emp.departmentId)?.name || '-';
      if (userLeaves.length === 0) return [];
      return userLeaves.map((leave: any) => ({
        'Emp ID': empIdFormatted,
        'Emp Name': `${emp.firstName} ${emp.lastName}`,
        'Department': deptName,
        'Leave Type': leave.leaveType || leave.type || '-',
        'Start Date': new Date(leave.startDate).toLocaleDateString('en-GB'),
        'End Date': new Date(leave.endDate).toLocaleDateString('en-GB'),
        'Days': calculateLeaveDaysInPeriod(leave),
        'Status': (leave.status || 'pending').toUpperCase(),
        'Reason': leave.reason || '-'
      }));
    });

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    summarySheet['!cols'] = [12, 25, 20, 14, 14, 14, 14, 16, 14, 16].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Leave Summary");

    if (detailData.length > 0) {
      const detailSheet = XLSX.utils.json_to_sheet(detailData);
      detailSheet['!cols'] = [12, 25, 20, 15, 12, 12, 8, 12, 30].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(workbook, detailSheet, "Leave Details");
    }

    XLSX.writeFile(workbook, getExportFilename("xlsx"));
    toast({ title: "Excel Exported Successfully" });
  };

  const handleDownloadIndividualPDF = (emp: User) => {
    try {
      const doc = new jsPDF() as any;
      addWatermark(doc);
      const periodLabelsInd: Record<string, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly', year: 'Yearly' };
      const periodLabelInd = periodLabelsInd[selectedPeriod] || selectedPeriod;
      const dateOptionsInd: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
      addCompanyHeader(doc, { 
        title: "Individual Leave Report", 
        subtitle: `${emp.firstName} ${emp.lastName} | Period: ${periodLabelInd} (${startDate.toLocaleDateString('en-GB', dateOptionsInd)} - ${endDate.toLocaleDateString('en-GB', dateOptionsInd)})` 
      });
      const balance = getLeaveBalance(emp.id);
      const empIdFormatted = emp.employeeId || `EMP${String(emp.id).padStart(3, '0')}`;

      autoTable(doc, {
        startY: 70,
        head: [['Particulars', 'Details']],
        body: [
          ['Employee Name', `${emp.firstName} ${emp.lastName}`],
          ['Employee ID', empIdFormatted],
          ['Department', departments.find(d => d.id === emp.departmentId)?.name || '-'],
          ['Position', emp.position || '-'],
          ['Total Accrued', `${balance.totalAccrued.toFixed(1)} days`],
          ['Total Used', `${balance.totalTaken} days`],
          ['Pending Requests', `${balance.pendingRequests} days`],
          ['Remaining Balance', `${balance.remainingBalance.toFixed(1)} days`],
          ['Accrued This Year', `${balance.accruedThisYear.toFixed(1)} days`],
          ['Used This Year', `${balance.takenThisYear} days`],
          ['Accrual Rate', balance.accrualRate],
          ['Next Accrual Date', balance.nextAccrualDate]
        ],
        theme: 'grid',
        headStyles: { 
          fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', 
          lineWidth: 0.1, lineColor: [0, 0, 0], fontSize: 10, halign: 'center',
          cellPadding: 3
        },
        styles: { 
          fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 10, 
          cellPadding: 3, lineWidth: 0.1, lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { cellWidth: 100 }
        }
      });

      const userLeaves = getEmployeeLeaveRequests(emp.id);
      if (userLeaves.length > 0) {
        const detailY = (doc as any).lastAutoTable?.finalY + 15 || 180;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Leave Requests:', 14, detailY);

        autoTable(doc, {
          startY: detailY + 5,
          head: [['Type', 'From', 'To', 'Days', 'Status', 'Reason']],
          body: userLeaves.map((leave: any) => [
            leave.type || '-',
            new Date(leave.startDate).toLocaleDateString('en-GB'),
            new Date(leave.endDate).toLocaleDateString('en-GB'),
            leave.days?.toString() || '1',
            leave.status ? leave.status.charAt(0).toUpperCase() + leave.status.slice(1) : 'Pending',
            leave.reason || '-'
          ]),
          theme: 'grid',
          headStyles: { 
            fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', 
            fontSize: 9, lineWidth: 0.1, lineColor: [0, 0, 0], halign: 'center',
            cellPadding: 3
          },
          styles: { 
            fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 9, 
            cellPadding: 2.5, lineWidth: 0.1, lineColor: [0, 0, 0]
          }
        });
      }

      const monthlyBreakdown = getMonthlyBreakdown(emp.id);
      const monthlyEntries = Object.entries(monthlyBreakdown);
      if (monthlyEntries.length > 0) {
        const monthY = (doc as any).lastAutoTable?.finalY + 15 || 220;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Monthly Leave Summary:', 14, monthY);

        autoTable(doc, {
          startY: monthY + 5,
          head: [['Month', 'Days Used']],
          body: monthlyEntries.map(([month, days]) => [month, days.toString()]),
          theme: 'grid',
          headStyles: { 
            fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', 
            fontSize: 9, lineWidth: 0.1, lineColor: [0, 0, 0], halign: 'center',
            cellPadding: 3
          },
          styles: { 
            fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 9, 
            cellPadding: 2.5, lineWidth: 0.1, lineColor: [0, 0, 0]
          }
        });
      }

      addFooter(doc);
      addHRSignature(doc, (doc as any).lastAutoTable?.finalY + 30 || 200);
      const refNumber = generateReferenceNumber("IND-LEV");
      doc.setPage(1);
      addReferenceNumber(doc, refNumber, 57);
      addDocumentDate(doc, undefined, 57);
      doc.save(`leave_${emp.firstName}_${emp.lastName}.pdf`);
      toast({ title: "PDF Downloaded" });
    } catch (e) { console.error(e); }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-leave-report-title">Leave Reports</h1>
            <p className="text-slate-500 font-medium">Period: {getPeriodLabel()}</p>
          </div>
          <div className="flex gap-2 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32 h-9 font-bold shadow-sm" data-testid="select-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day wise</SelectItem>
                  <SelectItem value="week">Week wise</SelectItem>
                  <SelectItem value="month">Month wise</SelectItem>
                  <SelectItem value="year">Year wise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Selection</label>
              {selectedPeriod === 'month' ? (
                <div className="flex gap-2">
                  <Select 
                    value={monthsList[selectedMonth]} 
                    onValueChange={(v) => {
                      const monthIndex = monthsList.indexOf(v);
                      setSelectedMonth(monthIndex);
                    }}
                  >
                    <SelectTrigger className="w-32 h-9 font-bold shadow-sm" data-testid="select-month">
                      <Calendar className="h-4 w-4 mr-2 text-teal-600" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthsList.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={String(selectedYear)} 
                    onValueChange={(v) => setSelectedYear(parseInt(v))}
                  >
                    <SelectTrigger className="w-24 h-9 font-bold shadow-sm" data-testid="select-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearsList.map(y => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : selectedPeriod === 'week' ? (
                 <Input
                  type="week"
                  value={selectedDate ? (() => {
                    const d = new Date(selectedDate);
                    const year = d.getFullYear();
                    const oneJan = new Date(year, 0, 1);
                    const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
                    const result = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
                    return `${year}-W${String(result).padStart(2, '0')}`;
                  })() : ""}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const [year, week] = e.target.value.split('-W');
                    const d = new Date(parseInt(year), 0, 1);
                    d.setDate(d.getDate() + (parseInt(week) - 1) * 7);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="h-9 w-40 font-bold shadow-sm"
                />
              ) : selectedPeriod === 'year' ? (
                <Select value={String(new Date(selectedDate).getFullYear())} onValueChange={(v) => {
                  const d = new Date(selectedDate);
                  d.setFullYear(parseInt(v));
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}>
                  <SelectTrigger className="w-40 h-9 font-bold shadow-sm">
                    <Calendar className="h-4 w-4 mr-2 text-teal-600" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearsList.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 w-40 font-bold shadow-sm"
                />
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1 px-3 font-bold" onClick={handleExportPDF} data-testid="button-export-pdf">
                <FileDown className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1 px-3 font-bold" onClick={handleExportExcel} data-testid="button-export-excel">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Unit</label>
            <Select value={selectedUnit} onValueChange={(val) => { setSelectedUnit(val); setSelectedDept("all"); }}>
              <SelectTrigger className="w-40 h-9 shadow-sm" data-testid="select-unit">
                <SelectValue placeholder={units?.length === 1 ? units[0].name : "All Units"} />
              </SelectTrigger>
              <SelectContent>
                {units?.length !== 1 && <SelectItem value="all">All Units</SelectItem>}
                {units.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Department</label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-40 h-9 shadow-sm" data-testid="select-dept">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments
                  .filter(d => selectedUnit === "all" || d.unitId == selectedUnit)
                  .map(d => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {leaveStats.map((stat) => (
            <Card key={stat.title} className="hover-elevate">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.color}`}>{stat.icon}</div>
                <div><p className="text-2xl font-bold">{stat.value}</p><p className="text-sm text-slate-500 uppercase tracking-wider">{stat.title}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-600" /> 
                Leave Summary - {getPeriodLabel()}
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search employees..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Sr.</TableHead>
                    <TableHead className="w-20">Emp ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Approved Days</TableHead>
                    <TableHead className="text-center">Pending Days</TableHead>
                    <TableHead className="text-center">Rejected Days</TableHead>
                    <TableHead className="text-center">Total Requests</TableHead>
                    <TableHead className="text-center">Balance</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No employees found for the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((emp, index) => {
                      const summary = getEmployeePeriodSummary(emp.id);
                      const balance = getLeaveBalance(emp.id);
                      const isExpanded = expandedEmployees.has(emp.id);
                      const empIdFormatted = emp.employeeId || `EMP${String(emp.id).padStart(3, '0')}`;
                      const deptName = departments.find(d => d.id === emp.departmentId)?.name || '-';
                      return (
                        <Fragment key={emp.id}>
                          <TableRow 
                            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900" 
                            onClick={() => toggleEmployee(emp.id)}
                            data-testid={`row-emp-${emp.id}`}
                          >
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-mono text-xs">{empIdFormatted}</TableCell>
                            <TableCell className="font-semibold">{emp.firstName} {emp.lastName}</TableCell>
                            <TableCell>{deptName}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">{summary.approvedDays}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">{summary.pendingDays}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">{summary.rejectedDays}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-semibold">{summary.totalRequests}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-bold">{balance.remainingBalance.toFixed(1)}</Badge>
                            </TableCell>
                            <TableCell>
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${emp.id}-detail`}>
                              <TableCell colSpan={10} className="p-0">
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="p-5 bg-slate-50/60 dark:bg-slate-900/40 border-t overflow-hidden">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                                    <div className="p-4 bg-white dark:bg-slate-800 border rounded-xl shadow-sm">
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Accrued</p>
                                      <p className="text-xl font-black text-teal-600">{balance.totalAccrued.toFixed(1)} days</p>
                                      <p className="text-xs text-slate-500">@ {balance.accrualRate}</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-800 border rounded-xl shadow-sm">
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Used</p>
                                      <p className="text-xl font-black text-red-500">{balance.totalTaken} days</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-800 border rounded-xl shadow-sm">
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pending</p>
                                      <p className="text-xl font-black text-amber-600">{balance.pendingRequests} days</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-slate-800 border rounded-xl shadow-sm">
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Remaining Balance</p>
                                      <p className="text-xl font-black text-emerald-600">{balance.remainingBalance.toFixed(1)} days</p>
                                    </div>
                                  </div>
                                  
                                  {summary.leaves.length > 0 && (
                                    <div className="mb-4">
                                      <h4 className="font-bold text-sm mb-2">Leave Requests in Period:</h4>
                                      <div className="overflow-x-auto rounded border">
                                        <Table className="text-xs">
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Type</TableHead>
                                              <TableHead>From</TableHead>
                                              <TableHead>To</TableHead>
                                              <TableHead className="text-center">Days</TableHead>
                                              <TableHead>Status</TableHead>
                                              <TableHead>Reason</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {summary.leaves.map((leave: any, i: number) => (
                                              <TableRow key={i}>
                                                <TableCell>{leave.leaveType || leave.type || '-'}</TableCell>
                                                <TableCell>{new Date(leave.startDate).toLocaleDateString('en-GB')}</TableCell>
                                                <TableCell>{new Date(leave.endDate).toLocaleDateString('en-GB')}</TableCell>
                                                <TableCell className="text-center">{calculateLeaveDaysInPeriod(leave)}</TableCell>
                                                <TableCell>
                                                  <Badge variant={leave.status === 'approved' ? 'default' : leave.status === 'pending' ? 'secondary' : 'destructive'}>
                                                    {(leave.status || 'pending').toUpperCase()}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell>{leave.reason || '-'}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex justify-end gap-3">
                                    <Button variant="outline" size="sm" className="h-8 rounded-lg font-bold gap-2" onClick={(e) => { e.stopPropagation(); handleDownloadIndividualPDF(emp); }} data-testid={`button-pdf-emp-${emp.id}`}><FileDown className="h-3.5 w-3.5" /> PDF</Button>
                                    <Button variant="outline" size="sm" className="h-8 rounded-lg font-bold" onClick={() => window.location.href=`/employee/${emp.id}?tab=leave`} data-testid={`button-profile-emp-${emp.id}`}>Full Profile</Button>
                                  </div>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
