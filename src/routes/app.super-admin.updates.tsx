import { createFileRoute } from "@tanstack/react-router";
import { useSuperAdminContext } from "./app.super-admin";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageSquare, Smartphone, Info, ExternalLink, ShieldAlert, Lock, Unlock, Radio } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { useDemo } from "@/hooks/useDemo";
import { useCreateNotification } from "@/hooks/useInventoryMutations";

export const Route = createFileRoute("/app/super-admin/updates")({
  component: SuperAdminUpdates,
});

function SuperAdminUpdates() {
  const { whatsapp, setWhatsapp, setLogs } = useSuperAdminContext();
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const { mutate: createNotification } = useCreateNotification();

  // Feature Locks State
  const [lockedFeatures, setLockedFeatures] = useState<string[]>([]);

  // Synchronize Feature Locks
  useEffect(() => {
    if (isDemo) {
      const sync = () => {
        try {
          const stored = localStorage.getItem("stackwise_locked_features");
          setLockedFeatures(stored ? JSON.parse(stored) : []);
        } catch {
          setLockedFeatures([]);
        }
      };
      sync();
      const interval = setInterval(sync, 1200);
      return () => clearInterval(interval);
    } else {
      const unsub = onSnapshot(doc(db, "settings", "feature_locks"), (snap) => {
        if (snap.exists()) {
          setLockedFeatures(snap.data().features || []);
        } else {
          setLockedFeatures([]);
        }
      }, () => {
        setLockedFeatures([]);
      });
      return unsub;
    }
  }, [isDemo]);

  // Toggle Feature Lock Handler
  const toggleFeatureLock = async (featureId: string, label: string) => {
    const isCurrentlyLocked = lockedFeatures.includes(featureId);
    const nextLocked = isCurrentlyLocked
      ? lockedFeatures.filter(f => f !== featureId)
      : [...lockedFeatures, featureId];

    try {
      // 1. Update Storage
      if (isDemo) {
        localStorage.setItem("stackwise_locked_features", JSON.stringify(nextLocked));
        setLockedFeatures(nextLocked);
      } else {
        await setDoc(doc(db, "settings", "feature_locks"), { features: nextLocked });
      }

      // 2. Dispatch Push Notification
      const notifId = `notif-${Date.now()}`;
      const notif = {
        id: notifId,
        type: (isCurrentlyLocked ? "request_update" : "po_update") as "request_update" | "po_update",
        title: isCurrentlyLocked ? `✅ Feature Unlocked: ${label}` : `🚨 Feature Locked: ${label}`,
        message: isCurrentlyLocked
          ? `The Super Administrator has restored access to the ${label} module. Normal branch operations have resumed.`
          : `The Super Administrator has temporarily locked the ${label} module for compliance and control operations.`,
        isRead: false,
        read: false,
        createdAt: new Date().toISOString()
      };

      if (isDemo && demoStore) {
        demoStore.addNotification(notif);
        bumpVersion();
      } else {
        createNotification(notif);
      }

      toast.success(isCurrentlyLocked ? `${label} unlocked successfully` : `${label} locked successfully`);
    } catch (err) {
      console.error("Failed to toggle feature lock:", err);
      toast.error("Failed to update feature control.");
    }
  };

  // Test Dispatch form states
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("This is an authorized test dispatch from Stackwise System Root.");

  const handleToggleReceipts = async () => {
    const nextVal = !whatsapp.enabledReceipts;
    try {
      await setDoc(doc(db, "settings", "whatsapp"), { ...whatsapp, enabledReceipts: nextVal }, { merge: true });
      toast.success(`WhatsApp POS receipt notifications ${nextVal ? 'enabled' : 'disabled'}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save setting");
    }
  };

  const handleToggleAlerts = async () => {
    const nextVal = !whatsapp.enabledAlerts;
    try {
      await setDoc(doc(db, "settings", "whatsapp"), { ...whatsapp, enabledAlerts: nextVal }, { merge: true });
      toast.success(`WhatsApp reorder stock alert notifications ${nextVal ? 'enabled' : 'disabled'}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save setting");
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "settings", "whatsapp"), whatsapp, { merge: true });
      
      const newLogId = `log-${Date.now()}`;
      await setDoc(doc(db, "system_logs", newLogId), {
        id: newLogId,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Re-configured WhatsApp Webhook gateway to "${whatsapp.webhookUrl}"`,
        store: "System-wide",
        status: "success",
      });
      
      toast.success("WhatsApp API Hub configurations saved!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save config to database.");
    }
  };

  const handleDispatchTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) {
      toast.error("Please enter a destination phone number.");
      return;
    }

    const cleanNum = testPhone.replace(/\D/g, '');
    const apiLink = getWhatsAppUrl(cleanNum, testMsg);

    try {
      const newLogId = `log-${Date.now()}`;
      await setDoc(doc(db, "system_logs", newLogId), {
        id: newLogId,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Fired WhatsApp Dispatcher payload to target: +${cleanNum}`,
        store: "System-wide",
        status: "info",
      });

      toast.success("Constructing WhatsApp dispatch link...");
      window.open(apiLink, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error(err);
      toast.error("Failed to log dispatch test.");
    }
  };

  const systemFeatures = [
    { id: "sales", label: "Sales POS & Checkout Terminal", desc: "Front-desk sales register, customer receipt dispatch, and credit-checkout transactions." },
    { id: "returns", label: "Returns & Refunds Manager", desc: "Item returns logging, damage tracking, and credit/refund balance payouts." },
    { id: "catalog", label: "Catalog & Item Configuration", desc: "Adding products, stock warning levels, and direct price adjustments." },
    { id: "movements", label: "Inventory Movements & Auditing", desc: "Received warehouse cargo log, stock transfer checks, and adjustments ledger." },
    { id: "expenses", label: "Operational Outflows Ledger", desc: "Logging daily store expenses, custom outflow categories, and cash summaries." },
    { id: "ecommerce", label: "Digital E-Commerce Storefront", desc: "Active storefront catalog, shopping carts, and incoming online consumer orders." },
    { id: "ai_insights", label: "AI Copilot & Smart Insights", desc: "Natural language query bar, intelligent reorder predictions, and reports generation." }
  ];

  return (
    <div className="space-y-6">
      {/* Feature Security Locking Desk */}
      <Card className="shadow-none border border-muted-foreground/10">
        <CardHeader className="bg-muted/15 border-b border-muted-foreground/10 pb-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold font-sans flex items-center gap-2">
                <ShieldAlert className="h-5.5 w-5.5 text-red-500 animate-pulse" /> Core System Feature Locks
              </CardTitle>
              <CardDescription className="text-xs max-w-2xl">
                Block access to core modules across all branch environments in real-time. Activating a lock instantly renders the module unavailable to users, and dispatches an advanced in-app push notification system-wide.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-center bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg border border-red-500/20 text-xs font-semibold uppercase font-sans tracking-wide">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> Root Live Control
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-muted-foreground/10">
          {systemFeatures.map((feature) => {
            const isLocked = lockedFeatures.includes(feature.id);
            return (
              <div key={feature.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-all">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground font-sans">{feature.label}</span>
                    {isLocked ? (
                      <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/20 font-bold border-red-500/10 text-[10px] uppercase py-0.5 tracking-wider">
                        Locked
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 font-bold border-emerald-500/10 text-[10px] uppercase py-0.5 tracking-wider">
                        Operational
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>

                <div className="flex items-center gap-3">
                  {isLocked ? (
                    <Button
                      onClick={() => toggleFeatureLock(feature.id, feature.label)}
                      variant="outline"
                      size="sm"
                      className="text-xs font-bold border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 h-9 gap-1.5 shadow-sm"
                    >
                      <Unlock className="h-3.5 w-3.5" /> Unlock Feature
                    </Button>
                  ) : (
                    <Button
                      onClick={() => toggleFeatureLock(feature.id, feature.label)}
                      variant="destructive"
                      size="sm"
                      className="text-xs font-bold bg-red-600 hover:bg-red-700 text-white h-9 gap-1.5 shadow-sm"
                    >
                      <Lock className="h-3.5 w-3.5" /> Lock & Notify
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
      {/* Settings configuration Card */}
      <Card className="shadow-none border border-muted-foreground/10">
        <form onSubmit={handleSaveConfig}>
          <CardHeader>
            <CardTitle className="text-lg font-bold font-sans flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-500" /> WhatsApp API Hub Config
            </CardTitle>
            <CardDescription>Setup notification templates, webhooks and toggles for automated dispatch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-muted-foreground/10 rounded-lg hover:bg-muted/10 transition-all">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold block">POS Sales Receipts</span>
                <span className="text-[10px] text-muted-foreground block">Dispatch transaction receipts instantly after checkout.</span>
              </div>
              <button type="button" onClick={handleToggleReceipts} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${whatsapp.enabledReceipts ? 'bg-emerald-500' : 'bg-muted'}`}>
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${whatsapp.enabledReceipts ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 border border-muted-foreground/10 rounded-lg hover:bg-muted/10 transition-all">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold block">Automatic Reorder Warnings</span>
                <span className="text-[10px] text-muted-foreground block">Ping warehouse contacts when inventory crosses low threshold.</span>
              </div>
              <button type="button" onClick={handleToggleAlerts} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${whatsapp.enabledAlerts ? 'bg-emerald-500' : 'bg-muted'}`}>
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${whatsapp.enabledAlerts ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="default-prefix" className="text-xs font-semibold">Standard Phone Code Prefix</Label>
              <Input id="default-prefix" value={whatsapp.defaultPrefix} onChange={e => setWhatsapp(prev => ({ ...prev, defaultPrefix: e.target.value }))} className="text-xs font-mono h-9" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="webhook-url" className="text-xs font-semibold">Webhook Gateway Endpoint</Label>
              <div className="flex items-center gap-2">
                <Input id="webhook-url" value={whatsapp.webhookUrl} onChange={e => setWhatsapp(prev => ({ ...prev, webhookUrl: e.target.value }))} className="text-xs font-mono h-9 flex-1" />
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-1.5 h-9 font-bold uppercase select-none">
                  ACTIVE
                </Badge>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="msg-template" className="text-xs font-semibold">Automatic Checkout Message Template</Label>
              <textarea id="msg-template" value={whatsapp.defaultTemplate} onChange={e => setWhatsapp(prev => ({ ...prev, defaultTemplate: e.target.value }))} className="w-full text-xs font-sans p-3 border border-input rounded-md bg-background focus:outline-none min-h-[80px]" />
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Info className="h-3 w-3" /> Supports handlebars tags: <code>{"{{"}customer_name{"}}"}</code>, <code>{"{{"}amount{"}}"}</code>, <code>{"{{"}store_name{"}}"}</code>
              </p>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button type="submit" className="text-xs h-9 font-semibold bg-primary hover:bg-primary/95 text-white w-full sm:w-auto">
              Save Hub Configuration
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Live dispatch test panel */}
      <Card className="shadow-none border border-muted-foreground/10 flex flex-col justify-between">
        <div>
          <CardHeader>
            <CardTitle className="text-lg font-bold font-sans flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-500" /> Webhook Payload Dispatcher
            </CardTitle>
            <CardDescription>Bypass automation and fire custom payloads directly to a WhatsApp terminal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="test-phone" className="text-xs font-semibold">Destination Phone Number</Label>
              <Input id="test-phone" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="e.g. 08123456789 or +234..." className="text-xs font-mono h-9" />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">Numbers will be sanitized and appended with the default prefix if needed.</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="test-message" className="text-xs font-semibold">Custom Test Dispatch Message</Label>
              <textarea id="test-message" value={testMsg} onChange={e => setTestMsg(e.target.value)} className="w-full text-xs p-3 border border-input rounded-md bg-background focus:outline-none min-h-[120px]" />
            </div>
          </CardContent>
        </div>
        <CardFooter className="pt-4 border-t border-muted-foreground/10 flex justify-between items-center bg-muted/25 p-5">
          <div className="text-[10px] text-muted-foreground max-w-[60%] font-medium">
            Opens standard WhatsApp click-to-chat web wrapper safely.
          </div>
          <Button onClick={handleDispatchTest} className="text-xs h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm">
            Test Dispatch <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </CardFooter>
      </Card>
      </div>
    </div>
  );
}
