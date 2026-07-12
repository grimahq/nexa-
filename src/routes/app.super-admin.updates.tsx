import { createFileRoute } from "@tanstack/react-router";
import { useSuperAdminContext } from "./app.super-admin";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MessageSquare, Smartphone, Info, ExternalLink } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/app/super-admin/updates")({
  component: SuperAdminUpdates,
});

function SuperAdminUpdates() {
  const { whatsapp, setWhatsapp, setLogs } = useSuperAdminContext();

  // Test Dispatch form states
  const [testPhone, setTestPhone] = useState("");
  const [testMsg, setTestMsg] = useState("This is an authorized test dispatch from Stackwise System Root.");

  const handleToggleReceipts = () => {
    setWhatsapp(prev => ({ ...prev, enabledReceipts: !prev.enabledReceipts }));
    toast.success(`WhatsApp POS receipt notifications ${!whatsapp.enabledReceipts ? 'enabled' : 'disabled'}`);
  };

  const handleToggleAlerts = () => {
    setWhatsapp(prev => ({ ...prev, enabledAlerts: !prev.enabledAlerts }));
    toast.success(`WhatsApp reorder stock alert notifications ${!whatsapp.enabledAlerts ? 'enabled' : 'disabled'}`);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Re-configured WhatsApp Webhook gateway to "${whatsapp.webhookUrl}"`,
        store: "System-wide",
        status: "success",
      },
      ...prev,
    ]);
    toast.success("WhatsApp API Hub configurations saved!");
  };

  const handleDispatchTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) {
      toast.error("Please enter a destination phone number.");
      return;
    }

    const cleanNum = testPhone.replace(/\D/g, '');
    const apiLink = getWhatsAppUrl(cleanNum, testMsg);

    setLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "nexatechnologies.dev@gmail.com",
        action: `Fired WhatsApp Dispatcher payload to target: +${cleanNum}`,
        store: "System-wide",
        status: "info",
      },
      ...prev,
    ]);

    toast.success("Constructing WhatsApp dispatch link...");
    window.open(apiLink, "_blank", "noopener,noreferrer");
  };

  return (
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
                <Info className="h-3 w-3" /> Supports handlebars tags: <code>{"{{customer_name}}"}</code>, <code>{"{{amount}}"}</code>, <code>{"{{store_name}}"}</code>
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
  );
}
