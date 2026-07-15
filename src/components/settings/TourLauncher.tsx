import { HelpCircle, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export function TourLauncher() {
  const tour = useOnboarding("dashboard");
  const storeTour = useOnboarding("store");
  const navigate = useNavigate();

  const handleLaunchTour = () => {
    tour.resetTour();
    sessionStorage.setItem("stackwise-trigger-tour", "true");
    navigate({ to: "/app/dashboard" });
    toast.info("Tour starting on dashboard...");
  };

  const handleLaunchStoreTour = () => {
    storeTour.resetTour();
    sessionStorage.setItem("stackwise-trigger-store-tour", "true");
    navigate({ to: "/store" });
    toast.info("Tour starting on customer storefront...");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="h-4 w-4" /> Help & Tours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Admin Dashboard Tour</h4>
          <p className="text-sm text-muted-foreground">
            Take a guided tour of the back-office admin system to learn about all the features available to manage your business.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleLaunchTour} className="gap-2">
              <Play className="h-4 w-4" /> Launch Admin Tour
            </Button>
            {tour.hasCompleted && (
              <Button variant="outline" onClick={handleLaunchTour} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Restart Admin Tour
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-border pt-6 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Customer Storefront Tour</h4>
          <p className="text-sm text-muted-foreground">
            Explore the public-facing e-commerce storefront layout, product browser, catalog, and ordering system as seen by your customers.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleLaunchStoreTour} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <Play className="h-4 w-4" /> Launch Storefront Tour
            </Button>
            {storeTour.hasCompleted && (
              <Button variant="outline" onClick={handleLaunchStoreTour} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Restart Storefront Tour
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
          <h4 className="text-sm font-semibold">Tours cover:</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
            <li>Dashboard overview and operations analytics</li>
            <li>Sales and POS tracking</li>
            <li>Inventory, low stock alerts, and catalog management</li>
            <li>Customer-facing storefront layout, product pages, and checkout cart</li>
            <li>AI support chat agents and customer-support live pipelines</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
