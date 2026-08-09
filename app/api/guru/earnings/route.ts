import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { isTeacherOrStudent } from "@/lib/teacher/students";

/**
 * Ringkasan pendapatan guru untuk halaman /guru/pengaturan/saldo.
 *
 * Halaman itu sudah memanggil endpoint ini sejak lama, tetapi rutenya tidak
 * pernah ada — jadi saldo selalu tampil Rp 0 dan riwayat penarikan selalu
 * kosong, seolah guru belum pernah menghasilkan apa pun.
 *
 * `saldo` = uang yang siap dicairkan (sudah dikurangi penarikan berjalan),
 * `totalEarned` = akumulasi seumur hidup, keduanya kolom di User yang
 * di-update webhook pembayaran saat transaksi settle.
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [akun, penarikan, rincian, profil] = await Promise.all([
      db.user.findUnique({
        where: { id: user.id },
        select: { saldo: true, totalEarned: true },
      }),
      db.withdrawal.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          amount: true,
          status: true,
          bankName: true,
          accountNumber: true,
          notes: true,
          processedAt: true,
          createdAt: true,
        },
      }),
      db.sellerEarning.findMany({
        where: { sellerId: user.id },
        orderBy: { soldAt: "desc" },
        take: 20,
        select: {
          id: true,
          itemTitle: true,
          itemType: true,
          grossAmount: true,
          platformFee: true,
          netAmount: true,
          status: true,
          soldAt: true,
        },
      }),
      db.profile.findUnique({
        where: { userId: user.id },
        select: { bank: true, bankHolder: true, bankNumber: true },
      }),
    ]);

    // Dipakai UI untuk memberi tahu guru "lengkapi rekening dulu" SEBELUM dia
    // mengetik nominal, alih-alih ditolak setelah menekan Konfirmasi.
    const rekeningLengkap = Boolean(
      profil?.bank?.trim() && profil?.bankHolder?.trim() && profil?.bankNumber?.trim()
    );

    return NextResponse.json({
      saldo: akun?.saldo ?? 0,
      totalEarned: akun?.totalEarned ?? 0,
      rekeningLengkap,
      rekening: rekeningLengkap
        ? { bank: profil!.bank, holder: profil!.bankHolder, number: profil!.bankNumber }
        : null,
      penarikan: penarikan.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        processedAt: p.processedAt?.toISOString() ?? null,
      })),
      rincian: rincian.map((r) => ({ ...r, soldAt: r.soldAt.toISOString() })),
    });
  } catch (error) {
    console.error("Guru earnings error:", error);
    return NextResponse.json({ error: "Gagal memuat data saldo" }, { status: 500 });
  }
}
