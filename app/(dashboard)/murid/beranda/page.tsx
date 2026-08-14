"use client";

import { useEffect } from "react";
import "@/app/arena/player-theme.css";
import { HomeDataProvider } from "@/components/student-home/home-data";
import { StudentHomeHero } from "@/components/student-home/StudentHomeHero";
import { ContinueLearningCard } from "@/components/student-home/ContinueLearningCard";
import { AIBCHomeCard } from "@/components/student-home/AIBCHomeCard";
import { LearningJourneySection } from "@/components/student-home/LearningJourneySection";
import { RuangBelajarSection } from "@/components/student-home/RuangBelajarSection";
import { SimulasiUjianSection } from "@/components/student-home/SimulasiUjianSection";
import { RecentWorksSection } from "@/components/student-home/RecentWorksSection";
import { ArenaHomeSection } from "@/components/student-home/ArenaHomeSection";
import { PremiumValueCard } from "@/components/student-home/PremiumValueCard";
import { SecondaryLearningInfo } from "@/components/student-home/SecondaryLearningInfo";
import SkillRadar from "@/components/arena/player/SkillRadar";

// Hierarki My Day (learning companion):
// 1. SAPAAN (hero) → 2. AKSI HARI INI (satu CTA dominan + mentor)
// → 3. KEMAMPUAN + MOTIVASI (skill + arena + premium)
// → 4. PINTAS BELAJAR (AI BC + perjalanan) → 5. RUANG BELAJAR
// → 6. SIMULASI → 7. KARYA + KABAR KELAS
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
          <StudentHomeHero />

          <ContinueLearningCard />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <SkillRadar />
            <div className="space-y-6">
              <ArenaHomeSection />
              <PremiumValueCard />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <AIBCHomeCard />
            <LearningJourneySection />
          </div>

          <RuangBelajarSection />

          <SimulasiUjianSection />

          <RecentWorksSection />

          <SecondaryLearningInfo />
        </HomeDataProvider>
      </main>
    </div>
  );
}
