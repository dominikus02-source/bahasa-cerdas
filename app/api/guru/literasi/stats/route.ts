import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { RANK_META } from "@/lib/gamification/ranks";
import { getWeeklyChallenge } from "@/lib/weekly-challenge";

// ════════════════════════════════════════════════════════════════════
// GET /api/guru/literasi/stats?groupId=
// PUSAT LITERASI — statistik agregat aktivitas literasi murid di kelas
// guru (additive, read-only). Semua insight bersifat rule-based — TIDAK
// memanggil LLM. Menghasilkan:
//  - total    : total karya/penulis/views/likes/komentar
//  - mingguIni: aktivitas minggu berjalan (WIB)
//  - jenis    : sebaran karya per jenis
//  - penulisTeraktif: top 10 penulis (karya + views + likes)
//  - palingPopuler  : top 5 karya dengan engagement tertinggi
//  - pilihanAI      : rekomendasi karya terbaik (rule-based scoring)
//  - insight        : kalimat-kalimat wawasan (rule-based)
//  - rekomendasi    : saran aksi untuk guru (rule-based)
// ════════════════════════════════════════════════════════════════════

const WIB_MS = 7 * 60 * 60 * 1000;

const TYPE_LABELS: Record<string, string> = {
  PUISI: "Puisi",
  CERPEN: "Cerpen",
  ARTIKEL: "Artikel",
  ANEKDOT: "Anekdot",
  PANTUN: "Pantun",
  OPINI: "Opini",
};

function weekStartWIB(): Date {
  const now = new Date(Date.now() + WIB_MS);
  const day = (now.getUTCDay() + 6) % 7; // Senin = 0
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - day);
  monday.setUTCHours(0, 0, 0, 0);
  return new Date(monday.getTime() - WIB_MS);
}

const isTeacher = (user: { role: string; isFounder?: boolean }) =>
  user.role === "GURU" || user.role === "ADMIN" || !!user.isFounder;

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !isTeacher(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groupId = req.nextUrl.searchParams.get("groupId") || "";

    // 1) Kumpulkan id murid dari semua kelas guru (atau satu kelas)
    const groups = groupId
      ? await db.group.findMany({ where: { id: groupId, teacherId: user.id }, select: { id: true } })
      : await db.group.findMany({ where: { teacherId: user.id }, select: { id: true } });
    const groupIds = groups.map((g) => g.id);

    const members = groupIds.length
      ? await db.groupMember.findMany({
          where: { groupId: { in: groupIds }, role: "member" },
          select: { userId: true },
        })
      : [];
    const memberSet = new Set(members.map((m) => m.userId));

    const whereKarya: any = memberSet.size ? { userId: { in: [...memberSet] } } : { userId: "__none__" };

    // 2) Query paralel
    const [karyaList, likesAgg, commentsAgg] = await Promise.all([
      db.studentKarya.findMany({
        where: whereKarya,
        select: {
          id: true, title: true, type: true, excerpt: true, content: true, coverImage: true,
          isFeatured: true, likesCount: true, viewsCount: true, createdAt: true,
          user: {
            select: {
              id: true, fullName: true, avatar: true,
              playerProfile: { select: { level: true, currentRank: true } },
              profile: { select: { school: true, city: true } },
            },
          },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
      db.studentKaryaLike.groupBy({ by: ["karyaId"], _count: { _all: true } }),
      db.studentKaryaComment.groupBy({ by: ["karyaId"], _count: { _all: true } }),
    ]);

    const likeMap = new Map(likesAgg.map((r) => [r.karyaId, r._count._all]));
    const commentMap = new Map(commentsAgg.map((r) => [r.karyaId, r._count._all]));

    const rows = karyaList.map((k) => ({
      ...k,
      _likes: likeMap.get(k.id) ?? 0,
      _comments: commentMap.get(k.id) ?? 0,
    }));

    // 3) Totals
    const total = {
      karya: rows.length,
      penulis: new Set(rows.map((r) => r.user.id)).size,
      views: rows.reduce((a, r) => a + r.viewsCount, 0),
      likes: rows.reduce((a, r) => a + r._likes, 0),
      comments: rows.reduce((a, r) => a + r._comments, 0),
    };

    const since = weekStartWIB();
    const weekRows = rows.filter((r) => new Date(r.createdAt) >= since);
    const mingguIni = {
      karya: weekRows.length,
      likes: weekRows.reduce((a, r) => a + r._likes, 0),
      comments: weekRows.reduce((a, r) => a + r._comments, 0),
      penulis: new Set(weekRows.map((r) => r.user.id)).size,
    };

    // 4) Sebaran jenis
    const jenis = Object.keys(TYPE_LABELS).map((type) => {
      const list = rows.filter((r) => r.type === type);
      return {
        type,
        label: TYPE_LABELS[type] ?? type,
        count: list.length,
        likes: list.reduce((a, r) => a + r._likes, 0),
      };
    }).sort((a, b) => b.count - a.count);

    // 5) Penulis teraktif (top 10)
    const penulisMap = new Map<string, { karya: number; views: number; likes: number; comments: number; last: Date }>();
    for (const r of rows) {
      const cur = penulisMap.get(r.user.id) ?? { karya: 0, views: 0, likes: 0, comments: 0, last: new Date(0) };
      cur.karya += 1;
      cur.views += r.viewsCount;
      cur.likes += r._likes;
      cur.comments += r._comments;
      if (new Date(r.createdAt) > cur.last) cur.last = new Date(r.createdAt);
      penulisMap.set(r.user.id, cur);
    }
    const userById = new Map(rows.map((r) => [r.user.id, r.user]));
    const penulisTeraktif = [...penulisMap.entries()]
      .sort((a, b) => b[1].karya - a[1].karya || b[1].likes - a[1].likes)
      .slice(0, 10)
      .map(([userId, s], i) => ({
        rank: i + 1,
        user: {
          id: userId,
          fullName: userById.get(userId)?.fullName ?? "Siswa",
          avatar: userById.get(userId)?.avatar ?? null,
          school: userById.get(userId)?.profile?.school ?? null,
          level: userById.get(userId)?.playerProfile?.level ?? 0,
          rank: userById.get(userId)?.playerProfile?.currentRank ?? "BRONZE",
          rankTitle: RANK_META[userById.get(userId)?.playerProfile?.currentRank as keyof typeof RANK_META]?.title ?? "Pemula",
        },
        karya: s.karya,
        views: s.views,
        likes: s.likes,
        comments: s.comments,
        lastKarya: s.last.toISOString(),
      }));

    // 6) Paling populer (top 5 by engagement: likes + comments + views weight)
    const populer = [...rows]
      .map((r) => ({
        id: r.id, title: r.title, type: r.type, excerpt: r.excerpt || "",
        coverImage: r.coverImage ?? null, isFeatured: r.isFeatured,
        viewsCount: r.viewsCount, likesCount: r._likes, commentsCount: r._comments,
        createdAt: r.createdAt,
        engagement: r._likes + r._comments + Math.floor(r.viewsCount / 10),
        user: {
          id: r.user.id, fullName: r.user.fullName, avatar: r.user.avatar,
          school: r.user.profile?.school ?? null,
        },
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);

    // 7) Pilihan AI (rule-based scoring, tanpa LLM)
    const nowMs = Date.now();
    const pilihanAI = [...rows]
      .map((r) => {
        const ageDays = (nowMs - new Date(r.createdAt).getTime()) / 86400000;
        const recency = Math.max(0, 1 - ageDays / 30); // karya baru ≤ 30 hari
        const engagement = r._likes + r._comments;
        const score = engagement * 3 + recency * 5 + (r.isFeatured ? 2 : 0) + Math.min(r.viewsCount / 50, 2);
        return {
          id: r.id, title: r.title, type: r.type, excerpt: r.excerpt || "",
          isFeatured: r.isFeatured, viewsCount: r.viewsCount,
          likesCount: r._likes, commentsCount: r._comments, createdAt: r.createdAt,
          score,
          alasan:
            r._likes + r._comments >= 10
              ? "Karya ini banyak diapresiasi teman-temannya."
              : r.isFeatured
                ? "Karya ini kamu pilih sebagai contoh kelas."
                : ageDays <= 7
                  ? "Karya terbaru yang layak dipantau."
                  : "Karya dengan potensi tinggi untuk dibahas bersama.",
          user: {
            id: r.user.id, fullName: r.user.fullName, avatar: r.user.avatar,
            school: r.user.profile?.school ?? null,
          },
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    // 8) AI Insight (rule-based)
    const insight: string[] = [];
    const totalKarya = total.karya;
    if (totalKarya === 0) {
      insight.push("Belum ada karya murid yang tercatat. Ajak muridmu menulis pertama kali lewat tantangan literasi.");
    } else {
      const aktif = (mingguIni.penulis / Math.max(total.penulis, 1)) * 100;
      if (mingguIni.karya === 0) {
        insight.push("Minggu ini belum ada karya baru. Semangati muridmu untuk kembali menulis.");
      } else if (aktif >= 50) {
        insight.push(`Hebat! ${Math.round(aktif)}% penulismu aktif menulis minggu ini.`);
      } else if (aktif > 0) {
        insight.push(`${Math.round(aktif)}% penulismu aktif minggu ini — masih ada ruang untuk ditingkatkan.`);
      }
      if (jenis.length > 0) {
        const teratas = jenis[0];
        insight.push(`Jenis favorit muridmu adalah ${teratas.label.toLowerCase()} (${teratas.count} karya).`);
      }
      if (total.likes > 0 && total.karya > 0) {
        const rataLike = (total.likes / total.karya).toFixed(1);
        insight.push(`Rata-rata setiap karya mendapat ${rataLike} apresiasi.`);
      }
    }

    // 9) Rekomendasi AI (rule-based)
    const rekomendasi: { icon: string; judul: string; deskripsi: string; href?: string }[] = [];
    const challenge = getWeeklyChallenge();
    rekomendasi.push({
      icon: "trophy",
      judul: `Tantangan Minggu Ini: ${challenge.theme}`,
      deskripsi: `Ajak murid menulis ${challenge.weekLabel} bertema "${challenge.prompt}". Karya pertama pemenang tantangan mendapat +${challenge.bonusCoins} koin.`,
      href: "/guru/kelasku",
    });
    if (totalKarya > 0) {
      const terendah = [...jenis].sort((a, b) => a.count - b.count)[0];
      rekomendasi.push({
        icon: "pen",
        judul: `Jenis ${terendah.label} jarang ditulis`,
        deskripsi: `Hanya ${terendah.count} karya ${terendah.label.toLowerCase()} dari total ${totalKarya} karya. Coba beri tugas menulis ${terendah.label.toLowerCase()} agar variasi literasi kelas makin kaya.`,
        href: "/guru/bank-soal",
      });
      if (total.penulis > 0 && mingguIni.penulis < Math.ceil(total.penulis / 2)) {
        rekomendasi.push({
          icon: "users",
          judul: "Sebagian murid belum menulis minggu ini",
          deskripsi: `${total.penulis - mingguIni.penulis} penulis belum berkarya minggu ini. Kirim pengingat lewat pengumuman kelas.`,
          href: "/guru/kelasku",
        });
      }
    }
    rekomendasi.push({
      icon: "star",
      judul: "Jadikan karya terbaik sebagai contoh kelas",
      deskripsi: "Tandai karya murid yang memukau sebagai Pilihan (Editor Choice) agar tampil di beranda murid.",
      href: "/guru/feed-karya",
    });

    return NextResponse.json({
      total, mingguIni, jenis, penulisTeraktif, palingPopuler: populer, pilihanAI,
      insight, rekomendasi, challenge: { theme: challenge.theme, prompt: challenge.prompt, weekLabel: challenge.weekLabel },
    });
  } catch (error) {
    console.error("GET /api/guru/literasi/stats error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
