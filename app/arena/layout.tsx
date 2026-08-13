import "./arena.css"
import "./player-theme.css"
import { getUser } from "@/lib/supabase/server"
import { isApk } from "@/lib/apk"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, MessageCircle } from "lucide-react"
import { SwRegister } from "@/components/SwRegister"
import { ArenaClientWrapper } from "./arena-client"
import { BottomNav } from "./bottom-nav"
import { BackHome } from "@/components/shared/BackHome"
import { HeaderActions } from "@/components/arena/HeaderActions"
import LogoutButton from "@/components/arena/LogoutButton"
import { ActiveBoostBanner } from "@/components/arena/ActiveBoostBanner"

// ARENA FINAL CONSOLIDATION — Arena adalah produk Student Shell, BUKAN
// aplikasi kedua: tidak ada navbar/subnav Arena sendiri di web. Navigasi
// menuju route Arena dilakukan lewat Student Shell, CTA kontekstual, dan
// gateway sections (Arena home). APK tetap bernavigasi lewat BottomNav.
// Route tetap ada: /arena, /arena/misi, /arena/league, /arena/game,
// /arena/player/leaderboard, /arena/player/badges, /arena/chat, dst.

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

  // 4.2.2 — Dashboard Guru adalah ROLE-BASED DESTINATION (bukan tombol
  // back). GURU & Founder berhak; murid murni tidak melihat tombol ini.
  const hasGuruAccess = user.role === "GURU" || user.isFounder

  // Inside the Android APK the top bar drops its two escape hatches. "Dasbor"
  // points outside the /arena scope, so tapping it would throw the student into a
  // browser tab — the one thing the APK exists to avoid. Logout moves to the
  // Pemain tab (Duolingo keeps account actions in the profile too): a destructive
  // action sitting one stray thumb away from the notification bell is a bad trade
  // on a phone used by children.
  const apk = await isApk()

  // OBROLAN 4.0 — produk Student Shell, bukan halaman Arena. Di WEB (bukan
  // APK), /arena/chat* memakai chrome-nya sendiri: top bar "Obrolan" tanpa
  // header/subnav Arena dan tanpa banner boost. APK tetap memakai chrome
  // Arena + BottomNav (kompatibilitas TWA tidak berubah).
  const isChatWeb = !apk && pathname.startsWith("/arena/chat")

  return (
    <div className="arena-theme min-h-screen bg-gray-50 pb-20 md:pb-0 dark:bg-slate-950">
      <SwRegister />

      {/* Desktop Header — WEB Obrolan memakai top bar tersendiri (Student Shell) */}
      {isChatWeb ? (
        <header className="sticky top-0 z-40 flex items-center justify-between px-6 h-14 bg-white border-b border-gray-200 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            {!apk && <BackHome />}
            <Link href="/arena/chat" className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="font-bold text-gray-900 dark:text-slate-100">Obrolan</span>
              <span className="hidden lg:block text-xs text-gray-400 dark:text-slate-500">Ruang komunikasi kelas</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {!apk && hasGuruAccess && (
              <Link href="/guru/beranda" aria-label="Dashboard Guru" title="Dashboard Guru" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors dark:text-violet-300 dark:bg-violet-500/20 dark:hover:bg-violet-500/30">
                <LayoutDashboard className="w-4 h-4" /> Dashboard Guru
              </Link>
            )}
            <HeaderActions />
            <LogoutButton variant="icon" />
          </div>
        </header>
      ) : (
      <header className="hidden md:flex items-center justify-between px-6 h-16 bg-white border-b border-gray-200 sticky top-0 z-40 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          {!apk && <BackHome />}
          <Link href="/arena" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
              A
            </div>
            <span className="font-bold text-gray-900 dark:text-slate-100">Arena</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {!apk && hasGuruAccess && (
            <Link href="/guru/beranda" aria-label="Dashboard Guru" title="Dashboard Guru" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors dark:text-violet-300 dark:bg-violet-500/20 dark:hover:bg-violet-500/30">
              <LayoutDashboard className="w-4 h-4" /> Dashboard Guru
            </Link>
          )}
          <HeaderActions />
          {!apk && <LogoutButton variant="icon" />}
        </div>
      </header>
      )}

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-12 bg-white/95 backdrop-blur-xl border-b border-gray-100 dark:bg-slate-900/95 dark:border-slate-800">
        <div className="flex items-center gap-1 min-w-0">
          {!apk && <BackHome iconOnly className="-ml-1" />}
          <Link href={isChatWeb ? "/arena/chat" : "/arena"} className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px]">
              {isChatWeb ? <MessageCircle className="w-3.5 h-3.5" /> : "A"}
            </div>
            <span className="font-bold text-sm text-gray-900 dark:text-slate-100">{isChatWeb ? "Obrolan" : "Arena"}</span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          {!apk && hasGuruAccess && (
            <Link href="/guru/beranda" aria-label="Dashboard Guru" title="Dashboard Guru" className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-violet-700 bg-violet-50 active:scale-95 transition-all dark:text-violet-300 dark:bg-violet-500/20">
              <LayoutDashboard className="w-3.5 h-3.5" />
            </Link>
          )}
          <HeaderActions />
          {!apk && <LogoutButton variant="icon" />}
        </div>
      </div>

      {/* Banner boost tidak muncul di WEB Obrolan — workspace penuh viewport */}
      {!isChatWeb && <ActiveBoostBanner />}

      {/* Obrolan (Class Chat Workspace) memakai container selebar 1440px tanpa
          padding vertikal agar 3 pane memenuhi viewport. Halaman Arena lain
          memakai canvas Student Shell desktop-first (~1280px usable) — desktop
          adalah primary, bukan kolom mobile 4xl. */}
      <main
        className={`mx-auto px-0 ${
          pathname.startsWith("/arena/chat")
            ? "max-w-[1440px] py-0 md:px-8"
            : "max-w-[1280px] py-0 md:py-6 md:px-6"
        }`}
      >
        <ArenaClientWrapper>
          {children}
        </ArenaClientWrapper>
      </main>

      {/* Bottom navigation hanya untuk APK (mobile web memakai subnav arena + nav global) */}
      {apk && <BottomNav />}
    </div>
  )
}