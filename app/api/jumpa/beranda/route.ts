/** GET /api/jumpa/beranda — kartu JUMPA di beranda: ruang berlangsung + jadwal terdekat. */
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { loadBerandaJumpa } from "@/lib/jumpa/scheduling";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  const limited = await rateLimitRoute(request, { identifier: "jumpa-beranda", maxRequests: 60, windowSeconds: 60, subject: user.id });
  if (limited) return limited;
  try {
    return jumpaJson(await loadBerandaJumpa(user));
  } catch (error) {
    console.error("JUMPA_BERANDA_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaJson({ live: [], next: null });
  }
}
