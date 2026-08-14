import "./arena.css"
import "./player-theme.css"
import { getUser } from "@/lib/supabase/server"
import { isApk } from "@/lib/apk"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel } from "@/lib/gamification/ranks"
import { RankChip } from "@/components/gamification/RankChip"
import { IconTarget } from "@/lib/icons"
import { SwRegister } from "@/components/SwRegister"
import { ArenaClientWrapper } from "./arena-client"
import { BottomNav } from "./bottom-nav"
import { BackHome } from "@/components/shared/BackHome"
import UserAvatar from "@/components/arena/UserAvatar"
import { NotificationBell } from "@/components/dashboard/NotificationBell"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { ShellLayout } from "@/components/shell/ShellLayout"
import { ShellNavList } from "@/components/shell/ShellNavList"
import { RoleSections } from "@/components/shell/RoleSections"
import { ShellSidebarFooter } from "@/components/shell/ShellSidebarFooter"
import { ArenaWorkspaceContainer } from "@/components/arena/workspace-container"

// ARENA FINAL CONSOLIDATION — Arena adalah produk Student Shell, BUKAN
// aplikasi kedua: tidak ada navbar/subnav Arena sendiri di web. Navigasi
// menuju route Arena dilakukan lewat Student Shell, CTA kontekstual, dan
// gateway sections (Arena home). APK tetap bernavigasi lewat BottomNav.
// Route tetap ada: /arena, /arena/misi, /arena/league, /arena/game,
// /arena/player/leaderboard, /arena/player/badges, /arena/chat, dst.

// UNIFIED APP SHELL — Arena & Obrolan berbagi SATU shell global (Student
// Shell): sidebar (brand → user → ShellNavList → role sections → footer)
// DAN header global yang sama persis dengan halaman Student lainnya:
// [← Beranda] ......... [Avatar] [Bell] [Theme]. Identitas produk (Arena/
// Obrolan) hidup di KONTEN halaman, bukan di header global — header tidak
// boleh membawa navigasi produk kedua. Sidebar hanya untuk web (APK memakai
// chrome penuh + BottomNav, konsisten dengan perilaku lama).

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

  // 4.2.2 — Akses Guru/Founder ke dasbor guru adalah ROLE-BASED DESTINATION
  // lewat RoleSections di sidebar (Mode Guru / Akses Founder). Tidak ada CTA
  // "Dashboard Guru" di header global — header kanonik netral untuk semua role.

  // Inside the Android APK the top bar drops its one escape hatch. "Beranda"
  // points outside the /arena scope, so tapping it would throw the student into a
  // browser tab — the one thing the APK exists to avoid. Logout moves to the
  // Pemain tab (Duolingo keeps account actions in the profile too): a destructive
  // action sitting one stray thumb away from the notification bell is a bad trade
  // on a phone used by children.
  const apk = await isApk()

  // OBROLAN 4.0 — produk Student Shell, bukan halaman Arena. Obrolan memakai
  // shell + header GLOBAL yang sama (tanpa chrome/identitas produk sendiri di
  // layout); workspace chat (3-pane) merawat toolbar INTERNAL-nya sendiri di
  // dalam konten.
  //
  // FIX FIRST-PAINT: keputusan lebar konten (isChatWeb / isAiWorkspace —
  // container full-width + banner boost) DIPINDAH ke
  // components/arena/workspace-container.tsx (client, usePathname()). Header
  // middleware `x-pathname` yang dibaca di atas kini HANYA untuk gerbang login
  // RUTE_TANPA_GERBANG. Alasannya: bila header itu absen pada request pertama,
  // Obrolan jatuh ke container sempit max-w-[1280px] dan terlihat seperti
  // layout smartphone, padahal setelah refresh (header hadir) menjadi benar.
  // usePathname() di-seed dari URL request — benar di first paint dan refresh.
  // APK tetap memakai chrome penuh + BottomNav (kompatibilitas TWA tidak berubah).

  // Rank resmi diturunkan dari XP — sama dengan pola Student Shell.
  const rank = rankFromLevel(levelFromXp(user.xp || 0))

  return (
    <ShellLayout
 rootClassName="arena-theme min-h-screen bg-gray-50 pb-20 md:pb-0 dark:bg-slate-950 bg-gradient-to-br from-violet-50 via-slate-50 to-purple-50 dark:from-slate-950 dark:via-[#0b1220] dark:to-[#1e1b4b]"
      sidebar={
        apk ? undefined : (
          <>
 <div className="p-5 border-b border-gray-100 dark:border-slate-800/50 bg-gradient-to-r from-violet-600 to-purple-600">
              <Link href="/murid/beranda" className="flex items-center gap-3 min-w-0">
                <img src="/brand/bc2026-icon.png" alt="" className="h-12 w-12 shrink-0 object-contain drop-shadow-md" />
                <div className="min-w-0">
                  <span className="shell-label font-bold text-white text-sm block truncate">BahasaCerdas</span>
                  <p className="shell-label text-[10px] text-violet-200">Dasbor Murid</p>
                </div>
              </Link>
            </div>

 <div className="shell-user px-4 py-4 border-b border-gray-100/50 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:border-slate-800 dark:from-slate-800/60 dark:to-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="shell-label text-sm font-bold text-gray-900 truncate dark:text-slate-200">{user.fullName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <IconTarget size={16} className="text-violet-500 dark:text-violet-400 shrink-0" />
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
          {/* HEADER GLOBAL KANONIK — sama persis dengan halaman Student lain
              (/murid/*): [← Beranda] .... [Avatar] [Bell] [Theme]. TIDAK ada
              identitas produk (Arena/Obrolan), CTA dasbor guru, search, atau
              logout di header — navigasi tetap via sidebar global; akses
              guru/founder via RoleSections; logout via sidebar footer dan
              Pemain tab. APK menurunkan BackHome (escape hatch keluar scope). */}
 <header className="shrink-0 sticky top-0 z-30 flex items-center justify-between gap-2 px-4 md:px-6 h-14 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 dark:bg-slate-900/80 dark:border-slate-800">
            {!apk && <BackHome />}
            <div className="flex items-center gap-1 md:gap-2">
              <UserAvatar
                size={36}
                avatar={user.avatar}
                initials={user.fullName?.charAt(0).toUpperCase() || "M"}
                gradient="from-violet-500 to-purple-600"
                textClassName="text-sm"
                className="hidden md:flex shadow-md"
              />
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
        </>
      }
      mainClassName="mx-auto px-0 w-full py-0"
      bottomNav={<>{apk && <BottomNav />}</>}
    >
      <ArenaClientWrapper>
        <ArenaWorkspaceContainer apk={apk}>{children}</ArenaWorkspaceContainer>
      </ArenaClientWrapper>
    </ShellLayout>
  )
}
