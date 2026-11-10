"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { leaveAccount } from "@/lib/auth/leave-account"

export default function LogoutButton({
  variant = "link",
  to = "/arena/login",
}: {
  variant?: "link" | "icon" | "row" | "settings";
  /** Tujuan setelah signOut — default Arena; shell Guru memakai /login. */
  to?: string;
}) {
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await leaveAccount(to)
    } finally {
      setLoading(false)
    }
  }

  // Row inside the Pemain tab's settings list. In the APK this is the ONLY way
  // out — the top bar drops its logout icon there, so this must stay reachable.
  if (variant === "row") {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
 className="flex w-full items-center justify-between rounded-xl border border-[var(--px-border)] bg-white/[0.04] p-3 hover:bg-white/[0.08] disabled:opacity-60"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-[var(--px-text)]">
          <LogOut size={15} className="text-rose-300" /> {loading ? "Keluar..." : "Keluar"}
        </span>
      </button>
    )
  }

  if (variant === "settings") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        data-logout-settings
        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-60 dark:text-slate-200 dark:hover:bg-blue-950/50"
      >
        <LogOut size={17} aria-hidden="true" />
        {loading ? "Keluar..." : "Keluar dari akun"}
      </button>
    )
  }

  if (variant === "icon") {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        aria-label="Keluar"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-bc-sm text-bc-text-2 transition-colors hover:bg-bc-surface-2 hover:text-bc-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bc-focus"
        title="Keluar"
      >
        <LogOut size={20} aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-sm text-gray-500 dark:text-slate-400 hover:text-red-500 dark:text-red-400 transition-colors flex items-center gap-1.5"
    >
      <LogOut size={18} />
      {loading ? "Keluar..." : "Keluar"}
    </button>
  )
}
