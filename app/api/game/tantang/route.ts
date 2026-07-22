/**
 * Tantang Teman — duel asinkron antar murid sekelas.
 *
 * Kedua pemain mengerjakan 10 soal yang SAMA (snapshot saat tantangan dibuat),
 * dinilai server-side, skor dibandingkan. Tidak butuh game server real-time.
 *
 * Menumpang model existing (tanpa perubahan schema):
 *  - GameRoom  (category "TANTANGAN" sebagai penanda, hostId = penantang)
 *  - GameQuestion (snapshot soal per room; kunci jawaban HANYA di server)
 *  - GameSession (satu per pemain; finishedAt = sudah main)
 *  - GameResult (skor final + xpEarned, ikut terhitung statistik game)
 *
 * GET  -> { tantangan: [...], teman: [...] } — daftar duel + teman sekelas
 * POST -> { opponentId } — buat tantangan baru + notifikasi ke lawan
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { harvestJalurQuestions, pickRampedQuestions } from "@/lib/game/harvest";

export const dynamic = "force-dynamic";

const SOAL_PER_DUEL = 10;
const MAX_TANTANGAN_TERBUKA = 5;

type SessionLite = { userId: string; playerName: string; score: number; correct: number; finishedAt: Date | null };

function serializeRoom(room: {
  id: string;
  status: string;
  createdAt: Date;
  hostId: string;
  questionCount: number;
  sessions: SessionLite[];
}, myId: string) {
  const mine = room.sessions.find((s) => s.userId === myId);
  const other = room.sessions.find((s) => s.userId !== myId);
  const iFinished = Boolean(mine?.finishedAt);
  const theyFinished = Boolean(other?.finishedAt);
  const done = iFinished && theyFinished;

  let hasil: "MENANG" | "KALAH" | "SERI" | null = null;
  if (done && mine && other) {
    hasil = mine.score > other.score ? "MENANG" : mine.score < other.score ? "KALAH" : "SERI";
  }

  return {
    id: room.id,
    createdAt: room.createdAt,
    questionCount: room.questionCount,
    akuPenantang: room.hostId === myId,
    aku: { selesai: iFinished, skor: iFinished ? mine!.score : null, benar: iFinished ? mine!.correct : null },
    lawan: {
      nama: other?.playerName || "Lawan",
      userId: other?.userId,
      selesai: theyFinished,
      // Skor lawan disembunyikan sampai aku sendiri selesai — biar adil.
      skor: done ? other!.score : null,
      benar: done ? other!.correct : null,
    },
    selesai: done,
    hasil,
  };
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [rooms, myGroups, taughtGroups] = await Promise.all([
      db.gameRoom.findMany({
        where: { category: "TANTANGAN", sessions: { some: { userId: user.id } } },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true, status: true, createdAt: true, hostId: true, questionCount: true,
          sessions: { select: { userId: true, playerName: true, score: true, correct: true, finishedAt: true } },
        },
      }),
      db.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } }),
      // Guru bukan GroupMember — kelas yang dia ampu dihitung sebagai "kelasnya"
      // supaya guru bisa menantang (dan menguji fitur bersama) murid-muridnya.
      db.group.findMany({ where: { teacherId: user.id, isActive: true }, select: { id: true } }),
    ]);

    // Teman sekelas (murid lain yang berbagi minimal satu kelas atau diampu).
    const groupIds = [...myGroups.map((g) => g.groupId), ...taughtGroups.map((g) => g.id)];
    const teman = groupIds.length
      ? await db.groupMember.findMany({
          where: { groupId: { in: groupIds }, userId: { not: user.id }, user: { role: "MURID" } },
          select: { user: { select: { id: true, fullName: true, avatar: true, level: true } } },
          distinct: ["userId"],
          take: 100,
        })
      : [];

    return NextResponse.json({
      tantangan: rooms.map((r) => serializeRoom(r, user.id)),
      teman: teman.map((t) => t.user),
    });
  } catch (error) {
    console.error("tantang::GET error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan di server. Coba lagi, ya." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const opponentId = String(body.opponentId || "");
    if (!opponentId || opponentId === user.id) {
      return NextResponse.json({ error: "Pilih teman yang mau ditantang dulu." }, { status: 400 });
    }

    // Lawan harus teman sekelas (berbagi minimal satu kelas), atau murid di
    // kelas yang diampu si penantang (guru boleh menantang muridnya).
    const shared = await db.group.findFirst({
      where: {
        members: { some: { userId: opponentId } },
        OR: [{ teacherId: user.id }, { members: { some: { userId: user.id } } }],
      },
      select: { id: true },
    });
    if (!shared) {
      return NextResponse.json({ error: "Kamu hanya bisa menantang teman sekelasmu." }, { status: 403 });
    }

    // Anti-spam: batasi tantangan yang belum selesai.
    const terbuka = await db.gameRoom.count({
      where: { category: "TANTANGAN", hostId: user.id, status: { in: ["WAITING", "IN_PROGRESS"] } },
    });
    if (terbuka >= MAX_TANTANGAN_TERBUKA) {
      return NextResponse.json({ error: "Selesaikan tantanganmu yang masih berjalan dulu, ya." }, { status: 429 });
    }

    const [me, opponent] = await Promise.all([
      db.user.findUnique({ where: { id: user.id }, select: { fullName: true, avatar: true } }),
      db.user.findUnique({ where: { id: opponentId }, select: { id: true, fullName: true, avatar: true, role: true } }),
    ]);
    if (!me || !opponent || opponent.role !== "MURID") {
      return NextResponse.json({ error: "Teman tidak ditemukan." }, { status: 404 });
    }

    // Snapshot soal: keduanya mengerjakan set yang sama, urut naik kesulitan.
    const clean = await harvestJalurQuestions();
    const soal = pickRampedQuestions(clean, SOAL_PER_DUEL);
    if (soal.length < SOAL_PER_DUEL) {
      return NextResponse.json({ error: "Bank soal belum siap. Coba lagi nanti." }, { status: 503 });
    }

    const roomId = randomUUID();
    const code = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();

    // Batched transaction (bukan interaktif) — aman untuk pooler.
    await db.$transaction([
      db.gameRoom.create({
        data: {
          id: roomId,
          code,
          name: `Tantangan ${me.fullName}`.slice(0, 60),
          gameType: "KUIS_BATTLE",
          hostId: user.id,
          category: "TANTANGAN",
          status: "WAITING",
          questionCount: SOAL_PER_DUEL,
        },
        select: { id: true },
      }),
      db.gameQuestion.createMany({
        data: soal.map((q, i) => ({
          gameRoomId: roomId,
          text: q.soal,
          options: q.opsi,
          correctAnswer: String(q.jawaban),
          explanation: q.penjelasan || null,
          orderIndex: i,
        })),
      }),
      db.gameSession.createMany({
        data: [
          { roomId, userId: user.id, playerName: me.fullName, avatarUrl: me.avatar },
          { roomId, userId: opponent.id, playerName: opponent.fullName, avatarUrl: opponent.avatar },
        ],
      }),
      db.notifikasi.create({
        data: {
          userId: opponent.id,
          title: "Tantangan Baru!",
          body: `${me.fullName} menantangmu duel ${SOAL_PER_DUEL} soal. Berani terima?`,
          type: "TANTANGAN",
          data: { link: "/arena/game/tantang" },
        },
      }),
    ]);

    return NextResponse.json({ id: roomId, message: `Tantangan terkirim ke ${opponent.fullName}!` });
  } catch (error) {
    console.error("tantang::POST error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan di server. Coba lagi, ya." }, { status: 500 });
  }
}
