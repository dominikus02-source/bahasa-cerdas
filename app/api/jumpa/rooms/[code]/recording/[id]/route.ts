import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { EgressStatus } from "livekit-server-sdk";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { jumpaDisabledResponse, jumpaError } from "@/lib/jumpa/http";
import { egressClient, RECORDING_ROOT, recordingEnabled } from "@/lib/jumpa/recording";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ code: string; id: string }> }) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const user = await getUser();
  if (!user) return jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu.");
  const { code, id } = await params;
  if (!isValidRoomCode(code) || !/^EG_[a-zA-Z0-9]+$/.test(id)) return jumpaError(404, "NOT_FOUND", "Rekaman tidak ditemukan.");
  try {
    const room = await db.jumpaRoom.findUnique({ where: { code } });
    if (!room || room.createdById !== user.id) return jumpaError(404, "NOT_FOUND", "Rekaman tidak ditemukan.");
    if (!recordingEnabled()) return jumpaError(503, "UNAVAILABLE", "Rekaman belum tersedia.");
    const saved = await db.jumpaEvent.findUnique({ where: { dedupeKey: "recording-ended:" + id } });
    const meta = saved?.roomId === room.id && saved.action === "RECORDING_COMPLETE"
      ? saved.metadata as { filename?: unknown } | null : null;
    const jobs = typeof meta?.filename === "string" ? [] : await egressClient().listEgress({ roomName: room.livekitRoomName, egressId: id });
    const job = jobs.find(j => j.egressId === id && j.roomName === room.livekitRoomName && j.status === EgressStatus.EGRESS_COMPLETE);
    const filename = typeof meta?.filename === "string" ? meta.filename : job?.fileResults[0]?.filename;
    const name = filename ? basename(filename) : "";
    if (!name.startsWith(room.id + "-") || !name.endsWith(".mp4")) return jumpaError(404, "NOT_FOUND", "Rekaman belum siap.");
    const file = await open(join(RECORDING_ROOT, name), constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = await file.stat();
    if (!stat.isFile() || stat.size === 0) { await file.close(); return jumpaError(404, "NOT_FOUND", "Rekaman belum siap."); }
    const stream = file.createReadStream({ autoClose: true });
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { headers: {
      "Content-Type": "video/mp4", "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="jumpa-${code}-${id}.mp4"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return jumpaError(503, "UNAVAILABLE", "Rekaman belum dapat diunduh.");
  }
}
