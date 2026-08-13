"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gamepad2, Sparkles, FileText, Route, BookOpen, ClipboardList, ScrollText, BrainCircuit, Loader2, RefreshCw, Users, Zap } from "lucide-react";

interface ChartRow {
  day: string;
  [key: string]: string | number;
}

interface FeatureUsage {
  key: string;
  label: string;
  totalUsers: number;
  totalEvents: number;
  daily: { day: string; users: number; events: number }[];
}

interface ApiResponse {
  success: boolean;
  days: number;
  generatedAt: string;
  features: FeatureUsage[];
}

const FEATURE_META: Record<string, { icon: React.ElementType; color: string; bar: string }> = {
  game: { icon: Gamepad2, color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40", bar: "#f97316" },
  karya: { icon: Sparkles, color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40", bar: "#8b5cf6" },
  artikel: { icon: FileText, color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40", bar: "#ef4444" },
  jalurCerdas: { icon: Route, color: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40", bar: "#0ea5e9" },
  bukuPanduan: { icon: BookOpen, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40", bar: "#10b981" },
  penugasan: { icon: ClipboardList, color: "text-teal-600 bg-teal-50", bar: "#14b8a6" },
  ukbiTka: { icon: ScrollText, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40", bar: "#f59e0b" },
  aiTools: { icon: BrainCircuit, color: "text-indigo-600 bg-indigo-50", bar: "#6366f1" },
};

const RANGE_OPTIONS = [
  { value: 7, label: "7 hari" },
  { value: 14, label: "14 hari" },
  { value: 30, label: "30 hari" },
];

const dayLabel = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
};

export default function AdminFeatureUsagePage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (range: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/feature-usage?days=${range}`, { cache: "no-store" });
      if (res.status === 403) {
        setError("Akses ditolak — khusus Founder.");
        return;
      }
      const json = (await res.json()) as ApiResponse;
      if (!json.success) throw new Error("bad response");
      setData(json);
      setError(null);
    } catch {
      setError("Gagal memuat data pemakaian fitur.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days); }, [load, days]);

  const chart = useMemo(() => {
    if (!data) return null;
    const keys = data.features.map((f) => f.key);
    const allDays = new Set<string>();
    data.features.forEach((f) => f.daily.forEach((d) => allDays.add(d.day)));
    const sorted = Array.from(allDays).sort();
    return {
      keys,
      rows: sorted.map((day) => {
        const row: ChartRow = { day };
        data.features.forEach((f) => {
          row[f.key] = f.daily.find((d) => d.day === day)?.users ?? 0;
        });
        return row;
      }),
    };
  }, [data]);

  const maxUsers = useMemo(() => {
    if (!chart) return 1;
    return Math.max(1, ...chart.rows.map((r) => (chart.keys.reduce((s, k) => s + (Number(r[k]) || 0), 0))));
  }, [chart]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Pemakaian Fitur</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Fitur paling dipakai user setiap harinya (distinct user & jumlah aksi)</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800/70 rounded-xl p-1">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setDays(r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  days === r.value ? "bg-white dark:bg-slate-800/90 shadow-sm text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={() => load(days)} className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-800/50">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-slate-300" /></div>
      ) : !data ? null : (
        <>
          {data.generatedAt && (
            <p className="text-xs text-slate-400">
              Diperbarui {new Date(data.generatedAt).toLocaleTimeString("id-ID")} · zona waktu WIB
            </p>
          )}

          {/* Ranking fitur */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.features.map((f, idx) => {
              const meta = FEATURE_META[f.key] || FEATURE_META.game;
              const Icon = meta.icon;
              return (
                <div key={f.key} className={`bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 ${idx === 0 ? "ring-2 ring-amber-200" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${meta.color}`}>
                      <Icon size={17} />
                    </div>
                    {idx === 0 ? (
                      <span className="text-[9px] px-2 py-0.5 bg-amber-100 text-amber-700 dark:text-amber-300 rounded-full font-bold">TERPALING DIPAKAI</span>
                    ) : (
                      <span className="text-[9px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 rounded-full font-bold">#{idx + 1}</span>
                    )}
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-3">{f.totalUsers.toLocaleString("id-ID")} <span className="text-xs font-medium text-slate-400">user</span></p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 truncate" title={f.label}>{f.label}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{f.totalEvents.toLocaleString("id-ID")} aksi dalam {data.days} hari</p>
                </div>
              );
            })}
          </div>

          {/* Grafik harian stacked (distinct user per fitur per hari) */}
          {chart && chart.rows.length > 0 && (
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2 text-sm">
                <Users size={15} className="text-slate-400" /> User unik per fitur per hari
              </h2>
              <p className="text-xs text-slate-400 mb-4">Distinct user yang beraksi di tiap fitur, di-stack per hari</p>
              <div className="flex h-52 items-end gap-1 overflow-x-auto pb-1">
                {chart.rows.map((row) => {
                  const dayTotal = chart.keys.reduce((s, k) => s + (Number(row[k]) || 0), 0);
                  return (
                    <div key={row.day} className="flex-1 min-w-[36px] flex flex-col items-center gap-1">
                      <span className="text-[9px] text-slate-400">{dayTotal || ""}</span>
                      <div className="w-full flex flex-col justify-end rounded-md overflow-hidden bg-slate-50 dark:bg-slate-800/50" style={{ height: `${(dayTotal / maxUsers) * 100}%` }}>
                        {chart.keys.map((k) => {
                          const v = Number(row[k]) || 0;
                          if (v === 0) return null;
                          const meta = FEATURE_META[k] || FEATURE_META.game;
                          return (
                            <div
                              key={k}
                              className="w-full transition-all"
                              style={{ backgroundColor: meta.bar, height: `${(v / dayTotal) * 100}%` }}
                              title={`${k}: ${v} user`}
                            />
                          );
                        })}
                      </div>
                      <span className="text-[9px] text-slate-400 whitespace-nowrap">{dayLabel(row.day)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                {data.features.map((f) => {
                  const meta = FEATURE_META[f.key] || FEATURE_META.game;
                  const Icon = meta.icon;
                  return (
                    <span key={f.key} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: meta.bar }} />
                      <Icon size={11} className="text-slate-400" /> {f.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabel detail per hari */}
          {chart && chart.rows.length > 0 && (
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Zap size={15} className="text-amber-500 dark:text-amber-400" /> Detail per hari (distinct user)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
                      <th className="pb-3 pl-4 pt-2 font-medium">Tanggal</th>
                      {data.features.map((f) => (
                        <th key={f.key} className="pb-3 pt-2 font-medium whitespace-nowrap">{f.label}</th>
                      ))}
                      <th className="pb-3 pr-4 pt-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.rows.slice().reverse().map((row) => {
                      const total = chart.keys.reduce((s, k) => s + (Number(row[k]) || 0), 0);
                      return (
                        <tr key={row.day} className="border-b border-slate-50 hover:bg-slate-50 dark:bg-slate-800/50">
                          <td className="py-2.5 pl-4 text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap">{dayLabel(row.day)}</td>
                          {chart.keys.map((k) => (
                            <td key={k} className="py-2.5 text-slate-600 dark:text-slate-300 text-center">{Number(row[k]) || 0}</td>
                          ))}
                          <td className="py-2.5 pr-4 text-right font-semibold text-slate-900 dark:text-slate-100">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
