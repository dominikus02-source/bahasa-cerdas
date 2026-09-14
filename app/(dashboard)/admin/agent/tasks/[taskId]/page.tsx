import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getTaskDetail } from "@/src/agent/persistence/queries";
import { buildTaskReport } from "@/src/agent/worker/report";
import type { AgentPlan } from "@/src/agent/worker/plan";

import {
  approveTaskAction,
  cancelTaskAction,
  rejectTaskAction,
  resumeTaskAction,
  retryTaskAction,
} from "../../actions";
import { ActionButton, KindBadge, ProvenanceChip, StatusBadge } from "../../_components/ui";

export const dynamic = "force-dynamic";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function Facts({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/5 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-slate-500 dark:bg-slate-100/10 dark:text-slate-300">
      {children}
    </span>
  );
}

export default async function AgentTaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!user.isFounder && user.role !== "ADMIN") redirect("/admin");

  const { taskId } = await params;
  const detail = await getTaskDetail(db, taskId);
  if (!detail) notFound();

  // Persisted-rows report (canonical P5 builder — never synthesized in the browser).
  const report = await buildTaskReport({
    prisma: db,
    taskId: detail.task.id,
    attemptId: detail.task.currentAttemptId ?? detail.attempts[detail.attempts.length - 1]?.id ?? detail.task.id,
    outcome: mapStatusToOutcome(detail.task.status),
    plan: null,
    verification: (detail.verification as Parameters<typeof buildTaskReport>[0]["verification"] | null) ?? { status: "NOT_REQUIRED", strategy: "evidence-completeness", summary: "not run" },
    startedTick: Date.now(),
    failureReason: detail.attempts.find((a) => a.error)?.error ?? undefined,
  }).catch(() => null);

  const cancellable = ["PENDING", "RUNNING", "WAITING_APPROVAL", "WAITING_INTELLIGENCE", "VERIFYING"].includes(detail.task.status);

  return (
    <div className="space-y-6">
      {/* Header: identity + lifecycle */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/admin/agent" className="hover:text-slate-600 dark:hover:text-slate-300">← Mission Control</Link>
            <span aria-hidden>·</span>
            <span className="font-mono">{detail.task.id}</span>
          </div>
          <h1 className="mt-1 break-words text-lg font-bold text-slate-900 dark:text-slate-100">{detail.task.instruction}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={detail.task.status} />
            <Facts>tipe {detail.task.intentType}</Facts>
            <Facts>kanal {detail.task.channel}</Facts>
            <Facts>attempt #{detail.task.attemptCount}</Facts>
            <Facts>dibuat {fmt(detail.task.createdAt)}</Facts>
            <Facts>diubah {fmt(detail.task.updatedAt)}</Facts>
          </div>
        </div>

        {/* Lifecycle-appropriate founder actions */}
        <div className="flex flex-wrap items-start gap-2">
          {detail.task.status === "WAITING_APPROVAL" && (
            <>
              <ActionButton kind="approve" taskId={detail.task.id} action={approveTaskAction} />
              <ActionButton kind="reject" taskId={detail.task.id} action={rejectTaskAction} />
            </>
          )}
          {detail.task.status === "WAITING_INTELLIGENCE" && (
            <ActionButton kind="resume" taskId={detail.task.id} action={resumeTaskAction} />
          )}
          {detail.task.status === "FAILED" && (
            <ActionButton kind="retry" taskId={detail.task.id} action={retryTaskAction} />
          )}
          {cancellable && (
            <ActionButton kind="cancel" taskId={detail.task.id} action={cancelTaskAction} />
          )}
        </div>
      </div>

      {/* Verification */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Verifikasi</h2>
        {detail.verification ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <StatusBadge status={detail.verification.status === "PASSED" ? "COMPLETED" : detail.verification.status === "FAILED" ? "FAILED" : "PENDING"} />
            <span className="text-slate-600 dark:text-slate-300">{detail.verification.summary ?? "tanpa ringkasan"}</span>
            {detail.verification.strategy && <Facts>{detail.verification.strategy}</Facts>}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Belum ada verifikasi pada attempt aktif.</p>
        )}
      </section>

      {/* Attempt history */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Riwayat Attempt</h2>
        <div className="mt-3 space-y-2">
          {detail.attempts.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-200">#{a.sequence}</span>
                <StatusBadge status={a.status} />
                <Facts>mulai {fmt(a.startedAt)}</Facts>
                <Facts>selesai {fmt(a.finishedAt)}</Facts>
                {a.workerId && <Facts>worker {a.workerId.slice(0, 18)}…</Facts>}
                <Facts>{a.actionsProposed} aksi diusulkan</Facts>
              </div>
              {a.error && <p className="mt-1.5 break-words text-[11px] text-red-500 dark:text-red-400">{a.error}</p>}
            </div>
          ))}
          {detail.attempts.length === 0 && <p className="text-xs text-slate-400">Belum ada attempt.</p>}
        </div>
      </section>

      {/* Event timeline */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Linimasa Event</h2>
        <ol className="mt-3 space-y-1.5">
          {detail.events.map((e) => (
            <li key={e.seq} className="flex flex-wrap items-baseline gap-x-2 text-xs">
              <span className="w-8 shrink-0 font-mono text-[10px] text-slate-300 dark:text-slate-600">#{e.seq}</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{e.eventType}</span>
              <span className="text-slate-400">{e.previousStatus} → {e.newStatus}</span>
              <span className="text-slate-400">oleh {e.actor}</span>
              <span className="ml-auto text-[10px] text-slate-400">{fmt(e.createdAt)}</span>
            </li>
          ))}
          {detail.events.length === 0 && <p className="text-xs text-slate-400">Belum ada event.</p>}
        </ol>
      </section>

      {/* Approvals */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Approval</h2>
        <div className="mt-3 space-y-2">
          {detail.approvals.map((a) => (
            <div key={a.approvalId} className="rounded-xl border border-slate-100 p-3 text-xs dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={a.status} />
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{a.toolName}</span>
                <Facts>diterbitkan {fmt(a.issuedAt)}</Facts>
                <Facts>kedaluwarsa {fmt(a.expiresAt)}</Facts>
                {a.usedAt && <Facts>dipakai {fmt(a.usedAt)}</Facts>}
              </div>
              <p className="mt-1 break-all font-mono text-[10px] text-slate-400">inputHash {a.inputHash}</p>
              {a.inputSummary && <p className="mt-1 break-words text-[11px] text-slate-500 dark:text-slate-400">input: {a.inputSummary}</p>}
            </div>
          ))}
          {detail.approvals.length === 0 && <p className="text-xs text-slate-400">Belum ada approval.</p>}
        </div>
      </section>

      {/* Tool executions */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Eksekusi Tool</h2>
        <div className="mt-3 space-y-2">
          {detail.executions.map((e) => (
            <div key={e.executionId} className="rounded-xl border border-slate-100 p-3 text-xs dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={e.status === "SUCCEEDED" ? "COMPLETED" : e.status === "FAILED" ? "FAILED" : "RUNNING"} />
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{e.toolName}</span>
                <Facts>{fmt(e.startedAt)}</Facts>
                {e.durationMs !== null && <Facts>{e.durationMs}ms</Facts>}
                {e.errorCode && <span className="rounded-md bg-red-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-600 dark:bg-red-950/60 dark:text-red-400">{e.errorCode}</span>}
              </div>
              {e.outputMeta && (
                <pre className="mt-1.5 max-h-32 overflow-auto rounded-lg bg-slate-50 p-2 font-mono text-[10px] leading-relaxed text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  {JSON.stringify(e.outputMeta, null, 2).slice(0, 800)}
                </pre>
              )}
            </div>
          ))}
          {detail.executions.length === 0 && <p className="text-xs text-slate-400">Belum ada eksekusi tool.</p>}
        </div>
      </section>

      {/* Evidence inspector */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Evidence</h2>
        <div className="mt-3 space-y-2">
          {detail.evidence.map((e) => {
            const factBacked = e.kind === "FACT" && e.executionId !== null;
            const execution = e.executionId ? detail.executions.find((x) => x.executionId === e.executionId) : undefined;
            return (
              <div key={e.evidenceId} className="rounded-xl border border-slate-100 p-3 text-xs dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <KindBadge kind={e.kind} />
                  <ProvenanceChip factBacked={factBacked} />
                  <span className="text-slate-600 dark:text-slate-300">sumber: <span className="font-mono">{e.source}</span></span>
                  <Facts>{fmt(e.createdAt)}</Facts>
                  <Facts>keyakinan {e.confidence}</Facts>
                </div>
                <p className="mt-1.5 break-words text-slate-700 dark:text-slate-200">{e.claim}</p>
                {e.kind === "FACT" && e.executionId && execution && (
                  <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-2 text-[11px] dark:border-emerald-900 dark:bg-emerald-950/40">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">Rantai provenance FACT</p>
                    <p className="mt-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      FACT → ToolExecution {execution.executionId} → {execution.toolName} → {execution.status}
                      {execution.durationMs !== null ? ` (${execution.durationMs}ms)` : ""}
                    </p>
                  </div>
                )}
                {e.kind === "FACT" && !e.executionId && (
                  <p className="mt-1.5 text-[11px] font-semibold text-red-500 dark:text-red-400">
                    ANOMALI: FACT tanpa executionId — melanggar integritas P4.1. Jangan dipercaya sebagai tool-backed.
                  </p>
                )}
              </div>
            );
          })}
          {detail.evidence.length === 0 && <p className="text-xs text-slate-400">Belum ada evidence.</p>}
        </div>
      </section>

      {/* Report (persisted rows, canonical builder) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Laporan Task</h2>
        {report ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs md:grid-cols-3">
            <div><dt className="text-[10px] uppercase tracking-wider text-slate-400">Outcome</dt><dd className="mt-0.5 text-slate-700 dark:text-slate-200">{report.outcome}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider text-slate-400">Aksi diusulkan</dt><dd className="mt-0.5 text-slate-700 dark:text-slate-200">{report.actionsProposed}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider text-slate-400">Aksi dieksekusi</dt><dd className="mt-0.5 text-slate-700 dark:text-slate-200">{report.actionsExecuted}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider text-slate-400">Berhasil</dt><dd className="mt-0.5 text-emerald-600 dark:text-emerald-400">{report.actionsSucceeded}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider text-slate-400">Ditolak</dt><dd className="mt-0.5 text-red-500 dark:text-red-400">{report.actionsRejected}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider text-slate-400">Evidence FACT</dt><dd className="mt-0.5 text-slate-700 dark:text-slate-200">{report.factEvidenceCount}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider text-slate-400">Verifikasi</dt><dd className="mt-0.5 text-slate-700 dark:text-slate-200">{report.verification.status}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-wider text-slate-400">Peringatan</dt><dd className="mt-0.5 text-amber-600 dark:text-amber-400">{report.warnings.length}</dd></div>
            {report.failureReason && (
              <div className="col-span-2 md:col-span-3">
                <dt className="text-[10px] uppercase tracking-wider text-slate-400">Alasan gagal</dt>
                <dd className="mt-0.5 break-words text-red-500 dark:text-red-400">{report.failureReason}</dd>
              </div>
            )}
            {report.warnings.length > 0 && (
              <ul className="col-span-2 list-disc pl-4 text-[11px] text-amber-600 md:col-span-3 dark:text-amber-400">
                {report.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </dl>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Tidak ada laporan tersimpan.</p>
        )}
      </section>
    </div>
  );
}

function mapStatusToOutcome(status: string): "COMPLETED" | "FAILED" | "WAITING_APPROVAL" | "WAITING_INTELLIGENCE" | "CANCELLED" {
  switch (status) {
    case "COMPLETED":
      return "COMPLETED";
    case "FAILED":
      return "FAILED";
    case "WAITING_APPROVAL":
      return "WAITING_APPROVAL";
    case "WAITING_INTELLIGENCE":
      return "WAITING_INTELLIGENCE";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "FAILED";
  }
}