import { useState, useMemo, useEffect } from "react";
import { User, Phone, CreditCard, Tag, Percent, Wallet, Banknote, Smartphone, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useDemo } from "@/hooks/useDemo";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Item, SaleTransaction } from "@/types/inventory";
import type { Discount } from "@/types/finance";
import { SalesReceipt } from "./SalesReceipt";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const NAIRA = "₦";
const USD_TO_NGN = 1;

export interface CheckoutItem {
  item: Item;
  quantity: number;
  selectedUnit?: string;
  calculatedUnitPrice?: number;
  configStr?: string;
}

interface SalesStepCheckoutProps {
  items: CheckoutItem[];
  onComplete: () => void;
  diningMode?: "dine-in" | "takeaway" | "delivery";
  tableNumber?: string;
  packagingFee?: number;
  estimatedReadyTime?: number;
  onBack?: () => void;
}

import { useInventoryMutation } from "@/hooks/useInventoryMutation";
import { useAuth } from "@/contexts/AuthContext";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { useSales, useCredits } from "@/hooks/useInventoryData";

export function SalesStepCheckout({ 
  items, 
  onComplete, 
  diningMode = "dine-in", 
  tableNumber = "4", 
  packagingFee = 0, 
  estimatedReadyTime = 0,
  onBack
}: SalesStepCheckoutProps) {
  const { isDemo, demoStore, bumpVersion, onboarding: demoOnboarding } = useDemo();
  const { settings: liveSettings } = useSystemSettings();
  
  const onboarding = isDemo ? demoOnboarding : liveSettings;
  const { addSale, addCreditTransaction } = useInventoryMutation();
  const { user } = useAuth();
  const { data: salesList } = useSales();
  const { data: creditsList } = useCredits();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [includePreviousDebt, setIncludePreviousDebt] = useState(false);
  const [lastSale, setLastSale] = useState<SaleTransaction | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ type: "percentage" | "flat"; value: number } | null>(null);
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [payOnCredit, setPayOnCredit] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "card">("cash");

  // Debt Dialog states
  const [showDebtPrompt, setShowDebtPrompt] = useState(false);
  const [hasPromptedForPhone, setHasPromptedForPhone] = useState<string | null>(null);

  const subtotalItems = items.reduce((s, ci) => s + (ci.calculatedUnitPrice ?? ci.item.sellingPrice) * USD_TO_NGN * ci.quantity, 0);
  const subtotal = subtotalItems + packagingFee;

  // ... (rest of memoized values remain similar)

  // Calculate discount
  const discountAmount = useMemo(() => {
    let amt = 0;
    if (discount) {
      amt += discount.type === "percentage" ? subtotal * (discount.value / 100) : discount.value;
    }
    if (promoApplied) {
      const base = subtotal - amt;
      amt += promoApplied.type === "percentage" ? base * (promoApplied.value / 100) : promoApplied.value;
    }
    return Math.min(amt, subtotal);
  }, [subtotal, discount, promoApplied]);

  const total = subtotal - discountAmount;

  // Tax
  const taxRate = onboarding.taxRate ?? 0;
  const taxAmount = total * (taxRate / 100);
  const grandTotal = total + taxAmount;

  const selectedCustomerDebt = useMemo(() => {
    if (!customerPhone) return null;
    if (isDemo && demoStore) {
      const cred = demoStore.getCreditCustomer(customerPhone);
      return cred && cred.balanceNgn > 0 ? cred : null;
    } else {
      const cred = creditsList?.find(c => c.customerPhone === customerPhone);
      return cred && cred.balanceNgn > 0 ? cred : null;
    }
  }, [isDemo, demoStore, creditsList, customerPhone]);

  const previousDebtAmount = selectedCustomerDebt ? selectedCustomerDebt.balanceNgn : 0;
  const paymentDueTotal = (includePreviousDebt && !payOnCredit) ? grandTotal + previousDebtAmount : grandTotal;

  // Auto-detect outstanding debt and show the prompt pop-up
  useEffect(() => {
    if (selectedCustomerDebt && !includePreviousDebt && customerPhone && hasPromptedForPhone !== customerPhone) {
      setShowDebtPrompt(true);
      setHasPromptedForPhone(customerPhone);
    }
    // Reset prompt lock if phone number is cleared or updated to a new number with no active debt
    if (customerPhone && !selectedCustomerDebt) {
      setHasPromptedForPhone(null);
    }
  }, [selectedCustomerDebt, includePreviousDebt, customerPhone, hasPromptedForPhone]);

  const knownCustomers = useMemo(() => {
    const sales = salesList ?? [];
    const map = new Map<string, { name: string; email?: string }>();
    for (const sale of sales) {
      if (sale.customerPhone && sale.customerName) {
        map.set(sale.customerPhone, { name: sale.customerName, email: sale.customerEmail });
      }
    }
    const credits = isDemo && demoStore ? demoStore.getCreditCustomers() : (creditsList ?? []);
    for (const cred of credits) {
      const existing = map.get(cred.customerPhone);
      map.set(cred.customerPhone, {
        name: cred.customerName,
        email: cred.customerEmail || existing?.email || ""
      });
    }
    return map;
  }, [isDemo, demoStore, salesList, creditsList]);

  // Auto-suggest by name, phone or email
  const customerSuggestions = useMemo(() => {
    const q = (customerName || customerPhone || customerEmail).trim().toLowerCase();
    if (!q) return [];
    
    const sales = salesList ?? [];
    const seen = new Map<string, { name: string; phone: string; email?: string; debtBalance: number }>();
    
    for (const sale of sales) {
      if (sale.customerPhone && sale.customerName) {
        let debt = 0;
        if (isDemo && demoStore) {
          debt = demoStore.getCreditCustomer(sale.customerPhone)?.balanceNgn || 0;
        } else {
          debt = creditsList?.find(c => c.customerPhone === sale.customerPhone)?.balanceNgn || 0;
        }
        seen.set(sale.customerPhone, { 
          name: sale.customerName, 
          phone: sale.customerPhone,
          email: sale.customerEmail || "",
          debtBalance: debt
        });
      }
    }
    
    const credits = isDemo && demoStore ? demoStore.getCreditCustomers() : (creditsList ?? []);
    for (const cred of credits) {
      const existing = seen.get(cred.customerPhone);
      seen.set(cred.customerPhone, {
        name: cred.customerName,
        phone: cred.customerPhone,
        email: cred.customerEmail || existing?.email || "",
        debtBalance: cred.balanceNgn
      });
    }

    const all = Array.from(seen.values());
    return all.filter((c) => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q) || 
      (c.email && c.email.toLowerCase().includes(q))
    ).slice(0, 4);
  }, [isDemo, demoStore, salesList, creditsList, customerName, customerPhone, customerEmail]);

  const handlePhoneChange = (value: string) => {
    setCustomerPhone(value);
    setIncludePreviousDebt(false);
    if (value.length >= 8) {
      const found = knownCustomers.get(value);
      if (found) {
        if (!customerName) setCustomerName(found.name);
        if (found.email && !customerEmail) setCustomerEmail(found.email);
      }
    }
  };

  const handleApplyPromo = () => {
    if (!promoCode.trim() || !demoStore) return;
    const promo = demoStore.validatePromo(promoCode);
    if (promo) {
      setPromoApplied({ type: promo.discountType, value: promo.discountValue });
      toast.success(`Promo "${promo.code}" applied!`);
    } else {
      toast.error("Invalid or expired promo code");
    }
  };

  const formatConfigShort = (configStr: string) => {
    try {
      const config = JSON.parse(configStr);
      const parts = [];
      if (config.portion) parts.push(config.portion.name);
      if (config.color) parts.push(config.color);
      if (config.size) parts.push(`Size ${config.size}`);
      if (config.proteins && config.proteins.length > 0) {
        parts.push(config.proteins.map((p: { name: string }) => p.name).join("+"));
      }
      if (config.spiceLevel) parts.push(config.spiceLevel);
      if (config.swallowType) parts.push(config.swallowType);
      if (config.comboSelections && config.comboSelections.length > 0) {
        parts.push(config.comboSelections.map((c: { itemName: string }) => `${c.itemName}`).join(", "));
      }
      if (config.note) parts.push(`"${config.note}"`);
      return parts.join(", ");
    } catch(e) {
      return "";
    }
  };

  const handleWhatsAppShare = () => {
    if (!customerPhone.trim()) {
      toast.error("Please enter a phone number to share");
      return;
    }
    
    let itemsText = items.map(ci => {
      const unitPrice = ci.calculatedUnitPrice ?? ci.item.sellingPrice;
      const unit = ci.selectedUnit || ci.item.unit;
      const configDesc = ci.configStr ? ` (${formatConfigShort(ci.configStr)})` : "";
      return `• ${ci.item.name}${configDesc} (${unit}) x${ci.quantity}: ${NAIRA}${(unitPrice * USD_TO_NGN * ci.quantity).toLocaleString()}`;
    }).join("\n");

    if (packagingFee > 0) {
      itemsText += `\n• Container Packaging Fee: ${NAIRA}${packagingFee.toLocaleString()}`;
    }

    const storeName = onboarding.storeName || "Our Store";
    const greeting = customerName.trim() ? `Hello *${customerName.trim()}*, ` : "Hello, ";
    
    const text = `${greeting}here is your *Order Summary* from *${storeName}*:\n\n${itemsText}\n\n*Total: ${NAIRA}${grandTotal.toLocaleString()}*\n\nThank you for choosing us! 🙏`;
    
    const url = getWhatsAppUrl(customerPhone, text);
    window.open(url, "_blank");
  };

  const handleCheckout = async () => {
    const sale: SaleTransaction = {
      id: `sale-${Date.now()}`,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      items: items.map((ci) => {
        const unit = ci.selectedUnit || ci.item.unit;
        let multiplier = 1;
        if (ci.selectedUnit && ci.selectedUnit !== ci.item.unit && ci.item.unitConversions) {
          const conv = ci.item.unitConversions.find(c => c.unitId === ci.selectedUnit);
          if (conv) multiplier = conv.multiplier;
        }
        
        const configDesc = ci.configStr ? ` (${formatConfigShort(ci.configStr)})` : "";
        
        return {
          itemId: ci.item.id,
          itemName: `${ci.item.name}${configDesc}`,
          sku: ci.item.sku,
          quantity: ci.quantity,
          unit,
          multiplier,
          unitPriceNgn: (ci.calculatedUnitPrice ?? ci.item.sellingPrice) * USD_TO_NGN,
          imageUrl: ci.item.imageUrl ?? undefined,
        };
      }),
      totalNgn: paymentDueTotal,
      notes: onboarding?.businessType === "restaurant" ? `${diningMode === "dine-in" ? `Dine-in (Table ${tableNumber})` : diningMode === "takeaway" ? "Takeaway Order" : "Delivery Order"}${estimatedReadyTime > 0 ? ` - Cooking Ready: ~${estimatedReadyTime}m` : ""}` : undefined,
      createdBy: user?.uid,
      source: isDemo ? "demo" : "pos",
      createdAt: new Date().toISOString(),
      previousDebtPaidNgn: (includePreviousDebt && !payOnCredit) ? previousDebtAmount : undefined,
    };

    await addSale(sale);

    if (isDemo && demoStore) {
      if (promoApplied && promoCode) demoStore.usePromo(promoCode);
    }

    if (payOnCredit && customerPhone.trim()) {
      await addCreditTransaction(customerPhone.trim(), customerName.trim() || "Unknown", {
        id: `ctxn-${Date.now()}`,
        type: "credit",
        amountNgn: grandTotal,
        saleId: sale.id,
        notes: "Sale on credit",
        createdAt: new Date().toISOString(),
      });
    }
    
    // Handle previous debt payment consolidation
    if (includePreviousDebt && previousDebtAmount > 0 && customerPhone.trim() && !payOnCredit) {
      await addCreditTransaction(customerPhone.trim(), customerName.trim() || "Unknown", {
        id: `ctxn-repay-${Date.now()}`,
        type: "payment",
        amountNgn: previousDebtAmount,
        saleId: sale.id,
        notes: "Previous debt cleared at checkout",
        createdAt: new Date().toISOString(),
      });
    }

    setLastSale(sale);
    toast.success(`Sale recorded — ${NAIRA}${paymentDueTotal.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`);
  };

  if (lastSale) {
    return (
      <SalesReceipt
        sale={lastSale}
        onClose={() => { setLastSale(null); onComplete(); }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-4 overflow-y-auto">
      {onBack && (
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          onClick={onBack} 
          className="self-start gap-1.5 mb-4 text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground h-9 px-3 rounded-lg border"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Edit Order / Back
        </Button>
      )}
      {/* Customer details */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Customer Details</h3>
          <p className="text-xs text-muted-foreground">Optional — helps with receipts, debt clearing, and repeat tracking</p>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="checkout-phone" className="text-xs">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="checkout-phone" value={customerPhone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="08012345678" className="pl-10 h-11 font-mono" />
            </div>
            {customerPhone.length >= 8 && knownCustomers.has(customerPhone) && (
              <p className="text-xs text-primary">✓ Returning customer — {knownCustomers.get(customerPhone)?.name}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checkout-name" className="text-xs">Customer Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="checkout-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Chidi Okonkwo" className="pl-10 h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checkout-email" className="text-xs">Email Address</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">@</span>
              <Input id="checkout-email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="e.g. customer@example.com" className="pl-10 h-11" />
            </div>
          </div>
          
          {/* Auto-suggest dropdown */}
          {customerSuggestions.length > 0 && (customerName.trim().length >= 1 || customerPhone.trim().length >= 1 || customerEmail.trim().length >= 1) && (
            <div className="rounded-lg border border-border bg-card p-1 space-y-0.5 shadow-sm animate-in fade-in slide-in-from-top-1 duration-150">
              <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Suggestions</p>
              {customerSuggestions.map((s) => (
                <button
                  key={s.phone}
                  type="button"
                  onClick={() => {
                    setCustomerName(s.name);
                    setCustomerPhone(s.phone);
                    setCustomerEmail(s.email || "");
                    setIncludePreviousDebt(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors text-left"
                >
                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-foreground flex items-center gap-1.5">
                      <span>{s.name}</span>
                      {s.debtBalance > 0 && (
                        <span className="inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                          Debt: {NAIRA}{s.debtBalance.toLocaleString("en-NG")}
                        </span>
                      )}
                    </p>
                    {s.email && <p className="text-[10px] text-muted-foreground truncate">{s.email}</p>}
                  </div>
                  <span className="text-muted-foreground font-mono ml-auto shrink-0 text-[10px]">{s.phone}</span>
                </button>
              ))}
            </div>
          )}

          {/* Outstanding Debt Alert Card */}
          {selectedCustomerDebt && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2 text-xs text-amber-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-1.5 font-bold uppercase text-amber-900 tracking-wider">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 animate-bounce" />
                <span>Outstanding Debt Alert</span>
              </div>
              <p className="leading-relaxed">
                <strong>{selectedCustomerDebt.customerName}</strong> has an active unpaid debt of{" "}
                <strong className="text-amber-900 font-mono text-sm">
                  {NAIRA}{selectedCustomerDebt.balanceNgn.toLocaleString("en-NG")}
                </strong>.
              </p>
              
              {!payOnCredit && (
                <div className="pt-1 flex items-center justify-between gap-3 border-t border-amber-200/50 mt-1">
                  <span className="text-[10px] text-amber-700 font-semibold leading-normal">
                    Include previous debt in current amount due?
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={includePreviousDebt ? "default" : "outline"}
                    className={cn(
                      "h-7 text-[10px] font-bold px-2 rounded-md shrink-0",
                      includePreviousDebt 
                        ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 animate-pulse" 
                        : "text-amber-700 border-amber-300 hover:bg-amber-100/50 bg-transparent"
                    )}
                    onClick={() => setIncludePreviousDebt(!includePreviousDebt)}
                  >
                    {includePreviousDebt ? "✓ Included" : "Include Debt"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Discount & Promo */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Discounts & Promos</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Discount Type</Label>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={discount?.type === "percentage" ? "default" : "outline"}
                className="flex-1 h-9 text-xs gap-1"
                onClick={() => setDiscount(discount?.type === "percentage" ? null : { type: "percentage", value: discount?.value ?? 0 })}
              >
                <Percent className="h-3 w-3" /> %
              </Button>
              <Button
                type="button"
                size="sm"
                variant={discount?.type === "flat" ? "default" : "outline"}
                className="flex-1 h-9 text-xs gap-1"
                onClick={() => setDiscount(discount?.type === "flat" ? null : { type: "flat", value: discount?.value ?? 0 })}
              >
                {NAIRA} Flat
              </Button>
            </div>
          </div>
          {discount && (
            <div className="space-y-1.5">
              <Label className="text-xs">Value</Label>
              <Input
                type="number"
                value={discount.value || ""}
                onChange={(e) => setDiscount({ ...discount, value: Number(e.target.value) })}
                placeholder={discount.type === "percentage" ? "e.g. 10" : "e.g. 500"}
                className="h-9"
              />
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Promo Code</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="WELCOME10" className="pl-10 h-9 font-mono text-xs" />
            </div>
            <Button size="sm" variant="outline" onClick={handleApplyPromo} className="h-9">Apply</Button>
          </div>
          {promoApplied && <p className="text-xs text-primary">✓ Promo applied: {promoApplied.type === "percentage" ? `${promoApplied.value}% off` : `${NAIRA}${promoApplied.value} off`}</p>}
        </div>

        {/* Credit toggle */}
        <button
          type="button"
          onClick={() => setPayOnCredit(!payOnCredit)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all w-full ${payOnCredit ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
        >
          <Wallet className="h-4 w-4" />
          {payOnCredit ? "Paying on credit ✓" : "Add to customer credit"}
        </button>
      </div>

      <Separator className="my-4" />

      {/* Payment Method */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Payment Method</h3>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: "cash" as const, label: "Cash", icon: Banknote },
            { id: "transfer" as const, label: "Transfer", icon: Smartphone },
            { id: "card" as const, label: "Card", icon: CreditCard },
          ]).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaymentMethod(m.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all",
                paymentMethod === m.id
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              <m.icon className="h-5 w-5" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <Separator className="my-4" />

      {/* Order summary */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Order Summary</h3>
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          {items.map((ci) => {
            const unitPrice = ci.calculatedUnitPrice ?? ci.item.sellingPrice;
            const unit = ci.selectedUnit || ci.item.unit;
            return (
              <div key={`${ci.item.id}:${unit}`} className="flex justify-between items-start text-xs border-b border-border/30 last:border-0 pb-1.5 last:pb-0">
                <div className="text-muted-foreground mr-2 flex flex-col">
                  <span className="font-bold text-foreground">{ci.item.name} ({unit}) × {ci.quantity}</span>
                  {ci.configStr && (() => {
                    const formatted = formatConfigShort(ci.configStr);
                    return formatted ? <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">{formatted}</span> : null;
                  })()}
                </div>
                <span className="font-mono font-medium text-foreground shrink-0">
                  {NAIRA}{(unitPrice * USD_TO_NGN * ci.quantity).toLocaleString("en-NG", { minimumFractionDigits: 0 })}
                </span>
              </div>
            );
          })}
          
          {onboarding?.businessType === "restaurant" && (
            <div className="flex flex-col gap-1 pt-2 border-t border-border/50 text-[10px] uppercase font-bold tracking-wider">
              <div className="flex justify-between text-muted-foreground">
                <span>Dining Context</span>
                <span className="text-primary font-bold">{diningMode === "dine-in" ? `Dine-in (Table ${tableNumber})` : diningMode === "takeaway" ? "Takeaway" : "Delivery"}</span>
              </div>
              {estimatedReadyTime > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Est. Prep Time</span>
                  <span>~{estimatedReadyTime} mins</span>
                </div>
              )}
            </div>
          )}

          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-primary pt-1 border-t border-border/50">
              <span>Discount</span>
              <span className="font-mono">-{NAIRA}{discountAmount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tax ({taxRate}%)</span>
              <span className="font-mono">+{NAIRA}{taxAmount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Total and checkout button */}
      <div className="mt-auto pt-5 space-y-3">
        {includePreviousDebt && previousDebtAmount > 0 && !payOnCredit && (
          <div className="space-y-1 text-xs border-t border-dashed border-border pt-2 pb-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Order Amount</span>
              <span className="font-mono">{NAIRA}{grandTotal.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between text-amber-600 font-semibold">
              <span>Previous Debt Consolidated</span>
              <span className="font-mono">+{NAIRA}{previousDebtAmount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between text-xl font-bold">
          <span>{includePreviousDebt && !payOnCredit ? "Total Due" : "Total"}</span>
          <span className="font-mono">{NAIRA}{paymentDueTotal.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCheckout} className="flex-[2] gap-2 h-12 text-base rounded-xl" size="lg">
            <CreditCard className="h-5 w-5" />
            {payOnCredit ? "Record Credit Sale" : "Complete Sale"}
          </Button>
          {customerPhone.length >= 8 && (
            <Button variant="outline" onClick={handleWhatsAppShare} className="flex-1 h-12 rounded-xl border-green-600/30 text-green-700 hover:bg-green-50 hover:text-green-800" size="lg">
              <Smartphone className="h-5 w-5" />
              WA
            </Button>
          )}
        </div>
      </div>

      {/* Debt Prompt Dialog Modal */}
      <Dialog open={showDebtPrompt} onOpenChange={setShowDebtPrompt}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5 shrink-0 animate-bounce" />
              Outstanding Debt Detected
            </DialogTitle>
            <DialogDescription>
              We found an active unpaid debt for this customer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3 text-sm">
            <p className="leading-relaxed text-foreground">
              <strong>{selectedCustomerDebt?.customerName || customerName || "This customer"}</strong> has an outstanding debt of:
            </p>
            <div className="text-center py-4 bg-amber-50 rounded-xl border border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30">
              <span className="text-3xl font-extrabold text-amber-700 dark:text-amber-400 font-mono">
                {NAIRA}{selectedCustomerDebt?.balanceNgn.toLocaleString("en-NG")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Would you like to include this outstanding debt in the current checkout? If included, the previous debt will be paid and marked as settled, and it will be added to the customer receipt.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setIncludePreviousDebt(false);
                setShowDebtPrompt(false);
              }}
            >
              No, Keep Separate
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              onClick={() => {
                setIncludePreviousDebt(true);
                setShowDebtPrompt(false);
                toast.success("Outstanding debt included in checkout total!");
              }}
            >
              Yes, Include Debt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
