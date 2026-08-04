import "./arena.css"
import "./player-theme.css"
import { getUser } from "@/lib/supabase/server"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Compass, Flame, Gamepad2, MessageCircle, Trophy, LogOut, LayoutDashboard, UserCircle } from "lucide-react"
import { SwRegister } from "@/components/SwRegister"
import { ArenaClientWrapper } from "./arena-client"
import { BottomNav } from "./bottom-nav"
import { HeaderActions } from "@/components/arena/HeaderActions"
import LogoutButton from "@/components/arena/LogoutButton"
import { ActiveBoostBanner } from "@/components/arena/ActiveBoostBanner"

const navItems = [
  { href: "/arena", label: "Beranda", icon: Compass },
  { href: "/arena/feed", label: "Karya", icon: Flame },
  { href: "/arena/game", label: "Gim", icon: Gamepad2 },
  { href: "/arena/league", label: "Liga", icon: Trophy },
  { href: "/arena/chat", label: "Obrolan", icon: MessageCircle },
  { href: "/arena/player", label: "Pemain", icon: UserCircle },
]

// The login screen lives under /arena so the Android APK can reach it without
// leaving its scope (a link outside /arena opens a browser tab). That puts it
// inside this layout, which gates on auth — so it has to be exempted here, or the
// gate would redirect the login page to itself. It also renders bare: no nav
// chrome around a screen you cannot navigate from yet.
const RUTE_TANPA_GERBANG = "/arena/login"

export default async function ArenaLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") ?? ""
  if (pathname === RUTE_TANPA_GERBANG) return <>{children}</>

  const user = await getUser()
  if (!user) redirect(RUTE_TANPA_GERBANG)
  // Guru boleh mengintip Arena murid (mode pratinjau) — peran tetap Guru.
  // Selain Murid/Founder/Guru, arahkan ke dasbor guru.
  if (user.role !== "MURID" && user.role !== "GURU" && !user.isFounder) redirect("/guru/beranda")

  const isGuruPreview = user.role === "GURU" && !user.isFounder

  return (
    <div className="arena-theme min-h-screen bg-gray-50 pb-20 md:pb-0">
      <SwRegister />

      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-6 h-16 bg-white border-b border-gray-200 sticky top-0 z-40">
        <Link href="/arena" className="flex items-center gap-2">
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
          <Link href={isGuruPreview ? "/guru/beranda" : "/murid/beranda"} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
            <LayoutDashboard className="w-4 h-4" /> {isGuruPreview ? "Dasbor Guru" : "Dasbor Murid"}
          </Link>
          <HeaderActions />
          <LogoutButton variant="icon" />
        </div>
      </header>

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-12 bg-white/95 backdrop-blur-xl border-b border-gray-100">
        <Link href="/arena" className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px]">
            A
          </div>
          <span className="font-bold text-sm text-gray-900">Arena</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href={isGuruPreview ? "/guru/beranda" : "/murid/beranda"} aria-label={isGuruPreview ? "Kembali ke Dasbor Guru" : "Kembali ke Dasbor Murid"} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-700 bg-violet-50 active:scale-95 transition-all">
            <LayoutDashboard className="w-3.5 h-3.5" /> Dasbor
          </Link>
          <HeaderActions />
          <LogoutButton variant="icon" />
        </div>
      </div>

      <ActiveBoostBanner />

      <main className="mx-auto max-w-lg md:max-w-4xl px-0 md:px-6 py-0 md:py-6">
        <ArenaClientWrapper>
          {children}
        </ArenaClientWrapper>
      </main>

      <BottomNav />
    </div>
  )
}
