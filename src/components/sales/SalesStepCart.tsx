import { useCallback } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Item } from "@/types/inventory";

const NAIRA = "₦";
const USD_TO_NGN = 1;

function fmtNgn(usd: number, qty: number = 1): string {
  const ngn = usd * USD_TO_NGN * qty;
  return `${NAIRA}${ngn.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

export interface CartItem {
  item: Item;
  quantity: number;
  selectedUnit?: string;
  calculatedUnitPrice?: number;
  configStr?: string;
}

interface SalesStepCartProps {
  items: CartItem[];
  onAdd: (id: string, qty?: number, unitId?: string, configStr?: string) => void;
  onRemove: (id: string, unitId?: string, configStr?: string) => void;
  onClear: () => void;
  onNext: () => void;
  packagingFee?: number;
  estimatedReadyTime?: number;
  pricingMode?: "single" | "tiered";
  activeTier?: "retail" | "wholesale" | "distributor";
  onChangeTier?: (tier: "retail" | "wholesale" | "distributor") => void;
  onOverridePrice?: (uniqueKey: string, newPrice: number) => void;
}

export function SalesStepCart({
  items,
  onAdd,
  onRemove,
  onClear,
  onNext,
  packagingFee = 0,
  estimatedReadyTime = 0,
  pricingMode = "single",
  activeTier = "retail",
  onChangeTier,
  onOverridePrice,
}: SalesStepCartProps) {
  const total = items.reduce((s, ci) => s + (ci.calculatedUnitPrice ?? ci.item.sellingPrice) * USD_TO_NGN * ci.quantity, 0) + packagingFee;

  // Core stock guard utility for cart review phase
  const getAvailableTargetQty = useCallback((item: Item, targetUnitId: string) => {
    let consumedBaseUnits = 0;
    items.forEach((ci) => {
      if (ci.item.id === item.id) {
        const unitId = ci.selectedUnit || item.unit;
        if (unitId !== targetUnitId) {
          const multiplier = unitId === item.unit
            ? 1
            : item.unitConversions?.find(c => c.unitId === unitId)?.multiplier || 1;
          consumedBaseUnits += ci.quantity * multiplier;
        }
      }
    });

    const availableBaseStock = Math.max(0, item.currentStock - consumedBaseUnits);
    const targetMultiplier = targetUnitId === item.unit
      ? 1
      : item.unitConversions?.find(c => c.unitId === targetUnitId)?.multiplier || 1;
    
    return availableBaseStock / targetMultiplier;
  }, [items]);
  
  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <div className="rounded-full bg-muted p-5">
          <Trash2 className="h-7 w-7" />
        </div>
        <p className="text-sm font-medium">Cart is empty</p>
        <p className="text-xs">Go back and add some products</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {pricingMode === "tiered" && onChangeTier && activeTier && (
        <div className="px-4 py-2.5 bg-emerald-500/5 dark:bg-emerald-500/10 border-b border-border flex items-center justify-between gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Active Customer Pricing Tier:
          </span>
          <select
            value={activeTier}
            onChange={(e) => onChangeTier(e.target.value as "retail" | "wholesale" | "distributor")}
            className="text-xs font-extrabold h-8 px-2 bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary text-emerald-600 dark:text-emerald-400"
          >
            <option value="retail">Retail Tier</option>
            <option value="wholesale">Wholesale Tier</option>
            <option value="distributor">Distributor Tier</option>
          </select>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {items.map((ci) => {
          const unitPrice = ci.calculatedUnitPrice ?? ci.item.sellingPrice;
          const displayUnit = ci.selectedUnit || ci.item.unit;
          const uniqueKey = ci.configStr 
            ? `${ci.item.id}:${displayUnit}:${ci.configStr}` 
            : `${ci.item.id}:${displayUnit}`;

          return (
            <div key={uniqueKey} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted/50">
                {ci.item.imageUrl ? (
                  <img src={ci.item.imageUrl} alt={ci.item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">{ci.item.emoji || "📦"}</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ci.item.name}</p>
                {ci.configStr && (() => {
                  try {
                    const config = JSON.parse(ci.configStr);
                    const parts = [];
                    if (config.portion) parts.push(config.portion.name);
                    if (config.color) parts.push(config.color);
                    if (config.size) parts.push(`Size ${config.size}`);
                    if (config.proteins && config.proteins.length > 0) {
                      parts.push(config.proteins.map((p: { name: string }) => p.name).join("+"));
                    }
                    if (config.spiceLevel) parts.push(config.spiceLevel);
                    if (config.swallowType) parts.push(config.swallowType);
                    if (config.comboSelections && config.comboSelections.length > 0) {
                      parts.push(config.comboSelections.map((c: { itemName: string }) => `${c.itemName}`).join(", "));
                    }
                    if (config.note) parts.push(`"${config.note}"`);
                    return parts.length > 0 ? (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                        {parts.join(" · ")}
                      </p>
                    ) : null;
                  } catch (e) {
                     return null;
                  }
                })()}
                {ci.item.textile && (
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-tight mt-0.5">
                    {ci.item.textile.fabricContent || "Fabric"}{ci.item.textile.weaveType ? ` · ${ci.item.textile.weaveType}` : ""}{ci.item.textile.gsm ? ` · ${ci.item.textile.gsm} GSM` : ""}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs text-muted-foreground">₦</span>
                    <input
                      type="number"
                      value={unitPrice}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        onOverridePrice?.(uniqueKey, val);
                      }}
                      className="w-16 h-5 text-xs font-bold font-mono bg-muted/40 hover:bg-muted/75 rounded border border-border/50 text-slate-800 dark:text-slate-100 text-center focus:ring-1 focus:ring-primary focus:bg-background outline-none transition-colors"
                    />
                  </div>
                  
                  {ci.item.unitConversions && ci.item.unitConversions.length > 0 ? (
                    <select
                      value={displayUnit}
                      onChange={(e) => {
                        const newUnit = e.target.value;
                        const oldUnit = ci.selectedUnit || ci.item.unit;
                        
                        if (newUnit === oldUnit) return;

                        // Calculate conversion
                        const oldConv = ci.item.unitConversions?.find(c => c.unitId === oldUnit)?.multiplier || 1;
                        const newConv = ci.item.unitConversions?.find(c => c.unitId === newUnit)?.multiplier || 1;
                        let newQty = Number((ci.quantity * (oldConv / newConv)).toFixed(2));

                        // Ensure transition doesn't exceed maximum stock limits
                        const maxAllowed = getAvailableTargetQty(ci.item, newUnit);
                        if (newQty > maxAllowed) {
                          newQty = Number(maxAllowed.toFixed(2));
                        }

                        onRemove(ci.item.id, ci.selectedUnit, ci.configStr);
                        onAdd(ci.item.id, newQty, newUnit, ci.configStr);
                      }}
                      className="h-5 px-1 text-[9px] uppercase font-bold bg-muted border border-muted-foreground/30 rounded outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value={ci.item.unit}>{ci.item.unit}</option>
                      {ci.item.unitConversions.map(c => (
                        <option key={c.unitId} value={c.unitId}>{c.unitId}</option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase font-bold text-muted-foreground border-muted-foreground/30">
                      {displayUnit}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-col sm:flex-row items-end">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onRemove(ci.item.id, ci.selectedUnit, ci.configStr)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors animate-none"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  
                  {ci.item.unitType === "count" ? (
                    <span className="min-w-7 text-center text-sm font-semibold font-mono">{ci.quantity}</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={ci.quantity || ""}
                        onChange={(e) => {
                          let val = parseFloat(e.target.value) || 0;
                          if (val < 0) val = 0;
                          const maxAllowed = getAvailableTargetQty(ci.item, displayUnit);
                          if (val > maxAllowed) val = maxAllowed;
                          onAdd(ci.item.id, Number(val.toFixed(2)), ci.selectedUnit, ci.configStr);
                        }}
                        className="w-12 bg-muted px-1.5 py-1 rounded text-center text-xs font-bold font-mono outline-none focus:ring-1 focus:ring-primary"
                        placeholder="0"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onAdd(ci.item.id, undefined, ci.selectedUnit, ci.configStr)}
                    disabled={(() => {
                      const maxAllowed = getAvailableTargetQty(ci.item, displayUnit);
                      return ci.quantity >= maxAllowed;
                    })()}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-30 transition-colors animate-none"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {(() => {
                  const maxAllowed = getAvailableTargetQty(ci.item, displayUnit);
                  if (ci.quantity >= maxAllowed) {
                    return (
                      <span className="text-[8px] text-destructive font-bold uppercase tracking-tighter">
                        Max Stock
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>

              <p className="min-w-20 text-right text-sm font-semibold font-mono">{fmtNgn(unitPrice, ci.quantity)}</p>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="px-4 py-4 space-y-3 bg-muted/10">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Subtotal ({items.length} item{items.length !== 1 && "s"})</span>
          <span className="font-mono">{NAIRA}{(total - packagingFee).toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
        </div>

        {packagingFee > 0 && (
          <div className="flex items-center justify-between text-xs text-primary font-bold">
            <span>Container Packaging Surcharge</span>
            <span className="font-mono">+{NAIRA}{packagingFee.toLocaleString("en-NG")}</span>
          </div>
        )}

        {estimatedReadyTime > 0 && (
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-bold border-b border-border/40 pb-2">
            <span>Expected Cooking Ready Time</span>
            <span>~{estimatedReadyTime} minutes</span>
          </div>
        )}

        <div className="flex items-center justify-between text-base font-black">
          <span>Amount Due</span>
          <span className="font-mono text-primary">{NAIRA}{total.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
        </div>
        <Button onClick={onNext} className="w-full h-11 rounded-xl font-bold tracking-tight text-sm" size="lg">
          Proceed to Checkout
        </Button>
        <Button variant="ghost" size="sm" className="w-full text-destructive text-xs py-1" onClick={onClear}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear cart
        </Button>
      </div>
    </div>
  );
}
