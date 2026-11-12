"use client";

import { useState } from "react";
import { leaveAccount } from "@/lib/auth/leave-account";

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
          await leaveAccount("/login");
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex items-center justify-center rounded-bc-ctl bg-bc-brand px-4 py-2 text-sm font-semibold text-bc-on-brand disabled:opacity-60"
    >
      {busy ? "Keluar…" : "Keluar"}
    </button>
  );
}
