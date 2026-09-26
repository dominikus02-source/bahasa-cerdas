"use client";

/**
 * P8A — Guru Cerdas Sejahtera: Teacher Earnings Dashboard.
 *
 * SUMBER KEBENARAN: API P7C/P7D/P7E (/api/teacher/commissions/*).
 * TIDAK ada kalkulasi finansial di klien — semua angka dari backend.
 * TIDAK ada saldo palsu. Empty state = jujur + mendukung.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { trackProductEvent } from "@/lib/analytics/product-track";
import {
  formatRupiah,
  humanizeWithdrawalError,
  withdrawalStatusLabel,
} from "@/lib/guru/komisi-labels";
import { Overview } from "./Overview";
import { StudentsSection } from "./StudentsSection";
import { EarningsHistory } from "./EarningsHistory";
import { WithdrawFlow, WithdrawReview } from "./WithdrawFlow";
import { PayoutSection } from "./PayoutSection";
import { TrustSection } from "./TrustSection";
import { EmptyStates } from "./EmptyStates";

export interface KomisiSummary {
  availableBalance: number;
  pendingBalance: number;
  lockedBalance: number;
  lifetimeEarned: number;
  lifetimeWithdrawn: number;
  totalReversed: number;
  walletStatus: string;
  riskStatus?: "NORMAL" | "REVIEW" | "RESTRICTED";
  activePremiumStudents: number;
  currentMonthCommission: number;
  recentCommissionHistory: Array<{
    id: string;
    entryType: string;
    grossAmount: number;
    commissionAmount: number;
    status: string;
    source: string;
    eligibleFrom: string;
    holdingEndsAt: string | null;
    availableAt: string | null;
    reversedAt: string | null;
    createdAt: string;
  }>;
  withdrawalHistory: Array<{
    id: string;
    amount: number;
    status: string;
    notes: string | null;
    processedAt: string | null;
    createdAt: string;
  }>;
}

export interface KomisiStudent {
  id: string;
  name: string;
  premiumActive: boolean;
  eligibleFrom: string;
  source: string;
  totalContribution: number;
  contributionCount: number;
  periodContribution: number;
  lastContributionAt: string | null;
}

export interface EarningsSeries {
  series: Array<{ month: string; total: number; count: number }>;
}

export interface MonthDetail {
  month: string;
  total: number;
  studentCount: number;
  students: Array<{ name: string; total: number; count: number }>;
}

export interface WithdrawalItem {
  id: string;
  amount: number;
  status: string;
  notes: string | null;
  processedAt: string | null;
  createdAt: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  payout: {
    id: string;
    status: string;
    submittedAt: string | null;
    completedAt: string | null;
    failedAt: string | null;
  } | null;
}

export interface PayoutProfileView {
  recipientName: string;
  destinationType: string;
  bankName: string;
  maskedAccount: string;
  verificationStatus: string;
  verifiedAt: string | null;
  updatedAt: string;
}

export interface KelasInfo {
  id: string;
  name: string;
  grade: string;
  accessCode: string;
  tahunAjaran?: string | null;
}

export default function KomisiClient({ isFounder = false }: { isFounder?: boolean }) {
  const [summary, setSummary] = useState<KomisiSummary | null>(null);
  const [students, setStudents] = useState<KomisiStudent[] | null>(null);
  const [series, setSeries] = useState<EarningsSeries | null>(null);
  const [monthDetail, setMonthDetail] = useState<MonthDetail | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[] | null>(null);
  const [profile, setProfile] = useState<PayoutProfileView | null | undefined>(undefined);
  const [classes, setClasses] = useState<KelasInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [withdrawReview, setWithdrawReview] = useState<WithdrawReview | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<{ amount: number; status: string } | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [monthQuery, setMonthQuery] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, st, e, w, p, c] = await Promise.all([
        fetch("/api/teacher/commissions").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/teacher/commissions/students").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/teacher/commissions/earnings").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/teacher/commissions/withdrawals").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/teacher/commissions/payout-profile").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/group").then((r) => (r.ok ? r.json() : null)),
      ]);
      setSummary(s ?? null);
      setStudents(st?.students ?? []);
      setSeries(e ?? null);
      setWithdrawals(w?.items ?? []);
      setProfile(p?.profile ?? null);
      setClasses(c?.groups ?? []);
      setError(null);
    } catch {
      setError("Gagal memuat data penghasilan. Coba muat ulang.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    trackProductEvent("guru_commission_viewed");
  }, [refresh]);

  // Detail bulan untuk riwayat penghasilan.
  useEffect(() => {
    if (!monthQuery) {
      setMonthDetail(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/teacher/commissions/earnings?month=${encodeURIComponent(monthQuery)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setMonthDetail(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [monthQuery]);

  const loading = summary === null && !error;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6" role="status" aria-label="Memuat penghasilan">
        <div className="h-40 rounded-2xl bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  const available = summary?.availableBalance ?? 0;
  const isNewTeacher = !summary || summary.lifetimeEarned === 0;
  const hasStudents = (students?.length ?? 0) > 0;

  // ── Founder-aware: founder tidak mengikuti program komisi ──
  if (isFounder) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        <FounderCommissionDisclaimer />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 lg:py-8 space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-foreground"
        >
          {error}
        </div>
      )}

      {/* ── P8C: status risiko respectful (tanpa bukti internal) ── */}
      {(summary?.riskStatus === "REVIEW" || summary?.riskStatus === "RESTRICTED") && (
        <RiskBanner riskStatus={summary.riskStatus} />
      )}

      {/* ── OVERVIEW: hero + kartu + chart ── */}
      <Overview
        summary={summary}
        series={series}
        onWithdraw={() => {
          trackProductEvent("guru_withdrawal_started");
          setWithdrawOpen(true);
        }}
      />

      {/* ── EMPTY / ZERO STATE ── */}
      {isNewTeacher || (!hasStudents && available === 0) ? (
        <EmptyStates hasStudents={hasStudents} />
      ) : null}

      {/* ── MURID PREMIUM ── */}
      <StudentsSection students={students ?? []} />

      {/* ── RIWAYAT PENGHASILAN ── */}
      <EarningsHistory
        series={series?.series ?? []}
        monthDetail={monthDetail}
        monthQuery={monthQuery}
        onMonthChange={(m) => {
          setMonthQuery(m);
          trackProductEvent("guru_earnings_viewed", { month: m ?? "" });
        }}
        recent={summary?.recentCommissionHistory ?? []}
      />

      {/* ── REKENING + RIWAYAT PENCAIRAN ── */}
      <PayoutSection
        profile={profile}
        withdrawals={withdrawals ?? []}
        available={available}
        onEditProfile={() => setProfileOpen(true)}
      />

      {/* ── TRANSPARANSI + BENEFIT + BAGIKAN ── */}
      <TrustSection classes={classes ?? []} />

      {/* ── MODAL PENCAIRAN (5 LANGKAH) ── */}
      <WithdrawFlow
        isOpen={withdrawOpen}
        onClose={() => {
          setWithdrawOpen(false);
          setWithdrawReview(null);
          setWithdrawError(null);
          setWithdrawSuccess(null);
        }}
        available={available}
        profile={profile}
        minimum={50000}
        review={withdrawReview}
        setReview={setWithdrawReview}
        success={withdrawSuccess}
        error={withdrawError}
        setError={setWithdrawError}
        onSubmit={async (amount) => {
          const res = await fetch("/api/teacher/commissions/withdraw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.success) {
            setWithdrawSuccess({
              amount: data.withdrawal?.amount ?? amount,
              status: data.withdrawal?.status ?? "PENDING",
            });
            trackProductEvent("guru_withdrawal_submitted", { amount });
            void refresh();
            return { ok: true as const };
          }
          const msg = humanizeWithdrawalError(data?.code ?? data?.error ?? "");
          setWithdrawError(msg);
          return { ok: false as const, message: msg };
        }}
      />

      {/* ── MODAL UBAH REKENING ── */}
      <ProfileEditModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        current={profile}
        onSaved={() => {
          void refresh();
          setProfileOpen(false);
          trackProductEvent("guru_payout_profile_updated");
        }}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Modal ubah rekening pencairan (masked + audited server-side)
 * ──────────────────────────────────────────────────────────────────────────── */
function ProfileEditModal({
  isOpen,
  onClose,
  current,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  current: PayoutProfileView | null | undefined;
  onSaved: () => void;
}) {
  const [recipientName, setRecipientName] = useState("");
  const [destinationType, setDestinationType] = useState<"BANK" | "EWALLET">("BANK");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRecipientName(current?.recipientName ?? "");
      setDestinationType(current?.destinationType === "EWALLET" ? "EWALLET" : "BANK");
      setBankName(current?.bankName ?? "");
      setAccountNumber("");
      setError(null);
    }
  }, [isOpen, current]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/commissions/payout-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientName, destinationType, bankName, accountNumber }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        onSaved();
      } else {
        setError(data.error ?? "Rekening tidak dapat disimpan. Periksa kembali datamu.");
      }
    } catch {
      setError("Rekening tidak dapat disimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ubah Rekening Pencairan">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Perubahan rekening hanya berlaku untuk pencairan berikutnya. Pencairan yang
          sedang berjalan tetap memakai rekening lama.
        </p>
        <label className="block text-sm font-medium">
          Nama penerima
          <input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Nama sesuai rekening/e-wallet"
            maxLength={80}
          />
        </label>
        <label className="block text-sm font-medium">
          Jenis tujuan
          <select
            value={destinationType}
            onChange={(e) => setDestinationType(e.target.value === "EWALLET" ? "EWALLET" : "BANK")}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="BANK">Bank</option>
            <option value="EWALLET">E-Wallet</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          {destinationType === "BANK" ? "Nama bank" : "Nama e-wallet"}
          <input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={destinationType === "BANK" ? "Mis. BCA" : "Mis. DANA"}
            maxLength={40}
          />
        </label>
        <label className="block text-sm font-medium">
          Nomor rekening / tujuan
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, ""))}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="6–20 digit angka"
            inputMode="numeric"
            maxLength={20}
          />
          {current?.maskedAccount && (
            <span className="mt-1 block text-xs text-muted-foreground">
              Rekening saat ini: {current.bankName} {current.maskedAccount}
            </span>
          )}
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger rounded-lg bg-danger/10 px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted"
          >
            Batal
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan Rekening"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export { formatRupiah, withdrawalStatusLabel };

/* ────────────────────────────────────────────────────────────────────────────
 * Founder Commission Disclaimer — founder tidak mengikuti program komisi
 * ──────────────────────────────────────────────────────────────────────────── */
function FounderCommissionDisclaimer() {
  return (
    <div className="bc-guru-surface mx-auto mt-8 max-w-lg space-y-4 rounded-2xl px-6 py-8 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto text-3xl">
        🏛️
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        Program Komisi Guru Cerdas Sejahtera
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Sebagai founder BahasaCerdas, akun ini tidak mengikuti program komisi
        Guru Cerdas Sejahtera. Komisi ditujukan untuk guru-guru pengajar yang
        mengundang murid ke platform.
      </p>
      <p className="text-xs text-muted-foreground">
        Jika ada pertanyaan, hubungi tim dukungan BahasaCerdas.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * P8C §14 — Banner status risiko (respectful, tanpa deteksi/score internal)
 * ──────────────────────────────────────────────────────────────────────────── */
function RiskBanner({ riskStatus }: { riskStatus: "REVIEW" | "RESTRICTED" }) {
  const [open, setOpen] = useState(false);
  const isRestricted = riskStatus === "RESTRICTED";

  return (
    <>
      <div
        className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3"
        role="status"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            {isRestricted
              ? "Pencairan sementara dibatasi. Tim kami sedang melakukan pemeriksaan."
              : "Beberapa transaksi sedang kami tinjau untuk memastikan keamanan."}
          </p>
          <button
            onClick={() => {
              setOpen(true);
              trackProductEvent("teacher_risk_status_viewed");
            }}
            className="text-xs font-semibold text-foreground underline underline-offset-2"
          >
            Pelajari status
          </button>
        </div>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Status Keamanan Transaksi">
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Demi keamanan dan kenyamanan bersama, sebagian transaksi diperiksa secara
            berkala oleh tim kami.
          </p>
          {isRestricted ? (
            <p>
              Saat pemeriksaan berlangsung, pengajuan pencairan baru dihentikan
              sementara. Penghasilanmu tetap tercatat dan tidak berkurang. Kamu akan
              mendapat kabar setelah pemeriksaan selesai.
            </p>
          ) : (
            <p>
              Pencairan yang sedang ditinjau akan diproses setelah pemeriksaan selesai.
              Dana tetap aman dan tidak berkurang.
            </p>
          )}
          <p className="text-foreground font-medium">
            Jika kamu merasa ada yang kurang tepat, hubungi tim dukungan BahasaCerdas.
          </p>
          <button
            onClick={() => setOpen(false)}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Mengerti
          </button>
        </div>
      </Modal>
    </>
  );
}
