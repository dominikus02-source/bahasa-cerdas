import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import cache from "@/lib/redis";

// Returns the user's practice-result documents ("Dokumen Hasil Latihan").
//
// Previously this listed kompetensiCertificate rows only — and certificates are
// created by the submit route ONLY for passing scores (UKBI >= 482). Every
// non-passing attempt therefore produced no document at all, which contradicts
// the page's whole premise: it was deliberately renamed from "Sertifikat" to
// "Dokumen Hasil Latihan" because these are practice RESULTS, not pass
// certificates. Now every completed attempt yields a document:
//   - passed attempts keep their certificate entry (with its real number)
//   - other attempts are synthesized from ProgresKompetensi, latest attempt
//     per paket so retakes don't flood the list
// Only display-safe fields are selected — per-question data stays server-side.
export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // v2: payload shape changed (progres-based documents added)
    const cacheKey = `sertifikat:v2:${user.id}`;
    const cached = await cache.get<{ data: unknown[] }>(cacheKey);
    if (cached) return NextResponse.json(cached, { headers: { "X-Cache": "HIT" } });

    const [certs, progres] = await Promise.all([
      db.kompetensiCertificate.findMany({
        where: { userId: user.id },
        include: {
          paket: { select: { title: true, type: true } },
          user: { select: { fullName: true } },
        },
        orderBy: { issuedAt: "desc" },
        take: 50,
      }),
      db.progresKompetensi.findMany({
        where: { userId: user.id, status: "COMPLETED" },
        select: {
          id: true,
          paketId: true,
          attemptNumber: true,
          totalScore: true,
          percentage: true,
          predikat: true,
          finishedAt: true,
          startedAt: true,
          paket: { select: { title: true, type: true } },
          user: { select: { fullName: true } },
        },
        orderBy: { finishedAt: "desc" },
        take: 100,
      }),
    ]);

    // Attempts already represented by a certificate stay certificate-only.
    const certified = new Set(certs.map((c) => c.progresId));

    // Latest attempt per paket among the rest.
    const latestPerPaket = new Map<string, (typeof progres)[number]>();
    for (const p of progres) {
      if (certified.has(p.id)) continue;
      const cur = latestPerPaket.get(p.paketId);
      if (!cur || p.attemptNumber > cur.attemptNumber) latestPerPaket.set(p.paketId, p);
    }

    const resultDocs = [...latestPerPaket.values()].map((p) => ({
      id: `hasil-${p.id}`,
      certificateNo: `BC-HASIL-${String(p.id).slice(-8).toUpperCase()}`,
      score: p.totalScore ?? 0,
      percentage: p.percentage ?? 0,
      predikat: p.predikat || "-",
      issuedAt: p.finishedAt ?? p.startedAt,
      attemptNumber: p.attemptNumber,
      isCertificate: false,
      paket: p.paket,
      user: p.user,
    }));

    const data = [
      ...certs.map((c) => ({ ...c, isCertificate: true })),
      ...resultDocs,
    ].sort((a: any, b: any) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime());

    const result = { data };
    await cache.set(cacheKey, result, 120);

    return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
