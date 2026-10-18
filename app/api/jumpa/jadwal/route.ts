/**
 * POST /api/jumpa/jadwal — jadwalkan JUMPA (guru saja).
 * Body: { kind: "KELAS"|"GURU", groupId?, communityId?, title?, date: "YYYY-MM-DD",
 *         time: "HH:MM" (WIB), durationMin, extraGroupIds?, userIds?, notifyClass? }.
 * Validasi: lib/jumpa/schedule.ts. Notifikasi "JUMPA dijadwalkan" ke penerima.
 */
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { scheduleRoom } from "@/lib/jumpa/scheduling";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const id = z.string().min(1).max(64);
const bodySchema = z.object({
  kind: z.enum(["KELAS", "GURU"]),
  groupId: id.optional(),
  communityId: id.optional(),
  title: z.string().max(200).optional(),
  date: z.string().max(10),
  time: z.string().max(5),
  durationMin: z.number().int().min(1).max(600),
  extraGroupIds: z.array(id).max(10).optional(),
  userIds: z.array(id).max(30).optional(),
  notifyClass: z.boolean().optional(),
});

export async function POST(request: Request) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  const limited = await rateLimitRoute(request, { identifier: "jumpa-schedule", maxRequests: 10, windowSeconds: 60, subject: user.id });
  if (limited) return limited;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jumpaError(400, "BAD_REQUEST", "Data jadwal tidak valid.");
  try {
    const r = await scheduleRoom(user, parsed.data);
    if (!r.ok) return jumpaError(r.status, r.code, r.message, r.extra);
    const { ok: _ok, ...rest } = r;
    return jumpaJson({ ...rest, url: `/jumpa/${r.code}` }, 201);
  } catch (error) {
    console.error("JUMPA_SCHEDULE_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "Jadwal belum bisa disimpan. Coba lagi.");
  }
}
