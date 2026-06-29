"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Home, BookOpen, Gamepad2, Trophy, Award, GraduationCap,
  Users, Settings, LogOut, Zap, Flame, ExternalLink,
  ChevronDown, ChevronRight, BarChart3
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
  external?: boolean
}

const NAV: NavItem[] = [
  { label: "Beranda", href: "/murid/beranda", icon: <Home size={18} /> },
  { label: "Jalur Cerdas", href: "/arena/jalur-cerdas", icon: <GraduationCap size={18} /> },
  { label: "Tugasku", href: "/murid/tugasku", icon: <BookOpen size={18} /> },
  {
    label: "Simulasi",
    icon: <BarChart3 size={18} />,
    children: [
      { label: "Simulasi UKBI", href: "/murid/simulasi/ukbi", icon: <BookOpen size={16} /> },
      { label: "Simulasi TKA", href: "/murid/simulasi/tka", icon: <GraduationCap size={16} /> },
    ],
  },
  { label: "Dokumen Hasil Latihan", href: "/murid/dokumen-latihan", icon: <Award size={18} /> },
  { label: "Gim", href: "/murid/game", icon: <Gamepad2 size={18} /> },
  { label: "Gabung Kelas", href: "/murid/gabung-kelas", icon: <Users size={18} /> },
  { label: "Info Lomba", href: "/murid/olimpiade/info", icon: <Trophy size={18} /> },
  { label: "Kemajuanku", href: "/murid/progresku", icon: <BarChart3 size={18} /> },
  { label: "BIGT", icon: <ExternalLink size={18} />, href: "/murid/bigt" },
  { label: "Pengaturan", href: "/murid/pengaturan", icon: <Settings size={18} /> },
]

interface Props {
  user: { id: string; fullName: string; xp: number; level: number; streak: number; league: string }
}

export default function MuridSidebar({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Simulasi: pathname.includes("/simulasi/") || pathname.includes("/dokumen-latihan"),
    BIGT: false,
  })

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const leagueLabel = { BRONZE: "Perunggu", SILVER: "Perak", GOLD: "Emas", DIAMOND: "Berlian" }[user.league] || "Perunggu"

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 overflow-y-auto">
      <div className="p-5 border-b border-gray-100">
        <Link href="/murid/beranda" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">BC</div>
          <div>
            <span className="font-bold text-gray-900 text-sm">BahasaCerdas</span>
            <p className="text-[10px] text-gray-400">Dasbor Murid</p>
          </div>
        </Link>
      </div>

      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
        <Link href={`/profile/${user.id}`}>
          <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
        </Link>
        <p className="text-[10px] text-gray-500 mt-1">🏆 {leagueLabel} | Tkt {user.level}</p>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><Flame size={10} /> {user.streak} hari</span>
          <span className="flex items-center gap-1"><Zap size={10} /> {user.xp} XP</span>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2">
        {NAV.map((item) => {
          if (item.children) {
            const isOpen = expanded[item.label]
            const hasActive = item.children.some(c => c.href && isActive(c.href))
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
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href!}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                          child.href && isActive(child.href)
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
              href={item.href!}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all mb-1 ${
                isActive(item.href!)
                  ? "text-violet-700 bg-violet-50 font-semibold"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <span className={isActive(item.href!) ? "text-violet-500" : "text-gray-400"}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </aside>
  )
}
