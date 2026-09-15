import Link from "next/link";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  getAgentSummary,
  getWorkerHealthView,
  listAgentTasks,
  listWaitingIntelligence,
  CANONICAL_TASK_STATUSES,
} from "@/src/agent/persistence/queries";
import { AgentTaskTable } from "./_components/task-table";
import { WorkerHealthCard } from "./_components/worker-health-card";
import { StatusBadge } from "./_components/ui";


export default async function AgentControlCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cursor?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!user.isFounder && user.role !== "ADMIN") redirect("/admin");

  const params = await searchParams;
  const statusFilter = params.status;
  const cursor = params.cursor;

  const [summary, page, waiting, health] = await Promise.all([
    getAgentSummary(db),
    listAgentTasks(db, { status: statusFilter, cursor, pageSize: 25 }),
    listWaitingIntelligence(db, { limit: 8 }),
    getWorkerHealthView(db),
  ]);

  const statusHref = (s?: string) => `/admin/agent${s ? `?status=${encodeURIComponent(s)}` : ""}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">BC Agent — Mission Control</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Control plane Founder untuk runtime BC Agent (P1–P5). Database adalah sumber kebenaran; semua mutasi melalui layanan kanonik.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/agent/approvals"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
          >
            Antrean Persetujuan{summary.pendingApprovals > 0 ? ` · ${summary.pendingApprovals}` : ""}
          </Link>
          <Link
            href="/admin/agent/telegram"
            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
          >
            Telegram Binding
          </Link>
        </div>
      </div>

      {/* 1. Agent status summary */}
      <section aria-label="Ringkasan status" className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {(["RUNNING", "WAITING_APPROVAL", "WAITING_INTELLIGENCE", "VERIFYING", "PENDING", "FAILED"] as const).map((s) => (
          <Link
            key={s}
            href={statusHref(s)}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/90 dark:hover:border-slate-600"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{s.replace(/_/g, " ")}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{summary.byStatus[s] ?? 0}</p>
          </Link>
        ))}
      </section>

      {/* 2. Attention required */}
      {waiting.length > 0 && (
        <section aria-label="Butuh perhatian" className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5 dark:border-violet-800 dark:bg-violet-950/40">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-violet-800 dark:text-violet-200">
              Butuh Perhatian — WAITING_INTELLIGENCE ({waiting.length})
            </h2>
            <span className="text-[11px] text-violet-500 dark:text-violet-300">Resume melalui transisi kanonik</span>
          </div>
          <div className="space-y-2">
            {waiting.map((w) => (
              <div key={w.taskId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-100 bg-white p-3 dark:border-violet-900 dark:bg-slate-800/80">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{w.instructionPreview}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {w.waitingCategory ? `Kategori: ${w.waitingCategory}` : "Kategori tidak tercatat"}
                    {w.waitingSince ? ` · sejak ${new Date(w.waitingSince).toLocaleString("id-ID")}` : ""}
                  </p>
                </div>
                <Link href={`/admin/agent/tasks/${w.taskId}`} className="shrink-0 text-xs font-semibold text-violet-600 hover:text-violet-800 dark:text-violet-300">
                  Inspeksi →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Worker health strip */}
      <WorkerHealthCard health={health} />

      {/* 3. Task table */}
      <section aria-label="Daftar task" className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/90">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
          <h2 className="mr-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Task Terbaru</h2>
          <Link
            href={statusHref()}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              !statusFilter
                ? "border-slate-800 bg-slate-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900"
                : "border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400"
            }`}
          >
            Semua
          </Link>
          {CANONICAL_TASK_STATUSES.map((s) => (
            <Link
              key={s}
              href={statusHref(s)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                statusFilter === s
                  ? "border-slate-800 bg-slate-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900"
                  : "border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
        <AgentTaskTable tasks={page.tasks} />
        <div className="flex items-center justify-between border-t border-slate-100 p-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>
            {page.tasks.length} task · halaman {page.pageSize}
            {statusFilter ? ` · filter ${statusFilter}` : ""}
          </span>
          <span className="flex items-center gap-3">
            {cursor && (
              <Link href={statusHref(statusFilter)} className="font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                ← Awal
              </Link>
            )}
            {page.hasMore && page.cursor && (
              <Link
                href={`/admin/agent?status=${encodeURIComponent(statusFilter ?? "")}${statusFilter ? "&" : ""}cursor=${encodeURIComponent(page.cursor)}`}
                className="font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                Berikutnya →
              </Link>
            )}
          </span>
        </div>
      </section>
    </div>
  );
}