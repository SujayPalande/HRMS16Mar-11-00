import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Download, Eye, IndianRupee, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { generateProfessionalPayslip } from "@/lib/payslip-utils";

interface PaymentRecord {
  id: number;
  employeeId: number;
  month: string;
  paymentStatus: string;
  amount: number;
  paymentDate: string | null;
  paymentMode: string | null;
  referenceNo: string | null;
  createdAt: string | null;
}

interface SystemSettings {
  salaryComponents?: {
    basicSalaryPercentage: number;
    hraPercentage: number;
    epfPercentage: number;
    esicPercentage: number;
    professionalTax: number;
  };
}

export default function MyPayslipsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Determine the current year
  const currentYear = new Date().getFullYear().toString();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  // Fetch payment records for the logged-in employee
  const { data: allPaymentRecords = [], isLoading: loadingPayments } = useQuery<PaymentRecord[]>({
    queryKey: ["/api/payment-records"],
  });

  // Fetch system settings for salary breakdown
  const { data: systemSettings } = useQuery<SystemSettings>({
    queryKey: ["/api/system-settings"],
  });

  const salaryComponents = systemSettings?.salaryComponents || {
    basicSalaryPercentage: 50,
    hraPercentage: 20,
    epfPercentage: 12,
    esicPercentage: 0.75,
    professionalTax: 200,
  };

  // Filter to only show this employee's records
  const myPaymentRecords = useMemo(() => {
    if (!user) return [];
    return allPaymentRecords.filter((r) => r.employeeId === user.id);
  }, [allPaymentRecords, user]);

  // Compute payslip details from payment records
  const payslips = useMemo(() => {
    const salary = (user as any)?.salary || 0;
    return myPaymentRecords.map((record) => {
      const gross = record.amount || salary;
      const basic = Math.round(gross * (salaryComponents.basicSalaryPercentage / 100));
      const hra = Math.round(gross * (salaryComponents.hraPercentage / 100));
      const specialAllowance = gross - basic - hra;
      const epf = Math.round(basic * (salaryComponents.epfPercentage / 100));
      const esic = Math.round(gross * (salaryComponents.esicPercentage / 100));
      const pt = salaryComponents.professionalTax;
      const totalDeductions = epf + esic + pt;
      const netPay = gross - totalDeductions;

      return {
        id: record.id,
        month: record.month,
        grossPay: gross,
        deductions: totalDeductions,
        netPay,
        status: record.paymentStatus === "paid" ? "Paid" : "Pending",
        basic,
        hra,
        specialAllowance,
        epf,
        esic,
        pt,
      };
    });
  }, [myPaymentRecords, user, salaryComponents]);

  // Build a set of available years from the data
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(currentYear); // Always show current year
    payslips.forEach((p) => {
      // month format is "MMM yyyy" e.g. "Apr 2026"
      const parts = p.month.split(" ");
      if (parts.length === 2) years.add(parts[1]);
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [payslips, currentYear]);

  // Filter by selected year
  const filteredPayslips = payslips.filter((p) => p.month.includes(selectedYear));

  // Stats
  const currentMonthNet = filteredPayslips.length > 0 ? filteredPayslips[0].netPay : 0;
  const ytdEarnings = filteredPayslips.reduce((sum, p) => sum + p.grossPay, 0);
  const ytdTax = filteredPayslips.reduce((sum, p) => sum + p.deductions, 0);

  const payslipStats = [
    { title: "Latest Net Pay", value: `₹${currentMonthNet.toLocaleString("en-IN")}`, icon: <IndianRupee className="h-5 w-5" />, color: "bg-teal-50 text-teal-600" },
    { title: "YTD Earnings", value: `₹${ytdEarnings.toLocaleString("en-IN")}`, icon: <TrendingUp className="h-5 w-5" />, color: "bg-green-50 text-green-600" },
    { title: "YTD Deductions", value: `₹${ytdTax.toLocaleString("en-IN")}`, icon: <IndianRupee className="h-5 w-5" />, color: "bg-red-50 text-red-600" },
    { title: "Total Payslips", value: filteredPayslips.length.toString(), icon: <FileText className="h-5 w-5" />, color: "bg-blue-50 text-blue-600" },
  ];

  const handleView = (payslip: any) => {
    setSelectedPayslip(payslip);
    setShowViewDialog(true);
  };

  const handleDownload = (payslip: any) => {
    generateProfessionalPayslip({
      employeeName: user ? `${user.firstName} ${user.lastName}` : "Employee",
      employeeId: (user as any)?.employeeId || "N/A",
      designation: (user as any)?.position || "N/A",
      department: "N/A",
      dateOfJoining: user?.joinDate ? new Date(user.joinDate).toLocaleDateString("en-IN") : "N/A",
      bankAccountNo: (user as any)?.bankAccountNumber || "N/A",
      paidDays: 30,
      lopDays: 0,
      pfAccountNumber: (user as any)?.uanNumber || "N/A",
      uan: (user as any)?.uanNumber || "N/A",
      esiNumber: (user as any)?.esicNumber || "N/A",
      pan: (user as any)?.panCard || "N/A",
      workLocation: (user as any)?.workLocation || "N/A",
      month: payslip.month,
      breakdown: {
        gross: payslip.grossPay,
        basic: payslip.basic,
        hra: payslip.hra,
        specialAllowance: payslip.specialAllowance,
        da: 0,
        conveyance: 0,
        medical: 0,
        epf: payslip.epf,
        esic: payslip.esic,
        pt: payslip.pt,
        deductions: payslip.deductions,
        net: payslip.netPay,
      },
    });
    toast({
      title: "Downloaded",
      description: `Payslip for ${payslip.month} downloaded successfully.`,
    });
  };

  if (loadingPayments) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <span className="ml-2 text-slate-600">Loading payslips...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">My Payslips</h1>
            <p className="text-slate-500 mt-1">View and download your monthly payslips</p>
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28" data-testid="select-year">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {payslipStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card data-testid={`card-stat-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                      <p className="text-sm text-slate-500">{stat.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" />
              Payslip History
            </CardTitle>
            <CardDescription>Your monthly payslips for {selectedYear}</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPayslips.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium">No payslips found for {selectedYear}</p>
                <p className="text-sm mt-1">Payslips will appear here once salary is processed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Month</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Gross Pay</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Deductions</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Net Pay</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayslips.map((payslip, index) => (
                      <tr key={payslip.id} className="border-b hover:bg-slate-50" data-testid={`row-payslip-${index}`}>
                        <td className="py-3 px-4 font-medium">{payslip.month}</td>
                        <td className="py-3 px-4">₹{payslip.grossPay.toLocaleString("en-IN")}</td>
                        <td className="py-3 px-4 text-red-600">-₹{payslip.deductions.toLocaleString("en-IN")}</td>
                        <td className="py-3 px-4 font-medium text-green-600">₹{payslip.netPay.toLocaleString("en-IN")}</td>
                        <td className="py-3 px-4">
                          <Badge variant={payslip.status === "Paid" ? "default" : "secondary"}>{payslip.status}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleView(payslip)} data-testid={`button-view-${index}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDownload(payslip)} data-testid={`button-download-${index}`}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payslip - {selectedPayslip?.month}</DialogTitle>
          </DialogHeader>
          {selectedPayslip && (
            <div className="space-y-6 py-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">Cybaemtech Pvt. Ltd.</h2>
                <p className="text-slate-500">Pay Period: {selectedPayslip.month}</p>
                <p className="text-sm text-slate-400">Employee: {user?.firstName} {user?.lastName}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-green-600">Earnings</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Basic Salary</span>
                      <span>₹{selectedPayslip.basic.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">HRA</span>
                      <span>₹{selectedPayslip.hra.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Special Allowance</span>
                      <span>₹{selectedPayslip.specialAllowance.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Gross Earnings</span>
                      <span className="text-green-600">₹{selectedPayslip.grossPay.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-red-600">Deductions</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">EPF</span>
                      <span>₹{selectedPayslip.epf.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">ESIC</span>
                      <span>₹{selectedPayslip.esic.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Professional Tax</span>
                      <span>₹{selectedPayslip.pt.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Deductions</span>
                      <span className="text-red-600">₹{selectedPayslip.deductions.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Net Pay</span>
                  <span className="text-2xl font-bold text-green-600">₹{selectedPayslip.netPay.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
            {selectedPayslip && (
              <Button onClick={() => handleDownload(selectedPayslip)}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
