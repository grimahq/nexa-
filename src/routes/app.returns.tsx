import { useState, useMemo, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Package, AlertCircle, Calendar, Filter, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useDemo } from "@/hooks/useDemo";
import { toast } from "sonner";
import type { Refund, RefundReason } from "@/types/finance";
import { REFUND_REASONS } from "@/types/finance";
import { useRefunds, useSales } from "@/hooks/useInventoryData";
import { useCreateRefund } from "@/hooks/useInventoryMutations";

const NAIRA = "₦";

export const Route = createFileRoute("/app/returns")({
  component: ReturnsPage,
  head: () => ({ meta: [{ title: "Returns & Refunds — Stackwise" }] }),
});

function ReturnsPage() {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const [formOpen, setFormOpen] = useState(false);
  const [filterReason, setFilterReason] = useState<string>("all");
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  const { data: refunds, isLoading: refundsLoading } = useRefunds();
  const { data: sales, isLoading: salesLoading } = useSales();

  const isLoading = refundsLoading || salesLoading;

  const filtered = filterReason === "all" ? refunds : refunds.filter((r) => r.reason === filterReason);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center font-mono text-sm text-muted-foreground animate-pulse">Loading returns...</div>;
  }

  const totalRefunded = filtered.reduce((s, r) => s + r.amountNgn, 0);

  return (
    <div className="mx-auto max-w-[1000px] space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Returns & Refunds</h1>
          <p className="text-sm text-muted-foreground">Process refunds, damaged goods, and returns</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <RotateCcw className="h-4 w-4" /> New Refund
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Refunds</p>
          <p className="text-xl font-bold font-mono">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Refunded</p>
          <p className="text-xl font-bold font-mono text-destructive">{NAIRA}{totalRefunded.toLocaleString("en-NG")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">This Week</p>
          <p className="text-xl font-bold font-mono">
            {filtered.filter((r) => {
              const d = new Date(r.createdAt);
              const now = new Date();
              return now.getTime() - d.getTime() < 7 * 86400000;
            }).length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterReason} onValueChange={setFilterReason}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            {REFUND_REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Refund list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <RotateCcw className="h-10 w-10 opacity-20" />
          <p className="text-sm font-medium">No refunds recorded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              {r.proofImageUrl ? (
                <div className="relative group h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted cursor-zoom-in" onClick={() => setSelectedProof(r.proofImageUrl)}>
                  <img src={r.proofImageUrl} alt="Proof" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[8px] text-white font-bold uppercase tracking-wider">View</span>
                  </div>
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <RotateCcw className="h-4 w-4" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.itemName}</p>
                <p className="text-xs text-muted-foreground">Qty: {r.quantity} · {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold font-mono text-destructive">-{NAIRA}{r.amountNgn.toLocaleString("en-NG")}</p>
                <Badge variant="outline" className="text-[10px]">{REFUND_REASONS.find((rr) => rr.value === r.reason)?.label ?? r.reason}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => setSelectedProof(null)}>
          <div className="relative max-w-lg w-full bg-card rounded-xl border p-2 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedProof(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={selectedProof} alt="Refund Proof Image" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
            <div className="p-3 text-center text-xs text-muted-foreground font-semibold">
              Item Refund Verification Proof Photo
            </div>
          </div>
        </div>
      )}

      <RefundFormSheet open={formOpen} onOpenChange={setFormOpen} sales={sales} />
    </div>
  );
}

function RefundFormSheet({ open, onOpenChange, sales }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sales: { id: string; items: { itemId: string; itemName: string; quantity: number; unitPriceNgn: number }[]; createdAt: string }[];
}) {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const { mutate: createRefund, isLoading } = useCreateRefund();
  const [saleId, setSaleId] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState<RefundReason>("customer_return");
  const [notes, setNotes] = useState("");
  const [proofImage, setProofImage] = useState("");
  const proofFileInputRef = useRef<HTMLInputElement>(null);

  const handleProofImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedSale = sales.find((s) => s.id === saleId);
  const selectedItem = selectedSale?.items.find((i) => i.itemId === itemId);

  const handleSubmit = () => {
    if (!selectedSale || !selectedItem) return;
    const refund: Refund = {
      id: `ref-${Date.now()}`,
      saleId,
      itemId: selectedItem.itemId,
      itemName: selectedItem.itemName,
      quantity: qty,
      amountNgn: selectedItem.unitPriceNgn * qty,
      reason,
      notes,
      proofImageUrl: proofImage || undefined,
      createdAt: new Date().toISOString(),
    };
    createRefund(refund, {
      onSuccess: () => {
        // Advanced notification dispatch
        if (isDemo && demoStore && bumpVersion) {
          demoStore.addNotification({
            id: `notif-${Date.now()}`,
            type: "request_update",
            title: `🔄 Refund Processed: ${selectedItem.itemName}`,
            message: `A refund of ${NAIRA}${(selectedItem.unitPriceNgn * qty).toLocaleString("en-NG")} for ${qty}x ${selectedItem.itemName} was successfully recorded.`,
            isRead: false,
            read: false,
            createdAt: new Date().toISOString()
          });
          bumpVersion();
        }

        toast.success(`Refund processed: ${NAIRA}${refund.amountNgn.toLocaleString("en-NG")}`);
        onOpenChange(false);
        setSaleId("");
        setItemId("");
        setQty(1);
        setNotes("");
        setProofImage("");
      },
      onError: () => toast.error("Failed to process refund")
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Process Refund</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Select Sale</Label>
            <Select value={saleId} onValueChange={(v) => { setSaleId(v); setItemId(""); }}>
              <SelectTrigger><SelectValue placeholder="Pick a sale..." /></SelectTrigger>
              <SelectContent>
                {sales.slice(0, 20).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {new Date(s.createdAt).toLocaleDateString()} — {s.items.length} items
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSale && (
            <div className="space-y-1.5">
              <Label className="text-xs">Select Item</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger><SelectValue placeholder="Pick item..." /></SelectTrigger>
                <SelectContent>
                  {selectedSale.items.map((i) => (
                    <SelectItem key={i.itemId} value={i.itemId}>{i.itemName} (×{i.quantity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Quantity</Label>
            <Input type="number" min={1} max={selectedItem?.quantity ?? 1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as RefundReason)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." rows={3} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Item Image Proof (Optional)</Label>
            <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-xl border">
              {proofImage ? (
                <div className="relative h-14 w-14 rounded-lg overflow-hidden border bg-muted shrink-0">
                  <img src={proofImage} alt="Proof preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setProofImage("")}
                    className="absolute top-0.5 right-0.5 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => proofFileInputRef.current?.click()}
                  className="h-14 w-14 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-muted/10 group shrink-0"
                >
                  <ImageIcon className="w-4 h-4 group-hover:scale-105 transition-transform" />
                  <span className="text-[8px] font-bold mt-0.5 uppercase">Upload</span>
                </button>
              )}
              <div className="flex-1 text-[10px] text-muted-foreground leading-normal">
                <p className="font-semibold text-foreground/80">Attach return condition proof</p>
                <p className="text-[9px]">Optional photo evidence of damage or defect.</p>
                <button
                  type="button"
                  onClick={() => proofFileInputRef.current?.click()}
                  className="text-primary font-bold underline mt-0.5 inline-block text-[9px]"
                >
                  Select image
                </button>
              </div>
            </div>
            <input
              type="file"
              ref={proofFileInputRef}
              onChange={handleProofImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          {selectedItem && (
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Refund Amount</p>
              <p className="text-lg font-bold font-mono text-destructive">
                {NAIRA}{(selectedItem.unitPriceNgn * qty).toLocaleString("en-NG")}
              </p>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={!selectedItem || isLoading} className="w-full gap-2">
            <RotateCcw className="h-4 w-4" /> {isLoading ? "Processing..." : "Process Refund"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
