/** Status rekaman. Tidak mengaktifkan Egress sebelum backend teruji. */
import { getUser } from "@/lib/supabase/server";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { loadRoomContext } from "@/lib/jumpa/service";
import { canManageRecording } from "@/lib/jumpa/recording-policy";
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
    if (!ctx || !ctx.decision.ok) return jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan.");
    const eligible = canManageRecording(ctx.view.tier, ctx.decision.roomRole === "HOST");
    return jumpaJson({ eligible, available: false, recording: false, reason: eligible ? "RECORDING_NOT_READY" : "PREMIUM_HOST_ONLY" });
  } catch {
    return jumpaError(503, "RECORDING_UNAVAILABLE", "Status rekaman belum dapat diperiksa.");
  }
}

export async function POST() {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  return jumpaError(503, "RECORDING_NOT_READY", "Rekaman belum tersedia.");
}

export async function DELETE() {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  return jumpaError(503, "RECORDING_NOT_READY", "Rekaman belum tersedia.");
}
