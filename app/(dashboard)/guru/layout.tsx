import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
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
      rootClassName="bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-slate-950 dark:via-[#0b1220] dark:to-[#0d2019]"
      sidebar={
        <>
          <div className="p-5 border-b border-gray-100/50 bg-gradient-to-r from-emerald-600 to-green-600 dark:border-slate-800">
            <Link href="/guru/beranda" className="flex items-center gap-3 min-w-0">
              <img src="/brand/bc2026-icon.png" alt="" className="h-12 w-12 shrink-0 object-contain drop-shadow-md" />
              <div className="min-w-0">
                <span className="shell-label font-bold text-white text-sm block truncate">BahasaCerdas</span>
                <p className="shell-label text-[10px] text-emerald-200 block truncate">Dasbor Guru</p>
              </div>
            </Link>
          </div>

          <div className="shell-user px-4 py-4 border-b border-gray-100/50 bg-gradient-to-br from-emerald-50/50 to-green-50/50 dark:border-slate-800 dark:from-slate-800/60 dark:to-slate-800/40">
            {/* Sama seperti sidebar murid: foto guru tidak pernah dirender,
                inisialnya di-hardcode tanpa memeriksa user.avatar. */}
            <div className="flex items-center gap-3">
              <UserAvatar
                size={40}
                avatar={user.avatar}
                initials={user.fullName?.charAt(0).toUpperCase() || "G"}
                gradient="from-emerald-500 to-green-600"
                textClassName="text-sm"
                className="shadow-lg shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="shell-label flex items-center gap-1.5 text-sm font-semibold text-gray-900 truncate dark:text-slate-200">{user.fullName}<VerifiedBadge isFounder={user.isFounder} isPremium={user.isPremium} size={14} /></p>
                <div className="shell-label flex items-center gap-1.5 mt-0.5">
                  <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  <RankChip rank={rank} size={12} showTitle={false} compact />
                  <span className="text-[10px] text-gray-400">•</span>
                  <span className="text-[10px] text-emerald-600 font-semibold dark:text-emerald-400">Tkt {user.level}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-emerald-100/50 dark:border-slate-800">
              <div className="flex items-center gap-1 text-xs text-orange-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" /></svg>
                <span className="font-semibold">{user.streak || 0}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                <span className="font-semibold">{user.xp?.toLocaleString() || 0}</span>
              </div>
            </div>
            {/* Phase 9C — Premium/Trial badge in sidebar */}
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
        <header className="shrink-0 sticky top-0 z-30 flex items-center justify-between gap-2 px-4 md:px-6 h-14 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 dark:bg-slate-900/80 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <BackHome href="/guru/beranda" />
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" strokeWidth={2} />
              </span>
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Guru</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <UserAvatar
              size={36}
              avatar={user.avatar}
              initials={user.fullName?.charAt(0).toUpperCase() || "G"}
              gradient="from-emerald-500 to-green-600"
              textClassName="text-sm"
              className="hidden md:flex shadow-md"
            />
            <NotificationBell />
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