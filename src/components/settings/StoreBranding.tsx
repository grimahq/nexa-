import { useState, useEffect } from "react";
import { Palette, Upload, Save, QrCode, Download, Printer, Copy, Check, ExternalLink } from "lucide-react";
import { getPublicUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDemo } from "@/hooks/useDemo";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

const BRAND_COLORS = [
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Orange", value: "#f97316" },
  { label: "Green", value: "#22c55e" },
];

export function StoreBranding() {
  const { isDemo, onboarding: demoOnboarding, updateOnboarding } = useDemo();
  const { settings: liveSettings, updateSettings } = useSystemSettings();

  const activeSettings = isDemo ? demoOnboarding : liveSettings;

  const [selectedColor, setSelectedColor] = useState(activeSettings.brandColor ?? "#0d9488");
  const [logoUrl, setLogoUrl] = useState(activeSettings.logoUrl ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedColor(activeSettings.brandColor ?? "#0d9488");
    setLogoUrl(activeSettings.logoUrl ?? "");
  }, [activeSettings]);

  const handleSave = async () => {
    const data = { brandColor: selectedColor, logoUrl: logoUrl.trim() };
    try {
      if (isDemo) {
        updateOnboarding(data);
      } else {
        await updateSettings(data);
      }
      toast.success("Branding updated");
    } catch (err) {
      toast.error("Failed to update branding");
    }
  };

  const storeSlug = activeSettings.storeSlug || "general";
  const rawShopUrl = `${window.location.origin}/store/${storeSlug}`;
  const shopUrl = getPublicUrl(rawShopUrl);
  const isDevUrl = window.location.origin.includes("ais-dev-");

  const copyUrl = () => {
    navigator.clipboard.writeText(shopUrl);
    setCopied(true);
    toast.success("Shop URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadShopQR = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Draw rounded container with border & shadow
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 1100);

    // Border
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 788, 1088);

    // Color band at the top
    ctx.fillStyle = selectedColor || "#0d9488";
    ctx.fillRect(12, 12, 776, 30);

    // 2. Title Text
    ctx.fillStyle = "#0f172a";
    ctx.textAlign = "center";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("SCAN & CHOOSE PRODUCTS", 400, 120);

    // Store Name
    ctx.fillStyle = "#64748b";
    ctx.font = "500 30px sans-serif";
    ctx.fillText(activeSettings.storeName || "Our Store", 400, 175);

    // 3. Draw the QR code in the middle
    const qrSvg = document.getElementById("shop-qr-svg-element");
    if (!qrSvg) return;

    const svgData = new XMLSerializer().serializeToString(qrSvg);
    const qrImg = new Image();
    qrImg.onload = () => {
      // Draw QR image centered
      ctx.drawImage(qrImg, 150, 240, 500, 500);

      // 4. Instructions under QR
      ctx.fillStyle = "#0f172a";
      ctx.font = "800 34px sans-serif";
      ctx.fillText("ONLINE CATALOG & CHECKOUT", 400, 810);

      ctx.fillStyle = selectedColor || "#0d9488";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("⚡ ORDER & PAY SECURELY FROM YOUR DEVICE", 400, 860);

      // Divider line
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(100, 910);
      ctx.lineTo(700, 910);
      ctx.stroke();

      // 5. Powered by Nexa Digital Solutions LTD
      const rx = 240, ry = 955, rw = 40, rh = 40, rrad = 8;
      ctx.beginPath();
      ctx.moveTo(rx + rrad, ry);
      ctx.lineTo(rx + rw - rrad, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rrad);
      ctx.lineTo(rx + rw, ry + rh - rrad);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rrad, ry + rh);
      ctx.lineTo(rx + rrad, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rrad);
      ctx.lineTo(rx, ry + rrad);
      ctx.quadraticCurveTo(rx, ry, rx + rrad, ry);
      ctx.closePath();
      
      const grad = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
      grad.addColorStop(0, "#0d9488");
      grad.addColorStop(1, "#d97706");
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(rx + 11, ry + 29);
      ctx.lineTo(rx + 11, ry + 11);
      ctx.lineTo(rx + 21, ry + 24);
      ctx.lineTo(rx + 21, ry + 11);
      ctx.lineTo(rx + 29, ry + 29);
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.textAlign = "left";
      ctx.font = "600 22px sans-serif";
      ctx.fillText("Powered by Nexa Digital Solutions LTD", 300, 982);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${(activeSettings.storeName || "Store").replace(/\s+/g, "-")}-Branded-QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    qrImg.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printShopQR = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const qrSvgContainer = document.getElementById("shop-qr-svg-container");
    const qrSvgHtml = qrSvgContainer?.innerHTML || "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Branded Shop QR - ${activeSettings.storeName || "Our Store"}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #fafafa;
              color: #0f172a;
            }
            .sticker-card {
              background: white;
              padding: 48px;
              border-radius: 28px;
              box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
              text-align: center;
              border: 3px solid #e2e8f0;
              max-width: 480px;
              position: relative;
              overflow: hidden;
            }
            .color-bar {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 10px;
              background: ${selectedColor};
            }
            .header-info {
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              letter-spacing: -0.025em;
              margin-top: 10px;
              margin-bottom: 4px;
            }
            .store-name {
              font-size: 18px;
              font-weight: 600;
              color: #64748b;
              margin-bottom: 28px;
            }
            .qr-container {
              margin: 24px auto;
              padding: 16px;
              background: #ffffff;
              border: 1px solid #f1f5f9;
              border-radius: 20px;
              display: inline-block;
            }
            .footer-info {
              margin-top: 28px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
            }
            .instruction {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 6px;
            }
            .sub-instruction {
              font-size: 12px;
              color: ${selectedColor};
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 16px;
            }
            .nexa-footer {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              margin-top: 16px;
            }
            .nexa-logo {
              width: 32px;
              height: 32px;
              border-radius: 6px;
              background: linear-gradient(135deg, #0d9488, #d97706);
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .nexa-logo svg {
              width: 20px;
              height: 20px;
            }
            .nexa-text {
              font-size: 13px;
              font-weight: 600;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="sticker-card">
            <div class="color-bar"></div>
            <div class="header-info">SCAN &amp; CHOOSE PRODUCTS</div>
            <div class="store-name">${activeSettings.storeName || "Our Store"}</div>
            
            <div class="qr-container">
              ${qrSvgHtml}
            </div>

            <div class="footer-info">
              <div class="instruction">ONLINE CATALOG &amp; CHECKOUT</div>
              <div class="sub-instruction">⚡ ORDER &amp; PAY SECURELY FROM YOUR DEVICE</div>
              
              <div class="nexa-footer">
                <div class="nexa-logo">
                  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 24V8L16 18V8L24 24" stroke="white" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
                <span class="nexa-text">Powered by Nexa Digital Solutions LTD</span>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
          <div style="display:none;" id="shop-qr-svg-container">${qrSvgHtml}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary" /> Store Branding
          </CardTitle>
          <CardDescription>
            Customize the colors and logo displayed on your public customer store interface.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Brand Color</Label>
            <div className="flex flex-wrap gap-3">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedColor(c.value)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div
                    className="h-10 w-10 rounded-full border-2 transition-all group-hover:scale-105"
                    style={{
                      backgroundColor: c.value,
                      borderColor: selectedColor === c.value ? "var(--foreground)" : "transparent",
                      transform: selectedColor === c.value ? "scale(1.1)" : "scale(1)",
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">{c.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Label className="text-xs shrink-0">Custom</Label>
              <Input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="h-9 w-16 p-1 cursor-pointer"
              />
              <span className="text-xs font-mono text-muted-foreground">{selectedColor}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logo URL</Label>
            <div className="relative">
              <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="pl-10"
              />
            </div>
            {logoUrl && (
              <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20">
                <img src={logoUrl} alt="Logo preview" className="h-12 w-12 rounded object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                <span className="text-xs text-muted-foreground">Logo preview</span>
              </div>
            )}
          </div>

          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" /> Save Branding
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4 text-primary" /> Shop QR Code Flyer
          </CardTitle>
          <CardDescription>
            Download or print a premium, branded QR code sticker. Customers scan this code to browse your online catalog, view stock status, and self-checkout securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isDevUrl && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-700 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-800">
                <span className="text-sm">💡</span> Sandbox Testing Tip
              </p>
              <p className="leading-relaxed">
                You are currently in the development environment. To scan this QR code on your mobile phone, use the <strong>Public Shared App URL</strong>.
              </p>
              <p className="leading-relaxed mt-1 font-medium text-amber-800">
                We've automatically optimized the QR code below to target your public unauthenticated URL for seamless mobile scanning!
              </p>
            </div>
          )}

          {/* Interactive Live Flyer Preview */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-[280px] bg-white border-2 border-slate-100 rounded-2xl shadow-xl p-6 text-center overflow-hidden transition-all duration-300 hover:shadow-2xl">
              {/* Dynamic top brand bar */}
              <div 
                className="absolute top-0 left-0 right-0 h-2.5 transition-colors duration-300" 
                style={{ backgroundColor: selectedColor }}
              />
              
              <div className="text-[14px] font-extrabold text-slate-800 tracking-tight mt-1">SCAN & CHOOSE PRODUCTS</div>
              <div className="text-[11px] font-medium text-slate-400 truncate mb-4">{activeSettings.storeName || "Our Store"}</div>
              
              {/* Center QR container */}
              <div id="shop-qr-svg-container" className="inline-block p-4 bg-slate-50 border border-slate-100 rounded-xl mb-4 transition-all duration-300">
                <QRCodeSVG
                  id="shop-qr-svg-element"
                  value={shopUrl}
                  size={140}
                  level="H"
                  fgColor={selectedColor}
                  bgColor="#ffffff"
                  includeMargin={false}
                />
              </div>

              <div className="text-[12px] font-extrabold text-slate-800 tracking-wide">ONLINE CATALOG & CHECKOUT</div>
              <div 
                className="text-[8px] font-bold tracking-wider mt-1 transition-colors duration-300"
                style={{ color: selectedColor }}
              >
                ⚡ ORDER & PAY SECURELY FROM YOUR DEVICE
              </div>

              <div className="border-t border-slate-100 my-4" />

              {/* Powered by Nexa Footer */}
              <div className="flex items-center justify-center gap-1.5">
                <div className="h-6 w-6 rounded-md bg-gradient-to-br from-teal-500 to-amber-500 flex items-center justify-center shrink-0">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 24V8L16 18V8L24 24" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-[8px] font-semibold text-slate-400">POWERED BY</div>
                  <div className="text-[9px] font-bold text-slate-600 leading-none">Nexa Digital Solutions LTD</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-10 gap-1.5" onClick={downloadShopQR}>
                <Download className="h-4 w-4" /> Download
              </Button>
              <Button size="sm" className="flex-1 h-10 gap-1.5" onClick={printShopQR}>
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>
            
            <div className="flex items-center gap-2 p-2.5 bg-muted/30 border border-border/80 rounded-lg">
              <Input 
                readOnly 
                value={shopUrl} 
                className="h-8 text-xs bg-transparent border-none shadow-none focus-visible:ring-0 px-0 text-muted-foreground select-all" 
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={copyUrl}>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" asChild>
                <a href={shopUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
