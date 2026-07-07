/**
 * POST /api/ai/agents/run — Universal Agent Execution
 *
 * Executes any registered AI agent by ID.
 * Body: { agentId, input }
 *
 * Auth: required (Supabase SSR)
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
import type { AgentRunContext, AgentRunResult } from "@/src/ai/core/agent-types";

// Generasi dokumen panjang (RPP 8000 token + retry) bisa melewati default
// timeout serverless — tanpa ini fungsi diputus di tengah dan user melihat gagal.
export const maxDuration = 150;

const QUOTA_ERROR = "Credit AI Anda sudah habis. Upgrade atau tunggu periode berikutnya.";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { agentId, input } = body as { agentId: string; input: Record<string, unknown> };

    if (!agentId || typeof agentId !== "string") {
      return NextResponse.json({ error: "agentId is required" }, { status: 400 });
    }

    const agent = getAgent(agentId as never);
    if (!agent) {
      return NextResponse.json({ error: `Agent '${agentId}' not found` }, { status: 404 });
    }

    // Rate limit check
    const isPremium = user.isPremium;
    const rl = await checkAgentRateLimit(req, agentId, isPremium);
    if (rl) return rl;

    // Ensure monthly ledger exists
    await ensureMonthlyLedger(user);

    // Phase 9D — hard quota check
    const { blocked, quota, planInfo, credits } = await checkAndPrepareDeduction(
      user,
      agentId,
      (input ?? {}) as Record<string, unknown>
    );

    if (blocked) {
      return NextResponse.json({
        error: "QUOTA_EXCEEDED",
        message: QUOTA_ERROR,
        quota: {
          plan: quota.plan,
          creditsRequired: quota.creditsRequired,
          creditsUsed: quota.creditsUsed,
          creditsTotal: quota.creditsTotal,
          remainingCredits: quota.creditsRemaining,
          resetAt: quota.period === "trial" ? null : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
          upgradeRecommended: true,
        },
      }, { status: 402 });
    }

    const context: AgentRunContext = {
      userId: user.id,
      userRole: user.role.toLowerCase(),
      isPremium,
      requestId: crypto.randomUUID(),
      timestamp: new Date(),
      db: null,
    };

    const result: AgentRunResult = await runAgent({
      agent,
      input: input ?? {},
      context,
      outputFormat: "json",
    });

    // Deduct credits only after successful result
    let deductionResult: { deducted: boolean; reason?: string } | undefined;
    if (result.success) {
      deductionResult = await deductCreditsAtomic(
        user.id,
        planInfo,
        credits
      );
    }

    // Attach quota metadata to response
    const response = {
      ...result,
      _quota: {
        mode: quota.mode,
        plan: quota.plan,
        creditsRequired: quota.creditsRequired,
        creditsUsed: deductionResult?.deducted
          ? quota.creditsUsed + credits
          : quota.creditsUsed,
        creditsTotal: quota.creditsTotal,
        remainingCredits: deductionResult?.deducted
          ? Math.max(0, quota.creditsRemaining - credits)
          : quota.creditsRemaining,
        wouldBlock: quota.wouldBlock,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[AI Agents Run] Unhandled error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
