"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { XP_SOURCE_ICONS } from "@/lib/gamification/source-labels";
import { formatId, useRelativeTime } from "./ui";
import type { XpHistoryEntryView } from "@/lib/gamification/client-types";

/** Riwayat XP — infinite scroll via cursor. */
export function XpHistoryTimeline({ limit = 20 }: { limit?: number }) {
  const [entries, setEntries] = useState<XpHistoryEntryView[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(
    async (cursor?: string) => {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(`/api/player/xp/history?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Gagal memuat riwayat XP");
        const data = await res.json();
        setEntries((prev) => (cursor ? [...prev, ...data.entries] : data.entries));
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [limit, loading]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entriesObs) => {
        if (entriesObs[0].isIntersecting && !loading && nextCursor) load(nextCursor);
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, nextCursor, loading, load]);

  if (initialLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="px-skeleton h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--px-border)] py-10 text-center">
        <Zap size={28} className="mx-auto mb-2 text-[var(--px-text-faint)]" />
        <p className="text-sm font-semibold text-[var(--px-text-dim)]">Belum ada riwayat XP</p>
        <p className="mt-1 text-xs text-[var(--px-text-faint)]">Selesaikan latihan & misi untuk mengumpulkan XP!</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {error && <p className="mb-2 text-xs text-rose-300">{error}</p>}
      {entries.map((e) => (
        <XpHistoryRow key={e.id} entry={e} />
      ))}
      <div ref={sentinelRef} className="h-4" />
      {loading && (
        <div className="py-2 text-center text-xs font-semibold text-[var(--px-text-faint)]">Memuat…</div>
      )}
      {!hasMore && entries.length > 0 && (
        <div className="py-3 text-center text-[11px] font-semibold text-[var(--px-text-faint)]">Akhir riwayat</div>
      )}
    </div>
  );
}

function XpHistoryRow({ entry }: { entry: XpHistoryEntryView }) {
  const time = useRelativeTime(entry.createdAt);
  const icon = XP_SOURCE_ICONS[entry.source] ?? "⚡";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--px-border)] bg-white dark:bg-slate-800/90/[0.04] px-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-lg">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--px-text)]">{entry.sourceLabel}</p>
        <p className="text-[11px] text-[var(--px-text-faint)]">{time}</p>
      </div>
      <span className="shrink-0 text-sm font-black text-sky-300">+{formatId(entry.amount)} XP</span>
    </div>
  );
}
