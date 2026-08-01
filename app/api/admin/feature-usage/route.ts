import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// Pemakaian fitur per hari (WIB). Setiap fitur punya sumber data berbeda;
// count = jumlah aksi, users = jumlah user UNIK yang beraksi di hari itu.

const FEATURE_QUERIES: Record<string, (since: Date) => Prisma.Sql> = {
  game: (since) => Prisma.sql`
    SELECT DATE("createdAt" AT TIME ZONE 'Asia/Jakarta') AS day,
           COUNT(*)::int AS events,
           COUNT(DISTINCT "userId")::int AS users
    FROM "GameResult"
    WHERE "createdAt" >= ${since}
    GROUP BY 1
  `,
  karya: (since) => Prisma.sql`
    SELECT DATE("createdAt" AT TIME ZONE 'Asia/Jakarta') AS day,
           COUNT(*)::int AS events,
           COUNT(DISTINCT "userId")::int AS users
    FROM "StudentKarya"
    WHERE "createdAt" >= ${since}
    GROUP BY 1
  `,
  artikel: (since) => Prisma.sql`
    SELECT DATE("createdAt" AT TIME ZONE 'Asia/Jakarta') AS day,
           COUNT(*)::int AS events,
           COUNT(DISTINCT "authorId")::int AS users
    FROM "Artikel"
    WHERE "createdAt" >= ${since}
    GROUP BY 1
  `,
  jalurCerdas: (since) => Prisma.sql`
    SELECT DATE(p."createdAt" AT TIME ZONE 'Asia/Jakarta') AS day,
           COUNT(*)::int AS events,
           COUNT(DISTINCT p."userId")::int AS users
    FROM "UserUnitProgress" p
    JOIN "LearningUnit" u ON u.id = p."unitId"
    JOIN "LearningLevel" l ON l.id = u."levelId"
    WHERE l.type = 'JALUR' AND p."createdAt" >= ${since}
    GROUP BY 1
  `,
  bukuPanduan: (since) => Prisma.sql`
    SELECT DATE(p."createdAt" AT TIME ZONE 'Asia/Jakarta') AS day,
           COUNT(*)::int AS events,
           COUNT(DISTINCT p."userId")::int AS users
    FROM "UserUnitProgress" p
    JOIN "LearningUnit" u ON u.id = p."unitId"
    JOIN "LearningLevel" l ON l.id = u."levelId"
    WHERE l.type = 'PANDUAN' AND p."createdAt" >= ${since}
    GROUP BY 1
  `,
  penugasan: (since) => Prisma.sql`
    SELECT DATE(COALESCE("startedAt", "completedAt") AT TIME ZONE 'Asia/Jakarta') AS day,
           COUNT(*)::int AS events,
           COUNT(DISTINCT "userId")::int AS users
    FROM "PenugasanSubmission"
    WHERE COALESCE("startedAt", "completedAt") >= ${since}
    GROUP BY 1
  `,
  ukbiTka: (since) => Prisma.sql`
    SELECT DATE("startedAt" AT TIME ZONE 'Asia/Jakarta') AS day,
           COUNT(*)::int AS events,
           COUNT(DISTINCT "userId")::int AS users
    FROM "ProgresKompetensi"
    WHERE "startedAt" >= ${since}
    GROUP BY 1
  `,
  aiTools: (since) => Prisma.sql`
    SELECT DATE("createdAt" AT TIME ZONE 'Asia/Jakarta') AS day,
           COUNT(*)::int AS events,
           COUNT(DISTINCT "userId")::int AS users
    FROM "AIUsage"
    WHERE "createdAt" >= ${since}
    GROUP BY 1
  `,
};

const FEATURE_LABELS: Record<string, string> = {
  game: "Game (Kuis Battle dll.)",
  karya: "Karya Siswa",
  artikel: "Artikel",
  jalurCerdas: "Jalur Cerdas",
  bukuPanduan: "Buku Panduan (Belajar)",
  penugasan: "Penugasan Materi",
  ukbiTka: "Simulasi UKBI/TKA",
  aiTools: "Alat AI Guru",
};

interface DayRow {
  day: Date;
  events: number;
  users: number;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(30, Math.max(1, parseInt(searchParams.get("days") || "14")));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const results = await Promise.all(
      Object.entries(FEATURE_QUERIES).map(async ([key, buildQuery]) => {
        const rows = (await db.$queryRaw(buildQuery(since))) as DayRow[];
        const daily = rows.map((r) => ({
          day: r.day.toISOString().slice(0, 10),
          users: r.users,
          events: r.events,
        }));
        return {
          key,
          label: FEATURE_LABELS[key],
          totalUsers: daily.reduce((s, d) => s + d.users, 0),
          totalEvents: daily.reduce((s, d) => s + d.events, 0),
          daily,
        };
      })
    );

    // Sort: fitur paling banyak dipakai (distinct user unik dalam rentang) di atas.
    results.sort((a, b) => b.totalUsers - a.totalUsers);

    return NextResponse.json({
      success: true,
      days,
      generatedAt: new Date().toISOString(),
      features: results,
    });
  } catch (error) {
    console.error("[Admin Feature Usage] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
