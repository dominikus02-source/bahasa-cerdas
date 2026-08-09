import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";

/** Penarikan minimum, supaya biaya transfer tidak lebih besar dari nominalnya. */
const MINIMAL_PENARIKAN = 50_000;

/**
 * Ajukan penarikan saldo hasil penjualan karya.
 *
 * Halaman /guru/pengaturan/saldo sudah memanggil endpoint ini sejak lama tetapi
 * rutenya tidak pernah ada: tombol "Cairkan Saldo" selalu menabrak 404, jadi
 * uang guru masuk tapi tidak pernah bisa keluar.
 *
 * Ini menyentuh uang sungguhan, jadi dua hal dijaga ketat:
 *   1. Pengurangan saldo memakai `updateMany` dengan syarat `saldo >= amount`
 *      di dalam transaksi. Dengan `update` biasa, dua permintaan bersamaan
 *      bisa sama-sama lolos pengecekan lalu menarik dua kali dari saldo yang
 *      sama (saldo jadi minus).
 *   2. Rekening disalin ke baris Withdrawal saat pengajuan, BUKAN dibaca dari
 *      profil saat admin memproses — kalau guru mengganti rekening setelah
 *      mengajukan, transfer harus tetap ke rekening yang dia setujui saat itu.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    // P1-B SPECIAL CASE: Withdraw remains GURU/founder-only by financial policy. ADMIN is intentionally denied. Do not replace this guard with isTeacherOrStudent().
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await rateLimitRoute(req, {
      maxRequests: 5,
      windowSeconds: 60,
      identifier: "guru-withdraw",
    });
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const nominal = Math.floor(Number(body.amount));

    if (!Number.isFinite(nominal) || nominal <= 0) {
      return NextResponse.json({ error: "Nominal penarikan tidak valid." }, { status: 400 });
    }
    if (nominal < MINIMAL_PENARIKAN) {
      return NextResponse.json(
        { error: `Penarikan minimal Rp ${MINIMAL_PENARIKAN.toLocaleString("id")}.` },
        { status: 400 }
      );
    }

    const profil = await db.profile.findUnique({
      where: { userId: user.id },
      select: { bank: true, bankHolder: true, bankNumber: true },
    });

    if (!profil?.bank?.trim() || !profil?.bankHolder?.trim() || !profil?.bankNumber?.trim()) {
      return NextResponse.json(
        { error: "Lengkapi data rekening di Pengaturan sebelum menarik saldo." },
        { status: 400 }
      );
    }

    // Satu pengajuan tertunda dalam satu waktu. Tanpa ini, guru bisa mengajukan
    // beberapa penarikan berturut-turut yang totalnya melebihi saldo — masing-
    // masing lolos karena saldonya baru berkurang saat admin memproses.
    const tertunda = await db.withdrawal.findFirst({
      where: { userId: user.id, status: { in: ["PENDING", "APPROVED"] } },
      select: { id: true },
    });
    if (tertunda) {
      return NextResponse.json(
        { error: "Masih ada penarikan yang sedang diproses. Tunggu sampai selesai ya." },
        { status: 409 }
      );
    }

    const hasil = await db.$transaction(async (tx) => {
      // Kurangi saldo hanya kalau memang mencukupi — syaratnya dievaluasi di
      // database, bukan di aplikasi, sehingga dua permintaan berbarengan tidak
      // bisa sama-sama lolos.
      const dikurangi = await tx.user.updateMany({
        where: { id: user.id, saldo: { gte: nominal } },
        data: { saldo: { decrement: nominal } },
      });

      if (dikurangi.count === 0) {
        return { cukup: false as const };
      }

      const penarikan = await tx.withdrawal.create({
        data: {
          userId: user.id,
          amount: nominal,
          bankName: profil.bank!,
          accountHolder: profil.bankHolder!,
          accountNumber: profil.bankNumber!,
          status: "PENDING",
        },
        select: { id: true, amount: true, status: true, createdAt: true },
      });

      const akun = await tx.user.findUnique({
        where: { id: user.id },
        select: { saldo: true },
      });

      return { cukup: true as const, penarikan, saldoBaru: akun?.saldo ?? 0 };
    });

    if (!hasil.cukup) {
      return NextResponse.json({ error: "Saldo tidak mencukupi." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      saldo: hasil.saldoBaru,
      penarikan: {
        ...hasil.penarikan,
        createdAt: hasil.penarikan.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Guru withdraw error:", error);
    return NextResponse.json({ error: "Gagal memproses penarikan" }, { status: 500 });
  }
}
