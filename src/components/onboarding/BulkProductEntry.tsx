import { Plus, Trash2, Package, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_UNITS } from "@/types/inventory";

export interface PendingProduct {
  id: string;
  name: string;
  price: string;
  stock: string;
  unit: string;
  categoryId?: string;
}

interface BulkProductEntryProps {
  products: PendingProduct[];
  setProducts: React.Dispatch<React.SetStateAction<PendingProduct[]>>;
  categories: { id: string; label: string; emoji: string; supportedUnits?: string[] }[];
}

export function BulkProductEntry({ products, setProducts, categories }: BulkProductEntryProps) {
  
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

  return (
    <div className="space-y-4">
      {/* Scrollable Container with Custom Styling */}
      <div className="max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        {products.length > 0 && (
          <div className="space-y-3">
            {/* Desktop Header Grid (Hidden on Mobile) */}
            <div className="hidden md:grid grid-cols-[2.5fr_2fr_1.5fr_1.2fr_1.2fr_40px] gap-3 px-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              <div>Product Name</div>
              <div>Category</div>
              <div>Price (₦)</div>
              <div>Stock</div>
              <div>Unit</div>
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
                  className="group flex flex-col gap-3 md:grid md:grid-cols-[2.5fr_2fr_1.5fr_1.2fr_1.2fr_40px] md:gap-3 rounded-xl border border-muted-foreground/15 md:border-transparent p-4 md:p-1 relative transition-all duration-200 hover:border-primary/25 md:hover:bg-accent/10 md:rounded-lg"
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
                      placeholder="e.g. Basmati Rice"
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
                        onChange={(e) => updateRow(p.id, "price", e.target.value)}
                        placeholder="2500"
                        className="h-10 text-sm font-mono padded-price rounded-xl focus-visible:ring-primary/20 pl-6"
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
                      onChange={(e) => updateRow(p.id, "stock", e.target.value)}
                      placeholder="100"
                      className="h-10 text-sm font-mono rounded-xl focus-visible:ring-primary/20"
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
    </div>
  );
}
