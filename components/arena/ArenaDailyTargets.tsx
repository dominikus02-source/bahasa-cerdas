import Link from "next/link";
import { CheckCircle2, ChevronRight, Flame, Target } from "lucide-react";
import { getQuestMeta, questProgressText } from "@/lib/quest-meta";

type Quest = {
  id: string;
  questType: string;
  target: number;
  progress: number;
  completed: boolean;
  rewardCoins: number;
};

export default function ArenaDailyTargets({
  quests,
  streak,
}: {
  quests: Quest[];
  streak: number;
}) {
  const completed = quests.filter((q) => q.completed).length;
  const total = quests.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const remaining = quests.filter((q) => !q.completed).slice(0, 3);

  return (
    <section className="arena-target-surface rounded-[26px] p-5 sm:p-6">
      {/* Header — streak integrated into heading */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Achieve
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
            Target hari ini
          </h2>
        </div>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-black text-orange-700 dark:bg-orange-400/15 dark:text-orange-200">
            <Flame size={14} className="text-orange-500" /> {streak} hari
          </span>
        )}
      </div>

      {/* Progress bar — the dominant element */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-emerald-800 dark:text-emerald-200">
            {completed === total
              ? "Semua misi selesai! 🎉"
              : `${remaining.length} misi tersisa`}
          </span>
          <span className="tabular-nums text-emerald-600 dark:text-emerald-300">
            {completed}/{total}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Remaining tasks — only show incomplete ones */}
      {remaining.length > 0 && (
        <div className="mt-4 space-y-2.5">
          {remaining.map((quest) => {
            const meta = getQuestMeta(quest.questType);
            const Icon = meta.Icon;
            const questPct = quest.target
              ? Math.min(100, Math.round((quest.progress / quest.target) * 100))
              : 0;
            return (
              <div
                key={quest.id}
                className="flex items-center gap-3"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.warna}`}
                >
                  <Icon size={17} className="text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                      {meta.label}
                    </p>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {questProgressText(
                        quest.progress,
                        quest.target,
                        quest.completed,
                      )}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-violet-400"
                      style={{ width: `${questPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All done message */}
      {completed === total && total > 0 && (
        <p className="mt-4 text-center text-sm font-bold text-emerald-700 dark:text-emerald-300">
          Keren! Semua target tercapai hari ini ✨
        </p>
      )}

      <Link
        href="/arena/misi"
        className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300"
      >
        Lihat semua misi <ChevronRight size={15} />
      </Link>
    </section>
  );
}
