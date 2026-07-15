import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Plus, MoreHorizontal, Users, Search, ShieldCheck, Shield, User, CheckCircle2, Copy, Key, MapPin, BarChart3, History } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/hooks/useDemo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/EmptyState";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, getPublicUrl } from "@/lib/utils";
import type { DemoUser } from "@/lib/demo-store";

type RoleType = DemoUser["role"];
const ROLE_LABELS: Record<RoleType, string> = { admin: "Admin", manager: "Inventory Manager", requestor: "Requestor" };
const ROLE_COLORS: Record<RoleType, string> = { admin: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200", manager: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", requestor: "bg-muted text-muted-foreground" };
const CURRENT_USER_ID = "user-01"; // Alice is the logged-in admin in demo

import { useUsers, type AppUser } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { useLocations, useSales, useItems, useMovements } from "@/hooks/useInventoryData";
import type { SaleTransaction, Location, StockMovement, Item } from "@/types/inventory";

export function UserManagement() {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const { data: users, isLoading } = useUsers();
  const { user: currentUser, profile } = useAuth();
  const { settings } = useSystemSettings();

  const { data: locations } = useLocations();
  const { data: sales } = useSales();
  const { data: items } = useItems();
  const { data: movements } = useMovements(50);

  const branches = useMemo(() => locations.filter(l => l.parentId === null && l.type === "warehouse"), [locations]);

  const [subTab, setSubTab] = useState<"directory" | "performance" | "activity">("directory");
  const [inviteBranchId, setInviteBranchId] = useState<string>("all");

  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleType>("manager");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [linkRole, setLinkRole] = useState<RoleType>("manager");

  const [createdUserInfo, setCreatedUserInfo] = useState<{
    email: string;
    role: RoleType;
    tempPassword?: string;
    storeUrl: string;
  } | null>(null);

  const [roleChange, setRoleChange] = useState<{ user: AppUser; newRole: RoleType } | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AppUser | null>(null);

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [userDesc, setUserDesc] = useState("");
  const [isSavingUserDesc, setIsSavingUserDesc] = useState(false);

  const handleUpdateUserDescription = async (userId: string, newDesc: string) => {
    setIsSavingUserDesc(true);
    try {
      if (isDemo && demoStore) {
        demoStore.updateUser(userId, { description: newDesc });
        bumpVersion();
        toast.success("Staff biography updated successfully");
      } else {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { description: newDesc, updatedAt: new Date().toISOString() });
        toast.success("Staff biography updated successfully");
      }
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, description: newDesc });
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to update staff biography");
    } finally {
      setIsSavingUserDesc(false);
    }
  };

  const handleOpenInviteDialog = (open: boolean) => {
    setInviteOpen(open);
    if (!open) {
      setCreatedUserInfo(null);
      setInviteEmail("");
      setInviteRole("manager");
      setInviteError("");
      setInviteBranchId("all");
    }
  };

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  const adminCount = users.filter((u) => u.role === "admin" && u.status === "active").length;

  const isLastAdmin = (user: AppUser) => user.role === "admin" && user.status === "active" && adminCount <= 1;

  const CURRENT_USER_ID = currentUser?.uid || "unknown";

  const storeName = settings?.storeName || "My Store";

  const getInviteLink = (role: RoleType) => {
    const baseUrl = getPublicUrl(window.location.origin);
    const storeIdStr = profile?.storeId || "demo-store";
    const storeNameStr = encodeURIComponent(storeName);
    return `${baseUrl}/?storeId=${storeIdStr}&storeName=${storeNameStr}&role=${role}`;
  };

  const handleUpdateBranch = async (userObj: AppUser, selectedBranchId: string | null) => {
    try {
      if (isDemo && demoStore) {
        demoStore.updateUser(userObj.id, { branchId: selectedBranchId });
        bumpVersion();
      } else {
        await updateDoc(doc(db, "users", userObj.id), {
          branchId: selectedBranchId,
          updatedAt: new Date().toISOString()
        });
      }
      const bName = selectedBranchId ? branches.find(b => b.id === selectedBranchId)?.name || "selected branch" : "All Branches";
      toast.success(`Assigned ${userObj.name} to ${bName}`);
    } catch (err) {
      toast.error("Failed to update branch assignment");
    }
  };

  // ─── Invite ───────────────────────────────────────────
  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setInviteError("Valid email required"); return; }
    if (users.some((u) => u.email.toLowerCase() === email)) { setInviteError("User already exists"); return; }
    
    setInviteLoading(true);
    try {
      const tempPassword = "Nexa-" + Math.floor(100000 + Math.random() * 900000);
      const storeUrl = window.location.origin;

      const branchIdToSave = inviteBranchId === "all" ? null : inviteBranchId;

      if (isDemo && demoStore) {
        demoStore.addUser({ 
          id: crypto.randomUUID(), 
          name: email.split("@")[0], 
          email, 
          role: inviteRole, 
          status: "pending", 
          joinedAt: new Date().toISOString(),
          tempPassword,
          branchId: branchIdToSave
        });
        bumpVersion();
      } else {
        const id = crypto.randomUUID();
        await setDoc(doc(db, "users", id), {
          id,
          name: email.split("@")[0],
          email,
          role: inviteRole,
          storeId: profile?.storeId || null,
          status: "active", // For now, just create as active in live since we don't have real invites
          createdAt: new Date().toISOString(),
          joinedAt: new Date().toISOString(),
          tempPassword,
          branchId: branchIdToSave
        });
      }

      // Automatically copy invite message to clipboard
      const roleLabel = ROLE_LABELS[inviteRole] || inviteRole;
      const copyMessage = `Hello! You have been added to our store, "${storeName}", on Nexa OS as an ${roleLabel}.

Please log in with your credentials:
📧 Email: ${email}
🔑 Temporary Password: ${tempPassword}

Access your store dashboard here:
🔗 ${storeUrl}

Make sure to change your password under settings once logged in.`;

      navigator.clipboard.writeText(copyMessage).catch((e) => console.warn("Failed to auto-copy:", e));

      toast.success(`User ${email} created & invitation copied!`);
      
      setCreatedUserInfo({
        email,
        role: inviteRole,
        tempPassword,
        storeUrl
      });
    } catch (err) {
      toast.error("Failed to create user");
      handleFirestoreError(err, OperationType.CREATE, "users");
    } finally {
      setInviteLoading(false);
    }
  };

  // ─── Role change ──────────────────────────────────────
  const confirmRoleChange = async () => {
    if (!roleChange) return;
    try {
      if (isDemo && demoStore) {
        demoStore.updateUser(roleChange.user.id, { role: roleChange.newRole });
        bumpVersion();
      } else {
        await updateDoc(doc(db, "users", roleChange.user.id), {
          role: roleChange.newRole,
          updatedAt: new Date().toISOString()
        });
      }
      toast.success(`${roleChange.user.name}'s role changed to ${ROLE_LABELS[roleChange.newRole]}`);
      setRoleChange(null);
    } catch (err) {
      toast.error("Failed to update role");
    }
  };

  // ─── Deactivate / Reactivate ──────────────────────────
  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      if (isDemo && demoStore) {
        demoStore.updateUser(deactivateTarget.id, { status: "inactive" });
        bumpVersion();
      } else {
        await updateDoc(doc(db, "users", deactivateTarget.id), {
          status: "inactive",
          updatedAt: new Date().toISOString()
        });
      }
      toast.success(`${deactivateTarget.name} deactivated`);
      setDeactivateTarget(null);
    } catch (err) {
      toast.error("Failed to deactivate user");
    }
  };

  const handleReactivate = async (u: AppUser) => {
    try {
      if (isDemo && demoStore) {
        demoStore.updateUser(u.id, { status: "active" });
        bumpVersion();
      } else {
        await updateDoc(doc(db, "users", u.id), {
          status: "active",
          updatedAt: new Date().toISOString()
        });
      }
      toast.success(`${u.name} reactivated`);
    } catch (err) {
      toast.error("Failed to reactivate user");
    }
  };

  if (isLoading) {
    return <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  if (users.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
           <Button size="sm" onClick={() => setInviteOpen(true)}>
             <Plus className="mr-1.5 h-3.5 w-3.5" /> Create User
           </Button>
        </div>
        <EmptyState icon={Users} title="No users found" description="Users will appear here once they sign up or are added." />
        
        <Dialog open={inviteOpen} onOpenChange={handleOpenInviteDialog}>
          <DialogContent>
            {createdUserInfo ? (
              <div className="space-y-4 py-2">
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground">User Created Successfully!</h3>
                  <p className="text-sm text-muted-foreground">The temporary password and instructions have been copied to your clipboard. Send them to the user so they can log in.</p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs text-muted-foreground border-b pb-2">
                    <span>Credentials summary</span>
                    <span className="font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded dark:bg-emerald-950/40 dark:text-emerald-400">Ready to Send</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium text-foreground">{createdUserInfo.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <span className="font-medium text-foreground">{ROLE_LABELS[createdUserInfo.role]}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-muted-foreground">Temporary Password:</span>
                      <div className="flex items-center gap-2">
                        <code className="font-mono bg-background px-2 py-0.5 border rounded text-xs text-foreground select-all">{createdUserInfo.tempPassword}</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => {
                            if (createdUserInfo.tempPassword) {
                              navigator.clipboard.writeText(createdUserInfo.tempPassword);
                              toast.success("Password copied!");
                            }
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Full Invitation Message</Label>
                  <textarea
                    readOnly
                    value={`Hello! You have been added to our store, "${storeName}", on Nexa OS as an ${ROLE_LABELS[createdUserInfo.role]}.

Please log in with your credentials:
📧 Email: ${createdUserInfo.email}
🔑 Temporary Password: ${createdUserInfo.tempPassword}

Access your store dashboard here:
🔗 ${createdUserInfo.storeUrl}

Make sure to change your password under settings once logged in.`}
                    className="w-full h-32 rounded-lg border bg-background p-3 text-xs font-mono text-muted-foreground focus:outline-none select-all"
                  />
                </div>

                <DialogFooter className="pt-2 gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      const roleLabel = ROLE_LABELS[createdUserInfo.role] || createdUserInfo.role;
                      const copyMessage = `Hello! You have been added to our store, "${storeName}", on Nexa OS as an ${roleLabel}.

Please log in with your credentials:
📧 Email: ${createdUserInfo.email}
🔑 Temporary Password: ${createdUserInfo.tempPassword}

Access your store dashboard here:
🔗 ${createdUserInfo.storeUrl}

Make sure to change your password under settings once logged in.`;
                      navigator.clipboard.writeText(copyMessage);
                      toast.success("Full invitation message copied!");
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Copy Message
                  </Button>
                  <Button className="w-full sm:w-auto" onClick={() => handleOpenInviteDialog(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Invite User</DialogTitle>
                  <DialogDescription>Add a new team member to your live store.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={inviteEmail} onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); }} placeholder="user@example.com" />
                    {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as RoleType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Inventory Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 space-y-3 mt-4">
                    <div className="space-y-0.5">
                      <h4 className="font-semibold text-emerald-400 text-sm">Or use Shareable Link</h4>
                      <p className="text-xs text-muted-foreground">Send this unique URL to let team members register and join directly.</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Select value={linkRole} onValueChange={(v) => setLinkRole(v as RoleType)}>
                        <SelectTrigger className="w-[140px] h-9 text-xs bg-white text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Inventory Manager</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <div className="relative flex-1">
                        <Input 
                          readOnly 
                          value={getInviteLink(linkRole)} 
                          className="h-9 pr-14 text-xs bg-white text-muted-foreground font-mono select-all" 
                        />
                        <Button 
                          size="xs" 
                          variant="secondary" 
                          className="absolute right-1 top-1 h-7 text-xs px-2.5"
                          onClick={() => {
                            navigator.clipboard.writeText(getInviteLink(linkRole));
                            toast.success("Invite link copied!");
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => handleOpenInviteDialog(false)}>Cancel</Button>
                  <Button onClick={handleInvite} disabled={inviteLoading}>{inviteLoading ? "Creating…" : "Create User"}</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex gap-2">
          <Button
            variant={subTab === "directory" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSubTab("directory")}
            className="gap-1.5 text-xs uppercase tracking-wider font-bold"
          >
            <Users className="h-3.5 w-3.5" /> Staff Directory
          </Button>
          <Button
            variant={subTab === "performance" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSubTab("performance")}
            className="gap-1.5 text-xs uppercase tracking-wider font-bold"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Performance
          </Button>
          <Button
            variant={subTab === "activity" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSubTab("activity")}
            className="gap-1.5 text-xs uppercase tracking-wider font-bold"
          >
            <History className="h-3.5 w-3.5" /> Activity
          </Button>
        </div>
        
        {subTab === "directory" && (
          <Button size="sm" onClick={() => setInviteOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Invite User
          </Button>
        )}
      </div>

      {subTab === "directory" && (
        <div className="space-y-4">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm bg-white" />
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch Assignment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
                ) : filtered.map((user) => (
                  <TableRow key={user.id} className={cn(user.status === "inactive" && "opacity-50")}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setUserDesc(user.description || "");
                        }}
                        className="hover:underline text-teal-600 dark:text-teal-400 text-left font-semibold focus:outline-none transition-colors"
                      >
                        {user.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <RoleDropdown user={user} currentUserId={CURRENT_USER_ID} adminCount={adminCount} isLastAdmin={isLastAdmin(user)}
                        onChangeRole={(newRole) => setRoleChange({ user, newRole })} />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.branchId || "all"}
                        onValueChange={(val) => handleUpdateBranch(user, val === "all" ? null : val)}
                      >
                        <SelectTrigger className="h-7 w-[160px] text-xs bg-background">
                          <SelectValue placeholder="All Branches" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Branches</SelectItem>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "default" : user.status === "pending" ? "outline" : "secondary"}
                        className={cn("text-xs", user.status === "inactive" && "bg-muted text-muted-foreground")}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(() => {
                        const dateStr = user.joinedAt || (user as Record<string, unknown>).createdAt as string;
                        if (!dateStr) return "N/A";
                        try {
                          const date = new Date(dateStr);
                          return isNaN(date.getTime()) ? "N/A" : format(date, "MMM d, yyyy");
                        } catch (e) {
                          return "N/A";
                        }
                      })()}
                    </TableCell>
                    <TableCell>
                      <UserActions user={user} currentUserId={CURRENT_USER_ID} isLastAdmin={isLastAdmin(user)}
                        onDeactivate={() => setDeactivateTarget(user)} onReactivate={() => handleReactivate(user)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Layout */}
          <div className="sm:hidden space-y-3">
            {filtered.map((user) => (
              <div key={user.id} className={cn("rounded-lg border border-border p-3 space-y-2 bg-card", user.status === "inactive" && "opacity-50")}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setUserDesc(user.description || "");
                    }}
                    className="font-medium text-sm hover:underline text-teal-600 dark:text-teal-400 text-left focus:outline-none"
                  >
                    {user.name}
                  </button>
                  <UserActions user={user} currentUserId={CURRENT_USER_ID} isLastAdmin={isLastAdmin(user)}
                    onDeactivate={() => setDeactivateTarget(user)} onReactivate={() => handleReactivate(user)} />
                </div>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge className={cn("text-xs", ROLE_COLORS[user.role])}>{ROLE_LABELS[user.role]}</Badge>
                  <Badge variant={user.status === "active" ? "default" : "secondary"} className="text-xs">{user.status}</Badge>
                  <Badge variant="outline" className="text-xs border-dashed">
                    {user.branchId ? (branches.find(b => b.id === user.branchId)?.name || "Assigned Branch") : "All Branches"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === "performance" && (
        <StaffPerformanceView users={users} sales={sales} branches={branches} />
      )}

      {subTab === "activity" && (
        <StaffActivityView users={users} movements={movements} items={items} />
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={handleOpenInviteDialog}>
        <DialogContent>
          {createdUserInfo ? (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center justify-center text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg text-foreground">User Created Successfully!</h3>
                <p className="text-sm text-muted-foreground">The temporary password and instructions have been copied to your clipboard. Send them to the user so they can log in.</p>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex justify-between items-center text-xs text-muted-foreground border-b pb-2">
                  <span>Credentials summary</span>
                  <span className="font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded dark:bg-emerald-950/40 dark:text-emerald-400">Ready to Send</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium text-foreground">{createdUserInfo.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="font-medium text-foreground">{ROLE_LABELS[createdUserInfo.role]}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-muted-foreground">Temporary Password:</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono bg-background px-2 py-0.5 border rounded text-xs text-foreground select-all">{createdUserInfo.tempPassword}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          if (createdUserInfo.tempPassword) {
                            navigator.clipboard.writeText(createdUserInfo.tempPassword);
                            toast.success("Password copied!");
                          }
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Full Invitation Message</Label>
                <textarea
                  readOnly
                  value={`Hello! You have been added to our store, "${storeName}", on Nexa OS as an ${ROLE_LABELS[createdUserInfo.role]}.
 
Please log in with your credentials:
📧 Email: ${createdUserInfo.email}
🔑 Temporary Password: ${createdUserInfo.tempPassword}

Access your store dashboard here:
🔗 ${createdUserInfo.storeUrl}

Make sure to change your password under settings once logged in.`}
                  className="w-full h-32 rounded-lg border bg-background p-3 text-xs font-mono text-muted-foreground focus:outline-none select-all"
                />
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const roleLabel = ROLE_LABELS[createdUserInfo.role] || createdUserInfo.role;
                    const copyMessage = `Hello! You have been added to our store, "${storeName}", on Nexa OS as an ${roleLabel}.

Please log in with your credentials:
📧 Email: ${createdUserInfo.email}
🔑 Temporary Password: ${createdUserInfo.tempPassword}

Access your store dashboard here:
🔗 ${createdUserInfo.storeUrl}

Make sure to change your password under settings once logged in.`;
                    navigator.clipboard.writeText(copyMessage);
                    toast.success("Full invitation message copied!");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copy Message
                </Button>
                <Button className="w-full sm:w-auto" onClick={() => handleOpenInviteDialog(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Invite User</DialogTitle>
                <DialogDescription>Send an invitation email to add a new team member.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={inviteEmail} onChange={(e) => { setInviteEmail(e.target.value); setInviteError(""); }} placeholder="user@example.com" />
                  {inviteError && <p className="text-xs text-destructive">{inviteError}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as RoleType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Inventory Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Branch Assignment</Label>
                  <Select value={inviteBranchId} onValueChange={setInviteBranchId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 space-y-3 mt-4">
                  <div className="space-y-0.5">
                    <h4 className="font-semibold text-emerald-400 text-sm">Or use Shareable Link</h4>
                    <p className="text-xs text-muted-foreground">Send this unique URL to let team members register and join directly.</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select value={linkRole} onValueChange={(v) => setLinkRole(v as RoleType)}>
                      <SelectTrigger className="w-[140px] h-9 text-xs bg-white text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Inventory Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="relative flex-1">
                      <Input 
                        readOnly 
                        value={getInviteLink(linkRole)} 
                        className="h-9 pr-14 text-xs bg-white text-muted-foreground font-mono select-all" 
                      />
                      <Button 
                        size="xs" 
                        variant="secondary" 
                        className="absolute right-1 top-1 h-7 text-xs px-2.5"
                        onClick={() => {
                          navigator.clipboard.writeText(getInviteLink(linkRole));
                          toast.success("Invite link copied!");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => handleOpenInviteDialog(false)}>Cancel</Button>
                <Button onClick={handleInvite} disabled={inviteLoading}>{inviteLoading ? "Sending…" : "Send Invite"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Role change confirmation */}
      <AlertDialog open={!!roleChange} onOpenChange={(open) => !open && setRoleChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role?</AlertDialogTitle>
            <AlertDialogDescription>
              Change {roleChange?.user.name}'s role from <strong>{roleChange ? ROLE_LABELS[roleChange.user.role] : ""}</strong> to <strong>{roleChange ? ROLE_LABELS[roleChange.newRole] : ""}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate confirmation */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>They will lose access immediately. You can reactivate them later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Detail & Performance Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedUser && (() => {
            const userSales = sales.filter(s => s.createdBy === selectedUser.id || s.createdBy === selectedUser.email || s.createdBy === selectedUser.name);
            const totalRevenue = userSales.reduce((sum, s) => sum + (s.totalNgn || 0), 0);
            const transactionCount = userSales.length;
            const averageValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
            const branchName = selectedUser.branchId ? (branches.find(b => b.id === selectedUser.branchId)?.name || "Assigned Branch") : "All Branches";

            return (
              <div className="space-y-6">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                    <User className="h-5 w-5 text-teal-600" />
                    Staff Profile & Analytics
                  </DialogTitle>
                  <DialogDescription>
                    Detailed overview of performance, biography, and credentials.
                  </DialogDescription>
                </DialogHeader>

                {/* Identity Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{selectedUser.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={cn("text-xs", ROLE_COLORS[selectedUser.role])}>
                        {ROLE_LABELS[selectedUser.role]}
                      </Badge>
                      <Badge variant="outline" className="text-xs uppercase font-semibold">
                        {branchName}
                      </Badge>
                      <Badge variant={selectedUser.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
                        {selectedUser.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-muted-foreground block font-medium">Joined Date</span>
                    <span className="text-sm font-bold text-foreground">
                      {selectedUser.joinedAt ? format(new Date(selectedUser.joinedAt), "MMMM d, yyyy") : "N/A"}
                    </span>
                  </div>
                </div>

                {/* Biography Section */}
                <div className="space-y-2">
                  <Label htmlFor="user-bio" className="text-sm font-bold flex items-center gap-2">
                    Biography / Shift Description & Qualifications
                  </Label>
                  <p className="text-xs text-muted-foreground">Admins and owners can view or modify the biographical notes and qualifications for this staff member.</p>
                  <div className="flex flex-col gap-2">
                    <textarea
                      id="user-bio"
                      value={userDesc}
                      onChange={(e) => setUserDesc(e.target.value)}
                      placeholder="Add Shift details, qualifications, background, work notes..."
                      className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdateUserDescription(selectedUser.id, userDesc)}
                      disabled={isSavingUserDesc || userDesc === (selectedUser.description || "")}
                      className="self-end bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                    >
                      {isSavingUserDesc ? "Saving..." : "Save Biography"}
                    </Button>
                  </div>
                </div>

                {/* Performance Metrics Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-emerald-500" />
                    Sales Performance Statistics
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/10">
                      <span className="text-xs text-muted-foreground font-medium block">Total Contribution</span>
                      <span className="text-xl font-bold font-mono text-emerald-500">₦{totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="p-4 rounded-xl border bg-blue-500/5 border-blue-500/10">
                      <span className="text-xs text-muted-foreground font-medium block">Transactions Processed</span>
                      <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">{transactionCount} sales</span>
                    </div>
                    <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/10">
                      <span className="text-xs text-muted-foreground font-medium block">Average Basket Value</span>
                      <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">₦{Math.round(averageValue).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Recent Transactions Handled
                  </h4>
                  {userSales.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-xl">
                      No registered transactions found for this user
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-xl p-2 bg-muted/10">
                      {userSales.slice(0, 10).map((sale) => (
                        <div key={sale.id} className="flex justify-between items-center text-xs p-2 rounded-lg border bg-card">
                          <div>
                            <span className="font-mono font-bold text-foreground block">{sale.id.toUpperCase().substring(0, 8)}</span>
                            <span className="text-muted-foreground">
                              {sale.createdAt ? format(new Date(sale.createdAt), "MMM d, h:mm a") : "N/A"}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-emerald-500 block">₦{(sale.totalNgn || 0).toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{sale.paymentMethod}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-2">
                  <Button variant="outline" onClick={() => setSelectedUser(null)}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Staff Performance View ──────────────────────────────
interface StaffPerformanceViewProps {
  users: AppUser[];
  sales: SaleTransaction[];
  branches: Location[];
}

function StaffPerformanceView({ users, sales, branches }: StaffPerformanceViewProps) {
  const totalStoreRevenue = useMemo(() => sales.reduce((sum, s) => sum + (s.totalNgn || 0), 0), [sales]);

  const performanceList = useMemo(() => {
    return users.map(u => {
      const userSales = sales.filter(s => s.createdBy === u.id || s.createdBy === u.email || s.createdBy === u.name);
      const totalRevenue = userSales.reduce((sum, s) => sum + (s.totalNgn || 0), 0);
      const transactionCount = userSales.length;
      const averageValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;
      return {
        user: u,
        totalRevenue,
        transactions: transactionCount,
        averageValue,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [users, sales]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Sales Performance Ranking</h3>
        {performanceList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">No user sales records found</div>
        ) : (
          <div className="space-y-4">
            {performanceList.map((p, idx) => {
              const percentOfTotal = totalStoreRevenue > 0 ? (p.totalRevenue / totalStoreRevenue) * 100 : 0;
              const branchName = p.user.branchId ? (branches.find(b => b.id === p.user.branchId)?.name || "Assigned") : "All Branches";
              return (
                <div key={p.user.id} className="space-y-2 p-3 rounded-lg border bg-muted/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-muted-foreground bg-muted h-5 w-5 rounded-full flex items-center justify-center">#{idx + 1}</span>
                        <span className="font-bold text-sm text-foreground">{p.user.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold">{branchName}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground ml-7">{p.user.email}</p>
                    </div>
                    <div className="text-left sm:text-right sm:ml-7">
                      <span className="text-sm font-bold font-mono text-emerald-500 block">₦{p.totalRevenue.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground font-mono">{p.transactions} sales | avg: ₦{Math.round(p.averageValue).toLocaleString()}</span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="ml-7 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${percentOfTotal}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Staff Activity View ─────────────────────────────────
interface StaffActivityViewProps {
  users: AppUser[];
  movements: StockMovement[];
  items: Item[];
}

function StaffActivityView({ users, movements, items }: StaffActivityViewProps) {
  const userActivities = useMemo(() => {
    return movements.map(m => {
      const performer = users.find(u => u.id === m.performedBy || u.email === m.performedBy || u.name === m.performedBy);
      const itemObj = items.find(i => i.id === m.itemId);
      return {
        movement: m,
        performer,
        itemName: itemObj ? itemObj.name : "Unknown Item"
      };
    });
  }, [users, movements, items]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Staff Activity Logs</h3>
        {userActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <History className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">No recent activity found.</span>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {userActivities.map((act) => (
              <div key={act.movement.id} className="flex items-start justify-between p-3 rounded-lg border bg-muted/10 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-foreground">
                      {act.performer ? act.performer.name : (act.movement.performedBy || "System")}
                    </span>
                    <span className="text-muted-foreground uppercase tracking-wide text-[10px] bg-muted px-1.5 py-0.5 rounded">
                      {act.movement.type}
                    </span>
                    <span className="font-medium text-foreground">
                      {act.movement.quantity > 0 ? `+${act.movement.quantity}` : act.movement.quantity} units
                    </span>
                    <span className="text-muted-foreground">of</span>
                    <span className="font-semibold text-emerald-600 truncate max-w-[150px]">
                      {act.itemName}
                    </span>
                  </div>
                  {act.movement.notes && (
                    <p className="text-muted-foreground italic">Notes: "{act.movement.notes}"</p>
                  )}
                </div>
                <span className="text-muted-foreground font-mono shrink-0 ml-4">
                  {act.movement.createdAt ? format(new Date(act.movement.createdAt), "MMM d, h:mm a") : "N/A"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Role Dropdown ──────────────────────────────────────
function RoleDropdown({ user, currentUserId, adminCount, isLastAdmin, onChangeRole }: {
  user: AppUser; currentUserId: string; adminCount: number; isLastAdmin: boolean;
  onChangeRole: (role: RoleType) => void;
}) {
  const isSelf = user.id === currentUserId;

  if (isSelf) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={cn("text-xs cursor-default", ROLE_COLORS[user.role])}>{ROLE_LABELS[user.role]}</Badge>
          </TooltipTrigger>
          <TooltipContent>Cannot change your own role</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isLastAdmin) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={cn("text-xs cursor-default", ROLE_COLORS[user.role])}>{ROLE_LABELS[user.role]}</Badge>
          </TooltipTrigger>
          <TooltipContent>Cannot change role — this is the only admin. Promote another user first.</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Select value={user.role} onValueChange={(v) => { if (v !== user.role) onChangeRole(v as RoleType); }}>
      <SelectTrigger className="h-7 w-[160px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">
          <div className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Admin</div>
        </SelectItem>
        <SelectItem value="manager">
          <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />Inventory Manager</div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

// ─── User Actions ───────────────────────────────────────
function UserActions({ user, currentUserId, isLastAdmin, onDeactivate, onReactivate }: {
  user: AppUser; currentUserId: string; isLastAdmin: boolean;
  onDeactivate: () => void; onReactivate: () => void;
}) {
  const isSelf = user.id === currentUserId;
  const canDeactivate = !isSelf && !isLastAdmin && user.status !== "inactive";
  const canReactivate = user.status === "inactive";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user.tempPassword && (
          <DropdownMenuItem 
            onClick={() => {
              navigator.clipboard.writeText(user.tempPassword!);
              toast.success(`Temporary password copied: ${user.tempPassword}`);
            }}
          >
            <Key className="mr-2 h-3.5 w-3.5" /> Copy Temp Password
          </DropdownMenuItem>
        )}
        {canReactivate ? (
          <DropdownMenuItem onClick={onReactivate}>Reactivate</DropdownMenuItem>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem disabled={!canDeactivate} onClick={canDeactivate ? onDeactivate : undefined}>
                  Deactivate
                </DropdownMenuItem>
              </TooltipTrigger>
              {!canDeactivate && (
                <TooltipContent>
                  {isSelf ? "Cannot deactivate yourself" : isLastAdmin ? "Cannot deactivate the only admin" : ""}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
