/**
 * BC Agent P8B — Telegram update adapter (validation layer).
 *
 * Validates and normalizes the raw Telegram update envelope BEFORE anything
 * touches the DB or the command layer. Responsibilities (P8B Phase 3):
 *
 *   - strict shape validation (zod) — malformed updates are rejected pre-DB
 *   - size caps (text ≤ 4000, callback_data ≤ 64) — oversized rejected pre-DB
 *   - normalization to the bounded TelegramUpdate view
 *   - NO command execution, NO identity decisions, NO I/O
 *
 * All Telegram-originated text is DATA. Nothing here is trusted as an
 * instruction; the only consumer of free text is the /create instruction
 * field, which flows into the P3 trusted founder-instruction zone.
 */

import { z } from "zod";

import {
  MAX_CALLBACK_DATA_CHARS,
  MAX_TELEGRAM_TEXT_CHARS,
  type TelegramCommand,
  type TelegramUpdate,
} from "./types";

// ─── Raw envelope schema (only the fields we consume) ────────────────────

const rawUserSchema = z.object({ id: z.number().int().nonnegative() }).passthrough();

const rawChatSchema = z.object({ id: z.number().int() }).passthrough();

const rawMessageSchema = z
  .object({
    message_id: z.number().int(),
    from: rawUserSchema.optional(),
    chat: rawChatSchema,
    text: z.string().max(4096).optional(),
    forward_origin: z.unknown().optional(),
  })
  .passthrough();

const rawCallbackSchema = z
  .object({
    id: z.string().min(1),
    from: rawUserSchema,
    data: z.string().max(64).optional(),
    message: rawMessageSchema.optional(),
  })
  .passthrough();

const rawUpdateSchema = z
  .object({
    update_id: z.number().int().nonnegative(),
    message: rawMessageSchema.optional(),
    callback_query: rawCallbackSchema.optional(),
    edited_message: z.unknown().optional(),
  })
  .passthrough();

export type RawTelegramUpdate = z.infer<typeof rawUpdateSchema>;

/** Parse result — `ignored` covers update kinds we deliberately do not act on. */
export type AdapterResult =
  | { ok: true; update: TelegramUpdate }
  | { ok: false; reason: "MALFORMED_UPDATE" | "OVERSIZED" | "UNSUPPORTED_KIND"; text: string };

/** Validate + normalize a raw webhook body. Never throws on attacker input. */
export function parseTelegramUpdate(raw: unknown): AdapterResult {
  const parsed = rawUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "MALFORMED_UPDATE", text: "Update tidak valid." };
  }
  const u = parsed.data;

  // edited_message is DATA, never a command (P8A §7).
  if (u.edited_message && !u.message && !u.callback_query) {
    return { ok: true, update: { updateId: u.update_id, kind: "ignored", isForwarded: true } };
  }

  if (u.callback_query) {
    const cb = u.callback_query;
    const data = cb.data ?? "";
    // Telegram caps callback_data at 64 bytes; we re-verify defensively.
    if (data.length > MAX_CALLBACK_DATA_CHARS) {
      return { ok: false, reason: "OVERSIZED", text: "Callback terlalu panjang." };
    }
    return {
      ok: true,
      update: {
        updateId: u.update_id,
        kind: "callback_query",
        fromId: String(cb.from.id),
        chatId: cb.message?.chat.id !== undefined ? String(cb.message.chat.id) : undefined,
        callbackData: data,
        callbackId: cb.id,
        isForwarded: false,
      },
    };
  }

  if (u.message) {
    const m = u.message;
    const text = m.text ?? "";
    if (text.length > MAX_TELEGRAM_TEXT_CHARS) {
      return { ok: false, reason: "OVERSIZED", text: "Pesan terlalu panjang." };
    }
    if (!m.from) {
      // A user-surface message without a sender cannot be authorized — DENY
      // (uniform opaque denial; P8B Phase 7 "malformed identity: DENY").
      // Channel posts (sender_chat) fall here too: a founder-control bot
      // must not act on them.
      return { ok: false, reason: "MALFORMED_UPDATE", text: "Update tidak valid." };
    }
    return {
      ok: true,
      update: {
        updateId: u.update_id,
        kind: "message",
        fromId: String(m.from.id),
        chatId: String(m.chat.id),
        text,
        isForwarded: m.forward_origin !== undefined,
      },
    };
  }

  // Any other update kind (poll, my_chat_member, ...) — ack silently.
  return { ok: true, update: { updateId: u.update_id, kind: "ignored", isForwarded: false } };
}

// ─── Command parsing (strict vocabulary; no fuzzy matching) ──────────────

const TASK_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export type CommandParseResult =
  | { ok: true; command: TelegramCommand }
  | { ok: false; reason: "UNKNOWN_COMMAND" | "MALFORMED_UPDATE"; text: string };

/**
 * Parse a bounded text into a command. Free text is valid ONLY as /create
 * payload. Every other command is keyword + task-id pointer. Denials are
 * uniform and never echo input.
 */
export function parseTelegramCommand(update: TelegramUpdate): CommandParseResult {
  if (update.kind === "callback_query") {
    // Gateway-owned callback format: bc:<command>:<taskId>
    const parts = (update.callbackData ?? "").split(":");
    if (parts.length === 3 && parts[0] === "bc" && TASK_ID_PATTERN.test(parts[2])) {
      const kind = parts[1];
      if (kind === "approve" || kind === "reject" || kind === "retry" || kind === "resume" || kind === "cancel") {
        return { ok: true, command: { kind, taskId: parts[2] } };
      }
    }
    return { ok: false, reason: "MALFORMED_UPDATE", text: "Callback tidak dikenal." };
  }

  const text = (update.text ?? "").trim();
  if (!text.startsWith("/")) {
    return { ok: false, reason: "UNKNOWN_COMMAND", text: "Perintah tidak dikenal. Gunakan /help." };
  }

  const [rawVerb, ...rest] = text.slice(1).split(/\s+/);
  const verb = rawVerb.toLowerCase();
  const argText = rest.join(" ").trim();

  switch (verb) {
    case "status":
    case "health":
    case "approvals":
      return { ok: true, command: { kind: verb } };
    case "task":
    case "report":
    case "evidence":
    case "approve":
    case "reject":
    case "retry":
    case "resume":
    case "cancel": {
      if (!argText || !TASK_ID_PATTERN.test(argText)) {
        return { ok: false, reason: "MALFORMED_UPDATE", text: "Task ID tidak valid." };
      }
      return { ok: true, command: { kind: verb, taskId: argText } };
    }
    case "create": {
      const instruction = argText.trim();
      if (!instruction) {
        return { ok: false, reason: "MALFORMED_UPDATE", text: "Instruksi task kosong." };
      }
      // Bounded again here (defense in depth): text is DATA for the P3 zone.
      return { ok: true, command: { kind: "create", instruction: instruction.slice(0, MAX_TELEGRAM_TEXT_CHARS) } };
    }
    default:
      return { ok: false, reason: "UNKNOWN_COMMAND", text: "Perintah tidak dikenal. Gunakan /help." };
  }
}
