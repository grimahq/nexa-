import { QRCodeSVG } from "qrcode.react";
import { QrCode, Download, Printer } from "lucide-react";
import { getPublicUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Item } from "@/types/inventory";

interface QRCodeDialogProps {
  item: Item;
  trigger?: React.ReactNode;
}

export function QRCodeDialog({ item, trigger }: QRCodeDialogProps) {
  const isDevUrl = window.location.origin.includes("ais-dev-");
  // Append source=qr for CRM tracking
  const qrSourceId = `qrs_${item.storeId || "store"}_product_${item.id}`;
  const orderUrl = getPublicUrl(`${window.location.origin}/store/product/${item.id}?source=qr&qrSourceId=${qrSourceId}`);

  const downloadQR = () => {
    const svg = document.getElementById(`qr-${item.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      ctx?.drawImage(img, 0, 0, 1000, 1000);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-${item.sku || item.id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <QrCode className="h-4 w-4" />
            Generate QR
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Item QR Code</DialogTitle>
          <DialogDescription>
            Customers can scan this code to view and order {item.name}.
          </DialogDescription>
        </DialogHeader>

        {isDevUrl && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-700 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-800">
              <span className="text-sm">💡</span> Sandbox Testing Tip
            </p>
            <p className="leading-relaxed">
              To test the QR scan on your phone, this code is set to use the <strong>Public Shared App URL</strong>.
            </p>
          </div>
        )}
        
        <div className="flex flex-col items-center justify-center space-y-6 py-4">
          <div className="rounded-2xl border-8 border-white bg-white p-4 shadow-xl">
            <QRCodeSVG
              id={`qr-${item.id}`}
              value={orderUrl}
              size={200}
              level="H"
              includeMargin={false}
              className="h-48 w-48"
            />
          </div>
          
          <div className="flex flex-col items-center text-center">
            <p className="text-sm font-bold">{item.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
          </div>

          <div className="flex w-full gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={downloadQR}>
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button className="flex-1 gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
