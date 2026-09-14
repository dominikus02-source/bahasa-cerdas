"use client";

import Link from "next/link";

import type { WorkerHealthView } from "@/src/agent/persistence/queries";

/**
 * BC Agent P6 — worker health panel.
 * Health is derived from the P5 persisted contract (attempt leases +
 * heartbeats). A never-run worker is reported honestly as IDLE with an
 * explanatory note — never falsely STOPPED (P5 regression guard), and
 * unverifiable ownership shows UNKNOWN instead of a guess.
 */
export function WorkerHealthCard({ health }: { health: WorkerHealthView }) {
  const tone =
    health.runtimeState === "ACTIVE"
      ? { ring: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500", label: "AKTIF" }
      : health.runtimeState === "UNKNOWN"
        ? { ring: "border-amber-200 dark:border-amber-800", dot: "bg-amber-500", label: "TIDAK PASTI" }
        : { ring: "border-slate-200 dark:border-slate-700", dot: "bg-slate-400", label: "IDLE" };

  return (
    <section aria-label="Kesehatan worker" className={`rounded-2xl border bg-white p-5 dark:bg-slate-800/90 ${tone.ring}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${tone.dot}`} />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Worker</h2>
          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-500 dark:border-slate-600 dark:text-slate-300">
            {tone.label}
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          {health.activeLeases} attempt aktif pada task RUNNING
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{health.note}</p>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs md:grid-cols-4">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">Worker ID</dt>
          <dd className="mt-0.5 font-mono text-[11px] text-slate-700 dark:text-slate-200">
            {health.workerId ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">Heartbeat Terakhir</dt>
          <dd className="mt-0.5 text-slate-700 dark:text-slate-200">
            {health.lastHeartbeatAt ? new Date(health.lastHeartbeatAt).toLocaleTimeString("id-ID") : "—"}
            {health.secondsSinceHeartbeat !== null && (
              <span className="ml-1 text-[10px] text-slate-400">({health.secondsSinceHeartbeat}s lalu)</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">Task Aktif</dt>
          <dd className="mt-0.5 text-slate-700 dark:text-slate-200">
            {health.activeTaskId ? (
              <Link href={`/admin/agent/tasks/${health.activeTaskId}`} className="font-mono text-[11px] text-blue-600 hover:underline dark:text-blue-400">
                {health.activeTaskId.slice(0, 12)}…
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">Basis Observasi</dt>
          <dd className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{health.basis}</dd>
        </div>
      </dl>
    </section>
  );
}
