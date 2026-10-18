/**
 * GET /api/jumpa/rooms/[code] — info ruang untuk lobby + apakah user boleh masuk.
 */
import { getUser } from "@/lib/supabase/server";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { loadRoomContext } from "@/lib/jumpa/service";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;

  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");

  const { code } = await params;
  if (!isValidRoomCode(code)) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");

  try {
    const ctx = await loadRoomContext(code, user);
    if (!ctx) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");
    return jumpaJson({
      room: ctx.view,
      access: ctx.decision.ok
        ? { allowed: true, roomRole: ctx.decision.roomRole }
        : { allowed: false, code: ctx.decision.code, message: ctx.decision.message },
    });
  } catch (error) {
    console.error("JUMPA_ROOM_LOOKUP_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "JUMPA belum tersedia saat ini. Coba lagi sebentar.");
  }
}
