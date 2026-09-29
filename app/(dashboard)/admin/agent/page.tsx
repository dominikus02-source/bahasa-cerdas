import Link from "next/link";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import {
  CANONICAL_TASK_STATUSES,
  getAgentOperationsSnapshot,
  getAgentSummary,
  getWorkerHealthView,
  listAgentTasks,
  listWaitingIntelligence,
} from "@/src/agent/persistence/queries";
import { loadTelegramDeliveryConfig } from "@/src/agent/telegram/config";
import { getTelegramWebhookInfo } from "@/src/agent/telegram/transport";
import { supportsAgentRuntimeProtocol } from "@/src/agent/runtime-protocol";

import { AgentTaskTable } from "./_components/task-table";
import { WorkerHealthCard } from "./_components/worker-health-card";
import { AgentCommandBox } from "./_components/command-box";
import { createAgentTaskAction } from "./actions";

export const dynamic = "force-dynamic";

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1_000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(ms < 10_000 ? 1 : 0)} dtk`;
  return `${(ms / 60_000).toFixed(1)} mnt`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  detail,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "slate" | "emerald" | "red" | "sky" | "violet" | "amber";
}) {
  const tones = {
    slate: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/90",
    emerald: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20",
    red: "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
    sky: "border-sky-200 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/20",
    violet: "border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20",
    amber: "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

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

  const telegramConfig = loadTelegramDeliveryConfig();
  const [summary, operations, page, waiting, health, webhook] = await Promise.all([
    getAgentSummary(db),
    getAgentOperationsSnapshot(db, 24),
    listAgentTasks(db, { status: statusFilter, cursor, pageSize: 25 }),
    listWaitingIntelligence(db, { limit: 8 }),
    getWorkerHealthView(db),
    getTelegramWebhookInfo(),
  ]);

  const statusHref = (s?: string) => `/admin/agent${s ? `?status=${encodeURIComponent(s)}` : ""}`;
  const processOnline = Boolean(
    health.registry &&
      !health.registry.isStale &&
      (health.registry.status === "RUNNING" || health.registry.status === "DEGRADED")
  );
  const telegramHealthy =
    telegramConfig.mode === "armed" &&
    webhook.status === "REGISTERED" &&
    webhook.routeMatches === true &&
    !webhook.lastErrorMessage;
  const p9WorkerReady = supportsAgentRuntimeProtocol(health.registry?.version);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">BC Agent — Mission Control</h1>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider ${
                processOnline
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {processOnline ? "WORKER ONLINE" : "CEK WORKER"}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider ${
                telegramHealthy
                  ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              {telegramHealthy ? "TELEGRAM LIVE" : "TELEGRAM CHECK"}
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Pusat operasi Founder untuk worker, task, approval, tool execution, evidence, dan kanal Telegram. Semua fakta operasional dibaca dari state persisten; mutasi tetap melalui layanan kanonik.
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
            Kelola Telegram
          </Link>
        </div>
      </div>

      <AgentCommandBox
        action={createAgentTaskAction}
        workerReady={p9WorkerReady}
        workerVersion={health.registry?.version ?? null}
      />

      <section aria-label="Ringkasan operasi 24 jam" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Task dibuat · 24j" value={operations.created} detail={`${operations.byChannel.WEB ?? 0} web · ${operations.byChannel.TELEGRAM ?? 0} Telegram`} tone="sky" />
        <StatCard label="Selesai · 24j" value={operations.completed} detail={`Rata-rata ${fmtMs(operations.avgCompletedMs)}`} tone="emerald" />
        <StatCard label="Gagal · 24j" value={operations.failed} detail="Terminal FAILED pada jendela 24 jam" tone={operations.failed > 0 ? "red" : "slate"} />
        <StatCard label="Success rate" value={operations.successRatePct === null ? "—" : `${operations.successRatePct}%`} detail="COMPLETED ÷ terminal task 24 jam" tone="violet" />
        <StatCard label="Tool execution" value={operations.executions.total} detail={`${operations.executions.succeeded} sukses · ${operations.executions.failed} gagal`} tone="slate" />
        <StatCard label="Approval pending" value={summary.pendingApprovals} detail={`${summary.waitingIntelligence} menunggu intelligence`} tone={summary.pendingApprovals > 0 ? "amber" : "slate"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <WorkerHealthCard health={health} />

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Telegram Control Channel</h2>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Probe read-only langsung ke Bot API; token dan secret tidak pernah ditampilkan.
              </p>
            </div>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${
                telegramHealthy
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {telegramHealthy ? "SEHAT" : webhook.status}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
              <dt className="text-[10px] uppercase tracking-wider text-slate-400">Delivery</dt>
              <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{telegramConfig.mode === "armed" ? "ARMED" : "DORMANT"}</dd>
              <p className="mt-0.5 text-[10px] text-slate-400">token {telegramConfig.tokenStatus} · secret {telegramConfig.webhookSecretStatus}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
              <dt className="text-[10px] uppercase tracking-wider text-slate-400">Webhook</dt>
              <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{webhook.status.replace(/_/g, " ")}</dd>
              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                {webhook.urlHost && webhook.urlPath ? `${webhook.urlHost}${webhook.urlPath}` : webhook.error ?? "—"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
              <dt className="text-[10px] uppercase tracking-wider text-slate-400">Binding aktif</dt>
              <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{operations.telegram.activeBindings}</dd>
              <p className="mt-0.5 text-[10px] text-slate-400">last seen {fmtTime(operations.telegram.lastSeenAt)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
              <dt className="text-[10px] uppercase tracking-wider text-slate-400">Command · 24j</dt>
              <dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{operations.telegram.commands24h}</dd>
              <p className="mt-0.5 text-[10px] text-slate-400">terakhir {fmtTime(operations.telegram.lastCommandAt)}</p>
            </div>
          </dl>

          {(webhook.pendingUpdateCount ?? 0) > 0 && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {webhook.pendingUpdateCount} update Telegram masih pending.
            </p>
          )}
          {webhook.lastErrorMessage && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              Error Telegram terakhir {fmtTime(webhook.lastErrorAt)} · {webhook.lastErrorMessage}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tool activity · 24 jam</h2>
            <span className="text-[11px] text-slate-400">avg {fmtMs(operations.executions.avgDurationMs)}</span>
          </div>
          {operations.executions.topTools.length === 0 ? (
            <p className="mt-4 text-xs text-slate-400">Belum ada tool execution pada jendela ini.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {operations.executions.topTools.map((tool) => (
                <div key={tool.toolName} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                  <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">{tool.toolName}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tool.total} run{tool.failed > 0 ? ` · ${tool.failed} gagal` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/90">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Lifecycle sekarang</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["RUNNING", "WAITING_APPROVAL", "WAITING_INTELLIGENCE", "VERIFYING", "PENDING", "FAILED", "COMPLETED", "CANCELLED"] as const).map((s) => (
              <Link
                key={s}
                href={statusHref(s)}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-500"
              >
                <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-slate-400">{s.replace(/_/g, " ")}</p>
                <p className="mt-1 text-lg font-bold text-slate-800 dark:text-slate-100">{summary.byStatus[s] ?? 0}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
            {page.tasks.length} task · page size {page.pageSize}
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
                href={`/admin/agent?${statusFilter ? `status=${encodeURIComponent(statusFilter)}&` : ""}cursor=${encodeURIComponent(page.cursor)}`}
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
