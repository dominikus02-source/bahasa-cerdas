"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, Activity, CheckCircle2, AlertTriangle, Clock,
  Save, Download, Zap, Users, RefreshCw, Loader2, TrendingUp,
  Search, AlertOctagon, Info, BrainCircuit,
} from "lucide-react";

type Range = "7d" | "30d" | "90d";

interface Overview {
  totalRequests: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgLatency: number | null;
  savedResults: number;
  exportEvents: number;
  totalTokens: number;
  estimatedCost: number;
}

interface AgentUsage {
  agentId: string;
  label: string;
  totalRequests: number;
  success: number;
  failed: number;
  avgLatency: number | null;
  savedResults: number;
}

interface ProviderUsage {
  provider: string;
  totalRequests: number;
  failed: number;
  avgLatency: number | null;
  totalTokens: number;
}

interface DailyUsage {
  date: string;
  count: number;
}

interface TopUser {
  userId: string;
  fullName: string;
  email: string;
  totalUsage: number;
  mostUsedAgent: string;
}

interface LegacyUsage {
  feature: string;
  label: string;
  totalRequests: number;
  success: number;
  failed: number;
  avgLatency: number | null;
}

interface SavedResultAnalytics {
  agentId: string;
  label: string;
  count: number;
}

interface RecentSavedResult {
  id: string;
  title: string;
  agentId: string;
  label: string;
  user: { fullName: string; email: string } | null;
  createdAt: string;
  qualityScore: number | null;
}

interface ErrorInsight {
  code: string;
  count: number;
}

interface AnalyticsData {
  overview: Overview;
  agentUsage: AgentUsage[];
  legacyUsage: LegacyUsage[];
  providerUsage: ProviderUsage[];
  dailyUsage: DailyUsage[];
  topUsers: TopUser[];
  savedResultsByAgent: SavedResultAnalytics[];
  recentSavedResults: RecentSavedResult[];
  errors: ErrorInsight[];
  notes: string[];
}

const AGENT_LABELS: Record<string, string> = {
  rpp: "RPP",
  soal: "Soal",
  ppt: "PPT",
  review: "Review",
  "bc-assistant": "BC Asst",
  eyd: "EYD",
  feedback: "Feedback",
  grading: "Nilai",
  "text-analysis": "Analisis",
};

const ERROR_LABELS: Record<string, string> = {
  PROVIDER_UNAVAILABLE: "Provider Tidak Tersedia",
  OUTPUT_VALIDATION_FAILED: "Validasi Output Gagal",
  RATE_LIMIT: "Batas Penggunaan",
  STREAM_INCOMPLETE: "Streaming Terputus",
  CANCELLED: "Dibatalkan Pengguna",
  STREAM_UNAVAILABLE: "Streaming Tidak Tersedia",
  AGENT_NOT_FOUND: "Agent Tidak Ditemukan",
  INVALID_INPUT: "Input Tidak Valid",
  EMPTY_RESPONSE: "Respons Kosong",
  UNKNOWN_ERROR: "Error Lain",
};

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: "DeepSeek",
  groq: "Groq",
  gemini: "Gemini",
  unknown: "Tidak Diketahui",
};

export default function AdminAIAnalyticsPage() {
  const [range, setRange] = useState<Range>("7d");
  const [agentFilter, setAgentFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ range });
      if (agentFilter) params.set("agentId", agentFilter);
      if (providerFilter) params.set("provider", providerFilter);
      const res = await fetch(`/api/admin/ai-analytics?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Gagal memuat data.");
      }
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, [range, agentFilter, providerFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const overview = data?.overview;
  const agentUsage = data?.agentUsage || [];
  const legacyUsage = data?.legacyUsage || [];
  const providerUsage = data?.providerUsage || [];
  const dailyUsage = data?.dailyUsage || [];
  const topUsers = data?.topUsers || [];
  const savedResultsByAgent = data?.savedResultsByAgent || [];
  const recentSavedResults = data?.recentSavedResults || [];
  const errors = data?.errors || [];
  const notes = data?.notes || [];

  const maxDailyCount = Math.max(...dailyUsage.map((d) => d.count), 1);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pantau penggunaan agent AI, performa provider, hasil tersimpan, dan kesehatan sistem.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Muat Ulang
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                range === r
                  ? "bg-red-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {r === "7d" ? "7 Hari" : r === "30d" ? "30 Hari" : "90 Hari"}
            </button>
          ))}
        </div>

        <select
          value={agentFilter}
          onChange={(e) => setAgentFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-600"
        >
          <option value="">Semua Agent</option>
          {Object.entries(AGENT_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>

        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-600"
        >
          <option value="">Semua Provider</option>
          <option value="deepseek">DeepSeek</option>
          <option value="groq">Groq</option>
          <option value="gemini">Gemini</option>
        </select>
      </div>

      {loading && !data && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p className="text-sm">Memuat data analitik...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <StatCard icon={Activity} label="Total Request" value={overview?.totalRequests ?? 0} color="blue" />
            <StatCard icon={CheckCircle2} label="Berhasil" value={overview?.successCount ?? 0} color="green" sub={`${overview?.successRate ?? 0}%`} />
            <StatCard icon={AlertTriangle} label="Gagal" value={overview?.failedCount ?? 0} color="red" />
            <StatCard icon={Clock} label="Rata Latency" value={overview?.avgLatency != null ? `${overview.avgLatency}ms` : "—"} color="slate" />
            <StatCard icon={Save} label="Tersimpan" value={overview?.savedResults ?? 0} color="violet" />
            <StatCard icon={Download} label="Export" value={overview?.exportEvents ?? 0} color="amber" />
            <StatCard icon={Zap} label="Token" value={formatNumber(overview?.totalTokens ?? 0)} color="cyan" sub={`$${overview?.estimatedCost?.toFixed(4) ?? "0"}`} />
          </div>

          {/* Agent usage */}
          <Section title="Penggunaan per Agent" icon={BrainCircuit}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="pb-2 font-medium">Agent</th>
                    <th className="pb-2 font-medium text-right">Request</th>
                    <th className="pb-2 font-medium text-right">Berhasil</th>
                    <th className="pb-2 font-medium text-right">Gagal</th>
                    <th className="pb-2 font-medium text-right">Latency</th>
                    <th className="pb-2 font-medium text-right">Tersimpan</th>
                  </tr>
                </thead>
                <tbody>
                  {agentUsage.map((a) => (
                    <tr key={a.agentId} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-2.5 font-medium text-slate-800">{a.label}</td>
                      <td className="py-2.5 text-right text-slate-600">{a.totalRequests}</td>
                      <td className="py-2.5 text-right text-emerald-600">{a.success}</td>
                      <td className="py-2.5 text-right text-red-500">{a.failed}</td>
                      <td className="py-2.5 text-right text-slate-500">{a.avgLatency != null ? `${a.avgLatency}ms` : "—"}</td>
                      <td className="py-2.5 text-right text-violet-600">{a.savedResults}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Legacy route usage */}
          {legacyUsage.length > 0 && (
            <Section title="Rute Lama (Legacy)" icon={AlertTriangle}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-100">
                      <th className="pb-2 font-medium">Rute</th>
                      <th className="pb-2 font-medium text-right">Request</th>
                      <th className="pb-2 font-medium text-right">Berhasil</th>
                      <th className="pb-2 font-medium text-right">Gagal</th>
                      <th className="pb-2 font-medium text-right">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {legacyUsage.map((l) => (
                      <tr key={l.feature} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5 font-medium text-slate-800">{l.label}</td>
                        <td className="py-2.5 text-right text-slate-600">{l.totalRequests}</td>
                        <td className="py-2.5 text-right text-emerald-600">{l.success}</td>
                        <td className="py-2.5 text-right text-red-500">{l.failed}</td>
                        <td className="py-2.5 text-right text-slate-500">{l.avgLatency != null ? `${l.avgLatency}ms` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Provider performance */}
          <Section title="Performa Provider" icon={TrendingUp}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100">
                    <th className="pb-2 font-medium">Provider</th>
                    <th className="pb-2 font-medium text-right">Request</th>
                    <th className="pb-2 font-medium text-right">Gagal</th>
                    <th className="pb-2 font-medium text-right">Latency</th>
                    <th className="pb-2 font-medium text-right">Token</th>
                  </tr>
                </thead>
                <tbody>
                  {providerUsage.map((p) => (
                    <tr key={p.provider} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-2.5 font-medium text-slate-800">{PROVIDER_LABELS[p.provider] || p.provider}</td>
                      <td className="py-2.5 text-right text-slate-600">{p.totalRequests}</td>
                      <td className="py-2.5 text-right text-red-500">{p.failed}</td>
                      <td className="py-2.5 text-right text-slate-500">{p.avgLatency != null ? `${p.avgLatency}ms` : "—"}</td>
                      <td className="py-2.5 text-right text-slate-500">{formatNumber(p.totalTokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Daily usage bar chart */}
          <Section title="Penggunaan Harian" icon={BarChart3}>
            <div className="space-y-1">
              {dailyUsage.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">Belum ada data untuk periode ini.</p>
              )}
              {dailyUsage.map((d) => (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 w-20 shrink-0">{formatDate(d.date)}</span>
                  <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all"
                      style={{ width: `${(d.count / maxDailyCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-600 w-8 text-right font-medium">{d.count}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Two-column layout for rest */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top active users */}
            <Section title="Pengguna Paling Aktif" icon={Users}>
              <div className="space-y-2">
                {topUsers.length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center">Belum ada data.</p>
                )}
                {topUsers.map((u, i) => (
                  <div key={u.userId} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] text-slate-400 w-4 font-medium">{i + 1}.</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{u.fullName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs font-medium text-slate-700">{u.totalUsage}</p>
                      <p className="text-[9px] text-slate-400">{AGENT_LABELS[u.mostUsedAgent] || u.mostUsedAgent}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Error insights */}
            <Section title="Insight Error" icon={AlertOctagon}>
              <div className="space-y-2">
                {errors.length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center">Tidak ada error.</p>
                )}
                {errors.map((e) => (
                  <div key={e.code} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-xs text-slate-700">{ERROR_LABELS[e.code] || e.code}</span>
                    <span className="text-xs font-medium text-red-500">{e.count}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* Saved result analytics */}
          <Section title="Analisis Hasil Tersimpan" icon={Save}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              {savedResultsByAgent.map((s) => (
                <div key={s.agentId} className="p-3 bg-white border border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">{s.count}</p>
                </div>
              ))}
            </div>

            {recentSavedResults.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Hasil Tersimpan Terbaru</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-100">
                        <th className="pb-2 font-medium">Judul</th>
                        <th className="pb-2 font-medium">Agent</th>
                        <th className="pb-2 font-medium">Pengguna</th>
                        <th className="pb-2 font-medium">Tanggal</th>
                        <th className="pb-2 font-medium text-right">Skor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSavedResults.map((r) => (
                        <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="py-2 text-slate-800 max-w-[200px] truncate">{r.title}</td>
                          <td className="py-2 text-slate-500">{r.label}</td>
                          <td className="py-2 text-slate-500 max-w-[150px] truncate">{r.user?.fullName || "—"}</td>
                          <td className="py-2 text-slate-400">{formatDateTime(r.createdAt)}</td>
                          <td className="py-2 text-right font-medium">
                            {r.qualityScore != null
                              ? <span className={r.qualityScore >= 80 ? "text-emerald-600" : r.qualityScore >= 50 ? "text-amber-600" : "text-red-500"}>{r.qualityScore}</span>
                              : "—"
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Section>

          {/* System health notes */}
          <Section title="Catatan Kesehatan Sistem" icon={Info}>
            <ul className="space-y-1">
              {notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                  <span className="w-1 h-1 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                  {note}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, color, sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-green-600",
    red: "from-red-400 to-red-600",
    slate: "from-slate-400 to-slate-600",
    violet: "from-violet-400 to-violet-600",
    amber: "from-amber-400 to-orange-500",
    cyan: "from-cyan-400 to-teal-500",
  };
  const gradient = colorMap[color] || "from-slate-400 to-slate-600";
  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-[9px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({
  title, icon: Icon, children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="p-5 bg-white rounded-2xl border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}jt`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}rb`;
  return String(n);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
