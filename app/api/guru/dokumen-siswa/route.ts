import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  isTeacherOrStudent,
  getRepositoryDocs,
  getSimulationRekap,
  exportRekapCSV,
  exportRekapDocxHTML,
  type SimulationFilter,
  type SimJenis,
} from "@/lib/simulation/SimulationAnalyticsService";

export const dynamic = "force-dynamic";

function parseJenis(raw: string | null): SimJenis {
  const u = (raw || "SEMUA").toUpperCase();
  return u === "UKBI" || u === "TKA" ? u : "SEMUA";
}

/**
 * GET /api/guru/dokumen-siswa
 * Repository Pembelajaran — daftar dokumen hasil latihan murid (additive:
 * tetap mengembalikan bentuk lama {data: [...]} bila tanpa params, sehingga
 * halaman lama & test lama tidak rusak).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId") || undefined;
    const jenis = parseJenis(searchParams.get("jenis"));
    const search = searchParams.get("search") || undefined;
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const format = searchParams.get("format") || undefined;

    // Bentuk lama (tanpa param tambahan): kembalikan {data} seperti sebelum phase ini.
    const isLegacyShape = !groupId && !jenis && !search && !page && !limit && !format;
    if (isLegacyShape) {
      const legacy = await getLegacyDocs(user.id);
      return NextResponse.json({ data: legacy });
    }

    const filter: SimulationFilter = { groupId, jenis, search, page, limit };
    const result = await getRepositoryDocs(user.id, filter);

    // Ekspor (format=csv | docx) — aman: hanya skor/nama, tanpa jawaban.
    if (format === "csv" || format === "docx") {
      const rekap = await getSimulationRekap(user.id, { groupId, jenis, search, page: 1, limit: 5000 });
      if (format === "csv") {
        const csv = exportRekapCSV(rekap.rows);
        return new Response("\uFEFF" + csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="rekap-simulasi-${Date.now()}.csv"`,
          },
        });
      }
      const html = exportRekapDocxHTML(rekap.rows);
      return new Response(html, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="rekap-simulasi-${Date.now()}.doc"`,
        },
      });
    }

    return NextResponse.json({
      data: result.items.map((i) => ({
        id: i.id,
        nama: i.nama,
        jenis: i.jenis,
        tanggal: i.tanggal,
        kelas: i.kelas,
        jumlahMurid: i.jumlahMurid,
        nilaiRataRata: i.nilaiRataRata,
        aiSummary: i.aiSummary,
        isCertificate: i.isCertificate,
        paket: { title: i.paketTitle, type: i.jenis },
        score: i.score,
        percentage: i.percentage,
        predikat: i.predikat,
      })),
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function getLegacyDocs(teacherId: string) {
  const groupMemberIds = await db.groupMember.findMany({
    where: { group: { teacherId, isActive: true } },
    select: { userId: true },
  });
  const studentIds = [...new Set(groupMemberIds.map((m) => m.userId))];
  if (studentIds.length === 0) return [];

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

  const certified = new Set(certs.map((c) => c.progresId));
  const latestPerPaket = new Map<string, (typeof progres)[number]>();
  for (const p of progres) {
    if (certified.has(p.id)) continue;
    const key = `${p.user.id}-${p.paketId}`;
    const cur = latestPerPaket.get(key);
    if (!cur || p.attemptNumber > cur.attemptNumber) latestPerPaket.set(key, p);
  }

  const resultDocs = [...latestPerPaket.values()].map((p) => ({
    id: `hasil-${p.id}`, score: p.totalScore ?? 0, percentage: p.percentage ?? 0,
    predikat: p.predikat || "-", issuedAt: p.finishedAt ?? p.startedAt,
    attemptNumber: p.attemptNumber, isCertificate: false,
    paket: p.paket, user: p.user,
  }));

  const data = [
    ...certs.map((c) => ({ ...c, isCertificate: true })),
    ...resultDocs,
  ].sort((a: any, b: any) => new Date(b.issuedAt || 0).getTime() - new Date(a.issuedAt || 0).getTime());

  return data;
}