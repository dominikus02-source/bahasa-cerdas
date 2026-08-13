import "./arena.css"
import "./player-theme.css"
import { getUser } from "@/lib/supabase/server"
import { isApk } from "@/lib/apk"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Zap, MessageCircle, LayoutDashboard } from "lucide-react"
import { levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel } from "@/lib/gamification/ranks"
import { RankChip } from "@/components/gamification/RankChip"
import { IconTarget } from "@/lib/icons"
import { SwRegister } from "@/components/SwRegister"
import { ArenaClientWrapper } from "./arena-client"
import { BottomNav } from "./bottom-nav"
import { BackHome } from "@/components/shared/BackHome"
import { HeaderActions } from "@/components/arena/HeaderActions"
import LogoutButton from "@/components/arena/LogoutButton"
import { ActiveBoostBanner } from "@/components/arena/ActiveBoostBanner"
import { ShellLayout } from "@/components/shell/ShellLayout"
import { ShellNavList } from "@/components/shell/ShellNavList"
import { RoleSections } from "@/components/shell/RoleSections"
import { ShellSidebarFooter } from "@/components/shell/ShellSidebarFooter"

// ARENA FINAL CONSOLIDATION — Arena adalah produk Student Shell, BUKAN
// aplikasi kedua: tidak ada navbar/subnav Arena sendiri di web. Navigasi
// menuju route Arena dilakukan lewat Student Shell, CTA kontekstual, dan
// gateway sections (Arena home). APK tetap bernavigasi lewat BottomNav.
// Route tetap ada: /arena, /arena/misi, /arena/league, /arena/game,
// /arena/player/leaderboard, /arena/player/badges, /arena/chat, dst.

// UNIFIED APP SHELL — Arena & Obrolan berbagi SATU shell global (Student
// Shell): sidebar (brand → user → ShellNavList → role sections → footer)
// dan header sticky tunggal (BackHome → brand produk → HeaderActions →
// logout). Arena = konten; shell = sidebar global. Sidebar hanya untuk web
// (APK memakai chrome penuh + BottomNav, konsisten dengan perilaku lama).

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

  // Rank resmi diturunkan dari XP — sama dengan pola Student Shell.
  const rank = rankFromLevel(levelFromXp(user.xp || 0))

  return (
    <ShellLayout
      rootClassName="arena-theme min-h-screen bg-gray-50 pb-20 md:pb-0 dark:bg-slate-950 bg-gradient-to-br from-violet-50 via-slate-50 to-purple-50 dark:from-slate-950 dark:via-[#0b1220] dark:to-[#1e1b4b]"
      sidebar={
        apk ? undefined : (
          <>
            <div className="p-5 border-b border-gray-100/50 bg-gradient-to-r from-violet-600 to-purple-600">
              <Link href="/murid/beranda" className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-sm border border-white/20 shadow-lg shrink-0">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"/></svg>
                </div>
                <div className="min-w-0">
                  <span className="shell-label font-bold text-white text-sm block truncate">BahasaCerdas</span>
                  <p className="shell-label text-[10px] text-violet-200">{isChatWeb ? "Obrolan" : "Arena"}</p>
                </div>
              </Link>
            </div>

            <div className="shell-user px-4 py-4 border-b border-gray-100/50 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:border-slate-800 dark:from-slate-800/60 dark:to-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="shell-label text-sm font-bold text-gray-900 truncate dark:text-slate-200">{user.fullName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <IconTarget size={16} className="text-violet-500 shrink-0" />
                    <RankChip rank={rank} size={14} showTitle={false} compact />
                  </div>
                </div>
              </div>
            </div>

            <ShellNavList />
            <RoleSections role={user.role} isFounder={user.isFounder} />
            <ShellSidebarFooter />
          </>
        )
      }
      header={
        <>
          <SwRegister />
          <header className="shrink-0 sticky top-0 z-30 flex items-center justify-between gap-2 px-4 md:px-6 h-14 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 dark:bg-slate-900/80 dark:border-slate-800">
            <div className="flex items-center gap-1 md:gap-2 min-w-0">
              {!apk && (
                <span className="hidden md:inline-flex">
                  <BackHome />
                </span>
              )}
              {!apk && (
                <span className="md:hidden">
                  <BackHome iconOnly className="-ml-1" />
                </span>
              )}
              <Link href={isChatWeb ? "/arena/chat" : "/arena"} className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                  {isChatWeb ? <MessageCircle className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <span className="block font-bold text-sm md:text-base text-gray-900 truncate dark:text-slate-100">
                    {isChatWeb ? "Obrolan" : "Arena"}
                  </span>
                  {isChatWeb ? (
                    <span className="hidden lg:block text-xs text-gray-400 leading-tight dark:text-slate-500">Ruang komunikasi kelas</span>
                  ) : (
                    <span className="hidden lg:block text-xs text-gray-400 leading-tight dark:text-slate-500">Pusat kompetisi &amp; belajar</span>
                  )}
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              {!apk && hasGuruAccess && (
                <Link href="/guru/beranda" aria-label="Dashboard Guru" title="Dashboard Guru" className="flex items-center gap-1 px-2.5 py-1.5 md:px-3 rounded-lg text-xs md:text-sm font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors dark:text-violet-300 dark:bg-violet-500/20 dark:hover:bg-violet-500/30">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden md:inline">Dashboard Guru</span>
                </Link>
              )}
              <HeaderActions />
              {!apk && <LogoutButton variant="icon" />}
            </div>
          </header>

          {/* Banner boost tidak muncul di WEB Obrolan — workspace penuh viewport */}
          {!isChatWeb && <ActiveBoostBanner />}
        </>
      }
      mainClassName={`mx-auto px-0 ${
        pathname.startsWith("/arena/chat")
          ? "max-w-[1440px] py-0 md:px-8"
          : "max-w-[1280px] py-0 md:py-6 md:px-6"
      }`}
      bottomNav={<>{apk && <BottomNav />}</>}
    >
      <ArenaClientWrapper>{children}</ArenaClientWrapper>
    </ShellLayout>
  )
}