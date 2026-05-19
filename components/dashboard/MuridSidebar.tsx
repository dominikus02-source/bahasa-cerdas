"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

const NAV = [
  { label: "Beranda", href: "/murid/beranda" },
  { label: "Tugasku", href: "/murid/tugasku" },
  { label: "Gabung Kelas", href: "/murid/gabung-kelas" },
  { label: "Gim", href: "/murid/game" },
  { label: "UKBI - TKA", href: "/murid/ukbi" },
  { label: "Sertifikat", href: "/murid/sertifikat" },
  { label: "Info Lomba", href: "/murid/olimpiade/info" },
  { label: "Kalender", href: "/murid/olimpiade/kalender" },
  { label: "Kemajuanku", href: "/murid/progresku" },
  { label: "Pengaturan", href: "/murid/pengaturan" },
]

interface Props {
  user: { id: string; fullName: string; xp: number; level: number; streak: number; league: string }
}

export default function MuridSidebar({ user }: Props) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<string | null>(null)
  
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const toggle = (label: string) => setExpanded(expanded === label ? null : label)

  const leagueLabel = { BRONZE: "Perunggu", SILVER: "Perak", GOLD: "Emas", DIAMOND: "Berlian" }[user.league] || "Perunggu"
  const leagueEmoji = { BRONZE: "🥉", SILVER: "🥈", GOLD: "🥇", DIAMOND: "💎" }[user.league] || "🥉"

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 overflow-y-auto">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">BC</div>
          <div>
            <span className="font-bold text-gray-900 text-sm">BahasaCerdas</span>
            <p className="text-[10px] text-gray-400">Dasbor Murid</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
        <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
        <p className="text-[10px] text-gray-500 mt-1">{leagueEmoji} {leagueLabel} | Tkt {user.level}</p>
        <p className="text-[10px] text-gray-500 mt-1">🔥 {user.streak} hari | ⚡ {user.xp} XP</p>
      </div>

      <nav className="py-3 px-2">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2.5 rounded-lg text-sm mb-1 ${isActive(item.href) ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-600 hover:bg-gray-50"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}