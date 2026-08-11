import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

export const dynamic = "force-dynamic";

const SectionCard = ({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) => (
  <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-center gap-3 mb-1">
      <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">{icon}</div>
      <div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
    </div>
    <div className="mt-4 space-y-2">{children}</div>
  </section>
);

const Row = ({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value?: string;
  href?: string;
  accent?: string;
}) => {
  const inner = (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gray-50/80 hover:bg-violet-50/50 transition-colors">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className={`text-xs font-semibold ${accent || "text-violet-600"}`}>
        {value || "Buka"}
      </span>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : <div>{inner}</div>;
};

export default async function MuridPengaturanPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola akun, notifikasi, tampilan, dan keamanan akunmu dalam satu tempat.
        </p>
      </header>

      <SectionCard
        title="Akun & Profil"
        desc="Identitas, profil, dan data pribadimu"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        }
      >
        <Row label="Nama" value={user.fullName || user.nickname || "—"} />
        <Row label="Peran" value={user.role === "MURID" ? "Murid" : "Founder"} accent="text-emerald-600" />
        <Row label="Edit Profil & Identitas" href="/murid/profile" />
        <Row label="Toko Koin" href="/arena/toko-koin" value="Koin saya" />
      </SectionCard>

      <SectionCard
        title="Notifikasi"
        desc="Pantau aktivitas, misi, dan kabar dari kelas"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        }
      >
        <Row label="Pusat Notifikasi" href="/arena/notifikasi" value="Buka" />
        <Row label="Pengumuman Kelas" href="/murid/pengumuman" />
      </SectionCard>

      <SectionCard
        title="Tampilan"
        desc="Preferensi tema antarmuka"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        }
      >
        <Row label="Mode Tampilan" value="Terang (saat ini)" accent="text-gray-500" />
        <div className="px-4 py-3 rounded-xl bg-amber-50/70 border border-amber-100">
          <p className="text-xs text-amber-700">
            Mode Gelap sedang disiapkan dan akan segera hadir di pembaruan berikutnya.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Keamanan & Sesi"
        desc="Keluar dari akun"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        }
      >
        <div className="px-4 py-3">
          <LogoutButton />
        </div>
      </SectionCard>

      <p className="text-center text-[11px] text-gray-400 pb-4">
        BahasaCerdas — Pengaturan akun murid
      </p>
    </div>
  );
}
