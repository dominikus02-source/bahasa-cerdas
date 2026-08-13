"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Sankey,
  Legend,
} from "recharts";
import {
  ArrowDown,
  ArrowUp,
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Coins,
  Database,
  Filter,
  Flame,
  Gamepad2,
  Heart,
  Info,
  Layers,
  Medal,
  PenLine,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { RankIcon } from "@/components/gamification/RankIcon";
import { RANK_META } from "@/lib/gamification/ranks";

// ────────────────────────────────────────────────────────────────────
// TYPES (selaras dengan /api/admin/analytics/dashboard)
// ────────────────────────────────────────────────────────────────────

interface FunnelStage {
  stage: string;
  label: string;
  users: number;
  conversion: number;
  change: number | null;
}
interface Dropoff {
  from: string;
  to: string;
  drop: number;
}
interface Retention {
  dau: number;
  wau: number;
  mau: number;
  stickiness: number;
  retentionD1: number;
  retentionD7: number;
  retentionD30: number;
  avgStreak: number;
  maxStreak: number;
  avgActiveDays: number;
  activeUsers90d: number;
}
interface Engagement {
  avgSessionsPerDay: number;
  totalActions: number;
  xpEarned: number;
  xpTransactions: number;
  questsCompleted: number;
  badgesAwarded: number;
  achievementsCompleted: number;
  rankUps: number;
  levelUps: number;
  gamesPlayed: number;
  jalurCompleted: number;
  karyaCreated: number;
  ukbiCompleted: number;
}
interface HeatCell {
  dow: number;
  hour: number;
  users: number;
}
interface CohortRow {
  week: string;
  users: number;
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}
interface RankDist {
  rank: string;
  users: number;
  promotedThisWeek: number;
}
interface SkillRow {
  skill: string;
  avgLevel: number;
  users: number;
}
interface ContentHealth {
  karyaToday: number;
  karyaWeek: number;
  karyaMonth: number;
  karyaTotal: number;
  artikel: number;
  comments: number;
  likes: number;
  views: number;
  topTheme: string | null;
  themes: { type: string; count: number }[];
}
interface TopGame {
  source: string;
  label: string;
  players: number;
  totalXp: number;
  avgXp: number;
  repeatRate: number;
}
interface AiGuru {
  activeGurus: number;
  totalPrompts: number;
  totalTokens: number;
  rpp: number;
  soal: number;
  materi: number;
  review: number;
  eyd: number;
  analisis: number;
  asisten: number;
  download: number;
}
interface Journey {
  journey: string[];
  count: number;
}
interface Insight {
  tone: "good" | "bad" | "neutral";
  text: string;
}

interface AnalyticsData {
  success: boolean;
  generatedAt: string;
  range: { days: number; since: string; until: string };
  filterApplied: boolean;
  funnel: FunnelStage[];
  dropoff: Dropoff[];
  retention: Retention;
  engagement: Engagement;
  heatmap: HeatCell[];
  cohort: CohortRow[];
  xpDist: { bucket: string; users: number }[];
  rankDist: RankDist[];
  skills: SkillRow[];
  content: ContentHealth;
  topGames: TopGame[];
  aiGuru: AiGuru;
  topJourneys: Journey[];
  insights: Insight[];
}

// ────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────

const RANGE_PRESETS = [
  { value: "1", label: "Hari Ini" },
  { value: "7", label: "7 Hari" },
  { value: "14", label: "14 Hari" },
  { value: "30", label: "30 Hari" },
  { value: "90", label: "90 Hari" },
  { value: "semester", label: "Semester" },
  { value: "custom", label: "Custom" },
];

const fmt = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1)}rb` : n.toLocaleString("id-ID"));

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null || value === 0)
    return <span className="text-[11px] font-semibold text-slate-400">—</span>;
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
        up ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
      }`}
    >
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.abs(value)}%
    </span>
  );
}

const STAGE_COLORS: Record<string, string> = {
  login: "#64748b",
  arena: "#8b5cf6",
  jalur: "#6366f1",
  karya: "#ec4899",
  ukbi: "#f59e0b",
  rankUp: "#10b981",
  kembali: "#3b82f6",
};

const SKILL_LABELS: Record<string, string> = {
  READING: "Membaca",
  WRITING: "Menulis",
  LISTENING: "Mendengar",
  SPEAKING: "Berbicara",
  GRAMMAR: "Tata Bahasa",
  VOCABULARY: "Kosakata",
  LITERATURE: "Sastra",
};

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function SectionCard({
  id,
  title,
  subtitle,
  icon,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  color = "text-slate-900 dark:text-slate-100",
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        {icon && <span className="text-slate-300">{icon}</span>}
      </div>
      <p className={`text-2xl font-extrabold mt-1.5 ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// PAGE
// ────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [role, setRole] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [teacher, setTeacher] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ range });
    if (range === "custom") {
      if (customStart) params.set("start", customStart);
      if (customEnd) params.set("end", customEnd);
    }
    if (role) params.set("role", role);
    if (province.trim()) params.set("province", province.trim());
    if (city.trim()) params.set("city", city.trim());
    if (school.trim()) params.set("school", school.trim());
    if (grade.trim()) params.set("grade", grade.trim());
    if (teacher.trim()) params.set("teacher", teacher.trim());
    try {
      const res = await fetch(`/api/admin/analytics/dashboard?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat data");
      setData(json);
    } catch (e: any) {
      setError(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [range, customStart, customEnd, role, province, city, school, grade, teacher]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sankey data dari funnel ──────────────────────────────────────
  const sankey = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    const nodes = data.funnel.map((f) => ({ name: f.label }));
    const links = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({
        source: i,
        target: i + 1,
        value: Math.max(0, data.funnel[i + 1].users),
      });
    }
    return { nodes, links };
  }, [data]);

  const heatmapMax = useMemo(
    () => Math.max(1, ...(data?.heatmap.map((h) => h.users) ?? [1])),
    [data]
  );

  const heatRows = useMemo(() => {
    const rows: { dow: number; hours: (HeatCell | undefined)[] }[] = [];
    for (let d = 1; d <= 7; d++) rows.push({ dow: d, hours: Array(24).fill(undefined) });
    for (const h of data?.heatmap ?? []) {
      const row = rows.find((r) => r.dow === ((h.dow + 6) % 7) + 1);
      if (row) row.hours[h.hour] = h;
    }
    return rows;
  }, [data]);

  const funnelMax = useMemo(
    () => Math.max(1, ...(data?.funnel.map((f) => f.users) ?? [1])),
    [data]
  );

  const totalRankUsers = useMemo(
    () => (data?.rankDist ?? []).reduce((s, r) => s + r.users, 0),
    [data]
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white flex items-center justify-center">
              <BarChart3 size={20} />
            </span>
            Learning Analytics
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Perjalanan murid: Login → Bermain → Belajar → Berkarya → UKBI → Retensi.
            {data && (
              <span className="text-slate-400">
                {" "}
                · diperbarui {new Date(data.generatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-all"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          {loading ? "Memuat..." : "Muat Ulang"}
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
            <CalendarDays size={13} /> Rentang
          </span>
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setRange(p.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                range === p.value ? "bg-violet-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
          {range === "custom" && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
              />
              <span className="text-xs text-slate-400">s.d.</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
              />
            </div>
          )}
          <button
            onClick={load}
            className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 hover:bg-violet-100 transition-all"
          >
            <Filter size={13} /> Terapkan
          </button>
        </div>

        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 transition-colors"
        >
          <Filter size={13} />
          Filter lanjutan: Sekolah / Provinsi / Kabupaten / Kelas / Guru / Role
          <span className="text-slate-300">{filtersOpen ? "▲" : "▼"}</span>
        </button>

        {filtersOpen && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <FilterInput label="Role" value={role} onChange={setRole} placeholder="MURID / GURU" />
            <FilterInput label="Provinsi" value={province} onChange={setProvince} placeholder="mis. Jawa Timur" />
            <FilterInput label="Kabupaten/Kota" value={city} onChange={setCity} placeholder="mis. Surabaya" />
            <FilterInput label="Sekolah" value={school} onChange={setSchool} placeholder="Nama sekolah" />
            <FilterInput label="Kelas" value={grade} onChange={setGrade} placeholder="mis. VIII" />
            <FilterInput label="Guru (User ID)" value={teacher} onChange={setTeacher} placeholder="ID guru" />
          </div>
        )}
        {data?.filterApplied && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            Filter aktif diterapkan pada semua angka.
          </p>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-slate-100 dark:bg-slate-800/70 rounded-2xl" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* ── SECTION 1: LEARNING FUNNEL ─────────────────────────── */}
          <SectionCard
            id="funnel"
            title="Learning Funnel"
            subtitle={`Perjalanan murid dari Login hingga kembali besok — ${data.range.days} hari terakhir. User unik per tahap.`}
            icon={<Layers size={18} />}
          >
            <div className="space-y-1">
              {data.funnel.map((f, i) => (
                <div key={f.stage}>
                  <div className="flex items-center gap-3 py-2.5">
                    <div className="w-28 shrink-0 text-[11px] font-extrabold tracking-wide text-slate-500 dark:text-slate-400">
                      {f.label}
                    </div>
                    <div className="flex-1">
                      <div className="h-9 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/50 flex items-center relative">
                        <div
                          className="h-full rounded-lg transition-all"
                          style={{
                            width: `${Math.max(3, Math.round((f.users / funnelMax) * 100))}%`,
                            background: `linear-gradient(90deg, ${STAGE_COLORS[f.stage]}cc, ${STAGE_COLORS[f.stage]})`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-3">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                            {fmt(f.users)} <span className="text-[10px] font-semibold text-slate-400">User</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{f.conversion}%</span>
                            <ChangeBadge value={f.change} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {i < data.funnel.length - 1 && (
                    <div className="ml-16 flex items-center gap-2 text-slate-300">
                      <div className="w-px h-3 bg-slate-200" />
                      <ArrowDown size={12} className="text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── SECTION 2: DROP OFF ────────────────────────────────── */}
          <SectionCard
            id="dropoff"
            title="Drop Off Analysis"
            subtitle="Di mana murid paling banyak berhenti antar tahap."
            icon={<TrendingDown size={18} />}
          >
            <div className="space-y-4">
              {data.dropoff.map((d) => {
                const naik = d.drop < 0;
                const stabil = d.drop === 0;
                const pct = Math.min(100, Math.abs(d.drop));
                const tone = naik || stabil ? "text-emerald-600 dark:text-emerald-400" : d.drop >= 50 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400";
                const bar =
                  naik || stabil
                    ? "linear-gradient(90deg,#34d399,#10b981)"
                    : d.drop >= 50
                    ? "linear-gradient(90deg,#f87171,#dc2626)"
                    : "linear-gradient(90deg,#fbbf24,#f59e0b)";
                return (
                  <div key={`${d.from}-${d.to}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {d.from} → {d.to}
                      </span>
                      <span className={`text-xs font-extrabold ${tone}`}>
                        {naik
                          ? `naik ${pct}%`
                          : stabil
                          ? "stabil"
                          : `drop ${d.drop}%`}
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800/70 overflow-hidden">
                      {d.drop !== 0 && (
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: bar }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* ── SECTION 3: RETENTION ───────────────────────────────── */}
          <SectionCard
            id="retention"
            title="Retention"
            subtitle="DAU/WAU/MAU, stickiness, dan retensi kohor."
            icon={<Users size={18} />}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="DAU" value={fmt(data.retention.dau)} sub="User aktif hari ini" color="text-violet-600 dark:text-violet-400" />
              <StatCard label="WAU" value={fmt(data.retention.wau)} sub="7 hari terakhir" color="text-indigo-600" />
              <StatCard label="MAU" value={fmt(data.retention.mau)} sub="30 hari terakhir" color="text-blue-600 dark:text-blue-400" />
              <StatCard
                label="Stickiness"
                value={`${data.retention.stickiness}%`}
                sub="DAU / MAU"
                color={data.retention.stickiness >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
              <StatCard label="Retensi D1" value={`${data.retention.retentionD1}%`} sub="Kembali hari berikutnya" />
              <StatCard
                label="Retensi D7"
                value={`${data.retention.retentionD7}%`}
                sub="Kembali hari ke-7"
                color={data.retention.retentionD7 >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}
              />
              <StatCard label="Retensi D30" value={`${data.retention.retentionD30}%`} sub="Bertahan 30 hari" />
              <StatCard label="Streak rata-rata" value={data.retention.avgStreak} sub={`Terbaik ${data.retention.maxStreak} hari`} />
              <StatCard
                label="Hari aktif (rata²)"
                value={data.retention.avgActiveDays}
                sub={`${fmt(data.retention.activeUsers90d)} user aktif 90 hari`}
              />
            </div>
          </SectionCard>

          {/* ── SECTION 4: ENGAGEMENT ──────────────────────────────── */}
          <SectionCard
            id="engagement"
            title="Engagement"
            subtitle={`Aktivitas terukur dalam ${data.range.days} hari terakhir.`}
            icon={<Activity size={18} />}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <StatCard label="Rata-rata aksi/hari" value={fmt(data.engagement.avgSessionsPerDay)} sub={`${fmt(data.engagement.totalActions)} total aksi`} icon={<Zap size={15} />} />
              <StatCard label="XP diperoleh" value={fmt(data.engagement.xpEarned)} sub={`${fmt(data.engagement.xpTransactions)} transaksi`} icon={<Coins size={15} />} />
              <StatCard label="Quest selesai" value={fmt(data.engagement.questsCompleted)} icon={<Target size={15} />} />
              <StatCard label="Badge didapat" value={fmt(data.engagement.badgesAwarded)} icon={<Medal size={15} />} />
              <StatCard label="Achievement dibuka" value={fmt(data.engagement.achievementsCompleted)} icon={<Trophy size={15} />} />
              <StatCard label="Rank naik" value={fmt(data.engagement.rankUps)} icon={<TrendingUp size={15} />} />
              <StatCard label="Level naik" value={fmt(data.engagement.levelUps)} icon={<Sparkles size={15} />} />
              <StatCard label="Game dimainkan" value={fmt(data.engagement.gamesPlayed)} icon={<Gamepad2 size={15} />} />
              <StatCard label="Jalur selesai" value={fmt(data.engagement.jalurCompleted)} sub="Unit Jalur Cerdas" icon={<BookOpen size={15} />} />
              <StatCard label="Karya dibuat" value={fmt(data.engagement.karyaCreated)} icon={<PenLine size={15} />} />
              <StatCard label="UKBI/TKA selesai" value={fmt(data.engagement.ukbiCompleted)} icon={<Target size={15} />} />
            </div>
          </SectionCard>

          {/* ── SECTION 5: FEATURE FLOW (Sankey) ───────────────────── */}
          <SectionCard
            id="flow"
            title="Feature Flow"
            subtitle="Alur pemakaian fitur dari Login hingga Kembali Besok."
            icon={<Activity size={18} />}
          >
            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <Sankey
                  data={sankey}
                  nodePadding={28}
                  nodeWidth={14}
                  margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
                  link={{ stroke: "#c4b5fd", strokeOpacity: 0.35 }}
                >
                  <Tooltip
                    formatter={((value: unknown) => `${fmt(Number(value))} user`) as any}
                  />
                </Sankey>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* ── SECTION 6: TOP JOURNEY ─────────────────────────────── */}
          <SectionCard
            id="journey"
            title="Top Journey"
            subtitle="10 jalur aktivitas paling sering ditempuh murid."
            icon={<Sparkles size={18} />}
          >
            {data.topJourneys.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Belum ada cukup data perjalanan dalam rentang ini.</p>
            ) : (
              <div className="space-y-2.5">
                {data.topJourneys.map((j, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-violet-200 dark:border-violet-800 transition-all"
                  >
                    <span className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 dark:text-violet-300 text-[11px] font-extrabold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 flex flex-wrap items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {j.journey.map((step, s) => (
                        <span key={s} className="inline-flex items-center gap-1">
                          <span className="px-2 py-1 rounded-md bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700">{step}</span>
                          {s < j.journey.length - 1 && <span className="text-slate-300">→</span>}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 shrink-0">{j.count}×</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── SECTION 7: HEATMAP ─────────────────────────────────── */}
          <SectionCard
            id="heatmap"
            title="Heatmap Aktivitas"
            subtitle="Kepadatan aktivitas per jam (WIB) × hari, 30 hari terakhir. Semakin ungu terang semakin ramai."
            icon={<CalendarDays size={18} />}
          >
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[640px]">
                <div className="flex">
                  <div className="w-10 shrink-0" />
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="flex-1 text-center text-[9px] text-slate-400 font-semibold">
                      {h}:00
                    </div>
                  ))}
                </div>
                {heatRows.map((row) => (
                  <div key={row.dow} className="flex items-center mt-1">
                    <div className="w-10 shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400">{DAY_LABELS[row.dow]}</div>
                    {row.hours.map((cell, h) => (
                      <div
                        key={h}
                        className="flex-1 h-7 m-[1.5px] rounded-[4px] transition-colors"
                        style={{
                          backgroundColor: cell
                            ? `rgba(139,92,246,${Math.max(0.12, Math.min(1, cell.users / heatmapMax))})`
                            : "#f8fafc",
                          border: cell ? "1px solid rgba(139,92,246,0.35)" : "1px solid #f1f5f9",
                        }}
                        title={`${DAY_LABELS[row.dow]} ${h}:00 — ${cell ? fmt(cell.users) : 0} user`}
                      />
                    ))}
                  </div>
                ))}
                <div className="flex items-center justify-end gap-2 mt-3">
                  <span className="text-[10px] text-slate-400">Sepi</span>
                  <div className="w-4 h-3 rounded bg-slate-100 dark:bg-slate-800/70" />
                  <div className="w-4 h-3 rounded" style={{ backgroundColor: "rgba(139,92,246,0.3)" }} />
                  <div className="w-4 h-3 rounded" style={{ backgroundColor: "rgba(139,92,246,0.7)" }} />
                  <div className="w-4 h-3 rounded" style={{ backgroundColor: "rgba(139,92,246,1)" }} />
                  <span className="text-[10px] text-slate-400">Ramai</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── SECTION 8: COHORT RETENTION ────────────────────────── */}
          <SectionCard
            id="cohort"
            title="Cohort Retention"
            subtitle="User baru per minggu dan persentase yang kembali pada minggu berikutnya."
            icon={<Users size={18} />}
          >
            {data.cohort.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Belum ada kohor dalam rentang ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="text-left font-semibold py-2 pr-4">Minggu</th>
                      <th className="font-semibold py-2 px-3">User Baru</th>
                      <th className="font-semibold py-2 px-3">Minggu 1</th>
                      <th className="font-semibold py-2 px-3">Minggu 2</th>
                      <th className="font-semibold py-2 px-3">Minggu 3</th>
                      <th className="font-semibold py-2 px-3">Minggu 4</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cohort.map((c) => (
                      <tr key={c.week} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-4 font-semibold text-slate-700 dark:text-slate-200">{c.week}</td>
                        <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100">{c.users}</td>
                        {[c.w1, c.w2, c.w3, c.w4].map((v, i) => (
                          <td key={i} className="py-2 px-3">
                            <div
                              className="rounded-lg px-2 py-1.5 text-center font-bold"
                              style={{
                                backgroundColor:
                                  v >= 40 ? "rgba(139,92,246,0.85)" : v >= 20 ? "rgba(139,92,246,0.5)" : v > 0 ? "rgba(139,92,246,0.25)" : "#f8fafc",
                                color: v >= 40 ? "#fff" : v >= 20 ? "#4c1d95" : "#94a3b8",
                              }}
                            >
                              {v}%
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* ── SECTION 9: XP DISTRIBUTION ─────────────────────────── */}
          <SectionCard
            id="xp"
            title="XP Distribution"
            subtitle="Distribusi total XP pemain (PlayerProfile)."
            icon={<Coins size={18} />}
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.xpDist} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip formatter={(v) => [fmt(Number(v)), "User"]} cursor={{ fill: "#f5f3ff" }} />
                  <Bar dataKey="users" radius={[6, 6, 0, 0]}>
                    {data.xpDist.map((_, i) => (
                      <Cell key={i} fill={["#a5b4fc", "#818cf8", "#6366f1", "#8b5cf6", "#7c3aed"][i] ?? "#8b5cf6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* ── SECTION 10: RANK DISTRIBUTION ──────────────────────── */}
          <SectionCard
            id="rank"
            title="Rank Distribution"
            subtitle="Distribusi 9 rank resmi BahasaCerdas + kenaikan minggu ini."
            icon={<Trophy size={18} />}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {data.rankDist.map((r) => {
                const meta = RANK_META[r.rank as keyof typeof RANK_META];
                const pct = totalRankUsers > 0 ? Math.round((r.users / totalRankUsers) * 100) : 0;
                return (
                  <div
                    key={r.rank}
                    className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-gradient-to-b from-slate-50 to-white p-4 flex flex-col items-center text-center hover:shadow-md transition-all"
                  >
                    <RankIcon rank={r.rank} size={52} glow />
                    <p className="mt-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">{meta?.label ?? r.rank}</p>
                    <p className="text-[10px] text-slate-400 -mt-0.5">{meta?.title ?? ""}</p>
                    <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">{fmt(r.users)}</p>
                    <p className="text-[10px] text-slate-400">{pct}% pemain</p>
                    {r.promotedThisWeek > 0 ? (
                      <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        <ArrowUp size={10} /> {r.promotedThisWeek} naik minggu ini
                      </span>
                    ) : (
                      <span className="mt-1.5 text-[10px] text-slate-300">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* ── SECTION 11: LEARNING SKILL ─────────────────────────── */}
          <SectionCard
            id="skill"
            title="Learning Skill Nasional"
            subtitle="Rata-rata level 7 skill dari Learning Loop."
            icon={<Brain size={18} />}
          >
            {data.skills.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Belum ada data skill. Murid perlu mengikuti Jalur Cerdas dahulu.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={data.skills.map((s) => ({ skill: SKILL_LABELS[s.skill] ?? s.skill, level: s.avgLevel }))} outerRadius="72%">
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: "#475569" }} />
                    <Radar dataKey="level" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} />
                    <Tooltip formatter={(v) => [`Level ${v}`, "Rata-rata"]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>

          {/* ── SECTION 12: CONTENT HEALTH ─────────────────────────── */}
          <SectionCard
            id="content"
            title="Content Health"
            subtitle="Kesehatan konten dan keterlibatan sosial."
            icon={<Heart size={18} />}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
              <StatCard label="Karya Hari Ini" value={fmt(data.content.karyaToday)} color="text-pink-600" />
              <StatCard label="Karya Minggu Ini" value={fmt(data.content.karyaWeek)} color="text-pink-600" />
              <StatCard label="Karya Bulan Ini" value={fmt(data.content.karyaMonth)} color="text-pink-600" />
              <StatCard label="Total Karya" value={fmt(data.content.karyaTotal)} />
              <StatCard label="Total Artikel" value={fmt(data.content.artikel)} />
              <StatCard label="Komentar" value={fmt(data.content.comments)} sub="dalam rentang" />
              <StatCard label="Like" value={fmt(data.content.likes)} sub="dalam rentang" />
              <StatCard label="Total Dilihat" value={fmt(data.content.views)} />
            </div>
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Tema paling populer {data.content.topTheme ? (
                  <span className="text-violet-600 dark:text-violet-400 normal-case">— {data.content.topTheme}</span>
                ) : null}
              </p>
              {data.content.themes.length === 0 ? (
                <p className="text-sm text-slate-400">Belum ada karya dalam rentang ini.</p>
              ) : (
                <div className="space-y-2">
                  {data.content.themes.map((t) => {
                    const max = data.content.themes[0]?.count ?? 1;
                    return (
                      <div key={t.type} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">{t.type}</span>
                        <div className="flex-1 h-6 rounded-lg bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
                          <div
                            className="h-full rounded-lg bg-gradient-to-r from-pink-500 to-fuchsia-500"
                            style={{ width: `${Math.max(4, Math.round((t.count / max) * 100))}%` }}
                          />
                        </div>
                        <span className="w-14 text-right text-xs font-bold text-slate-500 dark:text-slate-400">{t.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── SECTION 13: TOP GAME ───────────────────────────────── */}
          <SectionCard
            id="game"
            title="Top Game"
            subtitle="Game paling banyak dimainkan dalam rentang ini."
            icon={<Gamepad2 size={18} />}
          >
            {data.topGames.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Belum ada permainan tercatat dalam rentang ini.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.topGames.map((g, i) => (
                  <div key={g.source} className="rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-lg text-white text-xs font-extrabold flex items-center justify-center ${
                          i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-slate-800"
                        }`}>
                          {i + 1}
                        </span>
                        {g.label}
                      </p>
                      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded-full">{g.repeatRate}% main ulang</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">Pemain</p>
                        <p className="text-base font-extrabold text-slate-900 dark:text-slate-100">{fmt(g.players)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">Rata² XP</p>
                        <p className="text-base font-extrabold text-slate-900 dark:text-slate-100">{fmt(g.avgXp)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold">Total XP</p>
                        <p className="text-base font-extrabold text-slate-900 dark:text-slate-100">{fmt(g.totalXp)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── SECTION 14: AI GURU ────────────────────────────────── */}
          <SectionCard
            id="ai"
            title="AI Guru"
            subtitle="Pemakaian Alat AI oleh guru dalam rentang ini."
            icon={<Brain size={18} />}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
              <StatCard label="Guru Aktif AI" value={fmt(data.aiGuru.activeGurus)} color="text-emerald-600 dark:text-emerald-400" icon={<Users size={15} />} />
              <StatCard label="Total Prompt" value={fmt(data.aiGuru.totalPrompts)} icon={<Zap size={15} />} />
              <StatCard label="Total Token" value={fmt(data.aiGuru.totalTokens)} icon={<Database size={15} />} />
              <StatCard label="RPP" value={fmt(data.aiGuru.rpp)} icon={<FileTextIcon />} />
              <StatCard label="Bank Soal" value={fmt(data.aiGuru.soal)} icon={<FileTextIcon />} />
              <StatCard label="Materi/PPT" value={fmt(data.aiGuru.materi)} icon={<FileTextIcon />} />
              <StatCard label="Review" value={fmt(data.aiGuru.review)} icon={<Sparkles size={15} />} />
              <StatCard label="Download" value={fmt(data.aiGuru.download)} icon={<ArrowDown size={15} />} />
            </div>
          </SectionCard>

          {/* ── SECTION 15: INSIGHT AI ─────────────────────────────── */}
          <SectionCard
            id="insight"
            title="Insight AI"
            subtitle="Insight berbasis aturan dari data di atas (maks 10)."
            icon={<Info size={18} />}
          >
            <div className="space-y-2.5">
              {data.insights.map((ins, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                    ins.tone === "good"
                      ? "bg-emerald-50 dark:bg-emerald-950/40/60 border-emerald-200 dark:border-emerald-800"
                      : ins.tone === "bad"
                      ? "bg-red-50 dark:bg-red-950/40/60 border-red-200 dark:border-red-800"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {ins.tone === "good" ? (
                    <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : ins.tone === "bad" ? (
                    <TrendingDown size={16} className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm text-slate-700 dark:text-slate-200">{ins.text}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
      />
    </label>
  );
}

function FileTextIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
