import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface QRLeadEvent {
  id: string;
  qrSourceId: string;
  storeId: string;
  branchId: string | null;
  eventType: "scan" | "cta_click";
  timestamp: string;
}

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export async function logQRLeadEvent(params: {
  qrSourceId: string;
  storeId: string;
  branchId?: string | null;
  eventType: "scan" | "cta_click";
}): Promise<void> {
  const { qrSourceId, storeId, branchId = null, eventType } = params;

  if (!qrSourceId || !storeId) {
    console.warn("[QR Attribution] Cannot log event: missing qrSourceId or storeId", params);
    return;
  }

  // Client-side rate-limiting / session-based deduplication
  const storageKey = `qr_cooldown_${qrSourceId}_${eventType}`;
  const now = Date.now();
  const lastLoggedStr = localStorage.getItem(storageKey);

  if (lastLoggedStr) {
    const lastLogged = parseInt(lastLoggedStr, 10);
    if (now - lastLogged < COOLDOWN_MS) {
      console.log(`[QR Attribution] Deduplicated ${eventType} event for ${qrSourceId} within cooldown.`);
      return;
    }
  }

  // Update cooldown timestamp
  localStorage.setItem(storageKey, now.toString());

  try {
    const eventsCol = collection(db, "qrLeadEvents");
    const eventDoc: Omit<QRLeadEvent, "id"> = {
      qrSourceId,
      storeId,
      branchId: branchId || null,
      eventType,
      timestamp: new Date().toISOString()
    };
    await addDoc(eventsCol, eventDoc);
    console.log(`[QR Attribution] Logged ${eventType} event successfully:`, eventDoc);
  } catch (err) {
    console.error("[QR Attribution] Error logging lead event:", err);
  }
}
