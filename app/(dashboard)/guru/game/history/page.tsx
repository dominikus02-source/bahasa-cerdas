"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeft, ChevronRight, Clock, History, Play, Search, ArrowLeft, X,
} from "lucide-react";

interface RoomLite {
  name: string | null;
  gameType: string | null;
}

interface SessionLite {
  joinedAt: string | null;
  finishedAt: string | null;
}

interface HistoryRow {
  id: string;
  finalScore: number;
  correct: number;
  wrong: number;
  maxStreak: number;
  xpEarned: number;
  createdAt: string;
  room: RoomLite | null;
  session: SessionLite | null;
  user: {
    id: string;
    fullName: string | null;
    avatar: string | null;
  } | null;
}

interface HistoryResponse {
  studentResults: HistoryRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  games: { roomId: string | null; room: RoomLite | null }[];
}

interface SiswaRow {
  id: string;
  fullName: string | null;
}

const GAME_EMOJI: Record<string, string> = {
  "Lari Kata": "🏃",
  "Benar atau Salah": "⚖️",
  "Susun Kata": "🧩",
  "Tebak Kata": "⚡",
  "Irama Kata": "🎵",
  "Menara Cerdas": "🗼",
  KataPlay: "📚",
};

const GAME_TYPE_LABEL: Record<string, string> = {
  KUIS_BATTLE: "Gim Battle",
  TEBAK_KATA: "Tebak Kata",
  KOSAKATA_HARIAN: "Kosakata Harian",
  KATA_SERU: "Kata Seru",
  GOLD_RUSH: "Gold Rush",
  SPEED_BATTLE: "Speed Battle",
  SURVIVAL: "Survival",
  TIMED_TRIAL: "Timed Trial",
};

const resultGameLabel = (r: { room: RoomLite | null }): string =>
  r.room?.name || r.room?.gameType || "Gim";

const resultGameEmoji = (r: { room: RoomLite | null }): string =>
  GAME_EMOJI[resultGameLabel(r)] ?? "🎮";

const gameTypeKey = (r: { room: RoomLite | null }): string =>
  r.room?.gameType || "LAINNYA";

const gameTypeLabel = (k: string): string =>
  GAME_TYPE_LABEL[k] ?? k;

const formatDurasi = (s: SessionLite | null): string => {
  if (!s?.joinedAt || !s?.finishedAt) return "—";
  const ms = new Date(s.finishedAt).getTime() - new Date(s.joinedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const det = totalSec % 60;
  if (m <= 0) return `${det} detik`;
  return `${m}m ${det}d`;
};

const fullDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

export default function GuruGameHistoryPage() {
  const sp = useSearchParams();
  const defaultPage = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);

  const [data, setData] = useState<HistoryResponse | null>(null);
  const [siswa, setSiswa] = useState<SiswaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(defaultPage);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filter inputs
  const [search, setSearch] = useState("");
  const [murid, setMurid] = useState("");
  const [gameType, setGameType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<{ search?: string; murid?: string; gameType?: string; from?: string; to?: string }>({});

  const didInit = useRef(false);

  useEffect(() => {
    fetch("/api/guru/siswa")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSiswa(Array.isArray(d?.siswa) ? d.siswa as SiswaRow[] : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true;
      setApplied({});
      void load(defaultPage, {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async (targetPage: number, filters: typeof applied) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(targetPage));
      qs.set("limit", "20");
      if (!filters) filters = {};
      if (filters.search) qs.set("search", filters.search);
      if (filters.murid) qs.set("murid", filters.murid);
      if (filters.gameType) qs.set("gameType", filters.gameType);
      if (filters.from) qs.set("from", filters.from);
      if (filters.to) qs.set("to", filters.to);
      const res = await fetch(`/api/guru/game-hub?${qs.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat riwayat");
      const json = (await res.json()) as HistoryResponse;
      setData(json);
      setPage(targetPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const f = { search: search.trim(), murid, gameType, from, to };
    setApplied(f);
    setExpanded(null);
    void load(1, f);
  };

  const resetFilters = () => {
    setSearch(""); setMurid(""); setGameType(""); setFrom(""); setTo("");
    setApplied({});
    setExpanded(null);
    void load(1, {});
  };

  const hasFilters = Object.values(applied).some((v) => v && v.length > 0);

  // Unique game types for the filter dropdown
  const gameTypes = useMemo(() => {
    const set = new Map<string, string>();
    for (const g of data?.games ?? []) {
      const key = g.room?.gameType;
      if (key) set.set(key, GAME_TYPE_LABEL[key] ?? key);
    }
    return [...set.entries()];
  }, [data]);

  const totalPages = data?.totalPages ?? 1;
  const rows = data?.studentResults ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/guru/game"
            className="w-9 h-9 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg lg:text-xl font-extrabold text-slate-900 dark:text-slate-100">Aktivitas Gim Murid</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Riwayat lengkap permainan murid di kelasmu</p>
          </div>
          <span className="ml-auto text-[10px] px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold shrink-0 dark:bg-emerald-900/40 dark:text-emerald-300">
            {loading ? "…" : `${total} catatan`}
          </span>
        </div>

        {/* Filter panel */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm mb-4 dark:bg-slate-900 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <label className="lg:col-span-2 block">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Cari Nama</span>
              <div className="relative mt-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="Cari murid…"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/30 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Murid</span>
              <select
                value={murid}
                onChange={(e) => setMurid(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <option value="">Semua murid</option>
                {siswa.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName || "Tanpa nama"}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Gim</span>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
              >
                <option value="">Semua gim</option>
                {gameTypes.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Dari</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 !text-slate-400"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Sampai</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 !text-slate-400"
              />
            </label>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              <Search className="w-3.5 h-3.5" /> Terapkan
            </button>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-100 transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl p-4 mb-4 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl border border-slate-100 p-4 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 bg-slate-100 rounded dark:bg-slate-800" />
                    <div className="h-2 w-1/2 bg-slate-100 rounded dark:bg-slate-800" />
                  </div>
                  <div className="h-3 w-16 bg-slate-100 rounded dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : rows.length > 0 ? (
          <>
            {/* Result rows */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <ul className="divide-y divide-slate-50 dark:divide-slate-800">
                {rows.map((res) => (
                  <Fragment key={res.id}>
                    <li
                      className="flex items-center gap-3 px-4 py-3 hover:bg-sky-50/40 transition-colors cursor-pointer dark:hover:bg-slate-800/60"
                      onClick={() => setExpanded((cur) => (cur === res.id ? null : res.id))}
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                        {res.user?.fullName?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate dark:text-slate-100">{res.user?.fullName || "Siswa"}</p>
                        <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 dark:text-slate-500">
                          <span>{resultGameEmoji(res)}</span>
                          <span>{resultGameLabel(res)}</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span>{fullDateTime(res.createdAt)}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-700 tabular-nums dark:text-slate-200">{res.finalScore} poin</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">+{res.xpEarned} XP</p>
                      </div>
                    </li>
                    {expanded === res.id && (
                      <li className="bg-sky-50/60 px-4 py-3 dark:bg-slate-800/60">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span><b className="text-green-600 dark:text-green-400">{res.correct}</b> benar</span>
                          <span><b className="text-red-500 dark:text-red-400">{res.wrong}</b> salah</span>
                          <span><b className="text-slate-700 dark:text-slate-200">{res.maxStreak}</b> rentetan maks</span>
                          <span><b className="text-emerald-600 dark:text-emerald-400">+{res.xpEarned}</b> XP</span>
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /><b className="text-slate-700 dark:text-slate-200">{formatDurasi(res.session)}</b> durasi</span>
                          <span className="text-[10px] text-slate-400">{gameTypeLabel(gameTypeKey(res))}</span>
                        </div>
                      </li>
                    )}
                  </Fragment>
                ))}
              </ul>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Halaman {page} dari {totalPages} · {total} catatan
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => { setExpanded(null); void load(page - 1, applied); }}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => { setExpanded(null); void load(page + 1, applied); }}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-xl border border-slate-100 p-10 text-center shadow-sm dark:bg-slate-900 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3 dark:bg-slate-800">
              <Play className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {hasFilters ? "Tidak ada hasil untuk filter ini" : "Belum ada aktivitas gim murid"}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto dark:text-slate-500">
              {hasFilters
                ? "Coba ubah atau reset filter untuk melihat hasil lain."
                : "Ajak murid bermain gim bersama — hasil permainan mereka akan tercatat di sini."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors"
              >
                <X size={14} /> Reset Filter
              </button>
            )}
            {!hasFilters && (
              <Link href="/guru/game/lobby" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors">
                <Play size={14} /> Buat Ruang Baru
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}