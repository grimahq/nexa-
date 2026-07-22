import { useState, useEffect } from "react";
import { Palette, Upload, Save, QrCode, Download, Printer, Copy, Check, ExternalLink, Trash2 } from "lucide-react";
import { getPublicUrl, getStorefrontUrl, getCleanStoreSlug } from "@/lib/utils";
import { NexaLogo } from "@/components/shared/NexaLogo";
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
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    setSelectedColor(activeSettings.brandColor ?? "#0d9488");
    setLogoUrl(activeSettings.logoUrl ?? "");
  }, [activeSettings]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG or PNG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize using a canvas to keep base64 extremely lightweight
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setLogoUrl(dataUrl);
          toast.success("Logo uploaded and optimized!");
        } else {
          setLogoUrl(event.target?.result as string);
          toast.success("Logo uploaded!");
        }
      };
      img.onerror = () => {
        toast.error("Failed to load image file.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

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

  const storeSlug = getCleanStoreSlug(activeSettings.storeSlug, activeSettings.storeName);
  const qrSourceId = `qrs_${storeSlug}_main`;
  const shopUrl = getStorefrontUrl(storeSlug, "", { qrSourceId });
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

      // 5. Powered by NexaStoreOS
      ctx.fillStyle = "#94a3b8"; // Slate 400
      ctx.textAlign = "center";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("POWERED BY", 400, 940);

      ctx.fillStyle = "#1A3FBF"; // Deep Royal Blue
      ctx.font = "900 26px sans-serif";
      ctx.fillText("NexaStoreOS", 400, 980);

      ctx.fillStyle = "#2563EB"; // Cobalt Blue
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("Click to create your store: www.nexastoreos.com", 400, 1025);

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
              
              <div class="nexa-footer" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; margin-top: 16px;">
                <div style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;">Powered by</div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <svg style="height: 20px;" viewBox="0 0 210 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g transform="translate(2, 4)">
                      <path d="M 8 25 C 8 16 9.5 7 12 7 L 19.5 24" stroke="#2563EB" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M 21.5 24 C 23.2 17 24.5 12 24.5 7" stroke="#00B4D8" stroke-width="4.5" stroke-linecap="round" />
                    </g>
                    <text x="38" y="26" fill="#1A3FBF" font-family="Montserrat, Poppins, sans-serif" font-weight="900" font-size="19px" letter-spacing="-0.5px">Nexa</text>
                    <text x="84" y="26" fill="#00B4D8" font-family="Montserrat, Poppins, sans-serif" font-weight="800" font-size="19px" letter-spacing="-0.5px">Store</text>
                    <text x="137" y="26" fill="#475569" font-family="Montserrat, Poppins, sans-serif" font-weight="700" font-size="19px" letter-spacing="-0.5px">OS</text>
                  </svg>
                </div>
                <a href="${import.meta.env.VITE_LANDING_URL || "https://nexastoreos.com"}" target="_blank" style="font-size: 11px; font-weight: 700; color: #2563EB; text-decoration: none; margin-top: 4px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #dbeafe; padding: 4px 8px; border-radius: 6px; background-color: #eff6ff; font-family: system-ui, -apple-system, sans-serif;">
                  <span>Click to create your store 🚀</span>
                </a>
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
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Store Logo</Label>
            
            {logoUrl ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-dashed border-border p-4 bg-muted/20">
                <div className="relative group">
                  <img 
                    src={logoUrl} 
                    alt="Logo preview" 
                    className="h-20 w-20 rounded-lg object-contain bg-white border border-border shadow-sm p-1" 
                    onError={(e) => (e.currentTarget.style.display = "none")} 
                  />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs font-semibold">Logo uploaded successfully</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Optimized for high performance on both receipts and customer screens.</p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setLogoUrl("")}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remove Logo
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-all duration-200 text-center ${
                  dragActive 
                    ? "border-primary bg-primary/5 scale-[0.99]" 
                    : "border-muted-foreground/20 hover:border-muted-foreground/40 bg-muted/5"
                }`}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  Drag & drop your store logo, or <span className="text-primary hover:underline">browse</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Supports JPG, JPEG, or PNG. Auto-optimized for instant loading.
                </p>
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
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest">Powered by</div>
                <a 
                  href={`${import.meta.env.VITE_LANDING_URL || "https://nexastoreos.com"}/?utm_source=qr_flyer_preview&utm_medium=merchant_settings&utm_campaign=${encodeURIComponent(storeSlug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <NexaLogo variant="full" height={16} className="text-foreground shrink-0" />
                </a>
                <a 
                  href={`${import.meta.env.VITE_LANDING_URL || "https://nexastoreos.com"}/?utm_source=qr_flyer_preview_cta&utm_medium=merchant_settings&utm_campaign=${encodeURIComponent(storeSlug)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md mt-1 hover:brightness-110 transition-all animate-pulse"
                >
                  Click to create your store 🚀
                </a>
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
