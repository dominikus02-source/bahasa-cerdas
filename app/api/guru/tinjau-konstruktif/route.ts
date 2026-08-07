import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  isTeacherOrStudent,
  getReviewQueue,
  aiReviewAnswer,
  approveAnswers,
  saveManualScore,
  sendFeedbackToStudent,
  type SimulationFilter,
  type SimStatus,
} from "@/lib/simulation/SimulationAnalyticsService";

export const dynamic = "force-dynamic";

// Guru meninjau & menilai jawaban konstruktif (Menulis/Berbicara) murid di kelasnya.
async function guruStudentIds(teacherId: string): Promise<string[]> {
  const members = await db.groupMember.findMany({
    where: { group: { teacherId } },
    select: { userId: true },
  });
  return Array.from(new Set(members.map((m) => m.userId)));
}

function parseStatus(raw: string | null): SimStatus | undefined {
  if (!raw) return undefined;
  const list: SimStatus[] = ["SEDANG_DIKERJAKAN", "MENUNGGU_PENILAIAN_AI", "AI_SELESAI_MENILAI", "MENUNGGU_PERSETUJUAN_GURU", "SELESAI"];
  return list.includes(raw as SimStatus) ? (raw as SimStatus) : undefined;
}

/**
 * GET /api/guru/tinjau-konstruktif
 * AI Review Center — jawaban konstruktif dengan confidence, AI feedback,
 * filter (kelas/seksi/status/cari), pagination server-side.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTeacherOrStudent(user)) return NextResponse.json({ error: "Khusus guru" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId") || undefined;
    const seksiRaw = (searchParams.get("seksi") || "ALL").toUpperCase();
    const seksi = seksiRaw === "MENULIS" || seksiRaw === "BERBICARA" ? (seksiRaw as "MENULIS" | "BERBICARA") : undefined;
    const status = parseStatus(searchParams.get("status"));
    const search = searchParams.get("search") || undefined;
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);

    const filter: SimulationFilter = { groupId, seksi, status, search, page, limit };
    const result = await getReviewQueue(user.id, filter);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Gagal memuat data review" }, { status: 500 });
  }
}

/**
 * PATCH /api/guru/tinjau-konstruktif
 * Actions: score (manual), ai (regrade AI), approve (batch), kirim (feedback).
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTeacherOrStudent(user)) return NextResponse.json({ error: "Khusus guru" }, { status: 403 });

    const body = await req.json();
    const action = String(body.action || "score");

    // ── score: nilai manual satu jawaban
    if (action === "score") {
      const answerId = String(body.answerId || "");
      const score = Number(body.score);
      if (!answerId || Number.isNaN(score)) {
        return NextResponse.json({ error: "answerId & score wajib" }, { status: 400 });
      }
      const owned = await isOwnedAnswerGuru(user, answerId);
      if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: 403 });
      const res = await saveManualScore(answerId, user.id, score, body.komentar || undefined);
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    // ── ai: penilaian/regrade AI satu jawaban (reuse gradeConstructed engine)
    if (action === "ai") {
      const answerId = String(body.answerId || "");
      if (!answerId) return NextResponse.json({ error: "answerId wajib" }, { status: 400 });
      const owned = await isOwnedAnswerGuru(user, answerId);
      if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: owned.status });
      const res = await aiReviewAnswer(answerId);
      if (!res.ok) return NextResponse.json({ error: res.error || "AI gagal" }, { status: 503 });
      return NextResponse.json({ success: true, item: res.item });
    }

    // ── approve: setujui batch / satu jawaban (Multiple)
    if (action === "approve") {
      const answerIds = Array.isArray(body.answerIds)
        ? (body.answerIds as string[]).map(String)
        : body.answerId
          ? [String(body.answerId)]
          : [];
      if (answerIds.length === 0) return NextResponse.json({ error: "answerIds wajib" }, { status: 400 });

      // batch finalisasi: semua harus milik guru
      for (const id of answerIds) {
        const owned = await isOwnedAnswerGuru(user, id);
        if (!owned.ok) return NextResponse.json({ error: `Bukan kelasmu: ${owned.error}` }, { status: 403 });
      }

      const res = await approveAnswers(answerIds, user.id, String(body.komentar || ""));
      return NextResponse.json({ success: true, ok: res.ok, failed: res.failed });
    }

    // ── kirim: kirim feedback AI ke murid (notifikasi)
    if (action === "kirim") {
      const answerId = String(body.answerId || "");
      const komentar = String(body.komentar || "");
      if (!answerId || !komentar) return NextResponse.json({ error: "answerId & komentar wajib" }, { status: 400 });
      const owned = await isOwnedAnswerGuru(user, answerId);
      if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: 403 });
      const res = await sendFeedbackToStudent(answerId, komentar);
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 });
      await saveManualScore(answerId, user.id, Number(body.score ?? 0), komentar).catch(() => {});
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Gagal memproses permintaan" }, { status: 500 });
  }
}

async function isOwnedAnswerGuru(user: { id: string; role: string; isFounder: boolean }, answerId: string): Promise<{ ok: boolean; status: number; error?: string }> {
  if (user.role === "ADMIN" || user.isFounder) return { ok: true, status: 200 };
  const row = await db.testAnswer.findUnique({ where: { id: answerId }, select: { userId: true } });
  if (!row) return { ok: false, status: 404, error: "Jawaban tidak ditemukan" };
  const students = await guruStudentIds(user.id);
  if (!students.includes(row.userId)) return { ok: false, status: 403, error: "Murid ini bukan di kelasmu" };
  return { ok: true, status: 200 };
}