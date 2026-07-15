import { createFileRoute, Link } from "@tanstack/react-router";
import { useItems } from "@/hooks/useInventoryData";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Eye, Filter } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Item } from "@/types/inventory";

interface CartItem extends Item {
  quantity: number;
}

export const Route = createFileRoute("/store/")({
  component: StoreIndexPage,
});

function StoreIndexPage() {
  const { data: items, isLoading } = useItems({ status: "active" });
  const ecommerceItems = items?.filter(i => i.isEcommerceEnabled) || [];

  const addToCart = (item: Item) => {
    const cart: CartItem[] = JSON.parse(localStorage.getItem("stackwise_cart") || "[]");
    const existingIndex = cart.findIndex((i) => i.id === item.id);

    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({ ...item, quantity: 1 });
    }

    localStorage.setItem("stackwise_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success(`${item.name} added to cart`);
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-64 bg-muted rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-[3/4] bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-neutral-900 px-8 py-16 text-white text-center">
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <Badge className="bg-primary/20 text-primary-foreground border-primary/30 py-1 px-4 mb-4">
            Official Storefront
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Premium Inventory, <br/> Delivered to Your Door.
          </h1>
          <p className="text-neutral-400 text-lg">
            Browse our latest stock and order directly online. Fast delivery and secure payments.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Button size="lg" className="rounded-full px-8">Shop Now</Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 border-neutral-700 hover:bg-neutral-800">
              New Arrivals
            </Button>
          </div>
        </div>
        {/* Background blobs */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
      </section>

      {/* Product Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <p className="text-muted-foreground text-sm">Quality items for your business needs.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 rounded-full">
              <Filter className="h-4 w-4" /> Filter
            </Button>
          </div>
        </div>

        {ecommerceItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-neutral-300">
            <ShoppingCart className="mx-auto h-12 w-12 text-neutral-300 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900">No items found</h3>
            <p className="text-neutral-500">Check back later for new inventory updates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-tour="store-grid">
            {ecommerceItems.map((item) => (
              <Card key={item.id} className="group overflow-hidden rounded-2xl border-neutral-200/60 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                <Link to="/store/product/$productId" params={{ productId: item.id }} className="relative aspect-square overflow-hidden bg-neutral-100">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="h-12 w-12 text-neutral-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                  {item.currentStock <= (item.minStock || 0) && (
                    <Badge className="absolute top-3 left-3 bg-red-500 hover:bg-red-600">
                      Low Stock
                    </Badge>
                  )}
                </Link>
                <CardHeader className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {item.category || "General"}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4">
                      {item.sku}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                    {item.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-2 pt-0 flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {item.description || "No description available for this item."}
                  </p>
                </CardContent>
                <CardFooter className="p-4 pt-0 mt-auto flex flex-col gap-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-neutral-900 font-mono tracking-tight">
                      ₦{item.sellingPrice.toLocaleString()}
                    </span>
                    {item.unit && item.unit !== "pcs" && (
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">
                        / {item.unit}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button 
                      className="flex-1 rounded-xl h-10 gap-2"
                      onClick={() => addToCart(item)}
                    >
                      <ShoppingCart className="h-4 w-4" /> Add
                    </Button>
                    <Link to="/store/product/$productId" params={{ productId: item.id }}>
                      <Button variant="outline" size="icon" className="rounded-xl h-10 w-10">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Newsletter / CTA */}
      <section className="bg-neutral-100 rounded-3xl p-8 md:p-12 text-center space-y-4">
        <h3 className="text-2xl font-bold">Don't miss our restocks</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Sign up to get notified when new inventory arrives and receive exclusive discounts.
        </p>
        <div className="flex max-w-sm mx-auto gap-2">
          <input className="flex-1 rounded-xl px-4 py-2 border shadow-sm" placeholder="Your email" />
          <Button className="rounded-xl px-6">Subscribe</Button>
        </div>
      </section>
    </div>
  );
}
