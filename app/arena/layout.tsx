import "./arena.css"
import "./player-theme.css"
import { getUser } from "@/lib/supabase/server"
import { isApk } from "@/lib/apk"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Compass, Target, Trophy, Gamepad2, Medal, Award, LayoutDashboard } from "lucide-react"
import { SwRegister } from "@/components/SwRegister"
import { ArenaClientWrapper } from "./arena-client"
import { BottomNav } from "./bottom-nav"
import { HeaderActions } from "@/components/arena/HeaderActions"
import LogoutButton from "@/components/arena/LogoutButton"
import { ActiveBoostBanner } from "@/components/arena/ActiveBoostBanner"

// Subnav khusus Arena (Web 2.0). Beranda/Karya/Obrolan/Pemain sudah ada di
// navigasi global murid (sidebar/bottom nav global) — tidak boleh diduplikasi
// di sini. APK tetap bernavigasi lewat BottomNav di bawah.
const navItems = [
  { href: "/arena", label: "Arena", icon: Compass },
  { href: "/arena/misi", label: "Misi", icon: Target },
  { href: "/arena/league", label: "Liga", icon: Trophy },
  { href: "/arena/game", label: "Gim", icon: Gamepad2 },
  { href: "/arena/player/leaderboard", label: "Peringkat", icon: Medal },
  { href: "/arena/player/badges", label: "Koleksi", icon: Award },
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

  // Inside the Android APK the top bar drops its two escape hatches. "Dasbor"
  // points outside the /arena scope, so tapping it would throw the student into a
  // browser tab — the one thing the APK exists to avoid. Logout moves to the
  // Pemain tab (Duolingo keeps account actions in the profile too): a destructive
  // action sitting one stray thumb away from the notification bell is a bad trade
  // on a phone used by children.
  const apk = await isApk()

  return (
    <div className="arena-theme min-h-screen bg-gray-50 pb-20 md:pb-0 dark:bg-slate-950">
      <SwRegister />

      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-6 h-16 bg-white border-b border-gray-200 sticky top-0 z-40 dark:bg-slate-900 dark:border-slate-800">
        <Link href="/arena" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
            A
          </div>
          <span className="font-bold text-gray-900 dark:text-slate-100">Arena</span>
        </Link>

        {/* Subnav Arena — segmented pills premium (ARENA 3.0) */}
        <nav aria-label="Navigasi Arena" className="flex items-center gap-1 rounded-full border border-gray-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
          {navItems.map((item) => {
            const aktif = pathname === item.href || (item.href !== "/arena" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={aktif ? "page" : undefined}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                  aktif
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-600/30"
                    : "text-gray-600 hover:text-violet-700 hover:bg-white dark:text-slate-300 dark:hover:text-violet-300 dark:hover:bg-slate-700"
                }`}
              >
                <item.icon className={`w-4 h-4 ${aktif ? "" : "text-violet-500 dark:text-violet-400"}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {!apk && (
            <Link href={isGuruPreview ? "/guru/beranda" : "/murid/beranda"} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors dark:text-violet-300 dark:bg-violet-500/20 dark:hover:bg-violet-500/30">
              <LayoutDashboard className="w-4 h-4" /> {isGuruPreview ? "Dasbor Guru" : "Dasbor Murid"}
            </Link>
          )}
          <HeaderActions />
          {!apk && <LogoutButton variant="icon" />}
        </div>
      </header>

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-12 bg-white/95 backdrop-blur-xl border-b border-gray-100 dark:bg-slate-900/95 dark:border-slate-800">
        <Link href="/arena" className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px]">
            A
          </div>
          <span className="font-bold text-sm text-gray-900 dark:text-slate-100">Arena</span>
        </Link>
        <div className="flex items-center gap-1">
          {!apk && (
            <Link href={isGuruPreview ? "/guru/beranda" : "/murid/beranda"} aria-label={isGuruPreview ? "Kembali ke Dasbor Guru" : "Kembali ke Dasbor Murid"} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-700 bg-violet-50 active:scale-95 transition-all dark:text-violet-300 dark:bg-violet-500/20">
              <LayoutDashboard className="w-3.5 h-3.5" /> Dasbor
            </Link>
          )}
          <HeaderActions />
          {!apk && <LogoutButton variant="icon" />}
        </div>
      </div>

      {/* Subnav Arena — mobile web (web ≠ APK: tanpa bottom navigation ala APK).
          Pills horizontal scroll, touch target ≥44px, active state jelas. */}
      {!apk && (
        <nav aria-label="Navigasi Arena" className="md:hidden sticky top-12 z-30 flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-xl border-b border-gray-100 overflow-x-auto scrollbar-hide dark:bg-slate-900/95 dark:border-slate-800">
          {navItems.map((item) => {
            const aktif = pathname === item.href || (item.href !== "/arena" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={aktif ? "page" : undefined}
                className={`flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-xl text-xs font-bold whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${
                  aktif
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-600/30"
                    : "text-gray-600 hover:text-violet-600 hover:bg-violet-50 dark:text-slate-300 dark:hover:text-violet-300 dark:hover:bg-slate-800"
                }`}
              >
                <item.icon className={`w-3.5 h-3.5 ${aktif ? "" : "text-violet-500 dark:text-violet-400"}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>
      )}

      <ActiveBoostBanner />

      <main className="mx-auto max-w-lg md:max-w-4xl px-0 md:px-6 py-0 md:py-6">
        <ArenaClientWrapper>
          {children}
        </ArenaClientWrapper>
      </main>

      {/* Bottom navigation hanya untuk APK (mobile web memakai subnav arena + nav global) */}
      {apk && <BottomNav />}
    </div>
  )
}
