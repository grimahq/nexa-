import { useState } from "react";
import { 
  CreditCard, 
  ShieldCheck, 
  Loader2, 
  CheckCircle, 
  Sparkles, 
  Lock, 
  ArrowRight,
  TrendingUp,
  Layers,
  Mail,
  Coins,
  Globe
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { toast } from "sonner";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetTier: "starter" | "professional" | "enterprise";
  onSuccess?: () => void;
}

const TIER_DETAILS = {
  starter: {
    name: "Starter Plan",
    priceUsd: 0,
    priceNgn: 0,
    features: [
      "Max 1 branch location",
      "Low stock local alerts",
      "Default printed/digital receipts"
    ]
  },
  professional: {
    name: "Professional Plan",
    priceUsd: 150,
    priceNgn: 150000,
    features: [
      "Max 3 branch locations",
      "AI-powered auto replenishment",
      "Cross-branch stock pools",
      "Daily summary email logs"
    ]
  },
  enterprise: {
    name: "Enterprise Plan",
    priceUsd: 450,
    priceNgn: 450000,
    features: [
      "Up to 10 branch locations",
      "Smart AI Cohort Analysis",
      "Global B2B marketplace syndication",
      "AI Pricing & Demand analytics"
    ]
  }
};

export function PaymentDialog({ open, onOpenChange, targetTier, onSuccess }: PaymentDialogProps) {
  const { updateSettings } = useSystemSettings();
  const [step, setStep] = useState<"form" | "processing" | "success">("form");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const plan = TIER_DETAILS[targetTier];

  const handleCardNumberChange = (val: string) => {
    // Format card number as 1234 5678 1234 5678
    const digitsOnly = val.replace(/\D/g, "");
    const chunks = digitsOnly.match(/.{1,4}/g);
    setCardNumber(chunks ? chunks.slice(0, 4).join(" ") : "");
  };

  const handleExpiryChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, "");
    if (digitsOnly.length <= 2) {
      setExpiry(digitsOnly);
    } else {
      setExpiry(`${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}`);
    }
  };

  const handleCvvChange = (val: string) => {
    setCvv(val.replace(/\D/g, "").slice(0, 4));
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim() || cardNumber.length < 19 || expiry.length < 5 || cvv.length < 3) {
      toast.error("Please enter valid card details to authorize payment.");
      return;
    }

    setStep("processing");
    
    // Simulate real bank payment gateway transaction verification
    setTimeout(async () => {
      try {
        await updateSettings({
          subscriptionTier: targetTier,
          subscriptionStatus: "active"
        });
        
        setStep("success");
        toast.success(`Welcome to the ${plan.name}! Your account has been upgraded.`);
        onSuccess?.();
      } catch (err) {
        setStep("form");
        const errMsg = err instanceof Error ? err.message : "Database update failed";
        toast.error(`Payment approved, but failed to update subscription settings: ${errMsg}`);
      }
    }, 3000);
  };

  const handleClose = () => {
    setStep("form");
    setCardName("");
    setCardNumber("");
    setExpiry("");
    setCvv("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-2xl border border-border shadow-2xl p-0">
        {step === "form" && (
          <form onSubmit={handleSubmitPayment}>
            <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-950 border-b border-border/50">
              <DialogHeader className="text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase text-[10px] font-bold tracking-widest">
                    Checkout Portal
                  </Badge>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <Lock className="h-3 w-3 text-emerald-500" /> Secure Gateway
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold tracking-tight text-foreground font-sans">
                  Migrate to {plan.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Authorize your billing profile to activate advanced features instantly.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/[0.02] shadow-3xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Subscription Amount</p>
                  <p className="text-2xl font-extrabold tracking-tight text-foreground mt-1">
                    ₦{plan.priceNgn.toLocaleString("en-NG")}
                    <span className="text-xs font-medium text-muted-foreground">/mo</span>
                  </p>
                </div>
                <div className="text-right">
                  <Badge className="bg-emerald-500 text-white font-bold text-xs px-2.5 py-1">
                    ${plan.priceUsd}/mo
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2.5">
                <Label htmlFor="cardName" className="text-xs font-bold text-slate-700 dark:text-slate-300">Name on Card</Label>
                <div className="relative">
                  <Input 
                    id="cardName"
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    placeholder="e.g. Kola Alabi"
                    className="pl-9 text-xs"
                    required
                  />
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="cardNumber" className="text-xs font-bold text-slate-700 dark:text-slate-300">Card Number</Label>
                <div className="relative">
                  <Input 
                    id="cardNumber"
                    value={cardNumber}
                    onChange={e => handleCardNumberChange(e.target.value)}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    className="pl-9 text-xs font-mono font-semibold"
                    required
                  />
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <Label htmlFor="expiry" className="text-xs font-bold text-slate-700 dark:text-slate-300">Expiry Date</Label>
                  <Input 
                    id="expiry"
                    value={expiry}
                    onChange={e => handleExpiryChange(e.target.value)}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="text-xs font-mono font-semibold text-center"
                    required
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="cvv" className="text-xs font-bold text-slate-700 dark:text-slate-300">CVV</Label>
                  <Input 
                    id="cvv"
                    type="password"
                    value={cvv}
                    onChange={e => handleCvvChange(e.target.value)}
                    placeholder="123"
                    maxLength={4}
                    className="text-xs font-mono font-semibold text-center"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full h-10 gap-2 font-bold shadow-xs">
                  Authorize & Pay ₦{plan.priceNgn.toLocaleString("en-NG")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-[10px] text-center text-muted-foreground mt-2.5 flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Bank-grade 256-bit encryption. All funds processed securely.
                </p>
              </div>
            </div>
          </form>
        )}

        {step === "processing" && (
          <div className="p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
              <Lock className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">Processing Secure Payment</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2 max-w-xs leading-relaxed">
              Verifying your billing credentials with the central payment processor. Please do not close or reload this window.
            </DialogDescription>
            <div className="mt-8 px-4 py-2.5 bg-muted/50 rounded-lg border text-[10px] text-muted-foreground font-mono">
              SECURE_ID: TXN_{Math.floor(100000 + Math.random() * 900000)}
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="p-8 text-center flex flex-col items-center justify-center min-h-[380px] bg-gradient-to-b from-emerald-50/20 to-transparent dark:from-emerald-950/5">
            <div className="h-16 w-16 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 text-emerald-500 ring-8 ring-emerald-500/5 animate-bounce">
              <CheckCircle className="h-10 w-10" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5 justify-center">
              Migration Successful <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
              Your billing was successfully authorized. Your subscription tier is now updated to <strong className="text-foreground">{plan.name}</strong> and all features are instantly unlocked.
            </DialogDescription>

            <div className="my-6 w-full max-w-xs p-4 rounded-xl border bg-card text-left space-y-2">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Unlocked Modules</p>
              <div className="space-y-1.5">
                {plan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-foreground font-semibold">
                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
                    {feat}
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleClose} className="w-full max-w-xs h-10 font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs">
              Complete & Return
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
