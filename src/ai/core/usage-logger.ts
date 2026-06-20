/**
 * Usage logger — records AI agent usage to database.
 *
 * Fire-and-forget: never blocks the response.
 * Writes to the existing AIUsage table via Prisma.
 *
 * Phase 8: Now stores provider, model, status, errorCode, latencyMs.
 * Export events use feature: "ai_export_docx", "ai_export_pdf", "ai_export_pptx"
 */

import type { AgentUsageLog } from "./agent-types";
import { db } from "@/lib/db";

function mapErrorCode(error: string | null): string | null {
  if (!error) return null;
  if (error.includes("Layanan AI sedang sibuk")) return "PROVIDER_UNAVAILABLE";
  if (error.includes("Gagal memvalidasi output")) return "OUTPUT_VALIDATION_FAILED";
  if (error.includes("Batas penggunaan")) return "RATE_LIMIT";
  if (error.includes("Streaming terputus")) return "STREAM_INCOMPLETE";
  if (error.includes("Pembuatan dihentikan")) return "CANCELLED";
  if (error.includes("Stream tidak tersedia")) return "STREAM_UNAVAILABLE";
  if (error.includes("Agent") && error.includes("tidak ditemukan")) return "AGENT_NOT_FOUND";
  if (error.includes("Input tidak valid")) return "INVALID_INPUT";
  if (error.includes("AI tidak menghasilkan")) return "EMPTY_RESPONSE";
  return "UNKNOWN_ERROR";
}

/**
 * Log agent usage to the database.
 * Fire-and-forget — never blocks the response.
 */
export async function logUsage(log: AgentUsageLog): Promise<void> {
  try {
    const bulan = new Date().toISOString().slice(0, 7);

    await db.aIUsage.create({
      data: {
        userId: log.userId,
        feature: `agent:${log.agentId}`,
        provider: log.provider || null,
        model: log.model || null,
        status: log.success ? "success" : log.error ? "error" : "unknown",
        errorCode: log.success ? null : mapErrorCode(log.error),
        tokens: log.totalTokens,
        costUSD: log.costUSD,
        latencyMs: log.latencyMs ?? null,
        bulan,
      },
    });

    console.debug(`[Usage] agent=${log.agentId} user=${log.userId} status=${log.success ? "ok" : "fail"} tokens=${log.totalTokens} cost=$${log.costUSD.toFixed(6)}`);
  } catch {
    // Silently fail — logging should never break the main flow
  }
}

/**
 * Log an export event (docx, pdf, ppptx) to AIUsage.
 */
export async function logExportEvent(
  userId: string,
  exportType: "docx" | "pdf" | "pptx",
  agentId?: string,
  latencyMs?: number
): Promise<void> {
  try {
    const bulan = new Date().toISOString().slice(0, 7);
    const feature = agentId ? `ai_export_${exportType}:${agentId}` : `ai_export_${exportType}`;

    await db.aIUsage.create({
      data: {
        userId,
        feature,
        status: "success",
        tokens: 0,
        costUSD: 0,
        latencyMs: latencyMs ?? null,
        bulan,
      },
    });
  } catch {
    // silently fail
  }
}

/**
 * Log legacy old-route usage to AIUsage.
 * Used by /api/ai/eyd, /api/ai/feedback, /api/ai/grading, /api/ai/text-analysis
 * that cannot use the central agent runner.
 */
export async function logLegacyUsage(params: {
  userId: string;
  feature: string; // "legacy:eyd" etc.
  provider: string | null;
  model: string | null;
  tokens: number;
  costUSD: number;
  latencyMs: number;
  success: boolean;
  error: string | null;
}): Promise<void> {
  try {
    const bulan = new Date().toISOString().slice(0, 7);

    await db.aIUsage.create({
      data: {
        userId: params.userId,
        feature: params.feature,
        provider: params.provider || null,
        model: params.model || null,
        status: params.success ? "success" : "error",
        errorCode: params.success ? null : mapErrorCode(params.error),
        tokens: params.tokens,
        costUSD: params.costUSD,
        latencyMs: params.latencyMs,
        bulan,
      },
    });

    console.debug(`[Legacy] feature=${params.feature} user=${params.userId} status=${params.success ? "ok" : "fail"} tokens=${params.tokens}`);
  } catch {
    // silently fail
  }
}

/**
 * Get usage summary for a user and optional agent.
 */
export async function getUserUsage(
  userId: string,
  agentId?: string
): Promise<{ totalTokens: number; totalCost: number; callCount: number }> {
  try {
    const where: Record<string, unknown> = { userId };
    if (agentId) {
      where.feature = `agent:${agentId}`;
    }

    const records = await db.aIUsage.findMany({ where });
    return {
      totalTokens: records.reduce((s, r) => s + r.tokens, 0),
      totalCost: records.reduce((s, r) => s + r.costUSD, 0),
      callCount: records.length,
    };
  } catch {
    return { totalTokens: 0, totalCost: 0, callCount: 0 };
  }
}
