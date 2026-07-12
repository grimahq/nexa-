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
  needsReviewCount?: number;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Status", icon: PackageCheck },
  { value: "in-stock", label: "In Stock", icon: PackageCheck },
  { value: "low-stock", label: "Low Stock", icon: AlertCircle },
  { value: "out-of-stock", label: "Out of Stock", icon: X },
];

export function CatalogFilters({ filters, onChange, categories, suppliers, locations, view, onViewChange, needsReviewCount }: CatalogFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Measure classification filters for the mobile sheet badge
  const activeCount = [filters.categoryId, filters.supplierId, filters.locationId].filter(Boolean).length;

  const update = (patch: Partial<ItemFilters>) => onChange({ ...filters, ...patch });
  const clear = () => onChange({});

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input, View Toggle, and Filters Button wrapper */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search name or SKU…"
              value={filters.search ?? ""}
              onChange={(e) => update({ search: e.target.value || undefined })}
              className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>

          {/* View Toggle - Always visible on mobile & desktop */}
          <div className="flex items-center gap-1.5 border rounded-lg p-1 bg-muted/40 shrink-0">
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

          {/* Classification Filters Button - Visible only on Mobile */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setMobileOpen(true)} 
            className="md:hidden gap-1.5 h-10 px-3 shrink-0 rounded-lg"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{activeCount}</span>
            )}
          </Button>
        </div>

        {/* Status Option Pills - Directly visible and horizontally scrollable on mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
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

          {/* Needs Review Filter Toggle */}
          <button
            onClick={() => update({ status: "needs-review" })}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
              filters.status === "needs-review"
                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            )}
          >
            <AlertCircle className="h-3 w-3 text-amber-600" />
            Needs Review
            {needsReviewCount !== undefined && needsReviewCount > 0 && (
              <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-600 px-1 text-[9px] font-bold text-white shadow-inner animate-pulse">
                {needsReviewCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Categories, Suppliers, and Locations Select triggers - Visible inline on desktop/tablet */}
      <div className="hidden md:flex flex-wrap items-center gap-2 pt-1">
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

        {(activeCount > 0 || filters.status || filters.search) && (
          <Button variant="ghost" size="sm" onClick={clear} className="h-8 gap-1 text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />Reset
          </Button>
        )}
      </div>

      {/* Mobile classification filters sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl overflow-y-auto">
          <SheetTitle className="text-base font-bold text-foreground">Advanced Filters</SheetTitle>
          <div className="mt-4 space-y-4 pb-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category</label>
              <Select value={filters.categoryId ?? "all"} onValueChange={(v) => update({ categoryId: v === "all" ? undefined : v })}>
                <SelectTrigger className="w-full text-xs h-11 rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Supplier</label>
              <Select value={filters.supplierId ?? "all"} onValueChange={(v) => update({ supplierId: v === "all" ? undefined : v })}>
                <SelectTrigger className="w-full text-xs h-11 rounded-xl"><SelectValue placeholder="Supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location</label>
              <Select value={filters.locationId ?? "all"} onValueChange={(v) => update({ locationId: v === "all" ? undefined : v })}>
                <SelectTrigger className="w-full text-xs h-11 rounded-xl"><SelectValue placeholder="Location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {activeCount > 0 && (
              <Button 
                variant="outline" 
                className="w-full h-11 rounded-xl mt-4 border-destructive/20 text-destructive hover:bg-destructive/10" 
                onClick={() => { clear(); setMobileOpen(false); }}
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
