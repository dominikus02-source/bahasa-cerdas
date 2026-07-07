/**
 * POST /api/ai/agents/stream — Streaming Agent Execution (SSE)
 *
 * Returns events as Server-Sent Events.
 * Event format: { type, ...data }
 *
 * Auth: required (Supabase SSR)
 * Rate-limited per agent type
 * Phase 9D: hard quota check, deduction only after final_result
 *
 * Deduction rules:
 * - Check quota before stream starts; if blocked, send quota_error + done
 * - Deduct only after final_result event is successfully produced
 * - Never deduct on abort/error/incomplete stream
 * - Never double-deduct
 */

import { NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import "@/src/ai";
import { checkAgentRateLimit } from "@/src/ai/core/rate-limit";
import { runAgentStream, type StreamEvent } from "@/src/ai/core/agent-stream-runner";
import { checkAndPrepareDeduction, deductCreditsAtomic, ensureMonthlyLedger } from "@/lib/ai-gateway/quota-checker";
import type { AgentRunContext } from "@/src/ai/core/agent-types";

const QUOTA_ERROR_MSG = "Credit AI Anda sudah habis. Upgrade atau tunggu periode berikutnya.";

function eventToSSE(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { agentId, input, options } = body as {
      agentId: string;
      input: Record<string, unknown>;
      options?: { qualityCheck?: boolean };
    };

    if (!agentId || typeof agentId !== "string") {
      return new Response(JSON.stringify({ error: "agentId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!input || typeof input !== "object") {
      return new Response(JSON.stringify({ error: "input is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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
      input as Record<string, unknown>
    );

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: StreamEvent) => {
          try {
            controller.enqueue(encoder.encode(eventToSSE(event)));
          } catch {
            // Stream may be closed
          }
        };

        // If blocked, send quota_error and done — do NOT execute provider
        if (blocked) {
          sendEvent({
            type: "quota_error" as StreamEvent["type"],
            error: "QUOTA_EXCEEDED",
            message: QUOTA_ERROR_MSG,
            quota: {
              plan: quota.plan,
              creditsRequired: quota.creditsRequired,
              creditsUsed: quota.creditsUsed,
              creditsTotal: quota.creditsTotal,
              remainingCredits: quota.creditsRemaining,
              resetAt: quota.period === "trial" ? null : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
              upgradeRecommended: true,
            },
          } as any);
          try {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch {}
          return;
        }

        // Send quota info as first event
        sendEvent({
          type: "quota",
          plan: quota.plan,
          creditsRequired: quota.creditsRequired,
          remainingCredits: quota.creditsRemaining,
          mode: quota.mode,
          wouldBlock: quota.wouldBlock,
        });

        const context: AgentRunContext = {
          userId: user.id,
          userRole: user.role.toLowerCase(),
          isPremium,
          requestId: crypto.randomUUID(),
          timestamp: new Date(),
          db: null,
        };

        // Track whether final_result was received for deduction
        let hasFinalResult = false;

        const wrappedSendEvent = (event: StreamEvent) => {
          if (event.type === "final_result") {
            hasFinalResult = true;
          }
          sendEvent(event);
        };

        await runAgentStream(
          {
            agentId,
            input: input ?? {},
            context,
            outputFormat: "json",
            qualityCheck: options?.qualityCheck ?? true,
          },
          wrappedSendEvent
        );

        // Deduct only after final_result was successfully produced
        if (hasFinalResult) {
          await deductCreditsAtomic(user.id, planInfo, credits);
        }

        try {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          // already closed
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[AI Agents Stream] Unhandled error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
