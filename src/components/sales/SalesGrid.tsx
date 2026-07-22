import { useState, useEffect, useCallback, useMemo } from "react";
import { ShoppingCart, ArrowLeft, ArrowRight, Check, Utensils, Box, Truck, QrCode, Download, Printer, Store, Layers, Calculator, CreditCard, Tag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useItems } from "@/hooks/useInventoryData";
import { useDemo } from "@/hooks/useDemo";
import { useStoreType } from "@/hooks/useStoreType";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { cn, getStorefrontUrl, getCleanStoreSlug } from "@/lib/utils";
import { SUPPORTED_UNITS } from "@/types/inventory";
import { SalesStepBrowse } from "./SalesStepBrowse";
import { SalesStepCart, type CartItem } from "./SalesStepCart";
import { SalesStepCheckout } from "./SalesStepCheckout";
import { SalesQuickScanCheckout } from "./SalesQuickScanCheckout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { resolvePrice } from "@/utils/pricing";
import { getEffectiveUnitConversions } from "@/utils/unitConversions";
import { useFirebaseOffline } from "@/lib/firebase";
import { toast } from "sonner";
import { Wifi, WifiOff } from "lucide-react";

const NAIRA = "₦";
const USD_TO_NGN = 1;

const STEPS = [
  { id: "browse", label: "Browse", icon: ShoppingCart },
  { id: "cart", label: "Review", icon: ArrowRight },
  { id: "checkout", label: "Checkout", icon: Check },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function SalesGrid() {
  const { data: items } = useItems();
  const { isDemo, onboarding: demoOnboarding } = useDemo();
  
  const offline = useFirebaseOffline();
  const [isForcedOffline, setIsForcedOffline] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nexa_force_offline") === "true";
    }
    return false;
  });

  const toggleForceOffline = () => {
    const nextVal = !isForcedOffline;
    setIsForcedOffline(nextVal);
    if (nextVal) {
      localStorage.setItem("nexa_force_offline", "true");
      toast.warning("Forced offline mode activated. Sales will save locally and sync when you toggle online.");
    } else {
      localStorage.removeItem("nexa_force_offline");
      toast.success("Online mode restored. Syncing with cloud database...");
    }
    // Trigger custom event so other listeners can update instantly
    window.dispatchEvent(new Event("nexa-offline-toggle"));
  };
  const { settings: liveSettings } = useSystemSettings();
  const onboarding = isDemo ? demoOnboarding : liveSettings;
  const isRestaurant = onboarding?.businessType === "restaurant";

  const { storeType, isWholesaler, isRetailer, isSupermarket, currentOption } = useStoreType();
  const [supermarketTill, setSupermarketTill] = useState("Till #1 - Main Counter");

  const [posMode, setPosMode] = useState<"standard" | "quickscan">("standard");
  const [diningMode, setDiningMode] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
  const [tableNumber, setTableNumber] = useState("4");
  const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(false);

  // Tiered Pricing & Price Override States
  const [activeTier, setActiveTier] = useState<"retail" | "wholesale" | "distributor">(() => {
    return storeType === "wholesaler" ? "wholesale" : "retail";
  });

  useEffect(() => {
    if (isWholesaler && activeTier === "retail") {
      setActiveTier("wholesale");
    }
  }, [isWholesaler, activeTier]);
  const [priceOverrides, setPriceOverrides] = useState<Map<string, number>>(new Map());

  const [cart, setCart] = useState<Map<string, number>>(() => {
    try {
      const saved = localStorage.getItem("stackwise-pos-cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Map(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to restore cart state:", e);
    }
    return new Map();
  });
  const [step, setStep] = useState<StepId>("browse");

  useEffect(() => {
    try {
      localStorage.setItem("stackwise-pos-cart", JSON.stringify(Array.from(cart.entries())));
    } catch (e) {
      console.error("Failed to serialize cart state:", e);
    }
  }, [cart]);

  const goToCart = useCallback(() => setStep("cart"), []);

  // Listen for "Sell" button click from browse step
  useEffect(() => {
    const handler = () => goToCart();
    window.addEventListener("pos-go-to-cart", handler);
    return () => window.removeEventListener("pos-go-to-cart", handler);
  }, [goToCart]);

  const addToCart = (itemId: string, customQty?: number, unitId?: string, configStr?: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const item = items.find(i => i.id === itemId);
      if (!item) return prev;

      const effectiveUnit = unitId || item.unit;
      const key = configStr ? `${itemId}:${effectiveUnit}:${configStr}` : `${itemId}:${effectiveUnit}`;
      const unitDef = SUPPORTED_UNITS.find(u => u.id === effectiveUnit);
      const step = unitDef?.step || 1;
      const current = next.get(key) ?? 0;
      
      if (customQty !== undefined) {
        if (customQty <= 0) next.delete(key);
        else next.set(key, customQty);
      } else {
        next.set(key, Number((current + step).toFixed(2)));
      }
      return next;
    });
  };

  const removeFromCart = (itemId: string, unitId?: string, configStr?: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const item = items.find(i => i.id === itemId);
      if (!item) return prev;

      const effectiveUnit = unitId || item.unit;
      const key = configStr ? `${itemId}:${effectiveUnit}:${configStr}` : `${itemId}:${effectiveUnit}`;
      const unitDef = SUPPORTED_UNITS.find(u => u.id === effectiveUnit);
      const step = unitDef?.step || 1;
      const current = next.get(key) ?? 0;
      
      const qty = Number((current - step).toFixed(2));
      if (qty <= 0) next.delete(key);
      else next.set(key, qty);
      return next;
    });
  };

  const cartItems = useMemo<CartItem[]>(() => {
    const list: CartItem[] = [];
    const itemsList = items || [];
    cart.forEach((qty, compositeKey) => {
      let itemId = compositeKey;
      let unitId = "";
      let configStr = "";
      const firstColon = compositeKey.indexOf(":");
      if (firstColon !== -1) {
        itemId = compositeKey.substring(0, firstColon);
        const remaining = compositeKey.substring(firstColon + 1);
        const secondColon = remaining.indexOf(":");
        if (secondColon !== -1) {
          unitId = remaining.substring(0, secondColon);
          configStr = remaining.substring(secondColon + 1);
        } else {
          unitId = remaining;
        }
      }
      
      const item = itemsList.find((i) => i.id === itemId);
      if (!item) return;

      // Calculate price for the unit using resolvePrice
      const pricingMode = onboarding?.pricingMode || "single";
      const basePrice = resolvePrice(item, pricingMode, activeTier);

      // Check if there is a manual override for this compositeKey
      const overridePrice = priceOverrides.get(compositeKey);
      let unitPrice = overridePrice !== undefined ? overridePrice : basePrice;

      if (overridePrice === undefined && unitId !== item.unit) {
        const conversions = getEffectiveUnitConversions(item);
        const conv = conversions.find(c => c.unitId === unitId);
        if (conv) {
          unitPrice = conv.priceNgn !== undefined 
            ? conv.priceNgn / USD_TO_NGN // convert back to USD for internal consistency
            : basePrice * conv.multiplier;
        }
      }

      // Apply configuration modifications if present
      if (configStr) {
        try {
          const config = JSON.parse(configStr);
          if (item.fineTunedVariants && (config.color || config.size)) {
            const parts: string[] = [];
            if (config.color) parts.push(config.color);
            if (config.size) parts.push(config.size);
            const variantKey = parts.join(" - ");
            const variantMatch = item.fineTunedVariants[variantKey];
            if (variantMatch && typeof variantMatch.price === "number") {
              unitPrice = variantMatch.price;
            }
          }
          if (config.portion) {
            unitPrice = config.portion.price;
          }
          if (config.proteins) {
            const addonSum = config.proteins.reduce((sum: number, p: { price: number }) => sum + p.price, 0);
            unitPrice += addonSum;
          }
          if (config.comboSelections) {
            const comboAddonSum = config.comboSelections.reduce((sum: number, cs: { priceModifier?: number }) => sum + (cs.priceModifier || 0), 0);
            unitPrice += comboAddonSum;
          }
        } catch (e) {
          console.error("Failed to parse configStr:", e);
        }
      }

      list.push({ 
        item, 
        quantity: qty, 
        selectedUnit: unitId,
        calculatedUnitPrice: unitPrice,
        configStr
      });
    });
    return list;
  }, [cart, items, activeTier, priceOverrides, onboarding?.pricingMode]);

  const totalItems = Array.from(cart.values()).reduce((s, q) => s + q, 0);

  // Calculate packaging container fee: N500 if takeaway or delivery in restaurant mode
  const packagingFee = (isRestaurant && (diningMode === "takeaway" || diningMode === "delivery")) ? 500 : 0;

  // Calculate estimated ready time by summing preparation fields
  const estimatedReadyTime = useMemo(() => {
    return cartItems.reduce((sum, ci) => {
      const prep = ci.item.restaurant?.preparationTime || 5; // default 5m if undefined
      return sum + prep * ci.quantity;
    }, 0);
  }, [cartItems]);

  const totalNaira = useMemo(() => {
    const itemsSum = cartItems.reduce((s, ci) => {
      const price = ci.calculatedUnitPrice ?? ci.item.sellingPrice;
      return s + price * USD_TO_NGN * ci.quantity;
    }, 0);
    return itemsSum + packagingFee;
  }, [cartItems, packagingFee]);

  const handleComplete = () => {
    setCart(new Map());
    setPriceOverrides(new Map());
    setActiveTier("retail");
    setStep("browse");
    // If table ordered, mark this table in localStorage as "cooking"
    if (isRestaurant && diningMode === "dine-in" && tableNumber) {
      try {
        const key = `pos-table-status-${tableNumber}`;
        localStorage.setItem(key, JSON.stringify({
          status: "cooking",
          orderTime: new Date().toISOString(),
          itemsCount: totalItems,
          totalPrice: totalNaira,
        }));
      } catch(e) {
        console.warn("Table status write failed:", e);
      }
    }
  };

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Step indicator header */}
      <div className="border-b border-border bg-card px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tight text-foreground leading-none">Point of Sale</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">Nexa Retail & Restaurant Hub</p>
          </div>
          
          <div className="flex items-center gap-2">
            {!isDemo ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleForceOffline}
                className={cn(
                  "h-8 gap-1.5 rounded-xl text-xs font-semibold border-2 cursor-pointer transition-all duration-200",
                  offline 
                    ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50" 
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50"
                )}
                title={isForcedOffline ? "Click to Go Online" : "Click to Force Offline Mode"}
              >
                {offline ? (
                  <>
                    <WifiOff className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                    <span>Offline {isForcedOffline && "(Forced)"}</span>
                  </>
                ) : (
                  <>
                    <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Online</span>
                  </>
                )}
              </Button>
            ) : (
              <Badge variant="outline" className="h-8 border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400 font-bold rounded-xl px-2.5">
                Demo Playfield
              </Badge>
            )}

            <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPosMode("standard")}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  posMode === "standard" 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Catalogue
              </button>
              <button
                type="button"
                onClick={() => setPosMode("quickscan")}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                  posMode === "quickscan" 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Quick Scan ⚡</span>
              </button>
            </div>
          </div>

          {totalItems > 0 && step === "browse" && posMode === "standard" && (
            <Button size="sm" className="gap-2 rounded-xl" onClick={goToCart}>
              <ShoppingCart className="h-4 w-4" />
              Cart
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 rounded-full px-1 text-[10px]">
                {totalItems}
              </Badge>
            </Button>
          )}
        </div>

        {/* Customized Store Type Context Banner */}
        {step === "browse" && (
          <div className="rounded-2xl border border-border/60 bg-gradient-to-r from-card via-card to-muted/30 p-3 shadow-xs space-y-2">
            {isWholesaler && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                    📦
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">Wholesale Depot Controls</span>
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30 px-1.5 py-0 font-bold">
                        B2B Bulk Pricing
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Carton & crate conversions active. Tiered discounts apply automatically.</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
                  <span className="text-[10px] font-bold text-muted-foreground px-1 uppercase tracking-wider">Tier:</span>
                  {(["retail", "wholesale", "distributor"] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setActiveTier(tier)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-bold rounded-lg transition-all capitalize",
                        activeTier === tier
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isRetailer && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                    🛍️
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">Retail POS Quick Counter</span>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-1.5 py-0 font-bold">
                        Single-Unit Express
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Single unit items with fast cash tender calculations and barcode lookup.</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground">Quick Cash Tender:</span>
                  {[1000, 5000, 10000].map((amt) => (
                    <Badge
                      key={amt}
                      variant="outline"
                      className="cursor-pointer hover:bg-emerald-500/10 hover:border-emerald-500 text-[10px] font-mono px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      onClick={() => toast.info(`Quick Tender ₦${amt.toLocaleString()} selected for fast change calculation.`)}
                    >
                      ₦{amt.toLocaleString()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {isSupermarket && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                    🛒
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">Supermarket & Store Till Matrix</span>
                      <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30 px-1.5 py-0 font-bold">
                        Multi-Counter Active
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Department / Aisle index mapped with active till sales tracking.</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
                  <span className="text-[10px] font-bold text-muted-foreground px-1 uppercase tracking-wider">Till:</span>
                  {["Till #1 - Main", "Till #2 - Express", "Till #3 - Self Scan"].map((tName) => (
                    <button
                      key={tName}
                      type="button"
                      onClick={() => {
                        setSupermarketTill(tName);
                        toast.success(`Switched to active register: ${tName}`);
                      }}
                      className={cn(
                        "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all",
                        supermarketTill === tName
                          ? "bg-purple-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Restaurant Order Context Bar (Dine-In, Takeaway, Delivery) */}
        {isRestaurant && step === "browse" && (
          <div className="flex flex-col gap-2 bg-muted/20 p-2 border border-border/40 rounded-2xl">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              <span>Order Context</span>
              {diningMode === "dine-in" && (
                <span className="text-amber-500 animate-pulse">Table Status: Occupied & Syncing</span>
              )}
              {packagingFee > 0 && (
                <span className="text-primary">+₦{packagingFee} Packaging Applied</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setDiningMode("dine-in");
                  setIsTableSelectorOpen(true);
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all relative",
                  diningMode === "dine-in"
                    ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "bg-background border-border text-foreground/80 hover:bg-muted"
                )}
              >
                <Utensils className="h-3.5 w-3.5" />
                Dine-in · T{tableNumber}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiningMode("takeaway");
                  setIsTableSelectorOpen(false);
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all",
                  diningMode === "takeaway"
                    ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "bg-background border-border text-foreground/80 hover:bg-muted"
                )}
              >
                <Box className="h-3.5 w-3.5" />
                Takeaway
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiningMode("delivery");
                  setIsTableSelectorOpen(false);
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-all",
                  diningMode === "delivery"
                    ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "bg-background border-border text-foreground/80 hover:bg-muted"
                )}
              >
                <Truck className="h-3.5 w-3.5" />
                Delivery
              </button>
            </div>

            {/* Micro grid for table selector */}
            {isTableSelectorOpen && (
              <div className="mt-2 p-2 bg-background border border-border rounded-xl space-y-1.5">
                <span className="text-[9px] font-bold uppercase text-muted-foreground block">Select Table Number</span>
                <div className="grid grid-cols-6 gap-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((tNum) => (
                    <button
                      key={tNum}
                      type="button"
                      onClick={() => {
                        setTableNumber(tNum.toString());
                        setIsTableSelectorOpen(false);
                      }}
                      className={cn(
                        "h-8 text-xs font-bold rounded-lg border",
                        tableNumber === tNum.toString()
                          ? "bg-amber-500 border-amber-500 text-white"
                          : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      T{tNum}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {diningMode === "dine-in" && (
              <div className="flex items-center justify-between mt-1 px-1 py-1.5 border-t border-border/40 text-xs">
                <span className="text-muted-foreground font-medium">Ordering & Self-Pay QR Code</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2 py-0 rounded-lg border-amber-200 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 transition-colors">
                      <QrCode className="h-3 w-3" /> Get T{tableNumber} QR
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-white">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-amber-500" />
                        Table {tableNumber} Entry QR
                      </DialogTitle>
                      <DialogDescription>
                        Customers scan this code to browse the restaurant menu on their phones, place direct orders, and pay via Moniepoint Transfer.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center justify-center space-y-6 py-4">
                      <div className="rounded-2xl border-8 border-neutral-100 bg-white p-4 shadow-xl">
                        <QRCodeSVG
                          id={`qr-table-${tableNumber}`}
                          value={getStorefrontUrl(getCleanStoreSlug(onboarding?.storeSlug, onboarding?.storeName), "", { table: tableNumber })}
                          size={220}
                          level="H"
                          includeMargin={false}
                          className="h-44 w-44"
                        />
                      </div>

                      <div className="flex flex-col items-center text-center space-y-1">
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                          Table {tableNumber} Link Active
                        </Badge>
                        <p className="text-xs font-mono text-muted-foreground select-all break-all px-4 mt-1 bg-muted py-1 rounded max-w-sm truncate">
                          {getStorefrontUrl(getCleanStoreSlug(onboarding?.storeSlug, onboarding?.storeName), "", { table: tableNumber })}
                        </p>
                      </div>

                      <div className="flex w-full gap-3">
                        <Button 
                          variant="outline" 
                          className="flex-1 gap-2 rounded-xl" 
                          onClick={() => {
                            const svg = document.getElementById(`qr-table-${tableNumber}`);
                            if (!svg) return;
                            const svgData = new XMLSerializer().serializeToString(svg);
                            const canvas = document.createElement("canvas");
                            const ctx = canvas.getContext("2d");
                            const img = new Image();
                            img.onload = () => {
                              canvas.width = 1000;
                              canvas.height = 1000;
                              ctx?.drawImage(img, 0, 0, 1000, 1000);
                              const pngFile = canvas.toDataURL("image/png");
                              const downloadLink = document.createElement("a");
                              downloadLink.download = `Table-${tableNumber}-QR.png`;
                              downloadLink.href = pngFile;
                              downloadLink.click();
                            };
                            img.src = "data:image/svg+xml;base64," + btoa(svgData);
                          }}
                        >
                          <Download className="h-4 w-4" /> Download
                        </Button>
                        <Button 
                          className="flex-1 gap-2 rounded-xl" 
                          onClick={() => window.print()}
                        >
                          <Printer className="h-4 w-4" /> Print Label
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        )}

        {/* Step tabs */}
        {posMode === "standard" && (
          <div className="flex items-center gap-1 lg:hidden">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id === "checkout" && cartItems.length === 0) return;
                  if (s.id === "cart" || s.id === "browse") setStep(s.id);
                  if (s.id === "checkout" && cartItems.length > 0) setStep(s.id);
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                  step === s.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : i < stepIdx
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  s.id === "checkout" && cartItems.length === 0 && "opacity-40 cursor-not-allowed"
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold">
                  {i + 1}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {posMode === "quickscan" ? (
          <SalesQuickScanCheckout />
        ) : (
          <>
            {/* Desktop Side-by-Side View */}
            <div className="hidden lg:grid lg:grid-cols-5 lg:h-full lg:divide-x lg:divide-border overflow-hidden">
              {/* Left Column: Product Catalog */}
              <div className="lg:col-span-3 flex flex-col overflow-hidden h-full">
                <SalesStepBrowse 
                  cart={cart} 
                  onAdd={addToCart} 
                  onRemove={removeFromCart} 
                  pricingMode={onboarding?.pricingMode || "single"}
                  activeTier={activeTier}
                  onChangeTier={setActiveTier}
                />
              </div>
              
              {/* Right Column: Interactive Cart Review / Billing Checkout */}
              <div className="lg:col-span-2 flex flex-col overflow-hidden h-full bg-card">
                {step === "checkout" ? (
                  <SalesStepCheckout 
                    items={cartItems} 
                    onComplete={handleComplete} 
                    diningMode={diningMode}
                    tableNumber={tableNumber}
                    packagingFee={packagingFee}
                    estimatedReadyTime={estimatedReadyTime}
                    onBack={() => setStep("cart")}
                  />
                ) : (
                  <SalesStepCart
                    items={cartItems}
                    onAdd={addToCart}
                    onRemove={removeFromCart}
                    onClear={() => {
                      setCart(new Map());
                      setPriceOverrides(new Map());
                    }}
                    onNext={() => setStep("checkout")}
                    onboarding={onboarding}
                    packagingFee={packagingFee}
                    estimatedReadyTime={estimatedReadyTime}
                    pricingMode={onboarding?.pricingMode || "single"}
                    activeTier={activeTier}
                    onChangeTier={setActiveTier}
                    priceOverrides={priceOverrides}
                    onOverridePrice={(key, price) => {
                      setPriceOverrides((prev) => {
                        const next = new Map(prev);
                        if (price === undefined) {
                          next.delete(key);
                        } else {
                          next.set(key, price);
                        }
                        return next;
                      });
                    }}
                  />
                )}
              </div>
            </div>

            {/* Mobile / Tablet Wizard View */}
            <div className="flex-1 overflow-hidden flex flex-col lg:hidden">
              {step === "browse" && (
                <SalesStepBrowse 
                  cart={cart} 
                  onAdd={addToCart} 
                  onRemove={removeFromCart} 
                  pricingMode={onboarding?.pricingMode || "single"}
                  activeTier={activeTier}
                  onChangeTier={setActiveTier}
                />
              )}
              {step === "cart" && (
                <SalesStepCart
                  items={cartItems}
                  onAdd={addToCart}
                  onRemove={removeFromCart}
                  onClear={() => {
                    setCart(new Map());
                    setPriceOverrides(new Map());
                  }}
                  onNext={() => setStep("checkout")}
                  onboarding={onboarding}
                  packagingFee={packagingFee}
                  estimatedReadyTime={estimatedReadyTime}
                  pricingMode={onboarding?.pricingMode || "single"}
                  activeTier={activeTier}
                  onChangeTier={setActiveTier}
                  priceOverrides={priceOverrides}
                  onOverridePrice={(key, price) => {
                    setPriceOverrides((prev) => {
                      const next = new Map(prev);
                      if (price === undefined) {
                        next.delete(key);
                      } else {
                        next.set(key, price);
                      }
                      return next;
                    });
                  }}
                />
              )}
              {step === "checkout" && (
                <SalesStepCheckout 
                  items={cartItems} 
                  onComplete={handleComplete} 
                  diningMode={diningMode}
                  tableNumber={tableNumber}
                  packagingFee={packagingFee}
                  estimatedReadyTime={estimatedReadyTime}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom navigation between steps */}
      {posMode === "standard" && step !== "browse" && (
        <div className="border-t border-border bg-card px-4 py-3 flex items-center gap-3 lg:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(step === "checkout" ? "cart" : "browse")}
            className="gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
          {step === "cart" && (
            <div className="ml-auto text-sm font-mono font-bold">
              {NAIRA}{totalNaira.toLocaleString("en-NG", { minimumFractionDigits: 0 })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
