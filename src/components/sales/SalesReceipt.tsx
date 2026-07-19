import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Printer, X, Download, MessageCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { SaleTransaction } from "@/types/inventory";
import { useDemo } from "@/hooks/useDemo";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { getWhatsAppUrl, buildPersonalizedReceiptText } from "@/lib/whatsapp";
import { NexaLogo } from "@/components/shared/NexaLogo";

const NAIRA = "₦";

function fmtNgn(amount: number): string {
  return `${NAIRA}${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

function getStoreName(businessType: string | null): string {
  const names: Record<string, string> = {
    retail: "My Retail Store",
    restaurant: "My Restaurant",
    wholesale: "My Wholesale Store",
    general: "My Store",
  };
  return businessType ? names[businessType] ?? "My Store" : "My Store";
}

function buildReceiptText(sale: SaleTransaction, storeName: string): string {
  const isRepayment = sale.isDebtSettlement || sale.id.startsWith("repay-");
  const lines: string[] = [];
  lines.push(`🧾 *${storeName}*`);
  lines.push(`Receipt #${sale.id.slice(-8).toUpperCase()}`);
  lines.push(`Date: ${format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}`);
  if (sale.customerName) lines.push(`Customer: ${sale.customerName}`);
  lines.push("");
  lines.push("─────────────────");
  sale.items.forEach((li) => {
    lines.push(`${li.itemName}`);
    lines.push(`  ${li.quantity}${li.unit && li.unit !== "pcs" ? li.unit : ""} × ${fmtNgn(li.unitPriceNgn)} = ${fmtNgn(li.unitPriceNgn * li.quantity)}`);
  });
  if (sale.previousDebtPaidNgn && sale.previousDebtPaidNgn > 0) {
    lines.push("─────────────────");
    lines.push(`Items Total: ${fmtNgn(sale.totalNgn - sale.previousDebtPaidNgn)}`);
    lines.push(`Consolidated Debt Payment: ${fmtNgn(sale.previousDebtPaidNgn)}`);
  }
  lines.push("─────────────────");
  lines.push(`*TOTAL: ${fmtNgn(sale.totalNgn)}*`);
  lines.push("");
  lines.push(isRepayment ? "Thank you for your payment! 🙏" : "Thank you for your purchase! 🙏");
  return lines.join("\n");
}

async function generateReceiptPDF(sale: SaleTransaction, storeName: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");

  const w = 80;
  const lm = 6; // left margin
  const rm = w - 6; // right margin
  const maxContentWidth = rm - lm; // 68mm
  const isRepayment = sale.isDebtSettlement || sale.id.startsWith("repay-");

  const fmtNgnForPdf = (amount: number) => `N${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

  // Create a temporary document to pre-calculate heights for dynamic page formatting
  const tempDoc = new jsPDF({ unit: "mm", format: [80, 500] });
  let calcY = 10;

  // 1. Store Name wrapping calculation
  tempDoc.setFontSize(14);
  tempDoc.setFont("helvetica", "bold");
  const storeLines = tempDoc.splitTextToSize(storeName, maxContentWidth);
  calcY += storeLines.length * 5.5 + 4; // store title height + spacing

  // 2. Info block (Receipt #, Date, Customer, Phone)
  calcY += 16; // base height for line, receipt #, and date
  if (sale.customerName) calcY += 4.5;
  if (sale.customerPhone) calcY += 4.5;
  calcY += 6; // separator line

  // 3. Line items wrapping calculation
  tempDoc.setFontSize(8);
  sale.items.forEach((li) => {
    tempDoc.setFont("helvetica", "bold");
    const lines = tempDoc.splitTextToSize(li.itemName, maxContentWidth);
    calcY += lines.length * 3.5; // item name lines
    calcY += 5; // quantity, price details and spacing
  });

  // 4. Debt & Total section
  calcY += 4;
  if (sale.previousDebtPaidNgn && sale.previousDebtPaidNgn > 0) {
    calcY += 12; // Items total, consolidated debt paid + lines
  }
  calcY += 12; // Total line, TOTAL label and amount + spacing

  // 5. Footer lines
  tempDoc.setFontSize(7);
  const thanksText = isRepayment ? "Thank you for your payment!" : "Thank you for your purchase!";
  const thanksLines = tempDoc.splitTextToSize(thanksText, maxContentWidth);
  calcY += thanksLines.length * 3.5;

  const poweredText = `Powered by ${storeName}`;
  const poweredLines = tempDoc.splitTextToSize(poweredText, maxContentWidth);
  calcY += poweredLines.length * 3.5 + 2;

  calcY += 16; // POWERED BY NEXASTOREOS + "Create your store..." lines + margin

  // Instantiate final document with perfectly calculated precise height
  const pageHeight = Math.max(140, Math.ceil(calcY));
  const doc = new jsPDF({ unit: "mm", format: [80, pageHeight] });

  let y = 10;

  // Render Store Name
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  storeLines.forEach((line: string) => {
    doc.text(line, w / 2, y, { align: "center" });
    y += 5.5;
  });

  y += 0.5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(isRepayment ? "Debt Settlement Receipt" : "Receipt of Purchase", w / 2, y, { align: "center" });
  y += 5;

  // Divider Line
  doc.setDrawColor(200);
  doc.line(lm, y, rm, y);
  y += 5;

  // Receipt info
  doc.setFontSize(8);
  doc.text("Receipt #", lm, y);
  doc.setFont("helvetica", "bold");
  doc.text(sale.id.slice(-8).toUpperCase(), rm, y, { align: "right" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text("Date", lm, y);
  doc.text(format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm"), rm, y, { align: "right" });
  y += 4;

  if (sale.customerName) {
    doc.text("Customer", lm, y);
    // Truncate to ensure it never overlaps or crosses margins
    const custName = sale.customerName.length > 22 ? sale.customerName.slice(0, 20) + "…" : sale.customerName;
    doc.text(custName, rm, y, { align: "right" });
    y += 4.5;
  }
  if (sale.customerPhone) {
    doc.text("Phone", lm, y);
    doc.text(sale.customerPhone, rm, y, { align: "right" });
    y += 4.5;
  }

  y += 1.5;
  doc.line(lm, y, rm, y);
  y += 5;

  // Line items
  doc.setFontSize(8);
  sale.items.forEach((li) => {
    doc.setFont("helvetica", "bold");
    const nameLines = doc.splitTextToSize(li.itemName, maxContentWidth);
    nameLines.forEach((line: string) => {
      doc.text(line, lm, y);
      y += 3.5;
    });

    doc.setFont("helvetica", "normal");
    const qtyText = `${li.quantity}${li.unit && li.unit !== "pcs" ? li.unit : ""}`;
    doc.text(`${qtyText} x ${fmtNgnForPdf(li.unitPriceNgn)}`, lm + 2, y);
    doc.text(fmtNgnForPdf(li.unitPriceNgn * li.quantity), rm, y, { align: "right" });
    y += 5;
  });

  if (sale.previousDebtPaidNgn && sale.previousDebtPaidNgn > 0) {
    doc.line(lm, y, rm, y);
    y += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Items Total", lm, y);
    doc.text(fmtNgnForPdf(sale.totalNgn - sale.previousDebtPaidNgn), rm, y, { align: "right" });
    y += 4;
    doc.text("Consolidated Debt Paid", lm, y);
    doc.text(fmtNgnForPdf(sale.previousDebtPaidNgn), rm, y, { align: "right" });
    y += 4;
  }

  // Total
  doc.line(lm, y, rm, y);
  y += 5;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", lm, y);
  doc.text(fmtNgnForPdf(sale.totalNgn), rm, y, { align: "right" });
  y += 7;

  // Footer
  doc.line(lm, y, rm, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  thanksLines.forEach((line: string) => {
    doc.text(line, w / 2, y, { align: "center" });
    y += 3.5;
  });
  
  y += 1;
  poweredLines.forEach((line: string) => {
    doc.text(line, w / 2, y, { align: "center" });
    y += 3.5;
  });
  
  y += 3;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("POWERED BY NEXASTOREOS", w / 2, y, { align: "center" });
  y += 3.5;
  doc.setFontSize(7.5);
  doc.setTextColor(37, 99, 235); // cobalt blue #2563eb
  doc.text("Create your store: www.nexastoreos.com", w / 2, y, { align: "center" });

  return doc.output("blob");
}

interface SalesReceiptProps {
  sale: SaleTransaction;
  onClose: () => void;
}

export function SalesReceipt({ sale, onClose }: SalesReceiptProps) {
  const { isDemo, onboarding: demoOnboarding } = useDemo();
  const { settings: liveSettings } = useSystemSettings();
  
  const onboarding = isDemo ? demoOnboarding : liveSettings;
  const storeName = onboarding.storeName || getStoreName(onboarding.businessType);
  const [downloading, setDownloading] = useState(false);
  const isRepayment = sale.isDebtSettlement || sale.id.startsWith("repay-");

  const handlePrint = () => {
    // Add temporary print class to body to help CSS if needed
    document.body.classList.add("is-printing-receipt");
    window.print();
    setTimeout(() => document.body.classList.remove("is-printing-receipt"), 1000);
  };

  // Auto-trigger print on modal mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handlePrint();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const blob = await generateReceiptPDF(sale, storeName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${sale.id.slice(-8).toUpperCase()}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
      toast.success("Receipt downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsAppText = () => {
    const text = buildPersonalizedReceiptText(sale, storeName);
    const phone = sale.customerPhone ?? "";
    const url = getWhatsAppUrl(phone, text);
    window.open(url, "_blank");
  };

  const handleWhatsAppPDF = async () => {
    setDownloading(true);
    try {
      const blob = await generateReceiptPDF(sale, storeName);
      const fileName = `receipt-${sale.id.slice(-8).toUpperCase()}.pdf`;
      const file = new File([blob], fileName, { type: "application/pdf" });
      
      const phone = sale.customerPhone ?? "";
      const text = buildPersonalizedReceiptText(sale, storeName);

      const triggerFallback = () => {
        // Fallback: Download then open link
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);

        const waUrl = getWhatsAppUrl(phone, text + "\n\n📎 PDF receipt downloaded - please attach and send to customer.");
        window.open(waUrl, "_blank");
        toast.info("PDF downloaded. Opening WhatsApp...");
      };

      // Try Web Share API if available (best for mobile/WhatsApp)
      if (typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${storeName} Receipt`,
            text: text,
          });
          toast.success("Receipt shared!");
        } catch (shareErr: unknown) {
          // If the Web Share API fails (e.g., lost user gesture after async PDF render, or sandbox/iframe flags), run fallback
          console.warn("navigator.share failed, running manual fallback:", shareErr);
          triggerFallback();
        }
      } else {
        triggerFallback();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to share PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm print:bg-white print:p-0">
      <div className="relative mx-4 w-full max-w-[400px] rounded-2xl border border-border bg-card shadow-xl max-h-[90vh] overflow-y-auto print:shadow-none print:border-none print:max-h-full print:mx-0 print:w-full print:bg-white">
        {/* Header actions */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-card px-4 pt-4 pb-2 print:hidden rounded-t-2xl">
          <h3 className="text-sm font-semibold text-foreground">Receipt</h3>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Receipt body */}
        <div className="receipt-print-area px-6 pb-3 print:p-0 print:text-black">
          {/* Store header */}
          <div className="text-center pt-2">
            <h2 className="text-xl font-bold text-foreground print:text-lg">{storeName}</h2>
            <p className="text-xs text-muted-foreground print:text-black">
              {isRepayment ? "Debt Settlement Receipt" : "Receipt of Purchase"}
            </p>
          </div>

          <Separator className="my-3 print:border-black" />

          {/* Receipt info */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Receipt #</span>
            <span className="font-mono font-medium text-foreground">{sale.id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Date</span>
            <span className="font-medium text-foreground">{format(new Date(sale.createdAt), "dd MMM yyyy, HH:mm")}</span>
          </div>

          {sale.customerName && (
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Customer</span>
              <span className="font-medium text-foreground">{sale.customerName}</span>
            </div>
          )}
          {sale.customerPhone && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Phone</span>
              <span className="font-mono text-foreground">{sale.customerPhone}</span>
            </div>
          )}

          <Separator className="my-3" />

          {/* Line items */}
          <div className="space-y-2">
            {sale.items.map((li, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{li.itemName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {li.quantity}{li.unit && li.unit !== "pcs" && <span className="uppercase mx-0.5">{li.unit}</span>} × {fmtNgn(li.unitPriceNgn)}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold text-foreground shrink-0">
                  {fmtNgn(li.unitPriceNgn * li.quantity)}
                </span>
              </div>
            ))}
          </div>

          {sale.previousDebtPaidNgn && sale.previousDebtPaidNgn > 0 && (
            <>
              <Separator className="my-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Items Total</span>
                <span className="font-mono text-foreground">{fmtNgn(sale.totalNgn - sale.previousDebtPaidNgn)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Consolidated Debt Paid</span>
                <span className="font-mono text-emerald-600 font-semibold">{fmtNgn(sale.previousDebtPaidNgn)}</span>
              </div>
            </>
          )}

          <Separator className="my-3" />

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="font-mono text-xl font-bold text-foreground">{fmtNgn(sale.totalNgn)}</span>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center pb-4">
            <p className="text-[10px] text-muted-foreground print:text-black font-semibold">
              {isRepayment ? "Thank you for your payment!" : "Thank you for your purchase!"}
            </p>
            <div className="mt-4 flex flex-col items-center justify-center gap-1.5 pt-3 border-t border-dashed border-border/80">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Powered by</span>
              <a 
                href={import.meta.env.VITE_LANDING_URL || "https://nexastoreos.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <NexaLogo variant="full" height={16} className="text-foreground shrink-0" />
              </a>
              <a 
                href={import.meta.env.VITE_LANDING_URL || "https://nexastoreos.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] font-bold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-2 py-1 rounded-md mt-1 transition-all animate-pulse"
              >
                Click to create your store 🚀
              </a>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="border-t border-border px-4 py-3 space-y-2 print:hidden">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 h-10">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={downloading} className="gap-1.5 h-10">
              <Download className="h-4 w-4" /> {downloading ? "…" : "PDF"}
            </Button>
          </div>

          {sale.customerPhone && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Share Customer Copy</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWhatsAppText}
                  className="gap-1.5 h-10"
                >
                  <MessageCircle className="h-4 w-4 text-green-600" /> Text Only
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleWhatsAppPDF}
                  disabled={downloading}
                  className="gap-1.5 h-10 bg-green-600 hover:bg-green-700"
                >
                  <FileText className="h-4 w-4" /> PDF Share
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
