import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, ShoppingCart, Package, ArrowLeftRight, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useRole } from "@/hooks/useRole";
import type { RolePermissions } from "@/lib/roles";

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permKey?: keyof RolePermissions;
}

const NAV_ITEMS: BottomNavItem[] = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { label: "Sales", href: "/app/sales", icon: ShoppingCart, permKey: "canSell" },
  { label: "Catalog", href: "/app/catalog", icon: Package, permKey: "canManageItems" },
  { label: "Movements", href: "/app/movements", icon: ArrowLeftRight, permKey: "canLogMovements" },
];

export function BottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { permissions, isSuperAdmin } = useRole();

  const isActive = (href: string) => location.pathname === href;

  const visibleItems = NAV_ITEMS.filter((item) => !item.permKey || permissions[item.permKey]);

  if (isSuperAdmin) {
    return null;
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-stretch border-t border-border bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:hidden">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors min-h-[44px]",
              isActive(item.href) ? "text-primary font-semibold" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground min-h-[44px]"
        >
          <MoreHorizontal className="h-5 w-5" />
          More
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[70vh] p-0">
          <SheetTitle className="sr-only">More navigation</SheetTitle>
          <Sidebar onNavigate={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
