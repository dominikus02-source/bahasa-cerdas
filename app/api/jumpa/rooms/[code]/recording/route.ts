import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { rateLimitRoute } from "@/lib/rate-limit";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { loadRoomContext } from "@/lib/jumpa/service";
import { resolveJumpaTier } from "@/lib/jumpa/entitlement";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";
import { canManageRecording, egressClient, recordingActive, recordingEnabled, startRecording } from "@/lib/jumpa/recording";
import { EgressStatus } from "livekit-server-sdk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ code: string }> };
async function handle(request: Request, route: RouteContext, mutate: boolean) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const origin = request.headers.get("origin");
  if (mutate && origin && origin !== new URL(request.url).origin)
    return jumpaError(403, "FORBIDDEN", "Yuk, buka rekaman dari halaman JUMPA.");
  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  const limited = await rateLimitRoute(request, { identifier: mutate ? "jumpa-recording-write" : "jumpa-recording-read", maxRequests: mutate ? 6 : 30, windowSeconds: 60, subject: user.id });
  if (limited) return limited;
  const { code } = await route.params;
  if (!isValidRoomCode(code)) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");
  try {
    const ctx = await loadRoomContext(code, user);
    if (!ctx) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");
    const creator = ctx.room.createdById === user.id;
    if (!creator && !ctx.decision.ok) return jumpaError(403, "FORBIDDEN", "Kamu tidak memiliki akses ruang.");
    if (!recordingEnabled()) return jumpaJson({ enabled: false, active: false, recordings: [] }, mutate ? 503 : 200);
    if (!mutate) {
      const jobs = await egressClient().listEgress({ roomName: ctx.room.livekitRoomName });
      const saved = creator ? await db.jumpaEvent.findMany({ where: { roomId: ctx.room.id, action: "RECORDING_COMPLETE" }, orderBy: { createdAt: "desc" }, take: 100 }) : [];
      const completed = saved.flatMap(event => {
        const meta = event.metadata as { egressId?: unknown } | null;
        return typeof meta?.egressId === "string" && !jobs.some(j => j.egressId === meta.egressId)
          ? [{ id: meta.egressId, status: EgressStatus.EGRESS_COMPLETE, ready: true }] : [];
      });
      return jumpaJson({ enabled: true, active: jobs.some(j => recordingActive(j.status)),
        recordings: creator ? [...jobs.map(j => ({ id: j.egressId, status: j.status, ready: j.status === EgressStatus.EGRESS_COMPLETE && j.fileResults.length > 0 })), ...completed] : [] });
    }
    if (!creator) return jumpaError(403, "FORBIDDEN", "Hanya pembuat ruang yang dapat mengelola rekaman.");
    const body: unknown = await request.json().catch(() => null);
    const action = body && typeof body === "object" && "action" in body ? body.action : null;
    if (action !== "start" && action !== "stop") return jumpaError(400, "BAD_REQUEST", "Tindakan tidak valid.");
    const premium = (await resolveJumpaTier(ctx.room.createdById)).tier === "PREMIUM" && ctx.view.tier === "PREMIUM";
    if (action === "start" && !canManageRecording({ creator, premium, live: ctx.room.status === "LIVE" }))
      return jumpaError(403, "RECORDING_NOT_ALLOWED", "Rekaman tersedia untuk pemandu ruang Premium yang berlangsung.");
    // Lock across web replicas; reconcile Egress before retrying a start.
    await db.$transaction(async tx => {
      const locks = await tx.$queryRaw<Array<{ acquired: boolean }>>`SELECT pg_try_advisory_xact_lock(hashtext(${"jumpa-recording:" + ctx.room.id})) AS acquired`;
      if (!locks[0]?.acquired) throw new Error("RECORDING_BUSY");
      const jobs = await egressClient().listEgress({ roomName: ctx.room.livekitRoomName, active: true });
      const active = jobs.filter(j => recordingActive(j.status));
      if (action === "start" && active.length === 0) {
        const job = await startRecording(ctx.room.livekitRoomName, ctx.room.id);
        await tx.jumpaEvent.create({ data: { roomId: ctx.room.id, actorId: user.id, action: "RECORDING_STARTED", metadata: { egressId: job.egressId } } });
      } else if (action === "stop") {
        for (const job of active) await egressClient().stopEgress(job.egressId);
        if (active.length) await tx.jumpaEvent.create({ data: { roomId: ctx.room.id, actorId: user.id, action: "RECORDING_STOP_REQUESTED", metadata: { egressIds: active.map(j => j.egressId) } } });
      }
    }, { timeout: 60000, maxWait: 2000 });
    return jumpaJson({ ok: true });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "";
    if (reason === "RECORDING_STORAGE_LOW") return jumpaError(507, reason, "Penyimpanan rekaman hampir penuh.");
    if (reason === "RECORDING_BUSY") return jumpaError(409, reason, "Rekaman sedang diproses. Tunggu sebentar.");
    console.error("JUMPA_RECORDING_FAILED");
    return jumpaError(503, "RECORDING_UNAVAILABLE", "Rekaman belum tersedia. Periksa status sebelum mencoba lagi.");
  }
}
export async function GET(request: Request, route: RouteContext) { return handle(request, route, false); }
export async function POST(request: Request, route: RouteContext) { return handle(request, route, true); }
