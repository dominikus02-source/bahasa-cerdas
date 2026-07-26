import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { buildLatihan, buildKuis, gradeLatihan } from "@/lib/penugasan-content";
import { upsertNilaiOtomatis } from "@/lib/penilaian/upsert-nilai";
import { calcLevel, calcLeagueFromXP } from "@/lib/xp";

// Submit a Penugasan: grade the Latihan server-side, store the score, and push
// it into the teacher's Nilai rekap. XP is awarded once (first completion).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const answers: Record<string, string | number> = body?.answers ?? {};

    const penugasan = await db.penugasan.findUnique({
      where: { id },
      include: {
        unit: { select: { content: true, xpReward: true, coinReward: true } },
        group: { include: { members: { where: { userId: user.id }, select: { id: true } } } },
        submissions: { where: { userId: user.id }, select: { status: true } },
      },
    });

    if (!penugasan || penugasan.group.members.length === 0) {
      return NextResponse.json({ error: "Tugas tidak ditemukan", code: "TUGAS_NOT_FOUND" }, { status: 404 });
    }

    let content: any = {};
    try { content = penugasan.unit.content ? JSON.parse(penugasan.unit.content) : {}; } catch { content = {}; }

    const isKuis = penugasan.jenis === "KUIS";
    // PRAKTIK-only assignments have no gradeable questions — the student never saw
    // any latihan, so grading against buildLatihan(content) here would push a false 0.
    const questions = isKuis ? buildKuis(content) : penugasan.jenis === "PRAKTIK" ? [] : buildLatihan(content);
    const { correct, total, score } = gradeLatihan(questions, answers);

    const alreadyDone = penugasan.submissions[0]?.status === "COMPLETED";

    await db.penugasanSubmission.upsert({
      where: { penugasanId_userId: { penugasanId: id, userId: user.id } },
      update: { status: "COMPLETED", score, completedAt: new Date() },
      create: { penugasanId: id, userId: user.id, status: "COMPLETED", score, completedAt: new Date(), startedAt: new Date() },
    });

    // Best-effort side effects — never fail the submission.
    try {
      // Push the score into the teacher's rekap nilai — skip when there were no
      // gradeable questions (PRAKTIK-only); that nilai comes later from the
      // teacher's manual praktikNilai review instead.
      if (total > 0) {
        await upsertNilaiOtomatis({
          userId: user.id,
          groupId: penugasan.groupId,
          kategoriNama: isKuis ? "Kuis" : "Tugas Harian",
          skor: score,
          sumberType: isKuis ? "QUIZ" : "PENUGASAN",
          sumberId: penugasan.id,
          keterangan: penugasan.judul,
        });
      }
      // Award XP + coins only on the first completion.
      if (!alreadyDone) {
        const newXp = (user.xp || 0) + (penugasan.unit.xpReward || 0)
        await db.user.update({
          where: { id: user.id },
          data: {
            xp: { increment: penugasan.unit.xpReward || 0 },
            coins: { increment: penugasan.unit.coinReward || 0 },
            level: calcLevel(newXp),
            league: calcLeagueFromXP(newXp),
          },
        });
      }
    } catch (e) {
      console.error("penugasan submit side-effect error:", e);
    }

    return NextResponse.json({ success: true, data: { score, correct, total } });
  } catch (error) {
    console.error("POST /api/murid/penugasan/[id]/submit error:", error);
    return NextResponse.json({ error: "Tugas belum berhasil dikirim. Silakan coba lagi." }, { status: 500 });
  }
}
