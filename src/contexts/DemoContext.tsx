import { createContext, useCallback, useMemo, useState, useEffect, type ReactNode } from "react";
import { DemoStore } from "@/lib/demo-store";
import { SUPPORTED_UNITS, ItemStatus, type Item } from "@/types/inventory";
import { useAuth } from "./AuthContext";

export interface OnboardingSelection {
  businessType: string | null;
  categories: string[];
  storeName: string;
  storePhone: string;
  storeAddress: string;
  receiptFooter: string;
  taxRate: number;
  brandColor?: string;
  logoUrl?: string;
  initialItems?: Array<{ 
    name: string; 
    price: string; 
    stock: string; 
    unit: string; 
    categoryId?: string;
    color?: string;
    sizes?: string;
    enableColours?: boolean;
    enableSizes?: boolean;
    fineTunedVariants?: Record<string, { price: number; stock: number }>;
  }>;
  currency?: string;
  country?: string;
  state?: string;
  lga?: string;
}

const DEFAULT_ONBOARDING: OnboardingSelection = { businessType: null, categories: [], storeName: "My Store", storePhone: "", storeAddress: "", receiptFooter: "Thank you for your patronage!", taxRate: 0, brandColor: "#0d9488", logoUrl: "", currency: "NGN", country: "Nigeria", state: "", lga: "" };

export interface DemoContextValue {
  isDemo: boolean;
  demoStore: DemoStore | null;
  enterDemoMode: (onboarding?: OnboardingSelection) => void;
  exitDemoMode: () => void;
  resetDemoData: () => void;
  bumpVersion: () => void;
  version: number;
  onboarding: OnboardingSelection;
  updateOnboarding: (updates: Partial<OnboardingSelection>) => void;
}

export const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<DemoStore | null>(null);
  const [version, setVersion] = useState(0);
  const [onboarding, setOnboarding] = useState<OnboardingSelection>(DEFAULT_ONBOARDING);

  const enterDemoMode = useCallback((ob?: OnboardingSelection) => {
    const s = new DemoStore(ob?.businessType || "general", ob?.categories);
    
    // Clear default items if we have custom ones
    if (ob?.initialItems && ob.initialItems.length > 0) {
      // In a real app we might want to keep some seed data, 
      // but for "Business Onboarding" we should probably start fresh if requested
      // For now, let's just prepend/add them to the store
      ob.initialItems.forEach((pi, idx) => {
        const unitType = (SUPPORTED_UNITS.find(u => u.id === pi.unit)?.type || "count") as Item["unitType"];
        
        let conversions = undefined;
        if (ob.businessType === "textile" && pi.name.toLowerCase().includes("ankara")) {
          conversions = [
            { unitId: "roll", multiplier: 10, priceNgn: 35000 }
          ];
        }

        s.createItem({
          id: `new-${idx}-${Date.now()}`,
          sku: `SKU-${100 + idx}`,
          name: pi.name,
          description: "Added during onboarding",
          categoryId: pi.categoryId || ob.categories[0] || "misc",
          status: ItemStatus.Active,
          unit: pi.unit,
          unitType: unitType,
          currentStock: parseFloat(pi.stock) || 0,
          reorderPoint: 5,
          reorderQuantity: 10,
          costPrice: parseFloat(pi.price) * 0.7, // Assume 30% margin for demo
          sellingPrice: parseFloat(pi.price) || 0,
          unitConversions: conversions,
          color: pi.color || "",
          sizes: pi.sizes || "",
          enableColours: pi.enableColours || false,
          enableSizes: pi.enableSizes || false,
          fineTunedVariants: pi.fineTunedVariants || null,
          supplierId: "sup-01",
          locationId: "loc-01",
          isEcommerceEnabled: true,
          affiliateCommission: 0,
          tags: [],
          customFields: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    }

    setStore(s);
    setVersion(0);
    setOnboarding(ob ?? DEFAULT_ONBOARDING);
  }, []);

  const exitDemoMode = useCallback(() => {
    setStore(null);
    setVersion(0);
    setOnboarding(DEFAULT_ONBOARDING);
  }, []);

  const resetDemoData = useCallback(() => {
    if (store) {
      store.reset();
      setVersion((v) => v + 1);
    }
  }, [store]);

  const bumpVersion = useCallback(() => setVersion((v) => v + 1), []);
  const { user } = useAuth();

  // Automatically exit demo mode when a real user logs in
  useEffect(() => {
    if (user && store) {
      exitDemoMode();
    }
  }, [user, store, exitDemoMode]);

  const updateOnboarding = useCallback((updates: Partial<OnboardingSelection>) => {
    setOnboarding((prev) => {
      const next = { ...prev, ...updates };
      if (updates.businessType && updates.businessType !== prev.businessType) {
        let cats: string[] = [];
        if (updates.businessType === "pharmacy") cats = ["office", "tools", "it", "medical", "cleaning", "misc"];
        else if (updates.businessType === "restaurant") cats = ["proteins", "grains", "vegetables", "drinks", "spices", "bakery"];
        else if (updates.businessType === "electronics") cats = ["office", "tools", "it", "medical", "cleaning", "misc"];
        else if (updates.businessType === "agriculture") cats = ["grains_bulk", "tubers", "livestock", "seeds", "fertilizers", "tools_agri"];
        else if (updates.businessType === "retail") cats = ["electronics", "fashion", "groceries", "beauty", "home", "sports"];
        else if (updates.businessType === "textile") cats = ["cotton", "laces", "silk", "sewing", "traditional", "prints"];
        else if (updates.businessType === "wholesale") cats = ["fmcg", "building", "agro", "industrial", "textiles", "chemicals"];
        else cats = ["office", "tools", "it", "medical", "cleaning", "misc"];
        
        const newStore = new DemoStore(updates.businessType, cats);
        setStore(newStore);
        setVersion((v) => v + 1);
        next.categories = cats;
      }
      return next;
    });
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      isDemo: store !== null,
      demoStore: store,
      enterDemoMode,
      exitDemoMode,
      resetDemoData,
      bumpVersion,
      version,
      onboarding,
      updateOnboarding,
    }),
    [store, enterDemoMode, exitDemoMode, resetDemoData, bumpVersion, version, onboarding, updateOnboarding],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
