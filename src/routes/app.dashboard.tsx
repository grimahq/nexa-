import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { Package, CheckCircle2, AlertTriangle, XCircle, ChevronDown, DollarSign, Users, TrendingUp, ShoppingCart, TrendingDown, Receipt, Clock, Store, Plus, Send, ClipboardList, Settings as SettingsIcon, LayoutGrid, Search as SearchIcon, History, User, Sprout, Scissors, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { CategoryDonut, StockStatusDonut } from "@/components/dashboard/StockDonutChart";
import { AgricultureDashboard } from "@/components/dashboard/AgricultureDashboard";
import { PharmacyDashboard } from "@/components/dashboard/PharmacyDashboard";
import { RestaurantDashboard } from "@/components/dashboard/RestaurantDashboard";
import { ManufacturingDashboard } from "@/components/dashboard/ManufacturingDashboard";
import { SocialCommerceDashboard } from "@/components/dashboard/SocialCommerceDashboard";
import { TextileDashboard } from "@/components/dashboard/TextileDashboard";
import { DashboardReorderSection } from "@/components/insights/DashboardReorderSection";
import { DashboardAnomalySection } from "@/components/insights/DashboardAnomalySection";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useStockSummary, useSales, useExpenses, useRefunds, useItems, useMovements, useSuppliers, useAllCompanyItems, useCustomers, useCredits } from "@/hooks/useInventoryData";
import { useUsers } from "@/hooks/useUsers";
import { useAlertGenerator } from "@/hooks/useStockAlertGenerator";
import { useDemo } from "@/hooks/useDemo";
import { useTheme } from "@/contexts/ThemeContext";
import { useRole } from "@/hooks/useRole";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useOnboarding, type TourStep } from "@/hooks/useOnboarding";
import { useStoreType } from "@/hooks/useStoreType";
import { WholesalerDashboardWidget, RetailerDashboardWidget, SupermarketDashboardWidget } from "@/components/dashboard/StoreTypeDashboards";

const NAIRA = "₦";
const USD_TO_NGN = 1;

const TOUR_STEPS: TourStep[] = [
  { title: "Welcome to Stackwise!", description: "Let's take a quick tour of all the key features. This will only take a minute." },
  { target: "sidebar", title: "Navigation", description: "Use the sidebar to switch between sections — sales, catalog, customers, analytics, and more." },
  { target: "metrics", title: "Business overview", description: "Your key metrics at a glance — revenue, profit, expenses, and customer counts." },
  { target: "needs-attention", title: "Alerts & activity", description: "Items that need action appear here — low stock, overdue POs, and pending requests." },
  { target: "search", title: "Quick search", description: "Press CMD+K (or Ctrl+K) to search anything — items, suppliers, orders, and more." },
  { title: "Sales & POS", description: "Head to Sales to ring up orders, apply discounts, accept multiple payment methods, and send receipts via WhatsApp." },
  { title: "Customers", description: "The Customers page shows purchase history, debt tracking, and lets you message customers directly via WhatsApp." },
  { title: "Settings", description: "Admins can configure store branding, smart features, staff roles, and launch this tour again from Settings > Help." },
  { title: "You're all set!", description: "Explore freely! You can restart this tour anytime from Settings > Help." },
];

interface AccordionSectionProps {
  id: string;
  title: string;
  openSection: string | null;
  onToggle: (id: string) => void;
  children: React.ReactNode;
  dataTour?: string;
}

function AccordionSection({ id, title, openSection, onToggle, children, dataTour }: AccordionSectionProps) {
  const isOpen = openSection === id;
  return (
    <div data-tour={dataTour} className="rounded-xl border border-border bg-card shadow-xs overflow-hidden md:shadow-sm">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50 md:cursor-default md:hover:bg-transparent"
      >
        <h2 className="text-sm font-semibold text-foreground md:text-base md:font-bold">{title}</h2>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200 md:hidden", isOpen && "rotate-180")} />
      </button>
      <div className={cn("transition-all duration-200 ease-in-out md:max-h-none md:opacity-100 md:block", isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden md:max-h-none md:opacity-100")}>
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — Stackwise" }] }),
});

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const { data: summary } = useStockSummary();
  const { isDemo, onboarding: demoOnboarding } = useDemo();
  const { settings: liveSettings } = useSystemSettings();
  const { storeType, isWholesaler, isRetailer, isSupermarket } = useStoreType();
  const { isAdmin, isManager, role, stores, currentStoreId, members, setCurrentStoreId } = useRole();
  useAlertGenerator();

  const onboarding = isDemo ? demoOnboarding : liveSettings;

  const { data: items, isLoading: itemsLoading } = useItems();
  const { data: movements, isLoading: movementsLoading } = useMovements();
  const { data: suppliers, isLoading: suppliersLoading } = useSuppliers();
  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: expenses, isLoading: expensesLoading } = useExpenses();
  const { data: refunds, isLoading: refundsLoading } = useRefunds();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: allCompanyItems, isLoading: allCompanyItemsLoading } = useAllCompanyItems();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: creditsList = [], isLoading: creditsLoading } = useCredits();

  const isLoading = itemsLoading || movementsLoading || suppliersLoading || salesLoading || expensesLoading || refundsLoading || usersLoading || allCompanyItemsLoading || customersLoading || creditsLoading;

  const currentStore = stores.find(s => s.id === currentStoreId);

  // Multi-branch valuation math
  const getStoreIdForItem = (item: { id: string }, storesList: { id: string }[]) => {
    if (storesList.length === 0) return "";
    let hash = 0;
    for (let i = 0; i < item.id.length; i++) {
      hash = item.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % storesList.length;
    return storesList[index].id;
  };

  const valuationByStore = useMemo(() => {
    const storeMap: Record<string, {
      costValue: number;
      retailValue: number;
      uniqueSkus: number;
      totalStock: number;
    }> = {};

    // Initialize all stores
    stores.forEach(store => {
      storeMap[store.id] = {
        costValue: 0,
        retailValue: 0,
        uniqueSkus: 0,
        totalStock: 0
      };
    });

    // Populate data
    allCompanyItems.forEach(item => {
      const sId = isDemo ? getStoreIdForItem(item, stores) : item.storeId || currentStoreId;
      
      if (storeMap[sId]) {
        const qty = item.currentStock || 0;
        storeMap[sId].costValue += qty * (item.costPrice || 0);
        storeMap[sId].retailValue += qty * (item.sellingPrice || 0);
        storeMap[sId].uniqueSkus += 1;
        storeMap[sId].totalStock += qty;
      }
    });

    return storeMap;
  }, [allCompanyItems, stores, isDemo, currentStoreId]);

  // Aggregate stats
  const brandValuation = useMemo(() => {
    let totalCost = 0;
    let totalRetail = 0;
    let totalSkus = 0;
    let totalStock = 0;

    Object.values(valuationByStore).forEach(v => {
      totalCost += v.costValue;
      totalRetail += v.retailValue;
      totalSkus += v.uniqueSkus;
      totalStock += v.totalStock;
    });

    return {
      totalCost,
      totalRetail,
      totalSkus,
      totalStock,
      potentialMargin: totalRetail - totalCost
    };
  }, [valuationByStore]);

  const activeStoreValuation = valuationByStore[currentStoreId] || {
    costValue: 0,
    retailValue: 0,
    uniqueSkus: 0,
    totalStock: 0
  };

  const tour = useOnboarding("dashboard");
  const { startTour } = tour;
  const [openSection, setOpenSection] = useState<string | null>("metrics");

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    // Check if we need to redirect due to onboarding entry selection (Scan or Excel)
    const triggerScanner = sessionStorage.getItem("nexa_open_scanner_after_onboarding") === "true";
    const triggerImport = sessionStorage.getItem("nexa_open_import_after_onboarding") === "true";
    if (triggerScanner || triggerImport) {
      navigate({ to: "/app/catalog", replace: true });
      return;
    }
    
    // Start tour if newly onboarded, explicitly triggered via settings, or never completed before
    if (tour.isActive) return;

    const justOnboarded = sessionStorage.getItem("stackwise-just-onboarded") === "true";
    const settingsTrigger = sessionStorage.getItem("stackwise-trigger-tour") === "true";
    const neverCompleted = !tour.hasCompleted;
    
    if (justOnboarded || settingsTrigger || neverCompleted) {
      sessionStorage.removeItem("stackwise-just-onboarded");
      sessionStorage.removeItem("stackwise-trigger-tour");
      const timer = setTimeout(() => startTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, [startTour, navigate, location.pathname, tour.hasCompleted, tour.isActive]);

  // Synchronize active tour target element and open the appropriate Accordion section
  useEffect(() => {
    if (!tour.isActive) return;
    const step = TOUR_STEPS[tour.currentStep];
    if (step?.target === "needs-attention") {
      setOpenSection("attention");
    } else if (step?.target === "metrics") {
      setOpenSection("metrics");
    }
  }, [tour.currentStep, tour.isActive]);

  const handleTourComplete = () => {
    tour.completeTour();
    toast.success("Tour complete! Explore freely or start the walkthrough.");
  };

  // Sales metrics
  const totalRevenue = sales.reduce((s, sale) => s + sale.totalNgn, 0);
  const todaySales = sales.filter((s) => {
    const d = new Date(s.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const todayRevenue = todaySales.reduce((s, sale) => s + sale.totalNgn, 0);
  const uniqueCustomers = new Set(sales.filter((s) => s.customerPhone).map((s) => s.customerPhone)).size;
  const totalOutstandingDebt = creditsList.reduce((s, c) => s + (c.balanceNgn || 0), 0);

  // Expense & refund metrics
  const allExpenses = expenses;
  const allRefunds = refunds;
  const totalExpenses = allExpenses.reduce((s, e) => s + e.amount, 0);
  const totalRefunds = allRefunds.reduce((s, r) => s + r.amountNgn, 0);
  const netProfit = totalRevenue - totalExpenses - totalRefunds;
  const todayExpenses = allExpenses.filter((e) => new Date(e.date).toDateString() === new Date().toDateString()).reduce((s, e) => s + e.amount, 0);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const storeName = currentStore?.name || onboarding?.storeName || (onboarding?.businessType
    ? onboarding.businessType.charAt(0).toUpperCase() + onboarding.businessType.slice(1) + " Store"
    : "NEXA StoreOS");

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center font-mono text-sm text-muted-foreground animate-pulse">Initializing dashboard...</div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Store className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">{storeName}</h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {roleLabel} Dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5 justify-end">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {currentTime.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentTime.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/app/settings" })} className="h-9">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Store Settings
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg border border-border bg-background shadow-xs hover:bg-muted transition-all"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? (
              <Moon className="h-4.5 w-4.5 text-slate-700 dark:text-slate-300" />
            ) : (
              <Sun className="h-4.5 w-4.5 text-amber-500 animate-[spin_20s_linear_infinite]" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 bg-background rounded-full px-3 py-1 text-xs border border-border shadow-xs">
          <Package className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold">{summary.total} Items</span>
        </div>
        <div className="flex items-center gap-1.5 bg-background rounded-full px-3 py-1 text-xs border border-border shadow-xs">
          <Users className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-semibold">{members.length} Members</span>
        </div>
        {onboarding?.categories && onboarding.categories.length > 0 && onboarding.categories.map((cat) => (
          <span key={cat} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary capitalize border border-primary/20">
            {cat.replace(/-/g, " ")}
          </span>
        ))}
      </div>

      {/* Customized Store Type Dashboard Widget */}
      <div className="space-y-4">
        {isWholesaler && (
          <WholesalerDashboardWidget sales={sales} items={items} customers={customers} creditsList={creditsList} />
        )}
        {isRetailer && (
          <RetailerDashboardWidget sales={sales} items={items} customers={customers} creditsList={creditsList} />
        )}
        {isSupermarket && (
          <SupermarketDashboardWidget sales={sales} items={items} customers={customers} creditsList={creditsList} />
        )}
      </div>

      {/* Domain-Specific Visualizations (Primary) */}
      <div className="space-y-4">
        {onboarding?.businessType === "agriculture" && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-1">
            <div className="bg-background rounded-[calc(1rem-1px)] p-4 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Sprout className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-bold tracking-tight">Agricultural Command Center</h2>
              </div>
              <AgricultureDashboard />
            </div>
          </div>
        )}

        {onboarding?.businessType === "pharmacy" && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-1">
            <div className="bg-background rounded-[calc(1rem-1px)] p-4 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold tracking-tight">Pharmacy Operations</h2>
              </div>
              <PharmacyDashboard />
            </div>
          </div>
        )}

        {onboarding?.businessType === "restaurant" && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-1">
            <div className="bg-background rounded-[calc(1rem-1px)] p-4 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <History className="h-5 w-5 text-orange-600" />
                <h2 className="text-lg font-bold tracking-tight">Kitchen & Dining Overview</h2>
              </div>
              <RestaurantDashboard />
            </div>
          </div>
        )}

        {onboarding?.businessType === "manufacturing" && (
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-1">
            <div className="bg-background rounded-[calc(1rem-1px)] p-4 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <LayoutGrid className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-bold tracking-tight">Production Floor</h2>
              </div>
              <ManufacturingDashboard />
            </div>
          </div>
        )}

        {onboarding?.businessType === "social_commerce" && (
          <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-1">
            <div className="bg-background rounded-[calc(1rem-1px)] p-4 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                   <Globe className="h-5 w-5 text-fuchsia-600" />
                   <h2 className="text-lg font-bold tracking-tight">Online Presence</h2>
                </div>
                <Button size="sm" variant="outline" asChild>
                   <a href="/app/ecommerce">Manage Catalog</a>
                </Button>
              </div>
              <SocialCommerceDashboard />
            </div>
          </div>
        )}

        {onboarding?.businessType === "textile" && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-1">
            <div className="bg-background rounded-[calc(1rem-1px)] p-4 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Scissors className="h-5 w-5 text-rose-600" />
                <h2 className="text-lg font-bold tracking-tight">Textile Inventory & Fabrics</h2>
              </div>
              <TextileDashboard />
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions (Tertiary) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {isAdmin && (
          <>
            <Button variant="outline" className="flex-col h-auto py-4 gap-2 bg-background hover:bg-primary/5 hover:border-primary/50 transition-all shadow-xs" onClick={() => navigate({ to: "/app/catalog" })}>
              <div className="p-2 rounded-lg bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs font-bold">Add Product</span>
            </Button>
            <Button variant="outline" className="flex-col h-auto py-4 gap-2 bg-background hover:bg-blue-50 hover:border-blue-200 transition-all shadow-xs" onClick={() => navigate({ to: "/app/purchase-orders" })}>
              <div className="p-2 rounded-lg bg-blue-100">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs font-bold">New PO</span>
            </Button>
            <Button variant="outline" className="flex-col h-auto py-4 gap-2 bg-background hover:bg-purple-50 hover:border-purple-200 transition-all shadow-xs" onClick={() => navigate({ to: "/app/analytics" })}>
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-xs font-bold">Analytics</span>
            </Button>
            <Button variant="outline" className="flex-col h-auto py-4 gap-2 bg-background hover:bg-green-50 hover:border-green-200 transition-all shadow-xs" onClick={() => navigate({ to: "/app/sales" })}>
              <div className="p-2 rounded-lg bg-green-100">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs font-bold">New Sale</span>
            </Button>
          </>
        )}
        {/* ... (repeat similar patterns for other roles if needed, but keeping it concise for now) */}
      </div>

      {/* ─── Collapsible Sections for Details ─── */}
      <div className="space-y-3">
      {isAdmin && (
        <>
          <AccordionSection id="metrics" title="Business Overview" openSection={openSection} onToggle={toggleSection} dataTour="metrics">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button type="button" onClick={() => navigate({ to: "/app/sales-analytics" })} className="text-left group"><MetricCard label="Total Revenue" value={`${NAIRA}${totalRevenue.toLocaleString("en-NG")}`} accentColor="healthy" icon={DollarSign} /></button>
              <button type="button" onClick={() => navigate({ to: "/app/sales-analytics" })} className="text-left group"><MetricCard label="Net Profit" value={`${NAIRA}${netProfit.toLocaleString("en-NG")}`} accentColor={netProfit >= 0 ? "healthy" : "danger"} icon={netProfit >= 0 ? TrendingUp : TrendingDown} /></button>
              <button type="button" onClick={() => navigate({ to: "/app/expenses" })} className="text-left group"><MetricCard label="Expenses" value={`${NAIRA}${totalExpenses.toLocaleString("en-NG")}`} accentColor="warning" icon={Receipt} /></button>
              <button type="button" onClick={() => navigate({ to: "/app/customers" })} className="text-left group"><MetricCard label="Outstanding Debt" value={`${NAIRA}${totalOutstandingDebt.toLocaleString("en-NG")}`} accentColor="danger" icon={AlertTriangle} /></button>
            </div>
          </AccordionSection>

          <AccordionSection id="valuation" title="Net Assets & Multi-Branch Valuation" openSection={openSection} onToggle={toggleSection}>
            <div className="space-y-6">
              {/* Brand Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 pl-4 shadow-sm">
                  <div className="absolute left-2 top-2 bottom-2 w-[3px] rounded-full bg-primary" />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Brand Net Assets (Cost)</p>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-sans text-xl font-extrabold text-foreground">
                      {NAIRA}{brandValuation.totalCost.toLocaleString("en-NG")}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Total cost across all branches</p>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 pl-4 shadow-sm">
                  <div className="absolute left-2 top-2 bottom-2 w-[3px] rounded-full bg-green-500" />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Brand Market Value (Retail)</p>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-sans text-xl font-extrabold text-foreground">
                      {NAIRA}{brandValuation.totalRetail.toLocaleString("en-NG")}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Total selling price across all branches</p>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 pl-4 shadow-sm">
                  <div className="absolute left-2 top-2 bottom-2 w-[3px] rounded-full bg-blue-500" />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Store Valuation</p>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-sans text-xl font-extrabold text-foreground">
                      {NAIRA}{activeStoreValuation.costValue.toLocaleString("en-NG")}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">Cost</span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Current store/branch selection assets</p>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 pl-4 shadow-sm">
                  <div className="absolute left-2 top-2 bottom-2 w-[3px] rounded-full bg-purple-500" />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Est. Portfolio Profit Margin</p>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-sans text-xl font-extrabold text-green-600 dark:text-green-400">
                      {NAIRA}{brandValuation.potentialMargin.toLocaleString("en-NG")}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Potential margin at current retail price</p>
                </div>
              </div>

              {/* Branch Wise Table / Cards */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/20">
                  <h3 className="text-sm font-bold text-foreground">Branch Inventory Valuations & Asset Breakdown</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Real-time asset valuation of all registered locations & retail outlets.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="px-6 py-3">Branch/Store Name</th>
                        <th className="px-6 py-3 text-center">Unique SKUs</th>
                        <th className="px-6 py-3 text-center">Total Stock Pieces</th>
                        <th className="px-6 py-3 text-right">Inventory Cost (Net Assets)</th>
                        <th className="px-6 py-3 text-right">Potential Revenue (Retail)</th>
                        <th className="px-6 py-3 text-right">Expected Margin</th>
                        <th className="px-6 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {stores.map(store => {
                        const val = valuationByStore[store.id] || {
                          costValue: 0,
                          retailValue: 0,
                          uniqueSkus: 0,
                          totalStock: 0
                        };
                        const margin = val.retailValue - val.costValue;
                        const isActive = currentStoreId === store.id;

                        return (
                          <tr key={store.id} className={cn("text-sm hover:bg-muted/30 transition-colors", isActive && "bg-primary/5")}>
                            <td className="px-6 py-4 font-semibold text-foreground">
                              <div className="flex items-center gap-2">
                                <Store className="h-4 w-4 text-primary flex-shrink-0" />
                                {store.name}
                                {isActive && <Badge variant="secondary" className="ml-2 text-[10px] bg-primary/10 text-primary hover:bg-primary/10 border-primary/20">Active Context</Badge>}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-xs">{val.uniqueSkus}</td>
                            <td className="px-6 py-4 text-center font-mono text-xs">{val.totalStock.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right font-semibold font-mono text-xs text-foreground">
                              {NAIRA}{val.costValue.toLocaleString("en-NG")}
                            </td>
                            <td className="px-6 py-4 text-right font-semibold font-mono text-xs text-muted-foreground">
                              {NAIRA}{val.retailValue.toLocaleString("en-NG")}
                            </td>
                            <td className="px-6 py-4 text-right font-bold font-mono text-xs text-green-600 dark:text-green-400">
                              {NAIRA}{margin.toLocaleString("en-NG")}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {isActive ? (
                                <span className="text-xs text-muted-foreground font-semibold px-2.5 py-1 rounded bg-muted">Active</span>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 px-2 text-xs font-bold" 
                                  onClick={() => setCurrentStoreId(store.id)}
                                >
                                  Switch Context
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection id="attention" title="Alerts & Real-time Activity" openSection={openSection} onToggle={toggleSection} dataTour="needs-attention">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
              <div className="min-h-0"><NeedsAttention /></div>
              <div className="min-h-0"><RecentActivity /></div>
            </div>
          </AccordionSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AccordionSection id="charts" title="Stock Distribution" openSection={openSection} onToggle={toggleSection}>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <StockStatusDonut />
                <CategoryDonut />
              </div>
            </AccordionSection>

            <AccordionSection id="stock" title="Inventory Health Summary" openSection={openSection} onToggle={toggleSection}>
              <div className="grid grid-cols-2 gap-2">
                <MetricCard label="Total SKUs" value={summary.total} accentColor="neutral" icon={Package} />
                <MetricCard label="In stock" value={summary.inStock} accentColor="healthy" icon={CheckCircle2} />
                <MetricCard label="Low stock" value={summary.lowStock} accentColor="warning" icon={AlertTriangle} />
                <MetricCard label="Out of stock" value={summary.outOfStock} accentColor="danger" icon={XCircle} />
              </div>
            </AccordionSection>
          </div>

          <AccordionSection id="anomalies" title="Intelligent Insights (Anomaly Detection)" openSection={openSection} onToggle={toggleSection}>
            <DashboardAnomalySection movements={movements} items={items} />
          </AccordionSection>

          <AccordionSection id="reorder" title="Operations: Reorder Suggestions" openSection={openSection} onToggle={toggleSection}>
            <DashboardReorderSection items={items} movements={movements} suppliers={suppliers} />
          </AccordionSection>

          <AccordionSection id="members" title={`Store Administration & Members (${members.length})`} openSection={openSection} onToggle={toggleSection}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-none mb-1">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        {member.id === "u1" || member.id === "u4" || member.id === "u6" ? "Owner" : member.role}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest bg-background">Active</Badge>
                </div>
              ))}
              <div className="sm:col-span-2 lg:col-span-3">
                <Button variant="ghost" size="sm" className="w-full text-xs hover:bg-muted font-semibold" onClick={() => navigate({ to: "/app/settings" })}>
                  Manage all users in Settings
                </Button>
              </div>
            </div>
          </AccordionSection>
        </>
      )}

      {/* ─── Manager Dashboard ─── */}
      {isManager && (
        <>
          <AccordionSection id="metrics" title="Today's Performance" openSection={openSection} onToggle={toggleSection} dataTour="metrics">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button type="button" onClick={() => navigate({ to: "/app/sales-analytics" })} className="text-left"><MetricCard label="Today's Revenue" value={`${NAIRA}${todayRevenue.toLocaleString("en-NG")}`} accentColor="healthy" icon={DollarSign} /></button>
              <button type="button" onClick={() => navigate({ to: "/app/sales-history" })} className="text-left"><MetricCard label="Today's Orders" value={todaySales.length} accentColor="neutral" icon={ShoppingCart} /></button>
              <button type="button" onClick={() => navigate({ to: "/app/expenses" })} className="text-left"><MetricCard label="Today's Expenses" value={`${NAIRA}${todayExpenses.toLocaleString("en-NG")}`} accentColor="warning" icon={Receipt} /></button>
              <button type="button" onClick={() => navigate({ to: "/app/sales-analytics" })} className="text-left"><MetricCard label="Net Today" value={`${NAIRA}${(todayRevenue - todayExpenses).toLocaleString("en-NG")}`} accentColor={todayRevenue - todayExpenses >= 0 ? "healthy" : "danger"} icon={todayRevenue - todayExpenses >= 0 ? TrendingUp : TrendingDown} /></button>
            </div>
          </AccordionSection>

          <AccordionSection id="charts" title="Inventory Overview" openSection={openSection} onToggle={toggleSection}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <StockStatusDonut />
              <CategoryDonut />
            </div>
          </AccordionSection>

          <AccordionSection id="attention" title="Needs Attention" openSection={openSection} onToggle={toggleSection} dataTour="needs-attention">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
              <div className="min-h-0"><NeedsAttention /></div>
              <div className="min-h-0"><RecentActivity /></div>
            </div>
          </AccordionSection>

          <AccordionSection id="reorder" title="Reorder Suggestions" openSection={openSection} onToggle={toggleSection}>
            <DashboardReorderSection items={items} movements={movements} suppliers={suppliers} />
          </AccordionSection>
        </>
      )}

      {/* ─── Requestor fallback ─── */}
      {!isAdmin && !isManager && (
        <>
          <AccordionSection id="metrics" title="Stock Overview" openSection={openSection} onToggle={toggleSection} dataTour="metrics">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total SKUs" value={summary.total} accentColor="neutral" icon={Package} />
              <MetricCard label="In stock" value={summary.inStock} accentColor="healthy" icon={CheckCircle2} />
              <MetricCard label="Low stock" value={summary.lowStock} accentColor="warning" icon={AlertTriangle} />
              <MetricCard label="Out of stock" value={summary.outOfStock} accentColor="danger" icon={XCircle} />
            </div>
          </AccordionSection>
        </>
      )}
      </div>

      <OnboardingTour
        steps={TOUR_STEPS}
        currentStep={tour.currentStep}
        isActive={tour.isActive}
        onNext={tour.next}
        onBack={tour.back}
        onSkip={tour.skipTour}
        onComplete={handleTourComplete}
      />
    </div>
  );
}
