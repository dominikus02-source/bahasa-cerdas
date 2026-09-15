/**
 * BC Agent P8B — Telegram remote control: shared types.
 *
 * Telegram is an ADAPTER surface only (P8A threat model). These types model
 * the minimal Telegram update envelope this adapter consumes and the parsed
 * command vocabulary. Nothing here touches the agent core, the worker, or
 * tool execution. All Telegram-originated content is DATA (never instructions).
 *
 * Zero I/O in this file.
 */

import type { FounderAccess } from "../control/auth";

/** Bounded Telegram update envelope — only the fields the adapter consumes. */
export interface TelegramUpdate {
  readonly updateId: number;
  readonly kind: "message" | "callback_query" | "ignored";
  /** message / callback_query sender. */
  readonly fromId?: string;
  /** containing chat id (message.chat.id or callback_query.message.chat.id). */
  readonly chatId?: string;
  /** message text, bounded by the adapter (≤ MAX_TELEGRAM_TEXT_CHARS). */
  readonly text?: string;
  /** true when the message was forwarded — forwarded text is DATA, never a command. */
  readonly isForwarded: boolean;
  /** callback payload when kind === "callback_query" (already length-capped). */
  readonly callbackData?: string;
  /** callback_query id (for answerCallbackQuery; never logged). */
  readonly callbackId?: string;
}

export const MAX_TELEGRAM_TEXT_CHARS = 4000; // Telegram's own cap is 4096; we stay under it.
export const MAX_CALLBACK_DATA_CHARS = 64; // Telegram hard cap for callback_data.

/**
 * Fixed command vocabulary (P8A §8 matrix). Parses strictly: anything else is
 * a denial, not a fuzzy match. Free text is valid ONLY as /create payload.
 */
export type TelegramCommand =
  | { kind: "status" }
  | { kind: "health" }
  | { kind: "task"; taskId: string }
  | { kind: "report"; taskId: string }
  | { kind: "evidence"; taskId: string }
  | { kind: "approvals" }
  | { kind: "create"; instruction: string }
  | { kind: "approve"; taskId: string }
  | { kind: "reject"; taskId: string }
  | { kind: "retry"; taskId: string }
  | { kind: "resume"; taskId: string }
  | { kind: "cancel"; taskId: string };

/** Denial reasons — deliberately opaque (never reveal whether a binding exists). */
export type TelegramDenialReason =
  | "UNAUTHENTICATED"
  | "NOT_FOUNDER"
  | "UNKNOWN_COMMAND"
  | "MALFORMED_UPDATE"
  | "RATE_LIMITED"
  | "FORWARDED"
  | "DEDUPE_ERROR";

export type ReadCommandKind = "status" | "health" | "task" | "report" | "evidence" | "approvals";
export type ReadTelegramCommand = Extract<TelegramCommand, { kind: ReadCommandKind }>;
export type MutationTelegramCommand = Exclude<TelegramCommand, { kind: ReadCommandKind }>;

export const READ_COMMAND_KINDS: ReadonlySet<ReadCommandKind> = new Set([
  "status",
  "health",
  "task",
  "report",
  "evidence",
  "approvals",
]);

/** Type predicate — narrows a parsed command for the read/mutation split. */
export function isReadCommand(cmd: TelegramCommand): cmd is ReadTelegramCommand {
  return READ_COMMAND_KINDS.has(cmd.kind as ReadCommandKind);
}

/** Uniform denial result — identical shape for every failure class (§7 P8A). */
export type TelegramCommandOutcome =
  | { ok: true; text: string }
  | { ok: false; reason: TelegramDenialReason; text: string };

/** Authorization context the gateway builds per command (fail-closed). */
export interface TelegramAuthContext {
  readonly ok: true;
  readonly access: { readonly ok: true; readonly userId: string; readonly isFounder: boolean };
  readonly bindingId: string;
  readonly telegramUserId: string;
  readonly telegramChatId: string;
}

/** The exact canonical-context shape the gateway injects (P6 contract). */
export type { FounderAccess };
