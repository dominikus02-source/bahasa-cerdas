/**
 * PATCH  /api/jumpa/rooms/[code]/jadwal — ubah jam/durasi { date, time, durationMin }.
 * DELETE /api/jumpa/rooms/[code]/jadwal — batalkan jadwal.
 * Hanya pembuat, sebelum ruang dimulai (lib/jumpa/schedule.ts → canManageSchedule).
 */
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { cancelSchedule, rescheduleRoom } from "@/lib/jumpa/scheduling";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({ date: z.string().max(10), time: z.string().max(5), durationMin: z.number().int().min(1).max(600) });

async function guard(request: Request, params: Promise<{ code: string }>) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return { res: disabled } as const;
  const user = await getUser();
  if (!user) return { res: jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.") } as const;
  const limited = await rateLimitRoute(request, { identifier: "jumpa-schedule-edit", maxRequests: 10, windowSeconds: 60, subject: user.id });
  if (limited) return { res: limited } as const;
  const { code } = await params;
  if (!isValidRoomCode(code)) return { res: jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.") } as const;
  return { user, code } as const;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await guard(request, params);
  if ("res" in g) return g.res;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jumpaError(400, "BAD_REQUEST", "Data jadwal tidak valid.");
  try {
    const r = await rescheduleRoom(g.user, g.code, parsed.data);
    if (!r.ok) return jumpaError(r.status, r.code, r.message);
    const { ok: _ok, ...rest } = r;
    return jumpaJson(rest);
  } catch (error) {
    console.error("JUMPA_RESCHEDULE_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "Jadwal belum bisa diubah. Coba lagi.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const g = await guard(request, params);
  if ("res" in g) return g.res;
  try {
    const r = await cancelSchedule(g.user, g.code);
    if (!r.ok) return jumpaError(r.status, r.code, r.message);
    return jumpaJson({ notified: r.notified });
  } catch (error) {
    console.error("JUMPA_CANCEL_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "Jadwal belum bisa dibatalkan. Coba lagi.");
  }
}
