"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

const HomeIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
const ClipIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
const GameIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
const GradIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
const TrophyIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
const ChartIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
const SetIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
const BookIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
const StarIcon = () => <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
const CalIcon = () => <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
const LogIcon = () => <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
const DownIcon = () => <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
const RightIcon = () => <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
const UserIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
const BellIcon = () => <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>

const NAV = [
  { label: "Beranda", href: "/murid/beranda", icon: HomeIcon },
  { label: "Tugasku", href: "/murid/tugasku", icon: ClipIcon },
  { label: "Gabung Kelas", href: "/murid/gabung-kelas", icon: UserIcon },
  { label: "Gim", href: "/murid/game", icon: GameIcon },
  { label: "Kompetensi", icon: GradIcon, children: [
    { label: "UKBI - TKA", href: "/murid/ukbi", icon: BookIcon },
    { label: "Sertifikat", href: "/murid/sertifikat", icon: StarIcon },
  ]},
  { label: "Olimpiade", icon: TrophyIcon, children: [
    { label: "Info Lomba", href: "/murid/olimpiade/info", icon: TrophyIcon },
    { label: "Kalender", href: "/murid/olimpiade/kalender", icon: CalIcon },
  ]},
  { label: "Kemajuanku", href: "/murid/progresku", icon: ChartIcon },
  { label: "Pengaturan", href: "/murid/pengaturan", icon: SetIcon },
]

interface Props {
  user: { id: string; fullName: string; avatar?: string | null; isPremium: boolean; isFounder: boolean; xp: number; level: number; streak: number; league: string }
}

const LEAGUE_DATA: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  BRONZE: { label: "Perunggu", color: "text-amber-700", bg: "bg-amber-100", icon: "🥉" },
  SILVER: { label: "Perak", color: "text-gray-600", bg: "bg-gray-100", icon: "🥈" },
  GOLD: { label: "Emas", color: "text-yellow-700", bg: "bg-yellow-100", icon: "🥇" },
  DIAMOND: { label: "Berlian", color: "text-blue-700", bg: "bg-blue-100", icon: "💎" },
}

export default function MuridSidebar({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Kompetensi: false, Olimpiade: false })
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const league = LEAGUE_DATA[user.league] || LEAGUE_DATA.BRONZE

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0">
      <div className="p-5 border-b border-gray-100">
        <Link href="/murid/beranda" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <BookIcon />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">BahasaCerdas</span>
            <p className="text-[10px] text-gray-400">Dasbor Murid</p>
          </div>
        </Link>
      </div>

      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            {user.fullName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${league.bg} ${league.color}`}>
                {league.icon} {league.label}
              </span>
              <span className="text-[10px] text-gray-400">Tkt. {user.level}</span>
            </div>
          </div>
          <BellIcon />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-amber-600">🔥 {user.streak} hari</span>
          <span className="text-violet-600">⚡ {user.xp.toLocaleString()} XP</span>
        </div>
        <div className="mt-2 h-1.5 bg-violet-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" style={{ width: `${Math.min((user.xp % 500) / 5, 100)}%` }} />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map((item) => {
          if (item.children) {
            const isOpen = expanded[item.label]
            const hasActive = item.children.some(c => c.href && isActive(c.href))
            return (
              <div key={item.label}>
                <button onClick={() => setExpanded(e => ({...e, [item.label]: !e[item.label]}))} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all mb-1 ${hasActive ? "text-violet-700 bg-violet-50" : "text-gray-500 hover:bg-gray-50"}`}>
                  <span className={hasActive ? "text-violet-500" : "text-gray-400"}><item.icon /></span>
                  <span className="flex-1 font-medium">{item.label}</span>
                  {isOpen ? <DownIcon /> : <RightIcon />}
                </button>
                {isOpen && <div className="ml-6 pl-3 border-l-2 border-gray-100 mb-1">
                  {item.children.map(child => (
                    <Link key={child.href} href={child.href} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-0.5 ${isActive(child.href) ? "text-violet-700 bg-violet-50 font-medium" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"}`}>
                      <child.icon /> {child.label}
                    </Link>
                  ))}
                </div>}
              </div>
            )
          }
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all mb-1 ${isActive(item.href) ? "text-violet-700 bg-violet-50 font-semibold" : "text-gray-500 hover:bg-gray-50"}`}>
              <span className={isActive(item.href) ? "text-violet-500" : "text-gray-400"}><item.icon /></span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50">
          <LogIcon /> Keluar
        </button>
      </div>
    </aside>
  )
}