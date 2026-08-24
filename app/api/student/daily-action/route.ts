/**
 * Daily Action Engine 1.0 — API Route
 *
 * GET  /api/student/daily-action  → Today's action (or NONE)
 * POST /api/student/daily-action  → Submit answer
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { getOrCreateDailyAction, answerDailyAction, DailyActionError } from "@/lib/daily-action";
import type {
  DailyActionResponse,
  DailyActionAnswerResult,
} from "@/lib/daily-action";

/** Wrap requireAuth — returns user or NextResponse on error. */
async function getAuthUser() {
  try {
    const user = await requireAuth();
    return { user, error: null };
  } catch (err) {
    return { user: null, error: (err as Error).message || "Unauthorized" };
  }
}

// ── GET: Fetch today's Daily Action ──────────────────────────

export async function GET() {
  const auth = await getAuthUser();
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  if (auth.user.role !== "MURID") {
    return NextResponse.json(
      { error: "Hanya untuk murid." },
      { status: 403 }
    );
  }

  try {
    const action = await getOrCreateDailyAction(auth.user.id);

    if (!action) {
      const response: DailyActionResponse = { status: "NONE" };
      return NextResponse.json(response);
    }

    if (action.status === "COMPLETED") {
      const response: DailyActionResponse = {
        status: "COMPLETED",
        id: action.id,
        source: action.source,
        isCorrect: action.isCorrect,
        date: action.date,
      };
      return NextResponse.json(response);
    }

    // PENDING — return question for display (NO correctAnswer!)
    const response: DailyActionResponse = {
      status: "PENDING",
      id: action.id,
      source: action.source,
      skill: action.skill,
      questionType: (action as { questionType?: string }).questionType ?? "PILIHAN_GANDA",
      difficulty: action.difficulty,
      questionText: action.questionText,
      options: action.options,
      date: action.date,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("Daily action GET error:", err);
    return NextResponse.json(
      { error: "Gagal memuat tantangan hari ini." },
      { status: 500 }
    );
  }
}

// ── POST: Submit answer ──────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await getAuthUser();
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  if (auth.user.role !== "MURID") {
    return NextResponse.json(
      { error: "Hanya untuk murid." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { answer } = body;

    // Validate payload
    if (!answer || typeof answer !== "string" || answer.trim().length === 0) {
      return NextResponse.json(
        { error: "Jawaban tidak boleh kosong." },
        { status: 400 }
      );
    }

    const result: DailyActionAnswerResult = await answerDailyAction(
      auth.user.id,
      answer.trim()
    );

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DailyActionError) {
      const status =
        err.code === "NOT_FOUND"
          ? 404
          : err.code === "ALREADY_COMPLETED"
          ? 409
          : err.code === "QUESTION_NOT_FOUND"
          ? 404
          : 400;
      return NextResponse.json({ error: err.message }, { status });
    }

    console.error("Daily action POST error:", err);
    return NextResponse.json(
      { error: "Gagal memproses jawaban." },
      { status: 500 }
    );
  }
}
