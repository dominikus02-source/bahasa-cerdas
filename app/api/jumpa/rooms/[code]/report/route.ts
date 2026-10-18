/**
 * POST /api/jumpa/rooms/[code]/report — laporkan masalah di ruang.
 * Body: { category, description?, reportedUserId? }. Laporan menyimpan
 * cuplikan obrolan & memberi notifikasi ke wali kelas + admin.
 */
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { createReport } from "@/lib/jumpa/room-actions";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  const limited = await rateLimitRoute(request, { identifier: "jumpa-report", maxRequests: 5, windowSeconds: 600, subject: user.id });
  if (limited) return limited;
  const { code } = await params;
  if (!isValidRoomCode(code)) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");
  const body = ((await request.json().catch(() => null)) ?? {}) as { category?: unknown; description?: unknown; reportedUserId?: unknown };
  try {
    const result = await createReport(user, code, body);
    if (!result.ok) return jumpaError(result.status, result.code, result.message);
    return jumpaJson({ ok: true, reportId: result.reportId }, 201);
  } catch (error) {
    console.error("JUMPA_REPORT_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "Laporan gagal dikirim. Coba lagi.");
  }
}
