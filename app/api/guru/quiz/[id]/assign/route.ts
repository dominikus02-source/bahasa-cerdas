import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { after } from "next/server";
import { kirimKeBanyakUser } from "@/lib/push";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role?.toUpperCase() !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const quiz = await db.quiz.findUnique({ where: { id } });
    if (!quiz || quiz.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const body = await req.json();
    const { groupIds, dueDate, notes } = body;

    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json({ error: "groupIds array required" }, { status: 400 });
    }

    const groups = await db.group.findMany({
      where: { id: { in: groupIds }, teacherId: dbUser.id },
    });

    if (groups.length === 0) {
      return NextResponse.json({ error: "No valid groups found" }, { status: 404 });
    }

    const assignments = await Promise.all(
      groups.map(async (group) => {
        const existing = await db.quizAssignment.findUnique({
          where: { quizId_groupId: { quizId: id, groupId: group.id } },
        });

        if (existing) {
          return db.quizAssignment.update({
            where: { quizId_groupId: { quizId: id, groupId: group.id } },
            data: {
              dueDate: dueDate ? new Date(dueDate) : null,
              notes: notes || null,
              isPublished: true,
            },
            include: { group: { select: { id: true, name: true, accessCode: true } } },
          });
        }

        return db.quizAssignment.create({
          data: {
            quizId: id,
            groupId: group.id,
            dueDate: dueDate ? new Date(dueDate) : null,
            notes: notes || null,
            isPublished: true,
          },
          include: { group: { select: { id: true, name: true, accessCode: true } } },
        });
      })
    );

    // Notifikasi khusus guru
    const groupNames = groups.map((g) => g.name).join(", ");
    try {
      await db.notifikasi.create({
        data: {
          userId: dbUser.id,
          title: "✅ Latihan Terkirim",
          body: `"${quiz.title}" berhasil dikirim ke ${groups.length} kelas (${groupNames})`,
          type: "LATIHAN_KIRIM",
          data: { quizId: id, link: "/guru/bank-soal" },
        },
      });
    } catch (notifErr) {
      console.error("Gagal buat notifikasi:", notifErr);
    }

    // Notifikasi push ke murid di kelas yang ditugaskan. Ini pemicu yang paling
    // berdampak: "tugas baru dari gurumu" jauh lebih berguna daripada ajakan
    // belajar generik, dan tidak menjadi kebisingan karena hanya muncul saat guru
    // benar-benar mengirim sesuatu.
    //
    // Dibungkus try/catch dan tidak di-await hasilnya sebagai syarat sukses:
    // pengiriman notifikasi tidak boleh menggagalkan penugasan yang sudah
    // tersimpan di database.
    after(async () => {
      try {
        const anggota = await db.groupMember.findMany({
          where: { groupId: { in: groups.map((g) => g.id) } },
          select: { userId: true },
        });
        const muridIds = [...new Set(anggota.map((a) => a.userId))].filter((uid) => uid !== dbUser.id);
        if (muridIds.length === 0) return;

        await kirimKeBanyakUser(muridIds, {
          title: "Tugas baru",
          body: dueDate
            ? `"${quiz.title}" — kerjakan sebelum ${new Date(dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "long" })}`
            : `"${quiz.title}" sudah bisa dikerjakan`,
          url: "/arena/tugas",
          // Satu tag per kuis: guru yang menugaskan ulang ke kelas lain menimpa
          // notifikasi lama alih-alih menumpuk beberapa untuk kuis yang sama.
          tag: `tugas-${id}`,
        });
      } catch (pushErr) {
        console.error("Gagal kirim push tugas:", pushErr);
      }
    });

    return NextResponse.json({ assignments, success: true, groupCount: groups.length });
  } catch (error) {
    console.error("POST /api/guru/quiz/[id]/assign error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
