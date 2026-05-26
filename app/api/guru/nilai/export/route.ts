import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Hanya guru yang bisa mengakses" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const format = searchParams.get("format") || "csv";

    if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

    const group = await db.group.findUnique({
      where: { id: groupId },
      select: { teacherId: true, name: true, grade: true },
    });
    if (!group || group.teacherId !== dbUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all data
    const members = await db.groupMember.findMany({
      where: { groupId, role: "member" },
      include: { user: { select: { id: true, fullName: true, profile: { select: { nisn: true } } } } },
      orderBy: { user: { fullName: "asc" } },
    });

    const kategori = await db.nilaiKategori.findMany({
      where: { groupId },
      orderBy: { createdAt: "asc" },
    });

    const nilais = await db.nilai.findMany({
      where: { groupId },
      select: { userId: true, kategoriId: true, skor: true, sumberType: true, keterangan: true },
    });

    // Build score map: userId -> { kategoriId -> skor }
    const scoreMap: Record<string, Record<string, number[]>> = {};
    for (const n of nilais) {
      if (!scoreMap[n.userId]) scoreMap[n.userId] = {};
      if (!scoreMap[n.userId][n.kategoriId]) scoreMap[n.userId][n.kategoriId] = [];
      scoreMap[n.userId][n.kategoriId].push(n.skor);
    }

    // Calculate averages per kategori per student
    const avgMap: Record<string, Record<string, number>> = {};
    for (const uid of Object.keys(scoreMap)) {
      avgMap[uid] = {};
      for (const kid of Object.keys(scoreMap[uid])) {
        const scores = scoreMap[uid][kid];
        avgMap[uid][kid] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }
    }

    const now = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fileName = `nilai-${group.name.replace(/\s+/g, "-")}-${now}`;

    if (format === "docx") {
      let html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Nilai ${group.name}</title>
<style>
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin: 2cm; }
  h1 { text-align: center; font-size: 16pt; margin-bottom: 4px; }
  h2 { text-align: center; font-size: 13pt; font-weight: normal; margin-top: 0; margin-bottom: 20px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #e5e7eb; border: 1px solid #333; padding: 8px 6px; text-align: center; font-weight: bold; font-size: 11pt; }
  td { border: 1px solid #333; padding: 6px; text-align: center; font-size: 11pt; }
  td:first-child { text-align: left; font-weight: 500; }
  .rata { font-weight: bold; background: #f0fdf4; }
  .footer { margin-top: 30px; font-size: 10pt; text-align: right; }
</style></head><body>
<h1>LAPORAN NILAI SISWA</h1>
<h2>${group.name} (${group.grade})</h2>
<table>
  <thead><tr>
    <th>No</th>
    <th>Nama</th>
    <th>NISN</th>`;

      for (const k of kategori) {
        html += `<th>${k.nama}${k.bobot !== 100 ? ` (B:${k.bobot}%)` : ""}</th>`;
      }
      html += `<th class="rata">Rata-rata</th></tr></thead><tbody>`;

      let no = 1;
      for (const m of members) {
        const uid = m.user.id;
        const scores: number[] = [];
        html += `<tr><td>${no++}</td><td>${m.user.fullName}</td><td>${m.user.profile?.nisn || "-"}</td>`;
        for (const k of kategori) {
          const avg = avgMap[uid]?.[k.id];
          const display = avg !== undefined ? String(avg) : "-";
          const color = avg !== undefined ? (avg >= 80 ? "#16a34a" : avg >= 60 ? "#d97706" : "#dc2626") : "";
          html += `<td style="color:${color}">${display}</td>`;
          if (avg !== undefined) scores.push(avg);
        }
        const overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        html += `<td class="rata">${scores.length > 0 ? overall : "-"}</td></tr>`;
      }

      html += `</tbody></table>
<div class="footer">Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
</body></html>`;

      return new NextResponse(html, {
        headers: {
          "Content-Type": "application/msword",
          "Content-Disposition": `attachment; filename="${fileName}.doc"`,
        },
      });
    }

    // Default: CSV
    const headers = ["No", "Nama", "NISN", ...kategori.map(k => k.nama), "Rata-rata"];
    const rows: string[][] = [];

    let no = 1;
    for (const m of members) {
      const uid = m.user.id;
      const scores: number[] = [];
      const row: string[] = [
        String(no++),
        m.user.fullName,
        m.user.profile?.nisn || "-",
      ];
      for (const k of kategori) {
        const avg = avgMap[uid]?.[k.id];
        row.push(avg !== undefined ? String(avg) : "");
        if (avg !== undefined) scores.push(avg);
      }
      const overall = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      row.push(scores.length > 0 ? String(overall) : "");
      rows.push(row);
    }

    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/guru/nilai/export error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
