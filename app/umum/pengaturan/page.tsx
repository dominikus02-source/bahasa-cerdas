import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChevronRight, Library, LogOut, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { requireUmumPage } from "@/lib/auth/umum-page";
import { kategoriUmumLabel } from "@/lib/auth/kategori-umum";
import AccountSecurityPanel from "@/components/account/AccountSecurityPanel";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { ThemeSettingsCard } from "@/components/murid/ThemeSettingsCard";
import { UmumAvatar, UmumShell } from "@/components/umum/UmumShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Akun — BahasaCerdas", robots: { index: false, follow: false } };

function Section({ icon, title, desc, children }: { icon: ReactNode; title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="rounded-bc-card border border-bc-line bg-bc-surface p-5 shadow-bc-1">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-bc-icon bg-bc-violet-soft text-bc-violet">{icon}</span>
        <div>
          <h2 className="text-sm font-bold text-bc-text">{title}</h2>
          {desc && <p className="text-xs text-bc-text-3">{desc}</p>}
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value, href }: { label: string; value?: string; href?: string }) {
  const inner = (
    <span className="flex items-center justify-between gap-3 rounded-bc-sm bg-bc-surface-2 px-4 py-3">
      <span className="text-sm font-medium text-bc-text">{label}</span>
      <span className="flex min-w-0 items-center gap-1 text-xs font-semibold text-bc-text-2">
        <span className="truncate">{value ?? "Buka"}</span>
        {href && <ChevronRight size={14} aria-hidden />}
      </span>
    </span>
  );
  return href ? (
    <Link href={href} className="block rounded-bc-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-bc-focus">{inner}</Link>
  ) : (
    <div>{inner}</div>
  );
}

export default async function UmumPengaturanPage() {
  const user = await requireUmumPage("/umum/pengaturan");
  const profile = await db.profile
    .findUnique({ where: { userId: user.id }, select: { kategoriUmum: true } })
    .catch(() => null);
  const kategori = kategoriUmumLabel(profile?.kategoriUmum ?? null);
  const name = user.nickname || user.fullName;

  return (
    <UmumShell user={user}>
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <header className="flex items-center gap-4">
          <UmumAvatar user={user} size={56} />
          <div className="min-w-0">
            <h1 className="truncate text-bc-h1 text-bc-text">Akun</h1>
            <p className="truncate text-bc-small text-bc-text-3">{name} · {user.email}</p>
          </div>
        </header>

        <Section icon={<UserRound size={18} aria-hidden />} title="Akun & Profil" desc="Identitas akunmu">
          <Row label="Nama" value={user.fullName || "—"} />
          <Row label="Peran" value={kategori ? `Umum · ${kategori}` : "Umum"} />
        </Section>

        <Section icon={<Library size={18} aria-hidden />} title="Aktivitas" desc="Pembelian dan notifikasi">
          <Row label="Koleksi Saya" href="/umum/koleksi" />
          <Row label="Riwayat pesanan" href="/orders" />
          <Row label="Notifikasi" href="/umum/notifikasi" />
        </Section>

        <ThemeSettingsCard />
        <AccountSecurityPanel />

        <Section icon={<LogOut size={18} aria-hidden />} title="Sesi" desc="Keluar dari akun di perangkat ini">
          <LogoutButton />
        </Section>
      </div>
    </UmumShell>
  );
}
