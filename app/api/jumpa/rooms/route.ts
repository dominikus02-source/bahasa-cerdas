/**
 * POST /api/jumpa/rooms — buat ruang JUMPA.
 * Body: { kind?: "KELAS"|"GURU"|"MURID", groupId?, communityId?, title?, notifyClass?, isWebinar? }.
 * Tanpa `kind` = KELAS (kompatibel Fase 1: { groupId }).
 * isWebinar: hanya Premium, 1x per minggu, 200 peserta.
 * Izin di lib/jumpa/permissions.ts → canCreateRoom.
 */
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { createRoom } from "@/lib/jumpa/service";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    kind: z.enum(["KELAS", "GURU", "MURID"]).default("KELAS"),
    groupId: z.string().min(1).max(64).optional(),
    communityId: z.string().min(1).max(64).optional(),
    title: z.string().max(200).optional(),
    /** "Beri tahu kelas" (default true). Disimpan di JumpaRoom.notifyClass. */
    notifyClass: z.boolean().optional(),
    /** Webinar: hanya guru Premium, 1x per minggu, 200 peserta. */
    isWebinar: z.boolean().optional(),
  })
  .refine((b) => b.kind === "GURU" || Boolean(b.groupId), { message: "groupId wajib" });

export async function POST(request: Request) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;

  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");

  const limited = await rateLimitRoute(request, { identifier: "jumpa-create", maxRequests: 10, windowSeconds: 60, subject: user.id });
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jumpaError(400, "BAD_REQUEST", "Data ruang tidak valid. Pilih kelas terlebih dahulu.");

  try {
    const result = await createRoom(user, parsed.data);
    if (!result.ok) return jumpaError(result.status, result.code, result.message, result.extra);
    return jumpaJson({ code: result.room.code, title: result.room.title, url: `/jumpa/${result.room.code}`, reused: result.reused, tier: result.tier ?? null }, result.reused ? 200 : 201);
  } catch (error) {
    console.error("JUMPA_CREATE_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "JUMPA belum tersedia saat ini. Coba lagi sebentar.");
  }
}
