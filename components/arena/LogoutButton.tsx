"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function LogoutButton({ variant = "link" }: { variant?: "link" | "icon" }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/arena-login")
  }

  if (variant === "icon") {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center backdrop-blur cursor-pointer hover:bg-white/25 transition-colors"
        title="Keluar"
      >
        <LogOut size={15} className="text-white/90" />
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
