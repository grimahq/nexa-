import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot, setDoc, getDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";
import type { CustomFieldDefinition } from "@/types/inventory";
import type { SubscriptionPlan } from "@/types/subscription";
import { DEFAULT_PLANS } from "@/utils/subscriptionUtils";

export interface ReorderDefaultsType {
  reorderPoint: number;
  leadTimeDays: number;
  safetyMultiplier: number;
  orderQuantity: number;
}

export interface ReportPreferences {
  frequency: "daily" | "weekly" | "monthly" | "off";
  lastSentAt?: string;
  recipientEmail: string;
}

export interface StoreSettings {
  storeName: string;
  storePhone: string;
  storeAddress: string;
  storeDescription?: string;
  receiptFooter: string;
  taxRate: number;
  brandColor?: string;
  logoUrl?: string;
  businessType?: string;
  electronicsMainType?: "devices" | "accessories" | "both";
  categories: string[];
  isOnboarded: boolean;
  moniepointKey?: string;
  storeSlug?: string;
  onboardedAt?: string;
  onboardedBy?: string;
  customFieldDefs?: CustomFieldDefinition[];
  reorderDefaults?: ReorderDefaultsType;
  pricingMode?: "single" | "tiered";
  reportPreferences?: ReportPreferences;
  subscriptionTier?: string;
  subscriptionStatus?: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Nexa Store",
  storePhone: "",
  storeAddress: "",
  storeDescription: "",
  receiptFooter: "Thank you for your patronage!",
  taxRate: 0,
  brandColor: "#0d9488",
  businessType: "retail",
  categories: [],
  isOnboarded: false,
  pricingMode: "single",
  reportPreferences: {
    frequency: "off",
    recipientEmail: ""
  }
};

interface SystemSettingsContextValue {
  settings: StoreSettings;
  loading: boolean;
  updateSettings: (updates: Partial<StoreSettings>) => Promise<void>;
  setupStore: (onboardingData: Partial<StoreSettings>) => Promise<void>;
  plans: SubscriptionPlan[];
}

const SystemSettingsContext = createContext<SystemSettingsContextValue | null>(null);

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(DEFAULT_PLANS);

  useEffect(() => {
    if (!user) return;
    const plansRef = collection(db, "subscriptionPlans");
    const unsub = onSnapshot(plansRef, (snap) => {
      const loaded: SubscriptionPlan[] = [];
      snap.forEach(doc => {
        loaded.push(doc.data() as SubscriptionPlan);
      });
      if (loaded.length > 0) {
        setPlans(loaded);
      }
    }, (error) => {
      console.warn("Error listening to subscription plans, falling back to defaults", error);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !profile?.storeId) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    setLoading(true);

    const settingsRef = doc(db, "stores", profile.storeId);

    // Safety timeout to prevent infinite loading of store settings if Firestore is offline
    const timer = setTimeout(() => {
      console.warn("System settings fetch timed out after 1500ms. Falling back to cache/default.");
      const cached = localStorage.getItem("nexa_settings_" + profile.storeId);
      if (cached) {
        try {
          setSettings(JSON.parse(cached));
        } catch {
          setSettings(DEFAULT_SETTINGS);
        }
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
      setLoading(false);
    }, 1500);
    
    const unsubscribe = onSnapshot(settingsRef, (snap) => {
      clearTimeout(timer);
      if (snap.exists()) {
        const data = snap.data() as StoreSettings;
        setSettings(data);
        localStorage.setItem("nexa_settings_" + profile.storeId, JSON.stringify(data));
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
      setLoading(false);
    }, (error) => {
      clearTimeout(timer);
      console.warn("Error fetching system settings inside listener:", error);
      const cached = localStorage.getItem("nexa_settings_" + profile.storeId);
      if (cached) {
        try {
          setSettings(JSON.parse(cached));
        } catch {
          setSettings(DEFAULT_SETTINGS);
        }
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [user, profile?.storeId]);

  const updateSettings = async (updates: Partial<StoreSettings>) => {
    if (profile?.role !== "admin" || !profile?.storeId) throw new Error("Only admins can update store settings");
    const settingsRef = doc(db, "stores", profile.storeId);
    await setDoc(settingsRef, { ...settings, ...updates }, { merge: true });
  };

  const setupStore = async (onboardingData: Partial<StoreSettings>) => {
    if (!user || profile?.role !== "admin" || !profile?.storeId) throw new Error("Only admins can perform initial setup");
    
    const settingsRef = doc(db, "stores", profile.storeId);
    const data = {
      ...DEFAULT_SETTINGS,
      ...onboardingData,
      id: profile.storeId,
      ownerId: user.uid,
      isOnboarded: true,
      onboardedAt: new Date().toISOString(),
      onboardedBy: user.uid
    };
    
    await setDoc(settingsRef, data, { merge: true });
    
    // Also mark the admin as having completed onboarding
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { onboardingCompleted: true }, { merge: true });
  };

  return (
    <SystemSettingsContext.Provider value={{ settings, loading, updateSettings, setupStore, plans }}>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) throw new Error("useSystemSettings must be used within SystemSettingsProvider");
  return context;
};
