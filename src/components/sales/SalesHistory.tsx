import { useState, useMemo } from "react";
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
import { CalendarIcon, Receipt, TrendingUp, Printer, MessageCircle, RotateCcw, User, Clock, CreditCard, Banknote, Smartphone, Globe, Monitor, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useDemo } from "@/hooks/useDemo";
import { useRole } from "@/hooks/useRole";
import { useSales } from "@/hooks/useInventoryData";
import type { SaleTransaction } from "@/types/inventory";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getWhatsAppUrl, buildPersonalizedReceiptText } from "@/lib/whatsapp";

const NAIRA = "₦";

function fmtNgn(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

export function SalesHistoryPage() {
  const { onboarding } = useDemo();
  const { role } = useRole();
  const { data: sales = [], isLoading } = useSales();

  const [from, setFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [to, setTo] = useState<Date | undefined>(new Date());
  const [selectedSale, setSelectedSale] = useState<SaleTransaction | null>(null);

  const filtered = useMemo(() => {
    if (!from && !to) return sales;
    return sales.filter((s) => {
      const d = new Date(s.createdAt);
      if (from && to) return isWithinInterval(d, { start: startOfDay(from), end: endOfDay(to) });
      if (from) return d >= startOfDay(from);
      if (to) return d <= endOfDay(to);
      return true;
    });
  }, [sales, from, to]);

  const totalRevenue = filtered.reduce((s, t) => s + t.totalNgn, 0);
  const totalTransactions = filtered.length;
  const totalItems = filtered.reduce((s, t) => s + t.items.reduce((a, li) => a + li.quantity, 0), 0);

  const storeName = onboarding.storeName || "NEXA StoreOS";
  const userName = role === "admin" ? "Admin" : role === "manager" ? "Manager" : "Staff";

  const handleSendReceipt = (sale: SaleTransaction) => {
    if (!sale.customerPhone) {
      toast.error("No phone number on this sale. Cannot send receipt.");
      return;
    }
    const text = buildPersonalizedReceiptText(sale, storeName);
    const url = getWhatsAppUrl(sale.customerPhone, text);
    window.open(url, "_blank");
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (filtered.length === 0) {
      toast.error("No transactions to export.");
      return;
    }
    setIsExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      
      let y = 20;
      
      // --- HEADER ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55); // text-gray-800
      doc.text(storeName.toUpperCase(), margin, y);
      
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128); // text-gray-500
      doc.text("SALES AUDIT REPORT", margin, y);
      
      // Right-aligned header metadata
      doc.setFontSize(9);
      const dateStr = `Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`;
      const periodStr = `Period: ${from ? format(from, "dd MMM yyyy") : "Inception"} - ${to ? format(to, "dd MMM yyyy") : "Present"}`;
      doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), 20);
      doc.text(periodStr, pageWidth - margin - doc.getTextWidth(periodStr), 25);
      
      y += 6;
      // Horizontal Line
      doc.setDrawColor(229, 231, 235); // gray-200
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      
      y += 12;
      
      // --- KPI SUMMARY ---
      doc.setFillColor(249, 250, 251); // gray-50
      doc.rect(margin, y, contentWidth, 24, "F");
      doc.setDrawColor(243, 244, 246); // gray-100
      doc.rect(margin, y, contentWidth, 24, "S");
      
      // Total Revenue
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(13, 148, 136); // teal-600
      const revStr = fmtNgn(totalRevenue);
      doc.text(revStr, margin + 10, y + 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("TOTAL REVENUE", margin + 10, y + 8);
      
      // Total Transactions
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text(totalTransactions.toString(), margin + 70, y + 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("TRANSACTIONS", margin + 70, y + 8);
      
      // Total Items Sold
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.text(totalItems.toString(), margin + 125, y + 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("ITEMS SOLD", margin + 125, y + 8);
      
      y += 34;
      
      // --- TABLE SECTION ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text("TRANSACTION LEDGER", margin, y);
      
      y += 6;
      
      // Table Header
      doc.setFillColor(243, 244, 246); // gray-100
      doc.rect(margin, y, contentWidth, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(75, 85, 99); // gray-600
      
      doc.text("Date/Time", margin + 4, y + 5.5);
      doc.text("Source", margin + 35, y + 5.5);
      doc.text("Customer", margin + 55, y + 5.5);
      doc.text("Payment", margin + 105, y + 5.5);
      doc.text("Qty", margin + 135, y + 5.5);
      const totalHeaderWidth = doc.getTextWidth("Total");
      doc.text("Total", pageWidth - margin - 4 - totalHeaderWidth, y + 5.5);
      
      y += 8;
      
      // Rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(55, 65, 81); // gray-700
      
      filtered.forEach((sale, index) => {
        // Page break check
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
          
          // Re-draw table header on new page
          doc.setFillColor(243, 244, 246);
          doc.rect(margin, y, contentWidth, 8, "F");
          doc.setFont("helvetica", "bold");
          doc.setTextColor(75, 85, 99);
          doc.text("Date/Time", margin + 4, y + 5.5);
          doc.text("Source", margin + 35, y + 5.5);
          doc.text("Customer", margin + 55, y + 5.5);
          doc.text("Payment", margin + 105, y + 5.5);
          doc.text("Qty", margin + 135, y + 5.5);
          doc.text("Total", pageWidth - margin - 4 - totalHeaderWidth, y + 5.5);
          
          doc.setFont("helvetica", "normal");
          doc.setTextColor(55, 65, 81);
          y += 8;
        }
        
        // Alternating row background
        if (index % 2 === 1) {
          doc.setFillColor(254, 254, 254);
        } else {
          doc.setFillColor(249, 250, 251); // gray-50
        }
        doc.rect(margin, y, contentWidth, 7, "F");
        
        // Draw values
        const dateStr = format(new Date(sale.createdAt), "dd MMM, HH:mm");
        const sourceStr = sale.source === "social" ? "STORE" : "POS";
        const customerStr = sale.customerName || "Walk-in";
        const paymentStr = (sale as SaleWithPayment).paymentMethod || "cash";
        const qtyStr = sale.items.reduce((s, li) => s + li.quantity, 0).toString();
        const totalStr = fmtNgn(sale.totalNgn);
        
        doc.text(dateStr, margin + 4, y + 4.5);
        doc.text(sourceStr, margin + 35, y + 4.5);
        
        // Truncate customer name if too long
        let custTrunc = customerStr;
        if (doc.getTextWidth(custTrunc) > 45) {
          custTrunc = customerStr.substring(0, 20) + "...";
        }
        doc.text(custTrunc, margin + 55, y + 4.5);
        
        doc.text(paymentStr.toUpperCase(), margin + 105, y + 4.5);
        doc.text(qtyStr, margin + 135, y + 4.5);
        
        const priceWidth = doc.getTextWidth(totalStr);
        doc.text(totalStr, pageWidth - margin - 4 - priceWidth, y + 4.5);
        
        y += 7;
      });
      
      // Footer/Sign-off on last page
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
      doc.setTextColor(156, 163, 175); // gray-400
      doc.text("This report is digitally generated by Stackwise. Confirmed and certified for audit.", margin, y);
      
      doc.setFont("helvetica", "normal");
      const pageCount = doc.internal.pages.length - 1;
      doc.text(`Page 1 of ${pageCount}`, pageWidth - margin - 15, y);
      
      // Save
      const cleanStoreName = storeName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      doc.save(`sales-audit-${cleanStoreName}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Sales Audit PDF exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      {/* Header with date and user */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sales History</h1>
          <p className="text-sm text-muted-foreground">Review past transactions and revenue.</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-sm text-foreground justify-end">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{userName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-end">
            <Clock className="h-3 w-3" />
            {format(new Date(), "dd MMM yyyy, HH:mm")}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" /> Total Revenue
          </div>
          <p className="mt-1 text-2xl font-bold font-mono text-foreground">{fmtNgn(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Receipt className="h-4 w-4" /> Transactions
          </div>
          <p className="mt-1 text-2xl font-bold font-mono text-foreground">{totalTransactions}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Receipt className="h-4 w-4" /> Items Sold
          </div>
          <p className="mt-1 text-2xl font-bold font-mono text-foreground">{totalItems}</p>
        </div>
      </div>

      {/* Date filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <DatePicker label="From" date={from} onSelect={setFrom} />
          <DatePicker label="To" date={to} onSelect={setTo} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFrom(undefined); setTo(undefined); }}
            className="text-xs text-muted-foreground"
          >
            Clear dates
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
          disabled={isExporting}
          className="gap-1.5 border-teal-600/30 text-teal-700 hover:bg-teal-50"
        >
          <FileText className="h-4 w-4" />
          {isExporting ? "Exporting PDF..." : "Export Audit PDF"}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading sales history...</span>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No sales found. Complete a sale from the Sales page to see it here.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sale) => (
                <TableRow
                  key={sale.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedSale(sale)}
                >
                  <TableCell className="text-sm">
                    {format(new Date(sale.createdAt), "dd MMM, HH:mm")}
                  </TableCell>
                  <TableCell>
                    {sale.source === "social" ? (
                      <Badge variant="outline" className="gap-1.5 py-0.5 px-2 bg-fuchsia-500/5 text-fuchsia-600 border-fuchsia-500/20 text-[10px] font-bold">
                        <Globe className="h-3 w-3" /> STORE
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1.5 py-0.5 px-2 bg-slate-500/5 text-slate-600 border-slate-500/20 text-[10px] font-bold">
                        <Monitor className="h-3 w-3" /> POS
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{sale.customerName || "Walk-in"}</span>
                      {sale.customerPhone && (
                        <span className="text-[11px] text-muted-foreground font-mono">{sale.customerPhone}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <PaymentIcon method={(sale as SaleWithPayment).paymentMethod} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {sale.items.reduce((s, li) => s + li.quantity, 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {fmtNgn(sale.totalNgn)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sale detail sheet */}
      <Sheet open={!!selectedSale} onOpenChange={(o) => !o && setSelectedSale(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Sale Details</SheetTitle>
          </SheetHeader>
          {selectedSale && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Receipt #</span>
                  <span className="font-mono font-medium">{selectedSale.id.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Date</span>
                  <span>{format(new Date(selectedSale.createdAt), "dd MMM yyyy, HH:mm")}</span>
                </div>
                {selectedSale.customerName && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">{selectedSale.customerName}</span>
                  </div>
                )}
                {selectedSale.customerPhone && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-mono">{selectedSale.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="capitalize">{(selectedSale as SaleWithPayment).paymentMethod || "cash"}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Items Purchased</h4>
                {selectedSale.items.map((li, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{li.itemName}</p>
                      <p className="text-[11px] text-muted-foreground">{li.quantity} x {fmtNgn(li.unitPriceNgn)}</p>
                    </div>
                    <span className="font-mono text-sm font-semibold shrink-0">{fmtNgn(li.unitPriceNgn * li.quantity)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="font-mono">{fmtNgn(selectedSale.totalNgn)}</span>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <Button variant="outline" className="w-full gap-2" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> Print Receipt
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => handleSendReceipt(selectedSale)}
                >
                  <MessageCircle className="h-4 w-4" />
                  {selectedSale.customerPhone ? "Send via WhatsApp" : "No phone (tap to add)"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 text-destructive hover:text-destructive"
                  onClick={() => {
                    toast.info("To return items, go to Returns & Refunds page");
                    setSelectedSale(null);
                  }}
                >
                  <RotateCcw className="h-4 w-4" /> Return Items
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Extended type for payment method
interface SaleWithPayment extends SaleTransaction {
  paymentMethod?: "cash" | "transfer" | "card";
}

function PaymentIcon({ method }: { method?: string }) {
  switch (method) {
    case "transfer":
      return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Smartphone className="h-3.5 w-3.5" /> Transfer</span>;
    case "card":
      return <span className="flex items-center gap-1 text-xs text-muted-foreground"><CreditCard className="h-3.5 w-3.5" /> Card</span>;
    default:
      return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Banknote className="h-3.5 w-3.5" /> Cash</span>;
  }
}

function DatePicker({
  label,
  date,
  onSelect,
}: {
  label: string;
  date: Date | undefined;
  onSelect: (d: Date | undefined) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-[180px] justify-start text-left font-normal", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd MMM yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
