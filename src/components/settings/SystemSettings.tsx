import { useState } from "react";
import { RotateCcw, Info, Play, Database, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useDemo } from "@/hooks/useDemo";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { DemoWalkthrough } from "@/components/onboarding/DemoWalkthrough";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function SystemSettings() {
  const { isDemo, demoStore, resetDemoData, exitDemoMode } = useDemo();
  const { user, login, logout, profile } = useAuth();
  const { isAdmin } = useRole();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPurgeOpen, setConfirmPurgeOpen] = useState(false);
  const [confirmPurgeUsersOpen, setConfirmPurgeUsersOpen] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [purgeUsersConfirmText, setPurgeUsersConfirmText] = useState("");
  const [walkthroughActive, setWalkthroughActive] = useState(false);

  const items = demoStore?.getItems()?.length ?? 0;
  const suppliers = demoStore?.getSuppliers()?.length ?? 0;
  const locations = demoStore?.getLocations()?.length ?? 0;

  const handleReset = () => {
    resetDemoData();
    setConfirmOpen(false);
    toast.success("Demo data reset to defaults");
  };

  const handlePurgeUsers = async () => {
    if (purgeUsersConfirmText !== "DELETE") return;
    if (!profile?.storeId || !user) return;

    const toastId = toast.loading("Removing staff profiles...");
    
    try {
      const q = query(collection(db, "users"), where("storeId", "==", profile.storeId));
      const snap = await getDocs(q);
      
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        // Don't delete yourself
        if (d.id !== user.uid) {
          batch.delete(d.ref);
          // Also delete their admin record if they had one
          batch.delete(doc(db, "admins", d.id));
        }
      });
      await batch.commit();

      toast.success("Staff profiles removed.", { id: toastId });
      setConfirmPurgeUsersOpen(false);
      setPurgeUsersConfirmText("");
    } catch (error) {
      console.error("User purge failed:", error);
      toast.error("Failed to remove some profiles.", { id: toastId });
    }
  };

  const handleFactoryReset = async () => {
    if (purgeConfirmText !== "RESET") return;
    if (!profile?.storeId || !user) return;

    const toastId = toast.loading("Performing factory reset...");
    
    try {
      // 1. Purge all operational data
      const collectionsToPurge = ["items", "categories", "sales", "movements", "expenses", "customers", "purchaseOrders", "requests", "refunds", "notifications"];
      for (const colName of collectionsToPurge) {
        const q = query(collection(db, colName), where("storeId", "==", profile.storeId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }

      // 2. Clear all staff
      const userQ = query(collection(db, "users"), where("storeId", "==", profile.storeId));
      const userSnap = await getDocs(userQ);
      const userBatch = writeBatch(db);
      userSnap.docs.forEach(d => {
        if (d.id !== user.uid) {
          userBatch.delete(d.ref);
          userBatch.delete(doc(db, "admins", d.id));
        }
      });
      await userBatch.commit();

      // 3. Reset store and profile onboarding
      const storeRef = doc(db, "stores", profile.storeId);
      const profileRef = doc(db, "users", user.uid);
      const resetBatch = writeBatch(db);
      resetBatch.update(storeRef, { isOnboarded: false, updatedAt: new Date().toISOString() });
      resetBatch.update(profileRef, { onboardingCompleted: false, updatedAt: new Date().toISOString() });
      await resetBatch.commit();

      toast.success("Factory reset complete. Redirecting to onboarding...", { id: toastId });
      setConfirmPurgeOpen(false);
      setPurgeConfirmText("");
      window.location.reload(); // Refresh to trigger onboarding guards
    } catch (error) {
      console.error("Factory reset failed:", error);
      toast.error("Failed to complete full reset.", { id: toastId });
    }
  };

  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const handlePurgeData = async () => {
    if (purgeConfirmText !== "PURGE") return;
    if (!profile?.storeId) {
      toast.error("No store identified for purge.");
      return;
    }

    const toastId = toast.loading("Purging live data...");
    
    try {
      const collectionsToPurge = ["items", "categories", "sales", "movements", "expenses", "customers", "purchaseOrders", "requests", "refunds", "notifications"];
      
      for (const colName of collectionsToPurge) {
        const q = query(collection(db, colName), where("storeId", "==", profile.storeId));
        const snap = await getDocs(q);
        
        if (snap.empty) continue;
        
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      toast.success("All store data has been purged.", { id: toastId });
      setConfirmPurgeOpen(false);
      setPurgeConfirmText("");
    } catch (error) {
      console.error("Purge failed:", error);
      toast.error("Failed to purge some data. Please try again.", { id: toastId });
    }
  };

  const handleGoLive = async () => {
    if (!user) {
      toast.error("Please sign in to access live features.");
      navigate({ to: "/" });
      return;
    }
    exitDemoMode();
    toast.success("Switched to Live Mode. Using Firestore for all activities.");
  };

  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Card className={cn(user && !isDemo && "border-green-500/50 bg-green-50/5 dark:bg-green-500/5")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Backend Connection
          </CardTitle>
          <CardDescription>
            Switch between local demo mode and real-time Firebase backend.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">Backend Status</p>
              <div className="flex items-center gap-1.5 pt-1">
                {isDemo ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Local Demo Mode</Badge>
                ) : (
                  <Badge className="bg-green-500 text-white border-none gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Live (Firestore)
                  </Badge>
                )}
              </div>
            </div>
            
            {isDemo ? (
              <Button onClick={handleGoLive} className="gap-2">
                <LogIn className="h-4 w-4" /> Go Live
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => toast.info("Already in live mode")} className="gap-2">
                   Live Connected
                </Button>
              </div>
            )}
          </div>

          {user && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {user.displayName?.[0] || user.email?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold">{user.displayName || user.email}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{profile?.role || "Staff"}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5">
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Demo data</CardTitle>
          <CardDescription>Manage demo seed data for testing and exploration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDemo ? (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-2xl font-semibold text-foreground">{items}</p>
                  <p className="text-xs text-muted-foreground">Items</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-2xl font-semibold text-foreground">{suppliers}</p>
                  <p className="text-xs text-muted-foreground">Suppliers</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-2xl font-semibold text-foreground">{locations}</p>
                  <p className="text-xs text-muted-foreground">Locations</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setWalkthroughActive(true)} className="gap-1.5">
                  <Play className="h-4 w-4" /> Start walkthrough
                </Button>
                <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Reset demo data
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Demo controls not available — enter demo mode first.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><Info className="h-4 w-4" />About</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Version</dt><dd className="font-medium">1.0.0</dd>
            <dt className="text-muted-foreground">Platform</dt><dd className="font-medium">Stackwise Inventory</dd>
          </dl>
        </CardContent>
      </Card>

      {isAdmin && !isDemo && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <RotateCcw className="h-5 w-5" /> Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions for system administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/10">
                <h4 className="text-sm font-bold text-destructive mb-1">Purge Store Data</h4>
                <p className="text-xs text-destructive/80 mb-4">
                  This will delete all items, categories, sales, movements, and expenses associated with your store.
                  Your user account and store settings will be preserved.
                </p>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setConfirmPurgeOpen(true)}
                  className="w-full sm:w-auto"
                >
                  Confirm Full Purge
                </Button>
              </div>

              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/10">
                <h4 className="text-sm font-bold text-destructive mb-1">Clear Staff / Users</h4>
                <p className="text-xs text-destructive/80 mb-4">
                  Delete all other user profiles associated with this store. This will not affect your own account.
                </p>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setConfirmPurgeUsersOpen(true)}
                  className="w-full sm:w-auto"
                >
                  Clear All Staff
                </Button>
              </div>

              <div className="p-4 rounded-lg border-red-600/30 bg-red-600/5">
                <h4 className="text-sm font-bold text-red-600 mb-1 flex items-center gap-2">
                  Full Factory Reset
                  <Badge variant="outline" className="text-[9px] uppercase h-4 px-1.5 border-red-600/30 text-red-600">Nuclear</Badge>
                </h4>
                <p className="text-xs text-red-600/80 mb-4">
                  Wipes EVERYTHING except your login (Users, Store Settings, All Inventory, Sales). 
                  Used to restart the app from scratch.
                </p>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setConfirmResetOpen(true)}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                >
                  Factory Reset System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive font-black uppercase flex items-center gap-2">
              <RotateCcw className="h-5 w-5" /> Nuclear Reset
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL data associated with your store. 
              Staff will be removed, and the store will be reset to an un-onboarded state. 
              Type <span className="font-bold font-mono uppercase bg-muted px-1">RESET</span> to confirm.
            </AlertDialogDescription>
            <Input 
              value={resetConfirmText} 
              onChange={e => setResetConfirmText(e.target.value)} 
              placeholder="Type RESET here"
              className="mt-4"
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetConfirmText("")}>Cancel</AlertDialogCancel>
            <Button 
              variant="destructive" 
              onClick={() => {
                // Reuse the handleFactoryReset logic but with its own text state check
                if (resetConfirmText === "RESET") {
                  // We need to pass the "nuclear" intent
                  setPurgeConfirmText("RESET");
                  handleFactoryReset();
                }
              }}
              disabled={resetConfirmText !== "RESET"}
            >
              Factory Reset
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Demo Data?</AlertDialogTitle>
            <AlertDialogDescription>This will reset all data to defaults. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPurgeOpen} onOpenChange={setConfirmPurgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete all records (items, sales, etc.) for this store from the live database. 
              This action is irreversible. Type <span className="font-bold font-mono uppercase bg-muted px-1">PURGE</span> to confirm.
            </AlertDialogDescription>
            <Input 
              value={purgeConfirmText} 
              onChange={e => setPurgeConfirmText(e.target.value)} 
              placeholder="Type PURGE here"
              className="mt-4"
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPurgeConfirmText("")}>Cancel</AlertDialogCancel>
            <Button 
              variant="destructive" 
              onClick={handlePurgeData}
              disabled={purgeConfirmText !== "PURGE"}
            >
              Purge Live Data
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPurgeUsersOpen} onOpenChange={setConfirmPurgeUsersOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Remove all staff profiles?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all other user records for this store. They will lose access to the system immediately.
              Type <span className="font-bold font-mono uppercase bg-muted px-1">DELETE</span> to confirm.
            </AlertDialogDescription>
            <Input 
              value={purgeUsersConfirmText} 
              onChange={e => setPurgeUsersConfirmText(e.target.value)} 
              placeholder="Type DELETE here"
              className="mt-4"
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPurgeUsersConfirmText("")}>Cancel</AlertDialogCancel>
            <Button 
              variant="destructive" 
              onClick={handlePurgeUsers}
              disabled={purgeUsersConfirmText !== "DELETE"}
            >
              Confirm Deletion
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DemoWalkthrough active={walkthroughActive} onClose={() => setWalkthroughActive(false)} />
    </div>
  );
}
