/**
 * POST /api/jumpa/rooms/[code]/token — cetak token join LiveKit.
 *
 * Urutan: sesi Supabase → ruang → izin (lib/jumpa/permissions.ts) →
 * kapasitas → buat ruang LiveKit (idempotent) → token 10 menit tanpa
 * izin admin. Pola sama dengan app/api/game/socket-token/route.ts.
 */
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { rateLimitRoute } from "@/lib/rate-limit";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { getLivekitPublicWsUrl, getLivekitServerConfig } from "@/lib/jumpa/config";
import { countActiveOthers, ensureLivekitRoom } from "@/lib/jumpa/livekit";
import { publishSourcesFor } from "@/lib/jumpa/permissions";
import { loadRoomContext, recordJoinDenied, recordJoinGranted } from "@/lib/jumpa/service";
import { buildJoinGrant, mintJoinToken } from "@/lib/jumpa/token";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

const DENY_STATUS: Record<string, number> = {
  ROLE_NOT_ALLOWED: 403,
  NOT_INVITED: 403,
  REMOVED: 403,
  ROOM_LOCKED: 423,
  ROOM_FULL: 409,
  ROOM_ENDED: 410,
  ROOM_EXPIRED: 410,
};

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;

  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");

  const limited = await rateLimitRoute(request, { identifier: "jumpa-token", maxRequests: 20, windowSeconds: 60, subject: user.id });
  if (limited) return limited;

  const { code } = await params;
  if (!isValidRoomCode(code)) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");

  const config = getLivekitServerConfig();
  if (!config) {
    console.error("JUMPA_LIVEKIT_NOT_CONFIGURED");
    return jumpaError(503, "MEDIA_NOT_CONFIGURED", "Server video belum dikonfigurasi.");
  }

  try {
    const base = await db.jumpaRoom.findUnique({ where: { code }, select: { livekitRoomName: true } });
    if (!base) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");

    const activeOthers = await countActiveOthers(base.livekitRoomName, user.id, config);
    const ctx = await loadRoomContext(code, user, activeOthers);
    if (!ctx) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");

    if (!ctx.decision.ok) {
      await recordJoinDenied(ctx.room.id, user.id, ctx.decision.code);
      return jumpaError(DENY_STATUS[ctx.decision.code] ?? 403, ctx.decision.code, ctx.decision.message);
    }
    const { roomRole, accessVia, effective } = ctx.decision;

    try {
      await ensureLivekitRoom({ name: ctx.room.livekitRoomName, maxParticipants: ctx.room.maxParticipants, config });
    } catch (error) {
      console.error("JUMPA_LIVEKIT_UNREACHABLE", { error: error instanceof Error ? error.message : String(error) });
      return jumpaError(503, "MEDIA_UNAVAILABLE", "Server video sedang tidak bisa dihubungi. Coba lagi sebentar.");
    }

    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: { fullName: true, nickname: true, avatar: true },
    });

    const token = await mintJoinToken({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      identity: user.id,
      name: (profile?.nickname || profile?.fullName || "Pengguna BC").slice(0, 60),
      metadata: { v: 1, bcRole: effective, roomRole, avatar: profile?.avatar ?? null },
      grant: buildJoinGrant(ctx.room.livekitRoomName, publishSourcesFor(roomRole, effective)),
    });

    await recordJoinGranted({ room: ctx.room, userId: user.id, roomRole, accessVia });

    return jumpaJson({ token, serverUrl: getLivekitPublicWsUrl(), roomRole });
  } catch (error) {
    console.error("JUMPA_TOKEN_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "JUMPA belum tersedia saat ini. Coba lagi sebentar.");
  }
}
