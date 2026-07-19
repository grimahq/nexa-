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

/**
 * Generates the absolute storefront or product URL based on the environment.
 * - Local / Sandbox: uses sub-routes e.g., origin/store/:slug or origin/store/product/:productId
 * - Production: uses custom subdomains e.g., :slug.nexastoreos.com/ or :slug.nexastoreos.com/product/:productId
 */
export function getStorefrontUrl(
  storeSlug: string,
  path: string = "",
  queryParams?: Record<string, string | null | undefined>
): string {
  const origin = window.location.origin;
  const isDevUrl = origin.includes("ais-dev-") || 
                   origin.includes("ais-pre-") || 
                   origin.includes("localhost") || 
                   origin.includes("127.0.0.1") ||
                   origin.includes("run.app"); // Also treat other Google Cloud Run preview URLs as dev/preview

  let base = "";
  if (isDevUrl) {
    const publicOrigin = getPublicUrl(origin);
    // In dev sandbox / local environments, routes are standard subpaths
    if (path.startsWith("product/")) {
      // Product detail route is /store/product/$productId
      base = `${publicOrigin}/store/${path}`;
    } else {
      // General storefront route is /store/$slug
      base = `${publicOrigin}/store/${storeSlug}${path ? `/${path}` : ""}`;
    }
  } else {
    // In production, we host on a custom domain with wildcard subdomains (defaults to nexastoreos.com)
    const productionDomain = import.meta.env.VITE_STORE_DOMAIN || "nexastoreos.com";
    const cleanPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
    base = `https://${storeSlug}.${productionDomain}${cleanPath}`;
  }

  // Append query params if any
  if (queryParams) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
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

