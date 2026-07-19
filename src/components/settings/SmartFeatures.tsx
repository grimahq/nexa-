import { useState, useEffect } from "react";
import { 
  Zap, 
  Bell, 
  ArrowDownUp, 
  Save, 
  Lock, 
  Sparkles, 
  Layers, 
  Globe, 
  TrendingUp, 
  Coins, 
  Mail, 
  CheckCircle2, 
  ArrowRight,
  Shield,
  Info,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface SmartFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tier: "starter" | "professional" | "enterprise";
}

const SMART_FEATURES_LIST: SmartFeature[] = [
  // Starter Tier Features
  {
    id: "lowStockAlerts",
    name: "Low Stock Alerts",
    description: "Instant in-app alerts when inventory falls below designated safety stock thresholds.",
    icon: Bell,
    tier: "starter"
  },
  {
    id: "salesNotifications",
    name: "Sales Notifications",
    description: "Receive push alerts and visual toast updates on your dashboard for completed orders.",
    icon: TrendingUp,
    tier: "starter"
  },
  // Professional Tier Features
  {
    id: "autoReorder",
    name: "AI Auto-Reorder Predictions",
    description: "Utilizes historical sales velocity and supplier lead-time datasets to propose optimal replenishment values.",
    icon: ArrowDownUp,
    tier: "professional"
  },
  {
    id: "multiBranchSync",
    name: "Multi-Branch Stock Synchronization",
    description: "Inter-branch stock visibility and real-time inventory transfers between registered physical outlets.",
    icon: Layers,
    tier: "professional"
  },
  {
    id: "weeklyEmailDigest",
    name: "Automated Daily Email Digest",
    description: "Get full-spectrum executive-level stock movement and sales logs delivered straight to your email inbox.",
    icon: Mail,
    tier: "professional"
  },
  // Enterprise Tier Features
  {
    id: "smartCohorts",
    name: "AI Smart Customer Cohorts",
    description: "Leverage advanced learning models to automatically group customer profiles and predict customer lifetime values.",
    icon: Sparkles,
    tier: "enterprise"
  },
  {
    id: "b2bMarketplaceSync",
    name: "B2B Marketplace Digital Sync",
    description: "Instantly showcase selected store inventory profiles to our global b2b business search directory.",
    icon: Globe,
    tier: "enterprise"
  },
  {
    id: "aiPricing",
    name: "Dynamic AI Pricing Optimization",
    description: "Algorithms adjust localized pricing based on localized supply-demand curves and seasonal indicators.",
    icon: Coins,
    tier: "enterprise"
  }
];

export function SmartFeatures() {
  const { flags } = useFeatureFlags();
  const currentTier = flags.planId || "starter"; // "starter", "professional", "enterprise"

  // Load state from localStorage or use defaults
  const [featureStates, setFeatureStates] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("nexa_smart_features");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      lowStockAlerts: true,
      salesNotifications: true,
      autoReorder: false,
      multiBranchSync: false,
      weeklyEmailDigest: false,
      smartCohorts: false,
      b2bMarketplaceSync: false,
      aiPricing: false,
    };
  });

  const handleToggle = (id: string, tier: "starter" | "professional" | "enterprise") => {
    // Check permission based on tier
    if (tier === "professional" && currentTier === "starter") {
      toast.error("Please upgrade to the Professional Plan to activate this feature.", {
        description: "Access AI predictive reordering, multi-branch sync, and more."
      });
      return;
    }
    if (tier === "enterprise" && currentTier !== "enterprise") {
      toast.error("Please upgrade to the Enterprise Plan to activate this feature.", {
        description: "Access B2B market sync, cohort analysis, and dynamic pricing."
      });
      return;
    }

    setFeatureStates(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSave = () => {
    localStorage.setItem("nexa_smart_features", JSON.stringify(featureStates));
    toast.success("Smart features configuration saved successfully!");
  };

  // Helper to check if a tier is unlocked
  const isTierUnlocked = (tier: "starter" | "professional" | "enterprise") => {
    if (tier === "starter") return true;
    if (tier === "professional") return currentTier === "professional" || currentTier === "enterprise";
    if (tier === "enterprise") return currentTier === "enterprise";
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Active License Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-teal-500/10 bg-teal-50/20 dark:bg-teal-950/10 p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20 text-[10px] font-bold uppercase tracking-wider">
              {flags.planName}
            </Badge>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground font-medium">Active License</span>
          </div>
          <h3 className="text-lg font-bold font-sans tracking-tight">
            Store Smart Features Console
          </h3>
          <p className="text-xs text-muted-foreground max-w-xl">
            Empower your team and storefront with advanced intelligence tools. Some features are gated according to your subscription tier.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-muted/40 px-4 py-2.5 rounded-lg border border-border shadow-2xs">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Current Limit</p>
            <p className="text-xs font-bold text-foreground">{flags.maxBranches} Registered Outlets</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Toggle Switches Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Starter Tier Features */}
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Free Starter Tier
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Core operations features enabled for all stores.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-muted text-muted-foreground">Free</Badge>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border/40 pt-1">
              {SMART_FEATURES_LIST.filter(f => f.tier === "starter").map((feat) => {
                const Icon = feat.icon;
                return (
                  <div key={feat.id} className="flex items-center justify-between gap-4 py-4.5">
                    <div className="flex items-start gap-3.5 max-w-lg">
                      <div className="h-9 w-9 rounded-lg bg-teal-500/5 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 border border-teal-500/10">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <Label htmlFor={feat.id} className="text-xs font-semibold text-foreground cursor-pointer block">{feat.name}</Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{feat.description}</p>
                      </div>
                    </div>
                    <Switch 
                      id={feat.id}
                      checked={featureStates[feat.id]} 
                      onCheckedChange={() => handleToggle(feat.id, "starter")} 
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Professional Tier Features */}
          <Card className={`shadow-xs border-border/80 transition-all duration-200 ${!isTierUnlocked("professional") ? "bg-muted/10 opacity-90" : ""}`}>
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Professional Tier
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Scale operations with intelligent optimization models.</CardDescription>
                </div>
                {!isTierUnlocked("professional") ? (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 uppercase tracking-wider">
                    <Lock className="h-3 w-3" /> Locked
                  </div>
                ) : (
                  <Badge variant="outline" className="bg-purple-500/5 text-purple-600 border-purple-500/20">Unlocked</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border/40 pt-1 relative">
              {/* Lock overlay visual indicators */}
              {!isTierUnlocked("professional") && (
                <div className="absolute inset-0 bg-muted/5 dark:bg-zinc-950/5 backdrop-blur-[0.5px] rounded-b-xl z-20 flex items-center justify-center pointer-events-none">
                  <div className="bg-white dark:bg-zinc-900 border border-border shadow-md rounded-lg px-4 py-3 text-center pointer-events-auto max-w-xs transform translate-y-1">
                    <Lock className="h-5 w-5 mx-auto mb-1.5 text-purple-500" />
                    <p className="text-xs font-bold text-foreground">Upgrade Required</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Unlock Professional features on your Store Settings panel today.</p>
                  </div>
                </div>
              )}

              {SMART_FEATURES_LIST.filter(f => f.tier === "professional").map((feat) => {
                const Icon = feat.icon;
                return (
                  <div key={feat.id} className="flex items-center justify-between gap-4 py-4.5">
                    <div className="flex items-start gap-3.5 max-w-lg">
                      <div className="h-9 w-9 rounded-lg bg-purple-500/5 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 border border-purple-500/10">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <Label htmlFor={feat.id} className="text-xs font-semibold text-foreground cursor-pointer block">{feat.name}</Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{feat.description}</p>
                      </div>
                    </div>
                    <Switch 
                      id={feat.id}
                      disabled={!isTierUnlocked("professional")}
                      checked={featureStates[feat.id]} 
                      onCheckedChange={() => handleToggle(feat.id, "professional")} 
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Enterprise Tier Features */}
          <Card className={`shadow-xs border-border/80 transition-all duration-200 ${!isTierUnlocked("enterprise") ? "bg-muted/10 opacity-90" : ""}`}>
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Enterprise Tier
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">Automate and syndicate multi-channel pipelines seamlessly.</CardDescription>
                </div>
                {!isTierUnlocked("enterprise") ? (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider">
                    <Lock className="h-3 w-3" /> Locked
                  </div>
                ) : (
                  <Badge variant="outline" className="bg-blue-500/5 text-blue-600 border-blue-500/20">Unlocked</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border/40 pt-1 relative">
              {/* Lock overlay visual indicators */}
              {!isTierUnlocked("enterprise") && (
                <div className="absolute inset-0 bg-muted/5 dark:bg-zinc-950/5 backdrop-blur-[0.5px] rounded-b-xl z-20 flex items-center justify-center pointer-events-none">
                  <div className="bg-white dark:bg-zinc-900 border border-border shadow-md rounded-lg px-4 py-3 text-center pointer-events-auto max-w-xs transform translate-y-1">
                    <Lock className="h-5 w-5 mx-auto mb-1.5 text-blue-500" />
                    <p className="text-xs font-bold text-foreground">Upgrade Required</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-sans">Syndicate your storefront features dynamically. Contact support for Enterprise.</p>
                  </div>
                </div>
              )}

              {SMART_FEATURES_LIST.filter(f => f.tier === "enterprise").map((feat) => {
                const Icon = feat.icon;
                return (
                  <div key={feat.id} className="flex items-center justify-between gap-4 py-4.5">
                    <div className="flex items-start gap-3.5 max-w-lg">
                      <div className="h-9 w-9 rounded-lg bg-blue-500/5 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 border border-blue-500/10">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <Label htmlFor={feat.id} className="text-xs font-semibold text-foreground cursor-pointer block">{feat.name}</Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{feat.description}</p>
                      </div>
                    </div>
                    <Switch 
                      id={feat.id}
                      disabled={!isTierUnlocked("enterprise")}
                      checked={featureStates[feat.id]} 
                      onCheckedChange={() => handleToggle(feat.id, "enterprise")} 
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-2">
            <Button onClick={handleSave} className="gap-2 shadow-xs">
              <Save className="h-4 w-4" /> Save Configuration
            </Button>
          </div>
        </div>

        {/* Pricing / Feature Proposal Table Panel */}
        <div className="space-y-6">
          <Card className="shadow-xs border-border bg-muted/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" /> Subscription Matrix
              </CardTitle>
              <CardDescription className="text-xs">Compare smart feature tiers & license pricing specs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Starter Plan details */}
              <div className="p-3.5 rounded-lg bg-white dark:bg-background border border-border shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Starter License</span>
                  <Badge className="bg-teal-500/10 hover:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-none text-[10px] font-bold">
                    Free / $0
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Excellent for local independent vendors running a single branch and basic point-of-sale catalog records.
                </p>
                <div className="pt-2 border-t border-border/40 space-y-1 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-emerald-500" /> Max 1 branch location</div>
                  <div className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-emerald-500" /> Low stock local alerts</div>
                  <div className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-emerald-500" /> Default receipts</div>
                </div>
              </div>

              {/* Professional Plan details */}
              <div className="p-3.5 rounded-lg bg-white dark:bg-background border border-purple-500/20 shadow-2xs space-y-2 relative overflow-hidden">
                <div className="absolute right-0 top-0 bg-purple-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl uppercase tracking-wider">
                  Popular
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Professional License</span>
                  <Badge className="bg-purple-500/10 hover:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-none text-[10px] font-bold">
                    $150 / mo
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Tailored for growing operations and multi-store operators.
                </p>
                <div className="pt-2 border-t border-border/40 space-y-1 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-purple-500" /> Max 3 branch locations</div>
                  <div className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-purple-500" /> AI-powered auto replenishment</div>
                  <div className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-purple-500" /> Cross-branch stock pools</div>
                  <div className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-purple-500" /> Daily summary dispatch logs</div>
                </div>
              </div>

              {/* Enterprise Plan details */}
              <div className="p-3.5 rounded-lg bg-white dark:bg-background border border-blue-500/20 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Enterprise License</span>
                  <Badge className="bg-blue-500/10 hover:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-none text-[10px] font-bold">
                    $450 / mo
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Built for high-volume enterprises require complete digital B2B catalog syndication and machine learning tools.
                </p>
                <div className="pt-2 border-t border-border/40 space-y-1 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-blue-500" /> Up to 10 branch locations</div>
                  <div className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-blue-500" /> Smart AI Cohort Analysis</div>
                  <div className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-blue-500" /> Global B2B marketplace syndication</div>
                  <div className="flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-blue-500" /> AI Pricing & Demand analytics</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

