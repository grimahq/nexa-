import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Truck,
  ClipboardList,
  Inbox,
  MapPin,
  BarChart3,
  Sparkles,
  Settings,
  ChevronRight,
  HelpCircle,
  ShoppingCart,
  History,
  RotateCcw,
  Receipt,
  TrendingUp,
  Users,
  Globe,
  Link2,
  ShieldAlert,
  Building2,
  MessageSquare,
  Bot,
} from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { useDemo } from "@/hooks/useDemo";
import { useSector } from "@/hooks/useSector";
import type { RolePermissions } from "@/lib/roles";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permKey?: keyof RolePermissions;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  permKey?: keyof RolePermissions;
}

const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
      { label: "Sales", href: "/app/sales", icon: ShoppingCart, permKey: "canSell" },
      { label: "Sales History", href: "/app/sales-history", icon: History, permKey: "canViewSalesHistory" },
      { label: "Sales Analytics", href: "/app/sales-analytics", icon: TrendingUp, permKey: "canViewAnalytics" },
      { label: "Customers", href: "/app/customers", icon: Users, permKey: "canSell" },
      { label: "Catalog", href: "/app/catalog", icon: Package, permKey: "canManageItems" },
      { label: "Movements", href: "/app/movements", icon: ArrowLeftRight, permKey: "canLogMovements" },
      { label: "Locations", href: "/app/locations", icon: MapPin },
    ],
  },
  {
    label: "Digital Store",
    items: [
      { label: "Storefront", href: "/app/ecommerce", icon: Globe },
      { label: "Affiliates", href: "/app/affiliates", icon: Link2 },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Returns", href: "/app/returns", icon: RotateCcw },
      { label: "Expenses", href: "/app/expenses", icon: Receipt },
    ],
  },
  {
    label: "Procurement",
    permKey: "canManagePOs",
    items: [
      { label: "Suppliers", href: "/app/suppliers", icon: Truck },
      { label: "Purchase orders", href: "/app/purchase-orders", icon: ClipboardList },
    ],
  },
  {
    label: "Intelligence",
    permKey: "canViewAnalytics",
    items: [
      { label: "Analytics", href: "/app/analytics", icon: BarChart3 },
      { label: "AI insights", href: "/app/ai-insights", icon: Sparkles },
      { label: "AI Assistant", href: "/app/ai-assistant", icon: Bot },
    ],
  },
  {
    label: "Admin",
    permKey: "canAccessSettings",
    items: [
      { label: "Settings", href: "/app/settings", icon: Settings },
    ],
  },
];

const standaloneLinks: (NavItem & { permKey?: keyof RolePermissions })[] = [
  { label: "Requests", href: "/app/requests", icon: Inbox, permKey: "canViewRequests" },
  { label: "Help", href: "/app/help", icon: HelpCircle },
];

interface SidebarProps {
  onNavigate?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function Sidebar({ onNavigate, isMinimized = false, onToggleMinimize }: SidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { permissions, stores, currentStoreId, isSuperAdmin } = useRole();
  const { onboarding } = useDemo();
  const sector = useSector();

  const navGroups: NavGroup[] = [
    ...(isSuperAdmin ? [{
      label: "SaaS Operations",
      items: [
        { label: "Dashboard", href: "/app/super-admin", icon: ShieldAlert },
        { label: "Stores", href: "/app/super-admin/stores", icon: Building2 },
        { label: "Users", href: "/app/super-admin/users", icon: Users },
        { label: "Updates", href: "/app/super-admin/updates", icon: MessageSquare },
        { label: "AI Agents", href: "/app/super-admin/agents", icon: Bot },
        { label: "Landing", href: "/app/super-admin/landing", icon: Globe },
      ],
    }] : []),
    {
      label: "Operations",
      items: [
        { label: sector.labels.dashboard, href: "/app/dashboard", icon: LayoutDashboard, permKey: "canViewDashboard" },
        { label: sector.labels.sales, href: "/app/sales", icon: ShoppingCart, permKey: "canSell" },
        { label: "Sales History", href: "/app/sales-history", icon: History, permKey: "canViewSalesHistory" },
        { label: "Sales Analytics", href: "/app/sales-analytics", icon: TrendingUp, permKey: "canViewAnalytics" },
        { label: sector.labels.customers, href: "/app/customers", icon: Users, permKey: "canViewCustomers" },
        { label: sector.labels.catalog, href: "/app/catalog", icon: sector.icons.catalog, permKey: "canManageItems" },
        { label: sector.labels.movements, href: "/app/movements", icon: ArrowLeftRight, permKey: "canLogMovements" },
        { label: "Locations", href: "/app/locations", icon: MapPin, permKey: "canViewLocations" },
      ],
    },
    {
      label: "Digital Store",
      permKey: "canViewEcommerce",
      items: [
        { label: "Storefront", href: "/app/ecommerce", icon: Globe },
        { label: "Affiliates", href: "/app/affiliates", icon: Link2 },
      ],
    },
    {
      label: "Finance",
      items: [
        { label: "Returns", href: "/app/returns", icon: RotateCcw, permKey: "canViewReturns" },
        { label: "Expenses", href: "/app/expenses", icon: Receipt, permKey: "canViewExpenses" },
      ],
    },
    {
      label: "Procurement",
      permKey: "canViewSuppliers",
      items: [
        { label: sector.labels.suppliers, href: "/app/suppliers", icon: Truck, permKey: "canViewSuppliers" },
        { label: "Purchase orders", href: "/app/purchase-orders", icon: ClipboardList, permKey: "canManagePOs" },
      ],
    },
    {
      label: "Intelligence",
      permKey: "canViewAnalytics",
      items: [
        { label: "Analytics", href: "/app/analytics", icon: BarChart3 },
        { label: "AI insights", href: "/app/ai-insights", icon: Sparkles },
        { label: "AI Assistant", href: "/app/ai-assistant", icon: Bot },
      ],
    },
    {
      label: "Admin",
      permKey: "canAccessSettings",
      items: [
        ...(isSuperAdmin ? [{ label: "Super Admin", href: "/app/super-admin", icon: ShieldAlert }] : []),
        { label: "Admin Tracker", href: "/app/tracker", icon: History },
        { label: "Staff", href: "/app/settings?tab=users", icon: Users, permKey: "canManageUsers" },
        { label: "Settings", href: "/app/settings", icon: Settings },
      ],
    },
  ];

  const standaloneLinks: (NavItem & { permKey?: keyof RolePermissions })[] = [
    { label: "Requests", href: "/app/requests", icon: Inbox, permKey: "canViewRequests" },
    { label: "Help", href: "/app/help", icon: HelpCircle },
  ];

  const toggleGroup = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => location.pathname === href;

  const currentStore = stores.find(s => s.id === currentStoreId);
  const storeName = currentStore?.name || onboarding.storeName || "Stackwise";

  // Filter groups and items based on permissions — hidden, not "access denied"
  const visibleGroups = navGroups
    .filter((g) => !g.permKey || permissions[g.permKey])
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.permKey || permissions[i.permKey]),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <nav data-tour="sidebar" className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-14 items-center gap-2 border-b border-sidebar-border/40 shrink-0", isMinimized ? "justify-center px-2" : "px-5")}>
        <Package className="h-5 w-5 text-sidebar-primary" />
        {!isMinimized && (
          <span className="text-sm font-bold tracking-tight text-sidebar-primary-foreground truncate">{storeName}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {isMinimized ? (
          <div className="space-y-2.5">
            {visibleGroups.flatMap(g => g.items).map((item) => (
              <Link
                key={item.href}
                to={item.href}
                title={item.label}
                onClick={onNavigate}
                className={cn(
                  "flex items-center justify-center rounded-md h-10 w-10 mx-auto transition-all duration-200",
                  isActive(item.href)
                    ? "bg-emerald-950/45 text-emerald-100 border-l-4 border-emerald-500 shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
              </Link>
            ))}
            
            <div className="border-t border-sidebar-border/40 my-3" />
            
            {standaloneLinks
              .filter((item) => !item.permKey || permissions[item.permKey])
              .map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  title={item.label}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center justify-center rounded-md h-10 w-10 mx-auto transition-all duration-200",
                    isActive(item.href)
                      ? "bg-emerald-950/45 text-emerald-100 border-l-4 border-emerald-500 shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                </Link>
              ))}
          </div>
        ) : (
          <>
            {visibleGroups.map((group, idx) => {
              const isCollapsed = collapsed[group.label] ?? false;
              return (
                <div key={group.label} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className="flex w-full items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/45 hover:text-sidebar-foreground/75 transition-colors"
                  >
                    <ChevronRight className={cn("h-3 w-3 transition-transform duration-150", !isCollapsed && "rotate-90")} />
                    {group.label}
                  </button>

                  {!isCollapsed && (
                    <div className="mt-0.5 space-y-0.5">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-3 rounded-md py-2 text-sm transition-all font-semibold",
                            isActive(item.href)
                              ? "bg-emerald-950/45 text-emerald-100 border-l-4 border-emerald-500 pl-2 shadow-sm font-bold animate-in fade-in duration-200"
                              : "text-sidebar-foreground/85 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground pl-3",
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="border-t border-sidebar-border/40 my-3" />
            <div className="space-y-0.5">
              {standaloneLinks
                .filter((item) => !item.permKey || permissions[item.permKey])
                .map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-md py-2 text-sm transition-all font-semibold",
                      isActive(item.href)
                        ? "bg-emerald-950/45 text-emerald-100 border-l-4 border-emerald-500 pl-2 shadow-sm font-bold"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground pl-3",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                ))}
            </div>
          </>
        )}
      </div>

      {onToggleMinimize && (
        <div className="p-2.5 border-t border-sidebar-border/40 shrink-0 bg-sidebar-accent/10">
          <button
            type="button"
            onClick={onToggleMinimize}
            className={cn(
              "flex items-center gap-2 rounded-lg p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200 w-full text-xs font-semibold",
              isMinimized ? "justify-center" : ""
            )}
            title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform duration-300", !isMinimized && "rotate-180")} />
            {!isMinimized && <span>Minimize Sidebar</span>}
          </button>
        </div>
      )}
    </nav>
  );
}
