import { createFileRoute } from "@tanstack/react-router";
import { useSuperAdminContext, SuperUser } from "./app.super-admin";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

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
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<SuperUser | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<SuperUser | null>(null);

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

  const handleCreate = async (e: React.FormEvent) => {
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

    const newUserId = `user-${Date.now()}`;
    try {
      await setDoc(doc(db, "users", newUserId), {
        id: newUserId,
        name,
        email,
        role,
        storeId,
        storeName: linkedStore.name,
        status: "active",
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
      });

      const newLogId = `log-${Date.now()}`;
      await setDoc(doc(db, "system_logs", newLogId), {
        id: newLogId,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Registered staff profile "${name}" for branch: "${linkedStore.name}"`,
        store: linkedStore.name,
        status: "success",
      });

      toast.success(`Registered user profile "${name}" successfully!`);
      setIsAddOpen(false);
      // Reset form
      setName("");
      setEmail("");
      setRole("manager");
      setStoreId("");
    } catch (err) {
      console.error("Failed to register staff profile:", err);
      toast.error("Failed to save staff profile to database.");
    }
  };

  const openEdit = (user: SuperUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setStoreId(user.storeId);
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const linkedStore = superStores.find(s => s.id === storeId);
    const storeName = linkedStore ? linkedStore.name : editingUser.storeName;

    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        name,
        email,
        role,
        storeId,
        storeName,
      });

      const newLogId = `log-${Date.now()}`;
      await setDoc(doc(db, "system_logs", newLogId), {
        id: newLogId,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Updated credentials and role permissions for: "${name}"`,
        store: storeName,
        status: "info",
      });

      toast.success(`User profile "${name}" updated successfully.`);
      setIsEditOpen(false);
      setEditingUser(null);
    } catch (err) {
      console.error("Failed to update user profile:", err);
      toast.error("Failed to update user in the database.");
    }
  };

  const toggleUserStatus = async (user: SuperUser) => {
    const nextStatus = user.status === "active" ? "inactive" : "active";

    try {
      await updateDoc(doc(db, "users", user.id), {
        status: nextStatus,
      });

      const newLogId = `log-${Date.now()}`;
      await setDoc(doc(db, "system_logs", newLogId), {
        id: newLogId,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Changed security status of "${user.name}" to [${nextStatus.toUpperCase()}]`,
        store: user.storeName,
        status: nextStatus === "active" ? "success" : "warning",
      });

      toast.info(`"${user.name}" status set to ${nextStatus.toUpperCase()}`);
    } catch (err) {
      console.error("Failed to toggle user status:", err);
      toast.error("Failed to update security status in database.");
    }
  };

  const handleDeleteUser = async (user: SuperUser) => {
    try {
      await deleteDoc(doc(db, "users", user.id));

      const newLogId = `log-${Date.now()}`;
      await setDoc(doc(db, "system_logs", newLogId), {
        id: newLogId,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Terminated and deleted user credentials: "${user.name}" (${user.email})`,
        store: user.storeName,
        status: "warning",
      });

      toast.success(`User "${user.name}" deleted successfully.`);
      setIsDeleteOpen(false);
      setDeletingUser(null);
    } catch (err) {
      console.error("Failed to delete user:", err);
      toast.error("Failed to delete user credentials from database.");
    }
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
                  <div className="flex justify-end gap-1.5">
                    <Button onClick={() => { setViewingUser(user); setIsViewOpen(true); }} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-500" title="View details">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button onClick={() => openEdit(user)} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Edit user">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button onClick={() => { setDeletingUser(user); setIsDeleteOpen(true); }} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" title="Delete user">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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

      {/* View User Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-500" />
              Staff Profile Details
            </DialogTitle>
            <DialogDescription>
              Detailed multi-tenant user access authorizations.
            </DialogDescription>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-4 text-xs py-2">
              <div className="grid grid-cols-2 gap-3 border border-muted-foreground/10 rounded-md p-3 bg-muted/20">
                <div>
                  <span className="text-muted-foreground block font-medium">Full Name</span>
                  <span className="font-semibold text-foreground">{viewingUser.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Email Context</span>
                  <span className="font-mono font-bold select-all">{viewingUser.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">System Role</span>
                  <Badge className={`mt-0.5 font-bold text-[10px] uppercase ${
                    viewingUser.role === "admin" ? "bg-red-500/10 text-red-500" :
                    viewingUser.role === "manager" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                  }`}>
                    {viewingUser.role}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Security State</span>
                  <Badge className={`mt-0.5 font-bold text-[10px] uppercase ${
                    viewingUser.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  }`}>
                    {viewingUser.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Assigned Branch</span>
                  <span className="font-semibold">{viewingUser.storeName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Joined On</span>
                  <span className="font-semibold font-mono">{viewingUser.joinedDate}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)} className="text-xs h-9">
                  Close Details
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    setIsViewOpen(false);
                    openEdit(viewingUser);
                  }}
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Configure Profile
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans text-red-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Terminate User Account
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action is destructive. Deleting a user profile revokes their access authorization context immediately.
            </DialogDescription>
          </DialogHeader>
          {deletingUser && (
            <div className="space-y-4 text-xs py-2">
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-md text-red-500/90 font-medium">
                Are you absolutely sure you want to terminate <span className="font-bold underline">"{deletingUser.name}"</span>'s access credentials?
                This operation cannot be undone.
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className="text-xs h-9">
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={() => handleDeleteUser(deletingUser)}
                  className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  Revoke Authorization
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
