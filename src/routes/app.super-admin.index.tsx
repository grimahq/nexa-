import { createFileRoute } from "@tanstack/react-router";
import { useSuperAdminContext, SystemLog } from "./app.super-admin";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, CheckCircle2, Info, Search, Eye, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { toast } from "sonner";

export const Route = createFileRoute("/app/super-admin/")({
  component: SuperAdminIndex,
});

const SECTOR_COLORS: Record<string, string> = {
  agriculture: "#10b981", // emerald
  pharmacy: "#06b6d4", // cyan
  restaurant: "#f59e0b", // amber
  general: "#6366f1", // indigo
};

function SuperAdminIndex() {
  const { superStores, logs } = useSuperAdminContext();
  const [searchLog, setSearchLog] = useState("");

  // Log Details & Deletion Dialog state
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingLog, setViewingLog] = useState<SystemLog | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingLog, setDeletingLog] = useState<SystemLog | null>(null);

  const handleDeleteLog = async (log: SystemLog) => {
    try {
      await deleteDoc(doc(db, "system_logs", log.id));
      toast.success("Log record deleted successfully.");
      setIsDeleteOpen(false);
      setDeletingLog(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete the log record from database.");
    }
  };

  const chartData = useMemo(() => {
    return superStores.map(store => ({
      name: store.name,
      valuation: store.valuationNgn,
      sector: store.sector,
    }));
  }, [superStores]);

  const filteredLogs = useMemo(() => {
    return logs.filter(
      l =>
        l.action.toLowerCase().includes(searchLog.toLowerCase()) ||
        l.user.toLowerCase().includes(searchLog.toLowerCase()) ||
        l.store.toLowerCase().includes(searchLog.toLowerCase())
    );
  }, [logs, searchLog]);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Chart Panel */}
      <Card className="md:col-span-2 shadow-none border border-muted-foreground/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold font-sans">Financial Asset Spread</CardTitle>
          <CardDescription>Consolidated valuation of all live store branch inventories.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] mt-2">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No store data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number | string) => [`₦${Number(value).toLocaleString()}`, "Valuation"]}
                  contentStyle={{ background: "#1c1917", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", fontSize: "12px", color: "#fff" }}
                />
                <Bar dataKey="valuation" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SECTOR_COLORS[entry.sector] || "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tech info */}
      <Card className="shadow-none border border-muted-foreground/10">
        <CardHeader>
          <CardTitle className="text-lg font-bold font-sans">Instance Topology</CardTitle>
          <CardDescription>Infrastructure & cluster metadata diagnostics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Active Database Tenant</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-medium text-foreground">Firestore cluster</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Deployment Region</span>
            <p className="text-xs font-mono font-medium text-foreground mt-0.5">cloud-run (us-central1-docker)</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Host Node Runtime</span>
            <p className="text-xs font-mono font-medium text-foreground mt-0.5">Node.js v20.11.0 (Linux x64)</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">API Latency Gateway</span>
            <p className="text-xs font-mono font-medium text-emerald-500 mt-0.5">14ms (healthy)</p>
          </div>
          <div className="pt-2 border-t border-muted-foreground/10 text-[10px] text-muted-foreground">
            System time is synchronized with GCP NTP cluster pools.
          </div>
        </CardContent>
      </Card>

      {/* System events logs */}
      <Card className="md:col-span-3 shadow-none border border-muted-foreground/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-bold font-sans">System Events Feed</CardTitle>
            <CardDescription>Live audit-trail of cross-branch actions and alerts.</CardDescription>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Filter by actor, action or store..."
              className="pl-9 h-9 text-xs"
              value={searchLog}
              onChange={(e) => setSearchLog(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden border border-muted-foreground/10 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Store Context</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action Description</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted-foreground/10">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">
                      No matching log events found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 text-muted-foreground font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-3 font-semibold text-foreground">{log.store}</td>
                      <td className="p-3 font-mono text-muted-foreground">{log.user}</td>
                      <td className="p-3 font-sans text-foreground">{log.action}</td>
                      <td className="p-3">
                        {log.status === "success" && (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10 gap-1 flex items-center w-fit">
                            <CheckCircle2 className="h-3 w-3" /> SUCCESS
                          </Badge>
                        )}
                        {log.status === "warning" && (
                          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/10 gap-1 flex items-center w-fit">
                            <AlertTriangle className="h-3 w-3" /> ALERT
                          </Badge>
                        )}
                        {log.status === "info" && (
                          <Badge className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20 hover:bg-cyan-500/10 gap-1 flex items-center w-fit">
                            <Info className="h-3 w-3" /> INFO
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button onClick={() => { setViewingLog(log); setIsViewOpen(true); }} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-500" title="View log details">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button onClick={() => { setDeletingLog(log); setIsDeleteOpen(true); }} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" title="Delete log entry">
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* View Log Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans flex items-center gap-2 text-primary">
              <Info className="h-5 w-5 text-emerald-500" />
              System Event Payload
            </DialogTitle>
            <DialogDescription>
              Detailed security logging trail event parameters.
            </DialogDescription>
          </DialogHeader>
          {viewingLog && (
            <div className="space-y-4 text-xs py-2">
              <div className="grid grid-cols-2 gap-3 border border-muted-foreground/10 rounded-md p-3 bg-muted/20">
                <div className="col-span-2">
                  <span className="text-muted-foreground block font-medium">Action Performed</span>
                  <p className="font-semibold text-foreground text-sm leading-relaxed">{viewingLog.action}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Tenant Context</span>
                  <span className="font-semibold text-foreground">{viewingLog.store}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Security State</span>
                  <Badge className={`mt-0.5 font-bold text-[10px] uppercase ${
                    viewingLog.status === "success" ? "bg-emerald-500/10 text-emerald-500" :
                    viewingLog.status === "warning" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                  }`}>
                    {viewingLog.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Executed By</span>
                  <span className="font-semibold font-mono">{viewingLog.user}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Logging Timestamp</span>
                  <span className="font-semibold font-mono">{viewingLog.timestamp}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)} className="text-xs h-9">
                  Close Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Log Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans text-red-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Discard Event Record
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action is destructive and will remove this diagnostic entry permanently from the audit feed.
            </DialogDescription>
          </DialogHeader>
          {deletingLog && (
            <div className="space-y-4 text-xs py-2">
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-md text-red-500/90 font-medium">
                Are you absolutely sure you want to discard this log record: <br />
                <span className="font-bold font-mono">"{deletingLog.action}"</span>?
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className="text-xs h-9">
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={() => handleDeleteLog(deletingLog)}
                  className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  Discard Entry
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
