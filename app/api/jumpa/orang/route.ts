/**
 * GET /api/jumpa/orang?q=nama&jenis=KELAS|GURU — cari orang untuk diundang ke
 * jadwal (guru rekan; untuk KELAS juga murid dari kelas milik guru). Guru saja.
 */
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { searchPeople } from "@/lib/jumpa/scheduling";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  if (user.role !== "GURU" && !user.isFounder) return jumpaError(403, "ROLE_NOT_ALLOWED", "Hanya guru yang bisa mengundang.");
  const limited = await rateLimitRoute(request, { identifier: "jumpa-people", maxRequests: 40, windowSeconds: 60, subject: user.id });
  if (limited) return limited;
  const sp = new URL(request.url).searchParams;
  const kind = sp.get("jenis") === "GURU" ? "GURU" : "KELAS";
  try {
    return jumpaJson({ users: await searchPeople(user, kind, sp.get("q") ?? "") });
  } catch (error) {
    console.error("JUMPA_PEOPLE_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "Pencarian belum tersedia.");
  }
}
