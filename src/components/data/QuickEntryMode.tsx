import { useState, useRef, useCallback, useEffect } from "react";
import { ScanBarcode, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useItems } from "@/hooks/useInventoryData";
import { useCreateMovement } from "@/hooks/useInventoryMutations";
import { MovementType } from "@/types/inventory";
import type { Item, StockMovement } from "@/types/inventory";
import { toast } from "sonner";

interface QuickEntryModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickEntryMode({ open, onOpenChange }: QuickEntryModeProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [foundItem, setFoundItem] = useState<Item | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<MovementType>(MovementType.Received);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: items } = useItems();
  const createMovement = useCreateMovement();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  const stopScanning = useCallback(async () => {
    try {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        await html5QrcodeRef.current.stop();
      }
    } catch (err) {
      console.warn("Stop scanner warning:", err);
    } finally {
      setIsCameraActive(false);
    }
  }, []);

  const startScanning = useCallback(() => {
    setIsCameraActive(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("movement-camera-reader");
        html5QrcodeRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.75;
              return { width: size, height: size };
            },
          },
          (decodedText) => {
            stopScanning();
            setBarcodeInput(decodedText);
            
            const query = decodedText.trim();
            const item = items?.find(
              (i) => i.barcode?.toLowerCase() === query.toLowerCase() || i.sku.toLowerCase() === query.toLowerCase()
            );

            if (item) {
              setFoundItem(item);
              setNotFound(null);
              toast.success(`Recognized: ${item.name}`);
            } else {
              setFoundItem(null);
              setNotFound(query);
              toast.info(`Scanned code "${query}" is not registered.`);
            }
          },
          () => {}
        );
      } catch (err) {
        console.error("Failed to start movement scanner:", err);
        setIsCameraActive(false);
      }
    }, 400);
  }, [items, stopScanning]);

  // Monitor sheet open state and toggle scanning
  useEffect(() => {
    if (open) {
      startScanning();
    } else {
      stopScanning();
    }
    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(e => console.warn("Cleanup error:", e));
      }
    };
  }, [open, startScanning, stopScanning]);

  const resetForm = useCallback(() => {
    setFoundItem(null);
    setNotFound(null);
    setMovementType(MovementType.Received);
    setQuantity("");
    setNotes("");
    setBarcodeInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
    startScanning();
  }, [startScanning]);

  // Auto-focus input when opened or after action if camera is not active
  useEffect(() => {
    if (open && !isCameraActive) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, isCameraActive]);

  const handleLookup = useCallback(() => {
    const query = barcodeInput.trim();
    if (!query) return;

    const item = items.find(
      (i) => i.barcode?.toLowerCase() === query.toLowerCase() || i.sku.toLowerCase() === query.toLowerCase()
    );

    if (item) {
      setFoundItem(item);
      setNotFound(null);
    } else {
      setFoundItem(null);
      setNotFound(query);
    }
  }, [barcodeInput, items]);

  const handleSubmit = useCallback(() => {
    if (!foundItem || !quantity) return;

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      itemId: foundItem.id,
      type: movementType,
      quantity: Number(quantity),
      fromLocationId: null,
      toLocationId: null,
      reference: `Quick Entry`,
      notes,
      performedBy: "Demo Admin",
      createdAt: new Date().toISOString(),
    };

    createMovement.mutate(movement, {
      onSuccess: () => {
        toast.success(`${movementType} ${quantity} × ${foundItem.name}`);
        resetForm();
      },
    });
  }, [foundItem, movementType, quantity, notes, createMovement, resetForm]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (foundItem || notFound) {
        resetForm();
      } else {
        onOpenChange(false);
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <SheetContent className="w-full sm:max-w-[480px]" onKeyDown={handleKeyDown}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            Quick Entry
          </SheetTitle>
          <SheetDescription>Scan or type a barcode to look up an item and log a movement.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Live Camera Scanner Box */}
          {!foundItem && !notFound && isCameraActive && (
            <div className="relative h-44 rounded-xl border border-border overflow-hidden bg-black flex items-center justify-center">
              <div id="movement-camera-reader" className="absolute inset-0 w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full z-0" />
              {/* Corner bracket overlay styles */}
              <div className="absolute top-3 left-3 h-4 w-4 border-t border-l border-neutral-400 rounded-tl-sm z-10" />
              <div className="absolute top-3 right-3 h-4 w-4 border-t border-r border-neutral-400 rounded-tr-sm z-10" />
              <div className="absolute bottom-3 left-3 h-4 w-4 border-b border-l border-neutral-400 rounded-bl-sm z-10" />
              <div className="absolute bottom-3 right-3 h-4 w-4 border-b border-r border-neutral-400 rounded-br-sm z-10" />
              <div className="absolute left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] z-10 animate-bounce" style={{ animationDuration: '3s' }} />
            </div>
          )}

          {/* Barcode input */}
          <div>
            <Label htmlFor="barcode-scan" className="text-sm font-medium">Barcode / SKU</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="barcode-scan"
                ref={inputRef}
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLookup(); }}
                placeholder="Scan or type barcode…"
                className="h-12 text-lg font-mono"
                autoFocus
                autoComplete="off"
              />
              <Button onClick={handleLookup} className="h-12 px-5" disabled={!barcodeInput.trim()}>
                Look up
              </Button>
            </div>
          </div>

          {/* Not found */}
          {notFound && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
              <p className="text-sm font-medium text-destructive">Item not found</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{notFound}</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={resetForm}>
                Try again
              </Button>
            </div>
          )}

          {/* Found item */}
          {foundItem && (
            <>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{foundItem.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{foundItem.sku}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetForm} aria-label="Clear item">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex gap-4 text-sm">
                  <span className="text-muted-foreground">Current stock:</span>
                  <span className="font-semibold font-mono">{foundItem.currentStock}</span>
                </div>
              </div>

              {/* Compact movement form */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Movement Type</Label>
                  <Select value={movementType} onValueChange={(v) => setMovementType(v as MovementType)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={MovementType.Received}>Received</SelectItem>
                      <SelectItem value={MovementType.Shipped}>Shipped</SelectItem>
                      <SelectItem value={MovementType.Adjusted}>Adjusted</SelectItem>
                      <SelectItem value={MovementType.Transferred}>Transferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    className="mt-1"
                    onKeyDown={(e) => { if (e.key === "Enter" && quantity) handleSubmit(); }}
                  />
                </div>

                <div>
                  <Label className="text-sm">Notes (optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="mt-1"
                    rows={2}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!quantity || createMovement.isLoading}
                  className="w-full"
                >
                  {createMovement.isLoading ? "Logging…" : "Log Movement"}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
