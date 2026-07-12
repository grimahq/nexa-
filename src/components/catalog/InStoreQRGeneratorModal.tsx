import { useState, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getPublicUrl } from "@/lib/utils";
import { 
  QrCode, 
  Download, 
  Printer, 
  Store, 
  Utensils, 
  ShoppingBag, 
  PlusCircle, 
  MapPin, 
  Check, 
  Locate, 
  FileText,
  BadgeAlert,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDemo } from "@/hooks/useDemo";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useCategories } from "@/hooks/useInventoryData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InStoreQRGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InStoreQRGeneratorModal({ open, onOpenChange }: InStoreQRGeneratorModalProps) {
  const { isDemo, onboarding: demoOnboarding } = useDemo();
  const { settings: liveSettings } = useSystemSettings();
  const { data: categories } = useCategories();

  const activeSettings = isDemo ? demoOnboarding : liveSettings;
  const storeSlug = activeSettings.storeSlug || "sample-store";
  const storeName = activeSettings.storeName || "Our Store";

  const [sector, setSector] = useState<"restaurant" | "supermarket" | "pharmacy" | "vet" | "retail">("restaurant");
  const [label, setLabel] = useState("Table 1");
  const [targetCategory, setTargetCategory] = useState<string>("all");
  const [coordinates, setCoordinates] = useState({ lat: "6.5244", lng: "3.3792" }); // Lagos default

  const isDevUrl = window.location.origin.includes("ais-dev-");

  // Computed URL point for the scanning customer
  const generatedUrl = useMemo(() => {
    let baseUrl = getPublicUrl(`${window.location.origin}/store/${storeSlug}?source=instore_qr`);
    
    if (sector === "restaurant") {
      baseUrl += `&table=${encodeURIComponent(label)}`;
    } else if (sector === "supermarket") {
      baseUrl += `&aisle=${encodeURIComponent(label)}`;
    } else if (sector === "pharmacy") {
      baseUrl += `&shelf=${encodeURIComponent(label)}`;
    } else {
      baseUrl += `&section=${encodeURIComponent(label)}`;
    }

    if (targetCategory && targetCategory !== "all") {
      baseUrl += `&cat=${encodeURIComponent(targetCategory)}`;
    }

    if (coordinates.lat && coordinates.lng) {
      baseUrl += `&lat=${coordinates.lat}&lng=${coordinates.lng}`;
    }

    return baseUrl;
  }, [storeSlug, sector, label, targetCategory, coordinates]);

  const downloadQR = () => {
    const svg = document.getElementById("instore-qr-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 1200;
      canvas.height = 1200;
      // Background and framing styling for printing
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 1200, 1200);
        ctx.drawImage(img, 100, 100, 1000, 1000);
      }
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-${sector}-${label || "general"}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const printQR = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${storeName}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #fafafa;
              color: #1e293b;
            }
            .sticker-card {
              background: white;
              padding: 40px;
              border-radius: 24px;
              box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
              text-align: center;
              border: 3px solid #f1f5f9;
              max-width: 450px;
            }
            .header-info {
              font-size: 24px;
              font-weight: 800;
              color: #f97316;
              margin-bottom: 4px;
            }
            .store-name {
              font-size: 18px;
              font-weight: 500;
              color: #64748b;
              margin-bottom: 24px;
            }
            .qr-placeholder {
              margin: 20px auto;
              transition: transform 0.2s;
            }
            .footer-info {
              margin-top: 24px;
              padding-top: 16px;
              border-t: 1px border #f1f5f9;
            }
            .instruction {
              font-size: 20px;
              font-weight: 800;
              margin-bottom: 6px;
            }
            .sub-instruction {
              font-size: 13px;
              color: #64748b;
            }
            .badge {
              display: inline-block;
              background: #f0fdf4;
              color: #166534;
              font-size: 11px;
              font-weight: 700;
              padding: 4px 10px;
              border-radius: 9999px;
              margin-top: 10px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
          </style>
        </head>
        <body>
          <div class="sticker-card">
            <div class="header-info">⚡ SCAN & ORDER HERE</div>
            <div class="store-name">${storeName}</div>
            <div class="qr-placeholder">
              ${document.getElementById("instore-qr-svg-container")?.innerHTML || ""}
            </div>
            <div class="footer-info">
              <div class="instruction">${sector === "restaurant" ? `🍳 ${label}` : `🛒 ${label}`}</div>
              <div class="badge">🌐 Geo-fenced Secure Order</div>
              <p class="sub-instruction" style="margin-top:12px;">Powered by Nexa Social Commerce. Scan, cart your favorites, choose Moniepoint transfer and collect instantly on-site!</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <QrCode className="h-5 w-5 text-primary" />
            In-Store Self-Checkout & Table QR Generator
          </DialogTitle>
          <DialogDescription>
            Configures localized QR codes for specific areas of your business. Customers scan these stickers to view menus/inventories, order instantly, and checkout securely on-site.
          </DialogDescription>
        </DialogHeader>

        {isDevUrl && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-700 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-800">
              <span className="text-sm">💡</span> Sandbox Testing Tip
            </p>
            <p className="leading-relaxed">
              You are currently inside the private development workspace. To scan generated table QR codes on your phone or external device, the QR code has been automatically configured to use the <strong>Public Shared App URL</strong>.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Left panel: configure parameters */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Business Category</Label>
              <div className="grid grid-cols-5 gap-2">
                <Button 
                  type="button"
                  variant={sector === "restaurant" ? "default" : "outline"}
                  onClick={() => { setSector("restaurant"); setLabel("Table 1"); }}
                  className="h-14 flex flex-col items-center justify-center gap-1 p-1"
                >
                  <Utensils className="h-4 w-4" />
                  <span className="text-[10px]">Restaurant</span>
                </Button>
                <Button 
                  type="button"
                  variant={sector === "supermarket" ? "default" : "outline"}
                  onClick={() => { setSector("supermarket"); setLabel("Aisle A-2"); }}
                  className="h-14 flex flex-col items-center justify-center gap-1 p-1"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span className="text-[10px]">Supermarket</span>
                </Button>
                <Button 
                  type="button"
                  variant={sector === "pharmacy" ? "default" : "outline"}
                  onClick={() => { setSector("pharmacy"); setLabel("Counter Row B"); }}
                  className="h-14 flex flex-col items-center justify-center gap-1 p-1"
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-[10px]">Pharmacy</span>
                </Button>
                <Button 
                  type="button"
                  variant={sector === "retail" ? "default" : "outline"}
                  onClick={() => { setSector("retail"); setLabel("Fashion Sec B"); }}
                  className="h-14 flex flex-col items-center justify-center gap-1 p-1"
                >
                  <Store className="h-4 w-4" />
                  <span className="text-[10px]">Retail</span>
                </Button>
                <Button 
                  type="button"
                  variant={sector === "vet" ? "default" : "outline"}
                  onClick={() => { setSector("vet"); setLabel("Pet Row 3"); }}
                  className="h-14 flex flex-col items-center justify-center gap-1 p-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className="text-[10px]">Vet/Custom</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qr-label" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {sector === "restaurant" ? "Table / Booth Number" : sector === "supermarket" ? "Aisle / Shelf Label" : "Row / Shelf Section"}
              </Label>
              <Input 
                id="qr-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={sector === "restaurant" ? "e.g. Table 15" : "e.g. Aisle 4 (Beverages)"}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qr-category" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Default Target Category (Optional)</Label>
              <select
                id="qr-category"
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full h-11 px-3 border border-input rounded-md bg-background text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="all">Entire Storefront Catalog</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Store Geofence Anchor Coordinates
              </div>
              <p className="text-[11px] text-muted-foreground">
                Locks checkout to physical device GPS within 250 meters of these coordinates to block home orders.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[9px] text-neutral-400">LATITUDE</span>
                  <Input 
                    value={coordinates.lat} 
                    onChange={(e) => setCoordinates({ ...coordinates, lat: e.target.value })}
                    className="h-9 font-mono text-xs" 
                    placeholder="6.5244"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-neutral-400">LONGITUDE</span>
                  <Input 
                    value={coordinates.lng} 
                    onChange={(e) => setCoordinates({ ...coordinates, lng: e.target.value })}
                    className="h-9 font-mono text-xs" 
                    placeholder="3.3792"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: sticker mockup & actions */}
          <div className="flex flex-col items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-border">
            <div className="text-center w-full max-w-[280px] bg-white dark:bg-slate-950 p-5 rounded-2xl border-4 border-amber-500/20 shadow-xl relative overflow-hidden flex flex-col items-center">
              
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-amber-500 animate-pulse" />
              
              <p className="text-[13px] font-black text-amber-500 leading-none uppercase tracking-wide">⭐ SCAN & ORDER HERE</p>
              <h4 className="text-[11px] text-muted-foreground font-semibold mt-1 mb-4 truncate w-full">{storeName}</h4>
              
              <div id="instore-qr-svg-container" className="p-3 bg-white border border-neutral-100 rounded-xl shadow-inner inline-block">
                <QRCodeSVG
                  id="instore-qr-svg"
                  value={generatedUrl}
                  size={160}
                  level="H"
                  includeMargin={false}
                  className="h-36 w-36"
                />
              </div>

              <div className="mt-4 border-t border-neutral-100 dark:border-slate-800 w-full pt-3 text-center">
                <p className="text-[15px] font-extrabold text-foreground">{label || "General Aisle"}</p>
                <div className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 text-[9px] font-bold px-2 py-0.5 mt-1 rounded-full uppercase">
                  <MapPin className="h-2 w-2" /> Geo-fenced Active
                </div>
              </div>
            </div>

            <div className="w-full space-y-2 mt-6">
              <div className="text-[11px] text-muted-foreground text-center truncate max-w-full px-2">
                URL encoded: <span className="font-mono bg-muted p-1 rounded max-w-full inline-block truncate">{generatedUrl}</span>
              </div>
              <div className="flex w-full gap-2">
                <Button variant="outline" className="flex-1 h-11 gap-1.5 text-xs text-foreground" onClick={downloadQR}>
                  <Download className="h-4 w-4" /> Save PNG
                </Button>
                <Button className="flex-1 h-11 gap-1.5 text-xs text-white" onClick={printQR}>
                  <Printer className="h-4 w-4" /> Print Sticker
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
