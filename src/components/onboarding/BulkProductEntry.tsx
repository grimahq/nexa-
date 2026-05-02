import { useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
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
}

interface BulkProductEntryProps {
  products: PendingProduct[];
  setProducts: React.Dispatch<React.SetStateAction<PendingProduct[]>>;
  categories: { id: string; label: string; emoji: string }[];
}

export function BulkProductEntry({ products, setProducts }: BulkProductEntryProps) {
  const addRow = () => {
    setProducts((prev) => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), name: "", price: "", stock: "", unit: "pcs" },
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

  return (
    <div className="space-y-4">
      <div className="max-h-[300px] overflow-y-auto pr-1">
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
              <th className="pb-1 pl-1">Product Name</th>
              <th className="pb-1 w-24">Price (₦)</th>
              <th className="pb-1 w-20">Stock</th>
              <th className="pb-1 w-24">Unit</th>
              <th className="pb-1 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="group">
                <td className="pr-2">
                  <Input
                    value={p.name}
                    onChange={(e) => updateRow(p.id, "name", e.target.value)}
                    placeholder="e.g. Basmati Rice"
                    className="h-9 text-sm"
                  />
                </td>
                <td className="pr-2">
                  <Input
                    type="number"
                    value={p.price}
                    onChange={(e) => updateRow(p.id, "price", e.target.value)}
                    placeholder="2500"
                    className="h-9 text-sm font-mono"
                  />
                </td>
                <td className="pr-2">
                  <Input
                    type="number"
                    value={p.stock}
                    onChange={(e) => updateRow(p.id, "stock", e.target.value)}
                    placeholder="100"
                    className="h-9 text-sm font-mono"
                  />
                </td>
                <td className="pr-2">
                  <Select 
                    value={p.unit} 
                    onValueChange={(v) => updateRow(p.id, "unit", v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_UNITS.map(u => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(p.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border rounded-xl">
            <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground italic">No products added yet.</p>
            <Button variant="link" onClick={addRow} className="mt-1">Add your first product</Button>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        className="w-full gap-1.5 border-dashed"
      >
        <Plus className="h-4 w-4" /> Add Row
      </Button>
    </div>
  );
}
