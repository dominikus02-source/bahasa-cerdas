import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { levelFromXp } from "@/lib/gamification/levels"
import { rankFromLevel, RANK_META } from "@/lib/gamification/ranks"
import { RankChip } from "@/components/gamification/RankChip"
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AIFloatingButton from "@/components/shared/AIFloatingButton";
import { startGuruTrialIfEligible, shouldStartGuruTrial, getTrialStatus } from "@/lib/ai-gateway/trial-service";
import { resolveUserAiPlan } from "@/lib/ai-gateway/plan-resolver";
import { getRemainingCredits } from "@/lib/ai-gateway/quota-checker";
import { SidebarPremiumBadge } from "@/components/guru/SidebarPremiumBadge";
import UserAvatar from "@/components/arena/UserAvatar";
import { GuruNavList, GuruMobileNav } from "@/components/dashboard/GuruNav";

export default async function GuruLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "GURU" && !user.isFounder) {
    redirect("/murid/beranda");
  }

  if (!user.onboarded) {
    redirect("/onboarding");
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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <aside className="w-64 h-screen bg-white/80 backdrop-blur-xl border-r border-gray-100/50 hidden lg:flex flex-col fixed left-0 top-0 overflow-hidden shadow-xl shadow-gray-100/50">
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
            {/* Sama seperti sidebar murid: foto guru tidak pernah dirender,
                inisialnya di-hardcode tanpa memeriksa user.avatar. */}
            <UserAvatar
              size={40}
              avatar={user.avatar}
              initials={user.fullName?.charAt(0).toUpperCase() || "G"}
              gradient="from-emerald-500 to-green-600"
              textClassName="text-sm"
              className="shadow-lg"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                <RankChip rank={rank} size={12} showTitle={false} compact />
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

        <div className="p-3 border-t border-gray-100/50 bg-gray-50/50">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 bg-transparent">
        {children}
      </main>
      <GuruMobileNav isFounder={user.isFounder} />
      <AIFloatingButton />
    </div>
  );
}