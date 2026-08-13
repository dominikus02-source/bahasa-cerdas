"use client";

import Link from "next/link";
import {
  Trophy, Flame, Coins, ArrowUp, ArrowDown, Users, Crown,
  Gamepad2, BookOpen, ListOrdered,
} from "lucide-react";
import type { WeeklyCompetitionPayload } from "@/lib/gamification/motivation";
import WeeklyCountdown from "./WeeklyCountdown";

const MEDALS = ["🥇", "🥈", "🥉"];

function initials(name: string) {
  return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function nameOf(r: { nickname?: string | null; name: string }) {
  return r.nickname || r.name;
}

/**
 * Hero "Kompetisi Minggu Ini" — anti-dead leaderboard: top 3, posisi saya,
 * 1 di atas + 1 di bawah, total peserta, gap XP, countdown WIB, transparansi
 * sumber XP, dan preview Hall of Fame.
 */
export default function CompetitionHero({ payload }: { payload: WeeklyCompetitionPayload }) {
  const { my, above, below, top, groups, hallOfFame } = payload;
  const activeGroups = groups.groups.filter((g) => g.xp > 0);

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white px-4 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-violet-200 font-semibold flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Kompetisi Minggu Ini
            </p>
            <p className="text-lg font-extrabold mt-0.5">
              {payload.weekLabel} · Minggu ke-{payload.weekInSeason} dari 4
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-violet-200 font-semibold">Berakhir dalam</p>
            <p className="font-extrabold text-sm">
              <WeeklyCountdown endsAt={payload.periodEndsAt} baseline={payload.now} />
            </p>
            <p className="text-[11px] text-violet-300">Reset Senin 00.00 WIB</p>
          </div>
        </div>
      </div>

      {/* My standing */}
      <div className="mx-4 mt-4 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-white/20 dark:bg-slate-900/20 flex items-center justify-center text-lg font-extrabold border-2 border-white/30 shrink-0">
          {my ? `#${my.rank}` : "—"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Peringkatmu {my ? `#${my.rank}` : "—"}</p>
          <p className="text-xs text-violet-200 mt-0.5 leading-snug">
            {my ? my.statusMessage : "Kompetisi ini untuk murid."}
          </p>
          {above && my && my.rank > 1 && (
            <p className="text-xs text-amber-300 font-semibold mt-1 flex items-center gap-1">
              <ArrowUp className="w-3.5 h-3.5" />
              Naik {payload.gapToNext.toLocaleString("id-ID")} XP untuk #{(above.rank)}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-extrabold text-lg">{my?.weeklyXp.toLocaleString() ?? 0}</p>
          <p className="text-[11px] text-violet-200">XP minggu ini</p>
        </div>
      </div>

      {/* Podium top 3 */}
      {top.length > 0 && (
        <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
          {[1, 0, 2].map((idx) => {
            const e = top[idx];
            if (!e) return <div key={idx} />;
            const isFirst = idx === 0;
            return (
              <div
                key={e.userId}
                className={`rounded-xl border p-3 text-center ${isFirst ? "bg-amber-50 border-amber-200" : "bg-gray-50 dark:bg-slate-800/60 border-gray-100 dark:border-slate-800"}`}
              >
                <p className="text-xl">{MEDALS[idx]}</p>
                <p className="font-bold text-sm text-gray-900 dark:text-slate-100 truncate mt-1">{nameOf(e)}</p>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">{e.score.toLocaleString("id-ID")} XP</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Above / Below */}
      {(above || below) && (
        <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
          {above && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 p-2.5 flex items-center gap-2">
              <ArrowUp className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold truncate">#{above.rank} {nameOf(above)}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{above.weeklyXp.toLocaleString("id-ID")} XP</p>
              </div>
            </div>
          )}
          {below && (
            <div className="rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900 p-2.5 flex items-center gap-2">
              <ArrowDown className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-orange-700 dark:text-orange-300 font-semibold truncate">#{below.rank} {nameOf(below)}</p>
                <p className="text-[10px] text-orange-600 dark:text-orange-400">{below.weeklyXp.toLocaleString("id-ID")} XP</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Participants */}
      <div className="mx-4 mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
        <Users className="w-4 h-4 text-violet-500 dark:text-violet-400" />
        <span>
          <b className="text-gray-900 dark:text-slate-100">{payload.totalParticipants.toLocaleString("id-ID")}</b> murid bersaing minggu ini
        </span>
        <span className="mx-1 text-gray-300">•</span>
        <span>
          Season berakhir <b className="text-gray-900 dark:text-slate-100"><WeeklyCountdown endsAt={payload.seasonEndsAt} baseline={payload.now} /></b>
        </span>
      </div>

      {/* XP transparency */}
      {activeGroups.length > 0 && (
        <div className="mx-4 mt-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 p-3">
          <p className="text-xs font-bold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
            <ListOrdered className="w-4 h-4 text-violet-500 dark:text-violet-400" /> Dari mana XP-mu minggu ini?
          </p>
          <div className="space-y-2">
            {activeGroups.map((g) => (
              <div key={g.key} className="flex items-center gap-2">
                <span className="w-5 text-center shrink-0">{g.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-[11px] text-gray-500 dark:text-slate-400 mb-0.5">
                    <span className="font-semibold text-gray-700 dark:text-slate-300">{g.label}</span>
                    <span>{g.xp.toLocaleString("id-ID")} XP · {g.share}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${g.share}%`,
                        background:
                          g.key === "BELAJAR"
                            ? "linear-gradient(90deg,#34d399,#10b981)"
                            : g.key === "BERMAIN"
                              ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                              : g.key === "BERKARYA"
                                ? "linear-gradient(90deg,#f472b6,#ec4899)"
                                : "linear-gradient(90deg,#a78bfa,#8b5cf6)",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hall of Fame preview */}
      {hallOfFame.length > 0 && (
        <div className="mx-4 mt-4 rounded-xl border border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40/50 p-3">
          <p className="text-xs font-bold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Hall of Fame
          </p>
          <div className="space-y-1.5">
            {hallOfFame.slice(0, 3).map((h) => (
              <p key={`${h.periodType}-${h.periodKey}-${h.rank}`} className="text-[11px] text-gray-600 dark:text-slate-300 flex items-center gap-1.5">
                <span className="text-gray-400 font-semibold shrink-0">{h.periodLabel}</span>
                <span className="shrink-0">{MEDALS[h.rank - 1] ?? "🏅"}</span>
                <span className="font-semibold text-gray-900 dark:text-slate-100 truncate">{h.name}</span>
                <span className="text-gray-500 dark:text-slate-400 shrink-0">{h.score.toLocaleString("id-ID")} XP</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-center gap-4 px-4 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 bg-gray-50/50 dark:bg-slate-800/50 flex-wrap">
        <span className="text-xs font-bold text-gray-600 dark:text-slate-300 flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" /> Naikkan peringkatmu!
        </span>
        <Link href="/arena/game" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 transition-colors">
          <Gamepad2 className="w-3.5 h-3.5" /> Main Game
        </Link>
        <Link href="/arena/jalur-cerdas" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 transition-colors">
          <BookOpen className="w-3.5 h-3.5" /> Jalur Cerdas
        </Link>
        <Link href="/arena/league" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 transition-colors">
          <Coins className="w-3.5 h-3.5" /> Lihat Papan
        </Link>
      </div>
    </div>
  );
}
