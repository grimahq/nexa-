import { createContext, useMemo, useState, type ReactNode } from "react";
import { useDemo } from "@/hooks/useDemo";
import { getPermissionsForRole, type RolePermissions, type UserRoleType } from "@/lib/roles";

export interface RoleContextValue {
  role: UserRoleType;
  permissions: RolePermissions;
  isAdmin: boolean;
  isManager: boolean;
  isRequestor: boolean;
  
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
  const [demoRole, setDemoRole] = useState<UserRoleType>("admin");
  const [currentStoreId, setCurrentStoreId] = useState(DEMO_STORES[0].id);

  const role: UserRoleType = isDemo ? demoRole : "requestor"; 

  const value = useMemo<RoleContextValue>(() => {
    const permissions = getPermissionsForRole(role);
    return {
      role,
      permissions,
      isAdmin: role === "admin",
      isManager: role === "manager",
      isRequestor: role === "requestor",
      currentStoreId,
      stores: DEMO_STORES,
      members: STORE_MEMBERS[currentStoreId] || [],
      setCurrentStoreId,
      setDemoRole,
    };
  }, [role, currentStoreId]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
