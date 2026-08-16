import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { getLearnerState } from "@/lib/learner-state/service";
import { profileFromLearnerState } from "@/lib/diagnostic/profile";
import { buildPersonalizedAction } from "@/lib/diagnostic/personalization";
import { DIAGNOSTIC_PROFILE_THRESHOLDS, DIAGNOSTIC_SKILL_LABELS, DIAGNOSTIC_CONFIDENCE } from "@/lib/diagnostic/config";

/**
 * STEP 6.3 — GET /api/guru/kelasku/[id]/insight
 * Insight berbasis EVIDENCE untuk guru (bukan analytics engine baru):
 *  - tanpa ?muridId → ringkasan per-skill seluruh kelas (dari LearnerState
 *    tiap anggota; skill hanya tampil bila evidence kelas cukup ≥5 attempts,
 *    selain itu "Belum cukup data" — BUKAN "lemah").
 *  - dengan ?muridId → profil per murid (category via threshold 4E.1) + Saran BC.
 * Guru tetap menentukan nilai — BC hanya memberi insight.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const group = await db.group.findUnique({
      where: { id },
      select: { teacherId: true, members: { select: { userId: true } } },
    });
    if (!group) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    if (group.teacherId !== user.id && user.role !== "ADMIN" && !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const muridId = new URL(req.url).searchParams.get("muridId");
    if (muridId) {
      // Pastikan murid benar-benar anggota kelas ini.
      if (!group.members.some((m) => m.userId === muridId)) {
        return NextResponse.json({ error: "Murid tidak tergabung di kelas ini" }, { status: 403 });
      }
      const states = await getLearnerState(muridId);
      const profile = profileFromLearnerState(states, Object.keys(DIAGNOSTIC_SKILL_LABELS));
      const action = buildPersonalizedAction(profile, "LEARNER_STATE");
      return NextResponse.json({
        mode: "MURID",
        skills: profile.perSkill
          .filter((s) => s.attempts > 0 || s.category !== "INSUFFICIENT_EVIDENCE")
          .map((s) => ({
            skill: s.skill,
            label: s.label,
            attempts: s.attempts,
            accuracy: s.accuracy,
            category: s.category,
          })),
        saran: {
          text: action.explanation,
          targetSkillLabel: action.targetSkillLabel,
          title: action.title,
        },
      });
    }

    // Kelas: agregasi LearnerState anggota (cap 40 — kelas sekolah).
    const memberIds = group.members.slice(0, 40).map((m) => m.userId);
    const statesList = (await Promise.all(memberIds.map((uid) => getLearnerState(uid).catch(() => [])))).filter((s) => s.length > 0);

    const bySkill = new Map<string, { attempts: number; correct: number; accSum: number; n: number }>();
    for (const states of statesList) {
      for (const st of states) {
        const agg = bySkill.get(st.skill) ?? { attempts: 0, correct: 0, accSum: 0, n: 0 };
        agg.attempts += st.attemptCount;
        agg.correct += st.correctCount;
        if (st.accuracy != null) { agg.accSum += st.accuracy; agg.n += 1; }
        bySkill.set(st.skill, agg);
      }
    }

    const MIN_CLASS_ATTEMPTS = 5; // honest threshold — bukan "lemah" tanpa bukti
    const skills = [...bySkill.entries()]
      .map(([skill, agg]) => {
        const accuracy = agg.n > 0 ? agg.accSum / agg.n : null;
        let category = "BELUM_CUKUP_DATA";
        if (agg.attempts >= MIN_CLASS_ATTEMPTS && accuracy != null) {
          category = accuracy >= DIAGNOSTIC_PROFILE_THRESHOLDS.STRONG_MIN
            ? "STRONG"
            : accuracy >= DIAGNOSTIC_PROFILE_THRESHOLDS.DEVELOPING_MIN
              ? "DEVELOPING"
              : "WEAK";
        }
        return {
          skill,
          label: DIAGNOSTIC_SKILL_LABELS[skill] ?? skill,
          attempts: agg.attempts,
          accuracy: accuracy != null ? Math.round(accuracy * 100) : null,
          category,
        };
      })
      .sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1));

    return NextResponse.json({
      mode: "KELAS",
      muridDenganEvidence: statesList.length,
      totalMurid: group.members.length,
      confidence: statesList.length > 0 ? "PROVISIONAL" : DIAGNOSTIC_CONFIDENCE.INSUFFICIENT_EVIDENCE,
      skills,
    });
  } catch (error) {
    console.error("GET /api/guru/kelasku/[id]/insight error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
