import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { DemoProvider } from "@/contexts/DemoContext";
import { useDemo } from "@/hooks/useDemo";
import { RoleProvider } from "@/contexts/RoleContext";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NEXA -version2" },
      { name: "description", content: "Manage inventory with real-time stock tracking, supplier management, purchase orders, and AI-powered demand forecasting. Includes role-based access, barcode sup" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "NEXA -version2" },
      { property: "og:description", content: "Manage inventory with real-time stock tracking, supplier management, purchase orders, and AI-powered demand forecasting. Includes role-based access, barcode sup" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ce8fd1f7-8ca4-425d-a29c-052d48d54d68/id-preview-991ef288--eaf13a24-9d23-4ea5-ae81-bd8ed9669775.lovable.app-1774415671292.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ce8fd1f7-8ca4-425d-a29c-052d48d54d68/id-preview-991ef288--eaf13a24-9d23-4ea5-ae81-bd8ed9669775.lovable.app-1774415671292.png" },
      { name: "twitter:title", content: "NEXA -version2" },
      { name: "twitter:description", content: "Manage inventory with real-time stock tracking, supplier management, purchase orders, and AI-powered demand forecasting. Includes role-based access, barcode sup" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <DemoProvider>
      <RoleProvider>
        <GlobalStyles />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
        <Toaster position="bottom-right" richColors />
      </RoleProvider>
    </DemoProvider>
  );
}

function GlobalStyles() {
  const { onboarding } = useDemo();
  
  // Dynamically inject brand color if set
  if (!onboarding.brandColor) return null;

  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --primary: ${onboarding.brandColor};
        --sidebar-primary: ${onboarding.brandColor};
      }
    `}} />
  );
}

function NotFoundComponent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background p-6 text-center">
      <div className="mb-6 rounded-full bg-destructive/10 p-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">404 - Page Not Found</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        Oops! The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild>
        <Link to="/app/dashboard" className="gap-2">
          <Home className="h-4 w-4" /> Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
