"use client";

import { useEffect } from "react";
import "@/app/arena/player-theme.css";
import { HomeDataProvider } from "@/components/student-home/home-data";
import { StudentHomeHero } from "@/components/student-home/StudentHomeHero";
import { DailyMissionCard } from "@/components/student-home/DailyMissionCard";
import { DailyActionCard } from "@/components/student-home/DailyActionCard";
import { AIBCHomeCard } from "@/components/student-home/AIBCHomeCard";
import { LearningJourneySection } from "@/components/student-home/LearningJourneySection";
import { RuangBelajarSection } from "@/components/student-home/RuangBelajarSection";
import { SimulasiUjianSection } from "@/components/student-home/SimulasiUjianSection";
import { RecentWorksSection } from "@/components/student-home/RecentWorksSection";
import { ArenaHomeSection } from "@/components/student-home/ArenaHomeSection";
import { PremiumValueCard } from "@/components/student-home/PremiumValueCard";
import { WeeklyRecapCard } from "@/components/student-home/WeeklyRecapCard";
import { SecondaryLearningInfo } from "@/components/student-home/SecondaryLearningInfo";
import SkillRadar from "@/components/arena/player/SkillRadar";
import { useHomeData } from "@/components/student-home/home-data";

// Hierarki Beranda (Personal Learning Home):
// 1. PERSONAL HERO (identitas + state belajar + CTA utama + statistik — single source of truth)
// → 2. TANTANGAN HARI INI (DailyActionCard, bila tersedia) → 3. KEMAMPUAN + MOTIVASI (skill + arena + premium)
// → 4. PINTAS BELAJAR (AI BC + perjalanan) → 5. MISI HARIAN → 6. RUANG BELAJAR
// → 7. SIMULASI → 8. KARYA + KABAR KELAS
export default function HomeFeedPage() {
  useEffect(() => {
    const detak = () => {
      // Tab di latar belakang tidak sedang "aktif" — tidak perlu dilaporkan.
      if (document.visibilityState !== "visible") return;
      fetch("/api/user/heartbeat", { method: "POST" }).catch(() => {});
    };
    // Dulu tiap 60 detik. Penanda "sedang online" tidak butuh setepat itu,
    // sementara tiap panggilan memvalidasi sesi ke server Auth Supabase —
    // dengan ~200 murid, itu 12.000 panggilan auth per jam hanya untuk ini.
    const hb = setInterval(detak, 300000);
    const hbTimeout = setTimeout(detak, 5000);
    return () => {
      clearInterval(hb);
      clearTimeout(hbTimeout);
    };
  }, []);

  return (
    <div className="px-theme px-theme-app min-h-screen">
      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-8 space-y-8">
        <HomeDataProvider>
          <HomeContent />
        </HomeDataProvider>
      </main>
    </div>
  );
}

function HomeContent() {
  const { myDay, myDayLoading, myDayFailed, premium } = useHomeData();
  const isPremium = premium?.plan === "PRO" || premium?.plan === "FOUNDER" || premium?.plan === "MURID_PREMIUM";

  return (
    <>
      <StudentHomeHero />

      <DailyActionCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <SkillRadar
          skills={myDay?.learnerState ?? null}
          loading={myDayLoading}
          failed={myDayFailed}
          showRecommendation={true}
          isPremium={isPremium}
        />
        <div className="space-y-6">
          <ArenaHomeSection />
          <PremiumValueCard />
          <WeeklyRecapCard />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <AIBCHomeCard />
        <LearningJourneySection />
      </div>

      <DailyMissionCard />

      <RuangBelajarSection />
      <SimulasiUjianSection />
      <RecentWorksSection />
      <SecondaryLearningInfo />
    </>
  );
}
