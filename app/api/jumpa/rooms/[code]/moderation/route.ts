/**
 * POST /api/jumpa/rooms/[code]/moderation — kontrol host lewat server API.
 * Body: { action, targetUserId? }. Izin: permissions.ts → canModerate.
 * Klien tidak pernah memegang token admin LiveKit.
 */
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { moderate } from "@/lib/jumpa/room-actions";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum([
    "MUTE_AUDIO",
    "MUTE_VIDEO",
    "STOP_SCREEN",
    "REMOVE",
    "LOCK",
    "UNLOCK",
    "END",
    "ALLOW_MURID_SCREEN",
    "DISALLOW_MURID_SCREEN",
    "SET_COHOST",
    "UNSET_COHOST",
    "ALLOW_STAGE",
    "REMOVE_STAGE",
    "TOGGLE_CHAT",
  ]),
  targetUserId: z.string().min(1).max(64).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  const limited = await rateLimitRoute(request, { identifier: "jumpa-moderation", maxRequests: 60, windowSeconds: 60, subject: user.id });
  if (limited) return limited;

  const { code } = await params;
  if (!isValidRoomCode(code)) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jumpaError(400, "BAD_REQUEST", "Tindakan tidak valid.");

  try {
    const result = await moderate(user, code, parsed.data.action, parsed.data.targetUserId ?? null);
    if (!result.ok) return jumpaError(result.status, result.code, result.message);
    return jumpaJson({ ok: true, room: result.room });
  } catch (error) {
    console.error("JUMPA_MODERATION_ROUTE_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "JUMPA belum tersedia saat ini. Coba lagi sebentar.");
  }
}
