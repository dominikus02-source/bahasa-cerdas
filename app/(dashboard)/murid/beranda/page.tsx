"use client";

import { useEffect } from "react";
import "@/app/arena/player-theme.css";
import { HomeDataProvider } from "@/components/student-home/home-data";
import { StudentHomeHero } from "@/components/student-home/StudentHomeHero";
import { DailyMissionCard } from "@/components/student-home/DailyMissionCard";
import { DailyActionCard } from "@/components/student-home/DailyActionCard";
import { AIBCHomeCard } from "@/components/student-home/AIBCHomeCard";
import { RuangBelajarSection } from "@/components/student-home/RuangBelajarSection";
import { SimulasiUjianSection } from "@/components/student-home/SimulasiUjianSection";
import { RecentWorksSection } from "@/components/student-home/RecentWorksSection";

// Beranda ringkas: mulai belajar → Arena/AI → kelas dan tugas → ujian → karya.
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
  return (
    <>
      <StudentHomeHero />
      <DailyActionCard />

      <AIBCHomeCard />

      <RuangBelajarSection />
      <DailyMissionCard />
      <SimulasiUjianSection />
      <RecentWorksSection />
    </>
  );
}
