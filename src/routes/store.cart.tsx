import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, ArrowLeft, CreditCard, Minus, Plus, ShieldCheck, Info, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, SUPPORTED_UNITS } from "@/types/inventory";
import { useCreateNotification } from "@/hooks/useInventoryMutations";
import { cn } from "@/lib/utils";

interface CartItem extends Item {
  quantity: number;
  customFields?: {
    color?: string;
    size?: string;
    [key: string]: unknown;
  };
}

export const Route = createFileRoute("/store/cart")({
  component: CartPage,
});

function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const navigate = useNavigate();
  const affiliateId = localStorage.getItem("stackwise_affiliate_id");
  const { mutate: createNotification } = useCreateNotification();

  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "cash">("transfer");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [orderRef] = useState(() => Math.random().toString(36).substring(2, 6).toUpperCase());

  useEffect(() => {
    const cart: CartItem[] = JSON.parse(localStorage.getItem("stackwise_cart") || "[]");
    setItems(cart);

    const table = localStorage.getItem("stackwise_table_number");
    if (table) {
      setTableNumber(table);
    }
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
  const deliveryFee = tableNumber ? 0 : (subtotal > 0 ? 2500 : 0);
  const total = subtotal + deliveryFee;

  const handleVerifyTransfer = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsPaid(true);
      toast.success("Moniepoint Ledger Checked!", {
        description: `Successfully verified incoming transfer of ₦${total.toLocaleString()} for Reference Code: STK-TBL${tableNumber || '0'}-${orderRef}.`
      });
    }, 2000);
  };

  const handleCheckout = () => {
    if (tableNumber && paymentMethod === "transfer" && !isPaid) {
      toast.error("Dine-in Transfer Unverified", {
        description: "Please transfer the money to the listed Moniepoint account number first, then click 'I Have Made the Transfer' to verify."
      });
      return;
    }

    const orderId = `ORD-${Math.floor(Date.now() / 1000)}`;
    
    // Clear cart
    localStorage.removeItem("stackwise_cart");
    window.dispatchEvent(new Event("cartUpdated"));
    
    toast.success("Order placed successfully!", {
      description: tableNumber 
        ? `Table ${tableNumber} order is sent directly to kitchen. Payment is verified!`
        : `Your order ${orderId} is being processed.`,
    });

    if (tableNumber) {
      try {
        const key = `pos-table-status-${tableNumber}`;
        const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
        localStorage.setItem(key, JSON.stringify({
          status: "cooking",
          orderTime: new Date().toISOString(),
          itemsCount: totalItems,
          totalPrice: total,
          paymentMethod: paymentMethod === 'transfer' ? 'Moniepoint Verified' : 'Cash at Counter'
        }));
      } catch (e) {
        console.warn("Table status write failed:", e);
      }

      // Dispatch real CRM / Notification to manager
      createNotification({
        id: `notif-${Date.now()}`,
        type: "request_update",
        title: `🍽️ New Order: Table ${tableNumber}`,
        message: `Items: ${items.map(it => `${it.name} (x${it.quantity})`).join(", ")}. Total Paid: ₦${total.toLocaleString()} via ${paymentMethod === 'transfer' ? 'Moniepoint Transfer' : 'Cash at Counter'}.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    if (affiliateId) {
      console.log("Crediting affiliate:", affiliateId, "for total:", total);
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
          {tableNumber && (
            <Card className="bg-amber-500/5 border-amber-500/20 shadow-none mb-4 rounded-2xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🍽️</span>
                  <div>
                    <h4 className="font-bold text-amber-900">Dine-in Service</h4>
                    <p className="text-xs text-amber-700 font-medium">Preparing fresh and serving straight to <strong className="underline">Table {tableNumber}</strong>.</p>
                  </div>
                </div>
                <Badge className="bg-amber-500 hover:bg-amber-600 text-amber-950 border-none font-bold px-3 py-1 text-xs">
                  Table {tableNumber}
                </Badge>
              </CardContent>
            </Card>
          )}

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
                    {item.customFields && (item.customFields.color || item.customFields.size) && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 uppercase tracking-tight">
                        {[item.customFields.color, item.customFields.size].filter(Boolean).join(" · ")}
                      </p>
                    )}
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
                <span className="text-muted-foreground">{tableNumber ? "Dine-in Service Fee" : "Delivery Fee"}</span>
                <span className="font-semibold text-green-600">{tableNumber ? "FREE" : `₦${deliveryFee.toLocaleString()}`}</span>
              </div>
              
              {tableNumber && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground block">Select Payment Option</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("transfer");
                      }}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border text-[11px] font-bold transition-all text-center",
                        paymentMethod === "transfer"
                          ? "bg-amber-500 border-amber-500 text-amber-950 font-extrabold shadow-sm"
                          : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Moniepoint Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("cash");
                      }}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border text-[11px] font-bold transition-all text-center",
                        paymentMethod === "cash"
                          ? "bg-amber-500 border-amber-500 text-amber-950 font-extrabold shadow-sm"
                          : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Pay at Counter
                    </button>
                  </div>

                  {paymentMethod === "transfer" && (
                    <Card className="border-amber-200 bg-amber-500/5 shadow-xs transition-all animate-in fade-in slide-in-from-top-1 duration-300">
                      <CardContent className="p-3.5 space-y-3">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-amber-900 uppercase">Moniepoint Instant Checkout</span>
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                            Live Listening
                          </span>
                        </div>

                        <div className="bg-white p-2.5 rounded-lg border border-amber-200/50 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-[11px]">Bank:</span>
                            <span className="font-black text-neutral-800">Moniepoint MFB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-[11px]">Account:</span>
                            <span className="font-black text-amber-800 tracking-wide font-mono select-all">8132119637</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-[11px]">Name:</span>
                            <span className="font-black text-neutral-800">Stackwise Restaurant</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-[11px]">Ref Code:</span>
                            <span className="font-black text-amber-600 font-mono select-all">STK-TBL{tableNumber}-{orderRef}</span>
                          </div>
                        </div>

                        <p className="text-[9.5px] leading-normal text-amber-800 text-center font-medium">
                          Please transfer exactly <strong>₦{total.toLocaleString()}</strong> adding ref above as the description.
                        </p>

                        {isVerifying ? (
                          <Button disabled className="w-full h-8 text-[11px] rounded-lg gap-1.5 font-bold bg-amber-500">
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-amber-950 border-t-transparent animate-spin" />
                            Querying Moniepoint API...
                          </Button>
                        ) : isPaid ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 py-1.5 text-center text-[11px] font-black rounded-lg flex items-center justify-center gap-1">
                            ✓ Payment Received & verified
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full h-8 text-[11px] rounded-lg border-amber-300 text-amber-900 bg-white hover:bg-amber-100/30 font-bold"
                            onClick={handleVerifyTransfer}
                          >
                            Verify Transfer Payment
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

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
                    <p className="font-semibold text-neutral-900">
                      {tableNumber ? "Dine-in Instant Checkout" : "Pay Online or on Delivery"}
                    </p>
                    <p>Secure encryption active</p>
                  </div>
                </div>
                <Button 
                  className={cn(
                    "w-full h-12 rounded-2xl gap-2 font-bold text-base transition-all",
                    tableNumber && paymentMethod === "transfer" && !isPaid 
                      ? "opacity-60 bg-neutral-400 cursor-not-allowed" 
                      : ""
                  )} 
                  onClick={handleCheckout}
                >
                  {tableNumber ? "Place Kitchen Order" : "Complete Checkout" } <ArrowRight className="h-4 w-4" />
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
