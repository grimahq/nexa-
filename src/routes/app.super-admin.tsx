import { createFileRoute, Link, useLocation, useNavigate, Outlet } from "@tanstack/react-router";
import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Shield,
  MessageSquare,
  Activity,
  Database,
  FileDown,
  Bot,
  CreditCard,
  QrCode,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/super-admin")({
  component: SuperAdminLayout,
});

export interface SuperStore {
  id: string;
  name: string;
  sector: "agriculture" | "pharmacy" | "restaurant" | "general";
  manager: string;
  managerEmail: string;
  itemCount: number;
  valuationNgn: number;
  healthScore: number;
  alerts: number;
  status: "active" | "maintenance" | "suspended";
}

export interface SuperUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "requestor";
  storeId: string;
  storeName: string;
  joinedDate: string;
  status: "active" | "inactive";
}

export interface WhatsAppConfig {
  enabledReceipts: boolean;
  enabledAlerts: boolean;
  defaultPrefix: string;
  defaultTemplate: string;
  webhookUrl: string;
  webhookStatus: "active" | "disconnected" | "error";
}

export interface SystemLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  store: string;
  status: "success" | "warning" | "info";
}

export const INITIAL_STORES: SuperStore[] = [
  { id: "store-1", name: "Main Warehouse", sector: "agriculture", manager: "Sarah Manager", managerEmail: "sarah@stackwise.io", itemCount: 12, valuationNgn: 1245600, healthScore: 94, alerts: 2, status: "active" },
  { id: "store-2", name: "Ikeja Branch", sector: "pharmacy", manager: "Mike Head", managerEmail: "mike@stackwise.io", itemCount: 8, valuationNgn: 850000, healthScore: 82, alerts: 1, status: "active" },
  { id: "store-3", name: "Lekki Outlet", sector: "restaurant", manager: "Emma Manager", managerEmail: "emma@stackwise.io", itemCount: 15, valuationNgn: 3540000, healthScore: 100, alerts: 0, status: "active" },
  { id: "store-4", name: "Abuja Distribution Hub", sector: "general", manager: "John Admin", managerEmail: "john@stackwise.io", itemCount: 5, valuationNgn: 485200, healthScore: 70, alerts: 4, status: "active" },
];

export const INITIAL_USERS: SuperUser[] = [
  { id: "user-01", name: "Alice Chen", email: "alice@stackwise.io", role: "admin", storeId: "store-1", storeName: "Main Warehouse", joinedDate: "2026-02-15", status: "active" },
  { id: "user-02", name: "Bob Martinez", email: "bob@stackwise.io", role: "admin", storeId: "store-2", storeName: "Ikeja Branch", joinedDate: "2026-03-01", status: "active" },
  { id: "user-03", name: "Sarah Manager", email: "sarah@stackwise.io", role: "manager", storeId: "store-1", storeName: "Main Warehouse", joinedDate: "2026-02-18", status: "active" },
  { id: "user-04", name: "Emma Manager", email: "emma@stackwise.io", role: "manager", storeId: "store-3", storeName: "Lekki Outlet", joinedDate: "2026-04-10", status: "active" },
  { id: "user-05", name: "Dave Requestor", email: "dave@stackwise.io", role: "requestor", storeId: "store-1", storeName: "Main Warehouse", joinedDate: "2026-02-20", status: "active" },
  { id: "user-06", name: "Mike Head", email: "mike@stackwise.io", role: "admin", storeId: "store-2", storeName: "Ikeja Branch", joinedDate: "2026-03-05", status: "active" },
  { id: "user-07", name: "John Admin", email: "john@stackwise.io", role: "admin", storeId: "store-4", storeName: "Abuja Distribution Hub", joinedDate: "2026-05-01", status: "active" },
];

export const INITIAL_LOGS: SystemLog[] = [
  { id: "log-1", timestamp: "2026-05-24T15:20:00Z", user: "Sarah Manager", action: "Authorized stock clearance: 50 units maize", store: "Main Warehouse", status: "success" },
  { id: "log-2", timestamp: "2026-05-24T15:10:00Z", user: "Mike Head", action: "Low stock alert triggered: Paracetamol", store: "Ikeja Branch", status: "warning" },
  { id: "log-3", timestamp: "2026-05-24T14:45:00Z", user: "Emma Manager", action: "Closed POS Register - Daily Cashout: ₦54,200", store: "Lekki Outlet", status: "success" },
  { id: "log-4", timestamp: "2026-05-24T13:30:00Z", user: "John Admin", action: "Supabase connection delay resolved", store: "Abuja Distribution Hub", status: "info" },
  { id: "log-5", timestamp: "2026-05-24T12:00:00Z", user: "Dave Requestor", action: "Submitted low-stock requisition: Fertilizers", store: "Main Warehouse", status: "success" },
];

export const INITIAL_WHATSAPP: WhatsAppConfig = {
  enabledReceipts: true,
  enabledAlerts: true,
  defaultPrefix: "+234",
  defaultTemplate: "Hello {{customer_name}}, thank you for your order of {{item_name}} totaling {{amount}} at {{store_name}}.",
  webhookUrl: "https://api.stackwise.io/whatsapp/webhook/v1",
  webhookStatus: "active",
};

export interface SuperAdminContextType {
  superStores: SuperStore[];
  setSuperStores: React.Dispatch<React.SetStateAction<SuperStore[]>>;
  superUsers: SuperUser[];
  setSuperUsers: React.Dispatch<React.SetStateAction<SuperUser[]>>;
  logs: SystemLog[];
  setLogs: React.Dispatch<React.SetStateAction<SystemLog[]>>;
  whatsapp: WhatsAppConfig;
  setWhatsapp: React.Dispatch<React.SetStateAction<WhatsAppConfig>>;
  currentStoreId: string;
  setCurrentStoreId: (id: string) => void;
  stores: { id: string; name: string; [key: string]: unknown }[];
  handleDownloadBackup: () => void;
}

export const SuperAdminContext = createContext<SuperAdminContextType | null>(null);

export function useSuperAdminContext() {
  const context = useContext(SuperAdminContext);
  if (!context) {
    throw new Error("useSuperAdminContext must be used within a SuperAdminProvider");
  }
  return context;
}

export function SuperAdminLayout() {
  const { isSuperAdmin, currentStoreId, stores, setCurrentStoreId } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  // Route security guard
  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error("Access denied. Super Admin privileges required.");
      navigate({ to: "/app/dashboard" });
    }
  }, [isSuperAdmin, navigate]);

  const [superStores, setSuperStores] = useState<SuperStore[]>(INITIAL_STORES);
  const [superUsers, setSuperUsers] = useState<SuperUser[]>(INITIAL_USERS);
  const [logs, setLogs] = useState<SystemLog[]>(INITIAL_LOGS);
  const [whatsapp, setWhatsapp] = useState<WhatsAppConfig>(INITIAL_WHATSAPP);

  // Derived system metrics
  const totalValuation = useMemo(() => superStores.reduce((sum, s) => sum + s.valuationNgn, 0), [superStores]);
  const averageHealth = useMemo(() => {
    if (superStores.length === 0) return 0;
    return Math.round(superStores.reduce((sum, s) => sum + s.healthScore, 0) / superStores.length);
  }, [superStores]);
  const totalAlerts = useMemo(() => superStores.reduce((sum, s) => sum + s.alerts, 0), [superStores]);

  const activeContextStore = useMemo(() => stores.find(s => s.id === currentStoreId), [stores, currentStoreId]);

  // Download DB Backup JSON
  const handleDownloadBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      creator: "nexatechnologies.dev@gmail.com",
      schemaVersion: "3.2.1-lisa",
      enterpriseData: {
        stores: superStores,
        users: superUsers,
        auditLogs: logs,
        connectedWhatsApp: whatsapp
      }
    };

    const strFile = JSON.stringify(backupData, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(strFile);
    
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataUri);
    downloadAnchor.setAttribute("download", `Enterprise_Consolidated_Backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    toast.success("Consolidated enterprise JSON backup generated & downloaded!");
  };

  if (!isSuperAdmin) return null;

  const tabs = [
    { label: "Dashboard", href: "/app/super-admin", icon: Activity },
    { label: "Store Branches", href: "/app/super-admin/stores", icon: Building2 },
    { label: "User Administration", href: "/app/super-admin/users", icon: Users },
    { label: "WhatsApp API Hub", href: "/app/super-admin/updates", icon: MessageSquare },
    { label: "AI Agents Hub", href: "/app/super-admin/agents", icon: Bot },
    { label: "Subscriptions", href: "/app/super-admin/subscriptions", icon: CreditCard },
    { label: "QR Attribution", href: "/app/super-admin/attribution", icon: QrCode },
    { label: "Backups & Maintenance", href: "/app/super-admin/landing", icon: Database },
  ];

  return (
    <SuperAdminContext.Provider
      value={{
        superStores,
        setSuperStores,
        superUsers,
        setSuperUsers,
        logs,
        setLogs,
        whatsapp,
        setWhatsapp,
        currentStoreId,
        setCurrentStoreId,
        stores,
        handleDownloadBackup,
      }}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground font-sans">Super Admin Panel</h1>
              <Badge variant="outline" className="bg-red-500/10 text-red-500 hover:bg-neutral-800 border-red-500/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                <Shield className="h-3 w-3" /> System Root
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Global management deck reserved for <code className="font-mono text-xs text-primary font-semibold">nexatechnologies.dev@gmail.com</code>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeContextStore && (
              <div className="text-right sm:block hidden mr-2">
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">Currently Impersonating Context:</span>
                <span className="text-xs font-bold text-emerald-500 block">{activeContextStore.name}</span>
              </div>
            )}
            <Button onClick={handleDownloadBackup} variant="outline" size="sm" className="h-9 gap-1.5 transition-all text-xs border-muted-foreground/20 hover:bg-secondary">
              <FileDown className="h-3.5 w-3.5" /> Export DB Backup
            </Button>
          </div>
        </div>

        {/* consolidated metrics cards */}
        <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
          <Card className="shadow-none border border-muted-foreground/10">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase">Net Enterprise Assets</span>
                <p className="text-2xl font-bold tracking-tight">₦{totalValuation.toLocaleString()}</p>
                <span className="text-[10px] text-emerald-500 font-bold block">Consolidated balance</span>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-xl">
                <Building2 className="h-5 w-5 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border border-muted-foreground/10">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase">Overall Branches</span>
                <p className="text-2xl font-bold tracking-tight">{superStores.length}</p>
                <span className="text-[10px] text-muted-foreground font-medium block">All multi-tenant storefronts</span>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-xl">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border border-muted-foreground/10">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase">Total System Staff</span>
                <p className="text-2xl font-bold tracking-tight">{superUsers.length}</p>
                <span className="text-[10px] text-muted-foreground block font-medium">Across all properties</span>
              </div>
              <div className="bg-yellow-500/10 p-3 rounded-xl">
                <Users className="h-5 w-5 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border border-muted-foreground/10">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium uppercase">System-wide Health</span>
                <p className="text-2xl font-bold tracking-tight">{averageHealth}%</p>
                <span className="text-[10px] text-amber-500 block font-bold">{totalAlerts} warning alerts pending</span>
              </div>
              <div className="bg-red-500/10 p-3 rounded-xl">
                <Activity className="h-5 w-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs links */}
        <div className="border-b flex items-center gap-1 overflow-x-auto scroller-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isTabActive = location.pathname === tab.href;
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap -mb-px flex items-center gap-2 transition-all ${
                  isTabActive
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Dynamic nested routing content */}
        <div>
          <Outlet />
        </div>
      </div>
    </SuperAdminContext.Provider>
  );
}
