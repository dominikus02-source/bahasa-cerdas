import "./arena.css"
import { getUser } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Compass, Flame, Gamepad2, MessageCircle, Trophy, LogOut, LayoutDashboard } from "lucide-react"
import { SwRegister } from "@/components/SwRegister"
import { ArenaClientWrapper } from "./arena-client"
import { BottomNav } from "./bottom-nav"
import { HeaderActions } from "@/components/arena/HeaderActions"
import LogoutButton from "@/components/arena/LogoutButton"

const navItems = [
  { href: "/arena", label: "Beranda", icon: Compass },
  { href: "/arena/feed", label: "Karya", icon: Flame },
  { href: "/arena/game", label: "Gim", icon: Gamepad2 },
  { href: "/arena/league", label: "Liga", icon: Trophy },
  { href: "/arena/chat", label: "Chat", icon: MessageCircle },
]

export default async function ArenaLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect("/auth/arena-login")
  if (user.role !== "MURID" && !user.isFounder) redirect("/guru/beranda")

  return (
    <div className="arena-theme min-h-screen bg-gray-50 pb-20 md:pb-0">
      <SwRegister />

      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-6 h-16 bg-white border-b border-gray-200 sticky top-0 z-40">
        <Link href="/arena/jalur-cerdas" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
            A
          </div>
          <span className="font-bold text-gray-900">Arena</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-violet-600 hover:bg-violet-50 transition-colors"
            >
              <item.icon className="w-4 h-4" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/murid/beranda" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
            <LayoutDashboard className="w-4 h-4" /> Dasbor Murid
          </Link>
          <HeaderActions />
          <LogoutButton variant="icon" />
        </div>
      </header>

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-12 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <Link href="/arena/jalur-cerdas" className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px]">
            A
          </div>
          <span className="font-bold text-sm text-gray-900">Arena</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/murid/beranda" aria-label="Kembali ke Dasbor Murid" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-700 bg-violet-50 active:scale-95 transition-all">
            <LayoutDashboard className="w-3.5 h-3.5" /> Dasbor
          </Link>
          <HeaderActions />
          <LogoutButton variant="icon" />
        </div>
      </div>

      <main className="mx-auto max-w-lg md:max-w-4xl px-0 md:px-6 py-0 md:py-6">
        <ArenaClientWrapper>
          {children}
        </ArenaClientWrapper>
      </main>

      <BottomNav />
    </div>
  )
}
