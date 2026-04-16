import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Package, Plus, TrendingUp, AlertTriangle, CheckCircle, Clock, BarChart3, Search, Eye, Edit, Trash2, MapPin, History, Laptop, Monitor, Smartphone, Keyboard, Headphones, Cpu, X } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface Asset {
  id: number;
  assetId: string;
  name: string;
  type: string;
  category: string;
  location: string;
  status: "Active" | "Maintenance" | "Disposed" | "In Transit";
  lastUpdated: string;
  assignedTo: string;
  serialNumber: string;
  notes: string;
}

interface Activity {
  id: number;
  asset: string;
  assetId: string;
  action: string;
  employee: string;
  date: string;
  type: "allocation" | "return" | "maintenance" | "disposal" | "transfer";
  notes: string;
}

const assetCatalog = [
  { name: "MacBook Pro M3", type: "Laptop", category: "Laptops", prefix: "LAP", note: "Primary development machine" },
  { name: "Dell 27\" 4K Monitor", type: "Monitor", category: "Monitors", prefix: "MON", note: "HD display for productivity" },
  { name: "iPhone 15 Pro", type: "Phone", category: "Phones", prefix: "PHN", note: "Company communication device" },
  { name: "ThinkPad X1 Carbon", type: "Laptop", category: "Laptops", prefix: "LAP", note: "Business laptop" },
  { name: "Logitech MX Master 3", type: "Mouse", category: "Accessories", prefix: "ACC", note: "Ergonomic mouse" },
  { name: "Sony WH-1000XM5", type: "Headphones", category: "Accessories", prefix: "ACC", note: "Noise-cancelling headphones" },
  { name: "iPad Pro 12.9\"", type: "Tablet", category: "Phones", prefix: "PHN", note: "Tablet for presentations" },
  { name: "HP LaserJet Pro", type: "Printer", category: "Accessories", prefix: "ACC", note: "Shared department printer" },
];
const assetStatuses: Asset["status"][] = ["Active", "Active", "Active", "Maintenance", "Active", "Active", "Disposed", "In Transit"];
const assetLocations = ["Building A - Floor 1", "Building A - Floor 2", "Building A - Floor 3", "Building B - Floor 1", "Building B - Floor 2", "Storage Room", "IT Storage"];
const assetDates = ["Mar 1, 2026", "Feb 28, 2026", "Feb 25, 2026", "Feb 22, 2026", "Feb 20, 2026", "Feb 18, 2026", "Feb 15, 2026", "Feb 12, 2026"];

export default function AssetTrackingPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const { data: employees = [] } = useQuery<User[]>({
    queryKey: ['/api/employees'],
  });

  const { data: units = [] } = useQuery<{id: number; name: string; code: string}[]>({
    queryKey: ['/api/masters/units'],
  });

  const { data: departments = [] } = useQuery<{id: number; name: string; unitId?: number}[]>({
    queryKey: ['/api/departments'],
  });

  const [selectedUnit, setSelectedUnit] = useState("all");

  const [assetOverrides, setAssetOverrides] = useState<Asset[]>([]);
  const [activityOverrides, setActivityOverrides] = useState<Activity[]>([]);

  const baseAssets = useMemo<Asset[]>(() => {
    return assetCatalog.map((ac, i) => {
      const assignedEmp = employees[i % Math.max(employees.length, 1)];
      const status = assetStatuses[i % assetStatuses.length];
      return {
        id: i + 1,
        assetId: `${ac.prefix}-${String(i + 1).padStart(3, '0')}`,
        name: ac.name,
        type: ac.type,
        category: ac.category,
        location: assetLocations[i % assetLocations.length],
        status,
        lastUpdated: assetDates[i % assetDates.length],
        assignedTo: (status === "Active" && assignedEmp) ? `${assignedEmp.firstName} ${assignedEmp.lastName}` : "-",
        serialNumber: `SN-2026-${String(100 + i).padStart(3, '0')}`,
        notes: ac.note,
      };
    });
  }, [employees]);

  const [customAssets, setCustomAssets] = useState<Asset[]>([]);

  const assets = useMemo(() => {
    const ids = new Set(assetOverrides.map(a => a.id));
    return [...baseAssets.filter(a => !ids.has(a.id)), ...assetOverrides, ...customAssets];
  }, [baseAssets, assetOverrides, customAssets]);

  const setAssets = (updater: Asset[] | ((prev: Asset[]) => Asset[])) => {
    const next = typeof updater === 'function' ? updater([...assets]) : updater;
    setCustomAssets(next.filter(a => a.id > assetCatalog.length));
    setAssetOverrides(next.filter(a => a.id <= assetCatalog.length));
  };

  const baseActivities = useMemo<Activity[]>(() => {
    return baseAssets.slice(0, 5).map((asset, i) => {
      const emp = employees[i % Math.max(employees.length, 1)];
      const actionTypes: Activity["type"][] = ["allocation", "return", "maintenance", "disposal", "transfer"];
      const actions = ["Allocated", "Returned", "Under Repair", "Disposed", "Transferred"];
      return {
        id: i + 1,
        asset: asset.name,
        assetId: asset.assetId,
        action: actions[i % actions.length],
        employee: emp ? `${emp.firstName} ${emp.lastName}` : "-",
        date: assetDates[i % assetDates.length],
        type: actionTypes[i % actionTypes.length],
        notes: asset.notes,
      };
    });
  }, [baseAssets, employees]);

  const activities = useMemo(() => {
    return [...baseActivities, ...activityOverrides];
  }, [baseActivities, activityOverrides]);

  const setActivities = (updater: Activity[] | ((prev: Activity[]) => Activity[])) => {
    if (typeof updater === 'function') {
      setActivityOverrides(prev => updater([...baseActivities, ...prev]).filter(a => !baseActivities.some(b => b.id === a.id)));
    } else {
      setActivityOverrides(updater.filter(a => !baseActivities.some(b => b.id === a.id)));
    }
  };

  const [addAssetDialogOpen, setAddAssetDialogOpen] = useState(false);
  const [viewAssetDialogOpen, setViewAssetDialogOpen] = useState(false);
  const [editAssetDialogOpen, setEditAssetDialogOpen] = useState(false);
  const [viewActivityDialogOpen, setViewActivityDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const [newAsset, setNewAsset] = useState({
    assetId: "",
    name: "",
    type: "",
    category: "",
    location: "",
    serialNumber: "",
    notes: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    location: "",
    status: "",
    notes: "",
  });

  const categories = ["Laptops", "Monitors", "Phones", "Accessories"];
  const assetTypes = ["Laptop", "Monitor", "Phone", "Keyboard", "Headphones", "Desktop", "Mouse", "Webcam"];
  const locations = ["Building A - Floor 1", "Building A - Floor 2", "Building A - Floor 3", "Building B - Floor 1", "Building B - Floor 2", "Storage Room", "IT Storage"];
  const statuses = ["Active", "Maintenance", "Disposed", "In Transit"];

  const assetCategories = categories.map(cat => {
    const categoryAssets = assets.filter(a => a.category === cat);
    return {
      name: cat,
      total: categoryAssets.length,
      active: categoryAssets.filter(a => a.status === "Active").length,
      maintenance: categoryAssets.filter(a => a.status === "Maintenance").length,
      disposed: categoryAssets.filter(a => a.status === "Disposed").length,
    };
  });

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || asset.category === selectedCategory;
      const matchesStatus = selectedStatus === "all" || asset.status === selectedStatus;
      if (selectedUnit !== "all") {
        const assignedEmp = employees.find(e => `${e.firstName} ${e.lastName}` === asset.assignedTo);
        const dept = assignedEmp ? departments.find(d => d.id === assignedEmp.departmentId) : null;
        const matchesUnit = dept?.unitId === parseInt(selectedUnit);
        return matchesSearch && matchesCategory && matchesStatus && matchesUnit;
      }
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [assets, searchQuery, selectedCategory, selectedStatus, selectedUnit, employees, departments]);

  const getActionColor = (type: string) => {
    switch (type) {
      case "allocation": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "return": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "maintenance": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "disposal": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "transfer": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "Maintenance": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Disposed": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "In Transit": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "Laptop": return <Laptop className="h-4 w-4" />;
      case "Monitor": return <Monitor className="h-4 w-4" />;
      case "Phone": return <Smartphone className="h-4 w-4" />;
      case "Keyboard": return <Keyboard className="h-4 w-4" />;
      case "Headphones": return <Headphones className="h-4 w-4" />;
      case "Desktop": return <Cpu className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const handleAddAsset = () => {
    if (!newAsset.assetId || !newAsset.name || !newAsset.type || !newAsset.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const asset: Asset = {
      id: Date.now(),
      assetId: newAsset.assetId,
      name: newAsset.name,
      type: newAsset.type,
      category: newAsset.category,
      location: newAsset.location || "Not Assigned",
      status: "Active",
      lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      assignedTo: "-",
      serialNumber: newAsset.serialNumber,
      notes: newAsset.notes,
    };

    setAssets([asset, ...assets]);
    
    const activity: Activity = {
      id: Date.now(),
      asset: asset.name,
      assetId: asset.assetId,
      action: "Added to Inventory",
      employee: "-",
      date: asset.lastUpdated,
      type: "allocation",
      notes: "New asset added to tracking system",
    };
    setActivities([activity, ...activities]);

    setAddAssetDialogOpen(false);
    setNewAsset({ assetId: "", name: "", type: "", category: "", location: "", serialNumber: "", notes: "" });
    toast({
      title: "Asset Added",
      description: `${asset.name} has been added to tracking.`,
    });
  };

  const handleViewAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setViewAssetDialogOpen(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setEditForm({
      name: asset.name,
      location: asset.location,
      status: asset.status,
      notes: asset.notes,
    });
    setEditAssetDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedAsset) return;

    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    setAssets(assets.map(a => 
      a.id === selectedAsset.id 
        ? { ...a, name: editForm.name, location: editForm.location, status: editForm.status as Asset["status"], notes: editForm.notes, lastUpdated: today }
        : a
    ));

    const activity: Activity = {
      id: Date.now(),
      asset: editForm.name,
      assetId: selectedAsset.assetId,
      action: "Updated",
      employee: "-",
      date: today,
      type: "maintenance",
      notes: `Status changed to ${editForm.status}`,
    };
    setActivities([activity, ...activities]);

    setEditAssetDialogOpen(false);
    toast({
      title: "Asset Updated",
      description: "Asset details have been updated successfully.",
    });
  };

  const handleDeleteAsset = (asset: Asset) => {
    setAssets(assets.filter(a => a.id !== asset.id));
    setViewAssetDialogOpen(false);
    toast({
      title: "Asset Removed",
      description: `${asset.name} has been removed from tracking.`,
    });
  };

  const handleViewActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setViewActivityDialogOpen(true);
  };

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(categoryName === selectedCategory ? "all" : categoryName);
    toast({
      title: "Filter Applied",
      description: categoryName === selectedCategory ? "Showing all categories" : `Showing ${categoryName} only`,
    });
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100" data-testid="text-page-title">Asset Tracking</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor and track all company assets</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="w-36" data-testid="select-unit">
                <SelectValue placeholder={units?.length === 1 ? units[0].name : "All Units"} />
              </SelectTrigger>
              <SelectContent>
                {units?.length !== 1 && <SelectItem value="all">All Units</SelectItem>}
                {units.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40" data-testid="select-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-36" data-testid="select-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="gap-2" onClick={() => setAddAssetDialogOpen(true)} data-testid="button-add-asset">
              <Plus className="h-4 w-4" />
              Add Asset
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {assetCategories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className={`hover-elevate cursor-pointer ${selectedCategory === category.name ? 'ring-2 ring-teal-500' : ''}`} 
                onClick={() => handleCategoryClick(category.name)}
                data-testid={`card-category-${index}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{category.name}</h3>
                    <Badge variant="outline">{category.total} total</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" /> Active
                      </span>
                      <span className="dark:text-slate-300">{category.active}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                        <Clock className="h-3 w-3" /> Maintenance
                      </span>
                      <span className="dark:text-slate-300">{category.maintenance}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3" /> Disposed
                      </span>
                      <span className="dark:text-slate-300">{category.disposed}</span>
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
                  <MapPin className="h-5 w-5 text-teal-600" />
                  Asset Inventory
                </CardTitle>
                <CardDescription>Track location and status of all assets</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-300">Asset</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-300">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-300">Assigned To</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-300">Last Updated</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                        No assets found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset, index) => (
                      <tr key={asset.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50" data-testid={`row-asset-${index}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                              {getAssetIcon(asset.type)}
                            </div>
                            <div>
                              <p className="font-medium">{asset.name}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">{asset.assetId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{asset.location}</td>
                        <td className="py-3 px-4">{asset.assignedTo}</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(asset.status)}>{asset.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{asset.lastUpdated}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewAsset(asset)} data-testid={`button-view-${index}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEditAsset(asset)} data-testid={`button-edit-${index}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-teal-600" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest asset movements and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.slice(0, 10).map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover-elevate cursor-pointer"
                  onClick={() => handleViewActivity(activity)}
                  data-testid={`row-activity-${index}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-700 border dark:border-slate-600">
                      <Package className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{activity.asset}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {activity.employee !== "-" ? `${activity.employee} - ` : ""}{activity.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getActionColor(activity.type)}>{activity.action}</Badge>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleViewActivity(activity); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Asset Dialog */}
      <Dialog open={addAssetDialogOpen} onOpenChange={setAddAssetDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Asset</DialogTitle>
            <DialogDescription>Add a new asset to the tracking system</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Asset ID *</Label>
              <Input
                placeholder="e.g., LAP-025"
                value={newAsset.assetId}
                onChange={(e) => setNewAsset({ ...newAsset, assetId: e.target.value })}
                data-testid="input-asset-id"
              />
            </div>
            <div className="space-y-2">
              <Label>Asset Name *</Label>
              <Input
                placeholder="e.g., MacBook Pro 16 inch"
                value={newAsset.name}
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                data-testid="input-asset-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={newAsset.type} onValueChange={(value) => setNewAsset({ ...newAsset, type: value })}>
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={newAsset.category} onValueChange={(value) => setNewAsset({ ...newAsset, category: value })}>
                <SelectTrigger data-testid="select-category-new">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={newAsset.location} onValueChange={(value) => setNewAsset({ ...newAsset, location: value })}>
                <SelectTrigger data-testid="select-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input
                placeholder="e.g., SN-2024-025"
                value={newAsset.serialNumber}
                onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                data-testid="input-serial"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={newAsset.notes}
                onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                data-testid="textarea-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAssetDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAsset} data-testid="button-confirm-add">Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Asset Dialog */}
      <Dialog open={viewAssetDialogOpen} onOpenChange={setViewAssetDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAsset && getAssetIcon(selectedAsset.type)}
              {selectedAsset?.name}
            </DialogTitle>
            <DialogDescription>Asset Details</DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Asset ID</p>
                  <p className="font-mono font-medium">{selectedAsset.assetId}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Category</p>
                  <p className="font-medium">{selectedAsset.category}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Serial Number</p>
                  <p className="font-mono font-medium">{selectedAsset.serialNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                  <Badge className={getStatusColor(selectedAsset.status)}>{selectedAsset.status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Location</p>
                  <p className="font-medium">{selectedAsset.location}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Assigned To</p>
                  <p className="font-medium">{selectedAsset.assignedTo}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Last Updated</p>
                  <p className="font-medium">{selectedAsset.lastUpdated}</p>
                </div>
              </div>
              {selectedAsset.notes && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Notes</p>
                  <p className="text-sm mt-1">{selectedAsset.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="text-red-600" onClick={() => selectedAsset && handleDeleteAsset(selectedAsset)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => { setViewAssetDialogOpen(false); selectedAsset && handleEditAsset(selectedAsset); }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={editAssetDialogOpen} onOpenChange={setEditAssetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Update asset details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Asset Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={editForm.location} onValueChange={(value) => setEditForm({ ...editForm, location: value })}>
                <SelectTrigger data-testid="select-edit-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                data-testid="textarea-edit-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAssetDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Activity Dialog */}
      <Dialog open={viewActivityDialogOpen} onOpenChange={setViewActivityDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
            <DialogDescription>Asset movement information</DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Asset</p>
                  <p className="font-medium">{selectedActivity.asset}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Asset ID</p>
                  <p className="font-mono font-medium">{selectedActivity.assetId}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Action</p>
                  <Badge className={getActionColor(selectedActivity.type)}>{selectedActivity.action}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Date</p>
                  <p className="font-medium">{selectedActivity.date}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Employee</p>
                  <p className="font-medium">{selectedActivity.employee}</p>
                </div>
              </div>
              {selectedActivity.notes && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Notes</p>
                  <p className="text-sm mt-1">{selectedActivity.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewActivityDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
