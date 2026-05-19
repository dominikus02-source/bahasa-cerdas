import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default async function MuridLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "MURID" && !user.isFounder) {
    redirect("/guru/beranda");
  }

  const supabase = createClient();

  async function logout() {
    "use server"
    await supabase.auth.signOut()
    redirect("/login")
  }

  const leagueLabel = { BRONZE: "Perunggu", SILVER: "Perak", GOLD: "Emas", DIAMOND: "Berlian" }[user.league || "BRONZE"] || "Perunggu"
  const leagueEmoji = { BRONZE: "🥉", SILVER: "🥈", GOLD: "🥇", DIAMOND: "💎" }[user.league || "BRONZE"] || "🥉"

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <Link href="/murid/beranda" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">BC</div>
            <div>
              <span className="font-bold text-gray-900 text-sm">BahasaCerdas</span>
              <p className="text-[10px] text-gray-400">Dasbor Murid</p>
            </div>
          </Link>
        </div>

        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
          <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
          <p className="text-[10px] text-gray-500 mt-1">{leagueEmoji} {leagueLabel} | Tkt {user.level}</p>
          <p className="text-[10px] text-gray-500 mt-1">🔥 {user.streak || 0} hari | ⚡ {user.xp || 0} XP</p>
        </div>

        <nav className="py-3 px-2 flex-1">
          {[
            { label: "Beranda", href: "/murid/beranda" },
            { label: "Tugasku", href: "/murid/tugasku" },
            { label: "Gabung Kelas", href: "/murid/gabung-kelas" },
            { label: "Gim", href: "/murid/game" },
            { label: "UKBI - TKA", href: "/murid/ukbi" },
            { label: "Sertifikat", href: "/murid/sertifikat" },
            { label: "Info Lomba", href: "/murid/olimpiade/info" },
            { label: "Kalender", href: "/murid/olimpiade/kalender" },
            { label: "Kemajuanku", href: "/murid/progresku" },
            { label: "Pengaturan", href: "/murid/pengaturan" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2.5 rounded-lg text-sm mb-1 text-gray-600 hover:bg-gray-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={logout}>
          <button type="submit" className="w-full px-4 py-3 text-left text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 border-t border-gray-100">
            Keluar
          </button>
        </form>
      </aside>

      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}