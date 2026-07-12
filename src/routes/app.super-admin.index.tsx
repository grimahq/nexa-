import { createFileRoute } from "@tanstack/react-router";
import { useSuperAdminContext } from "./app.super-admin";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, CheckCircle2, Info, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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
                </tr>
              </thead>
              <tbody className="divide-y divide-muted-foreground/10">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
