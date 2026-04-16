import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Award, Plus, Search, Download, CheckCircle, Clock, AlertCircle, Filter, Eye, Edit, Trash2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

interface CertificationRecord {
  id: number;
  userId: number;
  certificationName: string;
  issuer: string;
  issueDate: string | Date;
  expiryDate: string | Date | null;
  status: string;
  credentialId: string | null;
  createdAt?: string | Date | null;
}

interface EmployeeRecord {
  id: number;
  firstName: string;
  lastName: string;
}

export default function CertificationsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isHROrAdmin = user?.role === 'hr' || user?.role === 'admin' || user?.role === 'developer';

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [selectedCert, setSelectedCert] = useState<CertificationRecord | null>(null);

  const [formData, setFormData] = useState({
    userId: user?.id?.toString() ?? "",
    certificationName: "",
    issuer: "",
    issueDate: "",
    expiryDate: "",
    credentialId: ""
  });

  const { data: employees = [] } = useQuery<EmployeeRecord[]>({
    queryKey: ["/api/employees"],
  });

  const { data: certifications = [], isLoading } = useQuery<CertificationRecord[]>({
    queryKey: ["/api/certifications"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/certifications", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certifications"] });
      setShowAddDialog(false);
      resetForm();
      toast({ title: "Success", description: "Certification added successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add certification", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/certifications/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certifications"] });
      setShowEditDialog(false);
      setShowRenewDialog(false);
      setSelectedCert(null);
      resetForm();
      toast({ title: "Success", description: "Certification updated successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to update certification", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/certifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certifications"] });
      setShowDeleteDialog(false);
      setSelectedCert(null);
      toast({ title: "Success", description: "Certification deleted successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete certification", variant: "destructive" }),
  });

  const getEmployeeName = (userId: number) => {
    const emp = employees.find((e: EmployeeRecord) => e.id === userId);
    return emp ? `${emp.firstName} ${emp.lastName}` : `Employee #${userId}`;
  };

  const certStats = [
    { title: "Total Certifications", value: certifications.length.toString(), icon: <Award className="h-5 w-5" /> },
    { title: "Active", value: certifications.filter(c => c.status === "Active").length.toString(), icon: <CheckCircle className="h-5 w-5" />, color: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
    { title: "Expiring Soon", value: certifications.filter(c => c.status === "Expiring Soon").length.toString(), icon: <Clock className="h-5 w-5" />, color: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" },
    { title: "Expired", value: certifications.filter(c => c.status === "Expired").length.toString(), icon: <AlertCircle className="h-5 w-5" />, color: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
  ];

  const filteredCertifications = certifications.filter(cert => {
    const employeeName = getEmployeeName(cert.userId);
    const matchesSearch = employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.certificationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.issuer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || cert.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300";
      case "Expiring Soon": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300";
      case "Expired": return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "—";
    try { return format(new Date(date), "dd MMM yyyy"); } catch { return String(date); }
  };

  const handleAddCert = () => {
    if (!formData.certificationName || !formData.issuer || !formData.issueDate) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      userId: parseInt(formData.userId) || user?.id,
      certificationName: formData.certificationName,
      issuer: formData.issuer,
      issueDate: new Date(formData.issueDate),
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : null,
      credentialId: formData.credentialId || null,
      status: "Active",
    });
  };

  const handleEditCert = () => {
    if (!selectedCert) return;
    updateMutation.mutate({
      id: selectedCert.id,
      data: {
        certificationName: formData.certificationName,
        issuer: formData.issuer,
        issueDate: new Date(formData.issueDate),
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : null,
        credentialId: formData.credentialId || null,
      }
    });
  };

  const handleDeleteCert = () => {
    if (!selectedCert) return;
    deleteMutation.mutate(selectedCert.id);
  };

  const handleRenewCert = () => {
    if (!selectedCert || !formData.expiryDate) return;
    updateMutation.mutate({
      id: selectedCert.id,
      data: { status: "Active", expiryDate: new Date(formData.expiryDate) }
    });
  };

  const handleDownloadCert = (cert: CertificationRecord) => {
    const employeeName = getEmployeeName(cert.userId);
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Certificate of Completion", 105, 30, { align: "center" });
    doc.setFontSize(14);
    doc.text(`This is to certify that`, 105, 60, { align: "center" });
    doc.setFontSize(18);
    doc.text(employeeName, 105, 75, { align: "center" });
    doc.setFontSize(14);
    doc.text(`has successfully completed`, 105, 95, { align: "center" });
    doc.setFontSize(16);
    doc.text(cert.certificationName, 105, 110, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Issued by: ${cert.issuer}`, 105, 135, { align: "center" });
    doc.text(`Issue Date: ${formatDate(cert.issueDate)}`, 105, 145, { align: "center" });
    doc.text(`Expiry Date: ${formatDate(cert.expiryDate)}`, 105, 155, { align: "center" });
    if (cert.credentialId) doc.text(`Credential ID: ${cert.credentialId}`, 105, 165, { align: "center" });
    doc.save(`${employeeName}-${cert.certificationName}.pdf`);
    toast({ title: "Success", description: "Certificate downloaded" });
  };

  const handleExportAll = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Certifications Report", 20, 20);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`Total Certifications: ${certifications.length}`, 20, 40);

    let yPos = 60;
    filteredCertifications.forEach((cert, index) => {
      if (yPos > 270) { doc.addPage(); yPos = 20; }
      doc.setFontSize(12);
      doc.text(`${index + 1}. ${getEmployeeName(cert.userId)} - ${cert.certificationName}`, 20, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.text(`   Issuer: ${cert.issuer} | Status: ${cert.status} | Expires: ${formatDate(cert.expiryDate)}`, 20, yPos);
      yPos += 10;
    });

    doc.save("certifications-report.pdf");
    toast({ title: "Success", description: "Report exported successfully" });
  };

  const resetForm = () => {
    setFormData({ userId: user?.id?.toString() ?? "", certificationName: "", issuer: "", issueDate: "", expiryDate: "", credentialId: "" });
  };

  const openEditDialog = (cert: CertificationRecord) => {
    setSelectedCert(cert);
    setFormData({
      userId: cert.userId.toString(),
      certificationName: cert.certificationName,
      issuer: cert.issuer,
      issueDate: cert.issueDate ? format(new Date(cert.issueDate), "yyyy-MM-dd") : "",
      expiryDate: cert.expiryDate ? format(new Date(cert.expiryDate), "yyyy-MM-dd") : "",
      credentialId: cert.credentialId ?? ""
    });
    setShowEditDialog(true);
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="text-page-title">Certifications</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Track employee certifications and renewals</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="gap-2" onClick={handleExportAll} data-testid="button-export">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
            {isHROrAdmin && (
              <Button className="gap-2" data-testid="button-add-cert" onClick={() => { resetForm(); setShowAddDialog(true); }}>
                <Plus className="h-4 w-4" />
                Add Certification
              </Button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {certStats.map((stat, index) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card data-testid={`card-stat-${index}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${stat.color || "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"}`}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{stat.title}</p>
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
                  <Award className="h-5 w-5 text-teal-600" />
                  Employee Certifications
                </CardTitle>
                <CardDescription>All certifications and their validity status</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Loading certifications...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Employee</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Certification</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Issuer</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Issue Date</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Expiry Date</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCertifications.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-slate-500">No certifications found</td></tr>
                    ) : (
                      filteredCertifications.map((cert, index) => (
                        <tr key={cert.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50" data-testid={`row-cert-${index}`}>
                          <td className="py-3 px-4 font-medium">{getEmployeeName(cert.userId)}</td>
                          <td className="py-3 px-4">{cert.certificationName}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{cert.issuer}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{formatDate(cert.issueDate)}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{formatDate(cert.expiryDate)}</td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(cert.status)}>{cert.status}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" data-testid={`button-view-${index}`} onClick={() => { setSelectedCert(cert); setShowViewDialog(true); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {isHROrAdmin && (
                                <Button size="icon" variant="ghost" data-testid={`button-edit-${index}`} onClick={() => openEditDialog(cert)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" data-testid={`button-download-${index}`} onClick={() => handleDownloadCert(cert)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              {isHROrAdmin && (cert.status === "Expired" || cert.status === "Expiring Soon") && (
                                <Button size="icon" variant="ghost" data-testid={`button-renew-${index}`} onClick={() => { setSelectedCert(cert); setShowRenewDialog(true); }}>
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                              {isHROrAdmin && (
                                <Button size="icon" variant="ghost" data-testid={`button-delete-${index}`} onClick={() => { setSelectedCert(cert); setShowDeleteDialog(true); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Certification Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Certification</DialogTitle>
            <DialogDescription>Record a new employee certification</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isHROrAdmin && (
              <div>
                <Label>Employee *</Label>
                <Select value={formData.userId} onValueChange={(val) => setFormData({ ...formData, userId: val })}>
                  <SelectTrigger data-testid="select-employee">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp: EmployeeRecord) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>{emp.firstName} {emp.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Certification Name *</Label>
              <Input value={formData.certificationName} onChange={(e) => setFormData({ ...formData, certificationName: e.target.value })} placeholder="Certification name" data-testid="input-certification" />
            </div>
            <div>
              <Label>Issuer *</Label>
              <Input value={formData.issuer} onChange={(e) => setFormData({ ...formData, issuer: e.target.value })} placeholder="Issuing organization" data-testid="input-issuer" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issue Date *</Label>
                <Input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} data-testid="input-issue-date" />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} data-testid="input-expiry-date" />
              </div>
            </div>
            <div>
              <Label>Credential ID</Label>
              <Input value={formData.credentialId} onChange={(e) => setFormData({ ...formData, credentialId: e.target.value })} placeholder="Credential/Certificate ID" data-testid="input-credential-id" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCert} data-testid="button-submit-cert" disabled={createMutation.isPending}>Add Certification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Certification Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCert?.certificationName}</DialogTitle>
            <DialogDescription>Certification details</DialogDescription>
          </DialogHeader>
          {selectedCert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Employee</p>
                  <p className="font-medium">{getEmployeeName(selectedCert.userId)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <Badge className={getStatusColor(selectedCert.status)}>{selectedCert.status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Issuer</p>
                  <p className="font-medium">{selectedCert.issuer}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Credential ID</p>
                  <p className="font-medium">{selectedCert.credentialId || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Issue Date</p>
                  <p className="font-medium">{formatDate(selectedCert.issueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Expiry Date</p>
                  <p className="font-medium">{formatDate(selectedCert.expiryDate)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
            <Button onClick={() => handleDownloadCert(selectedCert!)}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Certification Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Certification</DialogTitle>
            <DialogDescription>Update certification details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Certification Name *</Label>
              <Input value={formData.certificationName} onChange={(e) => setFormData({ ...formData, certificationName: e.target.value })} data-testid="input-edit-certification" />
            </div>
            <div>
              <Label>Issuer *</Label>
              <Input value={formData.issuer} onChange={(e) => setFormData({ ...formData, issuer: e.target.value })} data-testid="input-edit-issuer" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issue Date</Label>
                <Input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Credential ID</Label>
              <Input value={formData.credentialId} onChange={(e) => setFormData({ ...formData, credentialId: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditCert} data-testid="button-update-cert" disabled={updateMutation.isPending}>Update Certification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Certification Dialog */}
      <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renew Certification</DialogTitle>
            <DialogDescription>Renew "{selectedCert?.certificationName}" for {selectedCert ? getEmployeeName(selectedCert.userId) : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Expiry Date</Label>
              <Input type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} data-testid="input-renew-date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenewDialog(false)}>Cancel</Button>
            <Button onClick={handleRenewCert} data-testid="button-confirm-renew" disabled={updateMutation.isPending}>Renew Certification</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Certification</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCert?.certificationName}" for {selectedCert ? getEmployeeName(selectedCert.userId) : ""}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCert} data-testid="button-confirm-delete" disabled={deleteMutation.isPending}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
