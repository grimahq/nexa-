import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search, User, Phone, ShoppingBag, MessageCircle, Send,
  TrendingUp, AlertTriangle, Clock, Filter, CheckSquare, X, Sparkles
} from "lucide-react";
import { useDemo } from "@/hooks/useDemo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { useSales, useCredits } from "@/hooks/useInventoryData";
import { useInventoryMutation } from "@/hooks/useInventoryMutation";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { SalesReceipt } from "@/components/sales/SalesReceipt";
import type { SaleTransaction } from "@/types/inventory";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const NAIRA = "₦";

export const Route = createFileRoute("/app/customers")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Customers — Stackwise" }] }),
});

interface CustomerRecord {
  name: string;
  phone: string;
  totalSpent: number;
  transactionCount: number;
  lastPurchase: string;
  debtBalance: number;
}

type CustomerTab = "all" | "frequent" | "high-spenders" | "debtors" | "inactive" | "cohorts";

const MESSAGE_TEMPLATES = [
  { id: "receipt", label: "Receipt / Thank You", text: "Hi {name}, thank you for shopping with us! Your total was {amount}. We appreciate your business. 🙏" },
  { id: "followup", label: "Follow-Up", text: "Hi {name}, hope you're enjoying your recent purchase! We have new arrivals you might like. Visit us today! 🛍️" },
  { id: "debt", label: "Debt Reminder", text: "Hi {name}, this is a friendly reminder that you have an outstanding balance of {debt}. Kindly settle at your earliest convenience. Thank you! 🙏" },
  { id: "promo", label: "Promotion", text: "Hi {name}, we have a special offer just for you! Use code WELCOME10 for 10% off your next purchase. Don't miss out! 🎉" },
];

function CustomersPage() {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const { addCreditTransaction } = useInventoryMutation();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<CustomerTab>("all");
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageTarget, setMessageTarget] = useState<CustomerRecord | null>(null);

  // Debt Payment States
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<CustomerRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("Recorded debt payment");

  // Fix the missing paymentReceiptSale state bug
  const [paymentReceiptSale, setPaymentReceiptSale] = useState<SaleTransaction | null>(null);

  const { flags } = useFeatureFlags();
  const currentTier = flags.planId || "starter";

  const smartCohortsEnabled = useMemo(() => {
    if (currentTier !== "enterprise") return false;
    try {
      const saved = localStorage.getItem("nexa_smart_features");
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!parsed.smartCohorts;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }, [currentTier]);

  const getCustomerCohort = (c: CustomerRecord) => {
    const days = Math.floor((Date.now() - new Date(c.lastPurchase).getTime()) / 86400000);
    if (c.totalSpent > 100000 && c.transactionCount >= 5) {
      return { label: "Champions (VIP)", style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
    }
    if (c.totalSpent > 30000 && c.transactionCount >= 3 && days <= 15) {
      return { label: "Loyalists", style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
    }
    if (days > 30 && c.totalSpent > 10000) {
      return { label: "At-Risk (Churn Alert)", style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
    }
    return { label: "Sleeping / Casual", style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" };
  };

  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: creditsList, isLoading: creditsLoading } = useCredits();
  const isLoading = salesLoading || creditsLoading;

  const thirtyDaysAgo = useMemo(() => new Date(Date.now() - 30 * 86400000).toISOString(), []);

  const customers = useMemo(() => {
    const debtMap = new Map<string, number>();
    const credits = isDemo && demoStore ? demoStore.getCreditCustomers() : (creditsList ?? []);
    for (const cc of credits) {
      if (cc.balanceNgn > 0) {
        debtMap.set(cc.customerPhone, cc.balanceNgn);
      }
    }

    const map = new Map<string, CustomerRecord>();
    for (const sale of sales) {
      const phone = sale.customerPhone?.trim();
      if (!phone) continue;
      const existing = map.get(phone);
      if (existing) {
        existing.totalSpent += sale.totalNgn;
        existing.transactionCount++;
        if (sale.createdAt > existing.lastPurchase) {
          existing.lastPurchase = sale.createdAt;
          if (sale.customerName) existing.name = sale.customerName;
        }
      } else {
        map.set(phone, {
          name: sale.customerName || "Unknown",
          phone,
          totalSpent: sale.totalNgn,
          transactionCount: 1,
          lastPurchase: sale.createdAt,
          debtBalance: 0,
        });
      }
    }
    
    // Also include credit customers who might not have had recent sales but have debts
    for (const cc of credits) {
      if (cc.balanceNgn > 0) {
        const phone = cc.customerPhone.trim();
        const existing = map.get(phone);
        if (existing) {
          existing.debtBalance = cc.balanceNgn;
        } else {
          map.set(phone, {
            name: cc.customerName,
            phone,
            totalSpent: 0,
            transactionCount: 0,
            lastPurchase: cc.updatedAt || new Date().toISOString(),
            debtBalance: cc.balanceNgn
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [sales, isDemo, demoStore, creditsList]);

  const filtered = useMemo(() => {
    let list = customers;
    if (tab === "frequent") list = list.filter((c) => c.transactionCount >= 3);
    if (tab === "high-spenders") list = list.filter((c) => c.totalSpent >= 50_000);
    if (tab === "debtors") list = list.filter((c) => c.debtBalance > 0);
    if (tab === "inactive") list = list.filter((c) => c.lastPurchase < thirtyDaysAgo);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }
    return list;
  }, [customers, tab, search, thirtyDaysAgo]);

  const stats = useMemo(() => ({
    total: customers.length,
    frequent: customers.filter((c) => c.transactionCount >= 3).length,
    debtors: customers.filter((c) => c.debtBalance > 0).length,
    totalDebt: customers.reduce((s, c) => s + c.debtBalance, 0),
  }), [customers]);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center font-mono text-sm text-muted-foreground animate-pulse">Loading customers...</div>;
  }

  const toggleSelect = (phone: string) => {
    setSelectedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const openWhatsApp = (phone: string, text: string) => {
    const url = getWhatsAppUrl(phone, text);
    window.open(url, "_blank");
  };

  const handleSendMessage = (customer: CustomerRecord) => {
    setMessageTarget(customer);
    const tpl = MESSAGE_TEMPLATES[0];
    setMessageText(tpl.text.replace("{name}", customer.name).replace("{amount}", `${NAIRA}${customer.totalSpent.toLocaleString("en-NG")}`).replace("{debt}", `${NAIRA}${customer.debtBalance.toLocaleString("en-NG")}`));
    setMessageOpen(true);
  };

  const handleBulkMessage = () => {
    if (selectedCustomers.size === 0) { toast.error("Select customers first"); return; }
    setMessageTarget(null);
    setMessageText(MESSAGE_TEMPLATES[1].text);
    setMessageOpen(true);
  };

  const handleSendWhatsApp = () => {
    if (messageTarget) {
      openWhatsApp(messageTarget.phone, messageText);
    } else {
      const targets = customers.filter((c) => selectedCustomers.has(c.phone));
      for (const c of targets) {
        const text = messageText.replace("{name}", c.name).replace("{amount}", `${NAIRA}${c.totalSpent.toLocaleString("en-NG")}`).replace("{debt}", `${NAIRA}${c.debtBalance.toLocaleString("en-NG")}`);
        openWhatsApp(c.phone, text);
      }
    }
    setMessageOpen(false);
    toast.success("WhatsApp opened — send manually");
  };

  const handlePayDebtClick = (customer: CustomerRecord) => {
    setPaymentTarget(customer);
    setPaymentAmount(customer.debtBalance.toString());
    setPaymentNotes(`Settled outstanding debt balance of ${NAIRA}${customer.debtBalance.toLocaleString("en-NG")}`);
    setPaymentOpen(true);
  };

  const handleRecordPaymentSubmit = async () => {
    if (!paymentTarget) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid positive payment amount");
      return;
    }

    try {
      await addCreditTransaction(paymentTarget.phone, paymentTarget.name, {
        id: `ctxn-${Date.now()}`,
        type: "payment",
        amountNgn: amount,
        notes: paymentNotes,
        createdAt: new Date().toISOString()
      });

      if (isDemo && demoStore && bumpVersion) {
        // Dispatch in-app advanced push notification for the payment
        const notifId = `notif-${Date.now()}`;
        demoStore.addNotification({
          id: notifId,
          type: "request_update",
          title: `💳 Debt Payment Recorded: ${paymentTarget.name}`,
          message: `Direct cash settlement of ${NAIRA}${amount.toLocaleString("en-NG")} was successfully processed for +${paymentTarget.phone}.`,
          isRead: false,
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      // Generate settlement receipt
      const debtReceiptSale: SaleTransaction = {
        id: `repay-${Date.now()}`,
        customerName: paymentTarget.name,
        customerPhone: paymentTarget.phone,
        items: [
          {
            itemId: "debt-repayment",
            itemName: "Debt Settlement / Payment",
            sku: "DEBT-PAY",
            quantity: 1,
            unit: "payment",
            multiplier: 1,
            unitPriceNgn: amount
          }
        ],
        totalNgn: amount,
        isDebtSettlement: true,
        createdAt: new Date().toISOString()
      };

      setPaymentReceiptSale(debtReceiptSale);
      setPaymentOpen(false);
      toast.success(`Successfully processed debt payment of ${NAIRA}${amount.toLocaleString("en-NG")}!`);
    } catch (err) {
      toast.error("Failed to process payment");
    }
  };

  const daysSince = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d === 0) return "Today";
    if (d === 1) return "Yesterday";
    return `${d}d ago`;
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">Manage your customer directory and send messages</p>
        </div>
        {selectedCustomers.size > 0 && (
          <Button onClick={handleBulkMessage} className="gap-2">
            <Send className="h-4 w-4" />
            Message {selectedCustomers.size} selected
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Customers</p>
          <p className="text-xl font-bold font-mono">{stats.total}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Frequent Buyers</p>
          <p className="text-xl font-bold font-mono text-primary">{stats.frequent}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Debtors</p>
          <p className="text-xl font-bold font-mono text-destructive">{stats.debtors}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Debt</p>
          <p className="text-xl font-bold font-mono text-destructive">{NAIRA}{stats.totalDebt.toLocaleString("en-NG")}</p>
        </Card>
      </div>

      {/* Tabs and search */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as CustomerTab)}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid grid-cols-3 sm:flex sm:w-auto sm:flex-wrap gap-1">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="frequent" className="text-xs">Frequent</TabsTrigger>
            <TabsTrigger value="high-spenders" className="text-xs">Top</TabsTrigger>
            <TabsTrigger value="debtors" className="text-xs">Debtors</TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs">Inactive</TabsTrigger>
            <TabsTrigger value="cohorts" className="text-xs flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400">
              <Sparkles className="h-3 w-3" /> Cohorts
            </TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone…" className="pl-9" />
          </div>
        </div>

        <TabsContent value={tab} className="mt-3">
          {filtered.length === 0 ? (
            <EmptyState icon={User} title="No customers found" description="Complete sales with customer phone numbers to build your directory." />
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <div
                  key={c.phone}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/30"
                >
                  <button type="button" onClick={() => toggleSelect(c.phone)} className="shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${selectedCustomers.has(c.phone) ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                      {selectedCustomers.has(c.phone) ? <CheckSquare className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {smartCohortsEnabled && (
                        <Badge variant="outline" className={`text-[8px] uppercase tracking-wider font-semibold py-0 h-3.5 px-1 ${getCustomerCohort(c).style}`}>
                          {getCustomerCohort(c).label.split(" ")[0]}
                        </Badge>
                      )}
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />{c.phone}
                    </p>
                  </div>

                  <div className="hidden sm:flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ShoppingBag className="h-3 w-3" />{c.transactionCount} sales
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />{daysSince(c.lastPurchase)}
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end justify-center">
                    <p className="text-sm font-semibold font-mono">{NAIRA}{c.totalSpent.toLocaleString("en-NG")}</p>
                    {c.debtBalance > 0 && (
                      <div className="flex flex-col items-end gap-1 mt-0.5">
                        <p className="text-xs text-destructive font-bold font-mono">Owes {NAIRA}{c.debtBalance.toLocaleString("en-NG")}</p>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePayDebtClick(c);
                          }}
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2 font-bold bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/25 transition-all"
                        >
                          Settle Debt
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button variant="ghost" size="icon" onClick={() => handleSendMessage(c)} className="shrink-0 h-9 w-9 text-primary">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cohorts" className="mt-3 space-y-4">
          {!smartCohortsEnabled ? (
            <div className="relative overflow-hidden rounded-xl border border-purple-500/10 bg-purple-500/[0.01] dark:bg-purple-950/[0.04] p-8 text-center shadow-xs">
              <div className="max-w-md mx-auto space-y-4 py-4">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 mx-auto border border-purple-500/20">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground">AI Predictive Customer Cohorts Gated</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {flags.planId !== "enterprise" 
                      ? "Enterprise-tier K-Means clustering and Recency-Frequency-Monetary (RFM) modeling segment your directory into loyalty retention clusters."
                      : "Activate 'Predictive Customer Cohorts' in your Smart Features console to cluster customers dynamically into actionable loyalty cohorts."}
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <Button size="sm" asChild className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs">
                    <Link to="/app/settings">
                      {flags.planId !== "enterprise" ? "Upgrade License" : "Enable Smart Feature"}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cohort Stats Summary */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card className="bg-purple-500/[0.02] border-purple-500/10 p-3.5 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">🏆 Champions</p>
                  <p className="text-2xl font-bold font-mono text-purple-600">
                    {customers.filter(c => getCustomerCohort(c).label.startsWith("Champions")).length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">High spend, high frequency</p>
                </Card>
                <Card className="bg-emerald-500/[0.02] border-emerald-500/10 p-3.5 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">⭐ Loyalists</p>
                  <p className="text-2xl font-bold font-mono text-emerald-600">
                    {customers.filter(c => getCustomerCohort(c).label.startsWith("Loyalists")).length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Consistent recency & sales</p>
                </Card>
                <Card className="bg-amber-500/[0.02] border-amber-500/10 p-3.5 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">⚠️ At-Risk</p>
                  <p className="text-2xl font-bold font-mono text-amber-600">
                    {customers.filter(c => getCustomerCohort(c).label.startsWith("At-Risk")).length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">High value, inactive &gt;30d</p>
                </Card>
                <Card className="bg-slate-500/[0.02] border-slate-500/10 p-3.5 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">💤 Sleeping</p>
                  <p className="text-2xl font-bold font-mono text-slate-600">
                    {customers.filter(c => getCustomerCohort(c).label.startsWith("Sleeping")).length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Casual single-purchase</p>
                </Card>
              </div>

              {/* Actionable recommendations panel */}
              <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-xs font-bold text-purple-700 dark:text-purple-300">💡 Recommended Loyalty Campaigns</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xl">
                    Run bulk WhatsApp campaigns targeted specifically to cohorts. Offer exclusive discounts to <strong>At-Risk</strong> users to prevent churn, or reward <strong>Champions</strong> with VIP access.
                  </p>
                </div>
                <Button size="sm" onClick={() => {
                  const atRisk = customers.filter(c => getCustomerCohort(c).label.startsWith("At-Risk")).map(c => c.phone);
                  if (atRisk.length === 0) {
                    toast.info("No At-Risk customers to segment currently.");
                  } else {
                    setSelectedCustomers(new Set(atRisk));
                    toast.success(`Segmented ${atRisk.length} At-Risk customers! Ready to message.`);
                  }
                }} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shrink-0 h-9">
                  Target At-Risk Churn
                </Button>
              </div>

              {/* List partitioned by cohort */}
              <div className="space-y-3">
                {customers.map((c) => {
                  const cohort = getCustomerCohort(c);
                  return (
                    <div
                      key={c.phone}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/30"
                    >
                      <button type="button" onClick={() => toggleSelect(c.phone)} className="shrink-0">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${selectedCustomers.has(c.phone) ? "bg-purple-600 text-white" : "bg-purple-500/10 text-purple-600"}`}>
                          {selectedCustomers.has(c.phone) ? <CheckSquare className="h-5 w-5" /> : <User className="h-5 w-5" />}
                        </div>
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{c.name}</p>
                          <Badge variant="outline" className={`text-[9px] uppercase tracking-wider font-semibold py-0 h-4 px-1.5 ${cohort.style}`}>
                            {cohort.label}
                          </Badge>
                        </div>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3" />{c.phone}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold font-mono">{NAIRA}{c.totalSpent.toLocaleString("en-NG")}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{c.transactionCount} transactions</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* WhatsApp Message Dialog */}
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              Send WhatsApp Message
            </DialogTitle>
            <DialogDescription>
              {messageTarget ? `To: ${messageTarget.name} (${messageTarget.phone})` : `To: ${selectedCustomers.size} customers`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {MESSAGE_TEMPLATES.map((tpl) => (
                <Button
                  key={tpl.id}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    let text = tpl.text;
                    if (messageTarget) {
                      text = text.replace("{name}", messageTarget.name)
                        .replace("{amount}", `${NAIRA}${messageTarget.totalSpent.toLocaleString("en-NG")}`)
                        .replace("{debt}", `${NAIRA}${messageTarget.debtBalance.toLocaleString("en-NG")}`);
                    }
                    setMessageText(text);
                  }}
                >
                  {tpl.label}
                </Button>
              ))}
            </div>

            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={5}
              placeholder="Type your message…"
            />

            <div className="flex gap-2 justify-end">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSendWhatsApp} className="gap-2 bg-green-600 hover:bg-green-700">
                <Send className="h-4 w-4" />
                Open WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Debt Settlement Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 font-sans">
              <CheckSquare className="h-5.5 w-5.5" />
              Settle Outstanding Debt
            </DialogTitle>
            <DialogDescription>
              {paymentTarget && `Record a payment received from ${paymentTarget.name} (${paymentTarget.phone})`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Outstanding Debt</label>
              <div className="text-xl font-bold font-mono text-destructive">
                {paymentTarget && `${NAIRA}${paymentTarget.debtBalance.toLocaleString("en-NG")}`}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="payment-amount" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount Paid ({NAIRA})</label>
              <Input
                id="payment-amount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount paid"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="payment-notes" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Transaction Notes</label>
              <Input
                id="payment-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Payment reference / details"
                className="text-xs"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <DialogClose asChild>
                <Button variant="outline" size="sm" className="text-xs font-semibold">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleRecordPaymentSubmit}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm h-9 px-4"
              >
                Confirm Settlement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {paymentReceiptSale && (
        <SalesReceipt
          sale={paymentReceiptSale}
          onClose={() => setPaymentReceiptSale(null)}
        />
      )}
    </div>
  );
}
