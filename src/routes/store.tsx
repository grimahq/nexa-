import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { Package, ShoppingCart, User, Menu, X, MessageSquare, Send, Bot, PhoneCall, ArrowLeft, Loader2, Sparkles, MessageCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/hooks/useDemo";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useItems } from "@/hooks/useInventoryData";
import { Item } from "@/types/inventory";
import { NexaLogo } from "@/components/shared/NexaLogo";
import { logQRLeadEvent } from "@/utils/qrTracking";
import { getCleanStoreSlug } from "@/lib/utils";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { useOnboarding, TourStep } from "@/hooks/useOnboarding";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

interface CartItem extends Item {
  quantity: number;
}

export const Route = createFileRoute("/store")({
  component: StoreLayout,
});

const STORE_TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Our Storefront!",
    description: "This is your customer-facing storefront, powered by Nexa OS. Here, clients can browse products, view details, and place orders directly.",
    target: "store-header"
  },
  {
    title: "Live Product Browser",
    description: "Browse featured catalog items, check pricing in NGN, and verify current stock availability.",
    target: "store-grid"
  },
  {
    title: "Flexible Checkout Cart",
    description: "Add items to your basket and click here to review, adjust quantities, and place orders.",
    target: "store-cart"
  },
  {
    title: "Chat Support & AI Assistant",
    description: "Have questions? Launch the support widget to chat with our virtual AI Store Assistant or send a message directly via WhatsApp!",
    target: "store-chat"
  }
];

function StoreLayout() {
  const { isDemo, onboarding: demoOnboarding } = useDemo();
  const { settings: liveSettings } = useSystemSettings();
  const onboarding = isDemo ? demoOnboarding : liveSettings;
  const { data: items } = useItems({ status: "active" });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const location = useLocation();

  const [tableNumber, setTableNumber] = useState<string | null>(() => {
    return localStorage.getItem("stackwise_table_number");
  });

  // Tour Integration
  const tour = useOnboarding("store");
  const { startTour } = tour;

  useEffect(() => {
    if (tour.isActive) return;
    const triggerStoreTour = sessionStorage.getItem("stackwise-trigger-store-tour") === "true";
    const neverCompleted = !tour.hasCompleted;

    if (triggerStoreTour || neverCompleted) {
      sessionStorage.removeItem("stackwise-trigger-store-tour");
      const timer = setTimeout(() => startTour(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [startTour, tour.hasCompleted, tour.isActive]);

  // Support Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<"choose" | "ai">("choose");
  const [chatId, setChatId] = useState<string | null>(() => localStorage.getItem("stackwise_customer_chat_id"));
  const [customerName, setCustomerName] = useState<string | null>(() => localStorage.getItem("stackwise_customer_chat_name"));
  const [nameInput, setNameInput] = useState("");
  const [msgText, setMsgText] = useState("");
  const [messages, setMessages] = useState<{ sender: string; text: string; timestamp: string }[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Sync customer messages from Firestore
  useEffect(() => {
    if (!chatId) return;

    const unsub = onSnapshot(doc(db, "support_chats", chatId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMessages(data.messages || []);
      }
    });

    return unsub;
  }, [chatId]);

  // Scroll active chat to bottom
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatOpen, chatMode]);

  const handleStartAIChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const name = nameInput.trim();
    const newChatId = chatId || `store-chat-${Math.random().toString(36).substring(2, 11)}`;

    setCustomerName(name);
    setChatId(newChatId);
    localStorage.setItem("stackwise_customer_chat_name", name);
    localStorage.setItem("stackwise_customer_chat_id", newChatId);

    try {
      const docRef = doc(db, "support_chats", newChatId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          id: newChatId,
          customerName: name,
          status: "active",
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Failed to initialize support chat document in Firestore:", err);
    }
  };

  const handleSendCustomerMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgText.trim() || isAiTyping || !chatId || !customerName) return;

    const text = msgText.trim();
    setMsgText("");
    setIsAiTyping(true);

    const newMsg = {
      sender: "customer",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const nextMessages = [...messages, newMsg];
    setMessages(nextMessages);

    try {
      const docRef = doc(db, "support_chats", chatId);
      await updateDoc(docRef, {
        messages: nextMessages,
        updatedAt: new Date().toISOString()
      });

      const res = await fetch("/api/store/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
          storeInfo: onboarding,
          products: items || []
        })
      });

      if (!res.ok) throw new Error("AI Assistant error");
      const data = await res.json();

      const replyMsg = {
        sender: "agent",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      await updateDoc(docRef, {
        messages: [...nextMessages, replyMsg],
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to process storefront AI support query:", err);
      toast.error("Support assistant is currently unreachable.");
    } finally {
      setIsAiTyping(false);
    }
  };

  // Handle table detection and affiliate tracking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    const tableParam = params.get("table");
    if (tableParam && tableParam !== tableNumber) {
      localStorage.setItem("stackwise_table_number", tableParam);
      setTableNumber(tableParam);
      console.log("Customer table detected:", tableParam);
    }

    const affId = params.get("aff");
    if (affId) {
      localStorage.setItem("stackwise_affiliate_id", affId);
      console.log("Tracking affiliate ID:", affId);
    }

    const qrSourceIdParam = params.get("qrSourceId");
    if (qrSourceIdParam) {
      localStorage.setItem("nexa_current_qr_source_id", qrSourceIdParam);
      const storeSlug = getCleanStoreSlug(onboarding?.storeSlug, onboarding?.storeName);
      const storeId = onboarding?.id || storeSlug;
      localStorage.setItem("nexa_current_qr_store_id", storeId);
      console.log("Customer QR source detected:", qrSourceIdParam);
    }
  }, [location.search, tableNumber, onboarding]);

  const handleCtaClick = () => {
    const savedQrId = localStorage.getItem("nexa_current_qr_source_id") || new URLSearchParams(window.location.search).get("qrSourceId");
    if (savedQrId) {
      const parts = savedQrId.split("_");
      const branchId = parts[2] && parts[2] !== "main" ? parts[2] : null;
      const storeSlug = getCleanStoreSlug(onboarding?.storeSlug, onboarding?.storeName);
      const storeId = localStorage.getItem("nexa_current_qr_store_id") || onboarding?.id || storeSlug;
      logQRLeadEvent({
        qrSourceId: savedQrId,
        storeId,
        branchId,
        eventType: "cta_click"
      });
    }
  };

  // Sync cart count
  useEffect(() => {
    const updateCartCount = () => {
      const cart: CartItem[] = JSON.parse(localStorage.getItem("stackwise_cart") || "[]");
      const count = cart.reduce((acc, item) => acc + item.quantity, 0);
      setCartCount(count);
    };

    updateCartCount();
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("cartUpdated", updateCartCount);
    
    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col relative">
      {/* Pinned Dine-In Table Banner */}
      {tableNumber && (
        <div className="bg-amber-500 text-amber-950 font-semibold px-4 py-2 text-xs md:text-sm flex items-center justify-between shadow-inner animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="text-sm md:text-base">🍽️</span>
            <span>You are ordering for <strong className="underline underline-offset-2">Table {tableNumber}</strong>. Browse, order, and pay instantly!</span>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem("stackwise_table_number");
              setTableNumber(null);
            }}
            className="text-[10px] uppercase font-bold tracking-wider bg-amber-950/15 hover:bg-amber-950/25 px-2.5 py-1 rounded transition-all"
          >
            Leave Table
          </button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/store" className="flex items-center gap-2" data-tour="store-header">
            {onboarding.logoUrl ? (
              <img 
                src={onboarding.logoUrl} 
                alt={onboarding.storeName || "Store logo"} 
                className="h-8 w-8 object-contain rounded-md"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="bg-primary rounded-lg p-1.5">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <span className="font-bold text-xl tracking-tight">
              {onboarding.storeName || "My Store"}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/store" className="text-sm font-medium hover:text-primary transition-colors">
              Products
            </Link>
            <Link to="/store" className="text-sm font-medium hover:text-primary transition-colors">
              Featured
            </Link>
            <Link to="/store" className="text-sm font-medium hover:text-primary transition-colors">
              About
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/store/cart" data-tour="store-cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                    variant="destructive"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button variant="outline" size="sm" className="hidden md:flex gap-2">
              <User className="h-4 w-4" /> Account
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-white p-4 space-y-4 animate-in slide-in-from-top duration-200">
            <Link to="/store" className="block text-base font-medium py-2" onClick={() => setIsMenuOpen(false)}>
              Products
            </Link>
            <Link to="/store" className="block text-base font-medium py-2" onClick={() => setIsMenuOpen(false)}>
              Featured
            </Link>
            <Link to="/store" className="block text-base font-medium py-2" onClick={() => setIsMenuOpen(false)}>
              About
            </Link>
            <Button className="w-full justify-start gap-2" variant="outline">
              <User className="h-4 w-4" /> Account
            </Button>
          </div>
        )}
      </header>

      {/* Hero / Banner for the store */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="font-bold text-lg">{onboarding.storeName || "My Store"}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Powered by Nexa OS. Secure, fast, and simple inventory management for modern businesses.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/store" className="hover:text-primary transition-colors">All Products</Link></li>
              <li><Link to="/store" className="hover:text-primary transition-colors">Categories</Link></li>
              <li><Link to="/store" className="hover:text-primary transition-colors">New Arrivals</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Stay Connected</h4>
            <p className="text-sm text-muted-foreground mb-4">Subscribe to our newsletter for updates.</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Email address" 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
              <Button size="sm">Join</Button>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>
            © {new Date().getFullYear()} {onboarding.storeName || "My Store"}. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-semibold text-neutral-400">Powered by</span>
            <a 
              href={`${import.meta.env.VITE_LANDING_URL || "https://nexastoreos.com"}/?utm_source=qr_footer&utm_medium=customer_store&utm_campaign=${encodeURIComponent(getCleanStoreSlug(onboarding?.storeSlug, onboarding?.storeName))}${tableNumber ? `&utm_content=table_${encodeURIComponent(tableNumber)}` : ""}`}
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={handleCtaClick}
              className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <NexaLogo variant="full" height={16} className="text-foreground shrink-0" />
              <span className="sr-only">NexaStoreOS</span>
            </a>
            <span className="text-neutral-300">|</span>
            <a 
              href={`${import.meta.env.VITE_LANDING_URL || "https://nexastoreos.com"}/?utm_source=qr_footer_cta&utm_medium=customer_store&utm_campaign=${encodeURIComponent(getCleanStoreSlug(onboarding?.storeSlug, onboarding?.storeName))}${tableNumber ? `&utm_content=table_${encodeURIComponent(tableNumber)}` : ""}`}
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={handleCtaClick}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              Get it for your shop
            </a>
          </div>
        </div>
      </footer>

      {/* FLOATING SUPPORT CHAT WIDGET */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3" data-tour="store-chat">
        {isChatOpen && (
          <div className="w-[330px] sm:w-[360px] h-[480px] bg-white rounded-2xl shadow-2xl border border-neutral-200/80 flex flex-col overflow-hidden animate-in fade-in-50 slide-in-from-bottom-5 duration-300">
            {/* Header */}
            <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <div className="text-left">
                  <h4 className="text-xs font-bold leading-tight">{onboarding.storeName || "Store"} Assistant</h4>
                  <span className="text-[10px] text-emerald-100 font-medium">Customer Support Portal</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white hover:bg-emerald-700 hover:text-white rounded-full" 
                onClick={() => setIsChatOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Chat Content panels */}
            {chatMode === "choose" ? (
              <div className="flex-1 p-5 flex flex-col justify-center items-center gap-5 text-center bg-neutral-50">
                <div className="p-3.5 bg-emerald-50 rounded-full text-emerald-600">
                  <MessageSquare className="h-9 w-9" />
                </div>
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-neutral-900">How would you like to connect?</h5>
                  <p className="text-[11px] text-muted-foreground max-w-[220px]">
                    Get instant assistance from our AI Agent or message us directly on WhatsApp.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 w-full">
                  <Button 
                    onClick={() => setChatMode("ai")}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl h-11 gap-2 text-xs font-semibold"
                  >
                    <Sparkles className="h-4 w-4 text-emerald-400" /> Chat with AI Assistant
                  </Button>
                  <a 
                    href={getWhatsAppUrl(onboarding.storePhone || "2348132321056", "Hi! I am browsing your online store and need support.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button 
                      variant="outline"
                      className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50 rounded-xl h-11 gap-2 text-xs font-bold"
                    >
                      <PhoneCall className="h-4 w-4" /> Message on WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col bg-neutral-50 overflow-hidden text-left">
                {/* Back Link */}
                <div className="px-3 py-1.5 border-b bg-white flex items-center gap-2 text-[10px]">
                  <button 
                    onClick={() => setChatMode("choose")}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold focus:outline-none"
                  >
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                  <span className="text-neutral-300">|</span>
                  <span className="text-neutral-500 truncate font-medium">Virtual Assistant (Real-time)</span>
                </div>

                {!customerName ? (
                  <form onSubmit={handleStartAIChat} className="flex-1 p-5 flex flex-col justify-center gap-3.5">
                    <div className="text-center space-y-1">
                      <h5 className="text-xs font-bold text-neutral-900">Let's get to know you!</h5>
                      <p className="text-[11px] text-muted-foreground">Please enter your name to start chatting with our Support Desk.</p>
                    </div>
                    <Input 
                      placeholder="Your name" 
                      value={nameInput} 
                      onChange={e => setNameInput(e.target.value)} 
                      className="h-9 text-xs rounded-xl"
                      required 
                    />
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 rounded-xl text-xs font-semibold">
                      Start Chat
                    </Button>
                  </form>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Message scroller */}
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                      {messages.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-xs space-y-2">
                          <Bot className="h-7 w-7 text-neutral-300 mx-auto" />
                          <p>Hi, <strong>{customerName}</strong>!</p>
                          <p className="max-w-[180px] mx-auto text-[10px]">Ask us anything about our products, pricing, stock levels, or store details.</p>
                        </div>
                      )}
                      {messages.map((m, idx) => {
                        const isCustomer = m.sender === "customer";
                        return (
                          <div key={idx} className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-2xl p-2.5 shadow-sm text-xs leading-relaxed ${
                              isCustomer 
                                ? "bg-emerald-600 text-white rounded-tr-none font-medium" 
                                : "bg-white border rounded-tl-none text-neutral-800"
                            }`}>
                              <p className="whitespace-pre-wrap">{m.text}</p>
                            </div>
                          </div>
                        );
                      })}
                      {isAiTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white border rounded-2xl rounded-tl-none p-2.5 shadow-sm flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                            <span>Assistant is replying...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatScrollRef} />
                    </div>

                    {/* Chat Form */}
                    <form onSubmit={handleSendCustomerMessage} className="p-2 border-t bg-white flex gap-1.5">
                      <Input 
                        value={msgText} 
                        onChange={e => setMsgText(e.target.value)} 
                        placeholder="Type question..." 
                        className="h-8 text-xs rounded-xl flex-1"
                        disabled={isAiTyping}
                      />
                      <Button type="submit" size="icon" disabled={isAiTyping || !msgText.trim()} className="h-8 w-8 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="h-12 w-12 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-2xl flex items-center justify-center text-white border-0 cursor-pointer animate-bounce duration-1000"
        >
          {isChatOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </Button>
      </div>

      {/* Guided Tour Component */}
      <OnboardingTour
        steps={STORE_TOUR_STEPS}
        currentStep={tour.currentStep}
        isActive={tour.isActive}
        onNext={tour.next}
        onBack={tour.back}
        onSkip={tour.skipTour}
        onComplete={tour.completeTour}
      />
    </div>
  );
}
