"use client";

import Link from "next/link";

import type { WorkerHealthView } from "@/src/agent/persistence/queries";

/**
 * Mission Control worker panel.
 *
 * Separates process liveness (P7 registry) from processing activity (P5
 * attempt lease). An online worker with zero active tasks is reported as
 * ONLINE · IDLE, not as "possibly not running".
 */
export function WorkerHealthCard({ health }: { health: WorkerHealthView }) {
  const registryOnline = Boolean(
    health.registry &&
      !health.registry.isStale &&
      (health.registry.status === "RUNNING" || health.registry.status === "DEGRADED")
  );
  const processing = health.runtimeState === "ACTIVE";

  const tone = registryOnline
    ? {
        ring: "border-emerald-200 dark:border-emerald-800",
        dot: "bg-emerald-500",
        label: processing ? "ONLINE · PROCESSING" : "ONLINE · IDLE",
      }
    : health.runtimeState === "UNKNOWN" || health.registry?.isStale
      ? {
          ring: "border-amber-200 dark:border-amber-800",
          dot: "bg-amber-500",
          label: "STALE / TIDAK PASTI",
        }
      : {
          ring: "border-slate-200 dark:border-slate-700",
          dot: "bg-slate-400",
          label: "TIDAK TERAMATI",
        };

  const processNote = registryOnline
    ? processing
      ? "Worker terdaftar online dan sedang memproses task dengan lease + heartbeat segar."
      : "Worker terdaftar online dengan heartbeat segar, tetapi saat ini tidak memiliki task aktif."
    : health.registry?.isStale
      ? "Registry worker ada, tetapi heartbeat proses sudah kedaluwarsa. Periksa host worker sebelum mengirim pekerjaan penting."
      : health.note;

  return (
    <section aria-label="Kesehatan worker" className={`rounded-2xl border bg-white p-5 dark:bg-slate-800/90 ${tone.ring}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${tone.dot}`} />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Worker Runtime</h2>
          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-500 dark:border-slate-600 dark:text-slate-300">
            {tone.label}
          </span>
        </div>
        <span className="text-[11px] text-slate-400">{health.activeLeases} lease aktif</span>
      </div>

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{processNote}</p>

      {health.registry && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
          <span>
            Registry: <span className="font-mono text-slate-700 dark:text-slate-200">{health.registry.workerId.slice(0, 20)}…</span>
          </span>
          <span className="rounded-full border border-slate-200 px-1.5 py-0.5 font-bold tracking-wider dark:border-slate-600">
            {health.registry.status}
          </span>
          {health.registry.version && <span>v{health.registry.version}</span>}
          <span>{health.registry.secondsSinceHeartbeat}s sejak heartbeat</span>
          {health.registry.isStale && <span className="font-bold text-amber-600 dark:text-amber-400">HEARTBEAT STALE</span>}
        </div>
      )}

      {!health.registry && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-400 dark:bg-slate-900/60">
          Tidak ada worker aktif yang teramati di registry.
        </p>
      )}

      {typeof health.staleWorkers === "number" && health.staleWorkers > 0 && (
        <p className="mt-2 text-[11px] font-bold text-amber-600 dark:text-amber-400">
          {health.staleWorkers} worker stale terdeteksi.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs md:grid-cols-4">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">Process</dt>
          <dd className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{registryOnline ? "ONLINE" : "UNVERIFIED"}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">Processing</dt>
          <dd className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{processing ? "ACTIVE" : health.runtimeState}</dd>
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
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">Worker ID</dt>
          <dd className="mt-0.5 truncate font-mono text-[11px] text-slate-700 dark:text-slate-200">
            {health.registry?.workerId ?? health.workerId ?? "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
