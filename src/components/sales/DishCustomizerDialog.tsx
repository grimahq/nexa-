import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Flame, Info, Check, Plus, Minus, ChefHat, ChevronDown } from "lucide-react";
import type { Item } from "@/types/inventory";
import { cn } from "@/lib/utils";

const NAIRA = "₦";

interface DishCustomizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onAddConfigured: (itemId: string, qty: number, unitId: string, configString: string) => void;
}

export function DishCustomizerDialog({
  open,
  onOpenChange,
  item,
  onAddConfigured,
}: DishCustomizerDialogProps) {
  const [portion, setPortion] = useState<{ name: string; price: number } | null>(null);
  const [selectedProteins, setSelectedProteins] = useState<{ name: string; price: number }[]>([]);
  const [spiceLevel, setSpiceLevel] = useState<string>("");
  const [kitchenNote, setKitchenNote] = useState("");
  const [swallowType, setSwallowType] = useState<string>("");
  const [qty, setQty] = useState(1);

  // Combo slot selections: slotName -> selection
  const [comboSelections, setComboSelections] = useState<Record<string, { itemName: string; priceModifier: number }>>({});

  useEffect(() => {
    if (item && open) {
      // Default to first portion size if available
      if (item.restaurant?.portionSizes && item.restaurant.portionSizes.length > 0) {
        setPortion(item.restaurant.portionSizes[0]);
      } else {
        setPortion({ name: "Regular", price: item.sellingPrice });
      }

      // Default to first spice level
      if (item.restaurant?.spiceLevels && item.restaurant.spiceLevels.length > 0) {
        setSpiceLevel(item.restaurant.spiceLevels[0]);
      } else {
        setSpiceLevel(item.restaurant?.spiceLevel || "");
      }

      // Default swallow type if jollof/egusi/semovita etc
      if (item.name.toLowerCase().includes("yam") || item.name.toLowerCase().includes("egusi") || item.name.toLowerCase().includes("soup")) {
        setSwallowType("Pounded Yam");
      } else {
        setSwallowType("");
      }

      // Setup default selections for combo slots
      if (item.restaurant?.isCombo && item.restaurant?.comboSlots) {
        const defaults: Record<string, { itemName: string; priceModifier: number }> = {};
        
        item.restaurant.comboSlots.forEach(slot => {
          if (slot.name.toLowerCase().includes("protein") || slot.name.toLowerCase().includes("meat")) {
            defaults[slot.name] = { itemName: "Chicken", priceModifier: 0 };
          } else if (slot.name.toLowerCase().includes("drink") || slot.name.toLowerCase().includes("beverage")) {
            defaults[slot.name] = { itemName: "Coke", priceModifier: 0 };
          } else {
            defaults[slot.name] = { itemName: "Standard Choice", priceModifier: 0 };
          }
        });
        setComboSelections(defaults);
      } else {
        setComboSelections({});
      }

      setSelectedProteins([]);
      setKitchenNote("");
      setQty(1);
    }
  }, [item, open]);

  if (!item) return null;

  const isSwallowDish = item.name.toLowerCase().includes("yam") || item.name.toLowerCase().includes("egusi") || item.name.toLowerCase().includes("soup") || item.name.toLowerCase().includes("draw");

  // Calculate live price
  const calculateLivePrice = () => {
    let basePrice = portion ? portion.price : item.sellingPrice;
    
    // Addons price
    const proteinSum = selectedProteins.reduce((s, p) => s + p.price, 0);
    basePrice += proteinSum;

    // Combo slot price modifiers
    const comboModifiersSum = Object.values(comboSelections).reduce((s, cs) => s + cs.priceModifier, 0);
    basePrice += comboModifiersSum;

    return basePrice * qty;
  };

  const handleProteinToggle = (protein: { name: string; price: number }, checked: boolean) => {
    if (checked) {
      setSelectedProteins((prev) => [...prev, protein]);
    } else {
      setSelectedProteins((prev) => prev.filter((p) => p.name !== protein.name));
    }
  };

  const handleAddValue = () => {
    const config = {
      portion,
      proteins: selectedProteins,
      spiceLevel: spiceLevel || undefined,
      note: kitchenNote.trim() || undefined,
      swallowType: isSwallowDish ? swallowType : undefined,
      comboSelections: item.restaurant?.isCombo
        ? Object.entries(comboSelections).map(([slotName, sel]) => ({
            slotName,
            itemName: sel.itemName,
            priceModifier: sel.priceModifier,
          }))
        : undefined,
    };

    const configString = JSON.stringify(config);
    onAddConfigured(item.id, qty, item.unit, configString);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border border-border p-6 shadow-2xl bg-card">
        <DialogHeader className="pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-2xl border border-orange-200/50">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight text-foreground">{item.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configure dish, select portions, and add live kitchen instructions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Portion Selection (Size) */}
          {item.restaurant?.portionSizes && item.restaurant.portionSizes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Portion Size (Required)</Label>
              <RadioGroup
                value={portion?.name}
                onValueChange={(val) => {
                  const selected = item.restaurant?.portionSizes?.find((p) => p.name === val);
                  if (selected) setPortion(selected);
                }}
                className="grid grid-cols-2 gap-2"
              >
                {item.restaurant.portionSizes.map((p) => (
                  <div key={p.name}>
                    <RadioGroupItem value={p.name} id={`portion-${p.name}`} className="sr-only" />
                    <Label
                      htmlFor={`portion-${p.name}`}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border bg-card/40 cursor-pointer transition-all hover:bg-muted/30 hover:border-primary/50 text-center",
                        portion?.name === p.name
                          ? "border-primary bg-primary/5 text-primary shadow-xs ring-1 ring-primary/30"
                          : "border-border text-foreground"
                      )}
                    >
                      <span className="text-sm font-bold">{p.name}</span>
                      <span className="text-xs text-muted-foreground font-mono mt-1">{NAIRA}{p.price.toLocaleString("en-NG")}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Combo slots mini pickers */}
          {item.restaurant?.isCombo && item.restaurant.comboSlots && item.restaurant.comboSlots.length > 0 && (
            <div className="space-y-4 rounded-2xl border border-amber-200/40 bg-amber-50/10 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 block mb-1">Combo Builder Slots</span>
              {item.restaurant.comboSlots.map((slot) => {
                const isProtein = slot.name.toLowerCase().includes("protein") || slot.name.toLowerCase().includes("meat");
                const isDrink = slot.name.toLowerCase().includes("drink") || slot.name.toLowerCase().includes("beverage");
                
                const currentSelection = comboSelections[slot.name]?.itemName || "";

                return (
                  <div key={slot.name} className="space-y-2 border-b border-border/45 last:border-0 pb-3 last:pb-0">
                    <Label className="text-xs font-semibold text-foreground/85 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {slot.name}
                    </Label>
                    <div className="relative">
                      <select
                        value={currentSelection}
                        onChange={(e) => {
                          const val = e.target.value;
                          let mod = 0;
                          if (isProtein) {
                            const found = [
                              { name: "Chicken", mod: 0 },
                              { name: "Beef", mod: 0 },
                              { name: "Fish", mod: 300 }
                            ].find(o => o.name === val);
                            if (found) mod = found.mod;
                          } else if (isDrink) {
                            const found = [
                              { name: "Coke", mod: 0 },
                              { name: "Fanta", mod: 0 },
                              { name: "Sprite", mod: 0 },
                              { name: "Fresh Juice", mod: 500 }
                            ].find(o => o.name === val);
                            if (found) mod = found.mod;
                          } else {
                            const found = [
                              { name: "Standard Choice", mod: 0 },
                              { name: "Premium Choice", mod: 400 }
                            ].find(o => o.name === val);
                            if (found) mod = found.mod;
                          }
                          setComboSelections(prev => ({
                            ...prev,
                            [slot.name]: { itemName: val, priceModifier: mod }
                          }));
                        }}
                        className="w-full text-xs font-semibold h-9 rounded-xl border border-input bg-card pl-3 pr-8 py-1.5 focus:ring-1 focus:ring-primary focus:outline-none appearance-none cursor-pointer text-foreground shadow-sm"
                      >
                        <option value="">-- Choose {slot.name} --</option>
                        {isProtein ? (
                          [
                            { name: "Chicken", mod: 0 },
                            { name: "Beef", mod: 0 },
                            { name: "Fish", mod: 300 }
                          ].map(opt => (
                            <option key={opt.name} value={opt.name}>
                              {opt.name} {opt.mod > 0 ? `(+${NAIRA}${opt.mod})` : " (Included)"}
                            </option>
                          ))
                        ) : isDrink ? (
                          [
                            { name: "Coke", mod: 0 },
                            { name: "Fanta", mod: 0 },
                            { name: "Sprite", mod: 0 },
                            { name: "Fresh Juice", mod: 500 }
                          ].map(opt => (
                            <option key={opt.name} value={opt.name}>
                              {opt.name} {opt.mod > 0 ? `(+${NAIRA}${opt.mod})` : " (Included)"}
                            </option>
                          ))
                        ) : (
                          [
                            { name: "Standard Choice", mod: 0 },
                            { name: "Premium Choice", mod: 400 }
                          ].map(opt => (
                            <option key={opt.name} value={opt.name}>
                              {opt.name} {opt.mod > 0 ? `(+${NAIRA}${opt.mod})` : " (Included)"}
                            </option>
                          ))
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground">
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Optional Add-ons (Protein, Extra topping...) */}
          {item.restaurant?.proteinAddons && item.restaurant.proteinAddons.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add Protein / Extras (Optional)</Label>
              <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-muted/10 p-3">
                {item.restaurant.proteinAddons.map((p) => {
                  const isChecked = selectedProteins.some((sp) => sp.name === p.name);
                  return (
                    <div key={p.name} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center space-x-2.5">
                        <Checkbox
                          id={`protein-${p.name}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => handleProteinToggle(p, !!checked)}
                          className="rounded-md"
                        />
                        <Label htmlFor={`protein-${p.name}`} className="text-sm font-medium text-foreground cursor-pointer">
                          {p.name}
                        </Label>
                      </div>
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        {p.price > 0 ? `+${NAIRA}${p.price.toLocaleString("en-NG")}` : "Free"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Spice Level (free horizontal chips) */}
          {item.restaurant?.spiceLevels && item.restaurant.spiceLevels.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Spice Preferences</Label>
              <div className="flex flex-wrap gap-1.5">
                {item.restaurant.spiceLevels.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSpiceLevel(level)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                      spiceLevel === level
                        ? "bg-red-500 border-red-500 text-white shadow-xs"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Flame className={cn("h-3.5 w-3.5", spiceLevel === level ? "text-white animate-pulse" : "text-amber-500")} />
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Swallow Choice (for swallow dishes) */}
          {isSwallowDish && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Choose Swallow Companion</Label>
              <div className="flex gap-1.5">
                {["Pounded Yam", "Eba (Garri)", "Semo", "Amala"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSwallowType(type)}
                    className={cn(
                      "flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center",
                      swallowType === type
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground/30"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kitchen note free-text */}
          {item.restaurant?.allowKitchenNotes && (
            <div className="space-y-2">
              <Label htmlFor="kitchen-note" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kitchen Instructions</Label>
              <Input
                id="kitchen-note"
                placeholder='e.g., "no onions", "extra spicy", "separate plates"'
                value={kitchenNote}
                onChange={(e) => setKitchenNote(e.target.value)}
                className="rounded-xl border border-border h-11 text-xs"
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-8 pt-4 border-t border-border/60 flex flex-row items-center justify-between gap-4">
          {/* Quantity selector */}
          <div className="flex items-center gap-3 bg-muted/40 border border-border p-1.5 rounded-2xl">
            <button
              type="button"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-8 w-8 rounded-xl bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all border border-border"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold font-mono min-w-6 text-center">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="h-8 w-8 rounded-xl bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all border border-border"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <Button
            onClick={handleAddValue}
            className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold tracking-tight text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <Check className="h-4 w-4" />
            Add to order · {NAIRA}{calculateLivePrice().toLocaleString("en-NG", { minimumFractionDigits: 0 })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
