"use client";

/**
 * P2.8 — pelacak funnel terkunci (client, fire-and-forget).
 * Dirender di dalam RpgLocked (server) agar event terkirim tepat sekali
 * saat halaman terkunci tampil. Analytics tidak pernah memblokir UX.
 */

import { useEffect, useRef } from "react";
import { trackProductEvent } from "@/lib/analytics/product-track";

export function RpgBlockedTracker() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackProductEvent("rpg_premium_blocked", { game: "rpg" });
  }, []);
  return null;
}
