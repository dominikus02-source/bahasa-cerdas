/**
 * GET /api/player/weekly-recap — Weekly Learning Recap for MURID_PREMIUM.
 *
 * Provides concise, data-driven weekly summary of learning progress.
 * Server-authoritative: client cannot inject context.
 *
 * Auth: required (Supabase SSR)
 * Role: MURID only
 * Entitlement: MURID_PREMIUM via Premium Economy
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { resolvePlan } from "@/lib/premium-economy/plans";
import { buildWeeklyRecap } from "@/lib/learning-loop/weekly-recap";

export async function GET(req: NextRequest) {
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

    // ── Step 3: Entitlement check — MURID_PREMIUM ──
    const { plan } = await resolvePlan(user.id);
    const isFounder = user.isFounder === true || user.role === "ADMIN";
    const isPremium = plan === "MURID_PREMIUM" || plan === "PRO" || plan === "FOUNDER";

    if (!isPremium && !isFounder) {
      return NextResponse.json(
        {
          error: "Fitur ini hanya untuk Premium",
          code: "ENTITLEMENT_REQUIRED",
          message: "Upgrade ke Premium untuk mengakses Weekly Learning Recap.",
        },
        { status: 403 }
      );
    }

    // ── Step 4: Build weekly recap ──
    const recap = await buildWeeklyRecap(user.id);

    // ── Step 5: Return response ──
    return NextResponse.json({
      ok: true,
      period: {
        start: recap.period.start.toISOString(),
        end: recap.period.end.toISOString(),
        label: recap.period.label,
      },
      summary: {
        activities: recap.summary.activities,
        questions: recap.summary.questions,
        accuracy: recap.summary.accuracy !== null ? Math.round(recap.summary.accuracy * 100) : null,
        activeDays: recap.summary.activeDays,
      },
      strength: recap.strength
        ? {
            skill: recap.strength.skill,
            label: recap.strength.label,
            accuracy: Math.round((recap.strength.accuracy ?? 0) * 100),
          }
        : null,
      focus: recap.focus
        ? {
            skill: recap.focus.skill,
            label: recap.focus.label,
            accuracy: Math.round((recap.focus.accuracy ?? 0) * 100),
          }
        : null,
      improvements: recap.improvements,
      recommendations: recap.recommendations,
    });
  } catch (error) {
    console.error("[WeeklyRecap] ERROR:", error);
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
