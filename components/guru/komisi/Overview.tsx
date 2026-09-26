"use client";

/**
 * P8A — Overview: hero "Berapa penghasilan saya?" + 4 kartu + chart 6 bulan.
 */

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Wallet, Clock, TrendingUp, Users } from "lucide-react";
import { formatRupiah } from "@/lib/guru/komisi-labels";
import type { EarningsSeries, KomisiSummary } from "./KomisiClient";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

export function Overview({
  summary,
  series,
  onWithdraw,
}: {
  summary: KomisiSummary | null;
  series: EarningsSeries | null;
  onWithdraw: () => void;
}) {
  const available = summary?.availableBalance ?? 0;
  const pending = summary?.pendingBalance ?? 0;
  const lifetime = summary?.lifetimeEarned ?? 0;
  const students = summary?.activePremiumStudents ?? 0;
  const thisMonth = summary?.currentMonthCommission ?? 0;

  const chartData = useMemo(
    () =>
      (series?.series ?? []).map((s) => ({
        name: monthLabel(s.month),
        Penghasilan: s.total,
      })),
    [series]
  );

  const hasChartData = chartData.some((d) => d.Penghasilan > 0);

  return (
    <section aria-label="Ringkasan penghasilan">
      {/* Hero */}
      <div className="bc-guru-hero rounded-2xl p-5 lg:p-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
          Guru Cerdas Sejahtera
        </p>
        <h1 className="mt-1 text-2xl lg:text-3xl font-bold text-white">Penghasilan Saya</h1>

        <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <p className="text-sm text-blue-100/85">Saldo tersedia untuk dicairkan</p>
            <p className="mt-1 text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              {formatRupiah(available)}
            </p>
            {available === 0 && (
              <p className="mt-1 text-sm text-blue-100/80">
                Belum ada penghasilan yang tersedia
              </p>
            )}
          </div>
          {thisMonth > 0 && (
            <div className="pb-1">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                + {formatRupiah(thisMonth)} bulan ini
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={onWithdraw}
            disabled={available < 50000}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cairkan Penghasilan
          </button>
          {available < 50000 && (
            <span className="self-center text-sm text-blue-100/80">
              {available > 0
                ? `${formatRupiah(50000 - available)} lagi untuk dapat dicairkan.`
                : "Minimum pencairan Rp50.000."}
            </span>
          )}
        </div>
      </div>

      {/* 4 kartu */}
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="Saldo tersedia"
          value={formatRupiah(available)}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Sedang diproses"
          value={formatRupiah(pending + (summary?.lockedBalance ?? 0))}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Total penghasilan"
          value={formatRupiah(lifetime)}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Murid Premium"
          value={String(students)}
        />
      </div>

      {/* Chart 6 bulan */}
      <div className="mt-4 rounded-2xl bg-card border border-border p-4 lg:p-6">
        <h2 className="text-base font-semibold text-foreground">Penghasilan 6 Bulan Terakhir</h2>
        {hasChartData ? (
          <div className="mt-4 h-56 w-full" role="img" aria-label="Grafik penghasilan 6 bulan terakhir">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "var(--clr-text-3)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--clr-text-3)" }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}rb` : String(v))}
                />
                <Tooltip
                  cursor={{ fill: "rgba(37,99,235,0.10)" }}
                  formatter={(value) => [formatRupiah(Number(value)), "Penghasilan"]}
                  labelFormatter={(label) => `Bulan: ${label}`}
                  contentStyle={{
                    backgroundColor: "var(--clr-surface)",
                    color: "var(--clr-text)",
                    border: "1px solid var(--clr-border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="Penghasilan" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4 flex h-56 items-center justify-center rounded-xl bg-muted/40 text-center">
            <div>
              <p className="text-sm font-medium text-foreground">Belum ada data penghasilan</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Grafik akan terisi setelah komisi pertamamu tercatat.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bc-guru-stat-card rounded-2xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-lg lg:text-xl font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}
