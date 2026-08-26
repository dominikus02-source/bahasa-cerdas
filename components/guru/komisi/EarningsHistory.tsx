"use client";

/**
 * P8A — Riwayat Penghasilan: pilih bulan → detail per murid + daftar terbaru.
 * Data dari ledger server-side (GET /earnings). Tidak ada kalkulasi klien.
 */

import { History } from "lucide-react";
import { formatRupiah, commissionStatusLabel } from "@/lib/guru/komisi-labels";
import { monthLabel } from "./Overview";
import type { KomisiSummary, MonthDetail } from "./KomisiClient";

export function EarningsHistory({
  series,
  monthDetail,
  monthQuery,
  onMonthChange,
  recent,
}: {
  series: Array<{ month: string; total: number; count: number }>;
  monthDetail: MonthDetail | null;
  monthQuery: string | null;
  onMonthChange: (month: string | null) => void;
  recent: KomisiSummary["recentCommissionHistory"];
}) {
  const months = [...series].reverse();

  return (
    <section aria-label="Riwayat penghasilan" className="rounded-2xl bg-card border border-border p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Riwayat Penghasilan</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Riwayat penghasilanmu tercatat secara transparan.
      </p>

      {/* Pilih bulan */}
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Pilih bulan riwayat">
        <button
          onClick={() => onMonthChange(null)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
            monthQuery === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-secondary"
          }`}
        >
          Terbaru
        </button>
        {months.map((m) => (
          <button
            key={m.month}
            onClick={() => onMonthChange(m.month)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              monthQuery === m.month
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-secondary"
            }`}
          >
            {monthLabel(m.month)}
            {m.total > 0 ? ` · ${formatRupiah(m.total)}` : ""}
          </button>
        ))}
      </div>

      {/* Detail bulan */}
      {monthQuery && monthDetail && (
        <div className="mt-4 rounded-xl bg-muted/40 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{monthLabel(monthDetail.month)}</p>
            <p className="text-sm text-muted-foreground">
              {monthDetail.studentCount} murid ·{" "}
              <span className="font-semibold text-foreground">{formatRupiah(monthDetail.total)}</span>
            </p>
          </div>
          {monthDetail.students.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Tidak ada penghasilan bulan ini.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {monthDetail.students.map((s) => (
                <li key={s.name} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-foreground">{s.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.count}× · <span className="font-semibold text-foreground">{formatRupiah(s.total)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Entri terbaru (saat tanpa filter bulan) */}
      {!monthQuery && (
        <ul className="mt-4 divide-y divide-border">
          {recent.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">
              Belum ada catatan penghasilan.
            </li>
          ) : (
            recent.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{formatRupiah(c.commissionAmount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {commissionStatusLabel(c.status)}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  );
}
