import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileSignature, Plus, Search, Download, Eye, Send, FileText, X } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { addCompanyHeader, addWatermark, addHRSignature, addFooter, addDocumentDate, generateReferenceNumber, addReferenceNumber, COMPANY_NAME, COMPANY_ADDRESS, HR_NAME, HR_DESIGNATION } from "@/lib/pdf-utils";

interface AppointmentLetter {
  id: number;
  employee: string;
  position: string;
  department: string;
  joinDate: string;
  generatedDate: string;
  status: string;
  salary?: string;
}

const letterStatuses = ["Sent", "Sent", "Pending", "Sent", "Not Generated"];
const letterGenDates = ["Jan 15, 2026", "Jan 18, 2026", "Jan 20, 2026", "Jan 22, 2026", "-"];

export default function AppointmentLettersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<AppointmentLetter | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    employee: "",
    position: "",
    department: "",
    joinDate: "",
    salary: ""
  });

  const [selectedUnit, setSelectedUnit] = useState("all");
  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ['/api/employees'],
  });
  const { data: deptList = [] } = useQuery<{id: number; name: string; unitId?: number}[]>({ queryKey: ['/api/departments'] });
  const { data: units = [] } = useQuery<{id: number; name: string}[]>({ queryKey: ['/api/masters/units'] });

  const [letterOverrides, setLetterOverrides] = useState<AppointmentLetter[]>([]);

  const baseLetters = useMemo<AppointmentLetter[]>(() => {
    return employees.slice(0, 8).map((emp, i) => ({
      id: emp.id,
      employee: `${emp.firstName} ${emp.lastName}`,
      position: emp.designation || emp.role || "Employee",
      department: emp.department || "General",
      joinDate: emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "Jan 1, 2026",
      generatedDate: letterGenDates[i % letterGenDates.length],
      status: letterStatuses[i % letterStatuses.length],
      salary: emp.salary ? emp.salary.toString() : "800000",
    }));
  }, [employees]);

  const allLetters = useMemo(() => {
    const ids = new Set(letterOverrides.map(l => l.id));
    return [...baseLetters.filter(l => !ids.has(l.id)), ...letterOverrides];
  }, [baseLetters, letterOverrides]);

  const setLetters = (updater: AppointmentLetter[] | ((prev: AppointmentLetter[]) => AppointmentLetter[])) => {
    const next = typeof updater === 'function' ? updater([...allLetters]) : updater;
    setLetterOverrides(next);
  };

  const letterStats = [
    { title: "Total Generated", value: allLetters.filter(l => l.status !== "Not Generated").length.toString(), icon: <FileSignature className="h-5 w-5" /> },
    { title: "Total Employees", value: allLetters.length.toString(), icon: <FileText className="h-5 w-5" />, color: "bg-blue-50 text-blue-600" },
    { title: "Sent", value: allLetters.filter(l => l.status === "Sent").length.toString(), icon: <Send className="h-5 w-5" />, color: "bg-green-50 text-green-600" },
    { title: "Pending", value: allLetters.filter(l => l.status === "Pending").length.toString(), icon: <FileText className="h-5 w-5" />, color: "bg-yellow-50 text-yellow-600" },
  ];

  const unitDeptNames = useMemo(() => new Set(
    deptList.filter(d => selectedUnit === "all" || d.unitId === parseInt(selectedUnit)).map(d => d.name)
  ), [deptList, selectedUnit]);

  const filteredLetters = allLetters.filter(letter =>
    (selectedUnit === "all" || unitDeptNames.has(letter.department)) &&
    (letter.employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
    letter.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    letter.position.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Sent": return "bg-green-100 text-green-700";
      case "Pending": return "bg-yellow-100 text-yellow-700";
      case "Not Generated": return "bg-slate-100 text-slate-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const generatePDF = (letter: AppointmentLetter) => {
    const doc = new jsPDF();
    
    addWatermark(doc);
    addCompanyHeader(doc, { title: "Appointment Letter", subtitle: "Official Employment Offer" });
    addFooter(doc);
    
    const refNumber = generateReferenceNumber("APT");
    addReferenceNumber(doc, refNumber, 68);
    addDocumentDate(doc, letter.generatedDate, 68);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Dear ${letter.employee},`, 15, 82);
    
    const content = `We are pleased to offer you the position of ${letter.position} in our ${letter.department} department at ${COMPANY_NAME}, effective ${letter.joinDate}.

Your compensation package will include an annual CTC of Rs. ${parseInt(letter.salary || "0").toLocaleString()}.

Please review the terms and conditions of your employment as outlined in this letter. Your employment with the company will be subject to the successful completion of background verification and other pre-employment checks.

We look forward to welcoming you to our team and are confident that you will make significant contributions to our organization.

Please sign and return a copy of this letter to confirm your acceptance of this offer.`;

    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 15, 92);
    
    addHRSignature(doc, 200);
    
    return doc;
  };

  const handleDownload = (letter: AppointmentLetter) => {
    const doc = generatePDF(letter);
    doc.save(`appointment_letter_${letter.employee.replace(/\s+/g, '_')}.pdf`);
    toast({
      title: "Downloaded",
      description: `Appointment letter for ${letter.employee} downloaded successfully.`
    });
  };

  const handleView = (letter: AppointmentLetter) => {
    setSelectedLetter(letter);
    setShowViewDialog(true);
  };

  const handleSend = (letter: AppointmentLetter) => {
    setLetters(allLetters.map(l => 
      l.id === letter.id ? { ...l, status: "Sent" } : l
    ));
    toast({
      title: "Letter Sent",
      description: `Appointment letter sent to ${letter.employee} successfully.`
    });
  };

  const handleGenerate = (letterId?: number) => {
    if (letterId) {
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      setLetters(letters.map(l => 
        l.id === letterId ? { ...l, status: "Pending", generatedDate: today } : l
      ));
      toast({
        title: "Letter Generated",
        description: "Appointment letter generated successfully."
      });
    } else {
      if (!formData.employee || !formData.position || !formData.department || !formData.joinDate) {
        toast({
          title: "Error",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const newLetter: AppointmentLetter = {
        id: letters.length + 1,
        employee: formData.employee,
        position: formData.position,
        department: formData.department,
        joinDate: formData.joinDate,
        generatedDate: today,
        status: "Pending",
        salary: formData.salary
      };
      setLetters([...letters, newLetter]);
      setShowGenerateDialog(false);
      setFormData({ employee: "", position: "", department: "", joinDate: "", salary: "" });
      toast({
        title: "Letter Generated",
        description: `Appointment letter for ${formData.employee} generated successfully.`
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="text-page-title">Appointment Letters</h1>
            <p className="text-slate-500 mt-1">Generate and manage employee appointment letters</p>
          </div>
          <Button className="gap-2" onClick={() => setShowGenerateDialog(true)} data-testid="button-generate-letter">
            <Plus className="h-4 w-4" />
            Generate Letter
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {letterStats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card data-testid={`card-stat-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${stat.color || "bg-teal-50 text-teal-600"}`}>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5 text-teal-600" />
                  Appointment Letters
                </CardTitle>
                <CardDescription>All appointment letters and their status</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="w-40" data-testid="select-unit">
                    <SelectValue placeholder="All Units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Units</SelectItem>
                    {units.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Employee</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Position</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Department</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Join Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Generated</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLetters.map((letter, index) => (
                    <tr key={letter.id} className="border-b hover:bg-slate-50" data-testid={`row-letter-${index}`}>
                      <td className="py-3 px-4 font-medium">{letter.employee}</td>
                      <td className="py-3 px-4">{letter.position}</td>
                      <td className="py-3 px-4 text-slate-600">{letter.department}</td>
                      <td className="py-3 px-4 text-slate-600">{letter.joinDate}</td>
                      <td className="py-3 px-4 text-slate-600">{letter.generatedDate}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(letter.status)}>{letter.status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {letter.status !== "Not Generated" ? (
                            <>
                              <Button size="icon" variant="ghost" onClick={() => handleView(letter)} data-testid={`button-view-${index}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDownload(letter)} data-testid={`button-download-${index}`}>
                                <Download className="h-4 w-4" />
                              </Button>
                              {letter.status === "Pending" && (
                                <Button size="icon" variant="ghost" onClick={() => handleSend(letter)} data-testid={`button-send-${index}`}>
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button size="sm" onClick={() => handleGenerate(letter.id)} data-testid={`button-generate-${index}`}>Generate</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Appointment Letter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee Name</Label>
              <Input 
                placeholder="Enter employee name"
                value={formData.employee}
                onChange={(e) => setFormData({...formData, employee: e.target.value})}
                data-testid="input-employee-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input 
                placeholder="Enter position"
                value={formData.position}
                onChange={(e) => setFormData({...formData, position: e.target.value})}
                data-testid="input-position"
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={formData.department} onValueChange={(v) => setFormData({...formData, department: v})}>
                <SelectTrigger data-testid="select-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Join Date</Label>
              <Input 
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
                data-testid="input-join-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Annual CTC (Rs.)</Label>
              <Input 
                type="number"
                placeholder="Enter annual salary"
                value={formData.salary}
                onChange={(e) => setFormData({...formData, salary: e.target.value})}
                data-testid="input-salary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
            <Button onClick={() => handleGenerate()}>Generate Letter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Appointment Letter - {selectedLetter?.employee}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedLetter && (
            <div className="space-y-4 py-4 bg-white p-6 border rounded-lg">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">APPOINTMENT LETTER</h2>
              </div>
              <p className="text-right">Date: {selectedLetter.generatedDate}</p>
              <p>Dear {selectedLetter.employee},</p>
              <p>
                We are pleased to offer you the position of <strong>{selectedLetter.position}</strong> in our <strong>{selectedLetter.department}</strong> department, effective <strong>{selectedLetter.joinDate}</strong>.
              </p>
              <p>
                Your compensation package will include an annual CTC of <strong>Rs. {parseInt(selectedLetter.salary || "0").toLocaleString()}</strong>.
              </p>
              <p>
                Please review the terms and conditions of your employment as outlined in this letter. Your employment with the company will be subject to the successful completion of background verification and other pre-employment checks.
              </p>
              <p>
                We look forward to welcoming you to our team and are confident that you will make significant contributions to our organization.
              </p>
              <p>
                Please sign and return a copy of this letter to confirm your acceptance of this offer.
              </p>
              <div className="pt-8">
                <p>Sincerely,</p>
                <p className="font-semibold mt-4">HR Department</p>
                <p>HRConnect</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
            {selectedLetter && (
              <Button onClick={() => handleDownload(selectedLetter)}>
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
