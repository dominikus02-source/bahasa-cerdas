/**
 * GET /api/jumpa/kelas/[groupId] — panel JUMPA di halaman kelas: ruang
 * berlangsung, jadwal mendatang, rapat terakhir. Guru pemilik / anggota kelas saja.
 */
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { loadGroupJumpa } from "@/lib/jumpa/scheduling";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  const limited = await rateLimitRoute(request, { identifier: "jumpa-group", maxRequests: 60, windowSeconds: 60, subject: user.id });
  if (limited) return limited;
  const { groupId } = await params;
  if (!groupId || groupId.length > 64) return jumpaError(404, "NOT_FOUND", "Kelas tidak ditemukan.");
  try {
    const data = await loadGroupJumpa(user, groupId);
    if (!data) return jumpaError(404, "NOT_FOUND", "Kelas tidak ditemukan.");
    return jumpaJson(data);
  } catch (error) {
    console.error("JUMPA_GROUP_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "JUMPA belum tersedia saat ini.");
  }
}
