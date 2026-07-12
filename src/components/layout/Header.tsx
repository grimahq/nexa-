import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Plus, Menu, User, LogOut, Settings, ChevronDown, ScanBarcode, Store, ShieldCheck, WifiOff } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFirebaseOffline } from "@/lib/firebase";
import { Sidebar } from "./Sidebar";
import { QuickEntryMode } from "@/components/data/QuickEntryMode";
import { CommandPalette } from "@/components/command/CommandPalette";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useDemo } from "@/hooks/useDemo";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGate } from "@/hooks/usePermissions";

const ROLE_BADGE_STYLES: Record<string, string> = {
  admin: "bg-primary/15 text-primary border-primary/20",
  manager: "bg-secondary/15 text-secondary-foreground border-secondary/20",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
};

export function Header() {
  const isOffline = useFirebaseOffline();
  const [offlineInfoOpen, setOfflineInfoOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  
  const { exitDemoMode, isDemo } = useDemo();
  const { role, setDemoRole, stores, currentStoreId, setCurrentStoreId, isSuperAdmin } = useRole();
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const currentStore = stores.find(s => s.id === currentStoreId);

  const displayName = isDemo ? "Demo User" : (profile?.name || user?.displayName || user?.email?.split('@')[0] || "User");

  const handleExit = async () => {
    if (isDemo) {
      await navigate({ to: "/" });
      exitDemoMode();
    } else {
      await logout();
      navigate({ to: "/" });
    }
  };

  // CMD+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-card px-4 shadow-sm md:px-8">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <button data-tour="search" type="button" onClick={() => setPaletteOpen(true)} className="flex h-9 flex-1 items-center gap-2 rounded-md border border-input bg-white px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 md:max-w-sm">
        <Search className="h-4 w-4 shrink-0" />
        <span>Search…</span>
        <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs md:inline-block">⌘K</kbd>
      </button>

      <PermissionGate permission="log_movement">
        <Button size="icon" variant="outline" className="shrink-0" aria-label="Quick entry" onClick={() => setQuickEntryOpen(true)}>
          <ScanBarcode className="h-4 w-4" />
        </Button>
      </PermissionGate>

      <PermissionGate permission="create_item">
        <Button size="icon" variant="outline" className="shrink-0" aria-label="New item" onClick={() => navigate({ to: "/app/catalog", search: { newItem: "true" } })}>
          <Plus className="h-4 w-4" />
        </Button>
      </PermissionGate>

      <NotificationBell onClick={() => setNotifOpen(true)} />

      {isOffline && (
        <>
          <button
            type="button"
            onClick={() => setOfflineInfoOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/15 transition-all shadow-sm shrink-0"
          >
            <WifiOff className="h-3.5 w-3.5 animate-pulse" />
            <span className="hidden sm:inline font-sans">Sandbox Mode</span>
          </button>
          
          <Dialog open={offlineInfoOpen} onOpenChange={setOfflineInfoOpen}>
            <DialogContent className="max-w-md bg-card border border-border">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base font-semibold text-amber-600">
                  <WifiOff className="h-5 w-5" />
                  Local Sandbox Mode Active
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-3 pt-2 text-left text-sm text-muted-foreground">
                    <p>
                      <strong>Nexa OS</strong> detected that direct cloud connection is offline or restricted inside this layout. This is standard behavior within sandboxed preview frames.
                    </p>
                    <p>
                      All systems are fully operational in localized Demo mode. You can create, edit, change view states, and simulate full software capabilities safely.
                    </p>
                    <div className="bg-muted px-3 py-2.5 rounded text-xs space-y-1 border border-border">
                      <p className="font-semibold uppercase text-[10px] tracking-wider text-muted-foreground/85 mb-1">Available capabilities:</p>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground/90">
                        <li>Full local dummy/demo dataset simulation</li>
                        <li>Store management & transaction tracking</li>
                        <li>Smart dashboards, live charts & analytics</li>
                      </ul>
                    </div>
                    <p>
                      💡 <strong>Tip:</strong> Want real-time database connection? Just click the <strong>Open in New Tab</strong> button on the top-right toolbar.
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 hover:bg-muted transition-colors" aria-label="User menu">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="hidden text-sm font-medium md:inline-block">{displayName}</span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:inline-block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="flex items-center justify-between font-normal text-xs text-muted-foreground">
            {displayName}
            <Badge variant="outline" className={`ml-2 text-[10px] font-semibold uppercase ${
              isSuperAdmin 
                ? "bg-red-500/15 text-red-500 border-red-500/20" 
                : ROLE_BADGE_STYLES[role] || ""
            }`}>
              {isSuperAdmin ? "Super Admin" : ROLE_LABELS[role] || role}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {isDemo && (
            <>
              <DropdownMenuLabel className="font-normal text-[10px] text-muted-foreground py-1">Switch Role (Demo)</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setDemoRole("admin")} className={role === "admin" ? "bg-muted" : ""}>
                <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Admin
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDemoRole("manager")} className={role === "manager" ? "bg-muted" : ""}>
                <ShieldCheck className="mr-2 h-4 w-4 text-blue-500" /> Manager
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          <DropdownMenuLabel className="font-normal text-[10px] text-muted-foreground py-1">Select Store</DropdownMenuLabel>
          {stores.map(store => (
            <DropdownMenuItem 
              key={store.id} 
              onClick={() => setCurrentStoreId(store.id)}
              className={currentStoreId === store.id ? "bg-muted font-medium" : ""}
            >
              <Store className="mr-2 h-4 w-4" /> {store.name}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/app/settings" })}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExit}>
            <LogOut className="mr-2 h-4 w-4" />
            {isDemo ? "Exit demo" : "Log out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <QuickEntryMode open={quickEntryOpen} onOpenChange={setQuickEntryOpen} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <NotificationCenter open={notifOpen} onOpenChange={setNotifOpen} onOpenPrefs={() => { setNotifOpen(false); setTimeout(() => setPrefsOpen(true), 300); }} />
      <NotificationPreferences open={prefsOpen} onOpenChange={setPrefsOpen} />
      
    </header>
  );
}
