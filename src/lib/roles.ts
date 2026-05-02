export type UserRoleType = "admin" | "manager" | "requestor";

export interface RolePermissions {
  canManageItems: boolean;
  canLogMovements: boolean;
  canManagePOs: boolean;
  canManageSuppliers: boolean;
  canApproveRequests: boolean;
  canCreateRequests: boolean;
  canViewAnalytics: boolean;
  canAccessSettings: boolean;
  canManageUsers: boolean;
  canSell: boolean;
  canViewSalesHistory: boolean;
  canViewRequests: boolean;
}

const ROLE_PERMISSIONS: Record<UserRoleType, RolePermissions> = {
  admin: {
    canManageItems: true,
    canLogMovements: true,
    canManagePOs: true,
    canManageSuppliers: true,
    canApproveRequests: true,
    canCreateRequests: true,
    canViewAnalytics: true,
    canAccessSettings: true,
    canManageUsers: true,
    canSell: true,
    canViewSalesHistory: true,
    canViewRequests: true,
  },
  manager: {
    canManageItems: true,
    canLogMovements: true,
    canManagePOs: true,
    canManageSuppliers: true,
    canApproveRequests: true,
    canCreateRequests: true,
    canViewAnalytics: true,
    canAccessSettings: false,
    canManageUsers: false,
    canSell: true,
    canViewSalesHistory: true,
    canViewRequests: true,
  },
  requestor: {
    canManageItems: false,
    canLogMovements: false,
    canManagePOs: false,
    canManageSuppliers: false,
    canApproveRequests: false,
    canCreateRequests: true,
    canViewAnalytics: false,
    canAccessSettings: false,
    canManageUsers: false,
    canSell: false,
    canViewSalesHistory: false,
    canViewRequests: true,
  },
};

export function getPermissionsForRole(role: UserRoleType): RolePermissions {
  return ROLE_PERMISSIONS[role];
}
