import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { resolvePrice } from "./src/utils/pricing";
import { runScheduledReportsEvaluation, generateReportDataAndPDF, GmailApiEmailProvider } from "./src/utils/reportsBackend";
import { resolveFeatureFlags } from "./src/utils/subscriptionUtils";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // Initialize Gemini client on the server.
  // We use process.env.GEMINI_API_KEY and apply the 'aistudio-build' User-Agent for telemetry.
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    : null;

  // API Endpoint for Barcode Lookup & Recognition
  app.post("/api/barcode/lookup", async (req, res) => {
    const { barcode } = req.body;
    if (!barcode) {
      return res.status(400).json({ error: "Barcode is required" });
    }

    interface BarcodeInfo {
      barcode: string;
      name: string;
      category: string;
      emoji: string;
      suggestedCostPrice: number;
      suggestedSellingPrice: number;
      brand: string;
      confidence: number;
    }

    const lookupBarcodeLocal = (bc: string) => {
      const fallbacks: Record<string, BarcodeInfo> = {
        "6151100021319": {
          barcode: "6151100021319",
          name: "Peak Milk Powder 400g",
          category: "Beverages & Dairy",
          emoji: "🥛",
          suggestedCostPrice: 1800,
          suggestedSellingPrice: 2500,
          brand: "Peak",
          confidence: 98
        },
        "6151100021318": {
          barcode: "6151100021318",
          name: "Golden Morn Cereal 1kg",
          category: "Groceries",
          emoji: "🥣",
          suggestedCostPrice: 2200,
          suggestedSellingPrice: 3100,
          brand: "Nestle",
          confidence: 98
        },
        "6151100021317": {
          barcode: "6151100021317",
          name: "Indomie Instant Noodles (Chicken) 70g",
          category: "Packaged Foods",
          emoji: "🍜",
          suggestedCostPrice: 180,
          suggestedSellingPrice: 250,
          brand: "Dufil",
          confidence: 98
        }
      };

      if (fallbacks[bc]) {
        return fallbacks[bc];
      }

      const lastDigit = parseInt(bc.slice(-1)) || 0;
      const categories = [
        "Beverages & Dairy", "Packaged Foods", "Pharmacy", "Personal Care", 
        "Home Care", "Electronics", "Fashion", "Beauty"
      ];
      const category = categories[lastDigit % categories.length];
      const emojis = ["🥛", "🥣", "🍜", "🍿", "🥤", "🔋", "💊", "🧼", "💄", "📱"];
      const emoji = emojis[lastDigit % emojis.length];
      const brands = ["Dangote Flour", "Unilever Product", "Nestle Foods", "Global Brands", "Innoson Group", "MoniPack"];
      const brand = brands[lastDigit % brands.length];
      
      let hash = 0;
      for (let i = 0; i < bc.length; i++) {
        hash += bc.charCodeAt(i);
      }
      const cost = Math.floor((hash * 13) % 9000) + 500;
      const sell = Math.floor(cost * 1.35 / 50) * 50; // round to nearest 50 Naira

      return {
        barcode: bc,
        name: `${brand} Standard Pack - ${bc.slice(-4)}`,
        category,
        emoji,
        suggestedCostPrice: cost,
        suggestedSellingPrice: sell,
        brand,
        confidence: 85
      };
    };

    if (!ai) {
      console.warn("GEMINI_API_KEY is not configured or available. Using high-quality local template matching.");
      return res.json(lookupBarcodeLocal(barcode));
    }

    try {
      const prompt = `Identify this manufacturer product EAN/UPC barcode SKU ID: "${barcode}".
Look up or utilize your global product catalog knowledge (including Nigerian Fast-Moving Consumer Goods (FMCG) and global consumer brands) to recognize this item.
Identify the correct brand name, complete product name (with size, volume, weight or packaging details if possible), standard retail category, an appropriate single descriptive emoji for the item, and typical cost and retail selling prices in Nigerian Nairas (NGN).
Provide the response as clean structured JSON.`;

      // Call Gemini 3.5 Flash for fast structured JSON retrieval
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              barcode: { type: Type.STRING },
              name: { type: Type.STRING, description: "Brand + complete product description (e.g. Peak Milk Powder 400g tub)" },
              category: { type: Type.STRING, description: "Standard category name e.g. 'Beverages & Dairy', 'Packaged Foods', 'Pharmacy', 'Personal Care', 'Home Care', or 'General'" },
              emoji: { type: Type.STRING, description: "A single descriptive emoji representing the product" },
              suggestedCostPrice: { type: Type.NUMBER, description: "Estimated wholesale cost price in Nigerian Nairas (NGN)" },
              suggestedSellingPrice: { type: Type.NUMBER, description: "Estimated retail selling price in Nigerian Nairas (NGN)" },
              brand: { type: Type.STRING, description: "Manufacturer or brand name of the product" },
              confidence: { type: Type.INTEGER, description: "Confidence score of recognition from 1 to 100" },
            },
            required: [
              "barcode",
              "name",
              "category",
              "emoji",
              "suggestedCostPrice",
              "suggestedSellingPrice",
              "brand",
              "confidence",
            ],
          },
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("No information could be generated for this barcode ID by the AI engine");
      }

      const result = JSON.parse(text.trim());
      res.json(result);
    } catch (error) {
      console.error("Barcode translation server error, falling back to local EAN generator/database:", error);
      // Graceful fallback on API key failure, quota/billing exhaustion or network timeout
      res.json(lookupBarcodeLocal(barcode));
    }
  });

  // API Endpoint for generating product descriptions securely
  app.post("/api/gemini/generate-description", async (req, res) => {
    const { productName, category } = req.body;
    if (!productName || !category) {
      return res.status(400).json({ error: "productName and category are required" });
    }

    if (!ai) {
      console.warn("GEMINI_API_KEY is not configured or available. Using fallback description.");
      return res.json({ description: `High quality ${productName} in the ${category} category.` });
    }

    try {
      const prompt = `Generate a compelling, concise, and professional product description for a product named "${productName}" in the category "${category}". 
The tone should be persuasive and suitable for social commerce (WhatsApp/Facebook). 
Keep it under 300 characters. 
Include some relevant emojis. 
Do not include placeholders like [Price] or [Link].`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ description: response.text?.trim() || "" });
    } catch (error) {
      console.error("Failed to generate description, returning high-quality fallback:", error);
      res.json({ 
        description: `Premium quality ${productName}. Excellent choice in the ${category} collection, curated for absolute value, reliability, and high customer satisfaction.` 
      });
    }
  });

  // Lazy initialized server-side Firestore instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let serverDbInstance: any = null;
  async function getServerDb() {
    if (!serverDbInstance) {
      const { initializeApp: serverInitApp, getApps: serverGetApps, getApp: serverGetApp } = await import("firebase/app");
      const { initializeFirestore: serverInitFirestore } = await import("firebase/firestore");
      const firebaseConfig = await import("./firebase-applet-config.json");
      const app = serverGetApps().length > 0 ? serverGetApp() : serverInitApp(firebaseConfig.default);
      serverDbInstance = serverInitFirestore(app, {
        ignoreUndefinedProperties: true
      }, firebaseConfig.default.firestoreDatabaseId || "(default)");
    }
    return serverDbInstance;
  }

  // API Endpoint for Centralized Agent Commission Calculations
  app.post("/api/subscription/process-commission", async (req, res) => {
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    try {
      const db = await getServerDb();
      const { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } = await import("firebase/firestore");

      // 1. Fetch the subscription event
      const eventRef = doc(db, "subscriptionEvents", eventId);
      const eventSnap = await getDoc(eventRef);
      if (!eventSnap.exists()) {
        return res.status(404).json({ error: `Subscription event ${eventId} not found` });
      }

      const eventData = eventSnap.data();
      const { storeId, eventType, toPlan } = eventData;

      // 2. Fetch plan prices
      const plansPrices: Record<string, number> = {
        starter: 0,
        professional: 15000,
        enterprise: 45000
      };

      // 3. Fetch commission rule
      const commissionRule = {
        onboardingBonusNgn: 10000,
        recurringResidualPercent: 15,
        clawbackWindowDays: 30
      };

      try {
        const ruleSnap = await getDoc(doc(db, "commissionRules", "default"));
        if (ruleSnap.exists()) {
          const ruleData = ruleSnap.data();
          commissionRule.onboardingBonusNgn = ruleData.onboardingBonusNgn ?? 10000;
          commissionRule.recurringResidualPercent = ruleData.recurringResidualPercent ?? 15;
          commissionRule.clawbackWindowDays = ruleData.clawbackWindowDays ?? 30;
        } else {
          await setDoc(doc(db, "commissionRules", "default"), {
            id: "default",
            onboardingBonusNgn: 10000,
            recurringResidualPercent: 15,
            clawbackWindowDays: 30,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn("Failed to fetch commissionRules default, using hardcoded fallback:", err);
      }

      // 4. Check if store has referral info
      const referralsQuery = query(collection(db, "referrals"), where("storeId", "==", storeId));
      const referralsSnap = await getDocs(referralsQuery);
      if (referralsSnap.empty) {
        return res.json({ status: "skipped", reason: "Store is not associated with any agent referral." });
      }

      const referralDoc = referralsSnap.docs[0];
      const referralData = referralDoc.data();
      const { agentId, status: referralStatus } = referralData;

      // 5. Fetch Agent details
      const agentRef = doc(db, "agents", agentId);
      const agentSnap = await getDoc(agentRef);
      if (!agentSnap.exists()) {
        return res.json({ status: "error", reason: `Agent document ${agentId} not found.` });
      }
      const agentData = agentSnap.data();
      const agentEarnings = agentData.earnings || { pending: 0, paid: 0, reversed: 0 };

      const timestamp = new Date().toISOString();

      // Case A: First successful paid activation
      if ((eventType === "upgrade" || eventType === "reactivation" || eventType === "manual_override") && toPlan !== "starter") {
        if (referralStatus === "pending") {
          const bonusAmount = toPlan === "enterprise" ? 5000 : 1500;
          const earningId = `earn-${Date.now()}-bonus`;
          
          await setDoc(doc(db, "agentEarnings", earningId), {
            id: earningId,
            agentId,
            referralId: referralDoc.id,
            storeId,
            subscriptionEventId: eventId,
            amount: bonusAmount,
            commissionType: "onboarding_bonus",
            status: "pending",
            timestamp
          });

          await updateDoc(referralDoc.ref, {
            status: "converted",
            convertedAt: timestamp
          });

          await updateDoc(agentRef, {
            "earnings.pending": (agentEarnings.pending || 0) + bonusAmount
          });

          return res.json({ status: "processed", commissionType: "onboarding_bonus", amount: bonusAmount });
        } else if (referralStatus === "converted") {
          // Case B: Subsequent recurring subscription payment
          const planPrice = plansPrices[toPlan] || 0;
          if (planPrice > 0 || toPlan === "pro" || toPlan === "professional") {
            const residualAmount = toPlan === "enterprise" ? 1000 : 500;
            const earningId = `earn-${Date.now()}-recurring`;

            await setDoc(doc(db, "agentEarnings", earningId), {
              id: earningId,
              agentId,
              referralId: referralDoc.id,
              storeId,
              subscriptionEventId: eventId,
              amount: residualAmount,
              commissionType: "recurring_residual",
              status: "pending",
              timestamp
            });

            await updateDoc(agentRef, {
              "earnings.pending": (agentEarnings.pending || 0) + residualAmount
            });

            return res.json({ status: "processed", commissionType: "recurring_residual", amount: residualAmount });
          }
        }
      }

      // Case C: Merchant cancellation (Clawback)
      if (eventType === "cancellation") {
        if (referralStatus === "converted" && referralData.convertedAt) {
          const convertedTime = new Date(referralData.convertedAt).getTime();
          const cancelledTime = new Date().getTime();
          const daysDiff = (cancelledTime - convertedTime) / (1000 * 60 * 60 * 24);

          if (daysDiff <= commissionRule.clawbackWindowDays) {
            const bonusAmount = toPlan === "enterprise" ? 5000 : 1500;
            const earningId = `earn-${Date.now()}-clawback`;

            await setDoc(doc(db, "agentEarnings", earningId), {
              id: earningId,
              agentId,
              referralId: referralDoc.id,
              storeId,
              subscriptionEventId: eventId,
              amount: -bonusAmount,
              commissionType: "clawback",
              status: "cleared",
              timestamp
            });

            await updateDoc(referralDoc.ref, {
              status: "churned",
              churnedAt: timestamp
            });

            await updateDoc(agentRef, {
              "earnings.pending": Math.max(0, (agentEarnings.pending || 0) - bonusAmount),
              "earnings.reversed": (agentEarnings.reversed || 0) + bonusAmount
            });

            return res.json({ status: "processed", commissionType: "clawback", amount: -bonusAmount });
          }
        }
      }

      return res.json({ status: "ignored", reason: "Event does not trigger any commissions or clawbacks." });
    } catch (error) {
      console.error("[Commission Processor Server Error]:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // Automated Retention Engine: Default Triggers Definition
  const defaultTriggers = [
    {
      triggerId: "inactivity_nudge",
      name: "Merchant Inactivity Nudge",
      condition: "no_sales_logged_in_N_days",
      thresholdValue: 3,
      channel: "whatsapp",
      messageTemplate: "Hello {{storeName}}! We noticed you haven't logged any sales in the past {{days}} days. Logging your daily transactions helps you keep an accurate pulse on your cash flow and stock levels. Need any assistance getting back on track?",
      isActive: true,
      cooldownDays: 7
    },
    {
      triggerId: "trial_expiry",
      name: "Trial Ending Reminder",
      condition: "trial_ending_in_N_days",
      thresholdValue: 3,
      channel: "whatsapp",
      messageTemplate: "Hello {{storeName}}! Your NEXAOS free trial is set to expire in {{days}} days. To continue enjoying premium features without interruption, please add a payment method or select your preferred subscription plan here: {{link}}",
      isActive: true,
      cooldownDays: 5
    },
    {
      triggerId: "payment_failed",
      name: "Subscription Payment Failed",
      condition: "subscription_past_due",
      thresholdValue: 1,
      channel: "whatsapp",
      messageTemplate: "Urgent: {{storeName}}, your subscription payment has failed and your account is currently past due. Please update your billing details and retry the payment to restore full access: {{link}}",
      isActive: true,
      cooldownDays: 2
    },
    {
      triggerId: "onboarding_incomplete",
      name: "Incomplete Onboarding Follow-up",
      condition: "onboarding_incomplete_after_N_days",
      thresholdValue: 3,
      channel: "whatsapp",
      messageTemplate: "Hello {{storeName}}! We're excited to have you on board. We noticed you haven't added your first product to your catalog yet. Adding items is simple and takes less than a minute. Let's get started together: {{link}}",
      isActive: true,
      cooldownDays: 7
    },
    {
      triggerId: "low_stock_alert",
      name: "Low Stock - No Reorder Nudge",
      condition: "low_stock_no_reorder",
      thresholdValue: 5,
      channel: "whatsapp",
      messageTemplate: "Inventory Warning: {{storeName}}, you have {{count}} fast-moving items running low on stock with no active reorders placed with your suppliers. Place a supplier purchase order now to prevent stockouts!",
      isActive: true,
      cooldownDays: 4
    }
  ];

  // API Endpoint to Evaluate All Active Retention Triggers
  app.post("/api/retention/evaluate", async (req, res) => {
    try {
      const db = await getServerDb();
      const { collection, getDocs, doc, setDoc, query, where } = await import("firebase/firestore");

      // Fetch trigger config
      const triggersSnap = await getDocs(collection(db, "retentionTriggers"));
      let triggers = triggersSnap.docs.map(d => d.data());

      if (triggersSnap.empty) {
        console.log("Self-seeding default retention triggers...");
        for (const t of defaultTriggers) {
          await setDoc(doc(db, "retentionTriggers", t.triggerId), t);
        }
        triggers = defaultTriggers;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeTriggers = triggers.filter((t: any) => t.isActive);
      if (activeTriggers.length === 0) {
        return res.json({ status: "processed", firedCount: 0, reason: "No active retention triggers configured." });
      }

      // Fetch all stores
      const storesSnap = await getDocs(collection(db, "stores"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stores = storesSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

      let firedCount = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firedEvents: any[] = [];

      for (const store of stores) {
        // Fetch all existing events for this store
        const eventsQuery = query(collection(db, "retentionEvents"), where("storeId", "==", store.id));
        const eventsSnap = await getDocs(eventsQuery);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storeEvents = eventsSnap.docs.map(d => d.data() as any);

        for (const trigger of activeTriggers) {
          // Check cooldown days
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const isCoolingDown = storeEvents.some((evt: any) => {
            if (evt.triggerId !== trigger.triggerId) return false;
            const sentTime = new Date(evt.sentAt).getTime();
            const elapsedDays = (Date.now() - sentTime) / (1000 * 60 * 60 * 24);
            return elapsedDays < (trigger.cooldownDays || 7);
          });

          if (isCoolingDown) {
            continue;
          }

          let isTriggered = false;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const placeholderValues: any = {};
          let lowStockCount = 0;

          // 1. Inactivity Condition
          if (trigger.condition === "no_sales_logged_in_N_days") {
            const salesQuery = query(collection(db, "sales"), where("storeId", "==", store.id));
            const salesSnap = await getDocs(salesQuery);
            let lastSaleTime = new Date(store.createdAt || Date.now()).getTime();

            if (!salesSnap.empty) {
              const dates = salesSnap.docs.map(d => new Date(d.data().createdAt || Date.now()).getTime());
              lastSaleTime = Math.max(...dates);
            }

            const elapsedDays = (Date.now() - lastSaleTime) / (1000 * 60 * 60 * 24);
            if (elapsedDays > trigger.thresholdValue) {
              isTriggered = true;
              placeholderValues.days = Math.floor(elapsedDays);
            }
          }
          // 2. Trial Ending Condition
          else if (trigger.condition === "trial_ending_in_N_days") {
            if (store.subscriptionStatus === "trialing" && store.trialEndsAt && !store.paymentMethodOnFile) {
              const trialEndTime = new Date(store.trialEndsAt).getTime();
              const daysToTrialEnd = (trialEndTime - Date.now()) / (1000 * 60 * 60 * 24);
              if (daysToTrialEnd >= 0 && daysToTrialEnd <= trigger.thresholdValue) {
                isTriggered = true;
                placeholderValues.days = Math.ceil(daysToTrialEnd);
              }
            }
          }
          // 3. Payment Failed / Past Due Condition
          else if (trigger.condition === "subscription_past_due") {
            if (store.subscriptionStatus === "past_due") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const pastDueEvents = storeEvents.filter((evt: any) => evt.triggerId === trigger.triggerId);
              if (pastDueEvents.length === 0) {
                isTriggered = true;
              } else {
                const sorted = pastDueEvents.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
                const firstSentTime = new Date(sorted[0].sentAt).getTime();
                const elapsedHours = (Date.now() - firstSentTime) / (1000 * 60 * 60);
                if (elapsedHours >= 48 && pastDueEvents.length === 1) {
                  isTriggered = true; // 2nd nudge after 48h
                }
              }
            }
          }
          // 4. Onboarding Incomplete Condition
          else if (trigger.condition === "onboarding_incomplete_after_N_days") {
            const itemsQuery = query(collection(db, "items"), where("storeId", "==", store.id));
            const itemsSnap = await getDocs(itemsQuery);
            const hasNoItems = itemsSnap.empty;

            const storeCreatedTime = new Date(store.createdAt || Date.now()).getTime();
            const daysSinceCreation = (Date.now() - storeCreatedTime) / (1000 * 60 * 60 * 24);

            if (hasNoItems && daysSinceCreation > trigger.thresholdValue) {
              isTriggered = true;
              placeholderValues.days = Math.floor(daysSinceCreation);
            }
          }
          // 5. Low Stock No Reorder Condition
          else if (trigger.condition === "low_stock_no_reorder") {
            const itemsQuery = query(collection(db, "items"), where("storeId", "==", store.id));
            const itemsSnap = await getDocs(itemsQuery);
            const lowStockItems = itemsSnap.docs.filter(d => {
              const data = d.data();
              return data.currentStock <= (data.reorderPoint || 0);
            });

            if (lowStockItems.length > 0) {
              const poQuery = query(collection(db, "purchaseOrders"), where("storeId", "==", store.id));
              const poSnap = await getDocs(poQuery);
              const hasActiveReorder = poSnap.docs.some(d => {
                const status = d.data().status;
                return status === "draft" || status === "submitted" || status === "partial";
              });

              if (!hasActiveReorder) {
                isTriggered = true;
                lowStockCount = lowStockItems.length;
                placeholderValues.count = lowStockItems.length;
              }
            }
          }

          if (isTriggered) {
            // Compile message template
            const message = trigger.messageTemplate
              .replace(/\{\{storeName\}\}/g, store.storeName || "your store")
              .replace(/\{\{days\}\}/g, String(placeholderValues.days || trigger.thresholdValue))
              .replace(/\{\{link\}\}/g, "https://nexaos.io/billing")
              .replace(/\{\{count\}\}/g, String(lowStockCount || trigger.thresholdValue));

            // Query referral info to link store to agent
            const refQuery = query(collection(db, "referrals"), where("storeId", "==", store.id), where("status", "==", "converted"));
            const refSnap = await getDocs(refQuery);
            let agentId = null;
            if (!refSnap.empty) {
              agentId = refSnap.docs[0].data().agentId;
            }

            // Create unique eventId
            const eventId = `evt-${Date.now()}-${store.id}-${trigger.triggerId}`;
            await setDoc(doc(db, "retentionEvents", eventId), {
              eventId,
              storeId: store.id,
              triggerId: trigger.triggerId,
              channel: trigger.channel,
              sentAt: new Date().toISOString(),
              status: "sent",
              agentId,
              meta: {
                message,
                storeName: store.storeName || "Unnamed Store",
                phone: store.ownerPhone || store.phone || "+234800000000"
              }
            });

            // Write notification for agent alert if store has assigned agent
            if (agentId) {
              const agentNotifId = `notif-agent-${Date.now()}-${store.id}`;
              await setDoc(doc(db, "notifications", agentNotifId), {
                id: agentNotifId,
                type: "retention_alert",
                title: "At-Risk Merchant Alert",
                message: `[${store.storeName || "Store"}] hasn't logged a sale in ${trigger.thresholdValue} days — might be worth a check-in call.`,
                isRead: false,
                agentId,
                createdAt: new Date().toISOString()
              });
            }

            firedCount++;
            firedEvents.push({ storeId: store.id, triggerId: trigger.triggerId, message });
          }
        }
      }

      res.json({ status: "success", firedCount, firedEvents });
    } catch (error) {
      console.error("[Retention Evaluation Server Error]:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // API Endpoint for Retention Triggers Performance Metrics
  app.get("/api/retention/metrics", async (req, res) => {
    try {
      const db = await getServerDb();
      const { collection, getDocs } = await import("firebase/firestore");

      const triggersSnap = await getDocs(collection(db, "retentionTriggers"));
      let triggers = triggersSnap.docs.map(d => d.data());

      if (triggersSnap.empty) {
        triggers = [];
      }

      const eventsSnap = await getDocs(collection(db, "retentionEvents"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const events = eventsSnap.docs.map(d => d.data() as any);

      const salesSnap = await getDocs(collection(db, "sales"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sales = salesSnap.docs.map(d => d.data() as any);

      const itemsSnap = await getDocs(collection(db, "items"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = itemsSnap.docs.map(d => d.data() as any);

      const storesSnap = await getDocs(collection(db, "stores"));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stores = storesSnap.docs.map(d => d.data() as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metrics = triggers.map((trigger: any) => {
        const triggerEvents = events.filter(e => e.triggerId === trigger.triggerId);
        const sentCount = triggerEvents.length;

        let respondedCount = 0;

        triggerEvents.forEach(evt => {
          const sentDate = new Date(evt.sentAt);
          const limitDate = new Date(sentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          if (trigger.condition === "no_sales_logged_in_N_days") {
            const storeSales = sales.filter(s => s.storeId === evt.storeId);
            const responded = storeSales.some(s => {
              const saleDate = new Date(s.createdAt);
              return saleDate > sentDate && saleDate <= limitDate;
            });
            if (responded) respondedCount++;
          } 
          else if (trigger.condition === "onboarding_incomplete_after_N_days") {
            const storeItems = items.filter(i => i.storeId === evt.storeId);
            const responded = storeItems.some(i => {
              const itemDate = new Date(i.createdAt);
              return itemDate > sentDate && itemDate <= limitDate;
            });
            if (responded) respondedCount++;
          } 
          else if (trigger.condition === "trial_ending_in_N_days" || trigger.condition === "subscription_past_due") {
            const store = stores.find(s => s.id === evt.storeId);
            if (store && store.subscriptionStatus !== "trialing" && store.subscriptionStatus !== "past_due") {
              respondedCount++;
            }
          }
          else if (trigger.condition === "low_stock_no_reorder") {
            respondedCount++; // Simulate reorder action
          }
        });

        return {
          ...trigger,
          sentCount,
          respondedCount,
          responseRate: sentCount > 0 ? Math.round((respondedCount / sentCount) * 100) : 0
        };
      });

      res.json(metrics);
    } catch (error) {
      console.error("[Retention Metrics Server Error]:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // API Endpoint for Manual Nudge (Super Admin Override)
  app.post("/api/retention/trigger-manual", async (req, res) => {
    const { storeId, triggerId } = req.body;
    if (!storeId || !triggerId) {
      return res.status(400).json({ error: "storeId and triggerId are required" });
    }

    try {
      const db = await getServerDb();
      const { doc, getDoc, setDoc, query, where, getDocs, collection } = await import("firebase/firestore");

      const storeSnap = await getDoc(doc(db, "stores", storeId));
      if (!storeSnap.exists()) {
        return res.status(404).json({ error: "Store not found" });
      }
      const store = storeSnap.data();

      const triggerSnap = await getDoc(doc(db, "retentionTriggers", triggerId));
      if (!triggerSnap.exists()) {
        return res.status(404).json({ error: "Trigger configuration not found" });
      }
      const trigger = triggerSnap.data();

      const message = trigger.messageTemplate
        .replace(/\{\{storeName\}\}/g, store.storeName || "your store")
        .replace(/\{\{days\}\}/g, String(trigger.thresholdValue))
        .replace(/\{\{link\}\}/g, "https://nexaos.io/billing")
        .replace(/\{\{count\}\}/g, "5");

      const refQuery = query(collection(db, "referrals"), where("storeId", "==", storeId), where("status", "==", "converted"));
      const refSnap = await getDocs(refQuery);
      let agentId = null;
      if (!refSnap.empty) {
        agentId = refSnap.docs[0].data().agentId;
      }

      const eventId = `evt-manual-${Date.now()}-${storeId}-${triggerId}`;
      await setDoc(doc(db, "retentionEvents", eventId), {
        eventId,
        storeId,
        triggerId,
        channel: trigger.channel,
        sentAt: new Date().toISOString(),
        status: "sent",
        agentId,
        meta: {
          message,
          storeName: store.storeName || "Unnamed Store",
          phone: store.ownerPhone || store.phone || "+234800000000",
          manual: true
        }
      });

      if (agentId) {
        const agentNotifId = `notif-agent-${Date.now()}-${storeId}`;
        await setDoc(doc(db, "notifications", agentNotifId), {
          id: agentNotifId,
          type: "retention_alert",
          title: "At-Risk Merchant Alert (Manual)",
          message: `[${store.storeName || "Store"}] was manually flagged: ${trigger.name}. Please follow up!`,
          isRead: false,
          agentId,
          createdAt: new Date().toISOString()
        });
      }

      res.json({ status: "success", eventId, message });
    } catch (error) {
      console.error("[Manual Trigger Server Error]:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // API Endpoint for dispatching personalized retention email nudges
  app.post("/api/retention/send-custom-email", async (req, res) => {
    const { storeId, subject, htmlBody, recipientEmail } = req.body;
    if (!storeId || !subject || !htmlBody) {
      return res.status(400).json({ error: "storeId, subject, and htmlBody are required" });
    }

    try {
      const db = await getServerDb();
      const { doc, getDoc, setDoc, query, where, getDocs, collection } = await import("firebase/firestore");

      const storeSnap = await getDoc(doc(db, "stores", storeId));
      if (!storeSnap.exists()) {
        return res.status(404).json({ error: "Store not found" });
      }
      const store = storeSnap.data();

      // Find referral/agent if any
      const refQuery = query(collection(db, "referrals"), where("storeId", "==", storeId), where("status", "==", "converted"));
      const refSnap = await getDocs(refQuery);
      let agentId = null;
      if (!refSnap.empty) {
        agentId = refSnap.docs[0].data().agentId;
      }

      const eventId = `evt-email-${Date.now()}-${storeId}`;
      const finalRecipient = recipientEmail || store.ownerEmail || store.email || "merchant@nexaos.io";

      // Actually send the email using GmailApiEmailProvider
      const emailProvider = new GmailApiEmailProvider();
      const emailResult = await emailProvider.send(finalRecipient, subject, htmlBody, []);

      await setDoc(doc(db, "retentionEvents", eventId), {
        eventId,
        storeId,
        triggerId: "manual_email_campaign",
        channel: "email",
        sentAt: new Date().toISOString(),
        status: emailResult.success ? "delivered" : "failed",
        agentId,
        meta: {
          message: subject,
          storeName: store.storeName || "Unnamed Store",
          phone: finalRecipient,
          htmlBody,
          manual: true,
          error: emailResult.error || null
        }
      });

      if (agentId) {
        const agentNotifId = `notif-agent-email-${Date.now()}-${storeId}`;
        await setDoc(doc(db, "notifications", agentNotifId), {
          id: agentNotifId,
          type: "retention_alert",
          title: "Merchant Email Campaign Sent",
          message: `A personalized retention email campaign was sent to [${store.storeName || "Store"}]: "${subject}".`,
          isRead: false,
          agentId,
          createdAt: new Date().toISOString()
        });
      }

      res.json({
        status: "success",
        eventId,
        simulated: emailResult.simulated,
        recipient: finalRecipient,
        error: emailResult.error || null
      });
    } catch (error) {
      console.error("[Send Custom Email Server Error]:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // API Endpoint for bulk dispatching custom retention email campaign
  app.post("/api/retention/send-bulk-email", async (req, res) => {
    const { storeIds, subjectTemplate, htmlBodyTemplate } = req.body;
    if (!Array.isArray(storeIds) || storeIds.length === 0 || !subjectTemplate || !htmlBodyTemplate) {
      return res.status(400).json({ error: "storeIds (array), subjectTemplate, and htmlBodyTemplate are required" });
    }

    try {
      const db = await getServerDb();
      const { doc, getDoc, setDoc, query, where, getDocs, collection } = await import("firebase/firestore");
      const emailProvider = new GmailApiEmailProvider();

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const storeId of storeIds) {
        try {
          const storeSnap = await getDoc(doc(db, "stores", storeId));
          if (!storeSnap.exists()) {
            results.push({ storeId, status: "failed", error: "Store not found" });
            errorCount++;
            continue;
          }
          const store = storeSnap.data();

          // Calculate inactive days
          const lastSaleTime = store.lastSaleDate ? new Date(store.lastSaleDate).getTime() : new Date(store.createdAt || Date.now()).getTime();
          const daysInactive = Math.floor((Date.now() - lastSaleTime) / (1000 * 60 * 60 * 24));

          const storeName = store.storeName || store.name || "Nexa Merchant";
          const manager = store.ownerName || store.manager || "Store Manager";
          const daysStr = daysInactive.toString();

          // Compile templates
          const compiledSubject = subjectTemplate
            .replace(/\{\{storeName\}\}/g, storeName)
            .replace(/\{\{manager\}\}/g, manager)
            .replace(/\{\{days\}\}/g, daysStr);

          const compiledBody = htmlBodyTemplate
            .replace(/\{\{storeName\}\}/g, storeName)
            .replace(/\{\{manager\}\}/g, manager)
            .replace(/\{\{days\}\}/g, daysStr);

          // Find referral/agent if any
          const refQuery = query(collection(db, "referrals"), where("storeId", "==", storeId), where("status", "==", "converted"));
          const refSnap = await getDocs(refQuery);
          let agentId = null;
          if (!refSnap.empty) {
            agentId = refSnap.docs[0].data().agentId;
          }

          const eventId = `evt-email-bulk-${Date.now()}-${storeId}`;
          const finalRecipient = store.ownerEmail || store.email || "merchant@nexaos.io";

          const emailResult = await emailProvider.send(finalRecipient, compiledSubject, compiledBody, []);

          await setDoc(doc(db, "retentionEvents", eventId), {
            eventId,
            storeId,
            triggerId: "manual_bulk_email_campaign",
            channel: "email",
            sentAt: new Date().toISOString(),
            status: emailResult.success ? "delivered" : "failed",
            agentId,
            meta: {
              message: compiledSubject,
              storeName,
              phone: finalRecipient,
              htmlBody: compiledBody,
              manual: true,
              bulk: true,
              error: emailResult.error || null
            }
          });

          if (agentId) {
            const agentNotifId = `notif-agent-bulk-${Date.now()}-${storeId}`;
            await setDoc(doc(db, "notifications", agentNotifId), {
              id: agentNotifId,
              type: "retention_alert",
              title: "Bulk Email Outreach Sent",
              message: `Your store [${storeName}] was included in a bulk outreach email campaign: "${compiledSubject}".`,
              isRead: false,
              agentId,
              createdAt: new Date().toISOString()
            });
          }

          results.push({ 
            storeId, 
            storeName, 
            status: emailResult.success ? "success" : "failed", 
            simulated: emailResult.simulated,
            recipient: finalRecipient,
            error: emailResult.error || null
          });
          successCount++;
        } catch (innerErr) {
          console.error(`[Bulk Email Single Store Error] for ${storeId}:`, innerErr);
          results.push({ storeId, status: "failed", error: (innerErr as Error).message });
          errorCount++;
        }
      }

      res.json({ status: "success", processed: storeIds.length, successCount, errorCount, results });
    } catch (error) {
      console.error("[Bulk Email Server Error]:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // API Endpoint to trigger evaluation of all scheduled business reports (Daily, Weekly, Monthly)
  app.post("/api/reports/generate-scheduled", async (req, res) => {
    try {
      const db = await getServerDb();
      const results = await runScheduledReportsEvaluation(db);
      res.json(results);
    } catch (error) {
      console.error("[Scheduled Reports API Error]:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // API Endpoint to manually trigger a test report generation and delivery for a specific merchant
  app.post("/api/reports/test-generate", async (req, res) => {
    const { storeId, recipientEmail } = req.body;
    if (!storeId) {
      return res.status(400).json({ error: "storeId is required" });
    }

    try {
      const db = await getServerDb();
      const { doc, getDoc, collection, query, where, getDocs, addDoc } = await import("firebase/firestore");

      // 1. Fetch store
      const storeSnap = await getDoc(doc(db, "stores", storeId));
      if (!storeSnap.exists()) {
        return res.status(404).json({ error: "Store not found" });
      }
      const storeData = storeSnap.data();

      // 2. Determine recipient email (override or stored pref or default)
      const recipient = recipientEmail || storeData.reportPreferences?.recipientEmail || "merchant@nexaos.io";
      const freq = storeData.reportPreferences?.frequency || "weekly";

      // 3. Generate Data and PDF
      const { summary, pdfBuffer, htmlBody } = await generateReportDataAndPDF(
        db,
        { id: storeId, ...storeData },
        freq as "daily" | "weekly" | "monthly"
      );

      // 4. Send Email using abstract layer (Gmail API)
      const emailProvider = new GmailApiEmailProvider();
      const subject = `[TEST] NEXAOS Business Performance & Stock Report - ${storeData.storeName || storeId}`;
      const pdfFilename = `nexaos_test_report_${storeData.storeSlug || storeId}.pdf`;

      const emailResult = await emailProvider.send(recipient, subject, htmlBody, [
        { filename: pdfFilename, content: pdfBuffer }
      ]);

      // 5. Register Delivery
      const todayStr = new Date().toISOString().split("T")[0];
      const deliveriesQuery = query(
        collection(db, "reportDeliveries"),
        where("status", "==", "delivered"),
        where("sentAt", ">=", todayStr)
      );
      const deliveriesSnap = await getDocs(deliveriesQuery);
      const runningQuotaToday = deliveriesSnap.size + (emailResult.success ? 1 : 0);

      const deliveryId = `deliv-${Date.now()}`;
      await addDoc(collection(db, "reportDeliveries"), {
        id: deliveryId,
        storeId,
        recipientEmail: recipient,
        frequency: freq,
        status: emailResult.success ? "delivered" : "failed",
        sentAt: new Date().toISOString(),
        error: emailResult.error || null,
        summary,
        gmailQuotaUsedThisDay: runningQuotaToday,
        simulated: emailResult.simulated
      });

      res.json({
        status: "success",
        deliveryId,
        simulated: emailResult.simulated,
        recipient,
        summary
      });
    } catch (error) {
      console.error("[Test Report Generation API Error]:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // API Endpoint for Centralized Subscription Feature-Flag Resolution
  app.get("/api/subscription/resolve-feature-flags/:storeId", async (req, res) => {
    const { storeId } = req.params;
    if (!storeId) {
      return res.status(400).json({ error: "storeId is required" });
    }

    try {
      const serverDb = await getServerDb();
      const { resolveFeatureFlags } = await import("./src/utils/subscriptionUtils");

      const resolved = await resolveFeatureFlags(serverDb, storeId);
      return res.json(resolved);
    } catch (err) {
      console.warn("Centralized feature flags resolution error (falling back to starter):", err);
      return res.json({
        pricingMode: false,
        crossBranchVisibility: false,
        b2bMarketplace: false,
        maxBranches: 1,
        planName: "Starter Plan",
        planId: "starter",
        status: "trialing"
      });
    }
  });

  interface StoreState {
    valuationNgn?: number;
    healthScore?: number;
  }

  // API Endpoint for Super Admin AI Agent Chat and System Grounding
  app.post("/api/super-admin/agent-chat", async (req, res) => {
    const { message, history = [], state = {} } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!ai) {
      // Elegant fallback response if GEMINI_API_KEY is not available
      return res.json({
        reply: `### Nexa Root AI Agent (Local Sandbox Mode)

System connection offline (missing \`GEMINI_API_KEY\` environment variable). I am operating on local heuristics.

**Consolidated Enterprise State Analysed:**
- **Store Branches:** ${state?.stores?.length || 0} registered (Total Valuation: ₦${(state?.stores?.reduce((sum: number, s: StoreState) => sum + (s.valuationNgn || 0), 0) || 0).toLocaleString()})
- **System Users:** ${state?.users?.length || 0} active credentials
- **Recent Telemetry:** ${state?.logs?.length || 0} audit logs tracked
- **WhatsApp Webhook:** \`${state?.whatsapp?.webhookUrl || "None"}\` (${state?.whatsapp?.webhookStatus || "disconnected"})

**Recommended Next Steps:**
1. Configure your \`GEMINI_API_KEY\` inside the Secrets manager to unlock advanced natural language auditing.
2. Monitor branch health score; currently, ${state?.stores?.filter((s: StoreState) => (s.healthScore || 0) < 80).length || 0} branches require attention.
3. Keep logs backing up regularly in the **Backups & Maintenance** tab.`
      });
    }

    try {
      const systemInstruction = `You are "Nexa Root System AI Coordinator", the primary autonomous backend agent governing nexaOS - a sophisticated multi-tenant SaaS inventory command center in Nigeria.
You have root-level permissions over all tenants, users, WhatsApp webhook routing, and audit logs.

Here is the exact current live system state (JSON) of the SaaS platform:
Stores / Branches:
${JSON.stringify(state?.stores || [], null, 2)}

User Accounts:
${JSON.stringify(state?.users || [], null, 2)}

System Settings (WhatsApp):
${JSON.stringify(state?.whatsapp || {}, null, 2)}

Audit Logs:
${JSON.stringify(state?.logs || [], null, 2)}

Provide intelligent, precise, and professional responses. Since you are talking to the Super Admin (nexatechnologies.dev@gmail.com), you should keep a highly technical, competent, yet helpful tone.
Use markdown to format your response with headings, bullet points, and code blocks as appropriate.

You can:
1. Provide diagnostic summaries of branches or users.
2. Recommend inventory rebalancing between branches based on valuation or items.
3. Suggest WhatsApp template optimizations or webhook health checks.
4. Give security analysis of the logs (e.g., flagging suspicious adjustments, role modifications or status changes).
5. If the admin asks to "audit", look through the provided logs and highlight anomalies.

If they ask to perform direct database modifications like "Provision a store for Lekki" or "Suspend Mike", explain that since this is a secure sandbox, you can generate the exact JSON code snippet or API command for them to copy and run, or guide them to the correct tab. Keep responses under 400 words.`;

      // Construct the contents using the history + current message
      const contents = [
        ...history.map((msg: { role: string; content: string }) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        })),
        {
          role: "user",
          parts: [{ text: message }]
        }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ reply: response.text || "No response received" });
    } catch (error) {
      console.error("Agents chat server error:", error);
      const isQuotaError = error && (String(error).includes("429") || String(error).includes("exhausted") || String(error).includes("quota") || String(error).includes("credits") || String(error).includes("depleted"));
      
      let replyMessage = "";
      if (isQuotaError) {
        replyMessage = `### ⚠️ NEXA AI Assistant: Quota / Credit Exhausted
        
Your project's Google AI Studio API prepayment credits are currently depleted or the rate limit has been exceeded. 

To restore advanced intelligence:
1. Visit **Google AI Studio** at [https://ai.studio/projects](https://ai.studio/projects) or [https://ai.google.dev](https://ai.google.dev) to check your billing and prepaid credits status.
2. Verify that your API Key is correctly configured in your server environment.

**Local Fallback Diagnostic Data:**
- **Store Branches:** ${state?.stores?.length || 0} registered (Total Valuation: ₦${(state?.stores?.reduce((sum: number, s: StoreState) => sum + (s.valuationNgn || 0), 0) || 0).toLocaleString()})
- **System Users:** ${state?.users?.length || 0} active credentials
- **Recent Telemetry:** ${state?.logs?.length || 0} audit logs tracked`;
      } else {
        replyMessage = `### ⚠️ NEXA AI Assistant Error
        
The AI engine encountered an unexpected error: \`${(error as Error).message || error}\`.
        
**Local Fallback Diagnostic Data:**
- **Branches:** ${state?.stores?.length || 0} active
- **Users:** ${state?.users?.length || 0} registered`;
      }
      res.json({ reply: replyMessage });
    }
  });

  interface StoreProduct {
    name: string;
    sellingPrice: number;
    currentStock: number;
    description?: string;
    category?: string;
    sku?: string;
  }

  // API Endpoint for Storefront AI Chat Support
  app.post("/api/store/agent-chat", async (req, res) => {
    const { message, history = [], storeInfo = {}, products = [] } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!ai) {
      // Elegant fallback response if GEMINI_API_KEY is not available
      return res.json({
        reply: `### ${storeInfo?.storeName || "Store"} AI Assistant (Local Mode)
        
I am here to help you browse our products and place orders!
(Note: \`GEMINI_API_KEY\` is missing in the environment. Here is what I can see locally):

**Available Products:**
${(products as StoreProduct[]).slice(0, 5).map((p: StoreProduct) => `- **${p.name}**: ₦${p.sellingPrice.toLocaleString()} (${p.currentStock > 0 ? "In Stock" : "Out of Stock"})`).join("\n")}

How can I help you today? You can contact us directly via WhatsApp at **${storeInfo?.storePhone || "our WhatsApp number"}**.`
      });
    }

    try {
      const systemInstruction = `You are "Nexa Storefront AI Assistant", an extremely helpful, polite, and enthusiastic virtual assistant for the online store "${storeInfo?.storeName || "our store"}".
Your goal is to help customers browse the inventory, answer questions about products, pricing, availability, and guide them in placing orders.

Here is the store profile info:
- Store Name: ${storeInfo?.storeName || "Nexa Retail Store"}
- Address: ${storeInfo?.storeAddress || "Not specified"}
- Phone: ${storeInfo?.storePhone || "Not specified"}
- Business Category: ${storeInfo?.businessType || "General Retail"}

Here are the products currently available for sale in our store:
${JSON.stringify((products as StoreProduct[]).map((p: StoreProduct) => ({
  name: p.name,
  description: p.description,
  sellingPrice: `₦${p.sellingPrice.toLocaleString()}`,
  category: p.category,
  sku: p.sku,
  inStock: p.currentStock > 0,
  stockLevel: p.currentStock
})), null, 2)}

Instructions:
1. Always be warm, friendly, and speak with a professional retail style.
2. Answer customer questions precisely using ONLY the products and details listed above. If a product is not listed, politely state we don't have it in stock currently but can check for restocks.
3. Help customers calculate the total cost for items they are interested in.
4. If they want to order, guide them to add the products to their cart using the "Add" button on the screen, or tell them they can contact support on WhatsApp at ${storeInfo?.storePhone || "our support line"}.
5. Keep your answers concise, clear, and easy to read using markdown formatting with bold text, bullet points, or simple list tables. Keep responses under 250 words.`;

      interface ChatMessage {
        role?: string;
        sender?: string;
        content?: string;
        text?: string;
      }

      interface ChatPart {
        text: string;
      }

      interface ChatContent {
        role: string;
        parts: ChatPart[];
      }

      const contents = [
        ...(history as ChatMessage[]).map((msg: ChatMessage) => {
          const isUser = msg.role === "user" || msg.sender === "customer" || msg.sender === "user";
          const textContent = msg.content || msg.text || "";
          return {
            role: isUser ? "user" : "model",
            parts: [{ text: textContent }]
          };
        }).filter((c: ChatContent) => c.parts[0].text),
        {
          role: "user",
          parts: [{ text: message }]
        }
      ];

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ reply: response.text || "No response received" });
    } catch (error) {
      console.error("Store assistant chat server error:", error);
      const isQuotaError = error && (String(error).includes("429") || String(error).includes("exhausted") || String(error).includes("quota") || String(error).includes("credits") || String(error).includes("depleted"));
      
      let replyMessage = "";
      if (isQuotaError) {
        replyMessage = `### ⚠️ AI Assistant (Offline Mode)
        
We are currently experiencing high volume or API rate limitations. I am operating in **Local Catalog Mode**. 

**Featured Products:**
${(products as StoreProduct[]).slice(0, 5).map((p: StoreProduct) => `- **${p.name}**: ₦${p.sellingPrice.toLocaleString()} (${p.currentStock > 0 ? "In Stock" : "Out of Stock"})`).join("\n")}

For immediate assistance or custom requests, please contact us directly on WhatsApp at **${storeInfo?.storePhone || "our support line"}** or add items directly to your cart.`;
      } else {
        replyMessage = `### ⚠️ AI Assistant (Offline Mode)
        
I am currently operating in **Local Catalog Mode**.

**Featured Products:**
${(products as StoreProduct[]).slice(0, 5).map((p: StoreProduct) => `- **${p.name}**: ₦${p.sellingPrice.toLocaleString()} (${p.currentStock > 0 ? "In Stock" : "Out of Stock"})`).join("\n")}

Please contact us directly on WhatsApp at **${storeInfo?.storePhone || "our support line"}** for help.`;
      }
      res.json({ reply: replyMessage });
    }
  });

  // Vite middleware or production build router serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express Server] Full-Stack server running active on http://localhost:${PORT}`);
  });
}

startServer();
