export interface DeviceDemoLock {
  tokenId: string;
  agentName: string;
  activatedAt: string;
  expiresAt: string; // ISO string or timestamp
  expiresAtMs: number;
}

const STORAGE_KEY = "stackwise_device_demo_pass_lock";

/**
 * Generate a 12-hour device-locked Demo Pass URL.
 */
export function generateDemoPassUrl(agentName: string = "Stackwise Field Agent", hours: number = 12): {
  url: string;
  tokenId: string;
  expiresAtFormatted: string;
} {
  const tokenId = `demo-pass-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const baseUrl = window.location.origin + window.location.pathname;
  
  const expiresMs = Date.now() + hours * 60 * 60 * 1000;
  const expiresAtFormatted = new Date(expiresMs).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const params = new URLSearchParams();
  params.set("demo_pass", "active");
  params.set("token", tokenId);
  params.set("agent", agentName);
  params.set("hrs", hours.toString());

  const url = `${baseUrl}?${params.toString()}`;

  return {
    url,
    tokenId,
    expiresAtFormatted,
  };
}

/**
 * Inspect or initialize the 12-hour device demo pass lock on this device.
 */
export function inspectDeviceDemoPass(urlParams?: URLSearchParams): {
  isActive: boolean;
  isExpired: boolean;
  lockData: DeviceDemoLock | null;
  remainingMs: number;
  remainingFormatted: string;
  agentName: string;
} {
  try {
    const queryPass = urlParams?.get("demo_pass");
    const queryToken = urlParams?.get("token");
    const queryAgent = urlParams?.get("agent") || "Stackwise Agent";
    const queryHrs = parseInt(urlParams?.get("hrs") || "12", 10);

    const now = Date.now();
    const storedRaw = localStorage.getItem(STORAGE_KEY);
    let storedLock: DeviceDemoLock | null = storedRaw ? JSON.parse(storedRaw) : null;

    // Initialize new lock if demo_pass parameter is present in URL and no active non-expired lock exists or token differs
    if (queryPass === "active" && queryToken) {
      if (!storedLock || storedLock.tokenId !== queryToken) {
        const expiresAtMs = now + (isNaN(queryHrs) ? 12 : queryHrs) * 60 * 60 * 1000;
        storedLock = {
          tokenId: queryToken,
          agentName: queryAgent,
          activatedAt: new Date(now).toISOString(),
          expiresAt: new Date(expiresAtMs).toISOString(),
          expiresAtMs,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storedLock));
      }
    }

    if (!storedLock) {
      return {
        isActive: false,
        isExpired: false,
        lockData: null,
        remainingMs: 0,
        remainingFormatted: "0h 0m",
        agentName: "Stackwise Agent",
      };
    }

    const remainingMs = storedLock.expiresAtMs - now;
    const isExpired = remainingMs <= 0;

    const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
    const hoursLeft = Math.floor(remainingSecs / 3600);
    const minsLeft = Math.floor((remainingSecs % 3600) / 60);
    const secsLeft = remainingSecs % 60;
    const remainingFormatted = `${hoursLeft}h ${minsLeft}m ${secsLeft}s`;

    return {
      isActive: !isExpired,
      isExpired,
      lockData: storedLock,
      remainingMs: Math.max(0, remainingMs),
      remainingFormatted,
      agentName: storedLock.agentName,
    };
  } catch (err) {
    console.warn("Device demo pass inspection error:", err);
    return {
      isActive: false,
      isExpired: false,
      lockData: null,
      remainingMs: 0,
      remainingFormatted: "0h 0m",
      agentName: "Stackwise Agent",
    };
  }
}

/**
 * Clear or reset device demo lock (Super Admin or Agent action).
 */
export function clearDeviceDemoLock(): void {
  localStorage.removeItem(STORAGE_KEY);
}
