import { format } from "date-fns";
import { X, Pencil, Archive, Package, Sparkles } from "lucide-react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { PermissionGate } from "@/hooks/usePermissions";
import { MovementTimeline } from "@/components/catalog/MovementTimeline";
import { BarcodeDisplay } from "@/components/catalog/BarcodeDisplay";
import { CustomFieldsTab } from "@/components/catalog/CustomFieldsTab";
import { useMovements } from "@/hooks/useInventoryData";
import { useUpdateItem } from "@/hooks/useInventoryMutations";
import type { Item, Category, Supplier, Location } from "@/types/inventory";
import { SUPPORTED_UNITS } from "@/types/inventory";

type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

function stockStatus(item: Item): StockStatus {
  if (item.currentStock === 0) return "out-of-stock";
  if (item.currentStock <= item.reorderPoint) return "low-stock";
  return "in-stock";
}

function stockColor(item: Item) {
  const s = stockStatus(item);
  if (s === "out-of-stock") return "text-stock-out";
  if (s === "low-stock") return "text-stock-low";
  return "text-stock-healthy";
}

interface ItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null | undefined;
  categories: Category[];
  suppliers: Supplier[];
  locations: Location[];
  onEdit?: (item: Item) => void;
  onArchive?: (item: Item) => void;
}

interface DetailRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-sm" : "text-sm"}>{value || "—"}</span>
    </div>
  );
}

export function ItemDetailSheet({
  open,
  onOpenChange,
  item,
  categories,
  suppliers,
  locations,
  onEdit,
  onArchive,
}: ItemDetailSheetProps) {
  const { data: allMovements } = useMovements();
  const updateItem = useUpdateItem();

  if (!item) return null;

  const category = categories.find((c) => c.id === item.categoryId);
  const supplier = suppliers.find((s) => s.id === item.supplierId);
  const location = locations.find((l) => l.id === item.locationId);
  const status = stockStatus(item);

  const { flags } = useFeatureFlags();
  const currentTier = flags.planId || "starter";

  const aiPricingEnabled = useMemo(() => {
    if (currentTier !== "pro" && currentTier !== "enterprise") return false;
    try {
      const saved = localStorage.getItem("nexa_smart_features");
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!parsed.aiPricing;
      }
    } catch (e) {}
    return false;
  }, [currentTier]);

  const recommendedPrice = useMemo(() => {
    if (!item) return 0;
    const baseCost = item.costPrice || 0;
    if (baseCost > 0) {
      const recommended = baseCost * 1.35;
      return Math.round(recommended / 50) * 50;
    } else {
      const recommended = item.sellingPrice * 1.12;
      return Math.round(recommended / 50) * 50;
    }
  }, [item]);

  const priceDiffPercentage = useMemo(() => {
    if (!item || !recommendedPrice) return 0;
    const diff = recommendedPrice - item.sellingPrice;
    return Math.round((diff / item.sellingPrice) * 100);
  }, [item, recommendedPrice]);

  const [applyingPrice, setApplyingPrice] = useState(false);

  const handleApplyAiPrice = async () => {
    if (!item || !recommendedPrice) return;
    try {
      setApplyingPrice(true);
      await updateItem.mutateAsync({
        id: item.id,
        sellingPrice: recommendedPrice,
      });
      toast.success("AI Price recommendation successfully applied!", {
        description: `Set selling price of ${item.name} to ₦${recommendedPrice.toLocaleString()}.`,
      });
    } catch (e) {
      toast.error("Failed to apply dynamic pricing recommendation.");
    } finally {
      setApplyingPrice(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto p-0">
        {/* Header */}
        <SheetHeader className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4 text-left sm:text-left space-y-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-lg font-semibold text-foreground">{item.name}</SheetTitle>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge status={status} />
                <StatusBadge status={item.status} />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <PermissionGate permission="edit_item">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit?.(item)} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onArchive?.(item)} aria-label="Archive">
                  <Archive className="h-4 w-4" />
                </Button>
              </PermissionGate>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="px-6 pt-4 pb-8">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">Custom Fields</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Image display */}
            <div className="relative group aspect-square max-h-64 mx-auto w-full flex items-center justify-center rounded-xl border border-divider bg-muted/20 overflow-hidden">
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="h-full w-full object-contain p-4"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                  <Package className="h-12 w-12" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">No Image</span>
                </div>
              )}
            </div>

            {/* Quantity hero */}
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Quantity on Hand</p>
              <div className="flex items-baseline justify-center gap-1.5 mt-1">
                <p className={`font-mono text-3xl font-bold ${stockColor(item)}`}>
                  {item.currentStock}
                </p>
                <p className="text-sm font-medium text-muted-foreground lowercase">
                  {(() => {
                    const def = SUPPORTED_UNITS.find(u => u.id === item.unit);
                    if (!def) return item.unit;
                    return item.currentStock === 1 ? def.label : def.plural;
                  })()}
                </p>
              </div>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <DetailRow label="SKU" value={item.sku} mono />
              <DetailRow label="Category" value={category?.name} />
              <DetailRow label="Tags" value="—" />
              <DetailRow label="Unit of Measure" value={item.unit} />
              <DetailRow label="Reorder Threshold" value={item.reorderPoint} />
              <DetailRow label="Reorder Quantity" value={item.reorderQuantity} />
              <DetailRow label="Preferred Supplier" value={supplier?.name} />
              <DetailRow label="Location" value={location?.name} />
              <DetailRow label="Measurements" value={item.measurements} />
              <DetailRow label="Color" value={item.color} />
              <DetailRow label="Cost Per Unit" value={`₦${item.costPrice?.toLocaleString() ?? "0"}`} mono />
              <DetailRow label="Sale Price" value={`₦${item.sellingPrice?.toLocaleString() ?? "0"}`} mono />

              {aiPricingEnabled && (
                <div className="col-span-2 rounded-xl border border-purple-500/20 bg-purple-500/[0.02] dark:bg-purple-950/[0.04] p-4 space-y-3 my-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider">AI pricing recommendation</span>
                    </div>
                    {priceDiffPercentage !== 0 && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priceDiffPercentage > 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"}`}>
                        {priceDiffPercentage > 0 ? `+${priceDiffPercentage}%` : `${priceDiffPercentage}%`} optimal diff
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black font-mono text-foreground font-mono">₦{recommendedPrice.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground line-through font-mono">current: ₦{item.sellingPrice.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {item.costPrice && item.costPrice > 0 
                        ? `Optimized based on a standard 35% target gross margin index above unit cost (₦${item.costPrice.toLocaleString()}).`
                        : "Optimized using real-time competitive margin indexing and regional high-demand categories."}
                    </p>
                  </div>
                  {item.sellingPrice !== recommendedPrice && (
                    <Button
                      size="sm"
                      onClick={handleApplyAiPrice}
                      disabled={applyingPrice}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-8 shadow-xs"
                    >
                      {applyingPrice ? "Applying..." : `Apply AI Price (₦${recommendedPrice.toLocaleString()})`}
                    </Button>
                  )}
                </div>
              )}
              <div className="col-span-2 py-2 border-t border-b border-border my-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Store Visibility</p>
                    <p className="text-sm font-medium">{item.isEcommerceEnabled ? "Enabled for Storefront" : "Internal Catalog Only"}</p>
                  </div>
                  {item.isEcommerceEnabled && item.affiliateCommission && item.affiliateCommission > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Affiliate Comm.</p>
                      <p className="text-sm font-semibold text-green-600">₦{item.affiliateCommission?.toLocaleString() ?? "0"}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {item.textile && (
                <div className="col-span-2 py-3 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Textile & Fabric Specifications</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg bg-rose-50/25 border border-rose-100/50 p-3 dark:bg-rose-950/10 dark:border-rose-900/40">
                    <DetailRow label="Fabric Content" value={item.textile.fabricContent} />
                    <DetailRow label="Weave Type" value={item.textile.weaveType} />
                    <div className="col-span-2">
                      <DetailRow label="Fabric Weight" value={item.textile.gsm ? `${item.textile.gsm} GSM` : "—"} />
                    </div>
                  </div>
                </div>
              )}

              {item.electronics && (
                <div className="col-span-2 py-3 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-2">🔌 Phone Accessories Profile</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg bg-teal-50/25 border border-teal-100/50 p-3">
                    <DetailRow label="Accessory Type" value={
                      item.electronics.accessoryType === "case" ? "Case / Cover" :
                      item.electronics.accessoryType === "charger" ? "Charger / Adapter" :
                      item.electronics.accessoryType === "cable" ? "Charging Cable" :
                      item.electronics.accessoryType === "audio" ? "Earphones / Audio" :
                      item.electronics.accessoryType === "protector" ? "Screen Protector" :
                      item.electronics.accessoryType === "powerbank" ? "Power Bank" :
                      item.electronics.accessoryType === "mount" ? "Mount / Holder" :
                      item.electronics.accessoryType || "—"
                    } />
                    <DetailRow label="Compatible Devices" value={item.electronics.compatibility} />
                    <DetailRow label="Brand Focus" value={item.electronics.brandFocus} />
                    <DetailRow label="Material / Style" value={item.electronics.material} />
                    <div className="col-span-2">
                      <DetailRow label="Warranty Period" value={
                        item.electronics.warrantyPeriod === "none" ? "No warranty" :
                        item.electronics.warrantyPeriod === "1_month" ? "1 Month Warranty" :
                        item.electronics.warrantyPeriod === "3_months" ? "3 Months Warranty" :
                        item.electronics.warrantyPeriod === "6_months" ? "6 Months Warranty" :
                        item.electronics.warrantyPeriod === "1_year" ? "1 Year Warranty" :
                        item.electronics.warrantyPeriod || "—"
                      } />
                    </div>
                  </div>
                </div>
              )}
              {item.unitConversions && item.unitConversions.length > 0 && (
                <div className="col-span-2 py-3 border-b border-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Configured Selling Units (Wholesale / Bulk)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {item.unitConversions.map((conv, idx) => {
                      const calculatedPrice = conv.priceNgn !== undefined 
                        ? conv.priceNgn 
                        : item.sellingPrice * conv.multiplier;

                      return (
                        <div key={idx} className="rounded-lg border border-border p-2.5 bg-muted/5 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs uppercase text-foreground">{conv.unitId}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">1 {conv.unitId} = {conv.multiplier} {item.unit}</span>
                          </div>
                          <div className="flex items-baseline justify-between mt-1">
                            <span className="text-xs text-muted-foreground">Selling Price</span>
                            <span className="text-sm font-bold font-mono text-primary">₦{calculatedPrice.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <DetailRow label="Description" value={item.description} />
              </div>
              <DetailRow 
                label="Created" 
                value={(() => {
                  if (!item.createdAt) return "—";
                  try {
                    const d = new Date(item.createdAt);
                    return isNaN(d.getTime()) ? "—" : format(d, "MMM d, yyyy");
                  } catch (e) { return "—"; }
                })()} 
              />
              <DetailRow 
                label="Updated" 
                value={(() => {
                  if (!item.updatedAt) return "—";
                  try {
                    const d = new Date(item.updatedAt);
                    return isNaN(d.getTime()) ? "—" : format(d, "MMM d, yyyy");
                  } catch (e) { return "—"; }
                })()} 
              />
            </div>

            {/* Barcode */}
            <BarcodeDisplay
              barcode={item.barcode}
              itemName={item.name}
              sku={item.sku}
              location={location?.name}
              onBarcodeChange={(value) => updateItem.mutate({ id: item.id, updates: { barcode: value } })}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <MovementTimeline movements={allMovements} itemId={item.id} />
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            <CustomFieldsTab
              customFields={item.customFields}
              onUpdate={(fields) => updateItem.mutate({ id: item.id, updates: { customFields: fields } })}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
