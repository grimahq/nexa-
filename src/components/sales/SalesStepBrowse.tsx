import { useState, useMemo, useRef, useCallback } from "react";
import { Plus, Minus, Package, Search, X, TrendingUp, UserCheck, ShoppingCart, ChevronDown, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useItems, useCategories } from "@/hooks/useInventoryData";
import { useDemo } from "@/hooks/useDemo";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { cn } from "@/lib/utils";
import { FoodPlate } from "./FoodPlate";
import { SUPPORTED_UNITS, type Item } from "@/types/inventory";
import { DishCustomizerDialog } from "./DishCustomizerDialog";
import { VariantCustomizerDialog } from "./VariantCustomizerDialog";

const NAIRA = "₦";
const USD_TO_NGN = 1;

function formatNaira(usd: number): string {
  const ngn = usd * USD_TO_NGN;
  return `${NAIRA}${ngn.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface SalesStepBrowseProps {
  cart: Map<string, number>; // keys are itemId:unitId:configString
  onAdd: (id: string, qty?: number, unitId?: string, configStr?: string) => void;
  onRemove: (id: string, unitId?: string, configStr?: string) => void;
}

export function SalesStepBrowse({ cart, onAdd, onRemove }: SalesStepBrowseProps) {
  const { data: items } = useItems();
  const { data: categories } = useCategories();
  const { isDemo, demoStore, onboarding: demoOnboarding } = useDemo();
  const { settings: liveSettings } = useSystemSettings();
  
  const onboarding = isDemo ? demoOnboarding : liveSettings;
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const [inlineEditingItemId, setInlineEditingItemId] = useState<string | null>(null);
  const [inlineQtyState, setInlineQtyState] = useState<Record<string, number>>({});
  const [configuratorOpen, setConfiguratorOpen] = useState(false);
  const [configuratorItem, setConfiguratorItem] = useState<Item | null>(null);
  const [variantConfigOpen, setVariantConfigOpen] = useState(false);
  const [variantConfigItem, setVariantConfigItem] = useState<Item | null>(null);

  // Core Stock Guard helper: calculates how many items of targetUnitId we can add
  const getAvailableTargetQty = useCallback((item: Item, targetUnitId: string, currentCart: Map<string, number>): number => {
    let consumedBaseUnits = 0;
    currentCart.forEach((qty, compositeKey) => {
      let itemId = compositeKey;
      let unitId = "";
      const firstColon = compositeKey.indexOf(":");
      if (firstColon !== -1) {
        itemId = compositeKey.substring(0, firstColon);
        const remaining = compositeKey.substring(firstColon + 1);
        const secondColon = remaining.indexOf(":");
        unitId = secondColon !== -1 ? remaining.substring(0, secondColon) : remaining;
      }
      if (itemId === item.id && unitId !== targetUnitId) {
        const multiplier = unitId === item.unit
          ? 1
          : item.unitConversions?.find(c => c.unitId === unitId)?.multiplier || 1;
        consumedBaseUnits += qty * multiplier;
      }
    });

    const availableBaseStock = Math.max(0, item.currentStock - consumedBaseUnits);
    const targetMultiplier = targetUnitId === item.unit
      ? 1
      : item.unitConversions?.find(c => c.unitId === targetUnitId)?.multiplier || 1;
    
    return availableBaseStock / targetMultiplier;
  }, []);

  // Stock Guard helper for Inline "All Units" panel
  const getAvailableForUnitInInlineMode = useCallback((item: Item, targetUnitId: string, qtyState: Record<string, number>): number => {
    let localConsumedBase = 0;
    Object.entries(qtyState).forEach(([uId, qty]) => {
      if (uId !== targetUnitId) {
        const multiplier = uId === item.unit
          ? 1
          : item.unitConversions?.find(c => c.unitId === uId)?.multiplier || 1;
        localConsumedBase += (qty || 0) * multiplier;
      }
    });
    const availableBase = Math.max(0, item.currentStock - localConsumedBase);
    const targetMultiplier = targetUnitId === item.unit
      ? 1
      : item.unitConversions?.find(c => c.unitId === targetUnitId)?.multiplier || 1;
    return availableBase / targetMultiplier;
  }, []);

  const handleOpenInlineAllUnits = useCallback((item: Item) => {
    const initial: Record<string, number> = {};
    initial[item.unit] = cart.get(`${item.id}:${item.unit}`) ?? 0;
    item.unitConversions?.forEach(c => {
      initial[c.unitId] = cart.get(`${item.id}:${c.unitId}`) ?? 0;
    });
    setInlineQtyState(initial);
    setInlineEditingItemId(item.id);
  }, [cart]);

  const handleApplyInlineAllUnits = useCallback((item: Item) => {
    const unitsToSave = [item.unit, ...(item.unitConversions?.map(c => c.unitId) ?? [])];
    unitsToSave.forEach(unitId => {
      const qty = inlineQtyState[unitId] ?? 0;
      onAdd(item.id, qty, unitId);
    });
    setInlineEditingItemId(null);
    setInlineQtyState({});
  }, [inlineQtyState, onAdd]);

  const totalItems = Array.from(cart.values()).reduce((s, q) => s + q, 0);
  
  // Group cart by itemId to show badges on product cards
  const cartSumsByItem = useMemo(() => {
    const sums = new Map<string, number>();
    cart.forEach((qty, compositeKey) => {
      let itemId = compositeKey;
      const firstColon = compositeKey.indexOf(":");
      if (firstColon !== -1) {
        itemId = compositeKey.substring(0, firstColon);
      }
      sums.set(itemId, (sums.get(itemId) ?? 0) + qty);
    });
    return sums;
  }, [cart]);

  const totalNaira = useMemo(() => {
    let sum = 0;
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

      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      let price = item.sellingPrice;
      if (unitId && unitId !== item.unit && item.unitConversions) {
        const conv = item.unitConversions.find(c => c.unitId === unitId);
        if (conv) {
          price = conv.priceNgn !== undefined ? conv.priceNgn / USD_TO_NGN : item.sellingPrice * conv.multiplier;
        }
      }

      if (configStr) {
        try {
          const config = JSON.parse(configStr);
          if (config.portion) {
            price = config.portion.price;
          }
          if (config.proteins) {
            const addonSum = config.proteins.reduce((s: number, p: { price: number }) => s + p.price, 0);
            price += addonSum;
          }
          if (config.comboSelections) {
            const comboAddonSum = config.comboSelections.reduce((s: number, cs: { priceModifier?: number }) => s + (cs.priceModifier || 0), 0);
            price += comboAddonSum;
          }
        } catch (e) {
          console.error("Failed to parse configStr:", e);
        }
      }

      sum += price * USD_TO_NGN * qty;
    });
    return sum;
  }, [cart, items]);

  // Long-press support
  const longPressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLongPress = useCallback((action: () => void) => {
    action();
    longPressRef.current = setInterval(action, 150);
  }, []);

  const stopLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearInterval(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const handleAdd = useCallback((id: string, qty?: number, unitId?: string) => {
    onAdd(id, qty, unitId);
    setAnimatingItems((prev) => new Set(prev).add(id));
    setTimeout(() => setAnimatingItems((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    }), 200);
  }, [onAdd]);

  const isSearchEmpty = !search.trim() && !activeCat;
  const isRestaurant = onboarding?.businessType === "restaurant";

  const topSellers = useMemo(() => {
    const sales = demoStore?.getSales() ?? [];
    const counts = new Map<string, number>();
    for (const sale of sales) {
      for (const li of sale.items) {
        counts.set(li.itemId, (counts.get(li.itemId) ?? 0) + li.quantity);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => items.find((i) => i.id === id))
      .filter(Boolean);
  }, [demoStore, items]);

  const repeatCustomers = useMemo(() => {
    const sales = demoStore?.getSales() ?? [];
    const map = new Map<string, { name: string; phone: string; count: number }>();
    for (const sale of sales) {
      if (sale.customerPhone) {
        const key = sale.customerPhone;
        const existing = map.get(key);
        if (existing) existing.count++;
        else map.set(key, { name: sale.customerName ?? "Unknown", phone: key, count: 1 });
      }
    }
    return Array.from(map.values())
      .filter((c) => c.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [demoStore]);

  const filtered = useMemo(() => {
    let list = items.filter((i) => i.currentStock > 0);
    if (activeCat) list = list.filter((i) => i.categoryId === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    }
    return list;
  }, [items, search, activeCat]);

  return (
    <div className="flex h-full flex-col relative pb-28">
      {/* Restaurant Visualizer */}
      {isRestaurant && totalItems > 0 && (
        <div className="absolute right-4 top-16 z-20 hidden lg:block">
          <FoodPlate 
            items={items.filter(i => cartSumsByItem.has(i.id)).map(i => ({
              id: i.id,
              name: i.name,
              quantity: cartSumsByItem.get(i.id) || 0,
              emoji: i.emoji
            }))} 
            className="scale-90 origin-top-right bg-card/40 backdrop-blur-sm rounded-full p-2 border border-border/50"
          />
        </div>
      )}

      {/* Search bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className="pl-9 h-10"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveCat(null)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            !activeCat ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-accent"
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              activeCat === cat.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Smart suggestions when search is empty */}
      {isSearchEmpty && (topSellers.length > 0 || repeatCustomers.length > 0) && (
        <div className="border-b border-border px-4 pb-3 space-y-3">
          {topSellers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Sellers</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {topSellers.map((item) => item && (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAdd(item.id)}
                    className="shrink-0 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left hover:border-primary/40 hover:shadow-sm transition-all active:scale-95"
                  >
                    <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center text-sm overflow-hidden">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : item.emoji || "📦"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate max-w-24">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{formatNaira(item.sellingPrice)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {repeatCustomers.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Repeat Customers</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {repeatCustomers.map((c) => (
                  <div key={c.phone} className="shrink-0 rounded-lg border border-border bg-card px-3 py-2">
                    <p className="text-xs font-medium">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{c.phone}</p>
                    <Badge variant="secondary" className="mt-1 text-[9px]">{c.count} orders</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 gap-2.5 py-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => {
            const currentUnit = selectedUnits[item.id] || item.unit;
            const compositeKey = `${item.id}:${currentUnit}`;
            const qty = cart.get(compositeKey) ?? 0;
            const totalBadgeQty = cartSumsByItem.get(item.id) ?? 0;
            const isAnimating = animatingItems.has(item.id);

            // Price calculation for unit
            let displayPrice = item.sellingPrice;
            if (currentUnit !== item.unit && item.unitConversions) {
              const conv = item.unitConversions.find(c => c.unitId === currentUnit);
              if (conv) {
                displayPrice = conv.priceNgn !== undefined 
                  ? conv.priceNgn / USD_TO_NGN 
                  : item.sellingPrice * conv.multiplier;
              }
            }

            // High Precision Stock Guard limits for Direct Action
            const currentStep = SUPPORTED_UNITS.find(u => u.id === currentUnit)?.step || 1;
            const targetAvailableQty = getAvailableTargetQty(item, currentUnit, cart);
            const isAddDisabled = qty + currentStep > targetAvailableQty;

            const hasRestaurantConfig = isRestaurant && (
              (item.restaurant?.portionSizes && item.restaurant.portionSizes.length > 0) ||
              (item.restaurant?.proteinAddons && item.restaurant.proteinAddons.length > 0) ||
              (item.restaurant?.spiceLevels && item.restaurant.spiceLevels.length > 0) ||
              item.restaurant?.isCombo
            );
            const hasVariants = !!(item.color || item.sizes);

            // Render inline multi-unit panel if editing mode is active for this item
            if (inlineEditingItemId === item.id) {
              return (
                <div
                  key={item.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-xl border border-primary bg-card p-3 shadow-lg min-h-[340px]"
                >
                  <div>
                    <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base shrink-0">{item.emoji || "📦"}</span>
                        <p className="text-xs font-bold truncate text-foreground leading-none">{item.name}</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setInlineEditingItemId(null)}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-sm shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-[9px] text-muted-foreground font-semibold mb-1">
                       All Units Mode · Stock: {item.currentStock} {item.unit}
                    </p>

                    {item.textile && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.textile.fabricContent && (
                          <span className="text-[8px] bg-rose-50/50 border border-rose-200/30 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400 font-bold px-1 rounded uppercase tracking-tight">
                            {item.textile.fabricContent}
                          </span>
                        )}
                        {item.textile.weaveType && (
                          <span className="text-[8px] bg-amber-50/50 border border-amber-200/30 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400 font-bold px-1 rounded uppercase tracking-tight">
                            {item.textile.weaveType}
                          </span>
                        )}
                        {item.textile.gsm && (
                          <span className="text-[8px] bg-indigo-50/50 border border-indigo-200/30 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 font-bold px-1 rounded uppercase tracking-tight font-mono">
                            {item.textile.gsm} GSM
                          </span>
                        )}
                      </div>
                    )}

                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-0.5 scrollbar-thin">
                      {/* Base Unit Qty Block */}
                      {(() => {
                        const unitId = item.unit;
                        const localQty = inlineQtyState[unitId] ?? 0;
                        const unitPrice = item.sellingPrice;
                        const maxAllowed = getAvailableForUnitInInlineMode(item, unitId, inlineQtyState);
                        const step = SUPPORTED_UNITS.find(u => u.id === unitId)?.step || 1;
                        const canIncrement = localQty + step <= maxAllowed;

                        return (
                          <div className="p-1.5 rounded-lg border bg-muted/15 flex flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[10px] uppercase text-zinc-600 dark:text-zinc-400">
                                {unitId} <span className="text-[8px] text-muted-foreground font-normal">(Base)</span>
                              </span>
                              <span className="text-[11px] font-bold text-primary">{formatNaira(unitPrice)}</span>
                            </div>
                            
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-5 w-5 rounded animate-none"
                                  disabled={localQty <= 0}
                                  onClick={() => {
                                    const newVal = Math.max(0, Number((localQty - step).toFixed(2)));
                                    setInlineQtyState(prev => ({ ...prev, [unitId]: newVal }));
                                  }}
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </Button>
                                <input
                                  type="number"
                                  className="w-8 h-5 text-center font-bold text-xs bg-transparent border-b border-border outline-none focus:border-primary font-mono"
                                  value={localQty || ""}
                                  placeholder="0"
                                  onChange={(e) => {
                                    let val = parseFloat(e.target.value);
                                    if (isNaN(val) || val < 0) val = 0;
                                    if (val > maxAllowed) val = maxAllowed;
                                    setInlineQtyState(prev => ({ ...prev, [unitId]: Number(val.toFixed(2)) }));
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-5 w-5 rounded animate-none"
                                  disabled={!canIncrement}
                                  onClick={() => {
                                    const newVal = Number((localQty + step).toFixed(2));
                                    setInlineQtyState(prev => ({ ...prev, [unitId]: newVal }));
                                  }}
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                              
                              {!canIncrement && (
                                <span className="text-[8px] text-destructive font-semibold">
                                  Only {Math.floor(maxAllowed)} left
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Conversion Units Qty Blocks */}
                      {item.unitConversions?.map((conv) => {
                        const unitId = conv.unitId;
                        const localQty = inlineQtyState[unitId] ?? 0;
                        const unitPrice = conv.priceNgn !== undefined 
                          ? conv.priceNgn / USD_TO_NGN 
                          : item.sellingPrice * conv.multiplier;
                        const maxAllowed = getAvailableForUnitInInlineMode(item, unitId, inlineQtyState);
                        const step = SUPPORTED_UNITS.find(u => u.id === unitId)?.step || 1;
                        const canIncrement = localQty + step <= maxAllowed;

                        return (
                          <div key={unitId} className="p-1.5 rounded-lg border bg-muted/15 flex flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[10px] uppercase text-zinc-600 dark:text-zinc-400">
                                {unitId} <span className="text-[8px] text-muted-foreground font-normal">(= {conv.multiplier} {item.unit})</span>
                              </span>
                              <span className="text-[11px] font-bold text-primary">{formatNaira(unitPrice)}</span>
                            </div>
                            
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-5 w-5 rounded animate-none"
                                  disabled={localQty <= 0}
                                  onClick={() => {
                                    const newVal = Math.max(0, Number((localQty - step).toFixed(2)));
                                    setInlineQtyState(prev => ({ ...prev, [unitId]: newVal }));
                                  }}
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </Button>
                                <input
                                  type="number"
                                  className="w-8 h-5 text-center font-bold text-xs bg-transparent border-b border-border outline-none focus:border-primary font-mono"
                                  value={localQty || ""}
                                  placeholder="0"
                                  onChange={(e) => {
                                    let val = parseFloat(e.target.value);
                                    if (isNaN(val) || val < 0) val = 0;
                                    if (val > maxAllowed) val = maxAllowed;
                                    setInlineQtyState(prev => ({ ...prev, [unitId]: Number(val.toFixed(2)) }));
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-5 w-5 rounded animate-none"
                                  disabled={!canIncrement}
                                  onClick={() => {
                                    const newVal = Number((localQty + step).toFixed(2));
                                    setInlineQtyState(prev => ({ ...prev, [unitId]: newVal }));
                                  }}
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                              
                              {!canIncrement && (
                                <span className="text-[8px] text-destructive font-semibold">
                                  Only {Math.floor(maxAllowed)} left
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t flex gap-1.5 shrink-0">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1 h-7 text-[10px] font-semibold"
                      onClick={() => setInlineEditingItemId(null)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      className="flex-1 h-7 text-[10px] font-bold"
                      onClick={() => handleApplyInlineAllUnits(item)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              );
            }

            // Normal Card Face with Direct Unit Speed Pills and strict stock checks
            return (
              <div
                key={item.id}
                className={cn(
                  "group flex flex-col overflow-hidden rounded-xl border bg-card transition-all relative",
                  totalBadgeQty > 0 ? "border-primary/40 shadow-md ring-1 ring-primary/20" : "border-border hover:shadow-sm",
                  isAnimating && "scale-[1.02]"
                )}
              >
                <div 
                  className="relative aspect-square bg-muted/20 cursor-pointer"
                  onClick={() => {
                    if (hasRestaurantConfig) {
                      setConfiguratorItem(item);
                      setConfiguratorOpen(true);
                    } else if (hasVariants) {
                      setVariantConfigItem(item);
                      setVariantConfigOpen(true);
                    } else if (item.unitConversions && item.unitConversions.length > 0) {
                      handleOpenInlineAllUnits(item);
                    } else {
                      handleAdd(item.id, undefined, currentUnit);
                    }
                  }}
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl text-muted-foreground/15">
                      {item.emoji || "📦"}
                    </div>
                  )}
                  {totalBadgeQty > 0 && (
                    <div className={cn(
                      "absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground transition-transform z-10",
                      isAnimating && "scale-125"
                    )}>
                      {totalBadgeQty}
                    </div>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-card/90 px-2 py-0.5 text-[9px] font-medium text-muted-foreground backdrop-blur-sm z-10">
                    {(() => {
                      // Calculate total base units in cart for this item
                      let inCartBase = 0;
                      cart.forEach((q, cKey) => {
                        let id = cKey;
                        let unitId = "";
                        const firstColon = cKey.indexOf(":");
                        if (firstColon !== -1) {
                          id = cKey.substring(0, firstColon);
                          const remaining = cKey.substring(firstColon + 1);
                          const secondColon = remaining.indexOf(":");
                          unitId = secondColon !== -1 ? remaining.substring(0, secondColon) : remaining;
                        }
                        if (id === item.id) {
                          const conv = item.unitConversions?.find(c => c.unitId === unitId)?.multiplier || 1;
                          inCartBase += q * conv;
                        }
                      });
                      const remaining = Math.max(0, item.currentStock - inCartBase);
                      return `${remaining.toFixed(remaining % 1 === 0 ? 0 : 1)} ${item.unit} left`;
                    })()}
                  </span>
                  
                  {item.color && (
                    <div 
                      className="absolute top-1.5 left-1.5 h-4 w-4 rounded-full border border-white shadow-sm z-10"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                  <p className="text-xs font-medium leading-tight line-clamp-2 text-foreground">{item.name}</p>
                  
                  {item.textile && (
                    <div className="flex flex-wrap gap-1 mt-0.5 mb-1">
                      {item.textile.fabricContent && (
                        <span className="text-[8px] bg-rose-50 border border-rose-200/50 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400 font-bold px-1 rounded uppercase tracking-wide">
                          {item.textile.fabricContent}
                        </span>
                      )}
                      {item.textile.weaveType && (
                        <span className="text-[8px] bg-amber-50 border border-amber-200/50 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400 font-bold px-1 rounded uppercase tracking-wide">
                          {item.textile.weaveType}
                        </span>
                      )}
                      {item.textile.gsm && (
                        <span className="text-[8px] bg-indigo-50 border border-indigo-200/50 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400 font-bold px-1 rounded uppercase tracking-wide font-mono">
                          {item.textile.gsm} GSM
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="mt-auto pt-1.5">
                    {item.unitConversions && item.unitConversions.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
                          <button
                            type="button"
                            onClick={() => setSelectedUnits({...selectedUnits, [item.id]: item.unit})}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border transition-all active:scale-95 shrink-0",
                              currentUnit === item.unit
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-muted text-muted-foreground border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-800"
                            )}
                          >
                            {item.unit}
                            {(() => {
                              const key = `${item.id}:${item.unit}`;
                              const q = cart.get(key) ?? 0;
                              return q > 0 ? ` (${q})` : "";
                            })()}
                          </button>
                          {item.unitConversions.map(conv => (
                            <button
                              key={conv.unitId}
                              type="button"
                              onClick={() => setSelectedUnits({...selectedUnits, [item.id]: conv.unitId})}
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border transition-all active:scale-95 shrink-0",
                                currentUnit === conv.unitId
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : "bg-muted text-muted-foreground border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-800"
                              )}
                            >
                              {conv.unitId}
                              {(() => {
                                const key = `${item.id}:${conv.unitId}`;
                                const q = cart.get(key) ?? 0;
                                return q > 0 ? ` (${q})` : "";
                              })()}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-0.5">
                          <p className="text-xs font-bold text-foreground">
                            {formatNaira(displayPrice)}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenInlineAllUnits(item)}
                            className="text-[9px] font-bold uppercase text-primary hover:underline bg-primary/10 px-1.5 py-0.5 rounded transition-colors"
                          >
                            All Units
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                         <p className="text-sm font-bold text-foreground">
                            {formatNaira(displayPrice)}
                         </p>
                         {item.unit && item.unit !== "pcs" && (
                           <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">
                             {item.unit}
                           </span>
                         )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stock Warning Message on Direct Card */}
                {isAddDisabled && (
                  <div className="px-2 pb-1 text-center animate-pulse">
                    <span className="text-[9px] text-destructive font-bold bg-destructive/10 px-1.5 py-0.5 rounded-sm">
                      Only {Math.floor(targetAvailableQty)} {currentUnit} left
                    </span>
                  </div>
                )}

                {hasRestaurantConfig || hasVariants ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (hasRestaurantConfig) {
                        setConfiguratorItem(item);
                        setConfiguratorOpen(true);
                      } else {
                        setVariantConfigItem(item);
                        setVariantConfigOpen(true);
                      }
                    }}
                    className="flex h-11 w-full items-center justify-center gap-1.5 border-t border-border text-xs font-bold text-primary hover:bg-primary/[0.03] transition-colors"
                  >
                    <span>Customize</span>
                    {totalBadgeQty > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-extrabold px-1 text-white">
                        {totalBadgeQty}
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center border-t border-border mt-auto">
                    <button
                      type="button"
                      disabled={qty === 0}
                      onPointerDown={(e) => {
                        if (e.pointerType === "mouse" && e.button !== 0) return;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        startLongPress(() => onRemove(item.id, currentUnit));
                      }}
                      onPointerUp={(e) => {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                        stopLongPress();
                      }}
                      onPointerLeave={stopLongPress}
                      onPointerCancel={stopLongPress}
                      className="flex h-11 flex-1 items-center justify-center text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive disabled:opacity-20 active:scale-90"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="flex-1 px-1">
                      <input 
                        type="number"
                        value={qty === 0 ? "" : qty}
                        placeholder="0"
                        onChange={(e) => {
                          let val = parseFloat(e.target.value);
                          if (isNaN(val) || val < 0) val = 0;
                          if (val > targetAvailableQty) val = targetAvailableQty;
                          onAdd(item.id, Number(val.toFixed(2)), currentUnit);
                        }}
                        className="w-full text-center text-sm font-bold font-mono bg-transparent outline-none focus:text-primary transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isAddDisabled}
                      onPointerDown={(e) => {
                        if (e.pointerType === "mouse" && e.button !== 0) return;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        startLongPress(() => handleAdd(item.id, undefined, currentUnit));
                      }}
                      onPointerUp={(e) => {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                        stopLongPress();
                      }}
                      onPointerLeave={stopLongPress}
                      onPointerCancel={stopLongPress}
                      className="flex h-11 flex-1 items-center justify-center text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary disabled:opacity-20 active:scale-90"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed centered floating Sell button */}
      <div className={cn(
        "pointer-events-none fixed inset-x-0 bottom-16 z-40 flex justify-center pb-4 transition-all duration-300",
        totalItems > 0 ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      )}>
        <button
          type="button"
          disabled={totalItems === 0}
          onClick={() => {
            const event = new CustomEvent("pos-go-to-cart");
            window.dispatchEvent(event);
          }}
          className={cn(
            "pointer-events-auto flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-primary-foreground shadow-2xl shadow-primary/30 transition-all hover:scale-105 hover:brightness-110 active:scale-95",
            totalItems === 0 && "opacity-50 cursor-not-allowed"
          )}
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-base font-bold">
            Sell · {NAIRA}{totalNaira.toLocaleString("en-NG", { minimumFractionDigits: 0 })}
          </span>
          <Badge variant="secondary" className="ml-1 h-6 min-w-6 rounded-full px-1.5 text-xs font-bold bg-primary-foreground/20 text-primary-foreground">
            {totalItems}
          </Badge>
        </button>
      </div>

      <DishCustomizerDialog
        open={configuratorOpen}
        onOpenChange={setConfiguratorOpen}
        item={configuratorItem}
        onAddConfigured={(itemId, qty, unitId, configStr) => {
          onAdd(itemId, qty, unitId, configStr);
        }}
      />

      <VariantCustomizerDialog
        open={variantConfigOpen}
        onOpenChange={setVariantConfigOpen}
        item={variantConfigItem}
        onAddConfigured={(itemId, qty, unitId, configStr) => {
          onAdd(itemId, qty, unitId, configStr);
        }}
      />

    </div>
  );
}
