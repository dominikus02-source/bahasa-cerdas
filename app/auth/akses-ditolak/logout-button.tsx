"use client";

import { useState } from "react";

/** Keluar lewat endpoint logout yang sudah ada, lalu ke halaman login. */
export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } finally {
          window.location.href = "/login";
        }
      }}
      className="inline-flex items-center justify-center rounded-bc-ctl bg-bc-brand px-4 py-2 text-sm font-semibold text-bc-on-brand disabled:opacity-60"
    >
      {busy ? "Keluar…" : "Keluar"}
    </button>
  );
}
