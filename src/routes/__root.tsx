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
import { ThemeProvider } from "@/contexts/ThemeContext";

function RootComponent() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
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

import { useEffect, useState } from "react";

function NotFoundComponent() {
  const [countdown, setCountdown] = useState(3);
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  useEffect(() => {
    // Handle typos like /app/sells -> redirect to /app/sales
    if (pathname.includes("/app/sells")) {
      window.location.href = "/app/sales";
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (pathname.startsWith("/app/")) {
            window.location.href = "/app/dashboard";
          } else {
            window.location.href = "/";
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pathname]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-background p-6 text-center">
      <div className="mb-6 rounded-full bg-amber-500/10 p-4 border border-amber-500/20">
        <AlertCircle className="h-12 w-12 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Invalid or Unrecognized Page</h1>
      <p className="text-muted-foreground max-w-md mb-2 text-sm leading-relaxed">
        We couldn't find a page at <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono text-foreground">{pathname}</code>.
      </p>
      <p className="text-xs text-muted-foreground mb-6">
        Auto-redirecting to dashboard in <span className="font-bold text-foreground">{countdown}s</span>...
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="default">
          <Link to="/app/dashboard" className="gap-2">
            <Home className="h-4 w-4" /> Go to Dashboard
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app/sales" className="gap-2">
            POS Sales
          </Link>
        </Button>
      </div>
    </div>
  );
}
