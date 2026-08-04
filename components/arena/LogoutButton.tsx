"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function LogoutButton({ variant = "link" }: { variant?: "link" | "icon" | "row" }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    // /arena/login, not /auth/arena-login: the latter sits outside the APK's
    // /arena scope, so signing out would have dumped the student into a browser
    // tab instead of back to Arena's own login screen.
    router.push("/arena/login")
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

  if (variant === "icon") {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
        title="Keluar"
      >
        <LogOut size={15} className="text-gray-500" />
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-sm text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1.5"
    >
      <LogOut size={14} />
      {loading ? "Keluar..." : "Keluar"}
    </button>
  )
}
