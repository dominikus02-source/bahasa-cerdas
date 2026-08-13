"use client"

import { usePathname } from "next/navigation"
import { ActiveBoostBanner } from "@/components/arena/ActiveBoostBanner"

/**
 * ARENA WORKSPACE CONTAINER — penentu lebar konten Arena/Obrolan/AI BC.
 *
 * Sebelumnya keputusan ini dibuat server-side dari header `x-pathname` yang
 * diset middleware (lib/supabase/proxy.ts). Header itu memang diset untuk
 * setiap request, tetapi bila absen pada request tertentu (lapisan proxy/CDN,
 * render yang bukan lewat middleware), `pathname` kosong membuat Obrolan dan
 * AI BC jatuh ke container sempit `max-w-[1280px]` + banner boost — halaman
 * desktop terlihat seperti "layout smartphone" pada kunjungan pertama, lalu
 * benar setelah refresh.
 *
 * `usePathname()` membaca pathname dari router yang di-seed dari URL request
 * oleh Next.js — nilainya benar pada first paint (SSR) DAN setelah refresh,
 * tanpa bergantung pada header middleware. Header `x-pathname` tetap dipakai
 * di app/arena/layout.tsx HANYA untuk gerbang login (RUTE_TANPA_GERBANG) —
 * keputusan LEBAR konten kini hidup di sini.
 *
 * APK tetap memakai chrome-nya sendiri (BottomNav + banner boost tampil,
 * container full-width untuk semua halaman): `apk` dibaca server-side dari
 * cookie bc_apk (lib/apk.ts) lalu dikirim sebagai prop.
 */
export function ArenaWorkspaceContainer({
  apk,
  children,
}: {
  apk: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // isChatWeb = !apk && pathname.startsWith("/arena/chat") — Web saja; APK
  // memakai chrome penuh + BottomNav (perilaku identik dengan sebelumnya).
  const isChatWeb = !apk && pathname.startsWith("/arena/chat")
  const isAiWorkspace = pathname.startsWith("/arena/ai")
  const isChatWorkspace = isChatWeb || isAiWorkspace

  return (
    <>
      {/* Banner boost tidak muncul di WEB Obrolan atau workspace AI BC —
          keduanya workspace penuh viewport. APK tetap menampilkan banner. */}
      {!isChatWeb && !isAiWorkspace && <ActiveBoostBanner />}
      {/* Ternary sama persis dengan mainClassName lama di app/arena/layout.tsx:
          workspace = w-full py-0 md:px-6; halaman lain = canvas desktop-first
          max-w-[1280px] py-0 md:py-6 md:px-6. `arena-workspace-inner` ditarget
          aturan game-fullscreen di arena.css agar gim tetap 100%. */}
      <div
        className={`arena-workspace-inner ${
          isChatWorkspace
            ? "w-full py-0 md:px-6"
            : "mx-auto max-w-[1280px] py-0 md:py-6 md:px-6"
        }`}
      >
        {children}
      </div>
    </>
  )
}
