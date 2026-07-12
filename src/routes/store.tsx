import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { Package, ShoppingCart, User, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDemo } from "@/hooks/useDemo";
import { Item } from "@/types/inventory";
import { NexaLogo } from "@/components/shared/NexaLogo";
import { logQRLeadEvent } from "@/utils/qrTracking";

interface CartItem extends Item {
  quantity: number;
}

export const Route = createFileRoute("/store")({
  component: StoreLayout,
});

function StoreLayout() {
  const { onboarding } = useDemo();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation();

  const [tableNumber, setTableNumber] = useState<string | null>(() => {
    return localStorage.getItem("stackwise_table_number");
  });

  // Handle table detection and affiliate tracking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    const tableParam = params.get("table");
    if (tableParam && tableParam !== tableNumber) {
      localStorage.setItem("stackwise_table_number", tableParam);
      setTableNumber(tableParam);
      console.log("Customer table detected:", tableParam);
    }

    const affId = params.get("aff");
    if (affId) {
      localStorage.setItem("stackwise_affiliate_id", affId);
      console.log("Tracking affiliate ID:", affId);
    }

    const qrSourceIdParam = params.get("qrSourceId");
    if (qrSourceIdParam) {
      localStorage.setItem("nexa_current_qr_source_id", qrSourceIdParam);
      const storeSlug = onboarding?.storeSlug || "general";
      const storeId = onboarding?.id || storeSlug;
      localStorage.setItem("nexa_current_qr_store_id", storeId);
      console.log("Customer QR source detected:", qrSourceIdParam);
    }
  }, [location.search, tableNumber, onboarding]);

  const handleCtaClick = () => {
    const savedQrId = localStorage.getItem("nexa_current_qr_source_id") || new URLSearchParams(window.location.search).get("qrSourceId");
    if (savedQrId) {
      const parts = savedQrId.split("_");
      const branchId = parts[2] && parts[2] !== "main" ? parts[2] : null;
      const storeSlug = onboarding?.storeSlug || "general";
      const storeId = localStorage.getItem("nexa_current_qr_store_id") || onboarding?.id || storeSlug;
      logQRLeadEvent({
        qrSourceId: savedQrId,
        storeId,
        branchId,
        eventType: "cta_click"
      });
    }
  };

  // Sync cart count
  useEffect(() => {
    const updateCartCount = () => {
      const cart: CartItem[] = JSON.parse(localStorage.getItem("stackwise_cart") || "[]");
      const count = cart.reduce((acc, item) => acc + item.quantity, 0);
      setCartCount(count);
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    // Custom event for same-window updates
    window.addEventListener("cartUpdated", updateCartCount);
    
    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Pinned Dine-In Table Banner */}
      {tableNumber && (
        <div className="bg-amber-500 text-amber-950 font-semibold px-4 py-2 text-xs md:text-sm flex items-center justify-between shadow-inner animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base">🍽️</span>
            <span>You are ordering for <strong className="underline underline-offset-2">Table {tableNumber}</strong>. Browse, order, and pay instantly!</span>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem("stackwise_table_number");
              setTableNumber(null);
            }}
            className="text-[10px] uppercase font-bold tracking-wider bg-amber-950/15 hover:bg-amber-950/25 px-2.5 py-1 rounded transition-all"
          >
            Leave Table
          </button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/store" className="flex items-center gap-2">
            <div className="bg-primary rounded-lg p-1.5">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              {onboarding.storeName || "My Store"}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/store" className="text-sm font-medium hover:text-primary transition-colors">
              Products
            </Link>
            <Link to="/store" className="text-sm font-medium hover:text-primary transition-colors">
              Featured
            </Link>
            <Link to="/store" className="text-sm font-medium hover:text-primary transition-colors">
              About
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/store/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                    variant="destructive"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button variant="outline" size="sm" className="hidden md:flex gap-2">
              <User className="h-4 w-4" /> Account
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-white p-4 space-y-4 animate-in slide-in-from-top duration-200">
            <Link to="/store" className="block text-base font-medium py-2" onClick={() => setIsMenuOpen(false)}>
              Products
            </Link>
            <Link to="/store" className="block text-base font-medium py-2" onClick={() => setIsMenuOpen(false)}>
              Featured
            </Link>
            <Link to="/store" className="block text-base font-medium py-2" onClick={() => setIsMenuOpen(false)}>
              About
            </Link>
            <Button className="w-full justify-start gap-2" variant="outline">
              <User className="h-4 w-4" /> Account
            </Button>
          </div>
        )}
      </header>

      {/* Hero / Banner for the store */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="font-bold text-lg">{onboarding.storeName || "My Store"}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Powered by Nexa OS. Secure, fast, and simple inventory management for modern businesses.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/store" className="hover:text-primary transition-colors">All Products</Link></li>
              <li><Link to="/store" className="hover:text-primary transition-colors">Categories</Link></li>
              <li><Link to="/store" className="hover:text-primary transition-colors">New Arrivals</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Stay Connected</h4>
            <p className="text-sm text-muted-foreground mb-4">Subscribe to our newsletter for updates.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Email address" 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
              <Button size="sm">Join</Button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            © {new Date().getFullYear()} {onboarding.storeName || "My Store"}. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold text-neutral-400">Powered by</span>
            <a 
              href={`${import.meta.env.VITE_LANDING_URL || "https://nexastoreos.com"}/?utm_source=qr_footer&utm_medium=customer_store&utm_campaign=${encodeURIComponent(onboarding.storeSlug || "general")}${tableNumber ? `&utm_content=table_${encodeURIComponent(tableNumber)}` : ""}`}
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={handleCtaClick}
              className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <NexaLogo variant="full" height={16} className="text-foreground shrink-0" />
              <span className="sr-only">NexaStoreOS</span>
            </a>
            <span className="text-neutral-300">|</span>
            <a 
              href={`${import.meta.env.VITE_LANDING_URL || "https://nexastoreos.com"}/?utm_source=qr_footer_cta&utm_medium=customer_store&utm_campaign=${encodeURIComponent(onboarding.storeSlug || "general")}${tableNumber ? `&utm_content=table_${encodeURIComponent(tableNumber)}` : ""}`}
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={handleCtaClick}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Get it for your shop
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
