"use client";

/**
 * P8A — Rekening Pencairan (masked) + Riwayat Pencairan + status payout.
 * Tidak pernah menampilkan nomor rekening penuh / error code provider.
 */

import { Landmark, Pencil, ReceiptText } from "lucide-react";
import {
  formatRupiah,
  payoutStatusLabel,
  withdrawalStatusLabel,
  withdrawalTone,
} from "@/lib/guru/komisi-labels";
import type { PayoutProfileView, WithdrawalItem } from "./KomisiClient";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

const TONE_CLASS: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  neutral: "bg-muted text-muted-foreground",
};

export function PayoutSection({
  profile,
  withdrawals,
  available,
  onEditProfile,
}: {
  profile: PayoutProfileView | null | undefined;
  withdrawals: WithdrawalItem[];
  available: number;
  onEditProfile: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Rekening pencairan */}
      <section aria-label="Rekening pencairan" className="rounded-2xl bg-card border border-border p-4 lg:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Rekening Pencairan</h2>
          </div>
          <button
            onClick={onEditProfile}
            className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" />
            {profile ? "Ubah rekening" : "Daftarkan rekening"}
          </button>
        </div>

        {profile ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1">
            <div>
              <p className="text-xs text-muted-foreground">{profile.destinationType === "EWALLET" ? "E-Wallet" : "Bank"}</p>
              <p className="text-lg font-bold text-foreground">{profile.bankName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nomor rekening</p>
              <p className="text-lg font-bold tabular-nums text-foreground">{profile.maskedAccount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Atas nama</p>
              <p className="text-lg font-bold text-foreground">{profile.recipientName}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Belum ada rekening terdaftar. Daftarkan rekening untuk mulai mencairkan penghasilan.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Perubahan rekening hanya berlaku untuk pencairan berikutnya.
        </p>
      </section>

      {/* Riwayat pencairan */}
      <section aria-label="Riwayat pencairan" className="rounded-2xl bg-card border border-border p-4 lg:p-6">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Riwayat Pencairan</h2>
        </div>

        {withdrawals.length === 0 ? (
          <div className="mt-4 rounded-xl bg-muted/40 px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">Belum ada pencairan</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
              {available >= 50000
                ? "Saldomu sudah bisa dicairkan — ajukan pencairan pertamamu."
                : "Ajukan pencairan setelah saldo mencapai minimum."}
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {withdrawals.map((w) => {
              const tone = withdrawalTone(w.payout?.status ?? w.status);
              const label = payoutStatusLabel(w.payout?.status ?? w.status);
              const failed = w.status === "REJECTED" || w.payout?.status === "FAILED";
              return (
                <li key={w.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Cairkan {formatRupiah(w.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(w.createdAt)} · {w.bankName} {w.accountNumber}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}>
                      {label}
                    </span>
                  </div>
                  {w.payout?.completedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Diterima {formatDate(w.payout.completedAt)}
                    </p>
                  )}
                  {failed && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pengiriman dana belum berhasil. Saldo Anda telah dikembalikan.
                    </p>
                  )}
                  {w.payout?.status === "RECONCILIATION_REQUIRED" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Status sedang diperiksa tim kami. Kamu akan melihat pembaruan di sini.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export { withdrawalStatusLabel };
