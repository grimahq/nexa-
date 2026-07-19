import { X, Printer, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetHeader,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Category, Supplier, Location } from "@/types/inventory";
import { ItemStatus } from "@/types/inventory";

interface BulkActionBarProps {
  selectedCount: number;
  categories: Category[];
  suppliers: Supplier[];
  locations: Location[];
  onUpdateCategory: (categoryId: string) => void;
  onUpdateSupplier: (supplierId: string) => void;
  onUpdateLocation: (locationId: string) => void;
  onUpdateStatus: (status: ItemStatus) => void;
  onDeselectAll: () => void;
  onPrintLabels?: () => void;
  b2bEnabled?: boolean;
  onPublishToB2B?: () => void;
}

const STATUS_OPTIONS = [
  { value: ItemStatus.Active, label: "Active" },
  { value: ItemStatus.Discontinued, label: "Discontinued" },
  { value: ItemStatus.Archived, label: "Archived" },
];

export function BulkActionBar({
  selectedCount,
  categories,
  suppliers,
  locations,
  onUpdateCategory,
  onUpdateSupplier,
  onUpdateLocation,
  onUpdateStatus,
  onDeselectAll,
  onPrintLabels,
  b2bEnabled,
  onPublishToB2B,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  const handleB2BClick = () => {
    if (!b2bEnabled) {
      toast.error("B2B Marketplace Sync Required", {
        description: "Publishing excess stock to the global trade marketplace requires an Enterprise plan and the B2B Sync feature enabled in settings."
      });
    } else {
      onPublishToB2B?.();
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-14 md:bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3.5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom duration-300 sm:px-6"
      role="toolbar"
      aria-label="Bulk actions"
    >
      <span className="shrink-0 text-xs sm:text-sm font-semibold text-foreground">
        {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
      </span>

      {/* Desktop Layout - Horizontal Bar */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        {/* Category */}
        <Select onValueChange={onUpdateCategory}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories?.filter((c) => c && c.id).map((c, index) => (
              <SelectItem key={`cat-dsktp-${c.id}-${index}`} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Supplier */}
        <Select onValueChange={onUpdateSupplier}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Supplier" />
          </SelectTrigger>
          <SelectContent>
            {suppliers?.filter((s) => s && s.id).map((s, index) => (
              <SelectItem key={`sup-dsktp-${s.id}-${index}`} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Location */}
        <Select onValueChange={onUpdateLocation}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            {locations?.filter((l) => l && l.id).map((l, index) => (
              <SelectItem key={`loc-dsktp-${l.id}-${index}`} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select onValueChange={(v) => onUpdateStatus(v as ItemStatus)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS?.filter((o) => o && o.value).map((o, index) => (
              <SelectItem key={`status-dsktp-${o.value}-${index}`} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {onPrintLabels && (
          <Button variant="outline" size="sm" onClick={onPrintLabels} className="h-8 gap-1 text-xs">
            <Printer className="h-3 w-3" />
            Print Labels
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleB2BClick}
          className="h-8 gap-1.5 text-xs border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/5 font-semibold"
        >
          <Sparkles className="h-3.5 w-3.5 text-purple-500" />
          Publish to B2B
        </Button>

        <Button variant="ghost" size="sm" onClick={onDeselectAll} className="h-8 gap-1 text-xs">
          <X className="h-3 w-3" />
          Deselect All
        </Button>
      </div>

      {/* Mobile/Tablet Layout - Bottom Drawer */}
      <div className="flex md:hidden items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Bulk Edit
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-6 rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <SheetHeader className="mb-5 text-left">
              <SheetTitle className="text-lg font-bold">Bulk Actions</SheetTitle>
              <SheetDescription className="text-xs">
                Batch update all {selectedCount} selected items. Changes apply immediately.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 py-2">
              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Category
                </label>
                <Select onValueChange={onUpdateCategory}>
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.filter((c) => c && c.id).map((c, index) => (
                      <SelectItem key={`cat-mbl-${c.id}-${index}`} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Supplier selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Supplier
                </label>
                <Select onValueChange={onUpdateSupplier}>
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue placeholder="Select Supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.filter((s) => s && s.id).map((s, index) => (
                      <SelectItem key={`sup-mbl-${s.id}-${index}`} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Location
                </label>
                <Select onValueChange={onUpdateLocation}>
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue placeholder="Select Location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.filter((l) => l && l.id).map((l, index) => (
                      <SelectItem key={`loc-mbl-${l.id}-${index}`} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </label>
                <Select onValueChange={(v) => onUpdateStatus(v as ItemStatus)}>
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS?.filter((o) => o && o.value).map((o, index) => (
                      <SelectItem key={`status-mbl-${o.value}-${index}`} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Print Labels & Deselect in Mobile */}
              <div className="pt-4 flex flex-col gap-2">
                {onPrintLabels && (
                  <Button variant="outline" size="default" onClick={onPrintLabels} className="w-full gap-2 text-sm font-semibold">
                    <Printer className="h-4 w-4" />
                    Print Labels for {selectedCount} items
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleB2BClick}
                  className="w-full gap-2 text-sm font-semibold border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/5"
                >
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Publish {selectedCount} items to B2B
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Button variant="ghost" size="sm" onClick={onDeselectAll} className="h-8 gap-1 text-xs px-2">
          <X className="h-3 w-3" />
          Clear
        </Button>
      </div>
    </div>
  );
}
