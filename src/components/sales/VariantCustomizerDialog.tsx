import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Check, Tag } from "lucide-react";
import type { Item } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useDemo } from "@/hooks/useDemo";
import { useUpdateItem } from "@/hooks/useInventoryMutations";
import { toast } from "sonner";

const NAIRA = "₦";

interface VariantCustomizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onAddConfigured: (itemId: string, qty: number, unitId: string, configString: string) => void;
}

export function VariantCustomizerDialog({
  open,
  onOpenChange,
  item,
  onAddConfigured,
}: VariantCustomizerDialogProps) {
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [qty, setQty] = useState(1);

  // Tiered pricing customizer states
  const [retailPrice, setRetailPrice] = useState<string>("");
  const [wholesalePrice, setWholesalePrice] = useState<string>("");
  const [distributorPrice, setDistributorPrice] = useState<string>("");
  const [showTiers, setShowTiers] = useState<boolean>(false);

  const { settings: liveSettings } = useSystemSettings();
  const { isDemo, onboarding: demoOnboarding } = useDemo();
  const activeSettings = isDemo ? demoOnboarding : liveSettings;
  const isTieredMode = activeSettings?.pricingMode === "tiered";
  const isPhoneAccessoriesSeller = activeSettings?.businessType === "electronics" && (
    activeSettings?.electronicsMainType === "accessories" ||
    !activeSettings?.categories?.includes("devices")
  );

  const updateItem = useUpdateItem();

  const colors = item?.color 
    ? item.color.split(",").map(c => c.trim()).filter(Boolean)
    : [];

  const sizes = item?.sizes
    ? item.sizes.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  useEffect(() => {
    if (item && open) {
      const colorsList = item.color 
        ? item.color.split(",").map(c => c.trim()).filter(Boolean)
        : [];
      const sizesList = item.sizes
        ? item.sizes.split(",").map(s => s.trim()).filter(Boolean)
        : [];

      setSelectedColor(colorsList[0] || "");
      setSelectedSize(sizesList[0] || "");
      setQty(1);

      setRetailPrice(item.pricingTiers?.retail?.toString() || item.sellingPrice.toString());
      setWholesalePrice(item.pricingTiers?.wholesale?.toString() || "");
      setDistributorPrice(item.pricingTiers?.distributor?.toString() || "");
      setShowTiers(false);
    }
  }, [item, open]);

  if (!item) return null;

  const handleAdd = async () => {
    if (isTieredMode) {
      const r = Number(retailPrice) || 0;
      const w = wholesalePrice ? Number(wholesalePrice) : null;
      const d = distributorPrice ? Number(distributorPrice) : null;

      if (w !== null && !isNaN(w) && r < w) {
        toast.warning("Retail price is lower than Wholesale price (Soft Warning).");
      }
      if (d !== null && !isNaN(d) && w !== null && !isNaN(w) && w < d) {
        toast.warning("Wholesale price is lower than Distributor price (Soft Warning).");
      }
      if (d !== null && !isNaN(d) && r < d) {
        toast.warning("Retail price is lower than Distributor price (Soft Warning).");
      }

      const pricingTiers = {
        retail: r,
        wholesale: w !== null && !isNaN(w) ? w : undefined,
        distributor: d !== null && !isNaN(d) ? d : undefined,
        tierEnabled: true,
      };

      try {
        await updateItem.mutate({
          id: item.id,
          updates: {
            sellingPrice: r,
            pricingTiers,
          }
        });
      } catch (err) {
        console.error("Failed to save pricing tiers on item:", err);
      }
    }

    const config = {
      color: selectedColor || undefined,
      size: selectedSize || undefined,
    };
    const configString = JSON.stringify(config);
    onAddConfigured(item.id, qty, item.unit, configString);
    onOpenChange(false);
  };

  const getVariantPrice = () => {
    if (item.fineTunedVariants) {
      const parts: string[] = [];
      if (colors.length > 0 && selectedColor) parts.push(selectedColor);
      if (sizes.length > 0 && selectedSize) parts.push(selectedSize);
      
      const key = parts.join(" - ");
      const match = item.fineTunedVariants[key];
      if (match && typeof match.price === "number") {
        return match.price;
      }
    }
    return isTieredMode ? (Number(retailPrice) || item.sellingPrice) : item.sellingPrice;
  };

  const currentBasePrice = getVariantPrice();
  const formattedPrice = (currentBasePrice * qty).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 text-primary">
            <Tag className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Configure Product
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Select variations for {item.name} to add to the cart.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Colors Selection */}
          {colors.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Select Color
              </span>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const isSelected = selectedColor === color;
                  // Try to determine dynamic background color for preview
                  const cssColor = color.toLowerCase();
                  return (
                    <button
                      key={color}
                      id={`variant-color-${color}`}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "relative flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm",
                        isSelected
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                          : "border-border bg-card text-foreground hover:bg-muted/50"
                      )}
                    >
                      <span 
                        className="h-3 w-3 rounded-full border border-black/10 shadow-inner" 
                        style={{ backgroundColor: cssColor }}
                      />
                      {color}
                      {isSelected && <Check className="h-3 w-3 ml-1 text-primary animate-in fade-in zoom-in-50 duration-200" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sizes Selection */}
          {sizes.length > 0 && (
            <div className="space-y-2">
               <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isPhoneAccessoriesSeller ? "Select Compatible Model" : "Select Size"}
               </span>
              <div className="flex flex-wrap gap-2">
                {sizes.map((sz) => {
                  const isSelected = selectedSize === sz;
                  return (
                    <button
                      key={sz}
                      id={`variant-size-${sz}`}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={cn(
                        "flex items-center justify-center rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-tight transition-all duration-200 active:scale-95 min-w-[3rem] shadow-sm",
                        isSelected
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30 font-extrabold"
                          : "border-border bg-card text-foreground hover:bg-muted/50"
                      )}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tiered Pricing Customizer */}
          {isTieredMode && (
            <div className="space-y-2 border-t border-dashed pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Product Prices
                </span>
                <button
                  type="button"
                  onClick={() => setShowTiers(!showTiers)}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  {showTiers ? "Hide Tiers" : "Add pricing tiers"}
                </button>
              </div>

              {!showTiers ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Retail Price (₦)</label>
                  <input
                    type="number"
                    value={retailPrice}
                    onChange={(e) => setRetailPrice(e.target.value)}
                    className="w-full h-9 bg-card text-xs font-bold font-mono rounded-xl border border-border px-3 focus:ring-1 focus:ring-primary outline-none"
                    placeholder="Retail Price..."
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-border">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Retail (₦)</label>
                    <input
                      type="number"
                      value={retailPrice}
                      onChange={(e) => setRetailPrice(e.target.value)}
                      className="w-full h-9 bg-card text-xs font-bold font-mono rounded-lg border border-border px-2 focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Retail..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Wholesale (₦)</label>
                    <input
                      type="number"
                      value={wholesalePrice}
                      onChange={(e) => setWholesalePrice(e.target.value)}
                      className="w-full h-9 bg-card text-xs font-bold font-mono rounded-lg border border-border px-2 focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Wholesale..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Distributor (₦)</label>
                    <input
                      type="number"
                      value={distributorPrice}
                      onChange={(e) => setDistributorPrice(e.target.value)}
                      className="w-full h-9 bg-card text-xs font-bold font-mono rounded-lg border border-border px-2 focus:ring-1 focus:ring-primary outline-none"
                      placeholder="Distributor..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between border-t border-dashed pt-4">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Quantity
            </span>
            <div className="flex items-center gap-3 bg-muted/50 p-1 rounded-xl border">
              <Button
                id="variant-qty-decrease"
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-slate-600 hover:bg-white dark:hover:bg-zinc-800 shadow-sm"
                onClick={() => setQty(Math.max(1, qty - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                {qty}
              </span>
              <Button
                id="variant-qty-increase"
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-slate-600 hover:bg-white dark:hover:bg-zinc-800 shadow-sm"
                onClick={() => setQty(qty + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            id="variant-add-to-cart"
            type="button"
            className="w-full h-11 text-xs font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            onClick={handleAdd}
          >
            Add to Cart — {NAIRA}{formattedPrice}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
