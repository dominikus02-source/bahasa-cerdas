/**
 * BC Agent P8B — Telegram reply renderer (allowlisted, bounded).
 *
 * Every byte sent back to Telegram passes through here. Rules (P8B Phase 11):
 *
 *   - ALLOWLIST of fields, never a denylist: only the listed projections of
 *     the canonical read models are rendered.
 *   - Secret redaction pass over the final text (defense in depth): known
 *     credential shapes are masked even if they somehow appear in a field.
 *   - No stack traces, no raw DB errors, no env values, no filesystem paths.
 *   - All outputs bounded (Telegram message cap 4096; we target ≤ 3500).
 */

import type { AgentTaskDetailView, WorkerHealthView } from "../persistence/queries";

const MAX_REPLY_CHARS = 3500;

/** Secret-shaped substrings are masked regardless of source field. */
const SECRET_PATTERNS: ReadonlyArray<RegExp> = [
  /bot\d{6,}:[A-Za-z0-9_-]{30,}/g, // telegram bot tokens
  /sk-[A-Za-z0-9]{20,}/g, // openai-style keys
  /postgres(?:ql)?:\/\/[^\s]+/g, // database URLs
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWTs
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const re of SECRET_PATTERNS) out = out.replace(re, "[REDACTED]");
  return out;
}

function clip(text: string, max = MAX_REPLY_CHARS): string {
  return text.length <= max ? `${text}` : `${text.slice(0, max - 20)}\n…(terpotong)`;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

// ─── Read commands ────────────────────────────────────────────────────────

export function renderStatus(summary: {
  totalVisible: number;
  running: number;
  pending: number;
  pendingApprovals: number;
  waitingIntelligence: number;
  recentCompleted: number;
  recentFailed: number;
}): string {
  const pending = Math.max(0, summary.totalVisible - summary.running - summary.pendingApprovals - summary.waitingIntelligence);
  return redactSecrets(
    clip(
      [
        "*Status BC Agent*",
        `Task: ${summary.totalVisible} total • ${pending} lainnya • ${summary.running} running`,
        `Menunggu: ${summary.pendingApprovals} approval • ${summary.waitingIntelligence} intelijen`,
        `24 jam: ${summary.recentCompleted} selesai • ${summary.recentFailed} gagal`,
      ].join("\n")
    )
  );
}

export function renderHealth(view: WorkerHealthView): string {
  const reg = view.registry;
  const lines = [
    "*Health BC Agent*",
    reg
      ? `Worker terakhir: ${reg.status} • v${reg.version ?? "-"} • heartbeat ${reg.secondsSinceHeartbeat}s lalu${reg.isStale ? " • STALE" : ""}`
      : "Worker: tidak ada registrasi terkini",
    `Stale workers: ${view.staleWorkers ?? 0}`,
  ];
  for (const w of view.workers?.slice(0, 3) ?? []) {
    lines.push(`• ${w.status} • v${w.version ?? "-"} • heartbeat ${w.secondsSinceHeartbeat}s lalu`);
  }
  return redactSecrets(clip(lines.join("\n")));
}

export function renderTaskNotFound(taskId: string): string {
  return redactSecrets(`Task tidak ditemukan (id terpotong: ${taskId.slice(0, 12)}…).`);
}

export function renderTaskDetail(detail: AgentTaskDetailView): string {
  const lastEvents = detail.events
    .slice(-5)
    .map((e) => `• #${e.seq} ${e.eventType} → ${e.newStatus}`)
    .join("\n");
  return redactSecrets(
    clip(
      [
        `*Task* ${detail.task.id.slice(0, 24)}`,
        `Status: ${detail.task.status} • intent: ${detail.task.intentType} • channel: ${detail.task.channel}`,
        `Dibuat: ${fmtDate(detail.task.createdAt)} • attempts: ${detail.task.attemptCount}`,
        lastEvents ? `Event terakhir:\n${lastEvents}` : "Tidak ada event.",
      ].join("\n")
    )
  );
}

export function renderReport(detail: AgentTaskDetailView): string {
  const a = detail.attempts[detail.attempts.length - 1];
  const base = [
    `*Report* ${detail.task.id.slice(0, 24)}`,
    `Status akhir: ${detail.task.status}`,
    a
      ? `Attempt #${a.sequence}: ${a.status}${detail.verification ? ` • verifikasi: ${detail.verification.status}` : ""}${a.finishedAt ? ` • selesai ${fmtDate(a.finishedAt)}` : ""}`
      : "Belum ada attempt.",
  ];
  if (a?.error) base.push(`Error: ${a.error.slice(0, 200)}`);
  if (detail.verification?.summary) base.push(`Ringkasan verifikasi: ${detail.verification.summary.slice(0, 200)}`);
  return redactSecrets(clip(base.join("\n")));
}

export function renderEvidence(detail: AgentTaskDetailView): string {
  if (!detail.evidence.length) return redactSecrets("Tidak ada evidence untuk task ini.");
  const lines = detail.evidence
    .slice(0, 8)
    .map((e) => `• [${e.kind}] (${e.source}, ${e.confidence}) ${e.claim.slice(0, 140)}`);
  return redactSecrets(
    clip(`*Evidence* (termuat ${Math.min(8, detail.evidence.length)}/${detail.evidence.length}):\n${lines.join("\n")}`)
  );
}

export function renderApprovals(pending: ReadonlyArray<{ taskId: string; toolName: string; expiresAt: string; inputSummary: string | null }>): string {
  if (!pending.length) return redactSecrets("Tidak ada approval menunggu.");
  const lines = pending
    .slice(0, 6)
    .map((a) => `• ${a.taskId.slice(0, 18)} • ${a.toolName} • kadaluarsa ${fmtDate(a.expiresAt)}`);
  return redactSecrets(clip(`*Approval menunggu* (${pending.length}):\n${lines.join("\n")}`));
}

// ─── Mutation command results ─────────────────────────────────────────────

export function renderCommandOk(message: string, taskStatus: string | null): string {
  return redactSecrets(clip(`OK: ${message}${taskStatus ? `\nStatus: ${taskStatus}` : ""}`));
}

export function renderCommandDenied(message: string): string {
  return redactSecrets(clip(`DITOLAK: ${message}`));
}

export function renderCreated(taskId: string, status: string): string {
  return redactSecrets(`Task dibuat: ${taskId.slice(0, 24)}\nStatus: ${status}\nWorker akan mengambil task ini otomatis.`);
}

/** Uniform help — the only place the vocabulary is advertised. */
export function renderHelp(): string {
  return redactSecrets(
    [
      "*BC Agent — perintah*",
      "/status • /health • /approvals",
      "/task <id> • /report <id> • /evidence <id>",
      "/create <instruksi>",
      "/approve <id> • /reject <id> • /retry <id> • /resume <id> • /cancel <id>",
    ].join("\n")
  );
}

export function renderDenial(): string {
  // Opaque by design: never distinguishes binding classes (P8A §7).
  return redactSecrets("Akses ditolak.");
}

export function renderRateLimited(): string {
  return redactSecrets("Terlalu banyak perintah. Coba lagi nanti.");
}

export function renderInternalError(): string {
  return redactSecrets("Terjadi kesalahan internal. Coba lagi nanti atau gunakan Control Center web.");
}
