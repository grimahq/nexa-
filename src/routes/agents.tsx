import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocs
} from "firebase/firestore";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Copy, 
  Check, 
  LogOut, 
  Settings, 
  Layers, 
  ChevronRight, 
  ShieldAlert, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRightLeft, 
  UserPlus, 
  LogIn, 
  Percent, 
  BadgePercent,
  Calculator,
  Award,
  Clock,
  Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/agents")({
  component: AgentsPage,
});

interface AgentProfile {
  agentId: string;
  fullName: string;
  email: string;
  referralCode: string;
  referralLink: string;
  status: "pending" | "approved" | "suspended";
  commissionRulesApplied: string;
  earnings: {
    pending: number;
    paid: number;
    reversed: number;
  };
  createdAt: string;
}

interface ReferralRecord {
  id: string;
  agentId: string;
  storeId: string;
  status: "pending" | "converted" | "churned";
  createdAt: string;
  convertedAt?: string;
  churnedAt?: string;
  storeName?: string;
  planName?: string;
}

interface EarningRecord {
  id: string;
  agentId: string;
  referralId: string;
  storeId: string;
  subscriptionEventId: string;
  amount: number;
  commissionType: "onboarding_bonus" | "recurring_residual" | "clawback";
  status: "pending" | "paid" | "reversed";
  timestamp: string;
  storeName?: string;
}

export function AgentsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Stats calculation
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);

  // Auth Inputs
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [customRefCodeInput, setCustomRefCodeInput] = useState("");

  // Settings
  const [settingsName, setSettingsName] = useState("");
  const [settingsRefCode, setSettingsRefCode] = useState("");
  const [activeTab, setActiveTab] = useState<"performance" | "referrals" | "earnings" | "settings">("performance");

  // Copy Feedback
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Commission Simulator State
  const [simStores, setSimStores] = useState(5);
  const [simTier, setSimTier] = useState<"professional" | "enterprise">("professional");

  // Load user session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch Agent profile
        const agentDocRef = doc(db, "agents", user.uid);
        const unsubscribeProfile = onSnapshot(agentDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as AgentProfile;
            setAgentProfile(data);
            setSettingsName(data.fullName);
            setSettingsRefCode(data.referralCode);
          } else {
            // Profile doesn't exist, which might mean this is a merchant user trying to view agents
            setAgentProfile(null);
          }
          setLoading(false);
        });

        // Fetch Referrals
        const referralsQuery = query(collection(db, "referrals"), where("agentId", "==", user.uid));
        const unsubscribeReferrals = onSnapshot(referralsQuery, async (snap) => {
          const rawRefs: ReferralRecord[] = [];
          for (const d of snap.docs) {
            const data = d.data();
            let storeName = "Nexa Store";
            let planName = "Starter";

            try {
              const storeSnap = await getDoc(doc(db, "stores", data.storeId));
              if (storeSnap.exists()) {
                const sData = storeSnap.data();
                storeName = sData.storeName || "Nexa Store";
                planName = sData.subscriptionTier || "Starter";
              }
            } catch (err) {
              console.warn("Failed to fetch store detail for referral:", err);
            }

            rawRefs.push({
              id: d.id,
              agentId: data.agentId,
              storeId: data.storeId,
              status: data.status,
              createdAt: data.createdAt,
              convertedAt: data.convertedAt,
              churnedAt: data.churnedAt,
              storeName,
              planName
            });
          }
          setReferrals(rawRefs);
        });

        // Fetch Earnings
        const earningsQuery = query(collection(db, "agentEarnings"), where("agentId", "==", user.uid));
        const unsubscribeEarnings = onSnapshot(earningsQuery, async (snap) => {
          const rawEarn: EarningRecord[] = [];
          for (const d of snap.docs) {
            const data = d.data();
            let storeName = "Nexa Store";
            try {
              const storeSnap = await getDoc(doc(db, "stores", data.storeId));
              if (storeSnap.exists()) {
                storeName = storeSnap.data().storeName || "Nexa Store";
              }
            } catch (err) {
              console.warn("Failed to fetch store name for earnings:", err);
            }

            rawEarn.push({
              id: d.id,
              agentId: data.agentId,
              referralId: data.referralId,
              storeId: data.storeId,
              subscriptionEventId: data.subscriptionEventId,
              amount: data.amount,
              commissionType: data.commissionType,
              status: data.status,
              timestamp: data.timestamp,
              storeName
            });
          }
          // Sort earnings by timestamp desc
          rawEarn.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setEarnings(rawEarn);
        });

        return () => {
          unsubscribeProfile();
          unsubscribeReferrals();
          unsubscribeEarnings();
        };
      } else {
        setAgentProfile(null);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Simulator computations
  const projectedEarnings = useMemo(() => {
    const onboardingBonus = 10000; // ₦10,000 NGN
    const monthlyPrice = simTier === "professional" ? 15000 : 45000;
    const residualPercent = 15; // 15%
    const monthlyResidual = Math.floor(monthlyPrice * (residualPercent / 100));

    const totalBonus = simStores * onboardingBonus;
    const totalResidualMonthly = simStores * monthlyResidual;
    const totalResidualAnnual = totalResidualMonthly * 12;

    return {
      onboardingBonus: totalBonus,
      monthlyResidual: totalResidualMonthly,
      annualProjected: totalBonus + totalResidualAnnual
    };
  }, [simStores, simTier]);

  // Copy to clipboard actions
  const copyReferralLink = () => {
    if (!agentProfile) return;
    navigator.clipboard.writeText(agentProfile.referralLink);
    setCopiedLink(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyReferralCode = () => {
    if (!agentProfile) return;
    navigator.clipboard.writeText(agentProfile.referralCode);
    setCopiedCode(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Onboarding / Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput || !nameInput.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const sanitizedCode = (customRefCodeInput.trim() || nameInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "") + Math.floor(100 + Math.random() * 900)).toUpperCase();

      // Check if custom ref code already exists in DB
      const querySnap = await getDocs(query(collection(db, "agents"), where("referralCode", "==", sanitizedCode)));
      if (!querySnap.empty) {
        toast.error("This referral code is already taken. Please choose another one.");
        setSubmitting(false);
        return;
      }

      // 1. Create firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      const u = userCredential.user;

      // 2. Set profile display name
      await updateProfile(u, { displayName: nameInput.trim() });

      // 3. Create users collection profile
      await setDoc(doc(db, "users", u.uid), {
        id: u.uid,
        name: nameInput.trim(),
        email: emailInput.trim(),
        role: "agent",
        onboardingCompleted: true,
        createdAt: new Date().toISOString()
      });

      // 4. Create agents collection entry
      const link = `${window.location.origin}/?ref=${sanitizedCode}`;
      await setDoc(doc(db, "agents", u.uid), {
        agentId: u.uid,
        fullName: nameInput.trim(),
        email: emailInput.trim(),
        referralCode: sanitizedCode,
        referralLink: link,
        status: "pending",
        commissionRulesApplied: "default",
        earnings: { pending: 0, paid: 0, reversed: 0 },
        createdAt: new Date().toISOString()
      });

      toast.success("Application submitted successfully! Awaiting Super Admin approval.");
      setShowAuthModal(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      toast.error("Please enter email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      toast.success("Welcome back to NexaOS Agent Deck!");
      setShowAuthModal(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !agentProfile) return;

    if (!settingsName.trim() || !settingsRefCode.trim()) {
      toast.error("Full Name and Referral Code cannot be empty.");
      return;
    }

    const uppercaseCode = settingsRefCode.trim().toUpperCase();

    try {
      // If code changed, verify uniqueness
      if (uppercaseCode !== agentProfile.referralCode) {
        const querySnap = await getDocs(query(collection(db, "agents"), where("referralCode", "==", uppercaseCode)));
        if (!querySnap.empty) {
          toast.error("This referral code is already taken. Please choose another one.");
          return;
        }
      }

      const updatedLink = `${window.location.origin}/?ref=${uppercaseCode}`;

      // Update users collection
      await updateDoc(doc(db, "users", currentUser.uid), {
        name: settingsName.trim()
      });

      // Update agents collection
      await updateDoc(doc(db, "agents", currentUser.uid), {
        fullName: settingsName.trim(),
        referralCode: uppercaseCode,
        referralLink: updatedLink
      });

      toast.success("Agent profile settings updated successfully!");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // Sign out
  const handleLogout = async () => {
    await signOut(auth);
    toast.success("Logged out successfully.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <Layers className="h-10 w-10 text-primary animate-bounce" />
          <p className="text-sm font-medium text-slate-400">Loading Agent Workspace...</p>
        </div>
      </div>
    );
  }

  // View routing based on auth state and approval status
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-primary/30">
      
      {/* HEADER BAR */}
      <nav className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <BadgePercent className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white block">NEXA<span className="text-emerald-500">OS</span> Agent Platform</span>
            <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Growth Network</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUser && agentProfile ? (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-semibold text-white block">{agentProfile.fullName}</span>
                <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider block">ID: {agentProfile.referralCode}</span>
              </div>
              <Button size="sm" variant="outline" onClick={handleLogout} className="border-slate-800 text-slate-300 hover:bg-slate-900">
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Logout
              </Button>
            </div>
          ) : currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Not an approved Agent?</span>
              <Button size="sm" variant="outline" onClick={handleLogout} className="border-slate-800 text-slate-300 hover:bg-slate-900">
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Logout
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => { setAuthTab("login"); setShowAuthModal(true); }} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold">
              <LogIn className="h-3.5 w-3.5 mr-1.5" /> Agent Sign In
            </Button>
          )}
        </div>
      </nav>

      {/* RENDER VIEW ACCORDING TO STATE */}
      {!currentUser ? (
        
        /* 1. AGENT PROGRAM LANDING PAGE */
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-20 space-y-24">
          
          {/* HERO BANNER */}
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1 font-semibold text-xs tracking-wider uppercase">
              🚀 Join NexaOS Affiliate Program
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Empower Local Merchants. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500">
                Build Lifetime Residual Income.
              </span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed">
              Introduce businesses to NexaOS, the premier multi-tenant business suite in Nigeria. Help them manage inventory, process sales, and scale seamlessly while earning top-tier commissions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" onClick={() => { setAuthTab("register"); setShowAuthModal(true); }} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-extrabold h-12 px-8 shadow-lg shadow-emerald-500/20">
                Apply to Become an Agent <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => { setAuthTab("login"); setShowAuthModal(true); }} className="border-slate-800 text-slate-200 hover:bg-slate-900 h-12 px-8">
                Access Partner Deck
              </Button>
            </div>
          </div>

          {/* DUAL COMMISSION MODEL GRID */}
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight">Our Double-Engine Commission Model</h2>
              <p className="text-sm text-slate-400 max-w-xl mx-auto">We value your growth. Get rewarded instantly upon activation and maintain long-term equity.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-slate-900/40 border border-slate-900 shadow-none hover:border-emerald-500/20 transition-all">
                <CardContent className="p-8 space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">₦10,000 Initial Activation Bonus</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Earn an instant bonus of ₦10,000 NGN the moment your referred merchant upgrades from the Starter plan to any of our paid plans (Professional or Enterprise).
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-400" /> Applies to first successful payment event
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-400" /> Fully integrated with subscription pipeline
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/40 border border-slate-900 shadow-none hover:border-emerald-500/20 transition-all">
                <CardContent className="p-8 space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-teal-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">15% Lifetime Recurring Residuals</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Keep earning month after month. Receive a 15% recurring residual cut of every subsequent monthly subscription fee your referred store processes.
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-teal-400" /> Professional Plan residual: ₦2,250 NGN/month
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-teal-400" /> Enterprise Plan residual: ₦6,750 NGN/month
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* COMMISSION SIMULATOR CALCULATOR */}
          <Card className="bg-slate-900/30 border border-slate-900/80 p-8 max-w-4xl mx-auto rounded-2xl">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <Calculator className="h-4 w-4" /> Commission Projection Tool
                  </div>
                  <h3 className="text-2xl font-bold text-white">Simulate Your Income</h3>
                  <p className="text-sm text-slate-400">Drag the sliders to project how much you can earn as a registered NexaOS growth partner.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-300 font-semibold">
                      <span>Referred Active Paid Stores</span>
                      <span className="text-emerald-400">{simStores} Stores</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="50" 
                      value={simStores} 
                      onChange={(e) => setSimStores(parseInt(e.target.value))}
                      className="w-full accent-emerald-500 bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer" 
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs text-slate-300 font-semibold block">Store Subscription Plan Preference</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setSimTier("professional")}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                          simTier === "professional" 
                            ? "bg-slate-800 border-emerald-500 text-white" 
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/50"
                        }`}
                      >
                        Professional (₦15k/mo)
                      </button>
                      <button 
                        onClick={() => setSimTier("enterprise")}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                          simTier === "enterprise" 
                            ? "bg-slate-800 border-emerald-500 text-white" 
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/50"
                        }`}
                      >
                        Enterprise (₦45k/mo)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SIMULATION RESULTS CARD */}
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-900 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">One-time Activation Bonuses</span>
                  <p className="text-2xl font-bold text-white">₦{projectedEarnings.onboardingBonus.toLocaleString()}</p>
                </div>
                <div className="space-y-1 border-t border-slate-900 pt-4">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">Recurring Monthly Residuals</span>
                  <p className="text-2xl font-bold text-emerald-400">₦{projectedEarnings.monthlyResidual.toLocaleString()}<span className="text-xs text-slate-500"> /month</span></p>
                </div>
                <div className="space-y-1 border-t border-slate-900 pt-4">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">12-Month Projected Earnings</span>
                  <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                    ₦{projectedEarnings.annualProjected.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>

        </div>
      ) : agentProfile && agentProfile.status === "pending" ? (
        
        /* 2. APPLICATION PENDING STATE */
        <div className="max-w-md mx-auto px-6 py-24 text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto animate-pulse">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Application Under Review</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Thank you, <span className="text-white font-semibold">{agentProfile.fullName}</span>! Your request to become a registered partner is currently being processed by our compliance team.
            </p>
          </div>
          <Card className="bg-slate-900/40 border border-slate-900 shadow-none text-left p-4 space-y-3">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Submitted Details:</span>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Registered Email:</span>
                <span className="text-slate-300 font-mono">{agentProfile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Requested Referral Code:</span>
                <span className="text-slate-300 font-mono">{agentProfile.referralCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 py-0.5 text-[10px]">
                  Awaiting Super Admin Approval
                </Badge>
              </div>
            </div>
          </Card>
          <p className="text-xs text-slate-500">Once approved, you will gain access to your link syndication dashboard immediately.</p>
        </div>
      ) : agentProfile && agentProfile.status === "approved" ? (
        
        /* 3. FULL APPROVED AGENT DASHBOARD */
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
          
          {/* WELCOME BLOCK WITH REFERRAL LINK */}
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Partner Workspace: {agentProfile.fullName}</h2>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold">Approved Partner</Badge>
              </div>
              <p className="text-sm text-slate-400">Share your custom link below or write down your code to begin tracking activations.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-900 text-xs text-slate-300 font-mono">
                <span>Code: {agentProfile.referralCode}</span>
                <button onClick={copyReferralCode} className="text-slate-500 hover:text-white transition-all pl-2 border-l border-slate-900">
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-2 bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-900 text-xs text-slate-300 font-mono">
                <span className="truncate max-w-[200px]">{agentProfile.referralLink}</span>
                <button onClick={copyReferralLink} className="text-slate-500 hover:text-white transition-all pl-2 border-l border-slate-900">
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* KPI CARDS GRID */}
          <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
            <Card className="bg-slate-900/30 border border-slate-900 shadow-none p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase block">Total Referrals</span>
                <p className="text-2xl font-bold text-white">{referrals.length}</p>
                <span className="text-[10px] text-slate-500 font-medium">Click-through signs</span>
              </div>
              <div className="h-10 w-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
            </Card>

            <Card className="bg-slate-900/30 border border-slate-900 shadow-none p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase block">Conversions</span>
                <p className="text-2xl font-bold text-white">{referrals.filter(r => r.status === "converted").length}</p>
                <span className="text-[10px] text-emerald-400 font-bold block">
                  {referrals.length > 0 
                    ? Math.round((referrals.filter(r => r.status === "converted").length / referrals.length) * 100)
                    : 0}% Activation rate
                </span>
              </div>
              <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
            </Card>

            <Card className="bg-slate-900/30 border border-slate-900 shadow-none p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase block">Pending Clearance</span>
                <p className="text-2xl font-bold text-amber-400">₦{(agentProfile.earnings?.pending || 0).toLocaleString()}</p>
                <span className="text-[10px] text-slate-500 block">Awaiting monthly disbursement</span>
              </div>
              <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
            </Card>

            <Card className="bg-slate-900/30 border border-slate-900 shadow-none p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase block">Lifetime Paid Out</span>
                <p className="text-2xl font-bold text-emerald-400 font-sans">₦{(agentProfile.earnings?.paid || 0).toLocaleString()}</p>
                <span className="text-[10px] text-slate-500 block">Settled to bank account</span>
              </div>
              <div className="h-10 w-10 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-teal-400" />
              </div>
            </Card>
          </div>

          {/* MAIN TABS BAR */}
          <div className="border-b border-slate-900 flex items-center gap-4">
            <button 
              onClick={() => setActiveTab("performance")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "performance" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              Overview & Analytics
            </button>
            <button 
              onClick={() => setActiveTab("referrals")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "referrals" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              Referred Stores ({referrals.length})
            </button>
            <button 
              onClick={() => setActiveTab("earnings")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "earnings" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              Earnings Ledger ({earnings.length})
            </button>
            <button 
              onClick={() => setActiveTab("settings")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === "settings" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              Profile & Settings
            </button>
          </div>

          {/* ACTIVE TAB RENDERER */}
          <div className="space-y-6">
            
            {/* OVERVIEW TAB */}
            {activeTab === "performance" && (
              <div className="grid md:grid-cols-3 gap-6">
                
                {/* ACTIVE RULES CARD */}
                <Card className="bg-slate-900/20 border border-slate-900 md:col-span-1 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-emerald-400" /> Commission Settings
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">Your currently assigned rate plan.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="flex justify-between border-b border-slate-900/60 pb-2">
                      <span className="text-slate-400">Onboarding Bonus:</span>
                      <span className="font-bold text-white">₦10,000 NGN</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/60 pb-2">
                      <span className="text-slate-400">Recurring residuals:</span>
                      <span className="font-bold text-emerald-400">15% Monthly</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/60 pb-2">
                      <span className="text-slate-400">Clawback Duration:</span>
                      <span className="font-bold text-white">30 Days window</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-slate-400">Commission Rule:</span>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase text-[9px] font-mono font-bold">DEFAULT_PLAN</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* EARNINGS PROJECTION PREVIEW */}
                <Card className="bg-slate-900/20 border border-slate-900 md:col-span-2 shadow-none p-6 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold uppercase tracking-wider">
                      <Sparkles className="h-4 w-4" /> Next Clearance Run
                    </div>
                    <h3 className="text-lg font-bold text-white">Disbursements Cycle</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      All accrued onboarding bonuses and recurring commission residuals enter a standard 30-day clearance cycle before being verified and paid out. Payouts are dispatched directly to your designated bank accounts on the 1st of every month.
                    </p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex justify-between items-center text-xs mt-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-emerald-400" />
                      <span className="text-slate-400 font-medium">Next Payout Dispatches:</span>
                    </div>
                    <span className="font-bold text-white uppercase tracking-wide">August 1, 2026</span>
                  </div>
                </Card>

              </div>
            )}

            {/* REFERRALS TAB */}
            {activeTab === "referrals" && (
              <Card className="bg-slate-900/20 border border-slate-900 shadow-none">
                <CardContent className="p-0 overflow-x-auto">
                  {referrals.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <Users className="h-8 w-8 text-slate-600 mx-auto" />
                      <p className="text-sm text-slate-400 font-medium">No referred stores tracked yet.</p>
                      <p className="text-xs text-slate-500">Share your referral link with business owners to start earning.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-400 uppercase tracking-wider font-semibold">
                          <th className="p-4">Store Name</th>
                          <th className="p-4">Signup Date</th>
                          <th className="p-4">Current Plan</th>
                          <th className="p-4">Attribution Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/55 text-slate-300">
                        {referrals.map((ref) => (
                          <tr key={ref.id} className="hover:bg-slate-900/10">
                            <td className="p-4 font-bold text-white">{ref.storeName}</td>
                            <td className="p-4">{new Date(ref.createdAt).toLocaleDateString()}</td>
                            <td className="p-4 uppercase font-mono font-bold text-[10px] text-emerald-500">{ref.planName}</td>
                            <td className="p-4">
                              {ref.status === "pending" && (
                                <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] uppercase font-bold">
                                  Pending Activation (Free)
                                </Badge>
                              )}
                              {ref.status === "converted" && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-bold">
                                  Converted (Active Paid)
                                </Badge>
                              )}
                              {ref.status === "churned" && (
                                <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] uppercase font-bold">
                                  Churned (Cancelled)
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* EARNINGS LEDGER TAB */}
            {activeTab === "earnings" && (
              <Card className="bg-slate-900/20 border border-slate-900 shadow-none">
                <CardContent className="p-0 overflow-x-auto">
                  {earnings.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <ArrowRightLeft className="h-8 w-8 text-slate-600 mx-auto" />
                      <p className="text-sm text-slate-400 font-medium">No earnings ledger records found.</p>
                      <p className="text-xs text-slate-500">Commissions will automatically populate when referred stores upgrade to paid subscriptions.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-400 uppercase tracking-wider font-semibold">
                          <th className="p-4">Date</th>
                          <th className="p-4">Store Location</th>
                          <th className="p-4">Commission Type</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Clearance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/55 text-slate-300">
                        {earnings.map((ear) => (
                          <tr key={ear.id} className="hover:bg-slate-900/10">
                            <td className="p-4">{new Date(ear.timestamp).toLocaleDateString()}</td>
                            <td className="p-4 font-semibold text-white">{ear.storeName}</td>
                            <td className="p-4">
                              {ear.commissionType === "onboarding_bonus" && (
                                <span className="font-semibold text-blue-400">Onboarding Activation Bonus</span>
                              )}
                              {ear.commissionType === "recurring_residual" && (
                                <span className="font-semibold text-teal-400">Monthly Residual Commission</span>
                              )}
                              {ear.commissionType === "clawback" && (
                                <span className="font-semibold text-red-400">Early Cancellation Clawback</span>
                              )}
                            </td>
                            <td className="p-4 font-mono font-bold text-sm">
                              {ear.amount < 0 ? (
                                <span className="text-red-400">-₦{Math.abs(ear.amount).toLocaleString()}</span>
                              ) : (
                                <span className="text-emerald-400">+₦{ear.amount.toLocaleString()}</span>
                              )}
                            </td>
                            <td className="p-4">
                              {ear.status === "pending" && (
                                <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] uppercase font-bold">
                                  Pending Clearance
                                </Badge>
                              )}
                              {ear.status === "paid" && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-bold">
                                  Cleared & Paid
                                </Badge>
                              )}
                              {ear.status === "reversed" && (
                                <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] uppercase font-bold">
                                  Reversed
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <Card className="bg-slate-900/20 border border-slate-900 shadow-none max-w-xl">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Settings className="h-4 w-4 text-emerald-400" /> Edit Profile Details
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">Update your partner identity information.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveSettings} className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="settingsName" className="text-xs text-slate-400">Full Name</Label>
                      <Input 
                        id="settingsName" 
                        value={settingsName} 
                        onChange={(e) => setSettingsName(e.target.value)} 
                        className="bg-slate-950 border-slate-900 text-white placeholder-slate-600 focus:border-emerald-500/40 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="settingsCode" className="text-xs text-slate-400">Referral Code (Uppercase only)</Label>
                      <Input 
                        id="settingsCode" 
                        value={settingsRefCode} 
                        onChange={(e) => setSettingsRefCode(e.target.value.toUpperCase())} 
                        className="bg-slate-950 border-slate-900 text-white placeholder-slate-600 focus:border-emerald-500/40 font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Registered Email Address</Label>
                      <Input 
                        value={agentProfile.email} 
                        disabled 
                        className="bg-slate-900/40 border-slate-950 text-slate-500 font-mono text-xs cursor-not-allowed"
                      />
                    </div>

                    <Button type="submit" className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold text-xs h-9">
                      Save Profile Changes
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

          </div>

        </div>
      ) : (
        
        /* 4. EXPLICIT NOT REGISTERED STATE */
        <div className="max-w-md mx-auto px-6 py-24 text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">No Agent Account Found</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your logged-in user account is not registered as an Affiliate Agent. To join our agent growth network, apply below.
            </p>
          </div>
          <Button onClick={() => { setAuthTab("register"); setShowAuthModal(true); }} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold">
            <UserPlus className="h-4 w-4 mr-2" /> Apply Now
          </Button>
        </div>
      )}

      {/* AUTH MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">
                  {authTab === "login" ? "Partner Login" : "Agent Application"}
                </h3>
                <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-white text-xs">
                  Close
                </button>
              </div>

              <form onSubmit={authTab === "login" ? handleLogin : handleSignUp} className="space-y-4">
                {authTab === "register" && (
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-xs text-slate-400">Full Name</Label>
                    <Input 
                      id="name"
                      type="text"
                      placeholder="e.g. John Doe"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500/40 text-xs h-10"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs text-slate-400">Email Address</Label>
                  <Input 
                    id="email"
                    type="email"
                    placeholder="e.g. partner@nexaos.io"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500/40 text-xs h-10"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pass" className="text-xs text-slate-400">Password</Label>
                  <Input 
                    id="pass"
                    type="password"
                    placeholder="Secure password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500/40 text-xs h-10"
                  />
                </div>

                {authTab === "register" && (
                  <div className="space-y-1">
                    <Label htmlFor="ref" className="text-xs text-slate-400">Preferred Referral Code (Optional)</Label>
                    <Input 
                      id="ref"
                      type="text"
                      placeholder="e.g. JOHNDEAL"
                      value={customRefCodeInput}
                      onChange={(e) => setCustomRefCodeInput(e.target.value.toUpperCase())}
                      className="bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-emerald-500/40 text-xs h-10 font-mono"
                    />
                  </div>
                )}

                <Button type="submit" disabled={submitting} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold h-10 text-xs">
                  {submitting ? "Processing..." : authTab === "login" ? "Sign In to Deck" : "Submit Agent Registration"}
                </Button>
              </form>

              <div className="text-center">
                <button 
                  onClick={() => setAuthTab(authTab === "login" ? "register" : "login")}
                  className="text-xs text-slate-400 hover:text-emerald-400 transition-all font-medium"
                >
                  {authTab === "login" ? "New partner? Submit application" : "Already an approved agent? Sign in"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
