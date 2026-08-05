import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { kirimKeUser, didalamJamSopan } from "@/lib/push";

// Pengingat harian: tugas yang jatuh tempo besok dan BELUM dikerjakan.
//
// Dijadwalkan lewat vercel.json (08:00 UTC = 15:00 WIB) — sore, setelah jam
// sekolah, sebelum waktu tidur. Lihat didalamJamSopan() di lib/push.ts.
//
// Hanya menyasar murid yang benar-benar belum mengumpulkan. Mengirim ke seluruh
// kelas termasuk yang sudah selesai adalah cara tercepat membuat notifikasi ini
// diabaikan — lalu dimatikan.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel Cron menandai permintaannya sendiri. CRON_SECRET dipakai kalau diset,
  // supaya endpoint ini tidak bisa dipicu siapa pun yang menebak URL-nya.
  const rahasia = process.env.CRON_SECRET;
  if (rahasia) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${rahasia}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!didalamJamSopan()) {
    // Berjaga kalau jadwal cron diubah tanpa mengubah niatnya.
    return NextResponse.json({ dilewati: "di luar jam sopan" });
  }

  const besokMulai = new Date();
  besokMulai.setUTCHours(besokMulai.getUTCHours() + 24);
  besokMulai.setUTCHours(0, 0, 0, 0);
  const besokSelesai = new Date(besokMulai);
  besokSelesai.setUTCDate(besokSelesai.getUTCDate() + 1);

  try {
    const jatuhTempo = await db.quizAssignment.findMany({
      where: { isPublished: true, dueDate: { gte: besokMulai, lt: besokSelesai } },
      include: {
        quiz: { select: { title: true } },
        group: { select: { id: true, name: true } },
      },
      take: 200,
    });

    if (jatuhTempo.length === 0) return NextResponse.json({ terkirim: 0, tugas: 0 });

    let terkirim = 0;

    for (const tugas of jatuhTempo) {
      const anggota = await db.groupMember.findMany({
        where: { groupId: tugas.groupId },
        select: { userId: true },
      });
      if (anggota.length === 0) continue;

      const sudah = await db.quizSubmission.findMany({
        where: {
          assignmentId: tugas.id,
          userId: { in: anggota.map((a) => a.userId) },
          status: { in: ["SUBMITTED", "GRADED"] },
        },
        select: { userId: true },
      });
      const sudahSet = new Set(sudah.map((s) => s.userId));
      const belum = anggota.map((a) => a.userId).filter((id) => !sudahSet.has(id));

      for (const userId of belum) {
        terkirim += await kirimKeUser(userId, {
          title: "Tugas besok",
          body: `"${tugas.quiz.title}" jatuh tempo besok. Yuk kerjakan sekarang.`,
          url: "/arena/tugas",
          // Satu tag per tugas: kalau cron berjalan dua kali, notifikasi kedua
          // menimpa yang pertama alih-alih menumpuk.
          tag: `ingat-${tugas.id}`,
        });
      }
    }

    return NextResponse.json({ terkirim, tugas: jatuhTempo.length });
  } catch (e) {
    console.error("cron/pengingat-tugas gagal:", e);
    return NextResponse.json({ error: "Gagal" }, { status: 500 });
  }
}
