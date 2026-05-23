import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AIFloatingButton from "@/components/shared/AIFloatingButton";

const MenuIcon = ({ path, label, href }: { path: string; label: string; href: string }) => (
  <Link href={href} className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all duration-200 text-gray-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:text-emerald-700">
    <svg className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className="font-medium group-hover:text-emerald-700">{label}</span>
  </Link>
);

export default async function GuruLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "GURU" && !user.isFounder) {
    redirect("/murid/beranda");
  }

  const leagueLabel = { BRONZE: "Perunggu", SILVER: "Perak", GOLD: "Emas", DIAMOND: "Berlian" }[user.league || "BRONZE"] || "Perunggu"

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <aside className="w-64 h-screen bg-white/80 backdrop-blur-xl border-r border-gray-100/50 flex flex-col fixed left-0 top-0 overflow-hidden shadow-xl shadow-gray-100/50">
        <div className="p-5 border-b border-gray-100/50 bg-gradient-to-r from-emerald-600 to-green-600">
          <Link href="/guru/beranda" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-sm border border-white/20 shadow-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"/></svg>
            </div>
            <div>
              <span className="font-bold text-white text-sm">BahasaCerdas</span>
              <p className="text-[10px] text-emerald-200">Dasbor Guru</p>
            </div>
          </Link>
        </div>

        <div className="px-4 py-4 border-b border-gray-100/50 bg-gradient-to-br from-emerald-50/50 to-green-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
              {user.fullName?.charAt(0).toUpperCase() || "G"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                <span className="text-[10px] text-gray-500 font-medium">{leagueLabel}</span>
                <span className="text-[10px] text-gray-400">•</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Tkt {user.level}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-emerald-100/50">
            <div className="flex items-center gap-1 text-xs text-orange-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" /></svg>
              <span className="font-semibold">{user.streak || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
              <span className="font-semibold">{user.xp?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>

        <nav className="py-4 px-3 flex-1 overflow-y-auto">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Menu Utama</div>
          <MenuIcon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" label="Beranda" href="/guru/beranda" />
          <MenuIcon path="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h9.75M6 7.5h3v3H6v-3z" label="Karya Siswa" href="/guru/feed-karya" />
          <MenuIcon path="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" label="KelasKu" href="/guru/kelasku" />
          <MenuIcon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" label="Bank Soal" href="/guru/bank-soal" />
          <MenuIcon path="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" label="Gim" href="/guru/game" />

          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mt-5 mb-2">Belajar & Materi</div>
          <MenuIcon path="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" label="Materi Ajar" href="/guru/materi-ajar" />
          <MenuIcon path="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" label="Video Pembelajaran" href="/guru/video-belajar" />
          <MenuIcon path="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" label="Artikel" href="/guru/artikel" />

          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mt-5 mb-2">Kompetensi</div>
          <MenuIcon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" label="UKBI - TKA" href="/guru/ukbi" />
          <MenuIcon path="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" label="Sertifikat" href="/guru/sertifikat" />

          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mt-5 mb-2">Karya & Toko</div>
          <MenuIcon path="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" label="Toko Karya" href="/guru/toko-karya" />
          <MenuIcon path="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" label="Pendapatan" href="/guru/pengaturan/saldo" />

          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mt-5 mb-2">Komunitas</div>
          <MenuIcon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" label="Komunitas" href="/guru/komunitas" />

          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mt-5 mb-2">Event & Lomba</div>
          <MenuIcon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" label="Kalender Kegiatan" href="/guru/olimpiade" />

          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mt-5 mb-2">Alat AI</div>
          <MenuIcon path="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" label="Alat AI" href="/guru/ai-tools" />

          {user.isFounder && (
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mt-5 mb-2">Admin</div>
          )}
          {user.isFounder && (
            <MenuIcon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" label="Panel Admin" href="/admin" />
          )}

          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mt-5 mb-2">Lainnya</div>
          <MenuIcon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" label="Profil" href="/guru/profile" />
          <MenuIcon path="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" label="Pengaturan" href="/guru/pengaturan" />
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