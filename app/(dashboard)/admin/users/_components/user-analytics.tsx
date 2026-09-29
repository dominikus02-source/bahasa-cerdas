"use client";

import {
  Activity,
  GraduationCap,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface UserAnalyticsData {
  generatedAt: string;
  summary: {
    totalUsers: number;
    murid: number;
    guru: number;
    other: number;
    active30d: number;
    new30d: number;
  };
  roles: Array<{
    key: string;
    label: string;
    value: number;
  }>;
  statuses: Array<{
    key: string;
    label: string;
    value: number;
  }>;
  growth: Array<{
    key: string;
    label: string;
    murid: number;
    guru: number;
    other: number;
    total: number;
  }>;
}

const ROLE_COLORS = ["#7c3aed", "#059669", "#64748b"];
const STATUS_COLORS = ["#94a3b8", "#2563eb", "#0ea5e9", "#f59e0b", "#d97706"];

function formatNumber(value: number) {
  return value.toLocaleString("id-ID");
}

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number;
  detail: string;
  tone: "violet" | "emerald" | "sky" | "amber";
}) {
  const toneClass = {
    violet:
      "border-violet-200 bg-violet-50/60 text-violet-700 dark:border-violet-900 dark:bg-violet-950/25 dark:text-violet-300",
    emerald:
      "border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-300",
    sky:
      "border-sky-200 bg-sky-50/60 text-sky-700 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-300",
    amber:
      "border-amber-200 bg-amber-50/60 text-amber-700 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-300",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {formatNumber(value)}
          </p>
        </div>
        <span className="rounded-xl bg-white/70 p-2 shadow-sm dark:bg-slate-900/60">
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        {detail}
      </p>
    </div>
  );
}

function DonutLegend({
  items,
  colors,
  total,
}: {
  items: Array<{ key: string; label: string; value: number }>;
  colors: string[];
  total: number;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={item.key} className="flex items-center justify-between gap-3 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="truncate text-slate-600 dark:text-slate-300">
              {item.label}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <strong className="text-slate-800 dark:text-slate-100">
              {formatNumber(item.value)}
            </strong>
            <span className="w-8 text-right text-[10px] text-slate-400">
              {percentage(item.value, total)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      {label ? (
        <p className="mb-1.5 font-semibold text-slate-700 dark:text-slate-200">{label}</p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">{entry.name}</span>
            <strong className="text-slate-800 dark:text-slate-100">
              {formatNumber(Number(entry.value ?? 0))}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UserAnalytics({
  data,
  loading,
}: {
  data: UserAnalyticsData | null;
  loading: boolean;
}) {
  if (loading && !data) {
    return (
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
          />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const total = data.summary.totalUsers;

  return (
    <section className="mb-6 space-y-4" aria-label="Analitik pengguna">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={UsersRound}
          label="Total pengguna"
          value={total}
          detail="Seluruh akun yang tercatat di BahasaCerdas."
          tone="violet"
        />
        <MetricCard
          icon={GraduationCap}
          label="Murid"
          value={data.summary.murid}
          detail={`${percentage(data.summary.murid, total)}% dari seluruh pengguna.`}
          tone="emerald"
        />
        <MetricCard
          icon={Activity}
          label="Aktif 30 hari"
          value={data.summary.active30d}
          detail={`${percentage(data.summary.active30d, total)}% pengguna tercatat aktif dalam 30 hari terakhir.`}
          tone="sky"
        />
        <MetricCard
          icon={Sparkles}
          label="Pengguna baru"
          value={data.summary.new30d}
          detail="Akun baru yang bergabung dalam 30 hari terakhir."
          tone="amber"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_0.8fr_1.4fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Komposisi pengguna
            </h2>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Perbandingan Murid dan Guru.
            </p>
          </div>

          <div className="relative mx-auto mt-3 h-48 max-w-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.roles}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={56}
                  outerRadius={78}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.roles.map((entry, index) => (
                    <Cell
                      key={entry.key}
                      fill={ROLE_COLORS[index % ROLE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <strong className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatNumber(total)}
              </strong>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                pengguna
              </span>
            </div>
          </div>
          <DonutLegend items={data.roles} colors={ROLE_COLORS} total={total} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Status akun
            </h2>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Free, Pro, Trial, dan status khusus lainnya.
            </p>
          </div>

          <div className="relative mx-auto mt-3 h-48 max-w-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statuses}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={56}
                  outerRadius={78}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.statuses.map((entry, index) => (
                    <Cell
                      key={entry.key}
                      fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <strong className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {percentage(
                  data.statuses.find((item) => item.key === "pro")?.value ?? 0,
                  total,
                )}%
              </strong>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Pro aktif
              </span>
            </div>
          </div>
          <DonutLegend items={data.statuses} colors={STATUS_COLORS} total={total} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Pertumbuhan pengguna
              </h2>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Akun baru per bulan selama 6 bulan terakhir.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-violet-600" /> Murid
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full bg-emerald-600" /> Guru
              </span>
            </div>
          </div>

          <div className="mt-5 h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.growth} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                <Bar
                  dataKey="murid"
                  name="Murid"
                  stackId="users"
                  fill="#7c3aed"
                  radius={[0, 0, 4, 4]}
                  maxBarSize={42}
                />
                <Bar
                  dataKey="guru"
                  name="Guru"
                  stackId="users"
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                />
                {data.summary.other > 0 ? (
                  <Bar
                    dataKey="other"
                    name="Lainnya"
                    stackId="users"
                    fill="#64748b"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={42}
                  />
                ) : null}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400 dark:border-slate-700">
            <span>
              6 bulan: {formatNumber(data.growth.reduce((sum, item) => sum + item.total, 0))} pengguna baru
            </span>
            <span>
              Diperbarui {new Date(data.generatedAt).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
