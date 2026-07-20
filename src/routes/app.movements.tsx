import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, ArrowUpDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MovementsTable } from "@/components/movements/MovementsTable";
import { MovementsFilters } from "@/components/movements/MovementsFilters";
import { MovementStats } from "@/components/movements/MovementStats";
import { MovementFormSheet } from "@/components/movements/MovementFormSheet";
import { CSVExportButton, type CSVColumn } from "@/components/data/CSVExportButton";
import { EMPTY_MOVEMENT_FILTERS } from "@/components/movements/movement-filter-types";
import type { MovementFilters } from "@/components/movements/movement-filter-types";
import { useMovements, useItems, useLocations } from "@/hooks/useInventoryData";
import { useSector } from "@/hooks/useSector";
import { PermissionGate } from "@/hooks/usePermissions";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import type { StockMovement } from "@/types/inventory";
import { useDemo } from "@/hooks/useDemo";
import { toast } from "sonner";

export const Route = createFileRoute("/app/movements")({
  component: MovementsPage,
  head: () => ({ meta: [{ title: "Movements — Stackwise" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    item: typeof search.item === "string" ? search.item : undefined,
  }),
});

function applyFilters(movements: StockMovement[], f: MovementFilters): StockMovement[] {
  let result = movements;
  if (f.types.length > 0) result = result.filter((m) => f.types.includes(m.type));
  if (f.itemId) result = result.filter((m) => m.itemId === f.itemId);
  if (f.performedBy) result = result.filter((m) => m.performedBy === f.performedBy);
  if (f.dateFrom) {
    const from = new Date(f.dateFrom);
    from.setHours(0, 0, 0, 0);
    result = result.filter((m) => new Date(m.createdAt) >= from);
  }
  if (f.dateTo) {
    const to = new Date(f.dateTo);
    to.setHours(23, 59, 59, 999);
    result = result.filter((m) => new Date(m.createdAt) <= to);
  }
  return result;
}

function MovementsPage() {
  const { item: itemParam } = Route.useSearch();
  const [filters, setFilters] = useState<MovementFilters>(EMPTY_MOVEMENT_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const { data: movements } = useMovements();
  const { data: items } = useItems();
  const { data: locations } = useLocations();
  const sector = useSector();
  const { onboarding } = useDemo();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (filtered.length === 0) {
      toast.error("No movements to export.");
      return;
    }
    setIsExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 12;
      const contentWidth = pageWidth - 2 * margin;
      
      let y = 20;
      
      // --- HEADER ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55); // text-gray-800
      const storeName = onboarding?.storeName || "Nexa OS Merchant";
      doc.text(storeName.toUpperCase(), margin, y);
      
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // text-gray-500
      doc.text(`${sector.labels.movements.toUpperCase()} AUDIT REPORT`, margin, y);
      
      // Right-aligned header metadata
      doc.setFontSize(9);
      const dateStr = `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const periodStr = `Period: ${filters.dateFrom ? new Date(filters.dateFrom).toLocaleDateString() : "Inception"} - ${filters.dateTo ? new Date(filters.dateTo).toLocaleDateString() : "Present"}`;
      doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), 20);
      doc.text(periodStr, pageWidth - margin - doc.getTextWidth(periodStr), 25);
      
      y += 6;
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      
      y += 12;
      
      // --- KPI SUMMARY ---
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y, contentWidth, 24, "F");
      doc.setDrawColor(243, 244, 246);
      doc.rect(margin, y, contentWidth, 24, "S");
      
      const totalMovs = filtered.length;
      const totalIn = filtered.filter(m => m.type === "in").reduce((sum, m) => sum + m.quantity, 0);
      const totalOut = filtered.filter(m => m.type === "out").reduce((sum, m) => sum + m.quantity, 0);
      
      // Total Movements
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text(totalMovs.toString(), margin + 10, y + 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("TOTAL ENTRIES", margin + 10, y + 8);
      
      // Total Inflow
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(22, 163, 74); // green-600
      doc.text(`+${totalIn}`, margin + 70, y + 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("TOTAL INFLOW UNITS", margin + 70, y + 8);
      
      // Total Outflow
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38); // red-600
      doc.text(`-${totalOut}`, margin + 130, y + 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("TOTAL OUTFLOW UNITS", margin + 130, y + 8);
      
      y += 34;
      
      // --- TABLE SECTION ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text("INVENTORY MOVEMENT LEDGER", margin, y);
      
      y += 6;
      
      // Table Header
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, y, contentWidth, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(75, 85, 99);
      
      doc.text("Date", margin + 2, y + 5.5);
      doc.text("Item Name (SKU)", margin + 24, y + 5.5);
      doc.text("Type", margin + 86, y + 5.5);
      doc.text("Qty", margin + 110, y + 5.5);
      doc.text("Performed By", margin + 122, y + 5.5);
      doc.text("Reference / Notes", margin + 150, y + 5.5);
      
      y += 8;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(55, 65, 81);
      
      filtered.forEach((m, index) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
          
          doc.setFillColor(243, 244, 246);
          doc.rect(margin, y, contentWidth, 8, "F");
          doc.setFont("helvetica", "bold");
          doc.setTextColor(75, 85, 99);
          doc.text("Date", margin + 2, y + 5.5);
          doc.text("Item Name (SKU)", margin + 24, y + 5.5);
          doc.text("Type", margin + 86, y + 5.5);
          doc.text("Qty", margin + 110, y + 5.5);
          doc.text("Performed By", margin + 122, y + 5.5);
          doc.text("Reference / Notes", margin + 150, y + 5.5);
          
          doc.setFont("helvetica", "normal");
          doc.setTextColor(55, 65, 81);
          y += 8;
        }
        
        if (index % 2 === 1) {
          doc.setFillColor(254, 254, 254);
        } else {
          doc.setFillColor(249, 250, 251);
        }
        doc.rect(margin, y, contentWidth, 7, "F");
        
        const dateStr = new Date(m.createdAt).toLocaleDateString();
        const itemName = itemNameMap.get(m.itemId) || "Unknown Item";
        const sku = items.find((i) => i.id === m.itemId)?.sku || "";
        const itemWithSku = sku ? `${itemName} (${sku})` : itemName;
        
        const typeStr = m.type.toUpperCase();
        const qtyStr = m.quantity.toString();
        const performerStr = m.performedBy;
        const refNotes = [m.reference, m.notes].filter(Boolean).join(" - ") || "N/A";
        
        doc.text(dateStr, margin + 2, y + 4.5);
        
        // Truncate item details
        let itemTrunc = itemWithSku;
        if (doc.getTextWidth(itemTrunc) > 60) {
          itemTrunc = itemWithSku.substring(0, 32) + "...";
        }
        doc.text(itemTrunc, margin + 24, y + 4.5);
        
        // Color type
        if (m.type === "in") doc.setTextColor(22, 163, 74);
        else if (m.type === "out") doc.setTextColor(220, 38, 38);
        else doc.setTextColor(75, 85, 99);
        doc.text(typeStr, margin + 86, y + 4.5);
        doc.setTextColor(55, 65, 81);
        
        doc.text(qtyStr, margin + 110, y + 4.5);
        
        let perfTrunc = performerStr;
        if (doc.getTextWidth(perfTrunc) > 26) {
          perfTrunc = performerStr.substring(0, 12) + "..";
        }
        doc.text(perfTrunc, margin + 122, y + 4.5);
        
        let refTrunc = refNotes;
        if (doc.getTextWidth(refTrunc) > 34) {
          refTrunc = refNotes.substring(0, 18) + "...";
        }
        doc.text(refTrunc, margin + 150, y + 4.5);
        
        y += 7;
      });
      
      if (y > pageHeight - 35) {
        doc.addPage();
        y = 20;
      }
      
      y += 10;
      doc.setDrawColor(229, 231, 235);
      doc.line(margin, y, pageWidth - margin, y);
      
      y += 6;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text("This report is digitally generated by Stackwise. Confirmed and certified for inventory audit.", margin, y);
      
      doc.setFont("helvetica", "normal");
      const pageCount = doc.internal.pages.length - 1;
      doc.text(`Page 1 of ${pageCount}`, pageWidth - margin - 15, y);
      
      const cleanStoreName = storeName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      doc.save(`movements-audit-${cleanStoreName}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Movements Audit PDF exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate movements PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Pre-filter by item query param on mount
  useEffect(() => {
    if (itemParam) {
      setFilters((prev) => ({ ...prev, itemId: itemParam }));
    }
  }, [itemParam]);

  const itemNameMap = useMemo(
    () => new Map(items.map((i) => [i.id, i.name])),
    [items],
  );

  const locationNameMap = useMemo(
    () => new Map(locations.map((l) => [l.id, l.name])),
    [locations],
  );

  const performers = useMemo(
    () => [...new Set(movements.map((m) => m.performedBy))].sort(),
    [movements],
  );

  const filtered = useMemo(() => applyFilters(movements, filters), [movements, filters]);

  const movementCsvColumns = useMemo<CSVColumn<StockMovement>[]>(() => [
    { header: "Date", accessor: (m) => new Date(m.createdAt).toLocaleDateString() },
    { header: "Type", accessor: (m) => m.type },
    { header: "Item Name", accessor: (m) => itemNameMap.get(m.itemId) ?? "" },
    { header: "SKU", accessor: (m) => items.find((i) => i.id === m.itemId)?.sku ?? "" },
    { header: "Quantity", accessor: (m) => m.quantity },
    { header: "Performed By", accessor: (m) => m.performedBy },
    { header: "Reference", accessor: (m) => m.reference },
    { header: "Notes", accessor: (m) => m.notes },
  ], [itemNameMap, items]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{sector.labels.movements}</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} entries recorded</p>
        </div>
        <div className="flex items-center gap-2">
          <CSVExportButton
            data={filtered}
            columns={movementCsvColumns}
            filename={`stackwise-${sector.id}-movements`}
          />
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="gap-1.5 border-teal-600/30 text-teal-700 hover:bg-teal-50"
          >
            <FileText className="h-4 w-4" />
            {isExporting ? "Exporting PDF..." : "Export Audit PDF"}
          </Button>
          <PermissionGate permission="log_movement">
            <Button onClick={() => setFormOpen(true)} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
              <Plus className="h-4 w-4" />
              Log {sector.labels.item} Movement
            </Button>
          </PermissionGate>
        </div>
      </div>

      <MovementsFilters
        filters={filters}
        onChange={setFilters}
        items={items}
        performers={performers}
      />

      <MovementStats movements={filtered} />

      <ErrorBoundary>
      {movements.length === 0 ? (
        <EmptyState
          icon={ArrowUpDown}
          title={`No ${sector.labels.movements.toLowerCase()} recorded`}
          description={`Track changes to your ${sector.labels.catalog.toLowerCase()} — receipts, shipments, adjustments, and transfers.`}
          actionLabel="Log Movement"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <MovementsTable movements={filtered} itemNameMap={itemNameMap} locationNameMap={locationNameMap} />
      )}
      </ErrorBoundary>

      <MovementFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        items={items}
        locations={locations}
      />
    </div>
  );
}
