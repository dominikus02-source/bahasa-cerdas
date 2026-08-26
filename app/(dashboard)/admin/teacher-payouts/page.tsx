"use client";

/**
 * P8E §17 — Admin Control Center (founder-only).
 * Menampilkan state keamanan NYATA — tidak ada UI yang memalsukan status.
 * Aksi pilot membutuhkan alasan dan diaudit.
 */

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Pause, Play, Plus, X } from "lucide-react";

interface ControlData {
  safetyState: "DISABLED" | "PILOT" | "PRODUCTION" | "EMERGENCY_STOP";
  safetyDetail: string;
  config: Record<string, unknown>;
  exposure: {
    pilotDailyTotal: number;
    globalDailyTotal: number;
    pilotGlobalLimit: number;
    globalDailyLimit: number;
  };
  pilot: { teacherIds: string[]; paused: boolean };
  founderGate: {
    autoChecksPassed: boolean;
    autoPass: number;
    autoFail: number;
    manualRequired: number;
    items: Array<{ id: string; label: string; status: string; detail: string }>;
  };
  alerts: Array<{ code: string; severity: string; detail: string }>;
}

interface PreCanaryData {
  decision: "GO_FOR_REAL_MONEY_CANARY" | "NOT_YET";
  items: Array<{ id: string; category: string; label: string; status: string; source: string; detail: string }>;
  automaticFailures: string[];
  manualPending: string[];
  founderDecision: { state: string; approverEmail: string | null; decidedAt: string | null; notes: string | null };
  realMoneyEnabled: boolean;
  providerEnabled: boolean;
  provider: string;
  killSwitchActive: boolean;
}

interface CanaryData {
  run: {
    canaryRunId: string;
    selectedTeacherId: string | null;
    selectedWithdrawalId: string | null;
    intendedGrossAmount: number | null;
    intendedDestinationSnapshot: string | null;
    provider: string | null;
    executionEnvironment: string | null;
    receiptStatus: string | null;
    finalStatus: string;
    stopReason: string | null;
    reviewNotes: string | null;
    startedAt: string | null;
    completedAt: string | null;
  };
  preflight: {
    blocked: boolean;
    blockingReason: string | null;
    checks: Array<{ id: string; label: string; passed: boolean; blocking: boolean; reason: string }>;
  } | null;
}

interface XenditReadinessData {
  config: {
    overall: string;
    fields: Array<{ key: string; label: string; status: string; present: boolean; detail: string }>;
  };
  evidence: {
    updatedAt: string | null;
    items: Array<{ category: string; status: string; verifiedAt: string | null; verifiedBy: string | null; evidenceReference: string | null; notes: string | null }>;
  };
  readiness: { ready: boolean; blocks: Array<{ id: string; label: string; passed: boolean; reason: string }> };
  confirmation: { confirmed: boolean; founderEmail: string | null; timestamp: string | null; approvalReference: string | null; canaryTeacherId: string | null; withdrawalId: string | null };
  pilotTeacher: { ready: boolean; checks: Array<{ id: string; label: string; passed: boolean; reason: string }> } | null;
  snapshot: {
    teacher: { maskedIdentity: string };
    commission: number | null;
    withdrawal: { id: string | null; amount: number | null };
    destination: string | null;
    provider: string;
    providerFee: string;
    teacherReceives: number | null;
    risk: string;
    exposureRemaining: number | null;
    dailyGlobalExposure: number;
    killSwitch: boolean;
    pilot: boolean;
    founderGateReady: boolean;
  } | null;
}

const STATE_TONE: Record<string, string> = {
  DISABLED: "bg-muted text-muted-foreground",
  PILOT: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  PRODUCTION: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  EMERGENCY_STOP: "bg-red-700 text-white",
};

export default function TeacherPayoutsPage() {
  const [data, setData] = useState<ControlData | null>(null);
  const [preCanary, setPreCanary] = useState<PreCanaryData | null>(null);
  const [canary, setCanary] = useState<CanaryData | null>(null);
  const [xenditReady, setXenditReady] = useState<XenditReadinessData | null>(null);
  const [xenditTeacherId, setXenditTeacherId] = useState("");
  const [evidenceDraft, setEvidenceDraft] = useState<Record<string, { status: string; reference: string; notes: string }>>({});
  const [reason, setReason] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [canaryNotes, setCanaryNotes] = useState("");
  const [canaryPrepare, setCanaryPrepare] = useState({ teacherId: "", withdrawalId: "", evidence: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadXendit = useCallback(async () => {
    try {
      const params = xenditTeacherId ? `?teacherId=${encodeURIComponent(xenditTeacherId)}` : "";
      const res = await fetch(`/api/admin/teacher-commissions/xendit-readiness${params}`);
      if (res.ok) setXenditReady(await res.json());
    } catch {
      // abaikan
    }
  }, [xenditTeacherId]);

  const load = useCallback(async () => {
    try {
      const [res, preRes, canRes] = await Promise.all([
        fetch("/api/admin/teacher-commissions/payout-control"),
        fetch("/api/admin/teacher-commissions/pre-canary"),
        fetch("/api/admin/teacher-commissions/canary"),
      ]);
      if (res.ok) setData(await res.json());
      if (preRes.ok) setPreCanary(await preRes.json());
      if (canRes.ok) setCanary(await canRes.json());
      await loadXendit();
    } catch {
      // abaikan
    }
  }, [loadXendit]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: string, extra?: Record<string, string>) => {
    if (!reason.trim()) {
      setMessage("Alasan wajib diisi.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/teacher-commissions/payout-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason, ...extra }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(d.error ?? "Aksi gagal.");
      } else {
        setReason("");
        setTeacherId("");
        setMessage(`Aksi ${action} berhasil (teraudit).`);
        await load();
      }
    } catch {
      setMessage("Aksi gagal.");
    } finally {
      setBusy(false);
    }
  };

  const decideCanary = async (state: string) => {
    if (!decisionNotes.trim()) {
      setMessage("Catatan keputusan wajib diisi.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/teacher-commissions/pre-canary/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, notes: decisionNotes }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(d.error ?? "Keputusan gagal dicatat.");
      } else {
        setDecisionNotes("");
        setMessage(`Keputusan ${state} tercatat (teraudit).`);
        await load();
      }
    } catch {
      setMessage("Keputusan gagal dicatat.");
    } finally {
      setBusy(false);
    }
  };

  const canaryAct = async (action: string, extra?: Record<string, unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/teacher-commissions/canary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: canaryNotes, ...extra }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(d.error ?? "Aksi canary gagal.");
      } else {
        setCanaryNotes("");
        setMessage(`Aksi ${action} berhasil (teraudit).`);
        await load();
      }
    } catch {
      setMessage("Aksi canary gagal.");
    } finally {
      setBusy(false);
    }
  };

  const recordEvidence = async (category: string, status: string, reference: string, notes: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/teacher-commissions/xendit-readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RECORD_EVIDENCE", category, status, evidenceReference: reference, notes }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(d.error ?? "Bukti gagal dicatat.");
      } else {
        setMessage(`Bukti ${category} → ${status} tercatat (teraudit).`);
        await loadXendit();
      }
    } catch {
      setMessage("Bukti gagal dicatat.");
    } finally {
      setBusy(false);
    }
  };

  const fmt = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Payout Kontrol</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control plane keamanan uang — state diturunkan dari sistem, bukan diklaim UI.
        </p>
      </header>

      {data && (
        <>
          {/* Safety state */}
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${STATE_TONE[data.safetyState] ?? ""}`}>
                {data.safetyState}
              </span>
              <p className="text-sm text-muted-foreground">{data.safetyDetail}</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Provider: {String(data.config.provider)} · realMoney: {String(data.config.realMoneyEnabled)} ·
              providerEnabled: {String(data.config.providerEnabled)} · killSwitch: {String(data.config.killSwitchActive)}
            </p>
          </div>

          {/* Exposure */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ["Exposure pilot hari ini", fmt(data.exposure.pilotDailyTotal), fmt(data.exposure.pilotGlobalLimit)],
              ["Exposure global hari ini", fmt(data.exposure.globalDailyTotal), fmt(data.exposure.globalDailyLimit)],
              ["Guru pilot", String(data.pilot.teacherIds.length), data.pilot.paused ? "DIPAU" : "aktif"],
              ["Min/Max per penarikan", `${fmt(Number(data.config.minimumAmount))}`, fmt(Number(data.config.maximumAmount))],
            ].map(([label, value, sub]) => (
              <div key={String(label)} className="rounded-xl bg-card border border-border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>

          {/* Alerts */}
          {data.alerts.length > 0 && (
            <div className="rounded-2xl bg-card border border-border p-4">
              <h2 className="text-sm font-bold text-foreground">Alert aktif</h2>
              <ul className="mt-2 space-y-1.5">
                {data.alerts.map((a) => (
                  <li key={a.code} className="flex items-start gap-2 text-sm">
                    <ShieldAlert className={`mt-0.5 h-4 w-4 shrink-0 ${a.severity === "CRITICAL" ? "text-red-500" : "text-amber-500"}`} />
                    <span className="text-muted-foreground">{a.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Founder gate */}
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-foreground">Founder Money Gate</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${data.founderGate.autoChecksPassed ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"}`}>
                auto {data.founderGate.autoPass} PASS · {data.founderGate.autoFail} FAIL · {data.founderGate.manualRequired} MANUAL
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {data.founderGate.items.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.status === "PASS" ? "bg-emerald-500" : item.status === "FAIL" ? "bg-red-500" : "bg-amber-500"}`} />
                  <span className="min-w-0">
                    <span className="text-foreground">{item.label}</span>{" "}
                    <span className={`text-xs ${item.status === "PASS" ? "text-emerald-600 dark:text-emerald-400" : item.status === "FAIL" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {item.status === "MANUAL" ? "MANUAL VERIFICATION REQUIRED" : item.status}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── P8F: PRE-CANARY GO/NO-GO ── */}
          {preCanary && (
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground">Pra-Canary GO/NO-GO (P8F)</h2>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    preCanary.decision === "GO_FOR_REAL_MONEY_CANARY"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  }`}
                >
                  {preCanary.decision === "GO_FOR_REAL_MONEY_CANARY" ? "GO" : "NOT YET"}
                </span>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Keputusan Founder:{" "}
                <span className="font-semibold text-foreground">{preCanary.founderDecision.state}</span>
                {preCanary.founderDecision.decidedAt
                  ? ` · ${preCanary.founderDecision.approverEmail ?? "founder"} · ${new Date(preCanary.founderDecision.decidedAt).toLocaleString("id-ID")}`
                  : ""}
                {preCanary.founderDecision.notes && (
                  <span className="block">Catatan: {preCanary.founderDecision.notes}</span>
                )}
              </p>

              <div className="mt-3 space-y-3">
                {(["SYSTEM", "PROVIDER", "PILOT", "OPERATIONS", "FINANCE"] as const).map((cat) => {
                  const items = preCanary.items.filter((i) => i.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat}</p>
                      <ul className="mt-1 space-y-1">
                        {items.map((item) => (
                          <li key={item.id} className="flex items-start gap-2 text-sm">
                            <span
                              className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                                item.status === "PASS"
                                  ? "bg-emerald-500"
                                  : item.status === "FAIL"
                                    ? "bg-red-500"
                                    : item.status === "NOT_CONFIGURED"
                                      ? "bg-slate-400"
                                      : "bg-amber-500"
                              }`}
                            />
                            <span className="min-w-0">
                              <span className="text-foreground">{item.label}</span>{" "}
                              <span
                                className={`text-xs ${
                                  item.status === "PASS"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : item.status === "FAIL"
                                      ? "text-red-600 dark:text-red-400"
                                      : item.status === "NOT_CONFIGURED"
                                        ? "text-muted-foreground"
                                        : "text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {item.status === "MANUAL_VERIFICATION_REQUIRED" ? "MANUAL VERIFICATION REQUIRED" : item.status}
                              </span>
                              <span className="block text-xs text-muted-foreground">{item.detail}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              {/* Keputusan Founder */}
              <div className="mt-4 rounded-xl bg-muted/40 p-3">
                <p className="text-xs font-semibold text-foreground">Catat Keputusan Founder (hanya founder)</p>
                <textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan/alasan keputusan…"
                  className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => decideCanary("APPROVED_FOR_CANARY")}
                    disabled={busy}
                    className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    APPROVE CANARY
                  </button>
                  <button
                    onClick={() => decideCanary("NOT_APPROVED")}
                    disabled={busy}
                    className="rounded-lg border border-input px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    NOT APPROVED
                  </button>
                  <button
                    onClick={() => decideCanary("CANARY_COMPLETED")}
                    disabled={busy}
                    className="rounded-lg border border-input px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    CANARY COMPLETED
                  </button>
                  <button
                    onClick={() => decideCanary("CANARY_FAILED")}
                    disabled={busy}
                    className="rounded-lg border border-input px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    CANARY FAILED
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── P8G: CANARY EXECUTION ── */}
          {canary && (
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground">Canary Pertama (P8G)</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    canary.run.finalStatus === "SUCCESS"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : canary.run.finalStatus === "STOPPED" || canary.run.finalStatus === "FAILED"
                        ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  }`}
                >
                  {canary.run.finalStatus}
                </span>
              </div>

              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                <p className="text-muted-foreground">
                  Run: <span className="font-mono text-foreground">{canary.run.canaryRunId || "—"}</span>
                </p>
                <p className="text-muted-foreground">
                  Guru: <span className="font-mono text-foreground">{canary.run.selectedTeacherId ?? "—"}</span>
                </p>
                <p className="text-muted-foreground">
                  Withdrawal: <span className="font-mono text-foreground">{canary.run.selectedWithdrawalId ?? "—"}</span>
                </p>
                <p className="text-muted-foreground">
                  Jumlah: <span className="font-semibold text-foreground">{canary.run.intendedGrossAmount ? `Rp${canary.run.intendedGrossAmount.toLocaleString("id-ID")}` : "—"}</span>
                </p>
                <p className="text-muted-foreground">
                  Destinasi: <span className="text-foreground">{canary.run.intendedDestinationSnapshot ?? "—"}</span>
                </p>
                <p className="text-muted-foreground">
                  Provider: <span className="text-foreground">{canary.run.executionEnvironment ?? canary.run.provider ?? "—"}</span>
                </p>
                {canary.run.receiptStatus && (
                  <p className="text-muted-foreground">
                    Konfirmasi guru: <span className="font-semibold text-foreground">{canary.run.receiptStatus}</span>
                  </p>
                )}
              </div>

              {/* Pre-flight */}
              {canary.preflight && (
                <div className="mt-3 rounded-xl bg-muted/40 p-3">
                  <p className={`text-xs font-bold ${canary.preflight.blocked ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    PRE-FLIGHT: {canary.preflight.blocked ? "BLOCKED" : "PASS"}
                  </p>
                  {canary.preflight.blockingReason && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{canary.preflight.blockingReason}</p>
                  )}
                  <ul className="mt-2 space-y-1">
                    {canary.preflight.checks.map((c) => (
                      <li key={c.id} className="flex items-start gap-2 text-xs">
                        <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${c.passed ? "bg-emerald-500" : c.blocking ? "bg-red-500" : "bg-amber-500"}`} />
                        <span className="text-muted-foreground">
                          <span className={c.passed ? "text-foreground" : ""}>{c.label}</span> — {c.reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Aksi operator */}
              <div className="mt-3 space-y-2">
                {canary.run.finalStatus === "PREPARING" && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      value={canaryPrepare.teacherId}
                      onChange={(e) => setCanaryPrepare({ ...canaryPrepare, teacherId: e.target.value })}
                      placeholder="teacherId"
                      className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono"
                    />
                    <input
                      value={canaryPrepare.withdrawalId}
                      onChange={(e) => setCanaryPrepare({ ...canaryPrepare, withdrawalId: e.target.value })}
                      placeholder="withdrawalId"
                      className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono"
                    />
                    <input
                      value={canaryPrepare.evidence}
                      onChange={(e) => setCanaryPrepare({ ...canaryPrepare, evidence: e.target.value })}
                      placeholder="Bukti kesiapan provider (catatan, bukan secret)"
                      className="rounded-lg border border-input bg-background px-3 py-2 text-xs"
                    />
                  </div>
                )}

                <textarea
                  value={canaryNotes}
                  onChange={(e) => setCanaryNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan aksi canary…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
                />

                <div className="flex flex-wrap gap-2">
                  {canary.run.finalStatus === "PREPARING" && (
                    <button
                      onClick={() => canaryAct("PREPARE", {
                        teacherId: canaryPrepare.teacherId,
                        withdrawalId: canaryPrepare.withdrawalId,
                        providerReadinessEvidence: canaryPrepare.evidence,
                      })}
                      disabled={busy}
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      PREPARE (→ READY)
                    </button>
                  )}
                  {canary.run.finalStatus === "READY" && (
                    <button
                      onClick={() => canaryAct("START")}
                      disabled={busy}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      START (→ EXECUTING)
                    </button>
                  )}
                  {canary.run.finalStatus === "EXECUTING" && (
                    <button
                      onClick={() => canaryAct("MARK_AWAITING_RECEIPT")}
                      disabled={busy}
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      PROVIDER PAID (→ AWAITING RECEIPT)
                    </button>
                  )}
                  {canary.run.finalStatus === "AWAITING_RECEIPT_CONFIRMATION" && (
                    <>
                      <button
                        onClick={() => canaryAct("CONFIRM_RECEIPT", { receiptStatus: "CONFIRMED_RECEIVED" })}
                        disabled={busy}
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        GURU KONFIRMASI TERIMA
                      </button>
                      <button
                        onClick={() => canaryAct("CONFIRM_RECEIPT", { receiptStatus: "NOT_YET_RECEIVED" })}
                        disabled={busy}
                        className="rounded-lg border border-input px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        BELUM TERIMA
                      </button>
                      <button
                        onClick={() => canaryAct("CONFIRM_RECEIPT", { receiptStatus: "UNABLE_TO_CONFIRM" })}
                        disabled={busy}
                        className="rounded-lg border border-input px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        TIDAK BISA KONFIRMASI
                      </button>
                    </>
                  )}
                  {canary.run.finalStatus === "RECONCILING" && (
                    <>
                      <button
                        onClick={() => canaryAct("COMPLETE", { result: "SUCCESS" })}
                        disabled={busy}
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        CANARY SUCCESS
                      </button>
                      <button
                        onClick={() => canaryAct("COMPLETE", { result: "FAILED" })}
                        disabled={busy}
                        className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        CANARY FAILED
                      </button>
                    </>
                  )}
                  {!["SUCCESS", "FAILED", "STOPPED"].includes(canary.run.finalStatus) && (
                    <button
                      onClick={() => canaryAct("STOP")}
                      disabled={busy}
                      className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
                    >
                      STOP (evidence preserved)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── P8H: XENDIT READINESS BRIDGE ── */}
          {xenditReady && (
            <div className="rounded-2xl bg-card border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground">Xendit Production Readiness (P8H)</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    xenditReady.readiness.ready
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  }`}
                >
                  {xenditReady.readiness.ready ? "XENDIT_PRODUCTION_READY" : "NOT READY"}
                </span>
              </div>

              {/* Konfigurasi — tanpa nilai secret */}
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                {xenditReady.config.fields.map((f) => (
                  <p key={f.key} className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        f.status === "CONFIGURED" ? "bg-emerald-500" : f.status === "INVALID" ? "bg-red-500" : "bg-amber-500"
                      }`}
                    />
                    {f.label}: <span className="font-semibold text-foreground">{f.status}</span> ({f.detail})
                  </p>
                ))}
              </div>

              {/* Readiness blocks */}
              <ul className="mt-2 space-y-1 text-xs">
                {xenditReady.readiness.blocks.map((b) => (
                  <li key={b.id} className="flex items-start gap-2 text-muted-foreground">
                    <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${b.passed ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span>{b.label} — {b.reason}</span>
                  </li>
                ))}
              </ul>

              {/* Evidence — 9 kategori eksternal */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Bukti eksternal (tanpa secret)
                </p>
                {xenditReady.evidence.items.map((e) => {
                  const draft = evidenceDraft[e.category] ?? { status: e.status, reference: e.evidenceReference ?? "", notes: "" };
                  return (
                    <div key={e.category} className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-2 text-xs">
                      <span className={`w-44 shrink-0 font-mono ${e.status === "VERIFIED" ? "text-emerald-600 dark:text-emerald-400" : e.status === "REJECTED" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                        {e.category}
                      </span>
                      <select
                        value={draft.status}
                        onChange={(ev) => setEvidenceDraft({ ...evidenceDraft, [e.category]: { ...draft, status: ev.target.value } })}
                        className="rounded border border-input bg-background px-2 py-1 text-xs"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                      <input
                        value={draft.reference}
                        onChange={(ev) => setEvidenceDraft({ ...evidenceDraft, [e.category]: { ...draft, reference: ev.target.value } })}
                        placeholder="Referensi bukti (dok/URL — bukan secret)"
                        className="min-w-40 flex-1 rounded border border-input bg-background px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => recordEvidence(e.category, draft.status, draft.reference, draft.notes)}
                        disabled={busy}
                        className="rounded bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        Catat
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Pilot teacher readiness + snapshot */}
              <div className="mt-4 grid gap-2 sm:grid-cols-[240px_auto]">
                <input
                  value={xenditTeacherId}
                  onChange={(e) => setXenditTeacherId(e.target.value)}
                  onBlur={() => loadXendit()}
                  placeholder="teacherId (untuk cek + snapshot)"
                  className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono"
                />
                <button
                  onClick={() => loadXendit()}
                  className="justify-self-start rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Muat
                </button>
              </div>

              {xenditReady.pilotTeacher && (
                <ul className="mt-2 space-y-1 text-xs">
                  {xenditReady.pilotTeacher.checks.map((c) => (
                    <li key={c.id} className="flex items-start gap-2 text-muted-foreground">
                      <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${c.passed ? "bg-emerald-500" : "bg-red-500"}`} />
                      <span>{c.label} — {c.reason}</span>
                    </li>
                  ))}
                </ul>
              )}

              {xenditReady.snapshot && (
                <div className="mt-3 grid gap-x-6 gap-y-1 rounded-xl bg-muted/40 p-3 text-xs sm:grid-cols-2">
                  {[
                    ["Guru", xenditReady.snapshot.teacher.maskedIdentity],
                    ["Komisi tersedia", xenditReady.snapshot.commission != null ? `Rp${xenditReady.snapshot.commission.toLocaleString("id-ID")}` : "—"],
                    ["Withdrawal", xenditReady.snapshot.withdrawal.amount != null ? `Rp${xenditReady.snapshot.withdrawal.amount.toLocaleString("id-ID")}` : "—"],
                    ["Destinasi", xenditReady.snapshot.destination ?? "—"],
                    ["Provider", xenditReady.snapshot.provider],
                    ["Biaya pencairan", xenditReady.snapshot.providerFee],
                    ["Diterima guru", xenditReady.snapshot.teacherReceives != null ? `Rp${xenditReady.snapshot.teacherReceives.toLocaleString("id-ID")}` : "—"],
                    ["Risk", xenditReady.snapshot.risk],
                    ["Sisa exposure pilot", xenditReady.snapshot.exposureRemaining != null ? `Rp${xenditReady.snapshot.exposureRemaining.toLocaleString("id-ID")}` : "—"],
                    ["Exposure global hari ini", `Rp${xenditReady.snapshot.dailyGlobalExposure.toLocaleString("id-ID")}`],
                    ["Kill switch", xenditReady.snapshot.killSwitch ? "ON" : "OFF"],
                    ["Pilot", xenditReady.snapshot.pilot ? "ON" : "OFF"],
                    ["Founder Gate", xenditReady.snapshot.founderGateReady ? "READY" : "NOT READY"],
                  ].map(([k, v]) => (
                    <p key={String(k)} className="text-muted-foreground">
                      {k}: <span className="font-semibold text-foreground">{v}</span>
                    </p>
                  ))}
                </div>
              )}

              {/* Konfirmasi Founder */}
              <div className="mt-4 rounded-xl bg-muted/40 p-3 text-xs">
                <p className="font-semibold text-foreground">
                  Konfirmasi Founder: {xenditReady.confirmation.confirmed ? "TERCATAT" : "BELUM"}
                </p>
                {xenditReady.confirmation.confirmed && (
                  <p className="mt-1 text-muted-foreground">
                    {xenditReady.confirmation.founderEmail} · {new Date(xenditReady.confirmation.timestamp ?? "").toLocaleString("id-ID")} · ref {xenditReady.confirmation.approvalReference}
                  </p>
                )}
                <p className="mt-2 italic text-muted-foreground">
                  Salin persis teks ini dan kirim via API CONFIRM (bukan sekadar klik):
                </p>
                <p className="mt-1 rounded bg-background p-2 font-mono">
                  I confirm that the Xendit production money rail has been verified and I authorize the first controlled real-money canary.
                </p>
              </div>
            </div>
          )}

          {/* ── Pilot management ── */}
          <div className="rounded-2xl bg-card border border-border p-4">
            <h2 className="text-sm font-bold text-foreground">Kelola Pilot</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.pilot.teacherIds.length === 0 && (
                <p className="text-xs text-muted-foreground">Belum ada guru pilot terdaftar.</p>
              )}
              {data.pilot.teacherIds.map((id) => (
                <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-mono">
                  {id.slice(0, 12)}…
                  <button
                    onClick={() => act("PILOT_REMOVE_TEACHER", { teacherId: id })}
                    aria-label={`Hapus guru pilot ${id}`}
                    className="text-muted-foreground hover:text-danger"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                placeholder="User.id guru (untuk tambah pilot)"
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
              />
              <button
                onClick={() => act("PILOT_ADD_TEACHER", { teacherId })}
                disabled={busy || !teacherId.trim()}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                <Plus className="h-4 w-4" /> Tambah Pilot
              </button>
            </div>

            <div className="mt-2 flex gap-2">
              <button
                onClick={() => act(data.pilot.paused ? "PILOT_RESUME" : "PILOT_PAUSE")}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-input px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40"
              >
                {data.pilot.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {data.pilot.paused ? "Lanjutkan Pilot" : "Pause Pilot"}
              </button>
            </div>

            <label className="mt-3 block text-sm">
              <span className="font-medium text-foreground">Alasan (wajib untuk setiap aksi)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="Jelaskan alasan…"
              />
            </label>
            {message && (
              <p role="status" className="mt-2 text-sm text-muted-foreground">
                {message}
              </p>
            )}
          </div>
        </>
      )}

      {!data && (
        <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-4 text-sm text-muted-foreground">
          <ShieldCheck className="h-5 w-5" />
          Memuat control plane…
        </div>
      )}
    </div>
  );
}
