"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Home, ShoppingBag, Video, Gamepad2, FileText, Database,
  Users, Settings, ChevronDown, ChevronRight,
  BookOpen, Trophy, Calendar, GraduationCap, Brain, Star, Award,
  LogOut, Crown, Zap, Flame, TrendingUp, Bell, Presentation, Sparkles, ExternalLink, BarChart3, PenLine, Baby
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { NotificationBell } from "./NotificationBell"

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  children?: NavItem[]
}

const NAV: NavItem[] = [
  { label: "Beranda", href: "/guru/beranda", icon: <Home size={18} /> },
  { label: "Toko Karya", href: "/guru/toko-karya", icon: <ShoppingBag size={18} /> },
  { label: "Jelajahi Toko Karya", href: "/marketplace", icon: <ShoppingBag size={18} /> },
  { label: "Video Belajar", href: "/guru/video-belajar", icon: <Video size={18} /> },
  { label: "Kuis Game", href: "/guru/game/lobby", icon: <Gamepad2 size={18} /> },
  { label: "Rencana Pembelajaran", href: "/guru/ai-tools?tool=rpp-modul", icon: <FileText size={18} /> },
  { label: "AI Tools", href: "/guru/ai-tools", icon: <Sparkles size={18} /> },
  { label: "Materi Ajar", href: "/guru/materi-ajar", icon: <Presentation size={18} /> },
  { label: "Buku Ajar", href: "/guru/panduan-guru", icon: <BookOpen size={18} /> },
  { label: "Bank Soal", href: "/guru/bank-soal", icon: <Database size={18} /> },
  { label: "Karya Siswa", href: "/guru/feed-karya", icon: <Star size={18} /> },
  {
    label: "Simulasi",
    icon: <BarChart3 size={18} />,
    children: [
      { label: "Simulasi UKBI", href: "/guru/simulasi/ukbi", icon: <BookOpen size={16} /> },
      { label: "Simulasi TKA", href: "/guru/simulasi/tka", icon: <GraduationCap size={16} /> },
      { label: "Bank Soal UKBI", href: "/guru/bank-soal-ukbi", icon: <Database size={16} /> },
      { label: "Bank Soal TKA", href: "/guru/bank-soal-tka", icon: <Database size={16} /> },
    ],
  },
  { label: "Hasil Murid", href: "/guru/hasil-simulasi", icon: <TrendingUp size={18} /> },
  { label: "Tinjau Menulis & Berbicara", href: "/guru/tinjau-simulasi", icon: <PenLine size={18} /> },
  { label: "Dokumen Latihan Murid", href: "/guru/dokumen-latihan", icon: <Star size={18} /> },
  { label: "BIGT", href: "/guru/bigt", icon: <ExternalLink size={18} /> },
  { label: "Data Siswa", href: "/guru/data-siswa", icon: <Users size={18} /> },
  {
    label: "Olimpiade",
    icon: <Trophy size={18} />,
    children: [
      { label: "Info Lomba", href: "/guru/olimpiade/info", icon: <Trophy size={16} /> },
      { label: "Kalender", href: "/guru/olimpiade/kalender", icon: <Calendar size={16} /> },
    ]
  },
  { label: "Komunitas", href: "/guru/komunitas", icon: <Users size={18} /> },
  { label: "KelasKu", href: "/guru/kelasku", icon: <GraduationCap size={18} /> },
  // Arena Junior = dasbor murid TK–SD. Guru bukan anggota kelas, jadi tautan ini
  // membuka mode pratinjau (lihat lib/arena-junior/kurikulum.ts).
  { label: "Arena Junior (TK–SD)", href: "/junior", icon: <Baby size={18} /> },
  { label: "Artikel", href: "/guru/artikel", icon: <FileText size={18} /> },
  { label: "Pengaturan", href: "/guru/pengaturan", icon: <Settings size={18} /> },
]

const NAV_ADMIN = [
  { type: "divider" },
  { label: "Panel Admin", href: "/admin", icon: <Settings size={18} /> },
];

interface Props {
  user: {
    id: string
    fullName: string
    avatar?: string | null
    isPremium: boolean
    isFounder: boolean
    xp?: number
    level?: number
    streak?: number
    league?: string
  }
}

export function GuruSidebar({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Olimpiade: pathname.includes("/olimpiade"),
    Komunitas: pathname.includes("/komunitas"),
    "AI Tools": pathname.includes("/ai-tools"),
    Simulasi: pathname.includes("/simulasi/") || pathname.includes("/hasil-simulasi") || pathname.includes("/dokumen-latihan") || pathname.includes("/bigt"),
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0">
      <div className="p-5 border-b border-gray-100">
        <Link href="/guru/beranda" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">BahasaCerdas</span>
            <p className="text-[10px] text-gray-400">Dashboard Guru</p>
          </div>
        </Link>
      </div>

      <Link href={`/profile/${user.id}`} className="block px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {user.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {user.isFounder ? (
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium flex items-center gap-1">
                  <Crown size={10} /> Founder
                </span>
              ) : user.isPremium ? (
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium flex items-center gap-1">
                  <Crown size={10} /> PRO
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                  Free
                </span>
              )}
            </div>
          </div>
          <NotificationBell />
        </div>
        {user.xp !== undefined && (
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="flex items-center gap-1 text-amber-600">
              <Flame size={12} /> {user.streak || 0}
            </span>
            <span className="flex items-center gap-1 text-violet-600">
              <Zap size={12} /> {user.xp.toLocaleString()} XP
            </span>
          </div>
        )}
      </Link>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map((item) => {
          if (item.children) {
            const isOpen = expanded[item.label]
            const hasActive = item.children.some(c => c.href && isActive(c.href))
            return (
              <div key={item.label}>
                <button
                  onClick={() => setExpanded(e => ({ ...e, [item.label]: !e[item.label] }))}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all mb-1 ${
                    hasActive ? "text-emerald-700 bg-emerald-50" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <span className={hasActive ? "text-emerald-500" : "text-gray-400"}>{item.icon}</span>
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
                            ? "text-emerald-700 bg-emerald-50 font-medium"
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
                  ? "text-emerald-700 bg-emerald-50 font-semibold"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              }`}
            >
              <span className={isActive(item.href!) ? "text-emerald-500" : "text-gray-400"}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {user.isFounder && (
        <div className="px-2 mb-1">
          <div className="h-px bg-slate-100 mx-3 mb-2" />
          <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 font-semibold transition-colors">
            <Settings size={18} /> Panel Admin
          </Link>
        </div>
      )}

      {!user.isPremium && !user.isFounder && (
        <div className="mx-3 mb-3 p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
          <p className="text-xs font-semibold text-amber-800 mb-1">Upgrade ke PRO</p>
          <p className="text-[11px] text-amber-600 mb-2">500 kredit AI/bulan & jual karya berbayar</p>
          <Link
            href="/guru/pengaturan/premium"
            className="block text-center text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg py-2 font-semibold hover:opacity-90 transition-opacity"
          >
            Mulai Rp 49.000/bln
          </Link>
        </div>
      )}

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
