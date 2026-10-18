/**
 * POST /api/jumpa/rooms — guru membuat ruang JUMPA untuk kelasnya.
 * Body: { groupId: string }. Fase 1: hanya jenis KELAS.
 */
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { createKelasRoom } from "@/lib/jumpa/service";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ groupId: z.string().min(1).max(64) });

export async function POST(request: Request) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;

  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");

  const limited = await rateLimitRoute(request, { identifier: "jumpa-create", maxRequests: 10, windowSeconds: 60, subject: user.id });
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jumpaError(400, "BAD_REQUEST", "Kelas tidak valid.");

  try {
    const result = await createKelasRoom(user, parsed.data.groupId);
    if (!result.ok) return jumpaError(result.status, result.code, result.message);
    return jumpaJson({ code: result.room.code, title: result.room.title, url: `/jumpa/${result.room.code}` }, 201);
  } catch (error) {
    console.error("JUMPA_CREATE_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "JUMPA belum tersedia saat ini. Coba lagi sebentar.");
  }
}
