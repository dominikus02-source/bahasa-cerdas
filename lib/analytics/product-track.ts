/**
 * P8A §31 — Product event tracking (client, fire-and-forget).
 * TIDAK mengirim data finansial sensitif.
 */

export function trackProductEvent(name: string, props?: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/analytics/product-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, props }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // analytics must never break UX
  }
}
