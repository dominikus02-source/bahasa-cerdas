"use client";

import Link from "next/link";

import type { AgentTaskListItem } from "@/src/agent/persistence/queries";
import { StatusBadge } from "./ui";

/**
 * BC Agent P6 — task table (client island).
 * Facts only: id, type, status, priority-equivalent (attemptCount as retry
 * signal), timestamps, worker ownership, last event/error. All values come
 * from persisted rows via the canonical read boundary.
 */
export function AgentTaskTable({ tasks }: { tasks: readonly AgentTaskListItem[] }) {
  if (tasks.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-slate-400">
        Belum ada task pada filter ini.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-left text-slate-400 dark:border-slate-800">
            <th className="px-4 py-2.5 font-medium">Task</th>
            <th className="px-4 py-2.5 font-medium">Tipe</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Attempt</th>
            <th className="px-4 py-2.5 font-medium">Worker</th>
            <th className="px-4 py-2.5 font-medium">Dibuat</th>
            <th className="px-4 py-2.5 font-medium">Event Terakhir</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/50">
              <td className="max-w-[280px] px-4 py-3">
                <Link href={`/admin/agent/tasks/${t.id}`} className="block">
                  <span className="block truncate font-medium text-slate-800 dark:text-slate-200">{t.instructionPreview}</span>
                  <span className="mt-0.5 block font-mono text-[10px] text-slate-400">{t.id}</span>
                  {t.lastError && (
                    <span className="mt-0.5 block truncate text-[10px] text-red-500 dark:text-red-400" title={t.lastError}>
                      {t.lastError}
                    </span>
                  )}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{t.intentType}</td>
              <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">#{t.attemptCount}</td>
              <td className="px-4 py-3">
                {t.leaseWorkerId ? (
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400" title={t.leaseWorkerId}>
                    {t.leaseWorkerId.slice(0, 14)}…
                  </span>
                ) : (
                  <span className="text-slate-300 dark:text-slate-600">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                {new Date(t.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </td>
              <td className="px-4 py-3">
                {t.lastEvent ? (
                  <span className="text-slate-600 dark:text-slate-300">
                    <span className="font-mono text-[10px] font-semibold">{t.lastEvent.eventType}</span>
                    <span className="ml-1 text-[10px] text-slate-400">oleh {t.lastEvent.actor}</span>
                  </span>
                ) : (
                  <span className="text-slate-300 dark:text-slate-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
