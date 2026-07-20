import { useState, useEffect } from "react";
import { Bell, Monitor, ShieldCheck, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PushNotificationPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if browser notifications are supported
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    // Trigger logic: if notification permission is not granted,
    // and we haven't prompted them in this session yet, show the popup!
    const alreadyPrompted = sessionStorage.getItem("nexa_notif_prompt_shown") === "true";
    if (Notification.permission !== "granted" && !alreadyPrompted) {
      // Small delay for natural page load
      const timer = setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem("nexa_notif_prompt_shown", "true");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAuthorize = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Notifications are not supported on this browser.");
      setOpen(false);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        toast.success("Notifications authorized!", {
          description: "You'll now receive real-time alerts on your device.",
        });
        // Test notification
        new Notification("Nexa StoreOS Enabled", {
          body: "Push alerts for sales, expenses, and low stock are now active.",
          icon: "/nexastoreos-logo.svg",
        });
      } else if (permission === "denied") {
        toast.warning("Notifications blocked", {
          description: "Please enable notification permissions in your browser settings to receive alerts.",
        });
      }
    } catch (err) {
      console.error("Error authorizing notifications:", err);
      toast.error("Failed to request notification permissions.");
    } finally {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[420px] rounded-3xl p-8 bg-white border border-neutral-100 shadow-2xl flex flex-col items-center text-center outline-none animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 transition-colors"
          aria-label="Close"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        {/* Top Centered Icon Setup */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Decorative glowing background */}
          <div className="absolute inset-0 bg-emerald-500/5 rounded-full blur-xl scale-125" />
          
          {/* Main Bell Icon Container */}
          <div className="relative h-20 w-20 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-xs">
            <Bell className="h-9 w-9 text-emerald-600 animate-[bounce_2s_infinite]" />
            
            {/* Nested smaller device icon */}
            <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white border border-neutral-100 shadow-sm flex items-center justify-center">
              <Monitor className="h-3.5 w-3.5 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-black font-display text-emerald-950 uppercase tracking-tight italic leading-none mb-3">
          NEVER MISS A BEAT
        </h2>

        {/* Subtitle description */}
        <p className="text-xs font-bold font-sans text-neutral-500 tracking-wide uppercase leading-relaxed max-w-[280px] mb-6">
          GET REAL-TIME UPDATES FOR LOW STOCK, SALES, AND URGENT STORE ALERTS DIRECTLY ON YOUR DEVICE.
        </p>

        {/* Nested Secure Architecture Card */}
        <div className="w-full flex items-center gap-3 bg-emerald-50/40 border border-emerald-100/70 rounded-2xl p-4.5 mb-8 text-left">
          <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="h-5.5 w-5.5 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-[11px] font-extrabold text-emerald-950 uppercase tracking-wider">
              SECURE ARCHITECTURE
            </h4>
            <p className="text-[11px] font-semibold text-neutral-400">
              End-to-end encrypted system alerts only.
            </p>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="w-full space-y-3">
          <Button
            type="button"
            onClick={handleAuthorize}
            className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-[12px] font-extrabold uppercase tracking-widest shadow-lg shadow-emerald-600/10 transition-all"
          >
            AUTHORIZE NOTIFICATIONS
          </Button>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[10px] font-extrabold text-neutral-400 hover:text-neutral-600 uppercase tracking-widest py-2 transition-colors"
          >
            DISMISS FOR NOW
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
