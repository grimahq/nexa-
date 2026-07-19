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
  Briefcase,
  MapPin,
  Phone,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import "@/styles/landing.css";

export const Route = createFileRoute("/agents")({
  component: AgentsPage,
});

interface AgentProfile {
  agentId: string;
  fullName: string;
  email: string;
  phone?: string;
  region?: string;
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Stats calculation
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);

  // Auth Inputs & Steps
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [regionInput, setRegionInput] = useState("");
  const [customRefCodeInput, setCustomRefCodeInput] = useState("");
  const [registerStep, setRegisterStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Settings
  const [settingsName, setSettingsName] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsRegion, setSettingsRegion] = useState("");
  const [settingsRefCode, setSettingsRefCode] = useState("");
  const [activeTab, setActiveTab] = useState<"performance" | "referrals" | "earnings" | "settings">("performance");

  // Copy Feedback
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Commission Simulator State
  const [simStores, setSimStores] = useState(10);
  const [simTier, setSimTier] = useState<"professional" | "enterprise">("professional");

  // Load user session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Check super admin status
        const isBootstrappedAdmin = 
          user.email === "nexatechnologies.dev@gmail.com" ||
          user.email === "operations@nexa.com" ||
          user.email === "support@nexa.com";
        
        if (isBootstrappedAdmin) {
          setIsSuperAdmin(true);
        } else {
          getDoc(doc(db, "super_admins", user.uid)).then((docSnap) => {
            if (docSnap.exists() && docSnap.data()?.active !== false) {
              setIsSuperAdmin(true);
            } else {
              setIsSuperAdmin(false);
            }
          }).catch(() => {
            setIsSuperAdmin(false);
          });
        }

        // Fetch Agent profile
        const agentDocRef = doc(db, "agents", user.uid);
        const unsubscribeProfile = onSnapshot(agentDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as AgentProfile;
            setAgentProfile(data);
            setSettingsName(data.fullName);
            setSettingsPhone(data.phone || "");
            setSettingsRegion(data.region || "");
            setSettingsRefCode(data.referralCode);
          } else {
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

  // Simulator computations (₦10k Fixed Field Allowance + Onboarding Bonus + Monthly Recurring)
  const projectedEarnings = useMemo(() => {
    const flatAllowance = 10000; // ₦10,000 NGN flat on-field support
    const onboardingBonus = simTier === "professional" ? 1500 : 5000;
    const monthlyResidual = simTier === "professional" ? 500 : 1000;

    const totalBonus = simStores * onboardingBonus;
    const totalResidualMonthly = simStores * monthlyResidual;
    const totalResidualAnnual = totalResidualMonthly * 12;

    return {
      flatAllowance,
      onboardingBonus: totalBonus,
      monthlyResidual: totalResidualMonthly,
      annualProjected: flatAllowance + totalBonus + totalResidualAnnual
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

  // Step validation
  const handleNextStep = () => {
    if (registerStep === 1) {
      if (!nameInput.trim() || !emailInput.trim() || !passwordInput) {
        toast.error("Please fill in your name, email, and secure password.");
        return;
      }
      if (passwordInput.length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }
      setRegisterStep(2);
    } else if (registerStep === 2) {
      if (!phoneInput.trim()) {
        toast.error("Phone number is required for field logistics.");
        return;
      }
      if (!regionInput.trim()) {
        toast.error("Please specify your operational territory.");
        return;
      }
      setRegisterStep(3);
    }
  };

  // Onboarding / Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error("You must review and accept the partner program terms.");
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
        phone: phoneInput.trim(),
        region: regionInput.trim(),
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
        phone: phoneInput.trim(),
        region: regionInput.trim(),
        referralCode: sanitizedCode,
        referralLink: link,
        status: "pending",
        commissionRulesApplied: "default",
        earnings: { pending: 0, paid: 0, reversed: 0 },
        createdAt: new Date().toISOString()
      });

      toast.success("Application submitted successfully! Our State Lead will contact you shortly.");
      setShowAuthModal(false);
      // Reset step
      setRegisterStep(1);
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
      toast.success("Welcome back to NexaStoreOS Agent Deck!");
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
      if (uppercaseCode !== agentProfile.referralCode) {
        const querySnap = await getDocs(query(collection(db, "agents"), where("referralCode", "==", uppercaseCode)));
        if (!querySnap.empty) {
          toast.error("This referral code is already taken. Please choose another one.");
          return;
        }
      }

      const updatedLink = `${window.location.origin}/?ref=${uppercaseCode}`;

      await updateDoc(doc(db, "users", currentUser.uid), {
        name: settingsName.trim()
      });

      await updateDoc(doc(db, "agents", currentUser.uid), {
        fullName: settingsName.trim(),
        phone: settingsPhone.trim(),
        region: settingsRegion.trim(),
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
    setIsSuperAdmin(false);
    toast.success("Logged out successfully.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBFF] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-[#2B5BFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#2E3152]">Synchronizing Agent Desk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nexa-landing min-h-screen bg-[#FAFBFF] text-[#08091A] font-sans selection:bg-[#2B5BFF]/10 relative">
      
      {/* BACKGROUND DECORATIONS */}
      <div className="ambient">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      {/* HEADER BAR (EXACT LOGO & ALIGNMENT) */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div 
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => navigate({ to: "/" })}
          title="Back to Landing Page"
        >
          <div className="nav-logo-box always-animated-logo">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-7 w-7">
              <defs>
                <linearGradient id="nexaBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#083344" />
                  <stop offset="100%" stopColor="#115e59" />
                </linearGradient>
                <linearGradient id="nexaTealGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="50%" stopColor="#0d9488" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <path d="M 38,28 C 38,14 62,14 62,28" stroke="url(#nexaTealGrad)" strokeWidth="5.5" strokeLinecap="round" fill="none" />
              <path d="M 24,32 C 24,32 76,32 76,32 L 70,76 C 69,81 31,81 30,76 Z" fill="url(#nexaBgGrad)" stroke="url(#nexaTealGrad)" strokeWidth="3" strokeLinejoin="round" />
              <path className="nexa-arrow-path" d="M 20,54 C 20,44 28,38 38,44 C 48,50 46,64 54,68 C 60,71 68,68 72,58 L 80,40" stroke="url(#nexaTealGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M 68,40 H 80 V 52" stroke="url(#nexaTealGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
          <span className="font-['Bricolage_Grotesque'] text-lg font-extrabold tracking-tight text-[#08091A]">
            Nexa<span className="text-[#2B5BFF]">StoreOS</span>
            <span className="text-slate-400 font-normal text-xs uppercase tracking-wider ml-2 border-l border-slate-200 pl-2">
              Growth Partner
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate({ to: "/" })}
            className="text-slate-500 hover:text-[#08091A] hover:bg-slate-100 text-xs font-semibold rounded-full"
          >
            Back to Web
          </Button>

          {isSuperAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate({ to: "/app/super-admin/agents-network" })}
              className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold rounded-full"
            >
              Super Admin Panel
            </Button>
          )}

          {currentUser && agentProfile ? (
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-[#08091A] block">{agentProfile.fullName}</span>
                <span className="text-[10px] text-[#2B5BFF] font-extrabold uppercase tracking-wider block">ID: {agentProfile.referralCode}</span>
              </div>
              <Button size="sm" variant="outline" onClick={handleLogout} className="border-slate-200 text-slate-600 hover:bg-slate-100 rounded-full">
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Logout
              </Button>
            </div>
          ) : currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Verification Pending</span>
              <Button size="sm" variant="outline" onClick={handleLogout} className="border-slate-200 text-slate-600 hover:bg-slate-100 rounded-full">
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Logout
              </Button>
            </div>
          ) : (
            <Button 
              size="sm" 
              onClick={() => { setAuthTab("login"); setShowAuthModal(true); }} 
              className="bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold rounded-full px-4"
            >
              <LogIn className="h-3.5 w-3.5 mr-1.5" /> Agent Sign In
            </Button>
          )}
        </div>
      </nav>

      {/* RENDER VIEW ACCORDING TO STATE */}
      {!currentUser ? (
        
        /* 1. AGENT PROGRAM LANDING PAGE */
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="max-w-6xl mx-auto px-6 py-12 md:py-24 space-y-28 relative z-10"
        >
          
          {/* HERO BANNER */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
            }}
            className="text-center space-y-8 max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-4 py-1.5 rounded-full font-bold text-xs tracking-wider uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Empowering Ground Operations Across Nigeria
            </div>
            
            <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-[#08091A] leading-[1.08] font-['Bricolage_Grotesque']">
              Onboard Local Businesses. <br />
              <span className="grad-blue">Secure Lifetime Income.</span>
            </h1>
            
            <p className="text-base md:text-xl text-slate-500 leading-relaxed font-sans max-w-3xl mx-auto">
              Introduce supermarkets, boutiques, wholesale hubs, and pharmacies to NexaStoreOS. Help them automate inventory, print custom invoices, and run smoothly while you enjoy guaranteed field allowances and residual monthly income.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button 
                size="lg" 
                onClick={() => { setAuthTab("register"); setRegisterStep(1); setShowAuthModal(true); }} 
                className="bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold h-14 px-10 rounded-full shadow-lg shadow-[#2B5BFF]/15 transition-all text-sm group cursor-pointer"
              >
                Apply to Become an Agent <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => { setAuthTab("login"); setShowAuthModal(true); }} 
                className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 h-14 px-8 rounded-full text-sm cursor-pointer"
              >
                Access Agent Deck
              </Button>
            </div>
          </motion.div>

          {/* NETWORK TRUST STATS BANNER */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 } }
            }}
            className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4 max-w-5xl mx-auto py-10 border border-slate-100 bg-white/60 backdrop-blur-md rounded-3xl px-6 shadow-sm"
          >
            <div className="text-center space-y-1">
              <p className="text-2xl md:text-4xl font-black text-[#08091A] font-['Bricolage_Grotesque'] tracking-tight flex items-center justify-center">
                <span className="font-sans text-xl md:text-2xl font-extrabold mr-0.5">₦</span>14.5M+
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Total Paid to Agents</p>
            </div>
            <div className="text-center space-y-1 border-l border-slate-100">
              <p className="text-2xl md:text-4xl font-black text-[#2B5BFF] font-['Bricolage_Grotesque'] tracking-tight">480+</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Stores Onboarded</p>
            </div>
            <div className="text-center space-y-1 border-t border-slate-100 md:border-t-0 md:border-l pt-4 md:pt-0">
              <p className="text-2xl md:text-4xl font-black text-[#12D176] font-['Bricolage_Grotesque'] tracking-tight">12 mins</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">Avg. Approval Time</p>
            </div>
            <div className="text-center space-y-1 border-l border-slate-100 border-t border-slate-100 md:border-t-0 pt-4 md:pt-0">
              <p className="text-2xl md:text-4xl font-black text-amber-500 font-['Bricolage_Grotesque'] tracking-tight">34 States</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">National Coverage</p>
            </div>
          </motion.div>

          {/* TRIPLE COMMISSION ENGINE CARDS */}
          <div className="space-y-12">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 bg-blue-500/10 text-[#2B5BFF] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="h-3 w-3" /> Commission Architecture
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight font-['Bricolage_Grotesque'] text-[#08091A]">
                How You Get Paid
              </h2>
              <p className="text-base text-slate-500 max-w-xl mx-auto">
                We cover your transport logistics and reward every successful business activation with lifetime equity.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              
              {/* FIELD ALLOWANCE */}
              <motion.div 
                whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(43,91,255,0.06)" }}
                transition={{ duration: 0.3 }}
                className="bg-white border border-slate-100/90 p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="h-14 w-14 rounded-2xl bg-[#EEF1FF] border border-[#2B5BFF]/10 flex items-center justify-center shadow-inner">
                    <Briefcase className="h-6 w-6 text-[#2B5BFF]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-[#08091A] font-['Bricolage_Grotesque'] tracking-tight flex items-center">
                      <span className="font-sans text-lg font-bold mr-0.5">₦</span>10,000 Field Allowance
                    </h3>
                    <p className="text-[#2B5BFF] text-xs font-bold uppercase tracking-wider">Fixed Support Guarantee</p>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Get an instant ₦10,000 on-field support allowance upon application approval to cover initial logistics, marketing materials, transportation, and data setup as you meet local retail merchants.
                  </p>
                </div>
                <div className="border-t border-slate-100 pt-5 mt-6 text-[11px] text-slate-400 font-medium flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" /> Dispatched upon agent verification
                </div>
              </motion.div>

              {/* PRO/BASIC PLAN */}
              <motion.div 
                whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(43,91,255,0.06)" }}
                transition={{ duration: 0.3 }}
                className="bg-white border border-slate-100/90 p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="h-14 w-14 rounded-2xl bg-[#E6FBF2] border border-[#12D176]/10 flex items-center justify-center shadow-inner">
                    <TrendingUp className="h-6 w-6 text-[#12D176]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-[#08091A] font-['Bricolage_Grotesque'] tracking-tight">Pro/Basic Onboarding</h3>
                    <p className="text-[#12D176] text-xs font-bold uppercase tracking-wider flex items-center">
                      <span className="font-sans mr-0.5">₦</span>1,500 Bonus + <span className="font-sans mx-0.5">₦</span>500/mo Residual
                    </p>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Earn ₦1,500 instantly for every supermarket, retail boutique, or pharmacy you activate onto the recommended Pro plan (₦12,000/mo) or Basic plan (₦6,500/mo). Enjoy an ongoing ₦500 monthly recurring residual.
                  </p>
                </div>
                <div className="border-t border-slate-100 pt-5 mt-6 text-[11px] text-slate-400 font-medium flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" /> Active on subscriber conversion
                </div>
              </motion.div>

              {/* ENTERPRISE PLAN */}
              <motion.div 
                whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(43,91,255,0.06)" }}
                transition={{ duration: 0.3 }}
                className="bg-white border border-slate-100/90 p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200/40 flex items-center justify-center shadow-inner">
                    <Award className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-[#08091A] font-['Bricolage_Grotesque'] tracking-tight">Enterprise Onboarding</h3>
                    <p className="text-amber-600 text-xs font-bold uppercase tracking-wider flex items-center">
                      <span className="font-sans mr-0.5">₦</span>5,000 Bonus + <span className="font-sans mx-0.5">₦</span>1,000/mo Residual
                    </p>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Earn ₦5,000 flat commission instantly for high-volume warehouses or chain retailers you onboard onto the Enterprise plan (₦45,000/mo). Secure ₦1,000 monthly income residuals for life.
                  </p>
                </div>
                <div className="border-t border-slate-100 pt-5 mt-6 text-[11px] text-slate-400 font-medium flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" /> Top-tier high ticket commissions
                </div>
              </motion.div>

            </div>
          </div>

          {/* PLAYBOOK TIMELINE SECTION */}
          <div className="space-y-12 max-w-5xl mx-auto">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 bg-teal-500/10 text-teal-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <Layers className="h-3 w-3" /> Operational Framework
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight font-['Bricolage_Grotesque'] text-[#08091A]">
                The Onboarding Playbook
              </h2>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              
              {/* Step 1 */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-white border border-slate-100 p-8 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col items-start gap-5"
              >
                <div className="h-10 w-10 rounded-xl bg-[#2B5BFF]/10 text-[#2B5BFF] flex items-center justify-center text-sm font-black font-mono">
                  1
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold font-['Bricolage_Grotesque'] text-[#08091A]">Apply Online</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enter your assigned region, verify your active contact number, and instantly lock your referral code.
                  </p>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-white border border-slate-100 p-8 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col items-start gap-5"
              >
                <div className="h-10 w-10 rounded-xl bg-[#2B5BFF]/10 text-[#2B5BFF] flex items-center justify-center text-sm font-black font-mono">
                  2
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold font-['Bricolage_Grotesque'] text-[#08091A]">Get Approved</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Our territory manager verifies your field plan, activates your login, and dispatches your field allowance.
                  </p>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-white border border-slate-100 p-8 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col items-start gap-5"
              >
                <div className="h-10 w-10 rounded-xl bg-[#2B5BFF]/10 text-[#2B5BFF] flex items-center justify-center text-sm font-black font-mono">
                  3
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold font-['Bricolage_Grotesque'] text-[#08091A]">Onboard Stores</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Guide local shops to sign up using your referral code. Provide demo support and set up inventory templates.
                  </p>
                </div>
              </motion.div>

              {/* Step 4 */}
              <motion.div 
                whileHover={{ y: -4 }}
                className="bg-white border border-slate-100 p-8 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.015)] flex flex-col items-start gap-5"
              >
                <div className="h-10 w-10 rounded-xl bg-[#2B5BFF]/10 text-[#2B5BFF] flex items-center justify-center text-sm font-black font-mono">
                  4
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold font-['Bricolage_Grotesque'] text-[#08091A]">Collect Payouts</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Watch commissions clear. Payouts are paid on the 1st of every month to any registered Nigerian bank account.
                  </p>
                </div>
              </motion.div>

            </div>
          </div>

          {/* COMMISSION SIMULATOR */}
          <div className="bg-white border border-slate-100 p-8 md:p-12 max-w-5xl mx-auto rounded-3xl shadow-[0_16px_48px_rgba(43,91,255,0.03)] relative overflow-hidden">
            <div className="grid md:grid-cols-12 gap-10 items-center">
              
              <div className="md:col-span-7 space-y-8">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-[#2B5BFF] text-xs font-extrabold uppercase tracking-wider">
                    <Calculator className="h-4 w-4 text-[#2B5BFF]" /> Real-time Income Projection
                  </div>
                  <h3 className="text-2xl md:text-4xl font-extrabold text-[#08091A] font-['Bricolage_Grotesque'] tracking-tight">Simulate Your Revenue</h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                    Drag the slider to adjust the targeted active store count in your territory and check your prospective recurring passive stream.
                  </p>
                </div>

                <div className="space-y-6 pt-2">
                  <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs text-[#2E3152] font-bold">
                      <span>Referred Active Paid Stores</span>
                      <span className="text-[#2B5BFF] font-black text-sm bg-blue-50 px-3 py-1 rounded-full">{simStores} Stores Onboarded</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={simStores} 
                      onChange={(e) => setSimStores(parseInt(e.target.value))}
                      className="w-full accent-[#2B5BFF] bg-slate-200 rounded-lg appearance-none h-1.5 cursor-pointer py-1" 
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>1 Store</span>
                      <span>50 Stores</span>
                      <span>100 Stores</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-xs text-[#2E3152] font-bold block">Typical Store Subscription Preference</span>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setSimTier("professional")}
                        className={`py-3.5 px-4 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
                          simTier === "professional" 
                            ? "bg-[#EEF1FF] border-[#2B5BFF] text-[#2B5BFF] shadow-sm" 
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm"
                        }`}
                      >
                        Pro Plan (₦12k/mo)
                      </button>
                      <button 
                        onClick={() => setSimTier("enterprise")}
                        className={`py-3.5 px-4 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
                          simTier === "enterprise" 
                            ? "bg-[#EEF1FF] border-[#2B5BFF] text-[#2B5BFF] shadow-sm" 
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm"
                        }`}
                      >
                        Enterprise Plan (₦45k/mo)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SIMULATION SUMMARY PANEL (PREMIUM FINTECH WALLET LOOK) */}
              <div className="md:col-span-5 bg-[#0B0C1E] text-white p-8 rounded-3xl border border-[#1E203C]/30 space-y-6 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[380px]">
                <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-[#2B5BFF]/15 to-transparent blur-3xl rounded-full"></div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Yield Statement</span>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider animate-pulse">
                      <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full"></span> Live Calculation
                    </span>
                  </div>

                  <div className="space-y-5 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="font-semibold">Fixed Field Logistics</span>
                      <span className="font-mono font-bold text-white flex items-center">
                        <span className="font-sans text-sm mr-0.5 font-normal">₦</span>{projectedEarnings.flatAllowance.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="space-y-1.5 border-t border-white/5 pt-4">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold block">One-time Activation Bonuses</span>
                      <p className="text-2xl font-extrabold font-mono text-white flex items-center tracking-tight">
                        <span className="font-sans text-xl mr-0.5 font-normal">₦</span>{projectedEarnings.onboardingBonus.toLocaleString()}
                      </p>
                    </div>

                    <div className="space-y-1.5 border-t border-white/5 pt-4">
                      <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-extrabold block">Monthly Recurring Residual</span>
                      <p className="text-2xl font-extrabold font-mono text-[#12D176] flex items-center tracking-tight">
                        <span className="font-sans text-xl mr-0.5 font-normal">₦</span>{projectedEarnings.monthlyResidual.toLocaleString()}<span className="text-xs text-slate-400 font-normal ml-1">/mo</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/5 pt-5 mt-6 bg-white/[0.02] p-5 rounded-2xl border border-white/5 shadow-inner">
                  <span className="text-[10px] text-slate-300 uppercase tracking-widest font-bold block">12-Month Total Projected Payout</span>
                  <p className="text-3xl font-black text-[#2B5BFF] flex items-center tracking-tight font-['Bricolage_Grotesque']">
                    <span className="font-sans text-2xl mr-0.5 font-normal">₦</span>{projectedEarnings.annualProjected.toLocaleString()}
                  </p>
                  <p className="text-[9px] text-slate-400 leading-relaxed mt-1">
                    Includes the fixed field logistics support + active merchant conversion earnings. Paid directly to bank.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </motion.div>
      ) : agentProfile && agentProfile.status === "pending" ? (
        
        /* 2. APPLICATION PENDING STATE (LUXURIOUS STATUS TRACKER) */
        <div className="max-w-xl mx-auto px-6 py-20 relative z-10 space-y-8">
          
          <div className="text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto animate-bounce">
              <Clock className="h-7 w-7 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-[#08091A] font-['Bricolage_Grotesque']">Application Under Review</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Thank you for applying, <span className="font-bold text-[#08091A]">{agentProfile.fullName}</span>! Our field operations lead is currently reviewing your operational territory assignment.
              </p>
            </div>
          </div>

          {/* PROGRESS CHIPS */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] uppercase font-extrabold tracking-wider">
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl">
              1. Submitted
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl animate-pulse">
              2. Reviewing Territory
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl">
              3. Dispatch Welcome kit
            </div>
          </div>

          <Card className="bg-white border border-[#08091A]/05 shadow-sm p-6 space-y-4 rounded-2xl">
            <h4 className="text-xs font-bold text-[#2E3152] uppercase tracking-wider">Submitted Onboarding Profile:</h4>
            
            <div className="space-y-3 text-xs border-b border-slate-50 pb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Logistics Phone:</span>
                <span className="font-mono text-slate-800 font-semibold">{agentProfile.phone || "Not Specified"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Region:</span>
                <span className="text-slate-800 font-semibold">{agentProfile.region || "Not Specified"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Referral Link:</span>
                <span className="font-mono text-slate-800 font-semibold">{agentProfile.referralCode}</span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <h5 className="text-[11px] font-bold text-[#08091A] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Pending Benefits Locked:
              </h5>
              <ul className="text-xs space-y-2 text-slate-500 pl-5 list-disc">
                <li>₦10,000 Fixed Field Support Allowance (On Approval)</li>
                <li>Professional conversions: ₦1,500 onboarding + ₦500/mo lifetime income</li>
                <li>Enterprise conversions: ₦5,000 onboarding + ₦1,000/mo lifetime income</li>
              </ul>
            </div>
          </Card>

          <p className="text-center text-xs text-slate-400">
            A confirmation email and WhatsApp outreach will be made to <span className="font-semibold text-slate-600">{agentProfile.email}</span> shortly.
          </p>
        </div>
      ) : agentProfile && agentProfile.status === "approved" ? (
        
        /* 3. FULL APPROVED AGENT DASHBOARD (PRISTINE LIGHT CARD THEME) */
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 relative z-10">
          
          {/* WELCOME BLOCK WITH REFERRAL LINK */}
          <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-extrabold text-[#08091A] font-['Bricolage_Grotesque']">Agent Workspace: {agentProfile.fullName}</h2>
                <Badge className="bg-[#E6FBF2] text-[#12D176] font-bold border-none px-2.5 py-0.5 text-[10px] rounded-full uppercase tracking-wider">
                  Active Partner
                </Badge>
              </div>
              <p className="text-xs text-slate-400">Share your exclusive partner link to begin onboarding merchants in your territory.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center justify-between gap-2 bg-slate-50 px-4 py-2.5 rounded-full border border-slate-100 text-xs text-slate-600 font-mono">
                <span>Code: {agentProfile.referralCode}</span>
                <button onClick={copyReferralCode} className="text-slate-400 hover:text-[#2B5BFF] transition-all pl-2 border-l border-slate-200">
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-[#12D176]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 bg-slate-50 px-4 py-2.5 rounded-full border border-slate-100 text-xs text-slate-600 font-mono">
                <span className="truncate max-w-[180px]">{agentProfile.referralLink}</span>
                <button onClick={copyReferralLink} className="text-slate-400 hover:text-[#2B5BFF] transition-all pl-2 border-l border-slate-200">
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-[#12D176]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* KPI CARDS GRID */}
          <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
            <Card className="bg-white border border-[#08091A]/05 shadow-sm p-5 flex items-center justify-between rounded-2xl">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase block">Total Referrals</span>
                <p className="text-2xl font-black text-[#08091A]">{referrals.length}</p>
                <span className="text-[10px] text-slate-400">Stores on tracking list</span>
              </div>
              <div className="h-10 w-10 bg-[#EEF1FF] rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-[#2B5BFF]" />
              </div>
            </Card>

            <Card className="bg-white border border-[#08091A]/05 shadow-sm p-5 flex items-center justify-between rounded-2xl">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase block">Conversions</span>
                <p className="text-2xl font-black text-[#08091A]">{referrals.filter(r => r.status === "converted").length}</p>
                <span className="text-[10px] text-[#12D176] font-bold block">
                  {referrals.length > 0 
                    ? Math.round((referrals.filter(r => r.status === "converted").length / referrals.length) * 100)
                    : 0}% Onboarding rate
                </span>
              </div>
              <div className="h-10 w-10 bg-[#E6FBF2] rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-[#12D176]" />
              </div>
            </Card>

            <Card className="bg-white border border-[#08091A]/05 shadow-sm p-5 flex items-center justify-between rounded-2xl">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase block">Pending Clearance</span>
                <p className="text-2xl font-black text-amber-600 font-sans">₦{(agentProfile.earnings?.pending || 0).toLocaleString()}</p>
                <span className="text-[10px] text-slate-400 block">Payouts in 30-day clearing</span>
              </div>
              <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
            </Card>

            <Card className="bg-white border border-[#08091A]/05 shadow-sm p-5 flex items-center justify-between rounded-2xl">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-semibold uppercase block">Settled Earnings</span>
                <p className="text-2xl font-black text-[#12D176] font-sans">₦{(agentProfile.earnings?.paid || 0).toLocaleString()}</p>
                <span className="text-[10px] text-slate-400 block">Directly dispatched to bank</span>
              </div>
              <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-[#12D176]" />
              </div>
            </Card>
          </div>

          {/* MAIN TABS BAR */}
          <div className="border-b border-slate-100 flex items-center gap-5">
            <button 
              onClick={() => setActiveTab("performance")}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === "performance" ? "border-[#2B5BFF] text-[#2B5BFF]" : "border-transparent text-slate-400 hover:text-[#08091A]"
              }`}
            >
              Overview & Analytics
            </button>
            <button 
              onClick={() => setActiveTab("referrals")}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === "referrals" ? "border-[#2B5BFF] text-[#2B5BFF]" : "border-transparent text-slate-400 hover:text-[#08091A]"
              }`}
            >
              Onboarded Stores ({referrals.length})
            </button>
            <button 
              onClick={() => setActiveTab("earnings")}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === "earnings" ? "border-[#2B5BFF] text-[#2B5BFF]" : "border-transparent text-slate-400 hover:text-[#08091A]"
              }`}
            >
              Payout Records ({earnings.length})
            </button>
            <button 
              onClick={() => setActiveTab("settings")}
              className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === "settings" ? "border-[#2B5BFF] text-[#2B5BFF]" : "border-transparent text-slate-400 hover:text-[#08091A]"
              }`}
            >
              Territory Profile
            </button>
          </div>

          {/* ACTIVE TAB RENDERER */}
          <div className="space-y-6">
            
            {/* OVERVIEW TAB */}
            {activeTab === "performance" && (
              <div className="grid md:grid-cols-3 gap-6">
                
                {/* ACTIVE RULES CARD */}
                <Card className="bg-white border border-slate-100 shadow-sm md:col-span-1 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-[#2B5BFF]" /> Active Commission Structure
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-400">Guaranteed operational rates.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    <div className="flex justify-between border-b border-slate-50 pb-2.5">
                      <span className="text-slate-500">Fixed Support Allowance:</span>
                      <span className="font-bold text-slate-800">₦10,000 (Fixed flat)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2.5">
                      <span className="text-slate-500">Professional Onboarding:</span>
                      <span className="font-bold text-slate-800">₦1,500 (+₦500/mo)</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2.5">
                      <span className="text-slate-500">Enterprise Onboarding:</span>
                      <span className="font-bold text-slate-800">₦5,000 (+₦1,000/mo)</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-slate-500">Territory Status:</span>
                      <Badge className="bg-[#E6FBF2] text-[#12D176] text-[9px] font-bold border-none uppercase rounded-full">APPROVED_FIELD</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* EARNINGS PROJECTION PREVIEW */}
                <Card className="bg-white border border-slate-100 shadow-sm md:col-span-2 rounded-2xl p-6 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs text-[#2B5BFF] font-extrabold uppercase tracking-wider">
                      <Sparkles className="h-4 w-4" /> Logistics & Clearances
                    </div>
                    <h3 className="text-lg font-bold text-[#08091A] font-['Bricolage_Grotesque']">Regular Disbursement Cycle</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      All accrued onboarding bonuses (₦1,500/₦5,000) and recurring residual commissions (₦500/₦1,000) are compiled instantly and disbursed to your designated banking profile on the 1st day of each month. Your fixed on-field support allowance is released within 3 working days of profile approval.
                    </p>
                  </div>
                  <div className="bg-[#FAFBFF] p-4 rounded-xl border border-slate-100 flex justify-between items-center text-xs mt-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#2B5BFF]" />
                      <span className="text-slate-500 font-semibold">Next Disbursement Run:</span>
                    </div>
                    <span className="font-extrabold text-[#08091A] uppercase tracking-wide">August 1, 2026</span>
                  </div>
                </Card>

              </div>
            )}

            {/* REFERRALS TAB */}
            {activeTab === "referrals" && (
              <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                  {referrals.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <Users className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-sm text-slate-500 font-bold">No active referred stores found.</p>
                      <p className="text-xs text-slate-400">Share your referral link on social channels or WhatsApp groups of merchant leads.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold bg-slate-50/50">
                          <th className="p-4">Store Name</th>
                          <th className="p-4">Signup Date</th>
                          <th className="p-4">Active Plan</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-600">
                        {referrals.map((ref) => (
                          <tr key={ref.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-bold text-[#08091A]">{ref.storeName}</td>
                            <td className="p-4">{new Date(ref.createdAt).toLocaleDateString()}</td>
                            <td className="p-4 uppercase font-bold text-[#2B5BFF]">{ref.planName}</td>
                            <td className="p-4">
                              {ref.status === "pending" && (
                                <Badge className="bg-amber-50 text-amber-700 text-[9px] uppercase font-bold border-none rounded-full">
                                  Pending Activation (Free)
                                </Badge>
                              )}
                              {ref.status === "converted" && (
                                <Badge className="bg-[#E6FBF2] text-[#12D176] text-[9px] uppercase font-bold border-none rounded-full">
                                  Converted (Active Paid)
                                </Badge>
                              )}
                              {ref.status === "churned" && (
                                <Badge className="bg-red-50 text-red-700 text-[9px] uppercase font-bold border-none rounded-full">
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

            {/* PAYOUT RECORDS TAB */}
            {activeTab === "earnings" && (
              <Card className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0 overflow-x-auto">
                  {earnings.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <ArrowRightLeft className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="text-sm text-slate-500 font-bold">Your ledger is currently empty.</p>
                      <p className="text-xs text-slate-400">Onboarding payouts and monthly residual streams will log here live as transactions occur.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold bg-slate-50/50">
                          <th className="p-4">Date</th>
                          <th className="p-4">Store Onboarded</th>
                          <th className="p-4">Compensation Stream</th>
                          <th className="p-4">Amount</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-slate-600">
                        {earnings.map((ear) => (
                          <tr key={ear.id} className="hover:bg-slate-50/50">
                            <td className="p-4">{new Date(ear.timestamp).toLocaleDateString()}</td>
                            <td className="p-4 font-bold text-[#08091A]">{ear.storeName}</td>
                            <td className="p-4 font-semibold text-slate-500">
                              {ear.commissionType === "onboarding_bonus" && (
                                <span className="text-[#2B5BFF]">Instant Activation Bonus</span>
                              )}
                              {ear.commissionType === "recurring_residual" && (
                                <span className="text-[#12D176]">Monthly Residual Stream</span>
                              )}
                              {ear.commissionType === "clawback" && (
                                <span className="text-red-500">Early Cancellation Clawback</span>
                              )}
                            </td>
                            <td className="p-4 font-mono font-bold">
                              {ear.amount < 0 ? (
                                <span className="text-red-500">-₦{Math.abs(ear.amount).toLocaleString()}</span>
                              ) : (
                                <span className="text-emerald-600">+₦{ear.amount.toLocaleString()}</span>
                              )}
                            </td>
                            <td className="p-4">
                              {ear.status === "pending" && (
                                <Badge className="bg-amber-50 text-amber-700 text-[9px] uppercase font-bold border-none rounded-full">
                                  Pending Clearance
                                </Badge>
                              )}
                              {ear.status === "paid" && (
                                <Badge className="bg-[#E6FBF2] text-[#12D176] text-[9px] uppercase font-bold border-none rounded-full">
                                  Cleared & Paid
                                </Badge>
                              )}
                              {ear.status === "reversed" && (
                                <Badge className="bg-red-50 text-red-700 text-[9px] uppercase font-bold border-none rounded-full">
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

            {/* PROFILE & SETTINGS TAB */}
            {activeTab === "settings" && (
              <Card className="bg-white border border-slate-100 shadow-sm max-w-xl rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Settings className="h-4 w-4 text-[#2B5BFF]" /> Partner Information
                  </CardTitle>
                  <CardDescription className="text-[11px] text-slate-400 font-sans">Modify your registered field partner profile details.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveSettings} className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="settingsName" className="text-xs text-slate-500">Full Name</Label>
                      <Input 
                        id="settingsName" 
                        value={settingsName} 
                        onChange={(e) => setSettingsName(e.target.value)} 
                        className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#2B5BFF] text-xs h-10 rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="settingsPhone" className="text-xs text-slate-500">Logistics WhatsApp/Phone Number</Label>
                      <Input 
                        id="settingsPhone" 
                        value={settingsPhone} 
                        onChange={(e) => setSettingsPhone(e.target.value)} 
                        className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#2B5BFF] text-xs h-10 rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="settingsRegion" className="text-xs text-slate-500">Active Operating Region / City</Label>
                      <Input 
                        id="settingsRegion" 
                        value={settingsRegion} 
                        onChange={(e) => setSettingsRegion(e.target.value)} 
                        className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#2B5BFF] text-xs h-10 rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="settingsCode" className="text-xs text-slate-500">Exclusive Referral Code (Uppercase only)</Label>
                      <Input 
                        id="settingsCode" 
                        value={settingsRefCode} 
                        onChange={(e) => setSettingsRefCode(e.target.value.toUpperCase())} 
                        className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#2B5BFF] font-mono text-xs h-10 rounded-lg"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Registered Email Address</Label>
                      <Input 
                        value={agentProfile.email} 
                        disabled 
                        className="bg-slate-50 border-slate-100 text-slate-400 font-mono text-xs cursor-not-allowed h-10 rounded-lg"
                      />
                    </div>

                    <Button type="submit" className="bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold text-xs h-10 rounded-full px-5 mt-2">
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
        <div className="max-w-md mx-auto px-6 py-24 text-center space-y-6 relative z-10">
          <div className="h-16 w-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#08091A] font-['Bricolage_Grotesque']">Account Unregistered</h2>
            <p className="text-sm text-slate-500 leading-relaxed font-sans">
              The currently logged-in account is not configured as an authorized NexaStoreOS Agent Partner. Become an authorized agent to start earning!
            </p>
          </div>
          <Button 
            onClick={() => { setAuthTab("register"); setRegisterStep(1); setShowAuthModal(true); }} 
            className="bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold rounded-full px-6"
          >
            <UserPlus className="h-4 w-4 mr-2" /> Apply Now
          </Button>
        </div>
      )}

      {/* AUTH & STEPPED ONBOARDING WIZARD MODAL */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08091A]/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-100 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6 text-[#08091A]"
            >
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div>
                  <h3 className="text-lg font-bold font-['Bricolage_Grotesque']">
                    {authTab === "login" ? "Partner Portal Sign In" : "Growth Partner Application"}
                  </h3>
                  {authTab === "register" && (
                    <p className="text-[10px] text-[#2B5BFF] font-extrabold uppercase tracking-wider mt-0.5">
                      Step {registerStep} of 3 • {registerStep === 1 ? "Credentials" : registerStep === 2 ? "Logistics Territory" : "Benefits Review"}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => { setShowAuthModal(false); setRegisterStep(1); }} 
                  className="text-slate-400 hover:text-[#08091A] text-xs font-semibold bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full"
                >
                  Close
                </button>
              </div>

              {authTab === "login" ? (
                /* LOGIN FORM */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs text-slate-500">Registered Email Address</Label>
                    <Input 
                      id="email"
                      type="email"
                      placeholder="e.g. partner@nexaos.io"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#2B5BFF] text-xs h-10 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="pass" className="text-xs text-slate-500">Security Password</Label>
                    <Input 
                      id="pass"
                      type="password"
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#2B5BFF] text-xs h-10 rounded-lg"
                    />
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold h-10 text-xs rounded-full mt-2 shadow-sm">
                    {submitting ? "Signing in..." : "Access Deck Workspace"}
                  </Button>
                </form>
              ) : (
                /* REGISTER STEPPED WIZARD */
                <div className="space-y-4">
                  
                  {registerStep === 1 && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="name" className="text-xs text-slate-500">Full Name</Label>
                        <Input 
                          id="name"
                          type="text"
                          placeholder="e.g. Chukwuma Obi"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#2B5BFF] text-xs h-10 rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="reg-email" className="text-xs text-slate-500">Email Address</Label>
                        <Input 
                          id="reg-email"
                          type="email"
                          placeholder="e.g. obi.field@nexa.io"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#2B5BFF] text-xs h-10 rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="reg-pass" className="text-xs text-slate-500">Security Password</Label>
                        <Input 
                          id="reg-pass"
                          type="password"
                          placeholder="Minimum 6 characters"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#2B5BFF] text-xs h-10 rounded-lg"
                        />
                      </div>

                      <Button 
                        type="button" 
                        onClick={handleNextStep} 
                        className="w-full bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold h-10 text-xs rounded-full mt-2"
                      >
                        Continue to Logistics <ArrowRight className="h-3.5 w-3.5 ml-1.5 inline" />
                      </Button>
                    </div>
                  )}

                  {registerStep === 2 && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="phone" className="text-xs text-slate-500 flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-[#2B5BFF]" /> Logistics WhatsApp / Mobile Phone
                        </Label>
                        <Input 
                          id="phone"
                          type="tel"
                          placeholder="e.g. +234 803 123 4567"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#2B5BFF] text-xs h-10 rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="region" className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-[#2B5BFF]" /> Target Operating Territory
                        </Label>
                        <Input 
                          id="region"
                          type="text"
                          placeholder="e.g. Lagos Mainland / Ikeja Hub"
                          value={regionInput}
                          onChange={(e) => setRegionInput(e.target.value)}
                          className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#2B5BFF] text-xs h-10 rounded-lg"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="customCode" className="text-xs text-slate-500">Preferred Referral Code (Optional)</Label>
                        <Input 
                          id="customCode"
                          type="text"
                          placeholder="e.g. LAGOSDEALS"
                          value={customRefCodeInput}
                          onChange={(e) => setCustomRefCodeInput(e.target.value.toUpperCase())}
                          className="bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#2B5BFF] font-mono text-xs h-10 rounded-lg"
                        />
                        <span className="text-[10px] text-slate-400 block mt-0.5">Custom code used for tracking store attribution.</span>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setRegisterStep(1)} 
                          className="border-slate-200 text-slate-600 h-10 text-xs rounded-full"
                        >
                          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                        </Button>
                        <Button 
                          type="button" 
                          onClick={handleNextStep} 
                          className="flex-1 bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold h-10 text-xs rounded-full"
                        >
                          Review Benefits <ArrowRight className="h-3.5 w-3.5 ml-1.5 inline" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {registerStep === 3 && (
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="bg-[#FAFBFF] p-4 rounded-2xl border border-slate-100 space-y-3 text-xs text-slate-600">
                        <p className="font-bold text-[#08091A] border-b border-slate-50 pb-1.5 text-center">Locked Commission Schedule</p>
                        <ul className="space-y-2 pl-4 list-disc text-[11px]">
                          <li>
                            <span className="font-bold text-[#08091A]">₦10,000 Field Allowance:</span> Guaranteed fixed support logistics allowance paid on approval.
                          </li>
                          <li>
                            <span className="font-bold text-[#08091A]">Professional Conversion:</span> ₦1,500 onboarding bonus + ₦500 recurring monthly lifetime residual income.
                          </li>
                          <li>
                            <span className="font-bold text-[#08091A]">Enterprise Conversion:</span> ₦5,000 onboarding bonus + ₦1,000 recurring monthly lifetime residual income.
                          </li>
                          <li>
                            <span className="font-bold text-[#08091A]">Monthly Settlement:</span> Regular payouts on the 1st of every month via direct deposit.
                          </li>
                        </ul>
                      </div>

                      <div className="flex items-start gap-2.5 pt-2">
                        <input 
                          type="checkbox" 
                          id="terms" 
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="h-4.5 w-4.5 rounded text-[#2B5BFF] border-slate-200 focus:ring-[#2B5BFF] cursor-pointer mt-0.5" 
                        />
                        <Label htmlFor="terms" className="text-xs text-slate-500 leading-normal cursor-pointer select-none">
                          I agree to represent NexaStoreOS professionally, verify local merchants, and accept direct payouts.
                        </Label>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setRegisterStep(2)} 
                          className="border-slate-200 text-slate-600 h-10 text-xs rounded-full"
                        >
                          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={submitting} 
                          className="flex-1 bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold h-10 text-xs rounded-full"
                        >
                          {submitting ? "Submitting..." : "Submit Application"}
                        </Button>
                      </div>
                    </form>
                  )}

                </div>
              )}

              <div className="text-center pt-2 border-t border-slate-50">
                <button 
                  onClick={() => {
                    setAuthTab(authTab === "login" ? "register" : "login");
                    setRegisterStep(1);
                  }}
                  className="text-xs text-[#2B5BFF] hover:underline transition-all font-bold"
                >
                  {authTab === "login" ? "Create an Agent Account" : "Back to Agent Sign In"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
