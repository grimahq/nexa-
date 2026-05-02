import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Item } from "@/types/inventory";

const NAIRA = "₦";
const USD_TO_NGN = 1_580;

function fmtNgn(usd: number, qty: number = 1): string {
  const ngn = usd * USD_TO_NGN * qty;
  return `${NAIRA}${ngn.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

export interface CartItem {
  item: Item;
  quantity: number;
  selectedUnit?: string;
  calculatedUnitPrice?: number;
}

interface SalesStepCartProps {
  items: CartItem[];
  onAdd: (id: string, qty?: number, unitId?: string) => void;
  onRemove: (id: string, unitId?: string) => void;
  onClear: () => void;
  onNext: () => void;
}

export function SalesStepCart({ items, onAdd, onRemove, onClear, onNext }: SalesStepCartProps) {
  const total = items.reduce((s, ci) => s + (ci.calculatedUnitPrice ?? ci.item.sellingPrice) * USD_TO_NGN * ci.quantity, 0);
  
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
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {items.map((ci) => {
          const unitPrice = ci.calculatedUnitPrice ?? ci.item.sellingPrice;
          const displayUnit = ci.selectedUnit || ci.item.unit;
          const uniqueKey = `${ci.item.id}:${displayUnit}`;

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
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-muted-foreground">
                    {fmtNgn(unitPrice)} per
                  </p>
                  <Badge variant="outline" className="h-4 px-1 text-[9px] uppercase font-bold text-muted-foreground border-muted-foreground/30">
                    {displayUnit}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onRemove(ci.item.id, ci.selectedUnit)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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
                      onChange={(e) => onAdd(ci.item.id, parseFloat(e.target.value) || 0, ci.selectedUnit)}
                      className="w-12 bg-muted px-1.5 py-1 rounded text-center text-xs font-bold font-mono outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onAdd(ci.item.id, undefined, ci.selectedUnit)}
                  disabled={ci.quantity >= ci.item.currentStock}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-30 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="min-w-20 text-right text-sm font-semibold font-mono">{fmtNgn(unitPrice, ci.quantity)}</p>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{items.length} line item{items.length !== 1 && "s"}</span>
          <span className="font-mono">{NAIRA}{total.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
        </div>
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Amount Due</span>
          <span className="font-mono">{NAIRA}{total.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
        </div>
        <Button onClick={onNext} className="w-full" size="lg">
          Proceed to Checkout
        </Button>
        <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={onClear}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear cart
        </Button>
      </div>
    </div>
  );
}
