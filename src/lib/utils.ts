import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPublicUrl(url?: string): string {
  const origin = url || window.location.origin;
  if (origin.includes("ais-dev-")) {
    return origin.replace("ais-dev-", "ais-pre-");
  }
  return origin;
}

export function slugify(text?: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w-]+/g, '')        // Remove all non-word chars
    .replace(/--+/g, '-')           // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

export function getCleanStoreSlug(slug?: string, storeName?: string): string {
  if (slug && slug.trim() && slug !== "general" && slug !== "sample-store") {
    const s = slugify(slug);
    if (s && s !== "general") return s;
  }
  if (storeName && storeName.trim()) {
    const slugifiedName = slugify(storeName);
    if (slugifiedName && slugifiedName !== "general") return slugifiedName;
  }
  return "nexa-store";
}

/**
 * Generates the absolute storefront or product URL based on the environment.
 * - Single Domain / Vercel / Cloud Run / Local: uses sub-routes e.g., origin/store/:slug or origin/store/product/:productId
 * - Production Custom Subdomains (only when VITE_USE_SUBDOMAINS="true"): uses :slug.domain.com/
 */
export function getStorefrontUrl(
  storeSlug: string,
  path: string = "",
  queryParams?: Record<string, string | null | undefined>
): string {
  const origin = window.location.origin;
  const cleanSlug = getCleanStoreSlug(storeSlug);

  // Use custom wildcard subdomains ONLY if explicitly configured in environment
  const useSubdomains = import.meta.env.VITE_USE_SUBDOMAINS === "true";

  let base = "";
  if (useSubdomains) {
    const productionDomain = import.meta.env.VITE_STORE_DOMAIN || "nexastoreos.com";
    const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
    base = `https://${cleanSlug}.${productionDomain}${cleanPath}`;
  } else {
    // Standard origin URL structure for Vercel, Cloud Run, Localhost, Custom App Domains
    const publicOrigin = getPublicUrl(origin);
    const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
    
    if (cleanPath.startsWith("/product/") || cleanPath.startsWith("product/")) {
      const productId = cleanPath.replace(/^\/?product\//, "");
      base = `${publicOrigin}/store/product/${productId}`;
    } else if (cleanPath.startsWith("/store/")) {
      base = `${publicOrigin}${cleanPath}`;
    } else {
      base = `${publicOrigin}/store/${cleanSlug}${cleanPath}`;
    }
  }

  // Append query params if any
  if (queryParams) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.set(key, val);
      }
    });
    const queryString = params.toString();
    if (queryString) {
      base += (base.includes("?") ? "&" : "?") + queryString;
    }
  }

  return base;
}

