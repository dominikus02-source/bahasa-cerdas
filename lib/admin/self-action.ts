import { NextResponse } from "next/server";

/**
 * Founder kini juga bisa mendapat komisi guru, dan semua founder bisa
 * menyetujui penarikan. Supaya tidak ada yang menyetujui uangnya sendiri,
 * aksi uang atas milik pelaku sendiri ditolak — harus diproses founder lain.
 */
export function rejectSelfMoneyAction(actorId: string, ownerId: string | null | undefined) {
  if (ownerId && ownerId === actorId) {
    return NextResponse.json(
      { error: "Tidak bisa memproses penarikan/pencairan milik sendiri. Minta founder lain.", code: "SELF_ACTION_BLOCKED" },
      { status: 403 },
    );
  }
  return null;
}
