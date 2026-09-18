"use client";

import { useEffect } from "react";
import { dashboardForRole } from "@/lib/auth/redirect";

/**
 * Authenticated-landing redirect (mounted only on the public landing page).
 *
 * Authenticated visitors are sent to their canonical role dashboard instead
 * of seeing the public landing. Anonymous visitors are unaffected.
 *
 * Client-side by design: the landing page is statically generated (ISR) for
 * SEO/performance, and a server-side session check would force it dynamic
 * for every anonymous visitor. This check is read-only (GET /api/user/me
 * never provisions) and mutates nothing.
 */
export default function AuthenticatedLandingRedirect() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/me", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json().catch(() => null);
        const role = data?.user?.role;
        if (typeof role === "string" && role && !cancelled) {
          window.location.href = dashboardForRole(role);
        }
      } catch {
        // Offline or transient failure → stay on the public landing page.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
