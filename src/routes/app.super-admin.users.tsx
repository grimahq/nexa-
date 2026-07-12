import { createFileRoute } from "@tanstack/react-router";
import { useSuperAdminContext, SuperUser } from "./app.super-admin";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/app/super-admin/users")({
  component: SuperAdminUsers,
});

function SuperAdminUsers() {
  const { superUsers, setSuperUsers, superStores, setLogs } = useSuperAdminContext();
  const [search, setSearch] = useState("");

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SuperUser | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager">("manager");
  const [storeId, setStoreId] = useState("");

  const filteredUsers = useMemo(() => {
    return superUsers.filter(
      u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.storeName.toLowerCase().includes(search.toLowerCase())
    );
  }, [superUsers, search]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !storeId) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const linkedStore = superStores.find(s => s.id === storeId);
    if (!linkedStore) {
      toast.error("Invalid store branch chosen.");
      return;
    }

    const newUser: SuperUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      storeId,
      storeName: linkedStore.name,
      joinedDate: new Date().toISOString().slice(0, 10),
      status: "active",
    };

    setSuperUsers(prev => [...prev, newUser]);
    setLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Registered staff profile "${name}" for branch: "${linkedStore.name}"`,
        store: linkedStore.name,
        status: "success",
      },
      ...prev,
    ]);

    toast.success(`Registered user profile "${name}" successfully!`);
    setIsAddOpen(false);
    // Reset form
    setName("");
    setEmail("");
    setRole("manager");
    setStoreId("");
  };

  const openEdit = (user: SuperUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setStoreId(user.storeId);
    setIsEditOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const linkedStore = superStores.find(s => s.id === storeId);
    const storeName = linkedStore ? linkedStore.name : editingUser.storeName;

    setSuperUsers(prev =>
      prev.map(u =>
        u.id === editingUser.id
          ? {
              ...u,
              name,
              email,
              role,
              storeId,
              storeName,
            }
          : u
      )
    );

    setLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Updated credentials and role permissions for: "${name}"`,
        store: storeName,
        status: "info",
      },
      ...prev,
    ]);

    toast.success(`User profile "${name}" updated successfully.`);
    setIsEditOpen(false);
    setEditingUser(null);
  };

  const toggleUserStatus = (user: SuperUser) => {
    const nextStatus = user.status === "active" ? "inactive" : "active";

    setSuperUsers(prev =>
      prev.map(u => (u.id === user.id ? { ...u, status: nextStatus } : u))
    );

    setLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Changed security status of "${user.name}" to [${nextStatus.toUpperCase()}]`,
        store: user.storeName,
        status: nextStatus === "active" ? "success" : "warning",
      },
      ...prev,
    ]);

    toast.info(`"${user.name}" status set to ${nextStatus.toUpperCase()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search users..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
          <Plus className="h-4 w-4" /> Add Multi-Tenant User
        </Button>
      </div>

      <div className="overflow-hidden border border-muted-foreground/10 rounded-lg">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
              <th className="p-3">Staff Name</th>
              <th className="p-3">Email Access Context</th>
              <th className="p-3">System Role</th>
              <th className="p-3">Assigned Branch</th>
              <th className="p-3">Joined On</th>
              <th className="p-3">Security State</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted-foreground/10">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-3 font-semibold text-foreground">{user.name}</td>
                <td className="p-3 text-muted-foreground font-mono">{user.email}</td>
                <td className="p-3">
                  {user.role === "admin" && (
                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/10 text-[10px] font-bold">
                      ADMIN
                    </Badge>
                  )}
                  {user.role === "manager" && (
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/10 text-[10px] font-bold">
                      MANAGER
                    </Badge>
                  )}
                  {user.role === "requestor" && (
                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/10 text-[10px] font-bold">
                      REQUESTOR
                    </Badge>
                  )}
                </td>
                <td className="p-3 text-foreground font-medium">{user.storeName}</td>
                <td className="p-3 text-muted-foreground font-mono">{user.joinedDate}</td>
                <td className="p-3">
                  <button onClick={() => toggleUserStatus(user)} className="focus:outline-none">
                    {user.status === "active" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] font-bold">
                        ACTIVE
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 text-[10px] font-bold">
                        LOCKED
                      </Badge>
                    )}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <Button onClick={() => openEdit(user)} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans">Register Multi-Tenant Staff Profile</DialogTitle>
            <DialogDescription>Authorizes a user account slice and maps them to a physical branch.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="user-name" className="text-xs font-semibold">Staff Full Name</Label>
              <Input id="user-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alice Chen" className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email" className="text-xs font-semibold">Email Address</Label>
              <Input id="user-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. alice@stackwise.io" className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-role" className="text-xs font-semibold">System Authorization Role</Label>
              <select id="user-role" value={role} onChange={e => setRole(e.target.value as "admin" | "manager")} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none">
                <option value="manager">Store Manager (POS & Inventory control)</option>
                <option value="admin">Store Admin (Full branch permissions)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-store" className="text-xs font-semibold">Assigned Location Branch</Label>
              <select id="user-store" value={storeId} onChange={e => setStoreId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none" required>
                <option value="">-- Choose Branch Location --</option>
                {superStores.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.sector})</option>
                ))}
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="text-xs h-9">Cancel</Button>
              <Button type="submit" className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">Authorize Credentials</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans">Modify User Profile</DialogTitle>
            <DialogDescription>Update metadata and locations mapping for this profile slice.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-name" className="text-xs font-semibold">Staff Full Name</Label>
              <Input id="edit-user-name" value={name} onChange={e => setName(e.target.value)} className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-email" className="text-xs font-semibold">Email Address</Label>
              <Input id="edit-user-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-role" className="text-xs font-semibold">System Authorization Role</Label>
              <select id="edit-user-role" value={role} onChange={e => setRole(e.target.value as "admin" | "manager")} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none">
                <option value="manager">Store Manager (POS & Inventory control)</option>
                <option value="admin">Store Admin (Full branch permissions)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-store" className="text-xs font-semibold">Assigned Location Branch</Label>
              <select id="edit-user-store" value={storeId} onChange={e => setStoreId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none" required>
                {superStores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
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
