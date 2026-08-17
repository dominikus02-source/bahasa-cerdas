"use client";

import { useState } from "react";
import { Coins, Zap } from "lucide-react";
import { XpHistoryTimeline } from "./xp-history-timeline";
import { CoinHistoryTimeline } from "./coin-history-timeline";

export function HistoryTabs({ initialTab = "xp" }: { initialTab?: "xp" | "koin" }) {
  const [tab, setTab] = useState<"xp" | "koin">(initialTab);

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-2xl border border-[var(--px-border)] bg-[var(--px-glass)] p-1">
        <button
          onClick={() => setTab("xp")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold transition ${tab === "xp" ? "px-btn-royal" : "text-[var(--px-text-dim)]"}`}
        >
          <Zap size={15} /> XP
        </button>
        <button
          onClick={() => setTab("koin")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold transition ${tab === "koin" ? "px-btn-royal" : "text-[var(--px-text-dim)]"}`}
        >
          <Coins size={15} /> Koin
        </button>
      </div>

      {tab === "xp" ? <XpHistoryTimeline /> : <CoinHistoryTimeline />}
    </div>
  );
}
