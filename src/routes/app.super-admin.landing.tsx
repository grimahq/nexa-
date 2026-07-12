import { createFileRoute } from "@tanstack/react-router";
import { useSuperAdminContext, INITIAL_STORES, INITIAL_USERS, INITIAL_LOGS, INITIAL_WHATSAPP } from "./app.super-admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database, AlertTriangle, RefreshCw, FileDown } from "lucide-react";

export const Route = createFileRoute("/app/super-admin/landing")({
  component: SuperAdminLanding,
});

function SuperAdminLanding() {
  const {
    setSuperStores,
    setSuperUsers,
    setLogs,
    setWhatsapp,
    handleDownloadBackup,
  } = useSuperAdminContext();

  // Reset Enterprise Sandbox
  const handleResetEnterpriseData = () => {
    const doubleConfirm = window.confirm(
      "CRITICAL SECURITY RESET:\n\nThis will completely purge all custom branches, multi-tenant profiles, and audit log files inside the sandbox and restore default initial seed structures.\n\nAre you absolutely sure you want to proceed?"
    );

    if (!doubleConfirm) return;

    setSuperStores(INITIAL_STORES);
    setSuperUsers(INITIAL_USERS);
    setLogs([
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: "Executed master system reset to seed factories.",
        store: "System-wide",
        status: "warning",
      },
      ...INITIAL_LOGS,
    ]);
    setWhatsapp(INITIAL_WHATSAPP);

    toast.success("Master enterprise sandbox re-seeded successfully!");
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Backup and export Card */}
      <Card className="shadow-none border border-muted-foreground/10 flex flex-col justify-between">
        <div>
          <CardHeader>
            <CardTitle className="text-lg font-bold font-sans flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-500" /> Enterprise Backups
            </CardTitle>
            <CardDescription>Generate a point-in-time snapshot of the entire multi-tenant configuration database schema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground">
            <p>
              Snapshots compile the following schemas into a single consolidated, encrypted JSON schema:
            </p>
            <ul className="list-disc pl-5 space-y-1 font-sans">
              <li>Complete listing of all registered location branches & sectors.</li>
              <li>Encrypted profile matrices for all credentialed staff roles.</li>
              <li>WhatsApp API settings, webhooks, and active communication patterns.</li>
              <li>The complete chronological history of recent system event logs.</li>
            </ul>
            <p>
              Backups can be stored locally and imported manually into any backup node instance.
            </p>
          </CardContent>
        </div>
        <CardFooter className="pt-4 border-t border-muted-foreground/10 flex justify-between items-center bg-muted/25 p-5">
          <span className="text-[10px] text-muted-foreground font-medium">Backup format: JSON, UTF-8</span>
          <Button onClick={handleDownloadBackup} className="text-xs h-9 font-bold bg-primary hover:bg-primary/95 text-white gap-1.5 shadow-sm">
            <FileDown className="h-3.5 w-3.5" /> Generate Backup Snapshot
          </Button>
        </CardFooter>
      </Card>

      {/* Dangerous/sandbox control reset */}
      <Card className="shadow-none border border-red-500/20 bg-red-500/5 flex flex-col justify-between">
        <div>
          <CardHeader>
            <CardTitle className="text-lg font-bold font-sans text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Master Sandbox Controls
            </CardTitle>
            <CardDescription className="text-red-500/70">Destructive master purge controls restricted to root level only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-relaxed text-red-700/80">
            <p className="font-sans font-medium">
              Executing a system reset will:
            </p>
            <ul className="list-disc pl-5 space-y-1 font-sans">
              <li>Purge all custom stores added during this session.</li>
              <li>Purge all newly registered multi-tenant users and roles.</li>
              <li>Reset WhatsApp API Hub back to system-wide default webhooks.</li>
              <li>Chronologically wipe and re-seed the system logs history list.</li>
            </ul>
            <p className="font-semibold mt-2">
              ⚠️ WARNING: This operation is irreversible. All un-exported active session configurations will be permanently lost.
            </p>
          </CardContent>
        </div>
        <CardFooter className="pt-4 border-t border-red-500/10 flex justify-between items-center bg-red-500/10 p-5">
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-bold uppercase select-none">
            Root Admin Only
          </Badge>
          <Button onClick={handleResetEnterpriseData} variant="destructive" className="text-xs h-9 font-bold gap-1.5 shadow-sm bg-red-600 hover:bg-red-700 text-white">
            <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" /> Re-Seed Sandbox Data
          </Button>
        </CardFooter>
      </Card>

      {/* Database Diagnostic and GCP Storage */}
      <Card className="shadow-none border border-muted-foreground/10 md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-bold font-sans">Database Connectivity Diagnostics</CardTitle>
          <CardDescription>Live telemetry on database clusters, replica streams and GCP backups status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 text-xs">
            <div className="p-3 border rounded-lg space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Firestore Sync state</span>
              <div className="flex items-center gap-1.5 text-emerald-500 font-semibold font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> ONLINE & SYNCHRONIZED
              </div>
            </div>
            <div className="p-3 border rounded-lg space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Write Throughput Ratio</span>
              <div className="text-foreground font-mono font-medium">0.04 ms/op (optimal)</div>
            </div>
            <div className="p-3 border rounded-lg space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Auto-GCP Backups (Daily)</span>
              <div className="text-emerald-500 font-mono font-semibold">SCHEDULED & VERIFIED</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
