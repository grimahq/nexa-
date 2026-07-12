import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useItems, useCategories } from "@/hooks/useInventoryData";
import { QRCodeSVG } from "qrcode.react";
import { logQRLeadEvent } from "@/utils/qrTracking";
import { 
  ShoppingBag, 
  Search, 
  ChevronRight, 
  MessageCircle, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Info,
  X,
  CreditCard,
  Landmark,
  MapPin,
  Sparkles,
  Locate,
  Check,
  Ticket,
  QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useDemo } from "@/hooks/useDemo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useInventoryMutation } from "@/hooks/useInventoryMutation";
import type { Item, SaleItem, SaleTransaction } from "@/types/inventory";

export const Route = createFileRoute("/store/$slug")({
  component: PublicStorefront,
});

interface CartItem extends SaleItem {
  id: string;
}

function PublicStorefront() {
  const { slug } = Route.useParams();
  const { data: allItems, isLoading } = useItems();
  const { data: categories } = useCategories();
  const { isDemo, onboarding: demoOnboarding } = useDemo();
  const { settings: liveSettings } = useSystemSettings();
  const { addSale } = useInventoryMutation();
  
  const onboarding = isDemo ? demoOnboarding : liveSettings;
  const [search, setSearch] = useState("");

  // Log QR scan lead event if qrSourceId is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qrSourceId = params.get("qrSourceId");
    if (qrSourceId && onboarding) {
      const parts = qrSourceId.split("_");
      const branchId = parts[2] && parts[2] !== "main" ? parts[2] : null;
      const storeId = onboarding.id || onboarding.storeSlug || slug || "sample-store";
      
      logQRLeadEvent({
        qrSourceId,
        storeId,
        branchId,
        eventType: "scan"
      });
    }
  }, [onboarding, slug]);

  const queryParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const qrTable = queryParams.get("table");
  const qrAisle = queryParams.get("aisle");
  const qrShelf = queryParams.get("shelf");
  const qrSection = queryParams.get("section");
  const urlCategory = queryParams.get("cat");
  
  const qrLatitude = queryParams.get("lat");
  const qrLongitude = queryParams.get("lng");

  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return p.get("cat") || null;
    }
    return null;
  });
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Item | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  useEffect(() => {
    if (selectedProduct) {
      const colorsList = selectedProduct.color 
        ? selectedProduct.color.split(",").map(c => c.trim()).filter(Boolean)
        : [];
      const sizesList = selectedProduct.sizes 
        ? selectedProduct.sizes.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      setSelectedColor(colorsList[0] || "");
      setSelectedSize(sizesList[0] || "");
    } else {
      setSelectedColor("");
      setSelectedSize("");
    }
  }, [selectedProduct]);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"details" | "payment" | "success">("details");
  
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", address: "" });

  // Delivery Method state (Default to instore if any QR parameters are available)
  const [deliveryMethod, setDeliveryMethod] = useState<"instore" | "delivery">(() => {
    if (qrTable || qrAisle || qrShelf || qrSection) {
      return "instore";
    }
    return "delivery";
  });

  // Table/Aisle number inputs
  const inStoreLocationLabel = qrTable || qrAisle || qrShelf || qrSection || "Table 1";

  // Geofencing states
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [isInsideGeofence, setIsInsideGeofence] = useState<boolean | null>(() => {
    // If no coordinates are loaded, bypass validation to true
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return !p.get("lat") && !p.get("lng") ? true : null;
    }
    return true;
  });
  const [simulatedOnSite, setSimulatedOnSite] = useState(false);
  const [orderIdRef, setOrderIdRef] = useState(() => `NEX-${Math.floor(Math.random() * 89999 + 10000)}`);

  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const verifyGeofence = () => {
    if (!qrLatitude || !qrLongitude) {
      setIsInsideGeofence(true);
      return;
    }

    setIsVerifyingLocation(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setIsInsideGeofence(false);
      setIsVerifyingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const uLat = position.coords.latitude;
        const uLng = position.coords.longitude;
        setUserLocation({ lat: uLat, lng: uLng });
        
        const targetLat = parseFloat(qrLatitude);
        const targetLng = parseFloat(qrLongitude);

        const dist = getDistanceInMeters(uLat, uLng, targetLat, targetLng);
        if (dist <= 250) {
          setIsInsideGeofence(true);
          toast.success(`Welcome! Confirmed on-site (${Math.round(dist)}m away)`);
        } else {
          setIsInsideGeofence(false);
          toast.warning(`You are ${Math.round(dist / 1000)}km away. In-store pickup defaults to remote.`);
        }
        setIsVerifyingLocation(false);
      },
      (error) => {
        console.error("GPS error:", error);
        setIsInsideGeofence(false);
        setIsVerifyingLocation(false);
        toast.info("Could not resolve location. Tap 'Simulate On-site' to verify instantly!");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const simulateOnsiteGPS = () => {
    setIsVerifyingLocation(true);
    setTimeout(() => {
      setIsInsideGeofence(true);
      setSimulatedOnSite(true);
      setIsVerifyingLocation(false);
      toast.success("GPS override successful! Locked to on-site checkout mode.");
    }, 850);
  };

  const filteredItems = useMemo(() => {
    if (!allItems) return [];
    return allItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                           item.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
      const isEcommerce = item.isEcommerceEnabled !== false; // Default true if not explicitly false
      return matchesSearch && matchesCategory && item.status === "active" && isEcommerce;
    });
  }, [allItems, search, selectedCategory]);

  const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + (item.unitPriceNgn * item.quantity), 0), [cart]);

  const addToCart = (product: Item, color?: string, size?: string) => {
    const configStr = (color || size) ? JSON.stringify({ color, size }) : "";
    const uniqueCartId = configStr ? `${product.id}:${configStr}` : product.id;

    setCart(prev => {
      const existing = prev.find(i => i.id === uniqueCartId);
      if (existing) {
        return prev.map(i => i.id === uniqueCartId ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const newItem: CartItem = {
        id: uniqueCartId,
        itemId: product.id,
        itemName: product.name,
        sku: product.sku,
        quantity: 1,
        unit: product.unit,
        multiplier: 1,
        unitPriceNgn: product.sellingPrice,
        imageUrl: product.imageUrl || undefined,
        customFields: {
          color: color || undefined,
          size: size || undefined
        }
      };
      return [...prev, newItem];
    });
    const optionsLabel = [color, size].filter(Boolean).join(" - ");
    toast.success(`${product.name}${optionsLabel ? ` (${optionsLabel})` : ""} added to bag`);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const handleCheckout = async () => {
    if (checkoutStep === "details") {
      setCheckoutStep("payment");
      return;
    }

    if (checkoutStep === "payment") {
      // Simulate/Trigger Moniepoint payment
      setCheckoutStep("success");
      
      const transaction: SaleTransaction = {
        id: crypto.randomUUID(),
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        items: cart,
        totalNgn: cartTotal,
        source: "social",
        createdAt: new Date().toISOString()
      };
      
      try {
        await addSale(transaction);
        setCart([]);
      } catch (err) {
        console.error("Sale Recording Error:", err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* ── Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
               {onboarding.storeName?.[0] || "N"}
             </div>
             <div>
               <h1 className="font-bold text-base leading-none">{onboarding.storeName}</h1>
               <p className="text-[9px] text-muted-foreground mt-1 uppercase tracking-widest font-bold">Verified Merchant</p>
             </div>
           </div>
           <Button 
             variant="ghost" 
             size="icon" 
             className="relative hover:bg-muted" 
             onClick={() => setIsCartOpen(true)}
           >
             <ShoppingBag className="h-6 w-6" />
             {cart.length > 0 && (
               <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-[10px] font-bold text-white rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                 {cart.reduce((a, b) => a + b.quantity, 0)}
               </span>
             )}
           </Button>
        </div>
      </header>

      {/* ── Geofencing & In-Store Location Banner ──────────────── */}
      {(qrTable || qrAisle || qrShelf || qrSection || qrLatitude) && (
        <div className="bg-primary/5 border-b border-border py-2.5 px-4 shadow-sm">
          <div className="mx-auto max-w-4xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="font-semibold text-foreground">
                📍 QR Code Area: <span className="text-primary font-bold">{inStoreLocationLabel}</span> 
                {isInsideGeofence === true && (
                  <span className="ml-2 inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">
                    <Check className="h-3 w-3" /> VERIFIED ON-SITE {simulatedOnSite && " (SIM)"}
                  </span>
                )}
                {isInsideGeofence === false && (
                  <span className="ml-2 inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px]">
                    📍 REMOTE ORDER MODE
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isInsideGeofence === null && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={isVerifyingLocation}
                  onClick={verifyGeofence}
                  className="font-bold border-primary/35 text-primary hover:bg-primary/5 h-8 px-3"
                >
                  <Locate className="h-3.5 w-3.5 mr-1" /> {isVerifyingLocation ? "Locating..." : "Verify On-site GPS"}
                </Button>
              )}
              {isInsideGeofence !== true && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={simulateOnsiteGPS}
                  className="font-bold text-[10px] hover:text-primary hover:bg-primary/5 h-8 px-2 text-muted-foreground"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-primary animate-bounce" /> Simulate GPS Match
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* ── Search & Filter ───────────────────────────── */}
        <div className="mb-8 space-y-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-10 h-12 bg-card border-border shadow-sm focus-visible:ring-primary/20"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <Badge 
              variant={!selectedCategory ? "default" : "outline"}
              className={cn(
                "cursor-pointer whitespace-nowrap px-4 py-1.5 rounded-full transition-all",
                !selectedCategory ? "shadow-md shadow-primary/20" : "hover:bg-muted"
              )}
              onClick={() => setSelectedCategory(null)}
            >
              All Items
            </Badge>
            {categories?.map(cat => (
              <Badge 
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                className={cn(
                  "cursor-pointer whitespace-nowrap px-4 py-1.5 rounded-full transition-all",
                  selectedCategory === cat.id ? "shadow-md shadow-primary/20" : "hover:bg-muted"
                )}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* ── Product Grid ──────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
           <AnimatePresence mode="popLayout">
             {filteredItems.map((item, i) => (
               <motion.div
                 key={item.id}
                 layout
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: i * 0.05 }}
               >
                 <Card 
                   className="overflow-hidden h-full border-border hover:shadow-xl transition-all duration-300 bg-card group relative"
                   onClick={() => setSelectedProduct(item)}
                 >
                   <div className="aspect-square bg-muted relative overflow-hidden">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name} 
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-4xl grayscale opacity-30">
                          {item.emoji || "📦"}
                        </div>
                      )}
                      
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="bg-background/80 backdrop-blur-sm p-1.5 rounded-full border border-border">
                           <Info className="h-3.5 w-3.5 text-muted-foreground" />
                         </div>
                      </div>

                      {item.currentStock <= 5 && item.currentStock > 0 && (
                        <Badge className="absolute top-2 left-2 bg-orange-500 hover:bg-orange-600 border-none text-[9px] font-bold">
                          LOW STOCK
                        </Badge>
                      )}
                      {item.currentStock <= 0 && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                          <Badge variant="destructive" className="font-bold tracking-tighter">OUT OF STOCK</Badge>
                        </div>
                      )}
                   </div>
                   <CardContent className="p-3 md:p-4">
                     <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-widest">
                       {categories?.find(c => c.id === item.categoryId)?.name || "General"}
                     </p>
                     <h3 className="font-bold text-sm md:text-base leading-tight mb-3 line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
                     <div className="flex items-center justify-between mt-auto">
                        <span className="font-bold text-base">₦{item.sellingPrice.toLocaleString()}</span>
                        <Button 
                          size="icon" 
                          variant="primary" 
                          className="h-8 w-8 md:h-9 md:w-9 rounded-xl shadow-lg shadow-primary/20" 
                          disabled={item.currentStock <= 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                        >
                           <Plus className="h-4 w-4" />
                        </Button>
                     </div>
                   </CardContent>
                 </Card>
               </motion.div>
             ))}
           </AnimatePresence>
        </div>

        {filteredItems.length === 0 && (
           <div className="text-center py-20 px-10">
              <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="h-10 w-10 text-muted-foreground opacity-20" />
              </div>
              <h3 className="text-xl font-bold mb-2">No products found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or category filters.</p>
           </div>
        )}
      </main>

      {/* ── Cart Drawer ─────────────────────────────────── */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsCartOpen(false)}
               className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
               initial={{ x: "100%" }}
               animate={{ x: 0 }}
               exit={{ x: "100%" }}
               className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background shadow-2xl flex flex-col"
            >
               <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg">My Shopping Bag</h2>
                    <p className="text-xs text-muted-foreground">{cart.length} items selected</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)}>
                    <X className="h-6 w-6" />
                  </Button>
               </div>

               <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                       <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4 opacity-10" />
                       <p className="font-bold text-lg mb-1">Your bag is empty</p>
                       <p className="text-sm text-muted-foreground">Start adding items from the store to checkout.</p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="flex gap-4 p-3 rounded-xl border border-border bg-card group">
                         <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                           {item.imageUrl ? <img src={item.imageUrl} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-2xl opacity-20">📦</div>}
                         </div>
                         <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm line-clamp-1 mb-0.5">{item.itemName}</h4>
                            {item.customFields && (item.customFields.color || item.customFields.size) && (
                               <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mb-1 uppercase tracking-tight">
                                  {[item.customFields.color, item.customFields.size].filter(Boolean).join(" · ")}
                               </p>
                            )}
                            <p className="text-sm font-bold text-primary mb-3">₦{item.unitPriceNgn.toLocaleString()}</p>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity === 1}>
                                    <Minus className="h-3 w-3" />
                                 </Button>
                                 <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => updateQuantity(item.id, 1)}>
                                    <Plus className="h-3 w-3" />
                                 </Button>
                               </div>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeFromCart(item.id)}>
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                            </div>
                         </div>
                      </div>
                    ))
                  )}
               </div>

               {cart.length > 0 && (
                 <div className="p-6 border-t border-border bg-muted/10 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-bold">₦{cartTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="text-emerald-500 font-bold uppercase text-[10px]">Calculated later</span>
                    </div>
                    <div className="flex items-center justify-between text-lg pt-2 border-t border-border">
                      <span className="font-bold">Total</span>
                      <span className="font-bold text-primary">₦{cartTotal.toLocaleString()}</span>
                    </div>
                    <Button 
                      className="w-full h-12 text-base font-bold shadow-xl shadow-primary/20 rounded-xl" 
                      onClick={() => {
                        setIsCartOpen(false);
                        setIsCheckoutOpen(true);
                        setCheckoutStep("details");
                      }}
                    >
                      Checkout Now <ChevronRight className="ml-1 h-5 w-5" />
                    </Button>
                 </div>
               )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Product Detail Modal ──────────────────────────── */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedProduct(null)}
               className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm px-4 flex items-center justify-center p-4"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="fixed z-50 w-full max-w-lg bg-background rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
               <div className="relative aspect-video bg-muted">
                  {selectedProduct.imageUrl ? (
                    <img src={selectedProduct.imageUrl} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-6xl opacity-20">{selectedProduct.emoji || "📦"}</div>
                  )}
                  <Button variant="secondary" size="icon" className="absolute top-4 right-4 rounded-full bg-background/50 backdrop-blur-md" onClick={() => setSelectedProduct(null)}>
                    <X className="h-5 w-5" />
                  </Button>
               </div>
               <div className="p-6 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase">{categories?.find(c => c.id === selectedProduct.categoryId)?.name || "General"}</Badge>
                    {selectedProduct.currentStock > 0 && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10 text-[10px] font-bold">IN STOCK</Badge>}
                  </div>
                  <h2 className="text-2xl font-bold mb-2 tracking-tight">{selectedProduct.name}</h2>
                  <p className="text-2xl font-bold text-primary mb-6">₦{selectedProduct.sellingPrice.toLocaleString()}</p>
                  
                  <div className="space-y-4 mb-8">
                     <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Product Description</h4>
                     <p className="text-sm leading-relaxed text-muted-foreground bg-muted/30 p-4 rounded-2xl italic">
                       "{selectedProduct.description || "No description provided for this catalog item."}"
                     </p>
                  </div>

                  {/* Category-specific specs & badges */}
                  {(() => {
                    const hasExpiry = selectedProduct.pharmacy?.expiryDate;
                    const requiresRx = selectedProduct.pharmacy?.requiresPrescription;
                    const batchNum = selectedProduct.pharmacy?.batchNumber;
                    const serialNum = selectedProduct.customFields?.serialNumber;
                    const agri = selectedProduct.agriculture;

                    if (!hasExpiry && !requiresRx && !batchNum && !serialNum && !agri) return null;

                    return (
                      <div className="space-y-2 mb-6 border-t border-dashed pt-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Category Specifications</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {hasExpiry && (
                            <div className="flex flex-col p-2.5 rounded-xl bg-red-500/5 border border-red-500/10">
                              <span className="text-[9px] uppercase tracking-wider text-red-500 font-bold">Expiry Date</span>
                              <span className="font-mono font-bold text-red-600 dark:text-red-400 mt-0.5">{selectedProduct.pharmacy?.expiryDate}</span>
                            </div>
                          )}
                          {requiresRx && (
                            <div className="flex flex-col p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 col-span-2">
                              <span className="text-[9px] uppercase tracking-wider text-amber-500 font-bold">Requirement</span>
                              <span className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">⚠️ Prescription Required to purchase</span>
                            </div>
                          )}
                          {batchNum && (
                            <div className="flex flex-col p-2.5 rounded-xl bg-neutral-100 dark:bg-zinc-900 border border-border">
                              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Batch Number</span>
                              <span className="font-mono font-bold text-foreground mt-0.5">{batchNum}</span>
                            </div>
                          )}
                          {serialNum && (
                            <div className="flex flex-col p-2.5 rounded-xl bg-neutral-100 dark:bg-zinc-900 border border-border col-span-2">
                              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Serial Number / IMEI</span>
                              <span className="font-mono font-bold text-foreground mt-0.5">{String(serialNum)}</span>
                            </div>
                          )}
                          {agri?.cropVariety && (
                            <div className="flex flex-col p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                              <span className="text-[9px] uppercase tracking-wider text-emerald-500 font-bold">Crop Variety</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{agri.cropVariety}</span>
                            </div>
                          )}
                          {agri?.expectedHarvestDate && (
                            <div className="flex flex-col p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                              <span className="text-[9px] uppercase tracking-wider text-emerald-500 font-bold">Expected Harvest</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{agri.expectedHarvestDate}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Custom Color and Size variant selections for the customer storefront */}
                  {(() => {
                    const colorsList = selectedProduct.color 
                      ? selectedProduct.color.split(",").map(c => c.trim()).filter(Boolean)
                      : [];
                    const sizesList = selectedProduct.sizes 
                      ? selectedProduct.sizes.split(",").map(s => s.trim()).filter(Boolean)
                      : [];

                    if (colorsList.length === 0 && sizesList.length === 0) return null;

                    return (
                      <div className="space-y-4 mb-6 border-t border-dashed pt-4">
                        {colorsList.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              Select Color
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {colorsList.map((color) => {
                                const isSelected = selectedColor === color;
                                const cssColor = color.toLowerCase();
                                return (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() => setSelectedColor(color)}
                                    className={cn(
                                      "relative flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm",
                                      isSelected
                                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                                        : "border-border bg-card text-foreground hover:bg-muted/50"
                                    )}
                                  >
                                    <span 
                                      className="h-3 w-3 rounded-full border border-black/10 shadow-inner" 
                                      style={{ backgroundColor: cssColor }}
                                    />
                                    {color}
                                    {isSelected && <Check className="h-3 w-3 ml-1 text-primary" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {sizesList.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              Select Size
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {sizesList.map((sz) => {
                                const isSelected = selectedSize === sz;
                                return (
                                  <button
                                    key={sz}
                                    type="button"
                                    onClick={() => setSelectedSize(sz)}
                                    className={cn(
                                      "flex items-center justify-center rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-tight transition-all duration-200 active:scale-95 min-w-[3rem] shadow-sm",
                                      isSelected
                                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30 font-extrabold"
                                        : "border-border bg-card text-foreground hover:bg-muted/50"
                                    )}
                                  >
                                    {sz}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex gap-4">
                     <Button 
                       className="flex-1 h-12 text-base font-bold rounded-2xl shadow-lg shadow-primary/20"
                       disabled={selectedProduct.currentStock <= 0}
                       onClick={() => {
                         addToCart(selectedProduct, selectedColor, selectedSize);
                         setSelectedProduct(null);
                       }}
                     >
                       Add to Bag
                     </Button>
                     <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl" onClick={() => {
                        const text = `Hi! I'm interested in ${selectedProduct.name} (₦${selectedProduct.sellingPrice.toLocaleString()})\n\nLink: ${window.location.href}`;
                        window.open(`https://wa.me/${onboarding.storePhone}?text=${encodeURIComponent(text)}`, '_blank');
                     }}>
                       <MessageCircle className="h-6 w-6 text-[#25D366]" />
                     </Button>
                  </div>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Checkout Modal ───────────────────────────────── */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsCheckoutOpen(false)}
               className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm px-4 flex items-center justify-center p-4"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="fixed z-50 w-full max-w-md bg-background rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
               <div className="p-6 border-b border-border bg-card">
                  <div className="flex items-center justify-between mb-4">
                     <h2 className="font-bold text-xl">Checkout</h2>
                     <Button variant="ghost" size="icon" onClick={() => setIsCheckoutOpen(false)} disabled={checkoutStep === "success"}>
                       <X className="h-5 w-5" />
                     </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     {[1, 2, 3].map((s) => (
                       <div key={s} className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: (checkoutStep === "details" && s <= 1) || (checkoutStep === "payment" && s <= 2) || (checkoutStep === "success" && s <= 3) ? "100%" : "0%" }}
                             className="h-full bg-primary"
                          />
                       </div>
                     ))}
                  </div>
               </div>

               <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {checkoutStep === "details" && (
                     <div className="space-y-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contact Name</label>
                           <Input placeholder="Full Name" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone Number (WhatsApp)</label>
                           <Input placeholder="0810 000 0000" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} className="h-11 rounded-xl" />
                        </div>

                        {/* Delivery Handover Selection */}
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Handover Method</label>
                           <div className="grid grid-cols-2 gap-2">
                             <Button
                               type="button"
                               variant={deliveryMethod === "instore" ? "default" : "outline"}
                               onClick={() => setDeliveryMethod("instore")}
                               className="h-11 flex flex-col items-center justify-center gap-0.5 p-1 text-xs"
                             >
                               <span className="font-bold flex items-center gap-1">🏪 In-Store Pickup</span>
                             </Button>
                             <Button
                               type="button"
                               variant={deliveryMethod === "delivery" ? "default" : "outline"}
                               onClick={() => setDeliveryMethod("delivery")}
                               className="h-11 flex flex-col items-center justify-center gap-0.5 p-1 text-xs"
                             >
                               <span className="font-bold flex items-center gap-1">🚚 Home Delivery</span>
                             </Button>
                           </div>
                        </div>

                        {deliveryMethod === "instore" ? (
                          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs space-y-1 animate-in fade-in duration-200">
                            <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                              <Check className="h-4 w-4 text-emerald-500" /> Selected: In-Store Table/Aisle Handover
                            </p>
                            <p className="text-muted-foreground">
                              Order locked to <span className="font-bold text-foreground bg-white/50 dark:bg-black/50 px-1.5 py-0.5 rounded">{inStoreLocationLabel}</span>. Wait at your position or present ticket barcode to any store attendant for handover.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2 animate-in fade-in duration-200">
                             <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Delivery Address</label>
                             <textarea className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary min-h-[80px]" placeholder="Street name, City, State" value={customerInfo.address} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} />
                          </div>
                        )}
                     </div>
                  )}

                  {checkoutStep === "payment" && (
                     <div className="space-y-6">
                        <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5">
                           <div className="flex items-center justify-between mb-4">
                              <Landmark className="h-6 w-6 text-primary" />
                              <Badge className="bg-primary text-white border-none font-bold">Recommended</Badge>
                           </div>
                           <h4 className="font-bold mb-1">Pay with Moniepoint</h4>
                           <p className="text-xs text-muted-foreground">Secure, instant bank transfer or USSD.</p>
                           <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-between text-lg font-bold">
                              <span>Total to Pay:</span>
                              <span className="text-primary">₦{cartTotal.toLocaleString()}</span>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-2 p-3 text-[10px] text-muted-foreground leading-tight bg-muted/50 rounded-lg">
                           <Info className="h-4 w-4 text-primary flex-shrink-0" />
                           <p>By clicking "Complete Payment", you'll be redirected to Nexa's secure Moniepoint gateway.</p>
                        </div>
                     </div>
                  )}

                  {checkoutStep === "success" && (
                     <div className="py-2 text-center space-y-4">
                        <div className="h-12 w-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                           <CheckCircle2 className="h-6 w-6 text-emerald-500 animate-bounce" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight animate-pulse">Order Confirmed!</h3>

                        {/* Detailed Digital Receipt & Gate clearance Sticker */}
                        <div className="bg-white dark:bg-black/45 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl relative shadow-md">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-24 bg-primary rounded-b-xl flex items-center justify-center text-[8px] text-white font-mono font-bold tracking-wider">
                            PASS TICKET
                          </div>

                          <div className="text-center pt-3 border-b border-dashed border-neutral-200 dark:border-neutral-800 pb-2">
                            <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">{onboarding.storeName}</p>
                            <h4 className="text-lg font-mono font-black text-foreground">{orderIdRef}</h4>
                            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 mt-1 rounded-full inline-block">
                              {deliveryMethod === "instore" ? `🏪 PLACE: ${inStoreLocationLabel}` : "🚚 STANDARD DELIVERY"}
                            </p>
                          </div>

                          {/* QR Clearance Generator inside ticket */}
                          <div className="my-4 flex flex-col items-center justify-center py-2">
                            <div className="p-3 bg-white border border-neutral-100 rounded-xl shadow-inner inline-block">
                              <QRCodeSVG
                                value={JSON.stringify({
                                  orderId: orderIdRef,
                                  customer: customerInfo.name,
                                  location: deliveryMethod === "instore" ? inStoreLocationLabel : "Delivery",
                                  totalNgn: cartTotal,
                                  verifiedAt: new Date().toISOString()
                                })}
                                size={110}
                                level="M"
                              />
                            </div>
                            <p className="text-[9px] font-mono text-muted-foreground mt-2 uppercase tracking-tight">Present to cashier/waiter to clear</p>
                          </div>

                          <div className="border-t border-dashed border-neutral-200 dark:border-neutral-800 pt-2 text-[11px] space-y-1 text-left">
                            <div className="flex justify-between">
                              <span className="text-neutral-400">Customer:</span>
                              <span className="font-medium text-foreground">{customerInfo.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-400">Phone:</span>
                              <span className="font-mono">{customerInfo.phone}</span>
                            </div>
                            <div className="flex justify-between border-t border-neutral-100 dark:border-neutral-900 pt-1 mt-1 font-bold">
                              <span>Paid Total:</span>
                              <span className="text-primary">₦{cartTotal.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                           <Button className="w-full h-11 bg-[#25D366] hover:bg-[#1fb355] text-white font-bold rounded-2xl gap-2 hover:scale-[1.01] transition-transform text-xs" onClick={() => {
                              const resolvedAddress = deliveryMethod === "instore" ? `In-Store Pickup (Geo-fenced): ${inStoreLocationLabel}` : customerInfo.address;
                              const text = `*New Order Confirmed!* ✅\n\n*Ticket ID:* ${orderIdRef}\n*Customer:* ${customerInfo.name}\n*Total:* ₦${cartTotal.toLocaleString()}\n*Category:* ${deliveryMethod === "instore" ? `In-Store (${inStoreLocationLabel})` : "General Delivery"}\n\n*Receipt:* Verified Pass Created\n\n_Sent via Nexa Mobile Storefront_`;
                              window.open(`https://wa.me/${onboarding.storePhone}?text=${encodeURIComponent(text)}`, '_blank');
                              setIsCheckoutOpen(false);
                           }}>
                              <MessageCircle className="h-4 w-4 fill-current" /> Send Receipt to Vendor
                           </Button>
                        </div>
                     </div>
                  )}

                  {checkoutStep !== "success" && (
                    <Button 
                      className="w-full h-12 text-sm font-bold rounded-2xl shadow-xl shadow-primary/20"
                      disabled={checkoutStep === "details" && (!customerInfo.name || !customerInfo.phone || (deliveryMethod === "delivery" && !customerInfo.address))}
                      onClick={async () => {
                        if (checkoutStep === "details") {
                          setCheckoutStep("payment");
                        } else if (checkoutStep === "payment") {
                          setCheckoutStep("success");
                          const transaction: SaleTransaction = {
                            id: crypto.randomUUID(),
                            customerName: customerInfo.name,
                            customerPhone: customerInfo.phone,
                            items: cart,
                            totalNgn: cartTotal,
                            source: "social",
                            createdAt: new Date().toISOString()
                          };
                          try {
                            await addSale(transaction);
                            setCart([]);
                          } catch (err) {
                            console.error("Sale Recording Error:", err);
                          }
                        }
                      }}
                    >
                      {checkoutStep === "details" ? "Continue to Payment" : `Confirm Payment: ₦${cartTotal.toLocaleString()}`}
                    </Button>
                  )}
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── WhatsApp Floating Button ──────────────────── */}
      {!isCheckoutOpen && !isCartOpen && !selectedProduct && (
        <a 
          href={`https://wa.me/${onboarding.storePhone}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-50 h-16 w-16 rounded-3xl bg-[#25D366] text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-all duration-300 group"
        >
          <MessageCircle className="h-9 w-9 fill-current" />
          <span className="absolute -top-1 px-2 py-0.5 bg-background border border-border rounded-full text-[10px] font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity">Chat</span>
        </a>
      )}
    </div>
  );
}
