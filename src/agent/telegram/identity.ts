/**
 * BC Agent P8B — Telegram identity resolution (fail-closed).
 *
 * Resolves a validated Telegram user/chat pair to the enrolled founder
 * binding. Rules (P8B Phase 7 / P8A §5–§7):
 *
 *   - binding must exist AND be active (revokedAt IS NULL)
 *   - telegram user AND chat must BOTH match
 *   - identity is DB-driven only — username / display name / message content
 *     are never consulted (no inference, no auto-linking)
 *   - every failure path returns the SAME opaque denial so an attacker can
 *     never learn whether another founder binding exists
 *   - resolution errors (DB down, malformed rows) deny — never default-allow
 *
 * The returned access object implements the P6 `FounderAccess` contract, so
 * the canonical command layer (control/commands.ts) consumes it unchanged.
 */

import type { PrismaClient } from "@prisma/client";

import type { FounderAccess } from "../control/auth";
import type { TelegramAuthContext, TelegramUpdate } from "./types";

export interface TelegramIdentityDeps {
  readonly prisma: PrismaClient;
}

/**
 * Resolve + authorize a Telegram identity. Returns the TelegramAuthContext
 * (which embeds a canonical `FounderAccess` ok-result) on success, or the
 * opaque FounderAccess denial otherwise.
 */
export async function resolveTelegramIdentity(
  deps: TelegramIdentityDeps,
  update: TelegramUpdate
): Promise<TelegramAuthContext | Extract<FounderAccess, { ok: false }>> {
  // Structural completeness first — malformed identity is a denial.
  if (!update.fromId || !update.chatId) {
    return { ok: false, reason: "UNAUTHENTICATED" };
  }

  type BindingRow = {
    id: string;
    telegramUserId: string;
    telegramChatId: string;
    userId: string;
    revokedAt: Date | null;
  };

  let binding: BindingRow | null = null;
  let isFounder = false;
  let role = "";

  try {
    const row = await deps.prisma.agentTelegramBinding.findUnique({
      where: { telegramUserId: update.fromId },
      select: {
        id: true,
        telegramUserId: true,
        telegramChatId: true,
        userId: true,
        revokedAt: true,
      },
    });
    if (row) {
      binding = row;
      // Canonical founder predicate — same vocabulary as control/auth.ts
      // (User.isFounder, ADMIN accepted by the same legacy gate). The User
      // row is resolved by id from the binding, never from Telegram input.
      const user = await deps.prisma.user.findUnique({
        where: { id: row.userId },
        select: { isFounder: true, role: true },
      });
      if (user) {
        isFounder = user.isFounder;
        role = user.role;
      }
    }
  } catch {
    // DB unavailable / query failed → fail closed (P8A F1).
    return { ok: false, reason: "UNAUTHENTICATED" };
  }

  // Unknown identity, revoked binding, wrong chat: one opaque denial each.
  if (!binding || binding.revokedAt !== null) {
    return { ok: false, reason: "UNAUTHENTICATED" };
  }
  if (binding.telegramChatId !== update.chatId) {
    return { ok: false, reason: "UNAUTHENTICATED" };
  }
  if (!isFounder && role !== "ADMIN") {
    return { ok: false, reason: "NOT_FOUNDER" };
  }

  return {
    ok: true,
    access: { ok: true, userId: binding.userId, isFounder },
    bindingId: binding.id,
    telegramUserId: binding.telegramUserId,
    telegramChatId: binding.telegramChatId,
  };
}

/** Touch lastSeenAt for an accepted binding (best-effort, never fatal). */
export async function touchBinding(
  deps: TelegramIdentityDeps,
  bindingId: string,
  now: Date
): Promise<void> {
  try {
    await deps.prisma.agentTelegramBinding.update({
      where: { id: bindingId },
      data: { lastSeenAt: now },
    });
  } catch {
    // Informational only; never blocks a command.
  }
}
