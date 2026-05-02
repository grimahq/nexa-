import { useState } from "react";
import { Filter, X, LayoutGrid, List, AlertCircle, PackageCheck, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Category, Supplier, Location } from "@/types/inventory";
import type { ItemFilters } from "@/lib/demo-store";

interface CatalogFiltersProps {
  filters: ItemFilters;
  onChange: (f: ItemFilters) => void;
  categories: Category[];
  suppliers: Supplier[];
  locations: Location[];
  view: "list" | "grid";
  onViewChange: (v: "list" | "grid") => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Status", icon: PackageCheck },
  { value: "in-stock", label: "In Stock", icon: PackageCheck },
  { value: "low-stock", label: "Low Stock", icon: AlertCircle },
  { value: "out-of-stock", label: "Out of Stock", icon: X },
];

export function CatalogFilters({ filters, onChange, categories, suppliers, locations, view, onViewChange }: CatalogFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = [filters.categoryId, filters.supplierId, filters.status, filters.locationId, filters.search].filter(Boolean).length;

  const update = (patch: Partial<ItemFilters>) => onChange({ ...filters, ...patch });
  const clear = () => onChange({});

  const filterControls = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search name or SKU…"
            value={filters.search ?? ""}
            onChange={(e) => update({ search: e.target.value || undefined })}
            className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/30">
          <button
            onClick={() => onViewChange("list")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              view === "list" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            title="List View"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewChange("grid")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              view === "grid" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            title="Grid View"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        <div className="hidden h-8 w-px bg-border sm:block mx-1" />

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ status: opt.value === "all" ? undefined : opt.value })}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
                (filters.status === opt.value || (opt.value === "all" && !filters.status))
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              <opt.icon className="h-3 w-3" />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Select value={filters.categoryId ?? "all"} onValueChange={(v) => update({ categoryId: v === "all" ? undefined : v })}>
          <SelectTrigger className="h-8 w-fit min-w-[120px] text-xs border-dashed"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.supplierId ?? "all"} onValueChange={(v) => update({ supplierId: v === "all" ? undefined : v })}>
          <SelectTrigger className="h-8 w-fit min-w-[120px] text-xs border-dashed"><SelectValue placeholder="Supplier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.locationId ?? "all"} onValueChange={(v) => update({ locationId: v === "all" ? undefined : v })}>
          <SelectTrigger className="h-8 w-fit min-w-[120px] text-xs border-dashed"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clear} className="h-8 gap-1 text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />Reset
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:block">{filterControls}</div>

      {/* Mobile */}
      <div className="sm:hidden">
        <Button variant="outline" size="sm" onClick={() => setMobileOpen(true)} className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{activeCount}</span>
          )}
        </Button>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="bottom" className="max-h-[80vh]">
            <SheetTitle>Filters</SheetTitle>
            <div className="mt-4">{filterControls}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
