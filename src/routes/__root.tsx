import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { DemoProvider } from "@/contexts/DemoContext";
import { useDemo } from "@/hooks/useDemo";
import { RoleProvider } from "@/contexts/RoleContext";
import { SystemSettingsProvider, useSystemSettings } from "@/contexts/SystemSettingsContext";
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
      { title: "Nexa OS — Sophisticated Business Command Center" },
      { name: "description", content: "Nexa OS delivers professional-grade business management tools, including real-time stock tracking, advanced analytics, and AI-powered insights." },
      { name: "author", content: "Nexa Technologies" },
      { property: "og:title", content: "Nexa OS — Sophisticated Business Command Center" },
      { property: "og:description", content: "Nexa OS delivers professional-grade business management tools, including real-time stock tracking, advanced analytics, and AI-powered insights." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@nexa_os" },
      { name: "twitter:image", content: "/og-image.png" },
      { name: "twitter:title", content: "Nexa OS — Sophisticated Business Command Center" },
      { name: "twitter:description", content: "Nexa OS delivers professional-grade business management tools, including real-time stock tracking, advanced analytics, and AI-powered insights." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/nexastoreos-logo.svg",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

import { AuthProvider } from "@/contexts/AuthContext";

function RootComponent() {
  return (
    <AuthProvider>
      <SystemSettingsProvider>
        <DemoProvider>
          <RoleProvider>
            <GlobalStyles />
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
            <Toaster position="bottom-right" richColors />
          </RoleProvider>
        </DemoProvider>
      </SystemSettingsProvider>
    </AuthProvider>
  );
}

function GlobalStyles() {
  const { isDemo, onboarding: demoOnboarding } = useDemo();
  const { settings: liveSettings } = useSystemSettings();
  
  const onboarding = isDemo ? demoOnboarding : liveSettings;
  
  // Dynamically inject brand color if set
  if (!onboarding.brandColor) return null;

  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root {
        --primary: ${onboarding.brandColor};
        --color-primary: ${onboarding.brandColor};
        --sidebar-primary: ${onboarding.brandColor};
        --color-sidebar-primary: ${onboarding.brandColor};
        --ring: ${onboarding.brandColor};
        --color-ring: ${onboarding.brandColor};
        --accent: ${onboarding.brandColor};
        --color-accent: ${onboarding.brandColor};
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
