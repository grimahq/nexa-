import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Package, Tag, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_UNITS } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface PendingProduct {
  id: string;
  name: string;
  price: string;
  stock: string;
  unit: string;
  categoryId?: string;
  color?: string;
  sizes?: string;
  enableColours?: boolean;
  enableSizes?: boolean;
  fineTunedVariants?: Record<string, { price: number; stock: number }>;
}

interface OnboardingVariantDialogProps {
  open: boolean;
  onClose: () => void;
  product: PendingProduct;
  onSave: (updatedProduct: PendingProduct) => void;
}

export function OnboardingVariantDialog({ open, onClose, product, onSave }: OnboardingVariantDialogProps) {
  const [enableColours, setEnableColours] = useState(false);
  const [enableSizes, setEnableSizes] = useState(false);
  
  const [availColours, setAvailColours] = useState<string[]>([]);
  const [availSizes, setAvailSizes] = useState<string[]>([]);
  
  const [newColourInput, setNewColourInput] = useState("");
  const [newSizeInput, setNewSizeInput] = useState("");
  
  const [samePriceForVariants, setSamePriceForVariants] = useState(true);
  const [fineTunedVariants, setFineTunedVariants] = useState<Record<string, { price: number; stock: number }>>({});
  
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const [showFineTune, setShowFineTune] = useState(true);

  // Sync state with product when modal opens
  useEffect(() => {
    if (open) {
      const hasColors = !!product.enableColours;
      const hasSizes = !!product.enableSizes;
      setEnableColours(hasColors);
      setEnableSizes(hasSizes);
      setAvailColours(product.color ? product.color.split(", ").filter(Boolean) : ["Red", "Blue", "Black"]);
      setAvailSizes(product.sizes ? product.sizes.split(", ").filter(Boolean) : ["S", "M", "L"]);
      setFineTunedVariants(product.fineTunedVariants || {});
      
      const keys = Object.keys(product.fineTunedVariants || {});
      if (keys.length > 0) {
        const basePrice = Number(product.price) || 0;
        const hasDiffPrice = keys.some(k => product.fineTunedVariants?.[k]?.price !== basePrice);
        setSamePriceForVariants(!hasDiffPrice);
      } else {
        setSamePriceForVariants(true);
      }
    }
  }, [open, product]);

  // Compute Cartesian product variants
  const activeVariants = useMemo(() => {
    const colors = enableColours ? availColours : [];
    const sizes = enableSizes ? availSizes : [];

    const dimensions: string[][] = [];
    if (enableColours && colors.length > 0) dimensions.push(colors);
    if (enableSizes && sizes.length > 0) dimensions.push(sizes);

    if (dimensions.length === 0) return [];

    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce<string[][]>((a, b) => {
        return a.flatMap(d => b.map(e => [...d, e]));
      }, [[]]);
    };

    const combined = cartesian(dimensions);
    return combined.map(arr => arr.join(" - "));
  }, [enableColours, availColours, enableSizes, availSizes]);

  // Handle setting default pricing and stock for new variants
  useEffect(() => {
    if (activeVariants.length === 0) return;
    setFineTunedVariants((prev) => {
      const nextFineTuned = { ...prev };
      let changed = false;
      const basePrice = Number(product.price) || 0;
      const baseStock = Number(product.stock) || 0;
      
      const defaultStockEach = activeVariants.length > 0 ? Math.floor(baseStock / activeVariants.length) : 0;

      activeVariants.forEach((vName) => {
        if (!nextFineTuned[vName]) {
          nextFineTuned[vName] = {
            price: basePrice,
            stock: defaultStockEach || 10,
          };
          changed = true;
        }
      });

      if (changed) {
        return nextFineTuned;
      }
      return prev;
    });
  }, [activeVariants, product.price, product.stock]);

  const handleSave = () => {
    if (!enableColours && !enableSizes) {
      toast.error("Please enable at least Colours or Sizes, or cancel.");
      return;
    }
    
    if (activeVariants.length === 0) {
      toast.error("Please add at least one Colour or Size option.");
      return;
    }

    const filteredFineTuned: Record<string, { price: number; stock: number }> = {};
    let totalStock = 0;
    const basePrice = Number(product.price) || 0;

    activeVariants.forEach((vName) => {
      const val = fineTunedVariants[vName] || { price: basePrice, stock: 10 };
      const priceToSave = samePriceForVariants ? basePrice : (val.price || basePrice);
      filteredFineTuned[vName] = {
        price: priceToSave,
        stock: val.stock || 0
      };
      totalStock += val.stock || 0;
    });

    onSave({
      ...product,
      price: samePriceForVariants ? product.price : (filteredFineTuned[activeVariants[0]]?.price?.toString() || product.price),
      stock: totalStock.toString(),
      color: enableColours ? availColours.join(", ") : "",
      sizes: enableSizes ? availSizes.join(", ") : "",
      enableColours,
      enableSizes,
      fineTunedVariants: filteredFineTuned,
    });

    toast.success("Variants configured successfully!");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md md:max-w-lg p-5 rounded-2xl bg-background border border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">Configure Variants</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create colour and size options with dynamic stock matrices for <strong>{product.name || "this product"}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[380px] overflow-y-auto pr-1">
          {/* Toggles */}
          <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-3">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">Enable Option Dimensions</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEnableColours(!enableColours)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer",
                  enableColours
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-background border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", enableColours ? "bg-background" : "bg-muted-foreground")} />
                Colours
              </button>

              <button
                type="button"
                onClick={() => setEnableSizes(!enableSizes)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer",
                  enableSizes
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-background border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", enableSizes ? "bg-background" : "bg-muted-foreground")} />
                Sizes
              </button>
            </div>
          </div>

          {/* Colours Chips */}
          {enableColours && (
            <div className="space-y-2 animate-in fade-in duration-200 p-3 border border-border rounded-xl bg-background">
              <span className="text-xs font-bold text-foreground">Colours Available</span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {availColours.map((color, idx) => (
                  <span key={idx} className="bg-background border border-border rounded-full pl-3 pr-2 py-1 text-xs font-medium text-foreground inline-flex items-center gap-1.5 shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: color.toLowerCase() }} />
                    {color}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive ml-0.5 text-xs font-bold"
                      onClick={() => setAvailColours(availColours.filter(c => c !== color))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newColourInput}
                  onChange={e => setNewColourInput(e.target.value)}
                  className="h-8 text-xs bg-background"
                  placeholder="e.g. Red, Black, Navy..."
                  onKeyDown={e => {
                    if (e.key === "Enter" && newColourInput.trim()) {
                      e.preventDefault();
                      if (!availColours.includes(newColourInput.trim())) {
                        setAvailColours([...availColours, newColourInput.trim()]);
                      }
                      setNewColourInput("");
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => {
                    if (newColourInput.trim()) {
                      if (!availColours.includes(newColourInput.trim())) {
                        setAvailColours([...availColours, newColourInput.trim()]);
                      }
                      setNewColourInput("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Sizes Chips */}
          {enableSizes && (
            <div className="space-y-2 animate-in fade-in duration-200 p-3 border border-border rounded-xl bg-background">
              <span className="text-xs font-bold text-foreground">Sizes Available</span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {availSizes.map((sz, idx) => (
                  <span key={idx} className="bg-background border border-border rounded-full px-3 py-1 text-xs font-medium text-foreground inline-flex items-center gap-1.5 shadow-sm">
                    {sz}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive text-xs font-bold"
                      onClick={() => setAvailSizes(availSizes.filter(s => s !== sz))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSizeInput}
                  onChange={e => setNewSizeInput(e.target.value)}
                  className="h-8 text-xs bg-background"
                  placeholder="e.g. S, XL, 42..."
                  onKeyDown={e => {
                    if (e.key === "Enter" && newSizeInput.trim()) {
                      e.preventDefault();
                      if (!availSizes.includes(newSizeInput.trim())) {
                        setAvailSizes([...availSizes, newSizeInput.trim()]);
                      }
                      setNewSizeInput("");
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => {
                    if (newSizeInput.trim()) {
                      if (!availSizes.includes(newSizeInput.trim())) {
                        setAvailSizes([...availSizes, newSizeInput.trim()]);
                      }
                      setNewSizeInput("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Fine-Tuning Price Toggle & Matrix */}
          {activeVariants.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="samePriceOnboarding"
                    checked={samePriceForVariants}
                    onChange={(e) => setSamePriceForVariants(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="samePriceOnboarding" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                    Same price for all variants
                  </label>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold font-mono">
                  {activeVariants.length} Variants
                </span>
              </div>

              {/* Collapsible fine-tune header */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowFineTune(!showFineTune)}
                  className="flex items-center justify-between w-full text-xs font-bold text-primary pb-2"
                >
                  <span>📊 Fine-tune Variant Matrices</span>
                  {showFineTune ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {showFineTune && (
                  <div className="max-h-[180px] overflow-y-auto space-y-2 mt-1 pr-1 border border-border rounded-xl p-2 bg-muted/10">
                    {activeVariants.map((vName, vIdx) => {
                      const isExpanded = !!expandedVariants[vName];
                      const currentVal = fineTunedVariants[vName] || {
                        price: Number(product.price) || 0,
                        stock: 10,
                      };

                      return (
                        <div key={vIdx} className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
                          <button
                            type="button"
                            onClick={() => setExpandedVariants(prev => ({ ...prev, [vName]: !prev[vName] }))}
                            className="flex items-center justify-between w-full p-2 text-xs hover:bg-accent/10 transition-colors border-b border-border"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-foreground truncate text-left">{vName}</span>
                              <span className="text-[10px] text-primary font-mono font-bold shrink-0">
                                ₦{samePriceForVariants ? (Number(product.price) || 0) : currentVal.price} · Stock: {currentVal.stock}
                              </span>
                            </div>
                            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isExpanded ? "rotate-180" : "")} />
                          </button>

                          {isExpanded && (
                            <div className="p-3 space-y-2 border-t border-border bg-muted/5 animate-in slide-in-from-top-1 duration-150">
                              <div className="grid grid-cols-2 gap-2.5">
                                {!samePriceForVariants && (
                                  <div>
                                    <label className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">Price (₦)</label>
                                    <Input
                                      type="number"
                                      value={currentVal.price || ""}
                                      onChange={(e) => {
                                        setFineTunedVariants({
                                          ...fineTunedVariants,
                                          [vName]: { ...currentVal, price: Number(e.target.value) || 0 }
                                        });
                                      }}
                                      className="h-8 text-xs font-mono bg-background"
                                    />
                                  </div>
                                )}
                                <div className={cn(samePriceForVariants ? "col-span-2" : "")}>
                                  <label className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">Stock</label>
                                  <Input
                                    type="number"
                                    value={currentVal.stock ?? ""}
                                    onChange={(e) => {
                                      setFineTunedVariants({
                                        ...fineTunedVariants,
                                        [vName]: { ...currentVal, stock: Number(e.target.value) || 0 }
                                      });
                                    }}
                                    className="h-8 text-xs font-mono bg-background"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-border flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl h-9">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="rounded-xl h-9 px-4">
            Save Options
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface BulkProductEntryProps {
  products: PendingProduct[];
  setProducts: React.Dispatch<React.SetStateAction<PendingProduct[]>>;
  categories: { id: string; label: string; emoji: string; supportedUnits?: string[] }[];
}

export function BulkProductEntry({ products, setProducts, categories }: BulkProductEntryProps) {
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<PendingProduct | null>(null);

  const addRow = () => {
    const firstCat = categories[0];
    const defaultUnit = firstCat?.supportedUnits && firstCat.supportedUnits.length > 0 
      ? firstCat.supportedUnits[0] 
      : "pcs";
    setProducts((prev) => [
      ...prev,
      { 
        id: Math.random().toString(36).substring(2, 9), 
        name: "", 
        price: "", 
        stock: "", 
        unit: defaultUnit,
        categoryId: firstCat?.id || ""
      },
    ]);
  };

  const removeRow = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateRow = (id: string, field: keyof PendingProduct, value: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const updateRowCategory = (id: string, newCatId: string) => {
    const catObj = categories.find(c => c.id === newCatId);
    let newUnit = "pcs";
    if (catObj?.supportedUnits && catObj.supportedUnits.length > 0) {
      newUnit = catObj.supportedUnits[0];
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, categoryId: newCatId, unit: newUnit } : p))
    );
  };

  const handleSaveVariants = (updatedProduct: PendingProduct) => {
    setProducts((prev) => prev.map((p) => p.id === updatedProduct.id ? updatedProduct : p));
  };

  return (
    <div className="space-y-4">
      {/* Scrollable Container with Custom Styling */}
      <div className="max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        {products.length > 0 && (
          <div className="space-y-3">
            {/* Desktop Header Grid (Hidden on Mobile) */}
            <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.2fr_1fr_1fr_1.2fr_40px] gap-3 px-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              <div>Product Name</div>
              <div>Category</div>
              <div>Price (₦)</div>
              <div>Stock</div>
              <div>Unit</div>
              <div>Options</div>
              <div className="text-center"></div>
            </div>

            {/* Product list items */}
            {products.map((p) => {
              const currentCategoryVal = p.categoryId || categories[0]?.id || "";
              const catObj = categories.find(c => c.id === currentCategoryVal);
              const allowedUnits = catObj?.supportedUnits && catObj.supportedUnits.length > 0
                ? SUPPORTED_UNITS.filter((u) => catObj.supportedUnits!.includes(u.id))
                : SUPPORTED_UNITS;
              
              return (
                <div 
                  key={p.id} 
                  className="group flex flex-col gap-3 md:grid md:grid-cols-[2fr_1.5fr_1.2fr_1fr_1fr_1.2fr_40px] md:gap-3 rounded-xl border border-muted-foreground/15 md:border-transparent p-4 md:p-1 relative transition-all duration-200 hover:border-primary/25 md:hover:bg-accent/10 md:rounded-lg"
                >
                  {/* Delete button absolute positioned on mobile, column on inline desktop */}
                  <div className="absolute top-2 right-2 md:relative md:top-auto md:right-auto md:order-last md:flex md:items-center md:justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(p.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100"
                      title="Remove product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Product Name File */}
                  <div className="space-y-1 md:space-y-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block md:hidden">Product Name</span>
                    <Input
                      value={p.name}
                      onChange={(e) => updateRow(p.id, "name", e.target.value)}
                      placeholder="e.g. Silk Shirt"
                      className="h-10 text-sm rounded-xl focus-visible:ring-primary/20"
                    />
                  </div>

                  {/* Category dropdown */}
                  <div className="space-y-1 md:space-y-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block md:hidden">Category</span>
                    <Select 
                      value={currentCategoryVal} 
                      onValueChange={(v) => updateRowCategory(p.id, v)}
                    >
                      <SelectTrigger className="h-10 text-xs rounded-xl focus:ring-primary/20 bg-background">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs py-2">
                            <span className="mr-2">{c.emoji}</span>
                            <span>{c.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price */}
                  <div className="space-y-1 md:space-y-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block md:hidden">Price (₦)</span>
                    <div className="relative">
                      <Input
                        type="number"
                        value={p.price}
                        disabled={p.enableColours || p.enableSizes}
                        onChange={(e) => updateRow(p.id, "price", e.target.value)}
                        placeholder="2500"
                        className="h-10 text-sm font-mono padded-price rounded-xl focus-visible:ring-primary/20 pl-6 disabled:opacity-75 disabled:bg-muted/10"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">₦</span>
                    </div>
                  </div>

                  {/* Stock */}
                  <div className="space-y-1 md:space-y-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block md:hidden">Stock</span>
                    <Input
                      type="number"
                      value={p.stock}
                      disabled={p.enableColours || p.enableSizes}
                      onChange={(e) => updateRow(p.id, "stock", e.target.value)}
                      placeholder="100"
                      className="h-10 text-sm font-mono rounded-xl focus-visible:ring-primary/20 disabled:opacity-75 disabled:bg-muted/10"
                    />
                  </div>

                  {/* Unit */}
                  <div className="space-y-1 md:space-y-0">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block md:hidden">Unit</span>
                    <Select 
                      value={p.unit} 
                      onValueChange={(v) => updateRow(p.id, "unit", v)}
                    >
                      <SelectTrigger className="h-10 text-xs rounded-xl focus:ring-primary/20 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">
                            {u.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Options Button */}
                  <div className="space-y-1 md:space-y-0 flex items-end">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block md:hidden">Options</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProductForVariants(p)}
                      disabled={p.name.trim() === ""}
                      className={cn(
                        "h-10 text-xs rounded-xl flex items-center justify-center gap-1 w-full md:w-full",
                        p.enableColours || p.enableSizes
                          ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/50"
                          : "border-muted-foreground/20 text-muted-foreground hover:bg-muted/10"
                      )}
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {p.enableColours || p.enableSizes ? (
                        <span>
                          {p.fineTunedVariants ? Object.keys(p.fineTunedVariants).length : 0} Var
                        </span>
                      ) : (
                        <span>Add Var</span>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-2xl bg-muted/12">
            <Package className="h-10 w-10 text-muted-foreground/30 mb-3 animate-pulse" />
            <p className="text-sm font-medium text-foreground">No products added yet.</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Click below to start populating your catalog manually.</p>
            <Button variant="outline" size="sm" onClick={addRow} className="rounded-xl">
              Add first product
            </Button>
          </div>
        )}
      </div>

      {/* Styled Add Row Button */}
      <button
        type="button"
        onClick={addRow}
        className="w-full h-11 py-2 px-4 flex items-center justify-center gap-2 border border-dashed border-muted-foreground/30 hover:border-primary/50 rounded-xl bg-background hover:bg-accent/40 active:scale-[0.98] transition-all text-xs font-semibold shadow-sm text-foreground/80 hover:text-foreground"
      >
        <Plus className="h-4 w-4 text-muted-foreground" /> Add Row
      </button>

      {/* Onboarding Variant Configuration Dialog */}
      {selectedProductForVariants && (
        <OnboardingVariantDialog
          open={!!selectedProductForVariants}
          onClose={() => setSelectedProductForVariants(null)}
          product={selectedProductForVariants}
          onSave={handleSaveVariants}
        />
      )}
    </div>
  );
}
