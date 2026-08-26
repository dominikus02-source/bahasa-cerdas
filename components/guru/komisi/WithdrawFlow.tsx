"use client";

/**
 * P8A — Withdrawal UX (spec §10/§11): 5 langkah
 *   1 Jumlah pencairan → 2 Rekening → 3 Review → 4 Konfirmasi → 5 Sukses.
 *
 * Review menampilkan "Biaya pencairan: Ditanggung BahasaCerdas" — sesuai
 * kebijakan P7E (fee provider = biaya platform, komisi guru utuh).
 * JANGAN menghitung angka di klien: nominal hanya divalidasi server.
 */

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { CheckCircle2, Landmark } from "lucide-react";
import { formatRupiah } from "@/lib/guru/komisi-labels";
import type { PayoutProfileView } from "./KomisiClient";

export interface WithdrawReview {
  amount: number;
  destinationLabel: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  available: number;
  profile: PayoutProfileView | null | undefined;
  minimum: number;
  review: WithdrawReview | null;
  setReview: (r: WithdrawReview | null) => void;
  success: { amount: number; status: string } | null;
  error: string | null;
  setError: (e: string | null) => void;
  onSubmit: (amount: number) => Promise<{ ok: true } | { ok: false; message: string }>;
}

export function WithdrawFlow(props: Props) {
  const { isOpen, onClose, available, profile, minimum, review, setReview, success, error, setError, onSubmit } = props;

  const [amount, setAmount] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setReview(null);
      setError(null);
      setConfirming(false);
    }
  }, [isOpen, setReview, setError]);

  const step = success ? 5 : review ? (confirming ? 4 : 3) : amount !== "" && Number(amount) > 0 ? 2 : 1;

  const amountNum = amount === "" ? 0 : Math.floor(Number(amount));
  const belowMin = amountNum < minimum;
  const aboveBalance = amountNum > available;
  const hasProfile = !!profile;

  const quickSet = (v: number) => {
    setAmount(v);
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cairkan Penghasilan" className="max-w-md">
      {/* Stepper */}
      <ol className="mb-4 flex items-center gap-1 text-xs text-muted-foreground" aria-label="Langkah pencairan">
        {["Jumlah", "Rekening", "Review", "Konfirmasi", "Selesai"].map((label, i) => (
          <li key={label} className="flex items-center gap-1">
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${
                step > i ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-muted"
              }`}
            >
              {i + 1}
            </span>
            <span className={step === i + 1 ? "font-semibold text-foreground" : ""}>{label}</span>
            {i < 4 && <span className="text-muted-foreground/50">›</span>}
          </li>
        ))}
      </ol>

      {/* STEP 1 — Jumlah */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Saldo tersedia: {formatRupiah(available)}</p>
            <p className="text-sm text-muted-foreground">
              Minimum pencairan {formatRupiah(minimum)}.
              {available < minimum && available > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {" "}
                  {formatRupiah(minimum - available)} lagi untuk dapat dicairkan.
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => quickSet(Math.min(available, 100_000))}
              disabled={available < 100_000}
              className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-40"
            >
              Rp100.000
            </button>
            <button
              onClick={() => quickSet(Math.min(available, 250_000))}
              disabled={available < 250_000}
              className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-40"
            >
              Rp250.000
            </button>
            <button
              onClick={() => quickSet(Math.min(available, 500_000))}
              disabled={available < 500_000}
              className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-40"
            >
              Rp500.000
            </button>
            <button
              onClick={() => quickSet(available)}
              disabled={available <= 0}
              className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-40"
            >
              Saldo penuh
            </button>
          </div>
          <label className="block text-sm font-medium">
            Jumlah pencairan
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value === "" ? "" : Math.max(0, Math.floor(Number(e.target.value))));
                setError(null);
              }}
              placeholder="Rp50.000"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-lg font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          {belowMin && amountNum > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {formatRupiah(minimum - amountNum)} lagi untuk mencapai minimum pencairan.
            </p>
          )}
          {aboveBalance && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Jumlah melebihi saldo tersedia ({formatRupiah(available)}).
            </p>
          )}
          <button
            disabled={belowMin || aboveBalance || amountNum <= 0}
            onClick={() => setReview({
              amount: amountNum,
              destinationLabel: profile ? `${profile.bankName} ${profile.maskedAccount}` : "Belum ada rekening",
            })}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Lanjut
          </button>
        </div>
      )}

      {/* STEP 2 — Rekening + Review */}
      {step === 3 && review && (
        <div className="space-y-4">
          <div className="rounded-xl bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Landmark className="h-4 w-4" />
              Rekening pencairan
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {hasProfile
                ? `${profile?.bankName} · ${profile?.maskedAccount}`
                : "Belum ada rekening terdaftar"}
            </p>
            {!hasProfile && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Silakan isi rekening pencairan di bagian Rekening Pencairan.
              </p>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jumlah penghasilan</span>
              <span className="font-semibold tabular-nums text-foreground">{formatRupiah(review.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Biaya pencairan</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Ditanggung BahasaCerdas
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">Diterima</span>
              <span className="text-base font-bold tabular-nums text-foreground">
                {formatRupiah(review.amount)}
              </span>
            </div>
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setReview(null)}
              className="flex-1 rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted"
            >
              Kembali
            </button>
            <button
              disabled={!hasProfile}
              onClick={() => {
                setError(null);
                setConfirming(true);
              }}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              Lanjut
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 — Konfirmasi */}
      {step === 4 && review && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pencairan sebesar{" "}
            <span className="font-semibold text-foreground">{formatRupiah(review.amount)}</span>{" "}
            akan dikirim ke rekening{" "}
            <span className="font-semibold text-foreground">{review.destinationLabel}</span>.
          </p>
          <p className="text-xs text-muted-foreground">
            Setelah dikonfirmasi, dana tidak dapat dibatalkan. Status pencairan dapat
            kamu lacak di Riwayat Pencairan.
          </p>
          {error && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted"
            >
              Kembali
            </button>
            <button
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                const result = await onSubmit(review.amount);
                setSubmitting(false);
                if (!result.ok) setConfirming(false);
              }}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {submitting ? "Mengirim…" : "Ya, kirim pencairan"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5 — Sukses */}
      {step === 5 && success && (
        <div className="space-y-4 text-center" role="status" aria-live="polite">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <p className="text-lg font-bold text-foreground">Pengajuan pencairan berhasil</p>
          <p className="text-sm text-muted-foreground">
            {formatRupiah(success.amount)} sedang diproses. Setiap pencairan memiliki status
            yang dapat kamu lacak di Riwayat Pencairan.
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Selesai
          </button>
        </div>
      )}
    </Modal>
  );
}
