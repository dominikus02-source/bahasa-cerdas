"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Home, ClipboardList, Gamepad2, GraduationCap, Trophy,
  BarChart2, Settings, ChevronDown, ChevronRight, BookOpen,
  Brain, Award, Star, Calendar, LogOut, Flame, Zap, Users, Bell
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { NotificationBell } from "./NotificationBell"

const NAV = [
  { label: "Beranda", href: "/murid/beranda", icon: <Home size={18} /> },
  { label: "Tugasku", href: "/murid/tugasku", icon: <ClipboardList size={18} /> },
  { label: "Gabung Kelas", href: "/murid/gabung-kelas", icon: <Users size={18} /> },
  {label: "Kuis Game", href: "/murid/game/lobby", icon: <Gamepad2 size={18} /> },
  {
    label: "Kompetensi",
    icon: <GraduationCap size={18} />,
    children: [
      { label: "UKBI - TKA", href: "/murid/ukbi", icon: <BookOpen size={16} /> },
      { label: "Sertifikat", href: "/murid/sertifikat", icon: <Star size={16} /> },
    ]
  },
  {
    label: "Olimpiade",
    icon: <Trophy size={18} />,
    children: [
      { label: "Info Lomba", href: "/murid/olimpiade/info", icon: <Trophy size={16} /> },
      { label: "Kalender", href: "/murid/olimpiade/kalender", icon: <Calendar size={16} /> },
    ]
  },
  { label: "Progresku", href: "/murid/progresku", icon: <BarChart2 size={18} /> },
  { label: "Pengaturan", href: "/murid/pengaturan", icon: <Settings size={18} /> },
]

interface Props {
  user: {
    id: string
    fullName: string
    avatar?: string | null
    isPremium: boolean
    isFounder: boolean
    xp: number
    level: number
    streak: number
    league: string
  }
}

export function MuridSidebar({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Kompetensi: pathname.includes("/ukbi") || pathname.includes("/sertifikat"),
    Olimpiade: pathname.includes("/olimpiade"),
  })

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const leagueColors: Record<string, string> = {
    BRONZE: "text-amber-700 bg-amber-100",
    SILVER: "text-gray-600 bg-gray-100",
    GOLD: "text-yellow-700 bg-yellow-100",
    DIAMOND: "text-blue-700 bg-blue-100",
  }
  const leagueIcons: Record<string, string> = {
    BRONZE: "🥉",
    SILVER: "🥈",
    GOLD: "🥇",
    DIAMOND: "💎",
  }

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0">
      <div className="p-5 border-b border-gray-100">
        <Link href="/murid/beranda" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">BahasaCerdas</span>
            <p className="text-[10px] text-gray-400">Dashboard Murid</p>
          </div>
        </Link>
      </div>

      <Link href={`/profile/${user.id}`} className="block px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 transition-colors">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {user.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${leagueColors[user.league] || leagueColors.BRONZE}`}>
                {leagueIcons[user.league] || "🥉"} {user.league}
              </span>
              <span className="text-[10px] text-gray-400">Lv.{user.level}</span>
            </div>
          </div>
          <NotificationBell />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-amber-600">
            <Flame size={12} /> {user.streak} hari
          </span>
          <span className="flex items-center gap-1 text-violet-600">
            <Zap size={12} /> {user.xp.toLocaleString()} XP
          </span>
        </div>
        <div className="mt-2 h-1.5 bg-violet-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${Math.min((user.xp % 500) / 5, 100)}%` }}
          />
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map((item: any) => {
          if (item.children) {
            const isOpen = expanded[item.label]
            const hasActive = item.children.some((c: any) => c.href && isActive(c.href))
            return (
              <div key={item.label}>
                <button
                  onClick={() => setExpanded(e => ({ ...e, [item.label]: !e[item.label] }))}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all mb-1 ${
                    hasActive ? "text-violet-700 bg-violet-50" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <span className={hasActive ? "text-violet-500" : "text-gray-400"}>{item.icon}</span>
                  <span className="flex-1 font-medium">{item.label}</span>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isOpen && (
                  <div className="ml-6 pl-3 border-l-2 border-gray-100 mb-1">
                    {item.children.map((child: any) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                          isActive(child.href)
                            ? "text-violet-700 bg-violet-50 font-medium"
                            : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                        }`}
                      >
                        {child.icon} {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all mb-1 ${
                isActive(item.href)
                  ? "text-violet-700 bg-violet-50 font-semibold"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <span className={isActive(item.href) ? "text-violet-500" : "text-gray-400"}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push("/login") }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </aside>
  )
}
