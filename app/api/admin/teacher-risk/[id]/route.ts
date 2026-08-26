import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * GET /api/admin/teacher-risk/[id]
 * Detail case + timeline append-only (signals + actions). Founder-only.
 * Evidence tersamarkan (tanpa rekening penuh).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const riskCase = await db.teacherRiskCase.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, fullName: true, email: true } },
        signals: { orderBy: { detectedAt: "desc" }, take: 50 },
        actions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { teacher: { select: { fullName: true } } },
        },
      },
    });

    if (!riskCase) {
      return NextResponse.json({ error: "Case tidak ditemukan" }, { status: 404 });
    }

    const timeline = [
      ...riskCase.signals.map((s) => ({
        at: s.detectedAt,
        actor: "SYSTEM",
        actorType: "SYSTEM" as const,
        action: `Signal ${s.signalType} (${s.severity})`,
        detail: s.dedupeKey,
      })),
      ...riskCase.actions.map((a) => ({
        at: a.createdAt,
        actor: a.actorType === "ADMIN" ? (a.teacher?.fullName ?? "Admin") : "SYSTEM",
        actorType: a.actorType,
        action: a.actionType,
        detail: a.reason ?? "",
      })),
    ].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));

    return NextResponse.json({
      id: riskCase.id,
      teacherId: riskCase.teacherId,
      teacherName: riskCase.teacher.fullName,
      teacherEmail: riskCase.teacher.email,
      status: riskCase.status,
      severity: riskCase.severity,
      reason: riskCase.reason,
      openedAt: riskCase.openedAt,
      resolvedAt: riskCase.resolvedAt,
      resolvedBy: riskCase.resolvedBy,
      resolution: riskCase.resolution,
      signals: riskCase.signals.map((s) => ({
        id: s.id,
        signalType: s.signalType,
        severity: s.severity,
        detectedAt: s.detectedAt,
        dedupeKey: s.dedupeKey,
        evidence: s.evidence,
      })),
      timeline,
    });
  } catch (error) {
    console.error("GET /api/admin/teacher-risk/[id] error:", error);
    return NextResponse.json({ error: "Gagal memuat detail case" }, { status: 500 });
  }
}
