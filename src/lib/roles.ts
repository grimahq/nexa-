export type UserRoleType = "admin" | "manager" | "cashier";

export interface RolePermissions {
  canViewDashboard: boolean;
  canManageItems: boolean;
  canLogMovements: boolean;
  canManagePOs: boolean;
  canViewSuppliers: boolean;
  canManageSuppliers: boolean;
  canApproveRequests: boolean;
  canCreateRequests: boolean;
  canViewAnalytics: boolean;
  canAccessSettings: boolean;
  canManageUsers: boolean;
  canSell: boolean;
  canViewSalesHistory: boolean;
  canViewRequests: boolean;
  canViewExpenses: boolean;
  canViewReturns: boolean;
  canViewEcommerce: boolean;
  canViewLocations: boolean;
  canViewCustomers: boolean;
}

const ROLE_PERMISSIONS: Record<UserRoleType, RolePermissions> = {
  admin: {
    canViewDashboard: true,
    canManageItems: true,
    canLogMovements: true,
    canManagePOs: true,
    canViewSuppliers: true,
    canManageSuppliers: true,
    canApproveRequests: true,
    canCreateRequests: true,
    canViewAnalytics: true,
    canAccessSettings: true,
    canManageUsers: true,
    canSell: true,
    canViewSalesHistory: true,
    canViewRequests: true,
    canViewExpenses: true,
    canViewReturns: true,
    canViewEcommerce: true,
    canViewLocations: true,
    canViewCustomers: true,
  },
  manager: {
    canViewDashboard: true,
    canManageItems: true,
    canLogMovements: true,
    canManagePOs: false,
    canViewSuppliers: false,
    canManageSuppliers: false,
    canApproveRequests: true,
    canCreateRequests: true,
    canViewAnalytics: false,
    canAccessSettings: false,
    canManageUsers: false,
    canSell: true,
    canViewSalesHistory: true,
    canViewRequests: true,
    canViewExpenses: true,
    canViewReturns: true,
    canViewEcommerce: false,
    canViewLocations: false,
    canViewCustomers: true,
  },
  cashier: {
    canViewDashboard: false,
    canManageItems: false,
    canLogMovements: false,
    canManagePOs: false,
    canViewSuppliers: false,
    canManageSuppliers: false,
    canApproveRequests: false,
    canCreateRequests: false,
    canViewAnalytics: false,
    canAccessSettings: false,
    canManageUsers: false,
    canSell: true,
    canViewSalesHistory: true,
    canViewRequests: false,
    canViewExpenses: false,
    canViewReturns: false,
    canViewEcommerce: false,
    canViewLocations: false,
    canViewCustomers: false,
  },
};

export function getPermissionsForRole(role: UserRoleType): RolePermissions {
  return ROLE_PERMISSIONS[role];
}
