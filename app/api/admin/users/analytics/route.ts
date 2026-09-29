import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

type GrowthBucket = {
  key: string;
  label: string;
  murid: number;
  guru: number;
  other: number;
  total: number;
};

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildGrowthBuckets(now: Date, months = 6): GrowthBucket[] {
  const buckets: GrowthBucket[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    buckets.push({
      key: monthKey(date),
      label: date.toLocaleDateString("id-ID", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
      murid: 0,
      guru: 0,
      other: 0,
      total: 0,
    });
  }
  return buckets;
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user || !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const growthBuckets = buildGrowthBuckets(now, 6);
    const growthStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - (growthBuckets.length - 1),
        1,
      ),
    );

    const [
      totalUsers,
      roleGroups,
      active30d,
      new30d,
      founder,
      proActive,
      proExpired,
      trialActive,
      growthUsers,
    ] = await Promise.all([
      db.user.count(),
      db.user.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
      db.user.count({
        where: { lastActiveAt: { gte: thirtyDaysAgo } },
      }),
      db.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      db.user.count({
        where: { isFounder: true },
      }),
      db.user.count({
        where: {
          role: "GURU",
          isFounder: false,
          isPremium: true,
          premiumUntil: { gt: now },
        },
      }),
      db.user.count({
        where: {
          role: "GURU",
          isFounder: false,
          isPremium: true,
          OR: [{ premiumUntil: null }, { premiumUntil: { lte: now } }],
        },
      }),
      db.user.count({
        where: {
          role: "GURU",
          isFounder: false,
          isPremium: false,
          trialEndsAt: { gt: now },
        },
      }),
      db.user.findMany({
        where: { createdAt: { gte: growthStart } },
        select: { role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const roleCounts = Object.fromEntries(
      roleGroups.map((group) => [group.role, group._count._all]),
    ) as Record<string, number>;
    const murid = roleCounts.MURID ?? 0;
    const guru = roleCounts.GURU ?? 0;
    const other = Math.max(0, totalUsers - murid - guru);

    const growthMap = new Map(growthBuckets.map((bucket) => [bucket.key, bucket]));
    for (const row of growthUsers) {
      const bucket = growthMap.get(monthKey(row.createdAt));
      if (!bucket) continue;
      if (row.role === "MURID") bucket.murid += 1;
      else if (row.role === "GURU") bucket.guru += 1;
      else bucket.other += 1;
      bucket.total += 1;
    }

    const free = Math.max(
      0,
      totalUsers - founder - proActive - proExpired - trialActive,
    );

    return NextResponse.json({
      generatedAt: now.toISOString(),
      summary: {
        totalUsers,
        murid,
        guru,
        other,
        active30d,
        new30d,
      },
      roles: [
        { key: "murid", label: "Murid", value: murid },
        { key: "guru", label: "Guru", value: guru },
        ...(other > 0 ? [{ key: "other", label: "Lainnya", value: other }] : []),
      ],
      statuses: [
        { key: "free", label: "Free", value: free },
        { key: "pro", label: "Pro aktif", value: proActive },
        { key: "trial", label: "Trial", value: trialActive },
        ...(proExpired > 0
          ? [{ key: "expired", label: "Pro kadaluarsa", value: proExpired }]
          : []),
        ...(founder > 0
          ? [{ key: "founder", label: "Founder", value: founder }]
          : []),
      ],
      growth: growthBuckets,
    });
  } catch (error) {
    console.error("Admin users analytics error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
