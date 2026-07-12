import { createFileRoute } from "@tanstack/react-router";
import { useSuperAdminContext, SuperStore } from "./app.super-admin";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, Eye, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

export const Route = createFileRoute("/app/super-admin/stores")({
  component: SuperAdminStores,
});

const SECTOR_LABELS: Record<string, string> = {
  agriculture: "Agribusiness",
  pharmacy: "Pharmacy Hub",
  restaurant: "Food & Restaurant",
  general: "General Retail",
};

function SuperAdminStores() {
  const { superStores, setSuperStores, currentStoreId, setCurrentStoreId, logs, setLogs } = useSuperAdminContext();
  const [search, setSearch] = useState("");

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<SuperStore | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingStore, setViewingStore] = useState<SuperStore | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingStore, setDeletingStore] = useState<SuperStore | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [sector, setSector] = useState<"agriculture" | "pharmacy" | "restaurant" | "general">("general");
  const [manager, setManager] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [valuation, setValuation] = useState("500000");

  const filteredStores = useMemo(() => {
    return superStores.filter(
      s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.manager.toLowerCase().includes(search.toLowerCase()) ||
        s.sector.toLowerCase().includes(search.toLowerCase())
    );
  }, [superStores, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !manager || !managerEmail) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const newStoreId = `store-${Date.now()}`;
    try {
      await setDoc(doc(db, "stores", newStoreId), {
        id: newStoreId,
        storeName: name,
        businessType: sector,
        ownerName: manager,
        ownerEmail: managerEmail,
        valuationNgn: Number(valuation) || 0,
        healthScore: 100,
        alerts: 0,
        status: "active",
        isOnboarded: true,
        createdAt: new Date().toISOString(),
      });

      const newLogId = `log-${Date.now()}`;
      await setDoc(doc(db, "system_logs", newLogId), {
        id: newLogId,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Provisioned new multi-tenant storefront: "${name}"`,
        store: name,
        status: "success",
      });

      toast.success(`Storefront "${name}" provisioned successfully!`);
      setIsAddOpen(false);
      // Reset form
      setName("");
      setManager("");
      setManagerEmail("");
      setValuation("500000");
    } catch (err) {
      console.error("Failed to provision storefront:", err);
      toast.error("Failed to provision storefront in database.");
    }
  };

  const openEdit = (store: SuperStore) => {
    setEditingStore(store);
    setName(store.name);
    setSector(store.sector);
    setManager(store.manager);
    setManagerEmail(store.managerEmail);
    setValuation(store.valuationNgn.toString());
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;

    try {
      await updateDoc(doc(db, "stores", editingStore.id), {
        storeName: name,
        businessType: sector,
        ownerName: manager,
        ownerEmail: managerEmail,
        valuationNgn: Number(valuation) || 0,
      });

      const newLogId = `log-${Date.now()}`;
      await setDoc(doc(db, "system_logs", newLogId), {
        id: newLogId,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Modified configuration parameters for: "${name}"`,
        store: name,
        status: "info",
      });

      toast.success(`Store "${name}" updated successfully.`);
      setIsEditOpen(false);
      setEditingStore(null);
    } catch (err) {
      console.error("Failed to update store:", err);
      toast.error("Failed to save changes to the database.");
    }
  };

  const toggleStoreStatus = async (store: SuperStore) => {
    const nextStatusMap: Record<SuperStore["status"], SuperStore["status"]> = {
      active: "maintenance",
      maintenance: "suspended",
      suspended: "active",
    };
    const nextStatus = nextStatusMap[store.status];

    try {
      await updateDoc(doc(db, "stores", store.id), {
        status: nextStatus,
      });

      const newLogId = `log-${Date.now()}`;
      await setDoc(doc(db, "system_logs", newLogId), {
        id: newLogId,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Toggled state of "${store.name}" to [${nextStatus.toUpperCase()}]`,
        store: store.name,
        status: nextStatus === "active" ? "success" : "warning",
      });

      toast.info(`"${store.name}" is now in ${nextStatus.toUpperCase()} mode.`);
    } catch (err) {
      console.error("Failed to toggle store status:", err);
      toast.error("Failed to update status in the database.");
    }
  };

  const handleDeleteStore = async (store: SuperStore) => {
    try {
      await deleteDoc(doc(db, "stores", store.id));

      const newLogId = `log-${Date.now()}`;
      await setDoc(doc(db, "system_logs", newLogId), {
        id: newLogId,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Terminated and deleted multi-tenant storefront: "${store.name}"`,
        store: store.name,
        status: "warning",
      });

      toast.success(`Storefront "${store.name}" deleted successfully.`);
      setIsDeleteOpen(false);
      setDeletingStore(null);
    } catch (err) {
      console.error("Failed to delete store:", err);
      toast.error("Failed to delete storefront from database.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search branches..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
          <Plus className="h-4 w-4" /> Provision Storefront
        </Button>
      </div>

      <div className="overflow-hidden border border-muted-foreground/10 rounded-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
              <th className="p-3">Branch Name</th>
              <th className="p-3">Vertical / Sector</th>
              <th className="p-3">Branch Manager</th>
              <th className="p-3 text-right">Items</th>
              <th className="p-3 text-right">Inventory Value</th>
              <th className="p-3 text-center">Health</th>
              <th className="p-3">GCP Tenant Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted-foreground/10">
            {filteredStores.map(store => {
              const isCurrentlySelected = currentStoreId === store.id;
              return (
                <tr key={store.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      {store.name}
                      {isCurrentlySelected && (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10 text-[10px] py-0 px-1.5 font-bold uppercase">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className="font-semibold text-[10px] uppercase">
                      {SECTOR_LABELS[store.sector] || store.sector}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    <div className="font-medium text-foreground">{store.manager}</div>
                    <div className="text-[10px] font-mono">{store.managerEmail}</div>
                  </td>
                  <td className="p-3 text-right font-mono font-medium">{store.itemCount}</td>
                  <td className="p-3 text-right font-mono font-semibold">₦{store.valuationNgn.toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <span className={`font-mono font-bold ${store.healthScore >= 90 ? "text-emerald-500" : store.healthScore >= 75 ? "text-amber-500" : "text-red-500"}`}>
                      {store.healthScore}%
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => toggleStoreStatus(store)} className="focus:outline-none">
                      {store.status === "active" && (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] font-bold">
                          ACTIVE
                        </Badge>
                      )}
                      {store.status === "maintenance" && (
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 text-[10px] font-bold">
                          MAINTENANCE
                        </Badge>
                      )}
                      {store.status === "suspended" && (
                        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 text-[10px] font-bold">
                          SUSPENDED
                        </Badge>
                      )}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button onClick={() => { setViewingStore(store); setIsViewOpen(true); }} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-500" title="View details">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button onClick={() => setCurrentStoreId(store.id)} variant="ghost" size="icon" className={`h-7 w-7 hover:text-emerald-500 ${isCurrentlySelected ? "text-emerald-500 font-bold" : "text-muted-foreground"}`} title="Impersonate branch">
                        <Building2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button onClick={() => openEdit(store)} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Configure settings">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button onClick={() => { setDeletingStore(store); setIsDeleteOpen(true); }} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" title="Delete storefront">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Provision store Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans">Provision New Branch Storefront</DialogTitle>
            <DialogDescription>Deploys a containerized multitenant DB slice for a new business location.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="store-name" className="text-xs font-semibold">Storefront Name</Label>
              <Input id="store-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Surulere Retail Hub" className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="store-sector" className="text-xs font-semibold">Vertical Sector Mode</Label>
              <select id="store-sector" value={sector} onChange={e => setSector(e.target.value as "agriculture" | "pharmacy" | "restaurant" | "general")} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none">
                <option value="agriculture">Agribusiness / Agri-supply</option>
                <option value="pharmacy">Pharmacy / Healthcare Retail</option>
                <option value="restaurant">Food & Restaurant Service</option>
                <option value="general">General Retail Store</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="store-manager" className="text-xs font-semibold">Assigned Manager Name</Label>
              <Input id="store-manager" value={manager} onChange={e => setManager(e.target.value)} placeholder="e.g. John Doe" className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="store-email" className="text-xs font-semibold">Manager Email Context</Label>
              <Input id="store-email" type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} placeholder="e.g. manager@store.io" className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="store-valuation" className="text-xs font-semibold">Initial Asset valuation (NGN)</Label>
              <Input id="store-valuation" type="number" value={valuation} onChange={e => setValuation(e.target.value)} className="text-xs h-9" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="text-xs h-9">Cancel</Button>
              <Button type="submit" className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Provision Container</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit store Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans">Configure Store Parameters</DialogTitle>
            <DialogDescription>Modify settings and manager details for this store slice.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-semibold">Storefront Name</Label>
              <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-sector" className="text-xs font-semibold">Vertical Sector Mode</Label>
              <select id="edit-sector" value={sector} onChange={e => setSector(e.target.value as "agriculture" | "pharmacy" | "restaurant" | "general")} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none">
                <option value="agriculture">Agribusiness / Agri-supply</option>
                <option value="pharmacy">Pharmacy / Healthcare Retail</option>
                <option value="restaurant">Food & Restaurant Service</option>
                <option value="general">General Retail Store</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-manager" className="text-xs font-semibold">Assigned Manager Name</Label>
              <Input id="edit-manager" value={manager} onChange={e => setManager(e.target.value)} className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email" className="text-xs font-semibold">Manager Email Context</Label>
              <Input id="edit-email" type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-valuation" className="text-xs font-semibold">Inventory Valuation (NGN)</Label>
              <Input id="edit-valuation" type="number" value={valuation} onChange={e => setValuation(e.target.value)} className="text-xs h-9" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="text-xs h-9">Cancel</Button>
              <Button type="submit" className="text-xs h-9 bg-primary hover:bg-primary/95 text-white font-semibold">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Storefront Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-500" />
              Storefront Parameters
            </DialogTitle>
            <DialogDescription>
              Detailed multi-tenant environment specifications for this branch.
            </DialogDescription>
          </DialogHeader>
          {viewingStore && (
            <div className="space-y-4 text-xs py-2">
              <div className="grid grid-cols-2 gap-3 border border-muted-foreground/10 rounded-md p-3 bg-muted/20">
                <div>
                  <span className="text-muted-foreground block font-medium">Branch ID</span>
                  <span className="font-mono font-bold select-all">{viewingStore.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Status</span>
                  <Badge className={`mt-0.5 font-bold text-[10px] uppercase ${
                    viewingStore.status === "active" ? "bg-emerald-500/10 text-emerald-500" :
                    viewingStore.status === "maintenance" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                  }`}>
                    {viewingStore.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Vertical / Sector</span>
                  <span className="font-semibold">{SECTOR_LABELS[viewingStore.sector] || viewingStore.sector}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Valuation</span>
                  <span className="font-semibold text-foreground font-mono">₦{viewingStore.valuationNgn.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Total Items</span>
                  <span className="font-semibold font-mono">{viewingStore.itemCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Health Score</span>
                  <span className="font-semibold font-mono">{viewingStore.healthScore}%</span>
                </div>
              </div>

              <div className="space-y-2 border border-muted-foreground/10 rounded-md p-3 bg-muted/20">
                <h4 className="font-semibold text-foreground border-b border-muted-foreground/10 pb-1">Branch Manager context</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground block">Manager Name</span>
                    <span className="font-medium">{viewingStore.manager}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Email context</span>
                    <span className="font-mono">{viewingStore.managerEmail}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)} className="text-xs h-9">
                  Close Window
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    setCurrentStoreId(viewingStore.id);
                    setIsViewOpen(false);
                    toast.success(`Now impersonating "${viewingStore.name}"`);
                  }}
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex gap-1.5"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Impersonate Location
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Storefront Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans text-red-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Terminate & Delete Storefront
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action is destructive. Deleting a branch storefront terminates its containerized multitenant DB slice and all corresponding inventory data.
            </DialogDescription>
          </DialogHeader>
          {deletingStore && (
            <div className="space-y-4 text-xs py-2">
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-md text-red-500/90 font-medium">
                Are you absolutely sure you want to delete <span className="font-bold underline">"{deletingStore.name}"</span>?
                This operation cannot be undone.
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className="text-xs h-9">
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={() => handleDeleteStore(deletingStore)}
                  className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  Terminate Container Slice
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
