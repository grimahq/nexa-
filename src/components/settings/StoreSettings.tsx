import { useState, useEffect } from "react";
import { Store, Save, ShieldAlert, Mail, FileText, MapPin, Trash2, Plus, Building2, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/hooks/useDemo";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { collection, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLocations, useSales, useItems } from "@/hooks/useInventoryData";
import { useCreateLocation, useDeleteLocation } from "@/hooks/useInventoryMutations";
import { cn } from "@/lib/utils";

export function StoreSettings() {
  const { isDemo, onboarding: demoOnboarding, updateOnboarding, demoStore } = useDemo();
  const { settings: liveSettings, updateSettings } = useSystemSettings();
  const { flags } = useFeatureFlags();
  const { profile } = useAuth();

  const { data: sales } = useSales();
  const { data: items } = useItems();
  const { data: locations } = useLocations();

  const createLoc = useCreateLocation();
  const deleteLoc = useDeleteLocation();

  const activeSettings = isDemo ? demoOnboarding : liveSettings;

  const [storeName, setStoreName] = useState(activeSettings.storeName || "");
  const [phone, setPhone] = useState(activeSettings.storePhone || "");
  const [address, setAddress] = useState(activeSettings.storeAddress || "");
  const [storeDescription, setStoreDescription] = useState(activeSettings.storeDescription || "");
  const [receiptFooter, setReceiptFooter] = useState(activeSettings.receiptFooter || "");
  const [taxRate, setTaxRate] = useState(activeSettings.taxRate?.toString() || "0");
  const [moniepointKey, setMoniepointKey] = useState(activeSettings.moniepointKey || "");
  const [storeSlug, setStoreSlug] = useState(activeSettings.storeSlug || "");
  const [pricingMode, setPricingMode] = useState<"single" | "tiered">(activeSettings.pricingMode || "single");

  // New Storefront & Branch Management local state
  const [publicStorefrontEnabled, setPublicStorefrontEnabled] = useState<boolean>(
    (activeSettings as Record<string, unknown>).publicStorefrontEnabled as boolean || false
  );
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");

  const [reportFrequency, setReportFrequency] = useState<"daily" | "weekly" | "monthly" | "off">(
    activeSettings.reportPreferences?.frequency || "off"
  );
  const [recipientEmail, setRecipientEmail] = useState(
    activeSettings.reportPreferences?.recipientEmail || ""
  );

  useEffect(() => {
    setStoreName(activeSettings.storeName || "");
    setPhone(activeSettings.storePhone || "");
    setAddress(activeSettings.storeAddress || "");
    setStoreDescription(activeSettings.storeDescription || "");
    setReceiptFooter(activeSettings.receiptFooter || "");
    setTaxRate(activeSettings.taxRate?.toString() || "0");
    setMoniepointKey(activeSettings.moniepointKey || "");
    setStoreSlug(activeSettings.storeSlug || "");
    setPricingMode(activeSettings.pricingMode || "single");
    setReportFrequency(activeSettings.reportPreferences?.frequency || "off");
    setRecipientEmail(activeSettings.reportPreferences?.recipientEmail || "");
    setPublicStorefrontEnabled((activeSettings as Record<string, unknown>).publicStorefrontEnabled as boolean || false);
  }, [
    activeSettings.storeName,
    activeSettings.storePhone,
    activeSettings.storeAddress,
    activeSettings.storeDescription,
    activeSettings.receiptFooter,
    activeSettings.taxRate,
    activeSettings.moniepointKey,
    activeSettings.storeSlug,
    activeSettings.pricingMode,
    activeSettings.reportPreferences?.frequency,
    activeSettings.reportPreferences?.recipientEmail,
    (activeSettings as Record<string, unknown>).publicStorefrontEnabled
  ]);

  const totalRevenue = sales.reduce((sum, s) => sum + (s.totalNgn || 0), 0);
  const branches = locations.filter(l => l.parentId === null && l.type === "warehouse");

  const handleCopyUrl = () => {
    const storeIdStr = profile?.storeId || "demo-store";
    const url = `${window.location.origin}/?storeId=${storeIdStr}`;
    navigator.clipboard.writeText(url);
    toast.success("Store login link copied!");
  };

  const handleSaveStorefront = async () => {
    try {
      if (isDemo) {
        updateOnboarding({ ...activeSettings, publicStorefrontEnabled });
      } else {
        await updateSettings({ publicStorefrontEnabled });
      }
      toast.success("Storefront settings saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save storefront settings.");
    }
  };

  const handleAddBranch = () => {
    if (!branchName.trim()) {
      toast.error("Branch name is required");
      return;
    }
    const now = new Date().toISOString();
    createLoc.mutate({
      id: crypto.randomUUID(),
      name: branchName.trim(),
      type: "warehouse",
      parentId: null,
      description: "Store Branch",
      address: branchAddress.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }, {
      onSuccess: () => {
        toast.success(`Branch "${branchName.trim()}" added successfully!`);
        setBranchName("");
        setBranchAddress("");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to add branch.");
      }
    });
  };

  const handleDeleteBranch = (id: string, name: string) => {
    // Check if there are items or people assigned
    deleteLoc.mutate(id, {
      onSuccess: () => {
        toast.success(`Branch "${name}" deleted successfully!`);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to delete branch. Check if items are assigned first.");
      }
    });
  };

  const handleSave = async () => {
    if (pricingMode === "tiered" && !flags.pricingMode) {
      toast.error(`Subscription Limit: Multi-tier pricing mode is gated. Please upgrade from your current ${flags.planName} to unlock premium billing tiers!`);
      return;
    }

    if (reportFrequency === "daily" && flags.planId === "starter") {
      toast.error(`Subscription Limit: Daily PDF business reports are gated. Please upgrade from your current ${flags.planName} to unlock daily automated reporting!`);
      return;
    }

    const oldPricingMode = activeSettings.pricingMode || "single";
    const data = {
      storeName: storeName.trim(),
      storePhone: phone.trim(),
      storeAddress: address.trim(),
      storeDescription: storeDescription.trim(),
      receiptFooter: receiptFooter.trim(),
      taxRate: parseFloat(taxRate) || 0,
      moniepointKey: moniepointKey.trim(),
      storeSlug: storeSlug.trim(),
      pricingMode: pricingMode,
      reportPreferences: {
        frequency: reportFrequency,
        recipientEmail: recipientEmail.trim(),
        lastSentAt: activeSettings.reportPreferences?.lastSentAt || ""
      }
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
          const itemsRef = collection(db, "items");
          const q = query(itemsRef, where("storeId", "==", profile?.storeId || ""));
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
      {/* Performance Section */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Performance</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="bg-emerald-950/20 border-emerald-500/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Total Revenue</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-emerald-500">₦{totalRevenue.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-blue-950/20 border-blue-500/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Sales Recorded</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-blue-500">{sales.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-amber-950/20 border-amber-500/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Catalog Items</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-amber-500">{items.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Share Shop Login URL Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-foreground">
            <Building2 className="h-4 w-4 text-emerald-500" /> Shop Login URL
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-wide">
            Share this link with your staff to login directly to this store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 bg-muted/60 px-3 py-2 rounded-lg border text-sm font-mono flex items-center justify-between text-muted-foreground select-all truncate">
              <span>{window.location.origin}/?storeId={profile?.storeId || "demo-store"}</span>
            </div>
            <Button size="sm" onClick={handleCopyUrl} className="gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Copy className="h-3.5 w-3.5" /> Copy Link
            </Button>
          </div>
          <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mt-2">
            Staff access this URL to login directly to {storeName || "Unauthorised"}.
          </p>
        </CardContent>
      </Card>

      {/* Public Storefront Settings */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-foreground">
            <ExternalLink className="h-4 w-4 text-emerald-500" /> Public Storefront Settings
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-wide">
            Configure your store's public page and bank details for online orders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold">Enable Public Storefront</h4>
              <p className="text-xs text-muted-foreground">Make your store and active products viewable to the public.</p>
            </div>
            <button
              type="button"
              onClick={() => setPublicStorefrontEnabled(!publicStorefrontEnabled)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                publicStorefrontEnabled ? "bg-emerald-600" : "bg-input"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                  publicStorefrontEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <Button size="sm" onClick={handleSaveStorefront} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Save className="h-3.5 w-3.5" /> Save Storefront Settings
          </Button>
        </CardContent>
      </Card>

      {/* Branch Management */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-foreground">
            <Building2 className="h-4 w-4 text-emerald-500" /> Branch Management
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-wide">
            Define locations for your store staff and inventory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="branch-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Branch Name</Label>
              <Input
                id="branch-name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Lekki Phase 1"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branch-address" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location / Address</Label>
              <Input
                id="branch-address"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                placeholder="e.g. Plot 12, Lagos"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <Button size="sm" onClick={handleAddBranch} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4" /> Add Branch
          </Button>

          <div className="pt-4 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Existing Branches</h4>
            {branches.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/10 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">No branches defined yet.</span>
                <span className="text-xs text-muted-foreground mt-1">Add branches above to associate staff and inventory locations.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {branches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors shadow-2xs">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{b.name}</p>
                      {b.address && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-muted-foreground/60 shrink-0" /> {b.address}
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteBranch(b.id, b.name)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Store Information Card */}
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
          <div className="space-y-2">
            <Label htmlFor="store-description">Detailed Description of Store</Label>
            <Textarea id="store-description" value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} placeholder="Describe your store, specializing branches, trading hours, general notes..." rows={3} />
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

          <div className="space-y-6 pt-4 border-t border-border">
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-1.5"><FileText className="h-4 w-4 text-blue-500" />Automated PDF Business Reports</h3>
              <p className="text-xs text-muted-foreground">Receive regular branded email PDF summaries of your sales, stock, and business analytics.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="report-frequency" className="flex items-center gap-1">
                  Report Frequency
                  {flags.planId === "starter" && (
                    <span className="text-[10px] bg-sky-500/10 text-sky-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ml-1">🔒 PRO+ GATED DAILY</span>
                  )}
                </Label>
                <select
                  id="report-frequency"
                  value={reportFrequency}
                  onChange={(e) => setReportFrequency(e.target.value as "daily" | "weekly" | "monthly" | "off")}
                  className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="off">Disabled (No reports)</option>
                  <option value="monthly">Monthly Summary</option>
                  <option value="weekly">Weekly Summary</option>
                  <option value="daily font-semibold">Daily Summary (Professional / Enterprise)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recipient-email" className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> Recipient Email</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </div>
            </div>
            
            {flags.planId === "starter" && reportFrequency === "daily" && (
              <p className="text-xs text-sky-600 font-medium flex items-center gap-1.5 mt-1 bg-sky-500/5 p-3 rounded-lg border border-sky-500/10">
                <ShieldAlert className="h-4 w-4" /> <span><strong>Gated:</strong> Daily report frequency is a premium feature. Please upgrade your current Starter Plan to Professional or Enterprise to unlock daily automated reports.</span>
              </p>
            )}
            
            {reportFrequency !== "off" && (
              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border">
                ✨ Reports are generated automatically and sent from <strong>nexatechnologies.dev@gmail.com</strong> with your store branding at the top and a secure animated-GIF logo signature.
              </p>
            )}
          </div>

          <Button onClick={handleSave} className="gap-1.5">
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
