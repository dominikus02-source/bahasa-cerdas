import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { resolveRiskCase } from "@/lib/guru/risk/signals";

/**
 * POST /api/admin/teacher-risk/[id]/decision
 * Keputusan admin (founder-only, P8C §12): CLEAR / RESTRICT / KEEP_REVIEW.
 * WAJIB reason — tidak ada keputusan senyap. Semua di-audit (RiskAction +
 * AdminPaymentAuditLog). Notifikasi respectful ke guru bila relevan.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const decision = body.decision;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!["CLEAR", "RESTRICT", "KEEP_REVIEW"].includes(decision)) {
      return NextResponse.json(
        { error: 'decision wajib: "CLEAR" | "RESTRICT" | "KEEP_REVIEW"' },
        { status: 400 }
      );
    }

    const result = await resolveRiskCase({ caseId: id, decision, adminUserId: admin.id, reason });

    if (!result.ok) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json({ error: "Case tidak ditemukan" }, { status: 404 });
        case "INVALID_STATE":
          return NextResponse.json({ error: "Case sudah ditutup" }, { status: 409 });
        case "REASON_REQUIRED":
          return NextResponse.json({ error: "Alasan wajib diisi" }, { status: 400 });
      }
    }

    // ── Notifikasi respectful ke guru bila keputusan memengaruhi dirinya ──
    const riskCase = await db.teacherRiskCase.findUnique({
      where: { id },
      select: { teacherId: true },
    });
    if (riskCase) {
      const body2 =
        decision === "CLEAR"
          ? "Pemeriksaan selesai. Pencairan Anda dapat dilanjutkan seperti biasa."
          : decision === "RESTRICT"
            ? "Pencairan sementara dibatasi selama pemeriksaan berlangsung. Penghasilan Anda tetap aman."
            : "Pencairan Anda masih dalam pemeriksaan. Anda akan mendapat kabar berikutnya.";
      db.notifikasi
        .create({
          data: {
            userId: riskCase.teacherId,
            title: "Pembaruan status pencairan",
            body: body2,
            type: "KOMISI",
            data: { riskCaseId: id },
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({ ok: true, caseId: id, newStatus: result.newStatus });
  } catch (error) {
    console.error("POST /api/admin/teacher-risk/[id]/decision error:", error);
    return NextResponse.json({ error: "Gagal memproses keputusan" }, { status: 500 });
  }
}
