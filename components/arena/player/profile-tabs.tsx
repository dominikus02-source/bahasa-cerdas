"use client";

import { useState } from "react";
import { Award, Target, Trophy } from "lucide-react";
import { BadgeGrid } from "./badge-grid";
import { AchievementGrid } from "./achievement-grid";
import { usePlayer } from "./player-context";
import { PlayerCard } from "@/components/gamification/PlayerCard";

type Tab = "ringkasan" | "badge" | "pencapaian";

export function ProfileTabs() {
  const { profile: response } = usePlayer();
  const profile = response?.profile ?? null;
  const [tab, setTab] = useState<Tab>("ringkasan");

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-2xl border border-[var(--px-border)] bg-[var(--px-glass)] p-1">
        <TabButton active={tab === "ringkasan"} onClick={() => setTab("ringkasan")} icon={<Trophy size={14} />} label="Ringkasan" />
        <TabButton active={tab === "badge"} onClick={() => setTab("badge")} icon={<Award size={14} />} label="Lencana" />
        <TabButton active={tab === "pencapaian"} onClick={() => setTab("pencapaian")} icon={<Target size={14} />} label="Pencapaian" />
      </div>

      {tab === "ringkasan" && (
        <div className="space-y-4">
          {profile && (
            <PlayerCard
              profile={profile}
              badges={response?.summary.badges}
              achievements={response?.summary.achievements}
            />
          )}
          <BadgeGrid limit={9} />
          <AchievementGrid limit={5} />
        </div>
      )}
      {tab === "badge" && <BadgeGrid />}
      {tab === "pencapaian" && <AchievementGrid />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${active ? "px-btn-royal" : "text-[var(--px-text-dim)]"}`}
    >
      {icon} {label}
    </button>
  );
}
