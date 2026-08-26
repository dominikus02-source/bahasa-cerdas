import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { processWithdrawal } from "@/lib/commission/withdrawals";
import type { WithdrawalAction } from "@/lib/commission/types";

/**
 * PATCH /api/admin/teacher-commissions/withdrawals/[id]
 * Admin memproses penarikan komisi guru (founder-only, audited).
 *
 * body: { action: "APPROVE" | "REJECT" | "TRANSFER", notes? }
 *
 * State machine (P7C §14), transisi atomik + wallet update dalam satu transaksi:
 *   PENDING → APPROVED (dana tetap terkunci)
 *   APPROVED → TRANSFERRED (locked → lifetimeWithdrawn)
 *   PENDING → REJECTED (locked → available — dana kembali)
 * Callback/klik dobel aman: transisi diklaim dengan `updateMany WHERE status`.
 */
export async function PATCH(
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
    const action = typeof body.action === "string" ? (body.action as WithdrawalAction) : null;

    if (!action || !["APPROVE", "REJECT", "TRANSFER"].includes(action)) {
      return NextResponse.json(
        { error: 'action wajib: "APPROVE" | "REJECT" | "TRANSFER"' },
        { status: 400 }
      );
    }

    const result = await processWithdrawal(id, action, admin.id);

    if (!result.ok) {
      switch (result.error) {
        case "NOT_FOUND":
          return NextResponse.json({ error: "Penarikan tidak ditemukan." }, { status: 404 });
        case "INVALID_TRANSITION":
          return NextResponse.json(
            { error: "Transisi status tidak valid untuk penarikan ini." },
            { status: 409 }
          );
        default:
          return NextResponse.json({ error: "Sudah diproses sebelumnya." }, { status: 409 });
      }
    }

    return NextResponse.json({
      ok: true,
      withdrawal: { id: result.id, amount: result.amount, status: result.newStatus },
    });
  } catch (error) {
    console.error("PATCH /api/admin/teacher-commissions/withdrawals/[id] error:", error);
    return NextResponse.json({ error: "Gagal memproses penarikan" }, { status: 500 });
  }
}
