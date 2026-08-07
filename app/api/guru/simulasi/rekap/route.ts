import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  isTeacherOrStudent,
  getSimulationRekap,
  getClassSummary,
  getAIInsights,
  type SimJenis,
  type SimStatus,
} from "@/lib/simulation/SimulationAnalyticsService";

export const dynamic = "force-dynamic";

/**
 * Pusat Evaluasi Pembelajaran — rekap simulasi UKBI/TKA untuk guru.
 * SSOT: memakai SimulationAnalyticsService. Filter global:
 * Kelas → Tanggal → Jenis → Status → Cari Murid, diproses server-side.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isTeacherOrStudent(user)) return NextResponse.json({ error: "Khusus guru" }, { status: 403 });

const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const jenisRaw = (searchParams.get("jenis") || "SEMUA").toUpperCase();
    const jenis: SimJenis = jenisRaw === "UKBI" || jenisRaw === "TKA" ? jenisRaw : "SEMUA";
    const statusRaw = searchParams.get("status") || undefined;
    const status: SimStatus | undefined =
      statusRaw &&
      ["BELUM_DIKERJAKAN", "SEDANG_DIKERJAKAN", "MENUNGGU_PENILAIAN_AI", "AI_SELESAI_MENILAI", "MENUNGGU_PERSETUJUAN_GURU", "SELESAI"].includes(statusRaw)
        ? (statusRaw as SimStatus)
        : undefined;
    const search = searchParams.get("search") || undefined;
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const includeSummary = searchParams.get("summary") === "1";
    const includeInsight = searchParams.get("insight") === "1";

    const rekap = await getSimulationRekap(user.id, {
      groupId,
      from: from || undefined,
      to: to || undefined,
      jenis,
      status,
      search,
      page,
      limit,
    });

    // AI Summary (opsional, cached 10 menit) — dipakai dashboard
    let classSummary = null;
    if (includeSummary && groupId) {
      classSummary = await getClassSummary(user.id, groupId).catch(() => null);
    } else if (includeSummary) {
      classSummary = await getClassSummary(user.id, rekap.groups[0]?.id || "").catch(() => null);
    }

    let insight = null;
    if (includeInsight) insight = await getAIInsights(user.id).catch(() => null);

    return NextResponse.json({
      ...rekap,
      classSummary,
      insight,
    });
  } catch (e) {
    console.error("[/api/guru/simulasi/rekap]", e);
    return NextResponse.json({ error: "Gagal memuat data evaluasi" }, { status: 500 });
  }
}