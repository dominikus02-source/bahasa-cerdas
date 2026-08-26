"use client";

/**
 * P8C §11/§15 — Admin review queue: signal → case → review → decision.
 * Keputusan WAJIB alasan. Timeline append-only. Tidak ada "BAN" — hanya
 * CLEAR / RESTRICT / KEEP_REVIEW (financial safety ≠ hukuman permanen).
 */

import { useCallback, useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck, ShieldOff, Search } from "lucide-react";

interface RiskCase {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  status: string;
  severity: string;
  reason: string;
  openedAt: string;
  signalCount: number;
  actionCount: number;
}

interface CaseDetail {
  id: string;
  teacherName: string;
  teacherEmail: string;
  status: string;
  severity: string;
  reason: string;
  openedAt: string;
  signals: Array<{ id: string; signalType: string; severity: string; detectedAt: string; dedupeKey: string }>;
  timeline: Array<{ at: string; actor: string; actorType: string; action: string; detail: string }>;
}

const SEVERITY_TONE: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  HIGH: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  CRITICAL: "bg-red-700 text-white",
};

export default function TeacherRiskPage() {
  const [cases, setCases] = useState<RiskCase[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/teacher-risk");
      if (!res.ok) throw new Error("Gagal memuat");
      const data = await res.json();
      setCases(data.cases ?? []);
      setMetrics(data.metrics ?? null);
      setError(null);
    } catch {
      setError("Antrean risk gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/teacher-risk/${id}`);
      if (res.ok) setDetail(await res.json());
    } catch {
      // abaikan
    }
  };

  const decide = async (id: string, decision: "CLEAR" | "RESTRICT" | "KEEP_REVIEW") => {
    if (!reason.trim()) {
      alert("Alasan wajib diisi sebelum mengambil keputusan.");
      return;
    }
    setSubmitting(`${id}:${decision}`);
    try {
      const res = await fetch(`/api/admin/teacher-risk/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Keputusan gagal diproses.");
        return;
      }
      setReason("");
      setDetail(null);
      await load();
    } catch {
      alert("Keputusan gagal diproses.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold text-foreground">Risiko Guru</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Signal ≠ bukti. Setiap keputusan membutuhkan alasan dan tercatat permanen.
        </p>
      </header>

      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ["Signal hari ini", String(metrics.signalsToday ?? 0)],
            ["Case terbuka", String(metrics.openCases ?? 0)],
            ["Guru dibatasi", String(metrics.restrictedTeachers ?? 0)],
            ["Pencairan ditahan", String(metrics.withdrawalsHeldForReview ?? 0)],
            ["Cleared (false positive)", String(metrics.falsePositiveClears ?? 0)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-card border border-border p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Memuat antrean…</p>
      ) : cases.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border py-10 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-2 text-sm font-medium text-foreground">Tidak ada case aktif</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {cases.map((c) => (
            <li key={c.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{c.teacherName}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_TONE[c.severity] ?? ""}`}>
                      {c.severity}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "RESTRICTED" ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>
                      {c.status === "RESTRICTED" ? "Dibatasi" : "Review"}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.reason}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.signalCount} signal · {c.actionCount} aksi ·{" "}
                    {new Date(c.openedAt).toLocaleString("id-ID")}
                  </p>
                </div>
                <button
                  onClick={() => openDetail(c.id)}
                  className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Detail & Keputusan
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetail(null)} />
          <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl bg-card p-5 text-card-foreground shadow-2xl">
            <h2 className="text-lg font-bold">{detail.teacherName}</h2>
            <p className="text-xs text-muted-foreground">{detail.teacherEmail} · dibuka {new Date(detail.openedAt).toLocaleString("id-ID")}</p>
            <p className="mt-2 text-sm">{detail.reason}</p>

            <h3 className="mt-4 text-sm font-bold">Timeline (append-only)</h3>
            <ol className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1 text-xs">
              {detail.timeline.map((t, i) => (
                <li key={i} className="rounded-lg bg-muted/50 px-3 py-2">
                  <span className="font-semibold text-foreground">{t.action}</span>
                  <span className="text-muted-foreground"> · {t.actor} · {new Date(t.at).toLocaleString("id-ID")}</span>
                  {t.detail && <p className="mt-0.5 text-muted-foreground">{t.detail}</p>}
                </li>
              ))}
            </ol>

            <h3 className="mt-4 text-sm font-bold">Signal</h3>
            <ul className="mt-2 space-y-1 text-xs">
              {detail.signals.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono">{s.signalType}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_TONE[s.severity] ?? ""}`}>{s.severity}</span>
                  <span className="text-muted-foreground">{new Date(s.detectedAt).toLocaleString("id-ID")}</span>
                </li>
              ))}
            </ul>

            <label className="mt-4 block text-sm font-medium">
              Alasan keputusan (wajib)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Jelaskan dasar keputusan ini…"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => decide(detail.id, "CLEAR")}
                disabled={submitting !== null}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" /> Clear
              </button>
              <button
                onClick={() => decide(detail.id, "RESTRICT")}
                disabled={submitting !== null}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-700 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <ShieldOff className="h-4 w-4" /> Batasi Pencairan
              </button>
              <button
                onClick={() => decide(detail.id, "KEEP_REVIEW")}
                disabled={submitting !== null}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-input px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
              >
                <Search className="h-4 w-4" /> Tetap Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
