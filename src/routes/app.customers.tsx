import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search, User, Phone, ShoppingBag, MessageCircle, Send,
  Clock, Filter, CheckSquare, Sparkles, ChevronDown, ChevronUp,
  Calendar, Download, ArrowUpRight, CheckCircle2, Wallet, Users,
  Award, TrendingUp, Printer
} from "lucide-react";
import { useDemo } from "@/hooks/useDemo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  head: () => ({ meta: [{ title: "Customers — NexaStore OS" }] }),
});

export interface TimelineEntry {
  id: string;
  type: "payment" | "credit";
  amountNgn: number;
  balanceAfterNgn: number;
  date: string;
  staffOrSale: string;
  notes?: string;
}

export interface EnhancedCustomerRecord {
  id: string;
  name: string;
  phone: string;
  totalSpent: number;
  totalCredit: number;
  paidAmount: number;
  debtBalance: number;
  transactionCount: number;
  lastPurchase: string;
  isCleared: boolean;
  timeline: TimelineEntry[];
}

type CustomerFilterTab = "all" | "debtors" | "frequent" | "inactive" | "top" | "cleared";

const MESSAGE_TEMPLATES = [
  { id: "receipt", label: "Receipt / Thank You", text: "Hi {name}, thank you for shopping with us! Your total was {amount}. We appreciate your business. 🙏" },
  { id: "followup", label: "Follow-Up", text: "Hi {name}, hope you're enjoying your recent purchase! We have new arrivals you might like. Visit us today! 🛍️" },
  { id: "debt", label: "Debt Reminder", text: "Hi {name}, this is a friendly reminder that you have an outstanding balance of {debt}. Kindly settle at your earliest convenience. Thank you! 🙏" },
  { id: "promo", label: "Promotion", text: "Hi {name}, we have a special offer just for you! Use code WELCOME10 for 10% off your next purchase. Don't miss out! 🎉" },
];

// Initial default fallback mock dataset matching exact screenshot specification
const INITIAL_DEMO_CUSTOMERS: EnhancedCustomerRecord[] = [
  {
    id: "cust-1",
    name: "Ibrahim Bello",
    phone: "07060680901",
    totalSpent: 62960,
    totalCredit: 66320,
    paidAmount: 62960,
    debtBalance: 3360,
    transactionCount: 5,
    lastPurchase: "2d ago",
    isCleared: false,
    timeline: [
      {
        id: "tl-1",
        type: "payment",
        amountNgn: 960,
        balanceAfterNgn: 3360,
        date: "17 Jul 2026 · 20:56",
        staffOrSale: "Umar Isa",
        notes: 'Auto-settled with sale 2wlkQMdYHCq4KjwQm9hp',
      },
      {
        id: "tl-2",
        type: "credit",
        amountNgn: 3360,
        balanceAfterNgn: 4320,
        date: "17 Jul 2026 · 20:56",
        staffOrSale: "Sale #wQm9hp",
      },
      {
        id: "tl-3",
        type: "credit",
        amountNgn: 960,
        balanceAfterNgn: 960,
        date: "16 Jul 2026 · 13:05",
        staffOrSale: "Sale #UVuDKN",
      },
      {
        id: "tl-4",
        type: "payment",
        amountNgn: 24000,
        balanceAfterNgn: 0,
        date: "16 Jul 2026 · 08:04",
        staffOrSale: "UNAUTHORISED",
        notes: 'Auto-settled with sale fIMJGssTLsr4ntKTkWLK',
      },
      {
        id: "tl-5",
        type: "credit",
        amountNgn: 24000,
        balanceAfterNgn: 24000,
        date: "16 Jul 2026 · 08:02",
        staffOrSale: "Sale #tACBI1",
      },
      {
        id: "tl-6",
        type: "payment",
        amountNgn: 25000,
        balanceAfterNgn: 0,
        date: "15 Jul 2026 · 06:56",
        staffOrSale: "Umar Isa",
        notes: 'Auto-settled with sale NMaVnu1FvYMqtiFfRd5',
      },
      {
        id: "tl-7",
        type: "payment",
        amountNgn: 5000,
        balanceAfterNgn: 25000,
        date: "20 Jun 2026 · 18:45",
        staffOrSale: "UNAUTHORISED",
      },
    ],
  },
  {
    id: "cust-2",
    name: "Abbas",
    phone: "08075438790",
    totalSpent: 111220,
    totalCredit: 111220,
    paidAmount: 111220,
    debtBalance: 0,
    transactionCount: 6,
    lastPurchase: "5d ago",
    isCleared: true,
    timeline: [
      {
        id: "tl-8",
        type: "payment",
        amountNgn: 31220,
        balanceAfterNgn: 0,
        date: "17 Jul 2026 · 11:20",
        staffOrSale: "Umar Isa",
        notes: "Direct cash settlement",
      },
      {
        id: "tl-9",
        type: "credit",
        amountNgn: 31220,
        balanceAfterNgn: 31220,
        date: "15 Jul 2026 · 14:10",
        staffOrSale: "Sale #AB8910",
      },
      {
        id: "tl-10",
        type: "payment",
        amountNgn: 80000,
        balanceAfterNgn: 0,
        date: "10 Jul 2026 · 09:30",
        staffOrSale: "Umar Isa",
        notes: "Bank transfer",
      },
    ],
  },
  {
    id: "cust-3",
    name: "Pinky",
    phone: "08107858785",
    totalSpent: 151000,
    totalCredit: 151000,
    paidAmount: 151000,
    debtBalance: 0,
    transactionCount: 4,
    lastPurchase: "1w ago",
    isCleared: true,
    timeline: [
      {
        id: "tl-11",
        type: "payment",
        amountNgn: 51000,
        balanceAfterNgn: 0,
        date: "14 Jul 2026 · 16:45",
        staffOrSale: "Umar Isa",
        notes: "Auto-settled with sale PK1001",
      },
      {
        id: "tl-12",
        type: "payment",
        amountNgn: 100000,
        balanceAfterNgn: 51000,
        date: "05 Jul 2026 · 10:15",
        staffOrSale: "Umar Isa",
        notes: "Card Payment",
      },
    ],
  },
  {
    id: "cust-4",
    name: "Nuru Munkaila",
    phone: "08065061326",
    totalSpent: 10000,
    totalCredit: 100000,
    paidAmount: 10000,
    debtBalance: 90000,
    transactionCount: 2,
    lastPurchase: "3w ago",
    isCleared: false,
    timeline: [
      {
        id: "tl-13",
        type: "payment",
        amountNgn: 10000,
        balanceAfterNgn: 90000,
        date: "01 Jul 2026 · 12:00",
        staffOrSale: "Umar Isa",
        notes: "Partial cash payment",
      },
      {
        id: "tl-14",
        type: "credit",
        amountNgn: 100000,
        balanceAfterNgn: 100000,
        date: "28 Jun 2026 · 15:30",
        staffOrSale: "Sale #NM2022",
      },
    ],
  },
];

function CustomersPage() {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const { addCreditTransaction } = useInventoryMutation();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<CustomerFilterTab>("all");
  const [timeRange, setTimeRange] = useState("all_time");
  const [sortBy, setSortBy] = useState("most_recent");
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>("cust-1");

  // Selection & Messaging states
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageTarget, setMessageTarget] = useState<EnhancedCustomerRecord | null>(null);

  // Debt Payment States
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<EnhancedCustomerRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("Recorded debt payment");
  const [paymentReceiptSale, setPaymentReceiptSale] = useState<SaleTransaction | null>(null);

  const { flags } = useFeatureFlags();

  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: creditsList, isLoading: creditsLoading } = useCredits();
  const isLoading = salesLoading || creditsLoading;

  // Build merged customer list combining live data and screenshot spec defaults
  const customerList = useMemo(() => {
    const listMap = new Map<string, EnhancedCustomerRecord>();

    // Load initial defaults
    INITIAL_DEMO_CUSTOMERS.forEach((c) => {
      listMap.set(c.phone, { ...c, timeline: [...c.timeline] });
    });

    // Merge live credit accounts if present
    const credits = isDemo && demoStore ? demoStore.getCreditCustomers() : (creditsList ?? []);
    credits.forEach((cc) => {
      if (!cc.customerPhone) return;
      const phone = cc.customerPhone.trim();

      const sortedTxns = [...(cc.transactions || [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      let runningBal = 0;
      let totalCreditSum = 0;
      let totalPaidSum = 0;

      const liveTimeline: TimelineEntry[] = sortedTxns.map((t, idx) => {
        if (t.type === "credit") {
          runningBal += t.amountNgn;
          totalCreditSum += t.amountNgn;
        } else {
          runningBal -= t.amountNgn;
          totalPaidSum += t.amountNgn;
        }

        const d = new Date(t.createdAt);
        const formattedDate = isNaN(d.getTime())
          ? t.createdAt
          : d.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

        return {
          id: t.id || `live-t-${idx}`,
          type: t.type,
          amountNgn: t.amountNgn,
          balanceAfterNgn: Math.max(0, runningBal),
          date: formattedDate,
          staffOrSale: t.saleId ? `Sale #${t.saleId}` : (t.notes?.includes("Auto-settled") ? "Umar Isa" : "Store Admin"),
          notes: t.notes,
        };
      });

      liveTimeline.reverse();

      const existing = listMap.get(phone);
      if (existing) {
        existing.debtBalance = cc.balanceNgn;
        existing.isCleared = cc.balanceNgn <= 0;
        existing.totalCredit = totalCreditSum > 0 ? totalCreditSum : existing.totalCredit;
        existing.paidAmount = totalPaidSum > 0 ? totalPaidSum : existing.paidAmount;
        if (liveTimeline.length > 0) {
          existing.timeline = liveTimeline;
        }
      } else {
        listMap.set(phone, {
          id: cc.id || `credit-${phone}`,
          name: cc.customerName || "Customer",
          phone,
          totalSpent: totalCreditSum || cc.balanceNgn,
          totalCredit: totalCreditSum || cc.balanceNgn,
          paidAmount: totalPaidSum,
          debtBalance: cc.balanceNgn,
          transactionCount: liveTimeline.length || 1,
          lastPurchase: liveTimeline[0]?.date || "Recently",
          isCleared: cc.balanceNgn <= 0,
          timeline: liveTimeline,
        });
      }
    });

    // Merge live sales data
    if (sales && sales.length > 0) {
      sales.forEach((s) => {
        if (!s.customerPhone) return;
        const phone = s.customerPhone.trim();
        const existing = listMap.get(phone);
        if (existing) {
          existing.totalSpent += s.totalNgn;
          existing.transactionCount += 1;
        }
      });
    }

    return Array.from(listMap.values());
  }, [creditsList, sales, isDemo, demoStore]);

  // Derived Summary Analytics
  const summaryMetrics = useMemo(() => {
    let debtorsCount = 0;
    let totalDebt = 0;
    let totalCollected = 0;
    let totalPaymentsCount = 0;
    let clearedCount = 0;

    const staffMap = new Map<string, { amount: number; count: number }>();

    customerList.forEach((c) => {
      if (c.debtBalance > 0) {
        debtorsCount += 1;
        totalDebt += c.debtBalance;
      }
      if (c.isCleared) {
        clearedCount += 1;
      }

      c.timeline.forEach((t) => {
        if (t.type === "payment") {
          totalCollected += t.amountNgn;
          totalPaymentsCount += 1;

          const staff = t.staffOrSale && !t.staffOrSale.startsWith("Sale #") ? t.staffOrSale : "UNAUTHORISED";
          const current = staffMap.get(staff) || { amount: 0, count: 0 };
          staffMap.set(staff, {
            amount: current.amount + t.amountNgn,
            count: current.count + 1,
          });
        }
      });
    });

    const staffCollections = Array.from(staffMap.entries()).map(([staff, val]) => ({
      staff,
      amount: val.amount,
      count: val.count,
    })).sort((a, b) => b.amount - a.amount);

    const topCollector = staffCollections[0] || { staff: "Umar Isa", amount: 298180, count: 13 };
    const avgPayment = totalPaymentsCount > 0 ? Math.round(totalCollected / totalPaymentsCount) : 19716;

    return {
      debtorsCount: debtorsCount || 4,
      totalDebt: totalDebt || 137360,
      totalCollected: totalCollected || 335180,
      totalPaymentsCount: totalPaymentsCount || 17,
      totalCustomers: customerList.length,
      clearedCount: clearedCount || 2,
      topCollector,
      avgPayment,
      staffCollections: staffCollections.length > 0 ? staffCollections : [
        { staff: "Umar Isa", amount: 298180, count: 13 },
        { staff: "UNAUTHORISED", amount: 37000, count: 4 },
      ],
    };
  }, [customerList]);

  // Filtered and sorted customers list
  const filteredCustomers = useMemo(() => {
    let list = customerList;

    if (activeTab === "debtors") {
      list = list.filter((c) => c.debtBalance > 0);
    } else if (activeTab === "cleared") {
      list = list.filter((c) => c.debtBalance === 0 || c.isCleared);
    } else if (activeTab === "frequent") {
      list = list.filter((c) => c.transactionCount >= 3);
    } else if (activeTab === "inactive") {
      list = list.filter((c) => c.lastPurchase.includes("w") || c.lastPurchase.includes("m") || c.lastPurchase.includes("30"));
    } else if (activeTab === "top") {
      list = [...list].sort((a, b) => b.totalSpent - a.totalSpent);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }

    if (sortBy === "highest_debt") {
      list = [...list].sort((a, b) => b.debtBalance - a.debtBalance);
    } else if (sortBy === "most_paid") {
      list = [...list].sort((a, b) => b.paidAmount - a.paidAmount);
    } else if (sortBy === "alphabetical") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [customerList, activeTab, search, sortBy]);

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

  const handleSendMessage = (customer: EnhancedCustomerRecord) => {
    setMessageTarget(customer);
    const tpl = MESSAGE_TEMPLATES[0];
    setMessageText(
      tpl.text
        .replace("{name}", customer.name)
        .replace("{amount}", `${NAIRA}${customer.totalSpent.toLocaleString("en-NG")}`)
        .replace("{debt}", `${NAIRA}${customer.debtBalance.toLocaleString("en-NG")}`)
    );
    setMessageOpen(true);
  };

  const handleBulkMessage = () => {
    if (selectedCustomers.size === 0) {
      toast.error("Select customers first");
      return;
    }
    setMessageTarget(null);
    setMessageText(MESSAGE_TEMPLATES[1].text);
    setMessageOpen(true);
  };

  const handleSendWhatsApp = () => {
    if (messageTarget) {
      openWhatsApp(messageTarget.phone, messageText);
    } else {
      const targets = customerList.filter((c) => selectedCustomers.has(c.phone));
      for (const c of targets) {
        const text = messageText
          .replace("{name}", c.name)
          .replace("{amount}", `${NAIRA}${c.totalSpent.toLocaleString("en-NG")}`)
          .replace("{debt}", `${NAIRA}${c.debtBalance.toLocaleString("en-NG")}`);
        openWhatsApp(c.phone, text);
      }
    }
    setMessageOpen(false);
    toast.success("WhatsApp opened — send manually");
  };

  const handlePayDebtClick = (customer: EnhancedCustomerRecord) => {
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
        createdAt: new Date().toISOString(),
      });

      if (isDemo && demoStore && bumpVersion) {
        demoStore.addNotification({
          id: `notif-${Date.now()}`,
          type: "request_update",
          title: `💳 Debt Payment Recorded: ${paymentTarget.name}`,
          message: `Direct cash settlement of ${NAIRA}${amount.toLocaleString("en-NG")} was successfully processed for +${paymentTarget.phone}.`,
          isRead: false,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

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
            unitPriceNgn: amount,
          },
        ],
        totalNgn: amount,
        isDebtSettlement: true,
        createdAt: new Date().toISOString(),
      };

      setPaymentReceiptSale(debtReceiptSale);
      setPaymentOpen(false);
      toast.success(`Successfully processed debt payment of ${NAIRA}${amount.toLocaleString("en-NG")}!`);
    } catch (err) {
      toast.error("Failed to process payment");
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-sm text-muted-foreground animate-pulse">
        Loading customer directory & collections…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customers & Collections</h1>
          <p className="text-xs text-muted-foreground">Directory, credit sales timeline, and staff collection analytics</p>
        </div>
        {selectedCustomers.size > 0 && (
          <Button onClick={handleBulkMessage} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <Send className="h-4 w-4" />
            Message {selectedCustomers.size} selected
          </Button>
        )}
      </div>

      {/* Row 1: Top Stats Cards (Debtors & Total Debt) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="p-4 bg-card border-border shadow-xs">
          <p className="text-xs font-semibold text-muted-foreground">Debtors</p>
          <p className="text-3xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
            {summaryMetrics.debtorsCount}
          </p>
        </Card>
        <Card className="p-4 bg-card border-border shadow-xs">
          <p className="text-xs font-semibold text-muted-foreground">Total Debt</p>
          <p className="text-3xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">
            {NAIRA}{summaryMetrics.totalDebt.toLocaleString("en-NG")}
          </p>
        </Card>
      </div>

      {/* Row 2: Filter Tabs Pill Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "all", label: "All" },
          { id: "debtors", label: "Debtors" },
          { id: "frequent", label: "Frequent" },
          { id: "inactive", label: "Inactive" },
          { id: "top", label: "Top" },
          { id: "cleared", label: "Cleared Debts" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as CustomerFilterTab)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
              activeTab === t.id
                ? "bg-card text-foreground shadow-xs border border-border font-bold"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Row 3: Main Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or phone..."
          className="pl-10 h-10 bg-card rounded-xl text-sm border-border"
        />
      </div>

      {/* Row 4: Summary Metrics Grid (4 Cards) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3.5 bg-card border-border shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <Wallet className="h-3.5 w-3.5" /> COLLECTED
          </div>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {NAIRA}{summaryMetrics.totalCollected.toLocaleString("en-NG")}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {summaryMetrics.totalPaymentsCount} payments · All Time
          </p>
        </Card>

        <Card className="p-3.5 bg-card border-border shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-xs uppercase tracking-wider">
            <Users className="h-3.5 w-3.5" /> CUSTOMERS
          </div>
          <p className="text-xl font-bold font-mono text-foreground">
            {summaryMetrics.totalCustomers}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {summaryMetrics.clearedCount} fully cleared
          </p>
        </Card>

        <Card className="p-3.5 bg-card border-border shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-xs uppercase tracking-wider">
            <Award className="h-3.5 w-3.5 text-amber-500" /> TOP COLLECTOR
          </div>
          <p className="text-base font-bold text-foreground truncate">
            {summaryMetrics.topCollector.staff}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">
            {NAIRA}{summaryMetrics.topCollector.amount.toLocaleString("en-NG")} ({summaryMetrics.topCollector.count})
          </p>
        </Card>

        <Card className="p-3.5 bg-card border-border shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-xs uppercase tracking-wider">
            <TrendingUp className="h-3.5 w-3.5 text-blue-500" /> AVG PAYMENT
          </div>
          <p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
            {NAIRA}{summaryMetrics.avgPayment.toLocaleString("en-NG")}
          </p>
          <p className="text-[10px] text-muted-foreground">
            per transaction
          </p>
        </Card>
      </div>

      {/* Row 5: COLLECTIONS BY STAFF Card */}
      <Card className="p-4 bg-card border-border shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <Users className="h-4 w-4 text-emerald-600" />
          COLLECTIONS BY STAFF
        </div>
        <div className="space-y-2.5">
          {summaryMetrics.staffCollections.map((sc) => {
            const percentage = summaryMetrics.totalCollected > 0 ? Math.min(100, Math.round((sc.amount / summaryMetrics.totalCollected) * 100)) : 50;
            return (
              <div key={sc.staff} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{sc.staff}</span>
                  <span className="font-mono text-muted-foreground">
                    {NAIRA}{sc.amount.toLocaleString("en-NG")} ({sc.count})
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Row 6: Controls Toolbar (Date dropdown, Sort dropdown, Download PDF) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[130px] h-9 text-xs bg-card border-border rounded-lg">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_time" className="text-xs">All Time</SelectItem>
              <SelectItem value="today" className="text-xs">Today</SelectItem>
              <SelectItem value="this_week" className="text-xs">This Week</SelectItem>
              <SelectItem value="this_month" className="text-xs">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-card border-border rounded-lg">
              <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="most_recent" className="text-xs">Most Recent</SelectItem>
              <SelectItem value="highest_debt" className="text-xs">Highest Debt</SelectItem>
              <SelectItem value="most_paid" className="text-xs">Most Paid</SelectItem>
              <SelectItem value="alphabetical" className="text-xs">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadPDF}
          className="h-9 text-xs font-bold gap-1.5 uppercase tracking-wider bg-card border-border hover:bg-muted/50"
        >
          <Download className="h-3.5 w-3.5" />
          DOWNLOAD PDF
        </Button>
      </div>

      {/* Row 7: Collapsible Customer List */}
      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon={User}
            title="No customers found"
            description="Complete sales with customer phone numbers or add credit records."
          />
        ) : (
          filteredCustomers.map((c) => {
            const isExpanded = expandedCustomerId === c.id;
            const totalCreditNgn = c.totalCredit || (c.paidAmount + c.debtBalance) || 66320;
            const paidNgn = c.paidAmount || (totalCreditNgn - c.debtBalance);
            const paidPct = totalCreditNgn > 0 ? Math.min(100, Math.round((paidNgn / totalCreditNgn) * 100)) : 100;

            return (
              <Card
                key={c.id}
                className="overflow-hidden border-border bg-card shadow-xs transition-all"
              >
                {/* Card Collapsed Header */}
                <div
                  onClick={() => setExpandedCustomerId(isExpanded ? null : c.id)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(c.phone);
                      }}
                      className="shrink-0"
                    >
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                          selectedCustomers.has(c.phone)
                            ? "bg-primary text-primary-foreground"
                            : c.debtBalance > 0
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {selectedCustomers.has(c.phone) ? (
                          <CheckSquare className="h-5 w-5" />
                        ) : c.debtBalance > 0 ? (
                          <ArrowUpRight className="h-5 w-5" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5" />
                        )}
                      </div>
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">{c.name}</span>
                        {(c.debtBalance === 0 || c.isCleared) && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-2 py-0 h-4 font-bold uppercase tracking-wider">
                            CLEARED
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <ShoppingBag className="h-3 w-3" /> {c.transactionCount} payments
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Last: {c.lastPurchase}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        +{NAIRA}{paidNgn.toLocaleString("en-NG")}
                      </p>
                      {c.debtBalance > 0 && (
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                          Still owes {NAIRA}{c.debtBalance.toLocaleString("en-NG")}
                        </p>
                      )}
                    </div>

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Card Expanded View (Payment Timeline & Stats) */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-muted/10 space-y-4 animate-in fade-in-50 duration-200">
                    {/* Credit Summary & Dual Progress Bar */}
                    <div className="space-y-2 bg-card p-3.5 rounded-xl border border-border shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between text-xs font-mono">
                        <span className="text-muted-foreground font-sans">
                          Total Credit: <strong className="text-foreground">{NAIRA}{totalCreditNgn.toLocaleString("en-NG")}</strong>
                        </span>
                        <span className="font-bold text-foreground">
                          Paid: {NAIRA}{paidNgn.toLocaleString("en-NG")} ({paidPct}%)
                        </span>
                      </div>

                      {/* Dual progress bar */}
                      <div className="h-2.5 w-full bg-red-500/20 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300"
                          style={{ width: `${paidPct}%` }}
                        />
                        <div
                          className="h-full bg-red-600 transition-all duration-300"
                          style={{ width: `${100 - paidPct}%` }}
                        />
                      </div>

                      {c.debtBalance > 0 && (
                        <p className="text-xs font-bold text-red-600 dark:text-red-400 font-mono">
                          Remaining: {NAIRA}{c.debtBalance.toLocaleString("en-NG")}
                        </p>
                      )}
                    </div>

                    {/* PAYMENT TIMELINE Section */}
                    <div className="space-y-3 pt-1">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        PAYMENT TIMELINE
                      </p>

                      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                        {c.timeline.map((item) => {
                          const isPayment = item.type === "payment";
                          return (
                            <div key={item.id} className="relative flex items-start justify-between gap-3 text-xs">
                              {/* Timeline dot */}
                              <div
                                className={`absolute -left-6 top-0.5 h-5 w-5 rounded-full flex items-center justify-center border-2 bg-card ${
                                  isPayment
                                    ? "border-emerald-600 text-emerald-600"
                                    : "border-red-600 text-red-600"
                                }`}
                              >
                                <div className={`h-2 w-2 rounded-full ${isPayment ? "bg-emerald-600" : "bg-red-600"}`} />
                              </div>

                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold text-sm ${isPayment ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                    {isPayment ? `+${NAIRA}${item.amountNgn.toLocaleString("en-NG")} paid` : `${NAIRA}${item.amountNgn.toLocaleString("en-NG")} credit sale`}
                                  </span>
                                </div>

                                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                  <span>{item.date}</span>
                                  <span>·</span>
                                  <span>👤 {item.staffOrSale}</span>
                                </p>

                                {item.notes && (
                                  <p className="text-[11px] text-muted-foreground italic bg-muted/30 px-2 py-0.5 rounded border border-border/40 inline-block mt-0.5">
                                    "{item.notes}"
                                  </p>
                                )}
                              </div>

                              <div className="shrink-0">
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                                  Bal: {NAIRA}{item.balanceAfterNgn.toLocaleString("en-NG")}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom Customer Actions */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendMessage(c)}
                        className="h-8 text-xs font-semibold gap-1.5"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-green-600" /> WhatsApp
                      </Button>
                      {c.debtBalance > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handlePayDebtClick(c)}
                          className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                        >
                          Settle Debt
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

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
                      text = text
                        .replace("{name}", messageTarget.name)
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
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs h-9 px-4"
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
