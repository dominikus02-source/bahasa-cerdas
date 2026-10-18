/**
 * GET  /api/jumpa/rooms/[code]/invites[?q=nama] — kandidat undangan
 *      (kelas KelasKu / komunitas MGMP / pencarian orang).
 * POST /api/jumpa/rooms/[code]/invites — { kind, groupId?, communityId?, userId? }.
 * Izin: permissions.ts → canInvite (hanya guru host/cohost).
 */
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { createInvite, inviteCandidates, searchInvitees } from "@/lib/jumpa/room-actions";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  kind: z.enum(["GROUP", "COMMUNITY", "USER", "LINK"]),
  groupId: z.string().min(1).max(64).optional(),
  communityId: z.string().min(1).max(64).optional(),
  userId: z.string().min(1).max(64).optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  const limited = await rateLimitRoute(request, { identifier: "jumpa-invite-list", maxRequests: 40, windowSeconds: 60, subject: user.id });
  if (limited) return limited;
  const { code } = await params;
  if (!isValidRoomCode(code)) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");
  const q = new URL(request.url).searchParams.get("q");
  try {
    if (q !== null) {
      const r = await searchInvitees(user, code, q);
      if (!r.ok) return jumpaError(r.status, r.code, r.message);
      return jumpaJson({ users: r.users });
    }
    const r = await inviteCandidates(user, code);
    if (!r.ok) return jumpaError(r.status, r.code, r.message);
    const { ok: _ok, ...rest } = r;
    return jumpaJson(rest);
  } catch (error) {
    console.error("JUMPA_INVITE_LIST_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "Daftar undangan belum bisa dimuat.");
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  const limited = await rateLimitRoute(request, { identifier: "jumpa-invite", maxRequests: 20, windowSeconds: 60, subject: user.id });
  if (limited) return limited;
  const { code } = await params;
  if (!isValidRoomCode(code)) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jumpaError(400, "BAD_REQUEST", "Undangan tidak valid.");
  try {
    const r = await createInvite(user, code, parsed.data);
    if (!r.ok) return jumpaError(r.status, r.code, r.message);
    return jumpaJson({ inviteId: r.inviteId, path: r.path, notified: r.notified }, 201);
  } catch (error) {
    console.error("JUMPA_INVITE_FAILED", { error: error instanceof Error ? error.message : String(error) });
    return jumpaError(503, "STORAGE_UNAVAILABLE", "Undangan gagal dibuat. Coba lagi.");
  }
}
