"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

/**
 * BC Agent P6 — shared UI primitives (mission-control styling).
 * All content is rendered as text nodes (React escapes by default) —
 * untrusted tool/model content is never rendered as HTML.
 */

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  RUNNING: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  WAITING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  WAITING_INTELLIGENCE: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800",
  VERIFYING: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  FAILED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

const KIND_STYLES: Record<string, string> = {
  FACT: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  OBSERVATION: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
  INFERENCE: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800",
  RECOMMENDATION: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  UNKNOWN: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${style}`}>
      {status}
    </span>
  );
}

export function KindBadge({ kind }: { kind: string }) {
  const style = KIND_STYLES[kind] ?? KIND_STYLES.UNKNOWN;
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${style}`}>
      {kind}
    </span>
  );
}

export function ProvenanceChip({ factBacked }: { factBacked: boolean }) {
  return factBacked ? (
    <span className="inline-flex items-center rounded-md bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
      tool-backed
    </span>
  ) : (
    <span className="inline-flex items-center rounded-md bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
      tanpa provenance tool
    </span>
  );
}

export type ActionKind = "approve" | "reject" | "resume" | "retry" | "cancel";

const ACTION_META: Record<ActionKind, { label: string; confirm?: string; className: string }> = {
  approve: {
    label: "Approve",
    className: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  reject: {
    label: "Reject",
    confirm: "Tolak approval ini? Task akan berpindah ke FAILED melalui transisi kanonik. Tindakan ini sekali-pakai.",
    className: "bg-red-600 hover:bg-red-700 text-white",
  },
  resume: {
    label: "Resume",
    className: "bg-violet-600 hover:bg-violet-700 text-white",
  },
  retry: {
    label: "Retry",
    confirm: "Buat attempt BARU untuk task ini? Attempt lama tidak diwariskan (keputusan, verifikasi, evidence, eksekusi).",
    className: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  cancel: {
    label: "Cancel",
    confirm: "Batalkan task ini? Status akan berpindah ke CANCELLED dan tidak dapat dilanjutkan.",
    className: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700",
  },
};

export function ActionButton({
  kind,
  taskId,
  action,
  disabled,
  onDone,
  size = "md",
}: {
  kind: ActionKind;
  taskId: string;
  action: (taskId: string) => Promise<{ ok: boolean; code: string; message: string; taskStatus: string | null }>;
  disabled?: boolean;
  onDone?: () => void;
  size?: "sm" | "md";
}) {
  const meta = ACTION_META[kind];
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleClick = () => {
    if (!meta.confirm) {
      doRun();
      return;
    }
    if (confirming) {
      doRun();
    } else {
      setConfirming(true);
    }
  };

  const doRun = () => {
    setConfirming(false);
    startTransition(async () => {
      const res = await action(taskId);
      setResult({ ok: res.ok, message: res.message });
      onDone?.();
    });
  };

  const sizeCls = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs";

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || pending}
          className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${sizeCls} ${meta.className}`}
        >
          {pending && <Loader2 className="h-3 w-3 animate-spin" />}
          {confirming ? "Yakin? Klik lagi" : meta.label}
        </button>
        {confirming && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            batal
          </button>
        )}
      </span>
      {result && (
        <span className={`block max-w-xs text-[11px] leading-snug ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
          {result.message}
        </span>
      )}
    </span>
  );
}
