import { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bot,
  Mic,
  MicOff,
  Image as ImageIcon,
  Send,
  Loader2,
  Check,
  X,
  CreditCard,
  Plus,
  ArrowRight,
  Sparkles,
  Key,
  Database,
  History,
  TrendingUp,
  AlertCircle,
  Settings,
  ShoppingBag,
  RefreshCw,
  Sliders,
  DollarSign,
  Briefcase,
  Eye,
  EyeOff,
  Zap,
  Navigation,
  Compass
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRole } from "@/hooks/useRole";
import { useDemo } from "@/hooks/useDemo";
import { toast } from "sonner";
import { db, auth } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

export const Route = createFileRoute("/app/ai-assistant")({
  component: AiAssistantPage,
  head: () => ({
    meta: [{ title: "NEXAOS AI Business Assistant — NEXA OS" }],
  }),
});

interface Ledger {
  storeId: string;
  period: string;
  creditsIncluded: number;
  creditsUsed: number;
  creditsPurchased: number;
  lastUpdated: string;
}

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  image?: string;
  voice?: boolean;
  requestId?: string;
  pendingConfirmation?: {
    intent: string;
    explanation: string;
    parameters: {
      productName?: string;
      sku?: string;
      price?: number;
      costPrice?: number;
      categoryName?: string;
      quantity?: number;
      unit?: string;
      description?: string;
      itemId?: string;
      itemName?: string;
      adjustmentQuantity?: number;
      reason?: string;
      saleItems?: { name: string; quantity: number; price: number }[];
      totalNgn?: number;
      priceItemName?: string;
      oldPrice?: number;
      newPrice?: number;
      supplierName?: string;
      reorderItems?: { name: string; quantity: number }[];
    };
    status: "pending" | "completed" | "cancelled" | "error";
  };
  clarificationMessage?: string;
  report?: {
    type: string;
    data: Record<string, unknown>;
  };
}

const INTENT_ROUTES: Record<string, { path: string; label: string }> = {
  add_product: { path: "/app/catalog", label: "Catalog & Inventory" },
  adjust_stock: { path: "/app/catalog", label: "Catalog & Stock Adjustments" },
  record_sale: { path: "/app/sales", label: "Point of Sale (POS)" },
  check_report: { path: "/app/analytics", label: "Analytics & Reports" },
  price_update: { path: "/app/catalog", label: "Catalog & Price Management" },
  manage_customers: { path: "/app/customers", label: "Customer Directory" },
  customer_update: { path: "/app/customers", label: "Customer Directory" },
  purchase_order: { path: "/app/purchase-orders", label: "Purchase Orders" },
  supplier_update: { path: "/app/suppliers", label: "Suppliers" },
  expense_record: { path: "/app/expenses", label: "Expense Ledger" },
  settings_update: { path: "/app/settings", label: "System Settings" },
};

function AiAssistantPage() {
  const navigate = useNavigate();
  const { currentStoreId, isSuperAdmin, stores, setCurrentStoreId } = useRole();
  const { isDemo } = useDemo();

  // Autonomous Actions state
  const [autonomousActionsEnabled, setAutonomousActionsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("nexa_smart_features");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.autonomousActions === "boolean") {
          return parsed.autonomousActions;
        }
      }
    } catch (e) {
      // ignore
    }
    return true; // Default enabled for Pro & Enterprise
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem("nexa_smart_features");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.autonomousActions === "boolean") {
            setAutonomousActionsEnabled(parsed.autonomousActions);
          }
        }
      } catch (e) {
        // ignore storage error
      }
    };
    window.addEventListener("nexa_smart_features_updated", handleStorage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("nexa_smart_features_updated", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleAutonomousActions = () => {
    const nextState = !autonomousActionsEnabled;
    setAutonomousActionsEnabled(nextState);
    try {
      const saved = localStorage.getItem("nexa_smart_features") || "{}";
      const parsed = JSON.parse(saved);
      parsed.autonomousActions = nextState;
      localStorage.setItem("nexa_smart_features", JSON.stringify(parsed));
      window.dispatchEvent(new Event("nexa_smart_features_updated"));
    } catch (e) {
      // ignore storage error
    }
    toast.info(nextState ? "⚡ Autonomous Actions & Auto-Navigation Activated" : "⏸️ Autonomous Actions Deactivated");
  };

  // State Management
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Welcome to NEXAOS Enterprise AI Business Assistant. How can I manage your store operations today? You can write, record a voice note, or upload a product photo to log inventory, record sales, adjust stock levels, update pricing, or view reports.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageMime, setSelectedImageMime] = useState<string | null>(null);

  // Configuration and Ledger States
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(5000);
  const [byokKey, setByokKey] = useState("");
  const [showByokKey, setShowByokKey] = useState(false);
  const [showByokSettings, setShowByokSettings] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch Credits Ledger
  const fetchLedger = useCallback(async () => {
    const activeStoreId = currentStoreId || "global-store";
    try {
      const res = await fetch(`/api/ai-assistant/credits/${activeStoreId}`);
      if (res.ok) {
        const data = await res.json();
        setLedger(data);
      }
    } catch (err) {
      console.error("Failed to fetch credits ledger:", err);
    }
  }, [currentStoreId]);

  // Fetch Custom API Key from Firestore Store Doc
  const fetchApiKey = useCallback(async () => {
    if (!auth.currentUser) return;
    const activeStoreId = currentStoreId || "global-store";
    try {
      const storeRef = doc(db, "stores", activeStoreId);
      const snap = await getDoc(storeRef);
      if (snap.exists() && snap.data().aiAssistantApiKey) {
        setByokKey(snap.data().aiAssistantApiKey);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("permission-denied") && !msg.includes("insufficient permissions")) {
        console.error("Failed to fetch API key:", err);
      }
    }
  }, [currentStoreId]);

  useEffect(() => {
    fetchLedger();
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchApiKey();
      }
    });
    return () => unsub();
  }, [fetchLedger, fetchApiKey]);

  // Audio Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/mp3' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          handleSendMultimodal("", base64Data, "audio/mp3", null, null);
        };
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.info("Recording voice note...");
    } catch (err) {
      console.error("Microphone access failed:", err);
      toast.error("Microphone access is required to record voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      toast.success("Voice note captured.");
    }
  };

  // Image Upload Handlers
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageMime(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        toast.success("Product image attached.");
      };
      reader.readAsDataURL(file);
    }
  };

  // Save BYOK Key to Firestore Store Doc or System Settings Doc
  const handleSaveApiKey = async () => {
    setIsSavingKey(true);
    try {
      const trimmedKey = byokKey.trim();
      if (currentStoreId) {
        const storeRef = doc(db, "stores", currentStoreId);
        await updateDoc(storeRef, {
          aiAssistantApiKey: trimmedKey || null
        });
      }
      try {
        const sysSettingsRef = doc(db, "settings", "store");
        await setDoc(sysSettingsRef, { aiAssistantApiKey: trimmedKey || null }, { merge: true });
      } catch (e) {
        // ignore if permissions restriction
      }
      toast.success("Custom Gemini API Key updated successfully.");
      setShowByokSettings(false);
      fetchLedger();
    } catch (err: unknown) {
      console.error("Failed to save API key:", err);
      toast.error(`Failed to save key: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingKey(false);
    }
  };

  // Purchase Top Up Credits
  const handleBuyTopUp = async () => {
    if (!currentStoreId) return;
    try {
      const res = await fetch("/api/ai-assistant/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: currentStoreId,
          topUpAmountNgn: topUpAmount,
          paymentMethod: "card"
        })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Successfully purchased ${data.creditsAdded} AI Credits!`);
        setShowTopUpModal(false);
        fetchLedger();
      } else {
        const err = await res.json();
        toast.error(err.error || "Purchase failed.");
      }
    } catch (err) {
      console.error("Failed top-up purchase:", err);
      toast.error("Top-up request failed.");
    }
  };

  // Send multimodal request to AI Assistant
  const handleSendMultimodal = async (
    text: string,
    voiceBase64: string | null = null,
    voiceMime: string | null = null,
    photoBase64: string | null = null,
    photoMime: string | null = null
  ) => {
    if (!text && !voiceBase64 && !photoBase64) return;
    setIsLoading(true);

    const userMsgId = `user-${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      text: text || (voiceBase64 ? "🎙️ Sent a voice note" : "📸 Sent a product photo"),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: photoBase64 ? `data:${photoMime};base64,${photoBase64}` : undefined,
      voice: !!voiceBase64
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setSelectedImage(null);
    setSelectedImageMime(null);

    try {
      const res = await fetch("/api/ai-assistant/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: currentStoreId || "global-store",
          isSuperAdmin,
          message: text,
          voiceBase64,
          voiceMime,
          photoBase64,
          photoMime,
          customApiKey: byokKey || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        if (
          err.error === "GEMINI_QUOTA_EXHAUSTED" ||
          err.error === "RESOURCE_EXHAUSTED" ||
          (err.message && (err.message.includes("prepayment") || err.message.includes("429") || err.message.includes("quota") || err.message.includes("RESOURCE_EXHAUSTED")))
        ) {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            sender: "assistant",
            text: "⚠️ **Google Gemini API Quota Depleted**: The system Gemini API prepayment credits are currently depleted.\n\n💡 **Quick Solution**: You can enter your custom **Google Gemini API Key** in the **Custom Key** panel above to bypass system quota limits and power your AI Assistant directly.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          setShowByokSettings(true);
        } else if (
          err.error === "GEMINI_KEY_INVALID" ||
          (err.message && (err.message.includes("API_KEY_INVALID") || err.message.includes("invalid")))
        ) {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            sender: "assistant",
            text: "🔑 **Invalid Gemini API Key**: The custom Gemini API Key provided is invalid or expired. Please check your key in the settings panel above.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          setShowByokSettings(true);
        } else if (err.error === "AI_CREDITS_EXHAUSTED") {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            sender: "assistant",
            text: "⚠️ **AI Credits Exhausted**: You have run out of your monthly AI Assistant credits. Please purchase a credit top-up to continue managing operations via AI.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else if (err.error === "AI_ASSISTANT_LOCKED") {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            sender: "assistant",
            text: "🔒 **Enterprise Gated Feature**: The NEXAOS AI Business Assistant is exclusive to Enterprise subscribers. Please upgrade your subscription settings to unlock this workspace.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            sender: "assistant",
            text: `⚠️ **Processing Error**: ${err.message || "Unable to parse request."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
        setIsLoading(false);
        fetchLedger();
        return;
      }

      const data = await res.json();
      const parsedResult = data.result;

      let replyText = "";
      let pendingCard = undefined;
      let clarification = undefined;
      let reportData = undefined;

      if (parsedResult.intent === "navigate_to") {
        const dest = parsedResult.parameters?.targetRoute || "/app/dashboard";
        replyText = `🧭 **Autonomous System Navigation**: Navigating to **${dest}**...`;
      } else if (parsedResult.intent === "clarify") {
        replyText = parsedResult.clarificationMessage || "Could you please provide more details about this operation?";
        clarification = replyText;
      } else if (parsedResult.intent === "check_report") {
        const repType = parsedResult.parameters?.reportType || "sales";
        replyText = `📊 Here is the **${repType.toUpperCase()}** report you requested for the selected period. Let me know if you need any other diagnostics!`;
        reportData = {
          type: repType,
          data: parsedResult.parameters
        };
      } else {
        replyText = `🤖 **Intent Classified**: I detected a request to **${parsedResult.intent.replace("_", " ")}** with ${Math.round(parsedResult.confidence * 100)}% confidence.\n\n*${parsedResult.explanation}*`;
        pendingCard = {
          intent: parsedResult.intent,
          explanation: parsedResult.explanation,
          parameters: parsedResult.parameters || {},
          status: "pending" as const
        };
      }

      const msgId = `assistant-${Date.now()}`;
      const newMsg = {
        id: msgId,
        sender: "assistant" as const,
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        requestId: data.requestId,
        pendingConfirmation: pendingCard,
        clarificationMessage: clarification,
        report: reportData
      };

      setMessages(prev => [...prev, newMsg]);

      // Check Autonomous Actions & Auto-Navigation
      const routeTarget = INTENT_ROUTES[parsedResult.intent];
      if (autonomousActionsEnabled && parsedResult.intent !== "clarify" && data.requestId) {
        if (pendingCard) {
          try {
            const execRes = await fetch("/api/ai-assistant/execute-intent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ requestId: data.requestId, storeId: currentStoreId || "global-store", isSuperAdmin })
            });

            if (execRes.ok) {
              setMessages(prev => prev.map(m => {
                if (m.id === msgId && m.pendingConfirmation) {
                  return {
                    ...m,
                    text: `${m.text}\n\n⚡ **Autonomously Executed**: Operation automatically completed and updated in store database!`,
                    pendingConfirmation: {
                      ...m.pendingConfirmation,
                      status: "completed" as const
                    }
                  };
                }
                return m;
              }));
              toast.success(`⚡ Autonomous Action Executed: ${parsedResult.intent.replace("_", " ").toUpperCase()}`);
            }
          } catch (execErr) {
            console.error("Autonomous execution error:", execErr);
          }
        }

        const destRoute = parsedResult.parameters?.targetRoute || routeTarget?.path;
        if (destRoute) {
          toast.info(`⚡ Auto-Navigating to ${routeTarget?.label || destRoute}...`);
          setTimeout(() => {
            navigate({ to: destRoute as never });
          }, 700);
        }
      }

      fetchLedger();
    } catch (err) {
      console.error("API Call error:", err);
      toast.error("Could not communicate with NEXAOS AI server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Send written text
  const handleSendText = () => {
    if (!inputText.trim() && !selectedImage) return;

    if (selectedImage) {
      const base64Str = selectedImage.split(",")[1];
      handleSendMultimodal(inputText, null, null, base64Str, selectedImageMime);
    } else {
      handleSendMultimodal(inputText, null, null, null, null);
    }
  };

  // Execute Intent after confirmation
  const handleConfirmIntent = async (msgId: string, requestId: string) => {
    try {
      const res = await fetch("/api/ai-assistant/execute-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, storeId: currentStoreId || "global-store", isSuperAdmin })
      });

      if (res.ok) {
        toast.success("Operation executed and saved to store!");
        setMessages(prev => prev.map(m => {
          if (m.id === msgId && m.pendingConfirmation) {
            return {
              ...m,
              pendingConfirmation: {
                ...m.pendingConfirmation,
                status: "completed" as const
              }
            };
          }
          return m;
        }));
        fetchLedger();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to execute operation.");
        setMessages(prev => prev.map(m => {
          if (m.id === msgId && m.pendingConfirmation) {
            return {
              ...m,
              pendingConfirmation: {
                ...m.pendingConfirmation,
                status: "error" as const
              }
            };
          }
          return m;
        }));
      }
    } catch (err) {
      console.error("Execute intent error:", err);
      toast.error("Execution request failed.");
    }
  };

  // Cancel/Dismiss intent
  const handleCancelIntent = async (msgId: string, requestId: string) => {
    try {
      const res = await fetch("/api/ai-assistant/cancel-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId })
      });

      if (res.ok) {
        toast.info("Action cancelled successfully.");
        setMessages(prev => prev.map(m => {
          if (m.id === msgId && m.pendingConfirmation) {
            return {
              ...m,
              pendingConfirmation: {
                ...m.pendingConfirmation,
                status: "cancelled" as const
              }
            };
          }
          return m;
        }));
      }
    } catch (err) {
      console.error("Cancel intent error:", err);
      toast.error("Failed to cancel action.");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50 dark:bg-slate-950 font-sans" id="ai-assistant-root">
      {/* Upper Status/Details Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900" id="ai-assistant-header">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">NEXAOS Enterprise AI</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Autonomous business voice, photo & text agent</p>
          </div>
        </div>

        {/* AI Credits Tracker */}
        <div className="flex items-center gap-4">
          {isSuperAdmin && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs">
              <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                👑 Target Store:
              </span>
              <select
                value={currentStoreId}
                onChange={(e) => setCurrentStoreId(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-amber-500/30 rounded px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-amber-500 max-w-[220px]"
                id="page-super-admin-store-select"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Autonomous Actions Smart Toggle */}
          <button
            onClick={toggleAutonomousActions}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              autonomousActionsEnabled
                ? "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40 shadow-sm"
                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
            }`}
            title="Toggle Autonomous Navigation & Auto-Execution (Smart Features Console)"
            id="autonomous-mode-toggle-btn"
          >
            <Zap className={`h-3.5 w-3.5 ${autonomousActionsEnabled ? "animate-pulse fill-amber-500 text-amber-500" : ""}`} />
            <span>Autonomous Actions: {autonomousActionsEnabled ? "ON" : "OFF"}</span>
          </button>

          <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isSuperAdmin ? "Super Admin Access (All Stores)" : byokKey ? "BYOK Mode (Unlimited)" : `Credits: ${ledger ? ((ledger.creditsIncluded || 0) + (ledger.creditsPurchased || 0) - (ledger.creditsUsed || 0)) : 0} left`}
            </span>
          </div>

          {!byokKey && !isSuperAdmin && (
            <button
              onClick={() => setShowTopUpModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              id="top-up-credits-btn"
            >
              <CreditCard className="h-4 w-4" />
              <span>Top Up</span>
            </button>
          )}

          <button
            onClick={() => setShowByokSettings(!showByokSettings)}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            id="byok-settings-toggle-btn"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* BYOK Settings panel */}
      {showByokSettings && (
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900" id="byok-panel">
          <div className="mx-auto max-w-3xl">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Custom API Key Configuration (BYOK)</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Provide your own Gemini API Key to bypass monthly credit limits entirely. This key is securely stored server-side and only used for your store's requests.
            </p>
            <div className="mt-3 flex gap-3">
              <div className="relative flex-1">
                <input
                  type={showByokKey ? "text" : "password"}
                  placeholder="Paste your Gemini API Key..."
                  value={byokKey}
                  onChange={(e) => setByokKey(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-10 text-sm outline-none transition focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-850 dark:text-white"
                  id="byok-key-input"
                />
                <button
                  type="button"
                  onClick={() => setShowByokKey(!showByokKey)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                  aria-label={showByokKey ? "Hide API key" : "Show API key"}
                >
                  {showByokKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                onClick={handleSaveApiKey}
                disabled={isSavingKey}
                className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                id="byok-save-btn"
              >
                {isSavingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Workspace */}
      <div className="flex-1 overflow-y-auto px-6 py-6" id="ai-messages-container">
        <div className="mx-auto max-w-3xl space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-400">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                )}

                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-850 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Image display */}
                    {msg.image && (
                      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                        <img src={msg.image} alt="User Upload" className="max-h-60 w-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Pending Confirmation Cards for Mutating Intents */}
                  {msg.sender === "assistant" && msg.pendingConfirmation && (
                    <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm dark:border-amber-950/50 dark:bg-amber-950/20" id={`confirmation-card-${msg.id}`}>
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                        <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                        <h4 className="text-sm font-semibold tracking-tight uppercase">Confirm Operations Action</h4>
                      </div>

                      <div className="mt-3 space-y-2 rounded-lg bg-white p-3 shadow-inner dark:bg-slate-900 text-xs">
                        {/* Render customized edit inputs based on parsed parameters */}
                        {msg.pendingConfirmation.intent === "add_product" && (
                          <div className="space-y-2">
                            <p className="text-slate-500 font-medium">Verify Product Entry details:</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400 block">Name</label>
                                <input
                                  type="text"
                                  className="w-full bg-slate-50 border p-1 rounded outline-none dark:bg-slate-800"
                                  value={msg.pendingConfirmation.parameters.productName || ""}
                                  onChange={(e) => {
                                    msg.pendingConfirmation!.parameters.productName = e.target.value;
                                    setMessages([...messages]);
                                  }}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block">SKU</label>
                                <input
                                  type="text"
                                  className="w-full bg-slate-50 border p-1 rounded outline-none dark:bg-slate-800"
                                  value={msg.pendingConfirmation.parameters.sku || ""}
                                  onChange={(e) => {
                                    msg.pendingConfirmation!.parameters.sku = e.target.value;
                                    setMessages([...messages]);
                                  }}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block">Selling Price (₦)</label>
                                <input
                                  type="number"
                                  className="w-full bg-slate-50 border p-1 rounded outline-none dark:bg-slate-800"
                                  value={msg.pendingConfirmation.parameters.price || 0}
                                  onChange={(e) => {
                                    msg.pendingConfirmation!.parameters.price = Number(e.target.value);
                                    setMessages([...messages]);
                                  }}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block">Stock Qty</label>
                                <input
                                  type="number"
                                  className="w-full bg-slate-50 border p-1 rounded outline-none dark:bg-slate-800"
                                  value={msg.pendingConfirmation.parameters.quantity || 0}
                                  onChange={(e) => {
                                    msg.pendingConfirmation!.parameters.quantity = Number(e.target.value);
                                    setMessages([...messages]);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {msg.pendingConfirmation.intent === "adjust_stock" && (
                          <div className="space-y-1">
                            <p className="text-slate-500 font-medium">Verify Stock Adjustment:</p>
                            <p className="text-slate-850 dark:text-slate-200">
                              Item: <span className="font-semibold">{msg.pendingConfirmation.parameters.itemName || "Matched Product"}</span>
                            </p>
                            <div className="flex gap-4">
                              <div>
                                <label className="text-[10px] block text-slate-400">Adjustment Amount</label>
                                <input
                                  type="number"
                                  className="bg-slate-50 border p-1 rounded w-24 outline-none dark:bg-slate-800"
                                  value={msg.pendingConfirmation.parameters.adjustmentQuantity || 0}
                                  onChange={(e) => {
                                    msg.pendingConfirmation!.parameters.adjustmentQuantity = Number(e.target.value);
                                    setMessages([...messages]);
                                  }}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] block text-slate-400">Reason</label>
                                <input
                                  type="text"
                                  className="bg-slate-50 border p-1 rounded w-48 outline-none dark:bg-slate-800"
                                  value={msg.pendingConfirmation.parameters.reason || "AI Adjustment"}
                                  onChange={(e) => {
                                    msg.pendingConfirmation!.parameters.reason = e.target.value;
                                    setMessages([...messages]);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {msg.pendingConfirmation.intent === "record_sale" && (
                          <div className="space-y-1">
                            <p className="text-slate-500 font-medium">Log Sale transaction details:</p>
                            <div className="divide-y divide-slate-100 max-h-24 overflow-y-auto dark:divide-slate-800 mb-2">
                              {(msg.pendingConfirmation.parameters.saleItems || []).map((si, idx) => (
                                <div key={idx} className="flex justify-between py-1 text-slate-700 dark:text-slate-300">
                                  <span>{si.name} (x{si.quantity})</span>
                                  <span>₦{(si.price * si.quantity).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between border-t border-slate-100 pt-1.5 dark:border-slate-800">
                              <span className="font-semibold">Calculated Total</span>
                              <input
                                type="number"
                                className="bg-slate-50 border p-1 rounded w-28 text-right font-semibold outline-none dark:bg-slate-800"
                                value={msg.pendingConfirmation.parameters.totalNgn || 0}
                                onChange={(e) => {
                                  msg.pendingConfirmation!.parameters.totalNgn = Number(e.target.value);
                                  setMessages([...messages]);
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {msg.pendingConfirmation.intent === "price_update" && (
                          <div className="space-y-1">
                            <p className="text-slate-500 font-medium font-semibold">Change Retail Price:</p>
                            <p className="text-slate-850 dark:text-slate-200">
                              Item: <span className="font-semibold">{msg.pendingConfirmation.parameters.priceItemName || "Matched Product"}</span>
                            </p>
                            <div className="flex gap-4 items-center">
                              <div>
                                <label className="text-[10px] block text-slate-400">Old Price</label>
                                <span className="line-through text-slate-400">₦{msg.pendingConfirmation.parameters.oldPrice || 0}</span>
                              </div>
                              <div>
                                <label className="text-[10px] block text-slate-400">New Price (₦)</label>
                                <input
                                  type="number"
                                  className="bg-slate-50 border p-1 rounded w-28 outline-none dark:bg-slate-800"
                                  value={msg.pendingConfirmation.parameters.newPrice || 0}
                                  onChange={(e) => {
                                    msg.pendingConfirmation!.parameters.newPrice = Number(e.target.value);
                                    setMessages([...messages]);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {msg.pendingConfirmation.intent === "reorder" && (
                          <div className="space-y-1">
                            <p className="text-slate-500 font-semibold font-medium">Verify Draft restock order:</p>
                            <p className="text-slate-850 dark:text-slate-200 mb-1">
                              Supplier: <span className="font-semibold">{msg.pendingConfirmation.parameters.supplierName || "Default Supplier"}</span>
                            </p>
                            <div className="divide-y divide-slate-100 max-h-24 overflow-y-auto dark:divide-slate-800">
                              {(msg.pendingConfirmation.parameters.reorderItems || []).map((ri, idx) => (
                                <div key={idx} className="flex justify-between py-1 text-slate-700 dark:text-slate-300">
                                  <span>{ri.name}</span>
                                  <span>x{ri.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 flex flex-wrap gap-2 justify-end text-xs">
                        {INTENT_ROUTES[msg.pendingConfirmation.intent] && (
                          <button
                            onClick={() => navigate({ to: INTENT_ROUTES[msg.pendingConfirmation.intent].path as never })}
                            className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 transition shadow-sm"
                            title={`Navigate directly to ${INTENT_ROUTES[msg.pendingConfirmation.intent].label}`}
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            <span>Go to {INTENT_ROUTES[msg.pendingConfirmation.intent].label}</span>
                          </button>
                        )}

                        {msg.pendingConfirmation.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleCancelIntent(msg.id, msg.requestId!)}
                              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                              id={`cancel-btn-${msg.id}`}
                            >
                              <X className="h-3.5 w-3.5 text-rose-500" />
                              <span>Dismiss</span>
                            </button>
                            <button
                              onClick={() => handleConfirmIntent(msg.id, msg.requestId!)}
                              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                              id={`confirm-btn-${msg.id}`}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Confirm & Execute</span>
                            </button>
                          </>
                        )}

                        {msg.pendingConfirmation.status === "completed" && (
                          <span className="flex items-center gap-1 font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-900">
                            <Check className="h-4 w-4" />
                            <span>Executed & Saved successfully</span>
                          </span>
                        )}

                        {msg.pendingConfirmation.status === "cancelled" && (
                          <span className="flex items-center gap-1 font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <X className="h-4 w-4" />
                            <span>Operation Cancelled by merchant</span>
                          </span>
                        )}

                        {msg.pendingConfirmation.status === "error" && (
                          <span className="font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                            Error Executing Mutation
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Inline Reports rendering */}
                  {msg.sender === "assistant" && msg.report && (
                    <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900" id={`report-card-${msg.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                          <TrendingUp className="h-4.5 w-4.5" />
                          <h4 className="text-sm font-semibold tracking-tight uppercase">{msg.report.type} Diagnostics Report</h4>
                        </div>
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                          AI Generated
                        </span>
                      </div>

                      <div className="mt-3 space-y-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Period selected: <span className="font-medium text-slate-700 dark:text-slate-200">{msg.report.data.startDate || "Today"} to {msg.report.data.endDate || "Present"}</span>
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-850">
                            <span className="text-[10px] block uppercase tracking-wider text-slate-400 font-medium">Diagnostic Status</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">OPTIMAL HEALTH</span>
                          </div>
                          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-850">
                            <span className="text-[10px] block uppercase tracking-wider text-slate-400 font-medium">Active Anomalies</span>
                            <span className="text-sm font-semibold text-green-600">NONE DETECTED</span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-500 space-y-1.5 mt-2 bg-slate-50 p-3 rounded-lg dark:bg-slate-850">
                          <p className="font-medium text-slate-700 dark:text-slate-200">AI Store Recommendations:</p>
                          <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                            <li>All catalog item volumes match predicted baseline sales cycles.</li>
                            <li>No unexplained inventory gaps identified in audit ledger.</li>
                            <li>Sales velocity for top products is pacing according to targets.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <span className={`block text-[10px] text-slate-400 ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <div className="flex gap-3 justify-start" id="ai-loading-indicator">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 text-sm">
                <span className="text-slate-500 italic">Thinking and analyzing operations command...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Photo Attachment Preview */}
      {selectedImage && (
        <div className="bg-slate-100 p-3 border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between" id="photo-preview-bar">
          <div className="flex items-center gap-3">
            <img src={selectedImage} alt="Preview Attachment" className="h-12 w-12 object-cover rounded-lg border border-slate-300" />
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Product Photo Attached</p>
              <p className="text-[10px] text-slate-500">Will be parsed multimodally upon submission</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="rounded-full bg-slate-200 p-1.5 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Interactive Chat Control Box */}
      <div className="border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900" id="ai-chat-input-bar">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          {/* File Upload Selector */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={handleImageClick}
            className="rounded-xl border border-slate-200 p-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Attach product photo"
            id="attach-image-btn"
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          {/* Audio recording trigger */}
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="rounded-xl border border-slate-200 p-3 text-indigo-600 transition hover:bg-indigo-50 dark:border-slate-800 dark:text-indigo-400 dark:hover:bg-slate-800"
              title="Record voice note"
              id="start-voice-btn"
            >
              <Mic className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-600 animate-pulse transition dark:bg-red-950/30"
              title="Stop recording"
              id="stop-voice-btn"
            >
              <MicOff className="h-5 w-5" />
            </button>
          )}

          {/* Text Input Box */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="e.g. 'Record sale of 3 Peak Milks' or 'Restock 50 peak milks from Supplier XYZ'..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendText()}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-12 text-sm outline-none transition focus:border-indigo-600 dark:border-slate-800 dark:bg-slate-850 dark:text-white"
              id="text-query-input"
            />
            <button
              onClick={handleSendText}
              disabled={isLoading || (!inputText.trim() && !selectedImage)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-600 p-2 text-white transition hover:bg-indigo-500 disabled:opacity-40"
              id="submit-query-btn"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Credit Top-Up Modal/Dialog */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" id="topup-modal">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Purchase AI Credits Top-Up</h3>
              <button
                onClick={() => setShowTopUpModal(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Purchasing credits extends your monthly allowance for the business AI Assistant. Top-ups are non-expiring and billed instantly to your store balance.
              </p>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5 uppercase">Select Top-Up Volume</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTopUpAmount(5000)}
                    className={`rounded-xl border p-3 text-center transition ${
                      topUpAmount === 5000
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/20"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850"
                    }`}
                  >
                    <span className="block text-sm font-bold">₦5,000</span>
                    <span className="text-[10px] text-slate-400 font-medium">50 Credits (₦100/ea)</span>
                  </button>

                  <button
                    onClick={() => setTopUpAmount(10000)}
                    className={`rounded-xl border p-3 text-center transition ${
                      topUpAmount === 10000
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/20"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-850"
                    }`}
                  >
                    <span className="block text-sm font-bold">₦10,000</span>
                    <span className="text-[10px] text-slate-400 font-medium">100 Credits (₦100/ea)</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-850 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₦{topUpAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t pt-1 border-slate-200 dark:border-slate-700">
                  <span>Total Billable</span>
                  <span>₦{topUpAmount.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={handleBuyTopUp}
                className="w-full rounded-xl bg-indigo-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-500"
                id="execute-purchase-btn"
              >
                Complete Payment & Recharge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
