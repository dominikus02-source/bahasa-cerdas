"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Coins } from "lucide-react";
import { formatId, useRelativeTime } from "./ui";
import type { CoinHistoryEntryView } from "@/lib/gamification/client-types";

type Filter = "all" | "in" | "out";

const FILTER_LABELS: Record<Filter, string> = {
  all: "Semua",
  in: "Masuk",
  out: "Keluar",
};

/** Riwayat koin — filter masuk/keluar + pencarian + infinite scroll. */
export function CoinHistoryTimeline({ limit = 20 }: { limit?: number }) {
  const [entries, setEntries] = useState<CoinHistoryEntryView[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<{ masuk: number; keluar: number; net: number } | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (cursor?: string, f = filter, q = search) => {
      if (loading) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: String(limit), type: f });
        if (q.trim()) params.set("search", q.trim());
        if (cursor) params.set("cursor", cursor);
        const res = await fetch(`/api/player/coin/history?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Gagal memuat riwayat koin");
        const data = await res.json();
        if (!cursor) setSummary(data.summary);
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
    [limit, loading, filter, search]
  );

  // Reset saat filter/ganti.
  useEffect(() => {
    setEntries([]);
    setNextCursor(null);
    setInitialLoading(true);
    load(undefined, filter, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Debounce pencarian.
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setEntries([]);
      setNextCursor(null);
      setInitialLoading(true);
      load(undefined, filter, search);
    }, 350);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(
      (entriesObs) => {
        if (entriesObs[0].isIntersecting && !loading && nextCursor) load(nextCursor, filter, search);
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, nextCursor, loading, load, filter, search]);

  if (initialLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="px-skeleton h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {summary && (
        <div className="mb-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-emerald-500/10 p-2 text-center">
            <p className="text-[10px] font-bold uppercase text-emerald-300">Masuk</p>
            <p className="text-sm font-black text-emerald-300">+{formatId(summary.masuk)}</p>
          </div>
          <div className="rounded-xl bg-rose-500/10 p-2 text-center">
            <p className="text-[10px] font-bold uppercase text-rose-300">Keluar</p>
            <p className="text-sm font-black text-rose-300">{formatId(summary.keluar)}</p>
          </div>
          <div className="rounded-xl bg-[var(--px-gold)]/10 p-2 text-center">
            <p className="text-[10px] font-bold uppercase text-[var(--px-gold)]">Total</p>
            <p className="text-sm font-black text-[var(--px-gold)]">{formatId(summary.net)}</p>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {(["all", "in", "out"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-[10px] font-bold transition ${filter === f ? "px-btn-royal" : "px-btn-ghost"}`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari…"
          className="w-28 rounded-full border border-[var(--px-border)] bg-black/25 px-3 py-1.5 text-xs font-semibold text-white placeholder:text-[var(--px-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--px-royal)]"
        />
      </div>

      {error && <p className="mb-2 text-xs text-rose-300">{error}</p>}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--px-border)] py-10 text-center">
          <Coins size={28} className="mx-auto mb-2 text-[var(--px-text-faint)]" />
          <p className="text-sm font-semibold text-[var(--px-text-dim)]">Belum ada transaksi koin</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((e) => (
            <CoinHistoryRow key={e.id} entry={e} />
          ))}
          <div ref={sentinelRef} className="h-4" />
          {loading && <div className="py-2 text-center text-xs font-semibold text-[var(--px-text-faint)]">Memuat…</div>}
          {!hasMore && entries.length > 0 && (
            <div className="py-3 text-center text-[11px] font-semibold text-[var(--px-text-faint)]">Akhir riwayat</div>
          )}
        </div>
      )}
    </div>
  );
}

function CoinHistoryRow({ entry }: { entry: CoinHistoryEntryView }) {
  const time = useRelativeTime(entry.createdAt);
  const isIn = entry.amount > 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--px-border)] bg-white/[0.04] px-3 py-2.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${isIn ? "bg-[var(--px-gold)]/10" : "bg-rose-500/10"}`}>
        {isIn ? "🪙" : "💸"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[var(--px-text)]">{entry.reason}</p>
        <p className="text-[11px] text-[var(--px-text-faint)]">{time}</p>
      </div>
      <span className={`shrink-0 text-sm font-black ${isIn ? "text-[var(--px-gold)]" : "text-rose-300"}`}>
        {isIn ? "+" : ""}
        {formatId(entry.amount)}
      </span>
    </div>
  );
}
