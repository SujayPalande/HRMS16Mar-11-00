import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout/app-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { PendingApprovals } from "@/components/dashboard/pending-approvals";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { AttendanceOverview } from "@/components/dashboard/attendance-overview";
import { RecentEmployees } from "@/components/dashboard/recent-employees";
import { WelcomeSection } from "@/components/dashboard/welcome-section";
import { DepartmentDistribution } from "@/components/dashboard/department-distribution";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DownloadIcon, RefreshCw, TrendingUp } from "lucide-react";
import { User, Department, LeaveRequest, Holiday, Attendance, Unit } from "@shared/schema";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { user } = useAuth();
  const today = new Date();
  const [dateRange, setDateRange] = useState("month");
  const [refreshKey, setRefreshKey] = useState(Date.now());

  // Fetch employees data
  const { data: employees = [], isLoading: loadingEmployees } = useQuery<User[]>({
    queryKey: ["/api/employees", refreshKey],
  });

  // Fetch departments data
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments", refreshKey],
  });

  // Fetch units data
  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["/api/masters/units", refreshKey],
  });

  // Fetch leave requests (all for admin/hr/manager, user's own for employee)
  const { data: pendingLeaveRequests = [] } = useQuery<LeaveRequest[]>({
    queryKey: user?.role === "employee" 
      ? ["/api/leave-requests", { userId: user.id }, refreshKey]
      : ["/api/leave-requests", { status: "pending" }, refreshKey],
  });

  // Fetch today's attendance
  const { data: todayAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { date: format(today, 'yyyy-MM-dd') }, refreshKey],
  });

  // Fetch user's personal attendance (for employee role)
  const { data: userAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", { userId: user?.id }, refreshKey],
    enabled: user?.role === "employee",
  });

  // Fetch upcoming holidays
  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays", refreshKey],
  });

  // Calculate real financial data from employees
  const totalMonthlyPayroll = employees.reduce((sum, emp) => sum + ((emp.salary || 0) / 12), 0);
  const totalPayrollLakhs = (totalMonthlyPayroll / 100000).toFixed(2);
  const pfRate = 0.12, esiRate = 0.0325, ptMonthly = 200;
  const totalStatutoryDues = employees.reduce((sum, emp) => {
    const monthly = (emp.salary || 0) / 12;
    const basic = monthly * 0.4;
    return sum + (basic * pfRate) + (monthly <= 21000 ? monthly * esiRate : 0) + ptMonthly;
  }, 0);
  const statutoryLakhs = (totalStatutoryDues / 100000).toFixed(2);
  const tdsLiability = employees.reduce((sum, emp) => {
    const annual = emp.salary || 0;
    const taxable = Math.max(0, annual - 250000);
    if (taxable <= 250000) return sum + (taxable * 0.05) / 12;
    if (taxable <= 500000) return sum + (12500 + (taxable - 250000) * 0.20) / 12;
    return sum + (62500 + (taxable - 500000) * 0.30) / 12;
  }, 0);
  const tdsLakhs = (tdsLiability / 100000).toFixed(2);

  // Build per-unit organization data
  const orgData = units.map(unit => {
    const unitDeptIds = departments.filter(d => d.unitId === unit.id).map(d => d.id);
    const unitEmployees = employees.filter(e => e.departmentId != null && unitDeptIds.includes(e.departmentId));
    const empCount = unitEmployees.length;
    const unitPayroll = unitEmployees.reduce((sum, e) => sum + ((e.salary || 0) / 12), 0);
    const complianceScore = empCount > 0 ? 96 : 0;
    return { name: unit.name, count: empCount, payroll: unitPayroll, compliance: `${complianceScore}%`, payrollStatus: unitPayroll > 0 ? "Processed" : "Pending" };
  });
  // If no units match (unitId not set on all employees), fall back to showing all employees under first unit
  const orgTableData = orgData.length > 0 ? orgData : [
    { name: "Cybaem Tech Pvt Ltd", count: employees.length, payroll: totalMonthlyPayroll, compliance: "98%", payrollStatus: "Processed" }
  ];

  // Calculate attendance statistics
  const totalEmployees = employees.length;
  const presentToday = todayAttendance.filter(record => record.status === 'present').length;
  const onLeaveToday = pendingLeaveRequests.filter(request => {
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    return (
      request.status === 'approved' &&
      startDate <= today && today <= endDate
    );
  }).length;
  const absentToday = totalEmployees - (presentToday + onLeaveToday);

  // Filter upcoming holidays
  const upcomingHolidays = holidays
    .filter(holiday => new Date(holiday.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Handler for refreshing data
  const handleRefresh = () => {
    setRefreshKey(Date.now());
  };

  // Toggle date range
  const toggleDateRange = () => {
    setDateRange(dateRange === "month" ? "week" : "month");
  };

  // Determine if user has admin/management privileges
  const isSuperAdmin = user?.role === "admin";
  const isHRAdmin = user?.role === "hr";
  const isManager = user?.role === "manager";
  const isAdminRole = isSuperAdmin || isHRAdmin || isManager;
  
  // Get user's personal stats (for employee dashboard)
  const getUserPersonalStats = () => {
    if (!user || !userAttendance.length) return { present: 0, absent: 0, late: 0 };
    
    const thisMonth = userAttendance.filter(record => {
      const checkInTime = record.checkInTime;
      if (!checkInTime) return false;
      const recordDate = new Date(checkInTime);
      return recordDate.getMonth() === today.getMonth() && 
             recordDate.getFullYear() === today.getFullYear();
    });
    
    const present = thisMonth.filter(record => record.status === 'present' || record.status === 'late').length;
    const absent = thisMonth.filter(record => record.status === 'absent').length;
    const late = thisMonth.filter(record => record.status === 'late').length;
    
    return { present, absent, late };
  };

  const personalStats = getUserPersonalStats();

  // Hide dashboard overview for developer users
  if (user?.role === 'developer') {
    return (
      <AppLayout>
        <div className="space-y-6 pb-8">
          <div className="text-center py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg shadow-sm p-8"
            >
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Developer Mode</h1>
              <p className="text-gray-600 mb-6">
                Welcome to Developer Mode. Use the System Settings to configure the HR system.
              </p>
              <Button 
                onClick={() => window.location.href = '/developer'}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Go to System Settings
              </Button>
            </motion.div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        {/* Welcome section with user greeting */}
        <WelcomeSection />
        
        {/* Page header */}
        <motion.h1 
          className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {isSuperAdmin ? "Super Admin Executive Dashboard" : isHRAdmin ? "HR Management Dashboard" : "Dashboard Overview"}
        </motion.h1>
        
        {/* Statistics cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          {isSuperAdmin ? (
            // Super Admin view - High level metrics
            <>
              <StatCard
                title="Total Employees"
                value={totalEmployees}
                total={totalEmployees}
                percentage={100}
                status="present"
              />
              <StatCard
                title="Monthly Payroll"
                value={`₹${totalPayrollLakhs}L`}
                total={`${totalEmployees} employees`}
                percentage={90}
                status="leave"
              />
              <StatCard
                title="Statutory Dues"
                value={`₹${statutoryLakhs}L`}
                total="PF/ESI/PT"
                percentage={85}
                status="present"
              />
              <StatCard
                title="TDS Liability"
                value={`₹${tdsLakhs}L`}
                total="Monthly estimate"
                percentage={98}
                status="present"
              />
            </>
          ) : isAdminRole ? (
            // HR/Manager view - Employee focused stats
            <>
              <StatCard
                title="Present Today"
                value={presentToday}
                total={totalEmployees}
                percentage={totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0}
                status="present"
              />
              <StatCard
                title="On Leave Today"
                value={onLeaveToday}
                total={totalEmployees}
                percentage={totalEmployees > 0 ? (onLeaveToday / totalEmployees) * 100 : 0}
                status="leave"
              />
              <StatCard
                title="Absent Today"
                value={absentToday}
                total={totalEmployees}
                percentage={totalEmployees > 0 ? (absentToday / totalEmployees) * 100 : 0}
                status="absent"
              />
              <StatCard
                title="Total Workforce"
                value={totalEmployees}
                total={totalEmployees}
                percentage={100}
                status="present"
              />
            </>
          ) : (
            // Employee view - Personal stats
            <>
              <StatCard
                title="Days Present"
                value={personalStats.present}
                total={personalStats.present + personalStats.absent + personalStats.late}
                percentage={personalStats.present + personalStats.absent + personalStats.late > 0 
                  ? (personalStats.present / (personalStats.present + personalStats.absent + personalStats.late)) * 100 
                  : 0}
                status="present"
              />
              <StatCard
                title="Leave Balance"
                value={15}
                total={24}
                percentage={62.5}
                status="leave"
              />
              <StatCard
                title="Late Days"
                value={personalStats.late}
                total={personalStats.present + personalStats.absent + personalStats.late}
                percentage={personalStats.present + personalStats.absent + personalStats.late > 0 
                  ? (personalStats.late / (personalStats.present + personalStats.absent + personalStats.late)) * 100 
                  : 0}
                status="absent"
              />
            </>
          )}
        </div>
        
        {/* Quick Actions Section */}
        <QuickActions />
        
        {isSuperAdmin ? (
          // Super Admin specific view
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <Card className="p-6 border-indigo-100 shadow-lg bg-gradient-to-br from-white to-indigo-50/30">
                 <CardHeader className="pb-2">
                   <CardTitle className="text-xl font-bold flex items-center gap-2">
                     <div className="h-8 w-1 bg-indigo-600 rounded-full" />
                     Group Financial Summary
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <div className="space-y-4">
                     <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex justify-between items-center">
                       <div>
                         <p className="text-xs text-emerald-600 uppercase tracking-wider font-bold">Total Payout (Monthly)</p>
                         <p className="text-2xl font-bold text-emerald-900">₹{totalPayrollLakhs}L</p>
                       </div>
                       <TrendingUp className="text-emerald-500 h-8 w-8 opacity-50" />
                     </div>
                     <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex justify-between items-center">
                       <div>
                         <p className="text-xs text-blue-600 uppercase tracking-wider font-bold">Total Statutory Dues</p>
                         <p className="text-2xl font-bold text-blue-900">₹{statutoryLakhs}L</p>
                       </div>
                       <Badge className="bg-blue-500">PF/ESI/PT</Badge>
                     </div>
                     <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 flex justify-between items-center">
                       <div>
                         <p className="text-xs text-purple-600 uppercase tracking-wider font-bold">Total TDS Liability</p>
                         <p className="text-2xl font-bold text-purple-900">₹{tdsLakhs}L</p>
                       </div>
                       <RefreshCw className="text-purple-500 h-8 w-8 opacity-50" />
                     </div>
                   </div>
                 </CardContent>
               </Card>

               <Card className="p-6 border-indigo-100 shadow-lg lg:col-span-2">
                 <CardHeader className="pb-2 flex flex-row items-center justify-between">
                   <CardTitle className="text-xl font-bold flex items-center gap-2">
                     <div className="h-8 w-1 bg-indigo-600 rounded-full" />
                     Organization Compliance & Payroll Status
                   </CardTitle>
                   <Button variant="outline" size="sm" className="gap-2">
                     <DownloadIcon className="h-4 w-4" />
                     Export Master Report
                   </Button>
                 </CardHeader>
                 <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                          <tr>
                            <th className="py-3 px-4">Organization</th>
                            <th className="py-3 px-4">Employees</th>
                            <th className="py-3 px-4">Payroll Status</th>
                            <th className="py-3 px-4">Compliance</th>
                            <th className="py-3 px-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {orgTableData.map((org, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4 font-medium text-slate-900">{org.name}</td>
                              <td className="py-3 px-4 text-slate-600">{org.count}</td>
                              <td className="py-3 px-4">
                                <Badge variant={org.payrollStatus === "Processed" ? "default" : "outline"}>
                                  {org.payrollStatus}
                                </Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500" style={{ width: org.compliance }} />
                                  </div>
                                  <span className="text-xs font-semibold">{org.compliance}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-indigo-600 hover:underline cursor-pointer font-medium">View Details</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                 </CardContent>
               </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AttendanceOverview />
              <DepartmentDistribution employees={employees} departments={departments} />
            </div>
          </div>
        ) : isAdminRole ? (
          // HR Admin / Manager view
          <>
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AttendanceOverview />
              <DepartmentDistribution employees={employees} departments={departments} />
            </div>
            
            {/* Approvals and Upcoming Events */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PendingApprovals pendingRequests={pendingLeaveRequests} />
              </div>
              <div>
                <UpcomingEvents holidays={upcomingHolidays} />
              </div>
            </div>
            
            {/* Recent Employees */}
            <RecentEmployees employees={employees.slice(0, 5)} departments={departments} />
          </>
        ) : (
          // Employee view
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <UpcomingEvents holidays={upcomingHolidays} />
            </div>
            <div>
              {pendingLeaveRequests.length > 0 && (
                <PendingApprovals 
                  pendingRequests={pendingLeaveRequests} 
                  isPersonalView={true}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
