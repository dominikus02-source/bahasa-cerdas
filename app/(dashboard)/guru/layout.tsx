import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { GraduationCap } from "lucide-react";
import AIFloatingButton from "@/components/shared/AIFloatingButton";
import { BackHome } from "@/components/shared/BackHome";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { RoleSections } from "@/components/shell/RoleSections";
import { ShellSidebarFooter } from "@/components/shell/ShellSidebarFooter";
import { levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel } from "@/lib/gamification/ranks"
import { RankChip } from "@/components/gamification/RankChip"
import { SidebarPremiumBadge } from "@/components/guru/SidebarPremiumBadge";
import { VerifiedBadge } from "@/components/arena/UserName";
import UserAvatar from "@/components/arena/UserAvatar";
import ArenaLogoutButton from "@/components/arena/LogoutButton";
import { GuruNavList, GuruMobileNav } from "@/components/dashboard/GuruNav";
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

  if (user.role !== "GURU" && !user.isFounder) {
    redirect("/murid/beranda");
  }

  if (!user.onboarded) {
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
    if (trialStart.started) {
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
      rootClassName="bc-guru-shell bg-[#f4f8ff] dark:bg-[#061225]"
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
        <header className="shrink-0 sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-blue-100/80 bg-white/88 px-4 backdrop-blur-xl md:px-6 dark:border-blue-950/70 dark:bg-[#08182b]/92">
          <div className="flex min-w-0 items-center gap-2">
            <BackHome href="/guru/beranda" className="hover:text-blue-700 hover:bg-blue-50 dark:hover:text-blue-300 dark:hover:bg-blue-950/50" />
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                <GraduationCap className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Guru</span>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
            <Link
              href="/guru/profile"
              className="group flex min-w-0 items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950/50"
              aria-label="Buka profil guru"
            >
              <UserAvatar
                size={36}
                avatar={user.avatar}
                initials={user.fullName?.charAt(0).toUpperCase() || "G"}
                gradient="from-blue-600 to-sky-500"
                textClassName="text-sm"
                className="shrink-0 shadow-md"
              />
              <span className="hidden min-w-0 text-left md:block">
                <span className="flex items-center gap-1.5">
                  <span className="max-w-[190px] truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                    {user.fullName}
                  </span>
                  <VerifiedBadge isFounder={user.isFounder} isPremium={user.isPremium} size={13} />
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <span>Guru</span>
                  <span aria-hidden>•</span>
                  <RankChip rank={rank} size={11} showTitle={false} compact />
                  <span aria-hidden>•</span>
                  <span>Tkt {user.level}</span>
                </span>
              </span>
            </Link>
            <NotificationBell allHref="/guru/notifikasi" />
            <ThemeToggle />
            <ArenaLogoutButton variant="icon" to="/login" />
          </div>
        </header>
      }
      mainClassName="bc-guru flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 lg:pb-8 mx-auto max-w-[1440px] w-full"
      bottomNav={<GuruMobileNav isFounder={user.isFounder} />}
    >
      {children}
      <AIFloatingButton />
    </ShellLayout>
  );
}