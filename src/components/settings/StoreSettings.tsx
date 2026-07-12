import { useState, useEffect } from "react";
import { Store, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/hooks/useDemo";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function StoreSettings() {
  const { isDemo, onboarding: demoOnboarding, updateOnboarding, demoStore } = useDemo();
  const { settings: liveSettings, updateSettings } = useSystemSettings();
  const { flags } = useFeatureFlags();

  const activeSettings = isDemo ? demoOnboarding : liveSettings;

  const [storeName, setStoreName] = useState(activeSettings.storeName || "");
  const [phone, setPhone] = useState(activeSettings.storePhone || "");
  const [address, setAddress] = useState(activeSettings.storeAddress || "");
  const [receiptFooter, setReceiptFooter] = useState(activeSettings.receiptFooter || "");
  const [taxRate, setTaxRate] = useState(activeSettings.taxRate?.toString() || "0");
  const [moniepointKey, setMoniepointKey] = useState(activeSettings.moniepointKey || "");
  const [storeSlug, setStoreSlug] = useState(activeSettings.storeSlug || "");
  const [pricingMode, setPricingMode] = useState<"single" | "tiered">(activeSettings.pricingMode || "single");

  useEffect(() => {
    setStoreName(activeSettings.storeName || "");
    setPhone(activeSettings.storePhone || "");
    setAddress(activeSettings.storeAddress || "");
    setReceiptFooter(activeSettings.receiptFooter || "");
    setTaxRate(activeSettings.taxRate?.toString() || "0");
    setMoniepointKey(activeSettings.moniepointKey || "");
    setStoreSlug(activeSettings.storeSlug || "");
    setPricingMode(activeSettings.pricingMode || "single");
  }, [
    activeSettings.storeName,
    activeSettings.storePhone,
    activeSettings.storeAddress,
    activeSettings.receiptFooter,
    activeSettings.taxRate,
    activeSettings.moniepointKey,
    activeSettings.storeSlug,
    activeSettings.pricingMode
  ]);

  const handleSave = async () => {
    if (pricingMode === "tiered" && !flags.pricingMode) {
      toast.error(`Subscription Limit: Multi-tier pricing mode is gated. Please upgrade from your current ${flags.planName} to unlock premium billing tiers!`);
      return;
    }

    const oldPricingMode = activeSettings.pricingMode || "single";
    const data = {
      storeName: storeName.trim(),
      storePhone: phone.trim(),
      storeAddress: address.trim(),
      receiptFooter: receiptFooter.trim(),
      taxRate: parseFloat(taxRate) || 0,
      moniepointKey: moniepointKey.trim(),
      storeSlug: storeSlug.trim(),
      pricingMode: pricingMode,
    };

    try {
      if (isDemo) {
        updateOnboarding(data);
        if (oldPricingMode !== "tiered" && pricingMode === "tiered" && demoStore) {
          const items = demoStore.getItems();
          items.forEach(item => {
            if (!item.pricingTiers || !item.pricingTiers.retail) {
              demoStore.updateItem(item.id, {
                pricingTiers: {
                  ...(item.pricingTiers || {}),
                  retail: item.sellingPrice,
                  tierEnabled: true
                }
              });
            }
          });
          toast.success("Successfully migrated demo item prices to retail pricing tier");
        }
      } else {
        await updateSettings(data);
        if (oldPricingMode !== "tiered" && pricingMode === "tiered" && liveSettings) {
          const { collection, getDocs, query, where, writeBatch } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");
          
          const itemsRef = collection(db, "items");
          const q = query(itemsRef, where("storeId", "==", liveSettings.storeSlug || ""));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            let hasChanges = false;
            snapshot.docs.forEach((itemDoc) => {
              const itemData = itemDoc.data();
              if (!itemData.pricingTiers || !itemData.pricingTiers.retail) {
                const existingPrice = itemData.sellingPrice || 0;
                batch.update(itemDoc.ref, {
                  pricingTiers: {
                    ...(itemData.pricingTiers || {}),
                    retail: existingPrice,
                    tierEnabled: true
                  }
                });
                hasChanges = true;
              }
            });
            if (hasChanges) {
              await batch.commit();
              toast.success("Successfully migrated existing item prices to retail pricing tier");
            }
          }
        }
      }
      toast.success("Store settings saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Store className="h-4 w-4" />Store Information</CardTitle>
          <CardDescription>Your store details appear on receipts and invoices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="My Store" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-phone">Phone Number</Label>
              <Input id="store-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" className="font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-address">Address</Label>
            <Textarea id="store-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main Street, Lagos" rows={2} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tax-rate">Tax Rate (%)</Label>
              <Input id="tax-rate" type="number" min="0" max="100" step="0.5" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-footer">Receipt Footer Text</Label>
              <Input id="receipt-footer" value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} placeholder="Thank you for your patronage!" />
            </div>
          </div>

          <div className="space-y-2 max-w-md pt-2">
            <Label htmlFor="pricing-mode" className="flex items-center gap-1.5 font-semibold text-xs">
              Pricing Mode Settings
              {!flags.pricingMode && <span className="text-[10px] bg-sky-500/10 text-sky-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">🔒 PRO+</span>}
            </Label>
            <select
              id="pricing-mode"
              value={flags.pricingMode ? pricingMode : "single"}
              disabled={!flags.pricingMode}
              onChange={(e) => setPricingMode(e.target.value as "single" | "tiered")}
              className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <option value="single">Single Pricing Model (Standard)</option>
              {flags.pricingMode ? (
                <option value="tiered">Three-Tier Pricing Model (Retail, Wholesale, Distributor)</option>
              ) : (
                <option value="single" disabled>Three-Tier Pricing Model (🔒 Professional & Enterprise Only)</option>
              )}
            </select>
            {!flags.pricingMode ? (
              <p className="text-xs text-sky-600 font-medium flex items-center gap-1.5 mt-1 bg-sky-500/5 p-2 rounded-lg border border-sky-500/10">
                <ShieldAlert className="h-3.5 w-3.5" /> Gated: Tiered pricing is locked under your current {flags.planName}. Upgrade to Professional to unlock custom retail, wholesale, and distributor prices.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Enable this to configure Retail, Wholesale, and Distributor pricing on your products.
              </p>
            )}
          </div>

          <div className="space-y-6 pt-4 border-t border-border">
            <div className="space-y-2">
              <h3 className="text-sm font-bold">Online Storefront & Integration</h3>
              <p className="text-xs text-muted-foreground">Configure your public link and payment integrations.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="store-slug">Custom Store URL</Label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-muted border border-r-0 border-border rounded-l-md text-xs text-muted-foreground whitespace-nowrap">nexa.store/</span>
                  <Input 
                    id="store-slug" 
                    value={storeSlug} 
                    onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))} 
                    placeholder="adebayo-tech"
                    className="rounded-l-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="moniepoint-key">Moniepoint API Key</Label>
                <Input 
                  id="moniepoint-key" 
                  type="password" 
                  value={moniepointKey} 
                  onChange={(e) => setMoniepointKey(e.target.value)} 
                  placeholder="sk_live_..."
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} className="gap-1.5">
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
