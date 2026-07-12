import { createFileRoute, Link } from "@tanstack/react-router";
import { useItems } from "@/hooks/useInventoryData";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft, ShieldCheck, Truck, RefreshCcw, Star, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Item, SUPPORTED_UNITS } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface CartItem extends Item {
  quantity: number;
}

export const Route = createFileRoute("/store/product/$productId")({
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const { data: items, isLoading } = useItems({ status: "active" });
  const item = items?.find(i => i.id === productId);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  useEffect(() => {
    if (item) {
      const colorsList = item.color 
        ? item.color.split(",").map(c => c.trim()).filter(Boolean)
        : [];
      const sizesList = item.sizes 
        ? item.sizes.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      setSelectedColor(colorsList[0] || "");
      setSelectedSize(sizesList[0] || "");
    }
  }, [item]);

  const addToCart = () => {
    if (!item) return;

    const config = {
      color: selectedColor || undefined,
      size: selectedSize || undefined,
    };
    const configStr = (selectedColor || selectedSize) ? JSON.stringify(config) : "";
    const uniqueCartId = configStr ? `${item.id}:${configStr}` : item.id;

    const cart: CartItem[] = JSON.parse(localStorage.getItem("stackwise_cart") || "[]");
    const existingIndex = cart.findIndex((i) => i.id === uniqueCartId);

    if (existingIndex > -1) {
      cart[existingIndex].quantity = Number((cart[existingIndex].quantity + quantity).toFixed(2));
    } else {
      cart.push({ 
        ...item, 
        id: uniqueCartId,
        quantity: quantity,
        customFields: {
          color: selectedColor || undefined,
          size: selectedSize || undefined,
        }
      });
    }

    localStorage.setItem("stackwise_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    
    const optionsLabel = [selectedColor, selectedSize].filter(Boolean).join(" - ");
    toast.success(`${item.name}${optionsLabel ? ` (${optionsLabel})` : ""} (${quantity}) added to cart`);
  };

  if (isLoading) {
    return <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-muted rounded-2xl" />
        <div className="space-y-4">
          <div className="h-8 w-1/3 bg-muted rounded" />
          <div className="h-12 w-2/3 bg-muted rounded" />
          <div className="h-32 w-full bg-muted rounded" />
        </div>
      </div>
    </div>;
  }

  if (!item || !item.isEcommerceEnabled) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-neutral-300">
        <h3 className="text-lg font-medium text-neutral-900">Product not available</h3>
        <p className="text-neutral-500 mb-6">This item is no longer available in our storefront.</p>
        <Link to="/store">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Store
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <Link to="/store" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Store
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl bg-neutral-100 overflow-hidden border border-neutral-200">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingCart className="h-24 w-24 text-neutral-300" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-square rounded-xl bg-neutral-100 border border-neutral-200 cursor-pointer" />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3">{item.category || "General"}</Badge>
              <div className="flex text-amber-400">
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
              </div>
              <span className="text-xs text-muted-foreground">(24 reviews)</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900">{item.name}</h1>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{item.sku}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary font-mono tracking-tighter">₦{item.sellingPrice.toLocaleString()}</span>
              {item.unit && item.unit !== "pcs" && (
                <span className="text-sm text-muted-foreground uppercase font-bold bg-muted px-2 py-0.5 rounded">
                  per {item.unit}
                </span>
              )}
            </div>
            <p className="text-sm text-green-600 font-medium">In Stock and Ready to Ship</p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Description</h4>
            <p className="text-neutral-600 leading-relaxed">
              {item.description || "Premium quality product carefully sourced for your business. This item meets all our strict inventory quality standards and is ready for immediate deployment in your operations."}
            </p>
          </div>

          {/* Color & Size Variant Selection */}
          {(() => {
            const colorsList = item.color 
              ? item.color.split(",").map(c => c.trim()).filter(Boolean)
              : [];
            const sizesList = item.sizes 
              ? item.sizes.split(",").map(s => s.trim()).filter(Boolean)
              : [];

            if (colorsList.length === 0 && sizesList.length === 0) return null;

            return (
              <div className="space-y-5 py-4 border-t border-b border-dashed">
                {colorsList.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
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
                              "relative flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-sm",
                              isSelected
                                ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                                : "border-border bg-white text-foreground hover:bg-neutral-50"
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
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
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
                              "flex items-center justify-center rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-tight transition-all duration-200 active:scale-95 min-w-[3rem] shadow-sm",
                              isSelected
                                ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30 font-extrabold"
                                : "border-border bg-white text-foreground hover:bg-neutral-50"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            <div className="flex items-center gap-3 text-sm text-neutral-600">
              <div className="h-10 w-10 flex items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Fast Delivery</p>
                <p className="text-xs">24-48h Nationwide</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-600">
              <div className="h-10 w-10 flex items-center justify-center rounded-full bg-green-50 text-green-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Secure Payment</p>
                <p className="text-xs">Buyer protection included</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-xl divide-x h-12 bg-white">
                <button 
                  className="px-4 hover:bg-neutral-50 transition-colors h-full flex items-center justify-center disabled:opacity-30" 
                  onClick={() => {
                    const step = SUPPORTED_UNITS.find(u => u.id === item.unit)?.step || 1;
                    setQuantity(prev => Number(Math.max(step, prev - step).toFixed(2)));
                  }}
                  disabled={quantity <= (SUPPORTED_UNITS.find(u => u.id === item.unit)?.step || 1)}
                >
                  -
                </button>
                <div className="relative h-full flex items-center justify-center w-24">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full text-center font-semibold outline-none bg-transparent"
                  />
                  {item.unit && item.unit !== "pcs" && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground uppercase font-bold">
                      {item.unit}
                    </span>
                  )}
                </div>
                <button 
                  className="px-4 hover:bg-neutral-50 transition-colors h-full flex items-center justify-center" 
                  onClick={() => {
                    const step = SUPPORTED_UNITS.find(u => u.id === item.unit)?.step || 1;
                    setQuantity(prev => Number((prev + step).toFixed(2)));
                  }}
                >
                  +
                </button>
              </div>
              <Button size="lg" className="flex-1 rounded-xl h-12 gap-3 text-base" onClick={addToCart}>
                <ShoppingCart className="h-5 w-5" /> Add to Cart
              </Button>
            </div>
            <Button size="lg" variant="secondary" className="w-full rounded-xl h-12 gap-3 text-base">
              Buy Now
            </Button>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <section className="bg-white border rounded-3xl p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex flex-col items-center text-center space-y-3">
          <Truck className="h-8 w-8 text-primary" />
          <h4 className="font-bold">Nationwide Shipping</h4>
          <p className="text-xs text-muted-foreground">We deliver across all states with reliable tracking and speed.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3">
          <RefreshCcw className="h-8 w-8 text-primary" />
          <h4 className="font-bold">Simple Returns</h4>
          <p className="text-xs text-muted-foreground">Not satisfied? Return within 7 days for a full refund or exchange.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h4 className="font-bold">100% Secure</h4>
          <p className="text-xs text-muted-foreground">Your transactions are encrypted and protected at every step.</p>
        </div>
      </section>
    </div>
  );
}
