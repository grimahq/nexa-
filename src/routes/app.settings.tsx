import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { useRole } from "@/hooks/useRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { CustomFieldManager } from "@/components/settings/CustomFieldManager";
import { LocationSettings } from "@/components/settings/LocationSettings";
import { ReorderDefaults } from "@/components/settings/ReorderDefaults";
import { SystemSettings } from "@/components/settings/SystemSettings";
import { UserManagement } from "@/components/settings/UserManagement";
import { StoreSettings } from "@/components/settings/StoreSettings";
import { CustomerDirectory } from "@/components/settings/CustomerDirectory";
import { StoreBranding } from "@/components/settings/StoreBranding";
import { SmartFeatures } from "@/components/settings/SmartFeatures";
import { TourLauncher } from "@/components/settings/TourLauncher";
import { AgriAdminPanel } from "@/components/settings/AgriAdminPanel";
import { PharmaAdminPanel } from "@/components/settings/PharmaAdminPanel";
import { RestaurantAdminPanel } from "@/components/settings/RestaurantAdminPanel";
import { useSector } from "@/hooks/useSector";

import { ProfileSettings } from "@/components/settings/ProfileSettings";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Stackwise" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
});

function SettingsPage() {
  const { tab } = Route.useSearch();
  const { role, isAdmin } = useRole();
  const navigate = useNavigate();
  const sector = useSector();

  const isRequestor = role === "requestor";
  const isManager = role === "manager";

  const defaultTab = tab || (isAdmin ? "store" : "profile");

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">{isAdmin ? "System configuration and management" : "Manage your account and preferences"}</p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="store">Store Info</TabsTrigger>
              <TabsTrigger value="branding">Appearance</TabsTrigger>
              <TabsTrigger value="sector" className="capitalize">{sector.type} Rules</TabsTrigger>
              <TabsTrigger value="customers">{sector.labels.customers}</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="reorder-defaults">Reorder</TabsTrigger>
              <TabsTrigger value="smart">Smart Features</TabsTrigger>
              <TabsTrigger value="users">Staff</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </>
          )}
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="profile">
            <ErrorBoundary><ProfileSettings /></ErrorBoundary>
          </TabsContent>
          {isAdmin && (
            <>
              <TabsContent value="store">
                <ErrorBoundary><StoreSettings /></ErrorBoundary>
              </TabsContent>
              <TabsContent value="branding">
                <ErrorBoundary><StoreBranding /></ErrorBoundary>
              </TabsContent>
              <TabsContent value="sector">
                <ErrorBoundary>
                  {sector.type === "agriculture" && <AgriAdminPanel />}
                  {sector.type === "pharmacy" && <PharmaAdminPanel />}
                  {sector.type === "restaurant" && <RestaurantAdminPanel />}
                  {!["agriculture", "pharmacy", "restaurant"].includes(sector.type) && (
                    <div className="rounded-xl border border-border bg-card p-6">
                      <h3 className="text-lg font-bold mb-4 capitalize">{sector.type} Operations</h3>
                      <p className="text-sm text-muted-foreground mb-6">Manage rules and configurations specific to your {sector.type} business.</p>
                      <div className="p-8 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center space-y-2">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <span className="text-2xl">⚙️</span>
                        </div>
                        <p className="text-sm font-medium">Sector Operations</p>
                        <p className="text-xs text-muted-foreground">General admin tools for your {sector.type} category.</p>
                      </div>
                    </div>
                  )}
                </ErrorBoundary>
              </TabsContent>
              <TabsContent value="customers">
                <ErrorBoundary><CustomerDirectory /></ErrorBoundary>
              </TabsContent>
              <TabsContent value="categories">
                <ErrorBoundary><CategoryManager /></ErrorBoundary>
              </TabsContent>
              <TabsContent value="custom-fields">
                <ErrorBoundary><CustomFieldManager /></ErrorBoundary>
              </TabsContent>
              <TabsContent value="locations">
                <ErrorBoundary><LocationSettings /></ErrorBoundary>
              </TabsContent>
              <TabsContent value="reorder-defaults">
                <ErrorBoundary><ReorderDefaults /></ErrorBoundary>
              </TabsContent>
              <TabsContent value="smart">
                <ErrorBoundary><SmartFeatures /></ErrorBoundary>
              </TabsContent>
              <TabsContent value="users">
                  <ErrorBoundary><UserManagement /></ErrorBoundary>
                </TabsContent>
              <TabsContent value="system">
                <ErrorBoundary><SystemSettings /></ErrorBoundary>
              </TabsContent>
            </>
          )}
          <TabsContent value="help">
            <ErrorBoundary><TourLauncher /></ErrorBoundary>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
