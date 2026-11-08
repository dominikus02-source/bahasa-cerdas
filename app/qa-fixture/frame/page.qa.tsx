/**
 * FIXTURE QA VISUAL LOKAL — data PALSU berlabel "QA".
 * Hanya dikompilasi bila BC_QA_FIXTURE=1 (pageExtensions "qa.tsx" di
 * next.config.ts) dan tidak pernah di build produksi. Tidak ada bypass
 * autentikasi/RBAC: komponen tampilan dirender langsung dengan props contoh;
 * setiap panggilan API dari komponen tetap ditolak server (tanpa sesi).
 */
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GuruHeader } from "@/components/shell/GuruHeader";
import { GuruMobileNav } from "@/components/dashboard/GuruNav";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { MuridShellFrame } from "@/components/shell/MuridShellFrame";
import { FOUNDER_DASHBOARD_EMAILS } from "@/lib/auth/founder-access";
import { levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import LoginPage from "@/app/(auth)/login/page";
import { QaControls } from "../QaControls";
import { QaPathname } from "../QaPathname";

export const dynamic = "force-dynamic";

const rank = rankFromLevel(levelFromXp(1800));
const founderEmail = FOUNDER_DASHBOARD_EMAILS[0] ?? null;

function QaContent({ label }: { label: string }) {
  return (
    <div className="space-y-3" data-qa-content>
      <p className="rounded-xl border border-bc-line bg-bc-surface p-3 text-sm font-bold text-bc-text">QA FIXTURE — {label} (data palsu)</p>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rounded-xl border border-bc-line bg-bc-surface p-4 text-sm text-bc-text-2">
          Kartu contoh QA #{i + 1}: teks panjang untuk memeriksa pemotongan, pembungkusan, dan overflow horizontal di layar sempit.
        </div>
      ))}
    </div>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production" || process.env.BC_QA_FIXTURE !== "1") notFound();
  const q = await searchParams;
  const view = q.view ?? "guru-founder";
  const theme = q.theme === "dark" ? "dark" : "light";
  const app = q.app !== "0";
  const font = Math.min(200, Math.max(80, Number(q.font) || 100));
  // Jalur yang disimulasikan untuk usePathname() (hanya jalur internal relatif).
  const path = q.path && /^\/[a-z0-9\-/]*$/.test(q.path) ? q.path : null;
  const controls = <QaControls theme={theme} app={app} font={font} />;

  if (view === "guru-founder" || view === "guru") {
    const isFounder = view === "guru-founder";
    const user = { fullName: isFounder ? "QA Founder Palsu" : "QA Guru Palsu", avatar: null, email: isFounder ? founderEmail : "qa-guru@example.invalid", isFounder, isPremium: false, badgeKind: null, level: 12 };
    return (
      <>
        {controls}
        <QaPathname pathname={path ?? "/guru/beranda"}>
        <ShellLayout
          rootClassName="bc-guru-shell ui-app-bg"
          header={<GuruHeader user={user} rank={rank} />}
          mainClassName="bc-guru flex-1 px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 lg:py-8 pb-24 md:pb-8 mx-auto max-w-[1440px] w-full"
          bottomNav={<GuruMobileNav role="GURU" isFounder={isFounder} />}
        >
          <QaContent label={isFounder ? "Founder di peran Guru" : "Guru biasa"} />
        </ShellLayout>
        </QaPathname>
      </>
    );
  }
  if (view === "murid" || view === "murid-founder") {
    const isFounder = view === "murid-founder";
    return (
      <>
        {controls}
        <QaPathname pathname={path ?? "/murid/beranda"}>
        <MuridShellFrame user={{ fullName: isFounder ? "QA Founder Palsu" : "QA Murid Palsu", avatar: null, role: isFounder ? "GURU" : "MURID", isFounder, email: isFounder ? founderEmail : "qa-murid@example.invalid" }} rank={rank}>
          <QaContent label={isFounder ? "Founder di peran Murid" : "Murid biasa"} />
        </MuridShellFrame>
        </QaPathname>
      </>
    );
  }
  if (view === "login") {
    return (
      <>
        {controls}
        <QaPathname pathname="/login"><Suspense fallback={null}><LoginPage /></Suspense></QaPathname>
      </>
    );
  }
  notFound();
}
