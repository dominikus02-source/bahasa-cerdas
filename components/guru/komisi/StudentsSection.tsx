"use client";

/**
 * P8A — "Murid Premium Saya" (privacy-safe).
 * TIDAK menampilkan metode pembayaran, ID transaksi, atau detail finansial murid.
 */

import { Users, BadgeCheck, GraduationCap } from "lucide-react";
import { formatRupiah } from "@/lib/guru/komisi-labels";
import type { KomisiStudent } from "./KomisiClient";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function StudentsSection({ students }: { students: KomisiStudent[] }) {
  return (
    <section aria-label="Murid Premium Saya" className="bc-guru-surface rounded-2xl p-4 lg:p-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">Murid Premium Saya</h2>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {students.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Penghasilanmu berasal dari kontribusi murid yang aktif dalam ekosistem BahasaCerdas.
      </p>

      {students.length === 0 ? (
        <div className="mt-4 rounded-xl bg-muted/40 px-4 py-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium text-foreground">Belum ada murid Premium</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Murid yang bergabung ke kelasmu dan berlangganan Premium akan muncul di sini.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {students.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/60 text-sm font-bold text-blue-700 dark:text-blue-300">
                {s.name?.trim().charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground">Sejak {formatDate(s.eligibleFrom)}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  s.premiumActive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                {s.premiumActive ? "Premium aktif" : "Premium nonaktif"}
              </span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {s.periodContribution > 0 ? `${formatRupiah(s.periodContribution)} / periode` : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
