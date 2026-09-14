import Link from "next/link";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { listPendingApprovals, listAgentTasks } from "@/src/agent/persistence/queries";

import { approveTaskAction, rejectTaskAction } from "../actions";
import { ActionButton, StatusBadge } from "../_components/ui";

export const dynamic = "force-dynamic";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function AgentApprovalsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!user.isFounder && user.role !== "ADMIN") redirect("/admin");

  const [pending, parkedPage] = await Promise.all([
    listPendingApprovals(db, { limit: 50 }),
    listAgentTasks(db, { status: "WAITING_APPROVAL", pageSize: 50 }),
  ]);

  // Tasks parked at WAITING_APPROVAL whose gating action was recorded as a
  // FAILED APPROVAL_REQUIRED execution (the executor does not create an
  // approval row on rejection) — approve reads the binding from that row.
  const withPendingRow = new Set(pending.map((p) => p.taskId));
  const parkedWithoutRow = parkedPage.tasks.filter((t) => !withPendingRow.has(t.id));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/agent" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">← Mission Control</Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Antrean Persetujuan</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Approval terikat (task, attempt, tool, inputHash), kedaluwarsa, dan sekali-pakai. Server memanggil layanan persetujuan kanonik — UI tidak pernah menerapkan semantik approval.
        </p>
      </div>

      {/* Canonical PENDING approval rows */}
      {pending.length === 0 && parkedWithoutRow.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/90">
          Tidak ada approval yang menunggu keputusan.
        </div>
      )}

      {pending.map((a) => {
        const expired = new Date(a.expiresAt).getTime() <= Date.now();
        return (
          <div key={a.approvalId} className="rounded-2xl border border-amber-200 bg-white p-5 dark:border-amber-800 dark:bg-slate-800/90">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={a.status} />
                  <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">{a.toolName}</span>
                  {expired && (
                    <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/60 dark:text-red-400">KEDALUWARSA</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Task{" "}
                  <Link href={`/admin/agent/tasks/${a.taskId}`} className="font-mono text-blue-600 hover:underline dark:text-blue-400">
                    {a.taskId.slice(0, 14)}…
                  </Link>{" "}
                  · attempt <span className="font-mono">{a.attemptId.slice(0, 12)}…</span> · diterbitkan {fmt(a.issuedAt)} · kedaluwarsa {fmt(a.expiresAt)}
                </p>
                <p className="mt-1.5 break-all font-mono text-[10px] text-slate-400">inputHash {a.inputHash}</p>
                {a.inputSummary && (
                  <p className="mt-1 break-words text-[11px] text-slate-600 dark:text-slate-300">
                    Input: <span className="font-mono">{a.inputSummary}</span>
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-start gap-2">
                <ActionButton kind="approve" taskId={a.taskId} action={approveTaskAction} disabled={expired} />
                <ActionButton kind="reject" taskId={a.taskId} action={rejectTaskAction} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Parked tasks awaiting approval decision (binding from persisted execution) */}
      {parkedWithoutRow.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Task terparkir (WAITING_APPROVAL) — keputusan mengikat pada eksekusi tercatat
          </h2>
          {parkedWithoutRow.map((t) => (
            <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/agent/tasks/${t.id}`} className="block truncate text-sm font-medium text-slate-800 hover:underline dark:text-slate-200">
                    {t.instructionPreview}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t.intentType} · dibuat {fmt(t.createdAt)} · attempt #{t.attemptCount}
                  </p>
                  {t.lastEvent && (
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      {t.lastEvent.eventType} oleh {t.lastEvent.actor}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  <ActionButton kind="approve" taskId={t.id} action={approveTaskAction} />
                  <ActionButton kind="reject" taskId={t.id} action={rejectTaskAction} />
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
