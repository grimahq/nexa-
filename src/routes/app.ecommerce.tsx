import { createFileRoute } from "@tanstack/react-router";
import { Globe, Link2, Share2, Copy, ExternalLink, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useItems } from "@/hooks/useInventoryData";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ecommerce")({
  component: EcommercePage,
});

function EcommercePage() {
  const { data: items } = useItems({ status: "active" });
  const ecommerceItems = items.filter(i => i.isEcommerceEnabled);

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/store/product/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Product link copied to clipboard!");
  };

  const shareWhatsApp = (item: { id: string; name: string; sellingPrice: number }) => {
    const url = `${window.location.origin}/store/product/${item.id}`;
    const text = `Check out ${item.name} on our store! Only ₦${item.sellingPrice.toLocaleString()}\n\nBuy here: ${url}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  const shareBulk = () => {
    const text = `Browse our full catalog here: ${window.location.origin}/store`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">E-commerce Storefront</h1>
          <p className="text-muted-foreground">Manage your online presence and product share links.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={shareBulk} className="gap-2">
            <Share2 className="h-4 w-4" /> Share All
          </Button>
          <Button className="gap-2" asChild>
            <a href="/store" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> View Storefront
            </a>
          </Button>
        </div>
      </div>

      {ecommerceItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-3">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No items enabled for e-commerce</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              Head to the Catalog, edit an item, and enable "E-commerce" to start generating shareable links for your customers.
            </p>
            <Button variant="outline" className="mt-6" asChild>
              <a href="/app/catalog">Go to Catalog</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ecommerceItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm">{item.name}</CardTitle>
                <CardDescription className="text-xs uppercase font-mono">{item.sku}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-semibold text-primary">₦{item.sellingPrice.toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => copyLink(item.id)}>
                    <Copy className="h-3 w-3" /> Link
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1">
                    <QrCode className="h-3 w-3" /> QR
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1" onClick={() => shareWhatsApp(item)}>
                    <Share2 className="h-3 w-3" /> WA
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
