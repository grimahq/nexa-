import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, ArrowLeft, CreditCard, Minus, Plus, ShieldCheck, Info, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, SUPPORTED_UNITS } from "@/types/inventory";

interface CartItem extends Item {
  quantity: number;
}

export const Route = createFileRoute("/store/cart")({
  component: CartPage,
});

function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const navigate = useNavigate();
  const affiliateId = localStorage.getItem("stackwise_affiliate_id");

  useEffect(() => {
    const cart: CartItem[] = JSON.parse(localStorage.getItem("stackwise_cart") || "[]");
    setItems(cart);
  }, []);

  const updateQuantity = (id: string, deltaDir: number) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const step = SUPPORTED_UNITS.find(u => u.id === item.unit)?.step || 1;
        const delta = deltaDir * step;
        return { ...item, quantity: Number(Math.max(step, item.quantity + delta).toFixed(2)) };
      }
      return item;
    });
    setItems(updated);
    localStorage.setItem("stackwise_cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const removeItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    localStorage.setItem("stackwise_cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.info("Item removed from cart");
  };

  const subtotal = items.reduce((acc, item) => acc + (item.sellingPrice * item.quantity), 0);
  const deliveryFee = subtotal > 0 ? 2500 : 0;
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    // In a real app, this would send an order to the backend
    // and potentially credit the affiliateId stored in the referral
    
    // Simulate order placement
    const orderId = `ORD-${Math.floor(Date.now() / 1000)}`;
    
    // Clear cart
    localStorage.removeItem("stackwise_cart");
    window.dispatchEvent(new Event("cartUpdated"));
    
    toast.success("Order placed successfully!", {
      description: `Your order ${orderId} is being processed.`,
    });

    if (affiliateId) {
      console.log("Crediting affiliate:", affiliateId, "for total:", total);
      // Here you would notify your backend to track this referral commission
    }
    
    // Redirect to success or home
    setTimeout(() => navigate({ to: "/store" }), 2000);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 bg-white rounded-3xl border border-dashed border-neutral-300 space-y-6">
        <div className="bg-neutral-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto">
          <ShoppingCart className="h-10 w-10 text-neutral-300" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Your cart is empty</h2>
          <p className="text-muted-foreground">It looks like you haven't added anything to your cart yet.</p>
        </div>
        <Link to="/store">
          <Button variant="default" className="rounded-full px-8 h-12">
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
        <Link to="/store" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Continue Shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border p-4 flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="h-24 w-24 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingCart className="h-8 w-8 text-neutral-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-base truncate">{item.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono uppercase">{item.sku}</p>
                  </div>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded-lg h-8 bg-neutral-50 overflow-hidden">
                        <button 
                          className="px-2 hover:bg-neutral-100 h-full border-r"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <div className="w-12 text-center">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = items.map(it => it.id === item.id ? { ...it, quantity: val } : it);
                              setItems(updated);
                              localStorage.setItem("stackwise_cart", JSON.stringify(updated));
                              window.dispatchEvent(new Event("cartUpdated"));
                            }}
                            className="w-full bg-transparent text-center text-xs font-semibold outline-none"
                          />
                        </div>
                        <button 
                          className="px-2 hover:bg-neutral-100 h-full border-l"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      {item.unit && item.unit !== "pcs" && (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.unit}</span>
                      )}
                    </div>
                    <span className="font-bold text-neutral-900 font-mono">
                      ₦{(item.sellingPrice * item.quantity).toLocaleString()}
                    </span>
                  </div>
              </div>
            </div>
          ))}

          {affiliateId && (
            <Card className="bg-blue-50 border-blue-100 shadow-none">
              <CardContent className="p-4 flex items-center gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800">
                  Referral link detected (ID: <span className="font-mono font-bold">{affiliateId}</span>). 
                  A commission will be shared with your referrer upon successful checkout.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <Card className="rounded-3xl shadow-xl border-neutral-200">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-semibold text-green-600">₦{deliveryFee.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary font-mono tracking-tighter">₦{total.toLocaleString()}</span>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    <p className="font-semibold text-neutral-900">Pay Online or on Delivery</p>
                    <p>Secure encryption enabled</p>
                  </div>
                </div>
                <Button className="w-full h-12 rounded-2xl gap-2 font-bold text-base" onClick={handleCheckout}>
                  Complete Checkout <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-dashed bg-neutral-50 shadow-none border-neutral-200">
            <CardContent className="p-6 text-center space-y-2">
              <ShieldCheck className="mx-auto h-8 w-8 text-neutral-400" />
              <h4 className="text-sm font-semibold">Purchase Protection</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your purchase is protected by Nexa OS Secure Commerce. If your orders don't arrive as described, we'll make it right.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
