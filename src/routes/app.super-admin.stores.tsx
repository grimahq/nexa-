import { createFileRoute } from "@tanstack/react-router";
import { useSuperAdminContext, SuperStore } from "./app.super-admin";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !manager || !managerEmail) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const newStore: SuperStore = {
      id: `store-${Date.now()}`,
      name,
      sector,
      manager,
      managerEmail,
      itemCount: 0,
      valuationNgn: Number(valuation) || 0,
      healthScore: 100,
      alerts: 0,
      status: "active",
    };

    setSuperStores(prev => [...prev, newStore]);
    setLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Provisioned new multi-tenant storefront: "${name}"`,
        store: name,
        status: "success",
      },
      ...prev,
    ]);

    toast.success(`Storefront "${name}" provisioned successfully!`);
    setIsAddOpen(false);
    // Reset form
    setName("");
    setManager("");
    setManagerEmail("");
    setValuation("500000");
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

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;

    setSuperStores(prev =>
      prev.map(s =>
        s.id === editingStore.id
          ? {
              ...s,
              name,
              sector,
              manager,
              managerEmail,
              valuationNgn: Number(valuation) || 0,
            }
          : s
      )
    );

    setLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Modified configuration parameters for: "${name}"`,
        store: name,
        status: "info",
      },
      ...prev,
    ]);

    toast.success(`Store "${name}" updated successfully.`);
    setIsEditOpen(false);
    setEditingStore(null);
  };

  const toggleStoreStatus = (store: SuperStore) => {
    const nextStatusMap: Record<SuperStore["status"], SuperStore["status"]> = {
      active: "maintenance",
      maintenance: "suspended",
      suspended: "active",
    };
    const nextStatus = nextStatusMap[store.status];

    setSuperStores(prev =>
      prev.map(s => (s.id === store.id ? { ...s, status: nextStatus } : s))
    );

    setLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Toggled state of "${store.name}" to [${nextStatus.toUpperCase()}]`,
        store: store.name,
        status: nextStatus === "active" ? "success" : "warning",
      },
      ...prev,
    ]);

    toast.info(`"${store.name}" is now in ${nextStatus.toUpperCase()} mode.`);
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
                      <Button onClick={() => setCurrentStoreId(store.id)} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-500" title="Impersonate branch">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button onClick={() => openEdit(store)} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Configure settings">
                        <Edit2 className="h-3.5 w-3.5" />
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
    </div>
  );
}
