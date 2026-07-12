import { createContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { useDemo } from "@/hooks/useDemo";
import { getPermissionsForRole, type RolePermissions, type UserRoleType } from "@/lib/roles";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useUsers } from "@/hooks/useUsers";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    { id: "u3", name: "Dave Requestor", role: "requestor" },
  ],
  "store-2": [
    { id: "u4", name: "Mike Head", role: "admin" },
    { id: "u5", name: "Alice Clerk", role: "requestor" },
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
  const { data: firebaseUsers } = useUsers();
  
  const [demoRole, setDemoRole] = useState<UserRoleType>("admin");
  const [demoSuperAdmin, setDemoSuperAdmin] = useState(true);
  const [currentStoreId, setCurrentStoreId] = useState(DEMO_STORES[0].id);
  const [hasSuperAdminDoc, setHasSuperAdminDoc] = useState(false);

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
    if (authLoading) return "requestor"; // Placeholder while loading
    
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

    if (profile?.role === "admin" || profile?.role === "manager" || profile?.role === "requestor") {
      return profile.role as UserRoleType;
    }
    return "requestor";
  }, [isDemo, demoRole, profile, user, authLoading, hasSuperAdminDoc]);

  const isSuperAdmin = useMemo(() => {
    if (isDemo) {
      return demoRole === "admin" && demoSuperAdmin;
    }
    const email = user?.email;
    if (!email) return false;

    const isBootstrapped = 
      email === "nexatechnologies.dev@gmail.com" ||
      email === "operations@nexa.com" ||
      email === "support@nexa.com";

    return isBootstrapped || hasSuperAdminDoc;
  }, [isDemo, demoRole, demoSuperAdmin, user, hasSuperAdminDoc]);

  const value = useMemo<RoleContextValue>(() => {
    const permissions = getPermissionsForRole(role);
    
    const realStoreId = profile?.storeId || "global-store";
    const stores = isDemo ? DEMO_STORES : [{ id: realStoreId, name: settings.storeName || "Main Store" }];
    const members = isDemo 
      ? (STORE_MEMBERS[currentStoreId] || []) 
      : (firebaseUsers || []).map(u => ({ id: u.id, name: u.name, role: u.role as UserRoleType }));

    return {
      role,
      permissions,
      isAdmin: role === "admin",
      isManager: role === "manager",
      isRequestor: role === "requestor",
      isSuperAdmin,
      currentStoreId: isDemo ? currentStoreId : realStoreId,
      stores,
      members,
      setCurrentStoreId,
      setDemoRole,
    };
  }, [role, isSuperAdmin, currentStoreId, isDemo, settings.storeName, firebaseUsers, profile?.storeId]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
