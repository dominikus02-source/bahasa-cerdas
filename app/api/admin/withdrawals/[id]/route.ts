import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

const TRANSISI_SAH: Record<string, string[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["TRANSFERRED", "REJECTED"],
  TRANSFERRED: [],
  REJECTED: [],
};

/**
 * Proses satu pengajuan penarikan: setujui, tolak, atau tandai sudah ditransfer.
 *
 * Yang paling penting di sini adalah PENOLAKAN. Saldo guru sudah dikurangi saat
 * dia mengajukan (lihat /api/guru/withdraw — dikurangi di muka supaya tidak bisa
 * mengajukan berkali-kali dari saldo yang sama). Jadi kalau pengajuan ditolak,
 * uangnya WAJIB dikembalikan — kalau tidak, saldo guru hilang begitu saja tanpa
 * pernah ditransfer.
 *
 * Perpindahan status juga dibatasi (TRANSISI_SAH) supaya baris yang sudah
 * selesai tidak bisa diproses ulang — mengembalikan saldo dua kali untuk satu
 * penolakan sama saja mencetak uang.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = String(body.status || "").toUpperCase();
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : null;

    if (!["APPROVED", "REJECTED", "TRANSFERRED"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
    }

    const hasil = await db.$transaction(async (tx) => {
      const penarikan = await tx.withdrawal.findUnique({
        where: { id },
        select: { id: true, userId: true, amount: true, status: true },
      });
      if (!penarikan) return { error: "Penarikan tidak ditemukan.", code: 404 as const };

      const boleh = TRANSISI_SAH[penarikan.status] || [];
      if (!boleh.includes(status)) {
        return {
          error: `Penarikan berstatus ${penarikan.status} tidak bisa diubah ke ${status}.`,
          code: 409 as const,
        };
      }

      // Kembalikan saldo hanya saat menolak, dan hanya sekali — dijaga oleh
      // pembatasan transisi di atas (REJECTED tidak bisa diproses lagi).
      if (status === "REJECTED") {
        await tx.user.update({
          where: { id: penarikan.userId },
          data: { saldo: { increment: penarikan.amount } },
        });
      }

      const diperbarui = await tx.withdrawal.update({
        where: { id },
        data: {
          status: status as any,
          notes,
          processedAt: new Date(),
        },
        select: { id: true, status: true, amount: true, processedAt: true },
      });

      // Beri tahu gurunya — dia tidak punya cara lain untuk tahu hasilnya.
      const pesan =
        status === "REJECTED"
          ? `Penarikan Rp ${penarikan.amount.toLocaleString("id")} ditolak. Saldo sudah dikembalikan ke akunmu.${notes ? ` Catatan: ${notes}` : ""}`
          : status === "APPROVED"
            ? `Penarikan Rp ${penarikan.amount.toLocaleString("id")} disetujui dan sedang diproses transfernya.`
            : `Penarikan Rp ${penarikan.amount.toLocaleString("id")} sudah ditransfer ke rekeningmu.`;

      await tx.notifikasi.create({
        data: {
          userId: penarikan.userId,
          title: "Status Penarikan Saldo",
          body: pesan,
          type: "SALDO",
        },
      });

      return { ok: true as const, penarikan: diperbarui };
    });

    if ("error" in hasil) {
      return NextResponse.json({ error: hasil.error }, { status: hasil.code });
    }

    return NextResponse.json({
      success: true,
      penarikan: {
        ...hasil.penarikan,
        processedAt: hasil.penarikan.processedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("Admin withdrawal update error:", error);
    return NextResponse.json({ error: "Gagal memproses penarikan" }, { status: 500 });
  }
}
