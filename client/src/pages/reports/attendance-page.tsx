import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ClipboardList, 
  Calendar, 
  Users, 
  TrendingUp, 
  Search, 
  FileSpreadsheet, 
  Building2, 
  ChevronRight, 
  ChevronDown, 
  FileDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { addCompanyHeader, addWatermark, addHRSignature, addFooter, addDocumentDate, generateReferenceNumber, addReferenceNumber } from "@/lib/pdf-utils";
import { User, Department, Unit } from "@shared/schema";

export default function AttendanceReportPage() {
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
  const { data: attendanceRecords = [] } = useQuery<any[]>({ queryKey: ["/api/attendance"] });
  const { data: leaveRequests = [] } = useQuery<any[]>({ queryKey: ["/api/leave-requests"] });

  const toggleEmployee = (empId: number) => {
    const newSet = new Set(expandedEmployees);
    if (newSet.has(empId)) newSet.delete(empId);
    else newSet.add(empId);
    setExpandedEmployees(newSet);
  };

  const getReportPeriod = () => {
    if (selectedPeriod === "day") {
      const d = new Date(selectedDate);
      const startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      return { startDate, endDate };
    } else if (selectedPeriod === "week") {
      const d = new Date(selectedDate);
      const dayOfWeek = d.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday, 0, 0, 0, 0);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6, 23, 59, 59, 999);
      return { startDate, endDate };
    } else if (selectedPeriod === "month") {
      const startDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
      return { startDate, endDate };
    } else {
      const startDate = new Date(selectedYear, 0, 1, 0, 0, 0, 0);
      const endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
      return { startDate, endDate };
    }
  };

  const { startDate, endDate } = getReportPeriod();

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp: User) => {
      const dept = departments.find(d => d.id === emp.departmentId);
      const matchesUnit = selectedUnit === 'all' || (dept && dept.unitId === parseInt(selectedUnit));
      const matchesDept = selectedDept === 'all' || emp.departmentId === parseInt(selectedDept);
      const empIdFormatted = `EMP${String(emp.id).padStart(3, '0')}`;
      const matchesSearch = searchQuery === "" || 
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        empIdFormatted.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesUnit && matchesDept && matchesSearch;
    });
  }, [employees, departments, selectedUnit, selectedDept, searchQuery]);

  const filteredDepartments = departments.filter((d: Department) => 
    (selectedUnit === "all" || d.unitId === parseInt(selectedUnit)) &&
    (selectedDept === "all" || d.id === parseInt(selectedDept))
  );

  const getDetailedAttendance = (userId: number) => {
    const userRecords = attendanceRecords.filter(r => {
      const d = new Date(r.date);
      return r.userId === userId && d >= startDate && d <= endDate;
    });
    return {
      present: userRecords.filter(r => r.status === 'present').length,
      absent: userRecords.filter(r => r.status === 'absent').length,
      halfday: userRecords.filter(r => r.status === 'halfday').length,
      late: userRecords.filter(r => r.status === 'late').length,
      total: userRecords.length
    };
  };

  const reportStats = [
    { title: "Total Employees", value: filteredEmployees.length.toString(), icon: <Users className="h-6 w-6" />, color: "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" },
    { title: "Units", value: units.length.toString(), icon: <Building2 className="h-6 w-6" />, color: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
    { title: "Departments", value: departments.length.toString(), icon: <ClipboardList className="h-6 w-6" />, color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" },
    { title: "Present Today", value: attendanceRecords.filter(r => new Date(r.date).toDateString() === new Date().toDateString() && r.status === 'present').length.toString(), icon: <TrendingUp className="h-6 w-6" />, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
  ];

  const getPeriodLabel = () => {
    const periodLabels: Record<string, string> = {
      day: 'Daily',
      week: 'Weekly',
      month: 'Monthly',
      year: 'Yearly'
    };
    return periodLabels[selectedPeriod] || selectedPeriod;
  };

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return `${startDate.toLocaleDateString('en-GB', options)} - ${endDate.toLocaleDateString('en-GB', options)}`;
  };

  const getActivePeriodDisplay = () => {
    if (selectedPeriod === "day") return new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (selectedPeriod === "week") return `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    if (selectedPeriod === "month") return `${monthsList[selectedMonth]} ${selectedYear}`;
    return `Year ${selectedYear}`;
  };

  const getExportFilename = (ext: string) => {
    if (selectedPeriod === "day") return `attendance_report_${selectedDate}.${ext}`;
    if (selectedPeriod === "week") return `attendance_report_week_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.${ext}`;
    if (selectedPeriod === "month") return `attendance_report_${monthsList[selectedMonth]}_${selectedYear}.${ext}`;
    return `attendance_report_${selectedYear}.${ext}`;
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' }) as any;
      addWatermark(doc);
      addCompanyHeader(doc, { 
        title: "Unit-Wise Attendance Report", 
        subtitle: `Period: ${getPeriodLabel()} (${formatDateRange()})` 
      });

      let totalPresent = 0, totalAbsent = 0, totalLeavesDays = 0, totalHalfDays = 0, totalLate = 0, totalPayable = 0;

      const tableData = filteredEmployees.map((emp, index) => {
        const stats = getDetailedAttendance(emp.id);
        const userLeaves = leaveRequests.filter((r: any) => {
          const start = new Date(r.startDate);
          return r.userId === emp.id && start >= startDate && start <= endDate && r.status === 'approved';
        });
        const leaveDays = userLeaves.reduce((acc: number, curr: any) => {
          const s = new Date(curr.startDate);
          const e = new Date(curr.endDate);
          const diffTime = Math.abs(e.getTime() - s.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          return acc + diffDays;
        }, 0);
        const payable = stats.present + (stats.halfday * 0.5) + leaveDays;
        const empIdFormatted = `EMP${String(emp.id).padStart(3, '0')}`;

        totalPresent += stats.present;
        totalAbsent += stats.absent;
        totalLeavesDays += leaveDays;
        totalHalfDays += stats.halfday;
        totalLate += stats.late;
        totalPayable += payable;

        return [
          (index + 1).toString(),
          empIdFormatted,
          `${emp.firstName} ${emp.lastName}`,
          departments.find(d => d.id === emp.departmentId)?.name || '-',
          stats.present.toString(),
          stats.absent.toString(),
          leaveDays.toString(),
          stats.halfday.toString(),
          stats.late.toString(),
          payable % 1 === 0 ? payable.toString() : payable.toFixed(1)
        ];
      });

      tableData.push([
        '', '', '', 'Total',
        totalPresent.toString(),
        totalAbsent.toString(),
        totalLeavesDays.toString(),
        totalHalfDays.toString(),
        totalLate.toString(),
        totalPayable % 1 === 0 ? totalPayable.toString() : totalPayable.toFixed(1)
      ]);

      autoTable(doc, {
        head: [['Sr.', 'Emp ID', 'Employee Name', 'Department', 'Present', 'Absent', 'Leaves', 'Half Day', 'Late', 'Payable Days']],
        body: tableData,
        startY: 70,
        theme: 'grid',
        headStyles: { 
          fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', 
          lineWidth: 0.1, lineColor: [0, 0, 0], fontSize: 9, halign: 'center',
          cellPadding: 3
        },
        styles: { 
          fillColor: [255, 255, 255], textColor: [0, 0, 0], fontSize: 9, 
          cellPadding: 2.5, lineWidth: 0.1, lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { cellWidth: 25 },
          2: { cellWidth: 50 },
          3: { cellWidth: 45 },
          4: { halign: 'center', cellWidth: 22 },
          5: { halign: 'center', cellWidth: 22 },
          6: { halign: 'center', cellWidth: 22 },
          7: { halign: 'center', cellWidth: 22 },
          8: { halign: 'center', cellWidth: 22 },
          9: { halign: 'center', cellWidth: 28 }
        },
        margin: { top: 70, left: 14, right: 14 },
        didParseCell: (data: any) => {
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      addFooter(doc);
      const refNumber = generateReferenceNumber("ATT");
      addReferenceNumber(doc, refNumber, 68);
      addDocumentDate(doc, undefined, 68);
      doc.save(getExportFilename("pdf"));
      toast({ title: "PDF Exported Successfully" });
    } catch (error) {
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  const handleDownloadIndividualPDF = (emp: User) => {
    try {
      const doc = new jsPDF() as any;
      addWatermark(doc);
      addCompanyHeader(doc, { 
        title: "Individual Attendance Report", 
        subtitle: `Period: ${getPeriodLabel()} (${formatDateRange()})` 
      });
      const stats = getDetailedAttendance(emp.id);
      const userLeaves = leaveRequests.filter((r: any) => {
        const start = new Date(r.startDate);
        return r.userId === emp.id && start >= startDate && start <= endDate && r.status === 'approved';
      });
      const totalLeaves = userLeaves.reduce((acc: number, curr: any) => {
        const s = new Date(curr.startDate);
        const e = new Date(curr.endDate);
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return acc + diffDays;
      }, 0);
      const payableDays = stats.present + (stats.halfday * 0.5) + totalLeaves;
      autoTable(doc, {
        startY: 70,
        head: [['Particulars', 'Details']],
        body: [
          ['Employee Name', `${emp.firstName} ${emp.lastName}`],
          ['Employee ID', `EMP${String(emp.id).padStart(3, '0')}`],
          ['Department', departments.find(d => d.id === emp.departmentId)?.name || '-'],
          ['Position', emp.position || '-'],
          ['Present Days', stats.present.toString()],
          ['Absent Days', stats.absent.toString()],
          ['Approved Leaves', totalLeaves.toString()],
          ['Half Days', stats.halfday.toString()],
          ['Late Arrivals', stats.late.toString()],
          ['Total Payable Days', payableDays % 1 === 0 ? payableDays.toString() : payableDays.toFixed(1)],
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
      addFooter(doc);
      addHRSignature(doc, (doc as any).lastAutoTable?.finalY + 30 || 200);
      const refNumber = generateReferenceNumber("IND-ATT");
      addReferenceNumber(doc, refNumber, 68);
      addDocumentDate(doc, undefined, 68);
      doc.save(`attendance_${emp.firstName}_${emp.lastName}.pdf`);
    } catch (error) {
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  const handleExportExcel = () => {
    const dataToExport = filteredEmployees.map(emp => {
      const stats = getDetailedAttendance(emp.id);
      const userRecords = attendanceRecords.filter((r: any) => {
        const d = new Date(r.date);
        return r.userId === emp.id && d >= startDate && d <= endDate;
      });
      const userLeaves = leaveRequests.filter((r: any) => {
        const start = new Date(r.startDate);
        return r.userId === emp.id && start >= startDate && start <= endDate && r.status === 'approved';
      });
      const totalLeaves = userLeaves.reduce((acc: number, curr: any) => {
        const s = new Date(curr.startDate);
        const e = new Date(curr.endDate);
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return acc + diffDays;
      }, 0);
      
      // Get the most recent record for check-in/out times
      const latestRecord = userRecords.length > 0 ? userRecords[userRecords.length - 1] : null;
      const empIdFormatted = `EMP${String(emp.id).padStart(3, '0')}`;
      
      return {
        'Employee ID': empIdFormatted,
        'Name': `${emp.firstName} ${emp.lastName}`,
        'Position': emp.position || '-',
        'Department': departments.find(d => d.id === emp.departmentId)?.name || '-',
        'Check-in Time': latestRecord?.checkInTime ? new Date(latestRecord.checkInTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-',
        'Check-out Time': latestRecord?.checkOutTime ? new Date(latestRecord.checkOutTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-',
        'Present Days': stats.present,
        'Absent Days': stats.absent,
        'Leaves': totalLeaves,
        'Half Days': stats.halfday,
        'Late Arrivals': stats.late,
        'Payable Days': (stats.present + (stats.halfday * 0.5) + totalLeaves)
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, getExportFilename("xlsx"));
    toast({ title: "Excel Exported Successfully" });
  };

  const handleExportIndividualExcel = (emp: User) => {
    const stats = getDetailedAttendance(emp.id);
    const data = [{
      'Employee Name': `${emp.firstName} ${emp.lastName}`,
      'Employee ID': `EMP${String(emp.id).padStart(3, '0')}`,
      'Department': departments.find(d => d.id === emp.departmentId)?.name || '-',
      'Present Days': stats.present,
      'Absent Days': stats.absent,
      'Payable Days': stats.present + stats.halfday
    }];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `attendance_${emp.firstName}_${emp.lastName}.xlsx`);
    toast({ title: "Individual Excel Exported" });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Attendance Report</h1>
            <p className="text-slate-500 font-medium">Analysis of workforce presence and patterns</p>
          </div>
          <div className="flex gap-2 flex-wrap items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32 h-9 font-bold shadow-sm">
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
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
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
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Unit</label>
              <Select value={selectedUnit} onValueChange={(val) => { setSelectedUnit(val); setSelectedDept("all"); }}>
                <SelectTrigger className="w-36 h-9 font-bold shadow-sm" data-testid="select-unit">
                  <Building2 className="h-4 w-4 mr-2 text-teal-600" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {units.map((u: Unit) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Department</label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-40 h-9 font-bold shadow-sm" data-testid="select-department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments
                    .filter((d: Department) => selectedUnit === "all" || d.unitId === parseInt(selectedUnit))
                    .map((d: Department) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-800 h-9">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2 font-bold" onClick={handleExportPDF}>
                <FileDown className="h-3 w-3" /> PDF
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2 font-bold" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-3 w-3" /> Excel
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportStats.map((stat, index) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${stat.color} shadow-sm`}>{stat.icon}</div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-teal-600" /> Unit Hierarchy View
                </CardTitle>
                <p className="text-sm text-slate-500 font-medium">
                  Showing: <span className="font-bold text-teal-700 dark:text-teal-400">{getPeriodLabel()} — {getActivePeriodDisplay()}</span>
                </p>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search employees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredDepartments.map((dept) => {
              const deptEmployees = filteredEmployees.filter(e => e.departmentId === dept.id);
              if (deptEmployees.length === 0) return null;
              return (
                <div key={dept.id} className="border rounded-lg overflow-hidden">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b flex justify-between items-center">
                    <span className="font-semibold">{dept.name}</span>
                    <Badge variant="secondary">{deptEmployees.length} Employees</Badge>
                  </div>
                  <div className="divide-y">
                    {deptEmployees.map(emp => {
                      const stats = getDetailedAttendance(emp.id);
                      const isExpanded = expandedEmployees.has(emp.id);
                      const empIdFormatted = `EMP${String(emp.id).padStart(3, '0')}`;
                      return (
                        <div key={emp.id}>
                          <button onClick={() => toggleEmployee(emp.id)} className="w-full p-4 flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                              {isExpanded ? <ChevronDown className="h-4 w-4 text-teal-600" /> : <ChevronRight className="h-4 w-4" />}
                              <div className="text-left">
                                <p className="font-semibold">{emp.firstName} {emp.lastName}</p>
                                <p className="text-xs text-slate-500 uppercase tracking-widest">{empIdFormatted} • {emp.position}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-emerald-600 border-emerald-100 font-bold">Present: {stats.present}</Badge>
                              <Badge variant="outline" className="text-rose-600 border-rose-100 font-bold">Absent: {stats.absent}</Badge>
                            </div>
                          </button>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-slate-50/40 p-5 border-t">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Present</p>
                                    <p className="text-xl font-black text-emerald-600">{stats.present}</p>
                                  </div>
                                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Absent</p>
                                    <p className="text-xl font-black text-rose-600">{stats.absent}</p>
                                  </div>
                                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Half Day</p>
                                    <p className="text-xl font-black text-amber-600">{stats.halfday}</p>
                                  </div>
                                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Late</p>
                                    <p className="text-xl font-black text-blue-600">{stats.late}</p>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-3">
                                  <Button variant="outline" size="sm" className="h-8 font-bold gap-2" onClick={() => handleDownloadIndividualPDF(emp)}><FileDown className="h-3.5 w-3.5" /> PDF</Button>
                                  <Button variant="outline" size="sm" className="h-8 font-bold gap-2" onClick={() => handleExportIndividualExcel(emp)}><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
