import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { BottomNav } from "@/components/layout/BottomNav";
import { ShortcutsHelpDialog } from "@/components/command/ShortcutsHelpDialog";
import { PageTransition } from "@/components/shared/PageTransition";
import { useDemo } from "@/hooks/useDemo";
import { useRole } from "@/hooks/useRole";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { canAccessRoute } from "@/lib/route-guard";
import { toast } from "sonner";
import { BusinessOnboarding } from "@/components/onboarding/BusinessOnboarding";
import { MemberOnboarding } from "@/components/onboarding/MemberOnboarding";
import { type PendingProduct } from "@/components/onboarding/BulkProductEntry";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { doc, updateDoc, writeBatch, collection } from "firebase/firestore";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

import { useAuth } from "@/contexts/AuthContext";

function AppLayout() {
  const { isDemo } = useDemo();
  const { user, profile, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading, setupStore } = useSystemSettings();
  const { role, isOwner, isAdmin, isSuperAdmin } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [memberOnboarding, setMemberOnboarding] = useState(false);

  // Global keyboard shortcuts
  useKeyboardShortcuts({ onHelpOpen: () => setHelpOpen(true) });

  // Onboarding guard: If live, admin, and not onboarded (Store Onboarding)
  useEffect(() => {
    if (!isDemo && !authLoading && !settingsLoading && isAdmin && !settings.isOnboarded) {
      setForceOnboarding(true);
    } else {
      setForceOnboarding(false);
    }
  }, [isDemo, authLoading, settingsLoading, isAdmin, settings.isOnboarded]);

  // Member Onboarding guard: If live and personal onboarding not completed
  useEffect(() => {
    if (!isDemo && !authLoading && profile && !profile.onboardingCompleted) {
      setMemberOnboarding(true);
    } else {
      setMemberOnboarding(false);
    }
  }, [isDemo, authLoading, profile]);

  const handleOnboardingComplete = async (data: {
    businessType: string;
    categories: string[];
    storeName: string;
    brandColor: string;
    moniepointKey?: string;
    storeSlug?: string;
    initialItems?: PendingProduct[];
  }) => {
    try {
      await setupStore({
        businessType: data.businessType,
        categories: data.categories,
        storeName: data.storeName,
        brandColor: data.brandColor,
        moniepointKey: data.moniepointKey,
        storeSlug: data.storeSlug,
        isOnboarded: true
      });

      // Save initial items if any
      if (data.initialItems && data.initialItems.length > 0 && profile?.storeId) {
        const batch = writeBatch(db);
        data.initialItems.forEach(item => {
          const itemRef = doc(collection(db, "items"));
          batch.set(itemRef, {
            id: itemRef.id,
            storeId: profile.storeId,
            name: item.name,
            // Generate a simple SKU if one isn't provided
            sku: `PROD-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            currentStock: Number(item.stock) || 0,
            sellingPrice: Number(item.price) || 0,
            unit: item.unit || "pcs",
            status: "active",
            reorderPoint: 5,
            categoryId: item.categoryId || (data.categories && data.categories[0]) || "misc",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        });
        await batch.commit();
      }
      
      // Also update admin's personal onboarding status
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          onboardingCompleted: true,
          updatedAt: new Date().toISOString()
        });
      }

      sessionStorage.setItem("stackwise-just-onboarded", "true");
      setForceOnboarding(false);
      setMemberOnboarding(false);
      toast.success("Store setup complete! Your items have been added.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "onboarding completion");
      toast.error("Failed to save store settings.");
      console.error(err);
    }
  };

  const handleMemberOnboardingComplete = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        onboardingCompleted: true,
        updatedAt: new Date().toISOString()
      });
      setMemberOnboarding(false);
    } catch (err) {
      console.error("Failed to update onboarding status", err);
      toast.error("Failed to complete onboarding.");
    }
  };

  // Role-based route guard
  useEffect(() => {
    if ((isDemo || user) && !canAccessRoute(location.pathname, role, isSuperAdmin)) {
      toast.error("You don't have permission to access that page.");
      navigate({ to: "/app/dashboard" });
    }
  }, [location.pathname, role, navigate, isDemo, user, isSuperAdmin]);

  // Auth/Demo guard — redirect to landing if not in demo AND not logged in
  useEffect(() => {
    if (!authLoading && !isDemo && !user) {
      navigate({ to: "/" });
    }
  }, [isDemo, user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    );
  }

  // If not in demo and not logged in (and not loading), we'll be redirected by useEffect, 
  // but we should show loading until redirect happens to avoid flicker
  if (!isDemo && !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    );
  }

  const handleOnboardingSkip = async () => {
    try {
      if (isAdmin) {
        await setupStore({
          isOnboarded: true,
          storeName: settings.storeName || "My Store",
          businessType: settings.businessType || "retail",
          categories: settings.categories || []
        });
      }
      await handleMemberOnboardingComplete();
      setForceOnboarding(false);
      setMemberOnboarding(false);
    } catch (err) {
      console.error("Failed to skip onboarding", err);
      toast.error("Failed to update onboarding status.");
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {forceOnboarding && (
        <BusinessOnboarding 
          onComplete={handleOnboardingComplete} 
          onSkip={handleOnboardingSkip} 
        />
      )}
      {memberOnboarding && !forceOnboarding && profile && (
        <MemberOnboarding 
          name={profile.name} 
          role={profile.role} 
          onComplete={handleMemberOnboardingComplete} 
        />
      )}
      {isDemo && <DemoBanner />}
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-[260px] shrink-0 md:block">
          <Sidebar />
        </aside>
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8">
            <AnimatePresence mode="wait">
              <PageTransition routeKey={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <BottomNav />
      <ShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
