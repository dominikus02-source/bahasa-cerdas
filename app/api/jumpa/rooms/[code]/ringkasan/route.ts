/**
 * GET /api/jumpa/rooms/[code]/ringkasan — layar setelah rapat: durasi, jumlah
 * hadir, tautan kembali. Kehadiran per orang hanya untuk guru pemilik/pembuat & admin.
 */
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { loadRoomSummary } from "@/lib/jumpa/scheduling";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  const limited = await rateLimitRoute(request, { identifier: "jumpa-summary", maxRequests: 30, windowSeconds: 60, subject: user.id });
  if (limited) return limited;
  const { code } = await params;
  if (!isValidRoomCode(code)) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");
  try {
    const s = await loadRoomSummary(user, code);
    if (!s) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");
    return jumpaJson(s);
  } catch (error) {
    console.error("JUMPA_SUMMARY_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "Ringkasan belum tersedia.");
  }
}
