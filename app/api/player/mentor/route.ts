/**
 * POST /api/player/mentor — AI Mentor for MURID_PREMIUM.
 *
 * Provides contextual learning explanations based on student's learning evidence.
 * Server-authoritative: client cannot inject context.
 *
 * Auth: required (Supabase SSR)
 * Role: MURID only
 * Entitlement: MURID_PREMIUM via Premium Economy
 * Rate limit: 10 req/min (via existing rate limiter)
 * Usage: AI_MENTOR_DAILY_LIMIT (30/day for MURID_PREMIUM)
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { resolvePlan } from "@/lib/premium-economy/plans";
import { getFeatureLimit } from "@/lib/premium-economy/entitlement";
import { consumeUsage, FeatureLimitError } from "@/lib/premium-economy/usage";
import { checkAgentRateLimit } from "@/src/ai/core/rate-limit";
import { buildMentorContext, buildMentorSystemPrompt, buildMentorUserPrompt, buildDeterministicFallback } from "@/lib/ai-gateway/mentor-context";
import { z } from "zod";

// Output schema for validation
const MentorOutputSchema = z.object({
  headline: z.string(),
  diagnosis: z.string(),
  reason: z.string(),
  action: z.string(),
  encouragement: z.string(),
});
import { callWithFallback, ProviderChainFailedError } from "@/src/ai/core/provider";
import { recordProviderFailure, recordProviderSuccess } from "@/lib/ai-gateway/circuit-breaker";

// Rate limit config for mentor
const RATE_LIMIT_CONFIG = {
  maxRequests: 10,
  windowSeconds: 60,
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = `mentor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    // ── Step 1: Authentication ──
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    // ── Step 2: Role check — MURID only ──
    if (user.role !== "MURID" && !user.isFounder && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Fitur ini hanya untuk murid", code: "FORBIDDEN_ROLE" },
        { status: 403 }
      );
    }

    // ── Step 3: Parse body — minimal, no context injection ──
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine
    }

    // Ignore any client-supplied context — server builds everything
    const _ignoredFields = ["userId", "isPremium", "role", "skill", "accuracy", "prompt"];
    // These fields are intentionally ignored

    // ── Step 4: Entitlement check — MURID_PREMIUM ──
    const { plan } = await resolvePlan(user.id);

    // Founder/Admin bypass
    const isFounder = user.isFounder === true || user.role === "ADMIN";
    const isPremium = plan === "MURID_PREMIUM" || plan === "PRO" || plan === "FOUNDER";

    if (!isPremium && !isFounder) {
      return NextResponse.json(
        {
          error: "Fitur ini hanya untuk Premium",
          code: "ENTITLEMENT_REQUIRED",
          message: "Upgrade ke Premium untuk mengakses Mentor Bahasa Cerdas.",
        },
        { status: 403 }
      );
    }

    // ── Step 5: Rate limit check ──
    const rateLimitResponse = await checkAgentRateLimit(req, "mentor", isPremium);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // ── Step 6: Daily entitlement check ──
    // Skip for Founder/Admin
    if (!isFounder) {
      try {
        const limit = await getFeatureLimit(plan, "AI_MENTOR_DAILY_LIMIT");
        const usage = await consumeUsage(user.id, "AI_MENTOR");
        // If we get here, usage was consumed successfully
      } catch (error) {
        if (error instanceof FeatureLimitError) {
          return NextResponse.json(
            {
              error: "Kuota mentor harianmu sudah habis",
              code: "QUOTA_EXCEEDED",
              message: "Kuota akan reset besok.",
              retryAfter: "tomorrow",
            },
            { status: 429 }
          );
        }
        throw error;
      }
    }

    // ── Step 7: Build context (server-side only) ──
    const context = await buildMentorContext(user.id);

    // ── Step 8: Generate response ──
    let response: {
      headline: string;
      diagnosis: string;
      reason: string;
      action: string;
      encouragement: string;
    };
    let provider = "deterministic";
    let model = "fallback";

    try {
      // Build prompts with context
      const systemPrompt = buildMentorSystemPrompt(context);
      const userPrompt = buildMentorUserPrompt();

      // Call AI provider
      const providerResponse = await callWithFallback({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 500,
        timeoutMs: 30000,
        responseFormat: "json",
      });

      provider = providerResponse.provider;
      model = providerResponse.model;

      // Parse and validate response
      try {
        const parsed = JSON.parse(providerResponse.content);
        response = MentorOutputSchema.parse(parsed);
      } catch {
        // Malformed output — use deterministic fallback
        response = buildDeterministicFallback(context);
        provider = "deterministic-fallback";
      }

      recordProviderSuccess(provider);
    } catch (error) {
      // Provider failure — use deterministic fallback
      if (error instanceof ProviderChainFailedError) {
        recordProviderFailure("groq");
      }
      response = buildDeterministicFallback(context);
      provider = "deterministic-fallback";
    }

    // ── Step 9: Log usage ──
    const durationMs = Date.now() - startTime;
    console.log(`[Mentor] requestId=${requestId} user=${user.id} provider=${provider} duration=${durationMs}ms`);

    // ── Step 10: Return response ──
    return NextResponse.json({
      success: true,
      data: response,
      metadata: {
        requestId,
        provider,
        model,
        latencyMs: durationMs,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[Mentor] ERROR requestId=${requestId} duration=${durationMs}ms:`, error);

    return NextResponse.json(
      {
        error: "Terjadi kesalahan",
        code: "INTERNAL_ERROR",
        message: "Silakan coba lagi beberapa saat.",
      },
      { status: 500 }
    );
  }
}
