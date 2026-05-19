import { getUser } from "@/lib/supabase/server";
import Link from "next/link";
import AIFloatingButton from "@/components/shared/AIFloatingButton";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

const MenuIcon = ({ path, label, href }: { path: string; label: string; href: string }) => (
  <Link href={href} className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200 text-gray-600 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 hover:text-violet-700">
    <svg className="w-5 h-5 text-gray-400 group-hover:text-violet-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className="font-medium group-hover:text-violet-700">{label}</span>
  </Link>
);

export default async function MuridLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "MURID" && !user.isFounder) {
    redirect("/guru/beranda");
  }

  const leagueLabel = { BRONZE: "Perunggu", SILVER: "Perak", GOLD: "Emas", DIAMOND: "Berlian" }[user.league || "BRONZE"] || "Perunggu"
  const leagueEmoji = { BRONZE: "🥉", SILVER: "🥈", GOLD: "🥇", DIAMOND: "💎" }[user.league || "BRONZE"] || "🥉"

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      <aside className="w-64 h-screen bg-white/80 backdrop-blur-xl border-r border-gray-100/50 flex flex-col fixed left-0 top-0 overflow-hidden shadow-xl shadow-gray-100/50">
        <div className="p-5 border-b border-gray-100/50 bg-gradient-to-r from-violet-600 to-purple-600">
          <Link href="/murid/beranda" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-sm border border-white/20 shadow-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"/></svg>
            </div>
            <div>
              <span className="font-bold text-white text-sm">BahasaCerdas</span>
              <p className="text-[10px] text-violet-200">Dasbor Murid</p>
            </div>
          </Link>
        </div>

        <div className="px-4 py-4 border-b border-gray-100/50 bg-gradient-to-br from-violet-50/50 to-purple-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
              {user.fullName?.charAt(0).toUpperCase() || "M"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs">{leagueEmoji}</span>
                <span className="text-[10px] text-gray-500 font-medium">{leagueLabel}</span>
                <span className="text-[10px] text-gray-400">•</span>
                <span className="text-[10px] text-violet-600 font-semibold">Tkt {user.level}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-violet-100/50">
            <div className="flex items-center gap-1 text-xs text-orange-500">
              <span className="text-sm">🔥</span>
              <span className="font-semibold">{user.streak || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-500">
              <span className="text-sm">⚡</span>
              <span className="font-semibold">{user.xp?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>

        <nav className="py-4 px-3 flex-1 overflow-y-auto">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Menu Utama</div>
          <MenuIcon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" label="Beranda" href="/murid/beranda" />
          <MenuIcon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" label="Tugasku" href="/murid/tugasku" />
          <MenuIcon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" label="Gabung Kelas" href="/murid/gabung-kelas" />
          <MenuIcon path="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" label="Gim" href="/murid/game" />

          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mt-5 mb-2">ujian & Aktivitas</div>
          <MenuIcon path="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" label="UKBI - TKA" href="/murid/ukbi" />
          <MenuIcon path="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" label="Sertifikat" href="/murid/sertifikat" />
          <MenuIcon path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" label="Info Lomba" href="/murid/olimpiade/info" />
          <MenuIcon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" label="Kalender" href="/murid/olimpiade/kalender" />

          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mt-5 mb-2">Progress</div>
          <MenuIcon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" label="Kemajuanku" href="/murid/progresku" />
          <MenuIcon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" label="Profil" href="/murid/profile" />
          <MenuIcon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" label="Pengaturan" href="/murid/pengaturan" />
        </nav>

        <div className="p-3 border-t border-gray-100/50 bg-gray-50/50">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8 bg-transparent">
        {children}
      </main>
      <AIFloatingButton />
    </div>
  );
}