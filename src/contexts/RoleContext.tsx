import { createContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { useDemo } from "@/hooks/useDemo";
import { getPermissionsForRole, type RolePermissions, type UserRoleType } from "@/lib/roles";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

export interface RoleContextValue {
  role: UserRoleType;
  permissions: RolePermissions;
  isAdmin: boolean;
  isManager: boolean;
  isRequestor: boolean;
  isSuperAdmin: boolean;
  
  // Store management
  currentStoreId: string;
  stores: { id: string; name: string }[];
  members: { id: string; name: string; role: UserRoleType }[];
  setCurrentStoreId: (id: string) => void;

  /** Demo-only: override the current role */
  setDemoRole: (role: UserRoleType) => void;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

const DEMO_STORES = [
  { id: "store-1", name: "Main Warehouse" },
  { id: "store-2", name: "Ikeja Branch" },
  { id: "store-3", name: "Lekki Outlet" },
];

const STORE_MEMBERS: Record<string, { id: string; name: string; role: UserRoleType }[]> = {
  "store-1": [
    { id: "u1", name: "John Admin", role: "admin" },
    { id: "u2", name: "Sarah Manager", role: "manager" },
    { id: "u3", name: "Dave Staff", role: "manager" },
  ],
  "store-2": [
    { id: "u4", name: "Mike Head", role: "admin" },
    { id: "u5", name: "Alice Clerk", role: "manager" },
  ],
  "store-3": [
    { id: "u6", name: "Bob Owner", role: "admin" },
    { id: "u7", name: "Emma Manager", role: "manager" },
  ],
};

export function RoleProvider({ children }: { children: ReactNode }) {
  const { isDemo } = useDemo();
  const { profile, user, loading: authLoading } = useAuth();
  const { settings } = useSystemSettings();
  
  const [demoRole, setDemoRole] = useState<UserRoleType>("admin");
  const [demoSuperAdmin, setDemoSuperAdmin] = useState(true);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);
  const [hasSuperAdminDoc, setHasSuperAdminDoc] = useState(false);
  const [dbStores, setDbStores] = useState<{ id: string; name: string }[]>([]);
  const [dbMembers, setDbMembers] = useState<{ id: string; name: string; role: UserRoleType }[]>([]);

  useEffect(() => {
    if (isDemo || !user?.uid) {
      setHasSuperAdminDoc(false);
      return;
    }

    try {
      const docRef = doc(db, "super_admins", user.uid);
      const unsub = onSnapshot(docRef, (docSnap) => {
        setHasSuperAdminDoc(docSnap.exists() && docSnap.data()?.active !== false);
      }, (err) => {
        console.warn("Error reading super_admins doc, falling back to false:", err);
        setHasSuperAdminDoc(false);
      });
      return () => unsub();
    } catch (e) {
      console.error("Failed to setup super_admins doc listener:", e);
      setHasSuperAdminDoc(false);
    }
  }, [isDemo, user?.uid]);

  const role: UserRoleType = useMemo(() => {
    if (isDemo) return demoRole;
    if (authLoading) return "manager"; // Placeholder while loading
    
    // Developer / Super Admin account is ALWAYS admin, regardless of standard profile
    const email = user?.email;
    if (
      email === "nexatechnologies.dev@gmail.com" ||
      email === "operations@nexa.com" ||
      email === "support@nexa.com" ||
      hasSuperAdminDoc
    ) {
      return "admin";
    }

    if (profile?.role === "admin" || profile?.role === "manager" || profile?.role === "cashier") {
      return profile.role as UserRoleType;
    }
    return "manager";
  }, [isDemo, demoRole, profile, user, authLoading, hasSuperAdminDoc]);

  const isSuperAdmin = useMemo(() => {
    if (isDemo) {
      return false;
    }
    const email = user?.email;
    if (!email) return false;

    const isBootstrapped = 
      email === "nexatechnologies.dev@gmail.com" ||
      email === "operations@nexa.com" ||
      email === "support@nexa.com";

    return isBootstrapped || hasSuperAdminDoc;
  }, [isDemo, demoRole, demoSuperAdmin, user, hasSuperAdminDoc]);

  // Fetch all stores if Super Admin in real mode
  useEffect(() => {
    if (isDemo || !isSuperAdmin) {
      setDbStores([]);
      return;
    }

    try {
      const storesCol = collection(db, "stores");
      const unsub = onSnapshot(storesCol, (snap) => {
        const list: { id: string; name: string }[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            name: data.storeName || data.name || "Unnamed Store",
          });
        });
        setDbStores(list);
      }, (err) => {
        console.warn("Failed to listen to stores collection:", err);
      });
      return () => unsub();
    } catch (e) {
      console.error("Failed to setup stores collection listener:", e);
    }
  }, [isDemo, isSuperAdmin]);

  // Fetch active store members
  useEffect(() => {
    if (isDemo || !user?.uid) {
      setDbMembers([]);
      return;
    }

    try {
      const realStoreId = profile?.storeId || "global-store";
      const activeStoreId = isSuperAdmin ? (currentStoreId || realStoreId) : realStoreId;

      const q = query(collection(db, "users"), where("storeId", "==", activeStoreId));
      const unsubscribe = onSnapshot(q, (snap) => {
        const list: { id: string; name: string; role: UserRoleType }[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            name: data.name || "Unnamed Staff",
            role: (data.role || "manager") as UserRoleType,
          });
        });
        setDbMembers(list);
      }, (err) => {
        console.warn("Failed to fetch store members:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Failed to setup members listener:", e);
    }
  }, [isDemo, user?.uid, isSuperAdmin, currentStoreId, profile?.storeId]);

  const value = useMemo<RoleContextValue>(() => {
    const permissions = getPermissionsForRole(role);
    
    const realStoreId = profile?.storeId || "global-store";
    
    // Determine activeStoreId
    let activeStoreId = realStoreId;
    if (isDemo) {
      activeStoreId = currentStoreId || DEMO_STORES[0].id;
    } else if (isSuperAdmin) {
      activeStoreId = currentStoreId || realStoreId;
    }

    const baseStores = isDemo ? DEMO_STORES : [{ id: realStoreId, name: settings.storeName || "Main Store" }];
    const stores = isSuperAdmin && !isDemo && dbStores.length > 0 ? dbStores : baseStores;

    const members = isDemo 
      ? (STORE_MEMBERS[activeStoreId] || []) 
      : dbMembers;

    const handleSetCurrentStoreId = (id: string) => {
      setCurrentStoreId(id);
      const storeName = stores.find(s => s.id === id)?.name || id;
      toast.success(`Switched active context to: ${storeName}`);
    };

    return {
      role,
      permissions,
      isAdmin: role === "admin",
      isManager: role === "manager",
      isRequestor: false,
      isSuperAdmin,
      currentStoreId: activeStoreId,
      stores,
      members,
      setCurrentStoreId: handleSetCurrentStoreId,
      setDemoRole,
    };
  }, [role, isSuperAdmin, currentStoreId, isDemo, settings.storeName, dbStores, dbMembers, profile?.storeId]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
