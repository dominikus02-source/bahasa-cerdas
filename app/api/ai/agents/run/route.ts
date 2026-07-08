/**
 * POST /api/ai/agents/run — Universal Agent Execution
 *
 * Executes any registered AI agent by canonical ID or alias.
 * Body: { agentId, input, toolType?, saveToHistory?, outputFormat? }
 *
 * Auth: required (Supabase SSR), role: GURU/ADMIN/FOUNDER
 * Rate-limited per agent type
 * Usage logging to AIUsage table
 * Phase 9D: hard quota check with atomic deduction after success
 *
 * Deduction rules:
 * - Never deduct if provider fails
 * - Never deduct if validation fails before provider call
 * - Never deduct if user cancels or server errors
 * - Deduct once after successful result
 * - Unlimited users (Founder/Admin/Murid) bypass deduction
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import "@/src/ai";
import { getAgent } from "@/src/ai/core/agent-registry";
import { runAgent } from "@/src/ai/core/agent-runner";
import { checkAgentRateLimit } from "@/src/ai/core/rate-limit";
import { checkAndPrepareDeduction, deductCreditsAtomic, ensureMonthlyLedger } from "@/lib/ai-gateway/quota-checker";
import { resolveUserAiPlan } from "@/lib/ai-gateway/plan-resolver";
import { resolveAgentId, AGENT_LABELS } from "@/lib/ai/agent-id-map";
import type { AgentRunContext, AgentRunResult } from "@/src/ai/core/agent-types";

// Generasi dokumen panjang (RPP 8000 token + retry) bisa melewati default
// timeout serverless — tanpa ini fungsi diputus di tengah dan user melihat gagal.
export const maxDuration = 150;

function makeRequestId(): string {
  return `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const QUOTA_ERROR = "Credit AI Anda sudah habis. Upgrade atau tunggu periode berikutnya.";
const AUTH_ERROR = "Sesi Anda sudah berakhir. Silakan login kembali.";
const FORBIDDEN_ERROR = "Fitur AI hanya tersedia untuk Guru, Admin, dan Founder.";
const AGENT_NOT_FOUND_ERROR = "Fitur AI belum tersedia atau belum terdaftar.";
const GENERIC_ERROR = "Terjadi kesalahan. Silakan coba lagi.";

const ALLOWED_ROLES = new Set(["GURU", "ADMIN"]);
const UNLIMITED_ROLES = new Set(["ADMIN", "FOUNDER"]);

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = makeRequestId();
  let resolvedAgentId: string | null = null;
  let userId = "unknown";
  let userRole = "unknown";

  function jsonError(error: string, code: string, status: number, extras?: Record<string, unknown>) {
    return NextResponse.json({
      success: false,
      error,
      code,
      requestId,
      ...extras,
    }, { status });
  }

  try {
    const user = await getUser();
    if (!user) {
      console.log(`[AI Agents Run] No user session requestId=${requestId}`);
      return jsonError(AUTH_ERROR, "AUTH_REQUIRED", 401);
    }

    userId = user.id;
    userRole = user.role;

    // Role check — only GURU, ADMIN, FOUNDER
    const isFounder = user.isFounder === true;
    if (!ALLOWED_ROLES.has(userRole) && !isFounder) {
      console.log(`[AI Agents Run] Forbidden: user=${userId} role=${userRole}`);
      return jsonError(FORBIDDEN_ERROR, "FORBIDDEN_ROLE", 403);
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonError("Data tidak valid. Mohon periksa kembali isian Anda.", "INVALID_JSON", 400);
    }

    const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
    if (!agentId) {
      return jsonError("Fitur AI belum dipilih. Silakan pilih alat terlebih dahulu.", "AGENT_ID_REQUIRED", 400);
    }

    const input = (body.input ?? {}) as Record<string, unknown>;
    const outputFormat = body.outputFormat === "text" ? "text" as const : "json" as const;

    // Resolve alias to canonical agent ID
    const canonicalAgentId = resolveAgentId(agentId);
    if (!canonicalAgentId) {
      console.log(`[AI Agents Run] Unknown agent alias: ${agentId} (user=${userId}) requestId=${requestId}`);
      return jsonError(AGENT_NOT_FOUND_ERROR, "AGENT_NOT_FOUND", 404);
    }

    resolvedAgentId = canonicalAgentId;

    // Get registered agent
    const agent = getAgent(canonicalAgentId as never);
    if (!agent) {
      console.log(`[AI Agents Run] Agent not registered: ${canonicalAgentId} (alias: ${agentId}) requestId=${requestId}`);
      return jsonError(AGENT_NOT_FOUND_ERROR, "AGENT_NOT_FOUND", 404);
    }

    const agentLabel = AGENT_LABELS[canonicalAgentId as keyof typeof AGENT_LABELS] || canonicalAgentId;
    const isUnlimited = UNLIMITED_ROLES.has(userRole) || isFounder;

    // Rate limit check
    const rl = await checkAgentRateLimit(req, canonicalAgentId, isUnlimited || user.isPremium);
    if (rl) return rl;

    // Quota check (skip for unlimited users)
    let quota: any = { mode: "unlimited", plan: "premium", creditsRequired: 0 };
    let planInfo: any = null;
    let credits = 0;

    if (!isUnlimited) {
      await ensureMonthlyLedger(user);
      const quotaCheck = await checkAndPrepareDeduction(user, canonicalAgentId, input);
      if (quotaCheck.blocked) {
        return jsonError(QUOTA_ERROR, "QUOTA_EXCEEDED", 402, {
          quota: {
            plan: quotaCheck.quota.plan,
            creditsRequired: quotaCheck.quota.creditsRequired,
            creditsUsed: quotaCheck.quota.creditsUsed,
            creditsTotal: quotaCheck.quota.creditsTotal,
            remainingCredits: quotaCheck.quota.creditsRemaining,
            resetAt: quotaCheck.quota.period === "trial" ? null : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
            upgradeRecommended: true,
          },
        });
      }
      quota = quotaCheck.quota;
      planInfo = quotaCheck.planInfo;
      credits = quotaCheck.credits;
    }

    // Execute agent
    const context: AgentRunContext = {
      userId: user.id,
      userRole: user.role.toLowerCase(),
      isPremium: isUnlimited || user.isPremium,
      requestId: crypto.randomUUID(),
      timestamp: new Date(),
      db: null,
    };

    console.log(`[AI Agents Run] START requestId=${requestId} user=${userId} role=${userRole} agent=${canonicalAgentId} alias=${agentId} unlimited=${isUnlimited}`);

    const result: AgentRunResult = await runAgent({
      agent,
      input,
      context,
      outputFormat,
    });

    const durationMs = Date.now() - startTime;
    console.log(`[AI Agents Run] END requestId=${requestId} user=${userId} agent=${canonicalAgentId} success=${result.success} duration=${durationMs}ms`);

    // Determine error code from result if failed
    let errorCode: string | null = null;
    if (!result.success) {
      const err = (result.error || "").toLowerCase();
      if (err.includes("output") && (err.includes("valid") || err.includes("format"))) {
        errorCode = "OUTPUT_VALIDATION_ERROR";
      } else if (err.includes("provider") || err.includes("timeout") || err.includes("busy")) {
        errorCode = "PROVIDER_ERROR";
      } else if (err.includes("empty") || err.includes("no output") || err.includes("tidak")) {
        errorCode = "PROVIDER_EMPTY_RESPONSE";
      } else {
        errorCode = "UNKNOWN_ERROR";
      }
    }

    // Deduct credits only after successful result
    let deductionResult: { deducted: boolean; reason?: string } | undefined;
    if (result.success && !isUnlimited) {
      deductionResult = await deductCreditsAtomic(user.id, planInfo, credits);
    }

    // Build standardized response
    return NextResponse.json({
      success: result.success,
      requestId,
      agentId: canonicalAgentId,
      output: result.output,
      text: result.text,
      error: result.success ? null : (result.error || GENERIC_ERROR),
      code: errorCode,
      warnings: result.warnings || [],
      qualityScore: result.qualityScore || 0,
      provider: result.provider || "none",
      model: result.model || "unknown",
      latencyMs: result.latencyMs || 0,
      metadata: {
        agentId: canonicalAgentId,
        toolLabel: agentLabel,
        model: result.model || "unknown",
        createdAt: new Date().toISOString(),
        requestId,
      },
      _quota: isUnlimited ? {
        mode: "unlimited",
        plan: "Premium",
        creditsRequired: 0,
        creditsUsed: 0,
        creditsTotal: 999999,
        remainingCredits: 999999,
        wouldBlock: false,
      } : {
        mode: quota.mode,
        plan: quota.plan,
        creditsRequired: quota.creditsRequired,
        creditsUsed: deductionResult?.deducted ? quota.creditsUsed + credits : quota.creditsUsed,
        creditsTotal: quota.creditsTotal,
        remainingCredits: deductionResult?.deducted ? Math.max(0, quota.creditsRemaining - credits) : quota.creditsRemaining,
        wouldBlock: quota.wouldBlock,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[AI Agents Run] ERROR requestId=${requestId} user=${userId} role=${userRole} agent=${resolvedAgentId || "unknown"} duration=${durationMs}ms:`, error);

    if (error instanceof Error && error.name === "ProviderChainFailedError") {
      return jsonError("Server kecerdasan artifisial sedang sibuk. Coba lagi beberapa saat.", "PROVIDER_BUSY", 503, {
        metadata: { agentId: resolvedAgentId, createdAt: new Date().toISOString(), requestId },
      });
    }

    if (error instanceof SyntaxError) {
      return jsonError("Data tidak valid. Mohon periksa kembali isian Anda.", "INVALID_INPUT", 400);
    }

    return jsonError(GENERIC_ERROR, "INTERNAL_ERROR", 500, {
      metadata: { agentId: resolvedAgentId, createdAt: new Date().toISOString(), requestId },
    });
  }
}
