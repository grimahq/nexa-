import type { UserRoleType } from "@/lib/roles";

/** Maps route paths to the minimum roles allowed */
const ROUTE_ACCESS: Record<string, UserRoleType[]> = {
  "/app/dashboard": ["admin", "manager"],
  "/app/sales": ["admin", "manager", "cashier"],
  "/app/sales-history": ["admin", "manager", "cashier"],
  "/app/sales-analytics": ["admin"],
  "/app/catalog": ["admin", "manager"],
  "/app/requests": ["admin", "manager"],
  "/app/movements": ["admin", "manager"],
  "/app/suppliers": ["admin"],
  "/app/purchase-orders": ["admin"],
  "/app/analytics": ["admin"],
  "/app/ai-insights": ["admin"],
  "/app/settings": ["admin"],
  "/app/customers": ["admin", "manager"],
  "/app/returns": ["admin", "manager"],
  "/app/expenses": ["admin", "manager"],
  "/app/ecommerce": ["admin"],
  "/app/affiliates": ["admin"],
  "/app/locations": ["admin"],
  "/app/tracker": ["admin"],
};

/**
 * Returns true if the given role can access the path.
 * Unknown paths default to admin-only.
 */
export function canAccessRoute(path: string, role: UserRoleType, isSuperAdmin?: boolean): boolean {
  if (path.startsWith("/app/super-admin")) {
    return !!isSuperAdmin;
  }
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return role === "admin" || !!isSuperAdmin;
  return allowed.includes(role) || !!isSuperAdmin;
}
