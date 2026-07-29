import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "GURU" && !user.isFounder && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const groupMemberIds = await db.groupMember.findMany({
      where: { group: { teacherId: user.id, isActive: true } },
      select: { userId: true },
    });
    const studentIds = [...new Set(groupMemberIds.map(m => m.userId))];
    if (studentIds.length === 0) return NextResponse.json({ data: [] });

    const [certs, progres] = await Promise.all([
      db.kompetensiCertificate.findMany({
        where: { userId: { in: studentIds } },
        include: {
          paket: { select: { title: true, type: true } },
          user: { select: { id: true, fullName: true, avatar: true } },
        },
        orderBy: { issuedAt: "desc" },
        take: 100,
      }),
      db.progresKompetensi.findMany({
        where: { userId: { in: studentIds }, status: "COMPLETED" },
        select: {
          id: true, paketId: true, attemptNumber: true, totalScore: true,
          percentage: true, predikat: true, finishedAt: true, startedAt: true,
          paket: { select: { title: true, type: true } },
          user: { select: { id: true, fullName: true, avatar: true } },
        },
        orderBy: { finishedAt: "desc" },
        take: 200,
      }),
    ]);

    const certified = new Set(certs.map(c => c.progresId));
    const latestPerPaket = new Map<string, (typeof progres)[number]>();
    for (const p of progres) {
      if (certified.has(p.id)) continue;
      const key = `${p.user.id}-${p.paketId}`;
      const cur = latestPerPaket.get(key);
      if (!cur || p.attemptNumber > cur.attemptNumber) latestPerPaket.set(key, p);
    }

    const resultDocs = [...latestPerPaket.values()].map(p => ({
      id: `hasil-${p.id}`, score: p.totalScore ?? 0, percentage: p.percentage ?? 0,
      predikat: p.predikat || "-", issuedAt: p.finishedAt ?? p.startedAt,
      attemptNumber: p.attemptNumber, isCertificate: false,
      paket: p.paket, user: p.user,
    }));

    const data = [
      ...certs.map(c => ({ ...c, isCertificate: true })),
      ...resultDocs,
    ].sort((a: any, b: any) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime());

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
