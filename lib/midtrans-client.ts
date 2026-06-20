/**
 * Midtrans Snap.js client-side loader.
 * Does NOT reference server keys. Safe for client bundle.
 */

import { getSnapScriptUrl } from "@/lib/midtrans";

let loadPromise: Promise<boolean> | null = null;
let scriptEl: HTMLScriptElement | null = null;

export function getSnapScriptUrlClient(): string {
  return getSnapScriptUrl();
}

export function loadMidtransSnap(
  clientKey: string,
  options?: { timeoutMs?: number }
): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.snap) return Promise.resolve(true);

  // Reuse existing promise if already loading
  if (loadPromise) return loadPromise;

  const timeoutMs = options?.timeoutMs ?? 10000;

  loadPromise = new Promise((resolve) => {
    const timedOut = setTimeout(() => {
      console.warn("[MidtransClient] Snap.js load timed out after", timeoutMs, "ms");
      resolve(false);
    }, timeoutMs);

    // Avoid duplicate script tags
    const existing = document.querySelector('script[id="midtrans-snap-js"]');
    if (existing) {
      existing.addEventListener("load", () => {
        clearTimeout(timedOut);
        resolve(true);
      });
      existing.addEventListener("error", () => {
        clearTimeout(timedOut);
        console.warn("[MidtransClient] Existing Snap.js script failed");
        resolve(false);
      });
      return; // Wait for existing script
    }

    const script = document.createElement("script");
    script.id = "midtrans-snap-js";
    script.src = getSnapScriptUrlClient();
    script.setAttribute("data-client-key", clientKey);
    script.async = true;

    script.onload = () => {
      clearTimeout(timedOut);
      scriptEl = script;
      resolve(true);
    };

    script.onerror = () => {
      clearTimeout(timedOut);
      console.warn("[MidtransClient] Snap.js script failed to load from", script.src);
      resolve(false);
    };

    document.body.appendChild(script);
  });

  // Clean up promise reference on settle
  loadPromise.finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

export function isSnapReady(): boolean {
  return typeof window !== "undefined" && !!window.snap;
}
