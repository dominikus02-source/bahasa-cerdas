import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { dashboardForUser } from "@/lib/auth/redirect";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import AIFloatingButton from "@/components/shared/AIFloatingButton";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { RoleSections } from "@/components/shell/RoleSections";
import { ShellSidebarFooter } from "@/components/shell/ShellSidebarFooter";
import { levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel } from "@/lib/gamification/ranks"
import { SidebarPremiumBadge } from "@/components/guru/SidebarPremiumBadge";
import { GuruNavList, GuruMobileNav } from "@/components/dashboard/GuruNav";
import { GuruHeader } from "@/components/shell/GuruHeader";
import { startGuruTrialIfEligible, shouldStartGuruTrial, getTrialStatus } from "@/lib/ai-gateway/trial-service";
import { resolveUserAiPlan } from "@/lib/ai-gateway/plan-resolver";
import { getRemainingCredits } from "@/lib/ai-gateway/quota-checker";
import "@/components/kelas/classroom.css";

export default async function GuruLayout({ children }: { children: React.ReactNode }) {
  // /guru/onboarding intentionally owns its auth/data bootstrap on the client.
  // Do not force the shared Guru shell to call getUser() before the page can
  // render: that would make onboarding depend on Supabase Auth/JWKS latency
  // twice (Proxy + layout) and can leave a fresh teacher on an endless spinner.
  const requestHeaders = await headers();
  if (requestHeaders.get("x-pathname") === "/guru/onboarding") {
    return children;
  }

  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  // Allowlist: hanya GURU/founder. Peran lain ke dasbor kanoniknya sendiri
  // (MURID → /murid/beranda seperti sebelumnya; ADMIN → /admin — sebelumnya
  // /murid/beranda yang memantul balik ke sini = loop; UMUM → beranda UMUM;
  // tak dikenal → halaman akses ditolak).
  if (user.role !== "GURU" && !user.isFounder) {
    redirect(dashboardForUser(user.role, user.isFounder));
  }

  if (!user.onboarded && !user.isFounder) {
    redirect("/guru/onboarding");
  }

  // Phase 9C — auto-start trial for eligible Guru users on dashboard access.
  //
  // This layout wraps EVERY guru page, so it runs on every navigation and on
  // every RSC prefetch. startGuruTrialIfEligible() re-reads the user from the
  // database, even though getUser() above already loaded exactly those fields —
  // a wasted round trip on every page view for a check that can only ever fire
  // once in a user's lifetime, and never for founders or premium accounts.
  // Gate it on the data already in hand so the database is touched only when
  // there is genuinely a trial to start.
  if (shouldStartGuruTrial({
    id: user.id,
    role: user.role,
    isFounder: user.isFounder,
    isPremium: user.isPremium,

    premiumUntil: user.premiumUntil,
    trialStartedAt: user.trialStartedAt,
    trialEndsAt: user.trialEndsAt,
  })) {
    const trialStart = await startGuruTrialIfEligible(user.id);
    if (trialStart.started && trialStart.trialEndsAt) {
      user.trialStartedAt = new Date();
      user.trialEndsAt = trialStart.trialEndsAt;
      user.trialPlan = "GURU_PRO_TRIAL";
      user.trialCreditsTotal = 200;
      user.badgeKind = "trial";
      console.log(`[GuruLayout] Trial auto-started for ${user.id}`);
    }
  }

  // Fetch plan + remaining credits for sidebar display
  const planInfo = resolveUserAiPlan({
    role: user.role,
    isFounder: user.isFounder,
    isPremium: user.isPremium,

    premiumUntil: user.premiumUntil,
    trialEndsAt: user.trialEndsAt,
    trialStartedAt: user.trialStartedAt,
    premiumPlan: user.premiumPlan,
  });
  const remainingCredits = planInfo.unlimited ? null : await getRemainingCredits({
    id: user.id,
    role: user.role,
    isFounder: user.isFounder,
    isPremium: user.isPremium,

    premiumUntil: user.premiumUntil,
    trialEndsAt: user.trialEndsAt,
    trialStartedAt: user.trialStartedAt,
    premiumPlan: user.premiumPlan,
  });
  const trialStatus = getTrialStatus({
    trialEndsAt: user.trialEndsAt,
    trialStartedAt: user.trialStartedAt,
    trialPlan: user.trialPlan,
    isPremium: user.isPremium,

    isFounder: user.isFounder,
  });

  // Rank resmi diturunkan dari XP — User.league sudah tidak ditulis lagi.
  const rank = rankFromLevel(levelFromXp(user.xp || 0));

  return (
    <ShellLayout
      rootClassName="bc-guru-shell bg-gradient-to-br from-blue-50 via-white to-slate-50 dark:from-[#061225] dark:via-[#08182b] dark:to-[#0b1f38]"
      sidebar={
        <>
          <div className="p-5 border-b border-blue-500/20 bg-gradient-to-r from-[#0b4fc7] to-[#1671e8] dark:border-blue-950/70">
            <Link href="/guru/beranda" className="flex items-center gap-3 min-w-0">
              <Image src="/brand/bc2026-icon.png" alt="" width={48} height={48} className="h-12 w-12 shrink-0 object-contain drop-shadow-md" />
              <div className="min-w-0">
                <span className="shell-label font-bold text-white text-sm block truncate">BahasaCerdas</span>
                <p className="shell-label text-[10px] text-blue-100 block truncate">Dasbor Guru</p>
              </div>
            </Link>
          </div>

          <div className="px-3 pt-3">
            <SidebarPremiumBadge
              plan={planInfo.plan}
              isTrialActive={trialStatus.isTrialActive}
              daysRemaining={trialStatus.daysRemaining}
              remainingCredits={remainingCredits}
              creditsTotal={planInfo.unlimited ? undefined : planInfo.creditsTotal}
              premiumUntil={user.premiumUntil}
            />
          </div>

          <GuruNavList isFounder={user.isFounder} />
          <RoleSections role={user.role} isFounder={user.isFounder} />
          <ShellSidebarFooter />
        </>
      }
      header={
        <GuruHeader user={user} rank={rank} />
      }
      mainClassName="bc-guru flex-1 px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 lg:py-8 pb-24 md:pb-8 mx-auto max-w-[1440px] w-full"
      bottomNav={<GuruMobileNav role={user.role} isFounder={user.isFounder} />}
    >
      {children}
      <AIFloatingButton />
    </ShellLayout>
  );
}