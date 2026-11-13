/** Rekaman JUMPA: akses Premium-host saja. Egress belum boleh dijalankan. */
import { getUser } from "@/lib/supabase/server";
import { rateLimitRoute } from "@/lib/rate-limit";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { loadRoomContext } from "@/lib/jumpa/service";
import { canManageRecording } from "@/lib/jumpa/recording-policy";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ code: string }> };

async function authorize(request: Request, context: Context) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return { response: disabled, eligible: false };
  const user = await getUser();
  if (!user) return { response: jumpaError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu."), eligible: false };
  const limited = await rateLimitRoute(request, { identifier: "jumpa-recording", maxRequests: 20, windowSeconds: 60, subject: user.id });
  if (limited) return { response: limited, eligible: false };
  const { code } = await context.params;
  if (!isValidRoomCode(code)) return { response: jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan."), eligible: false };
  try {
    const ctx = await loadRoomContext(code, user);
    if (!ctx || !ctx.decision.ok) return { response: jumpaError(404, "NOT_FOUND", "Ruang tidak ditemukan."), eligible: false };
    const eligible = canManageRecording(ctx.view.tier, ctx.decision.roomRole === "HOST") && ctx.view.recordingTierVerified;
    return { response: null, eligible };
  } catch {
    return { response: jumpaError(503, "RECORDING_UNAVAILABLE", "Status rekaman belum dapat diperiksa."), eligible: false };
  }
}

export async function GET(request: Request, context: Context) {
  const auth = await authorize(request, context);
  if (auth.response) return auth.response;
  return jumpaJson({ eligible: auth.eligible, available: false, recording: false, reason: auth.eligible ? "RECORDING_NOT_READY" : "PREMIUM_HOST_ONLY" });
}

async function rejectMutation(request: Request, context: Context) {
  const auth = await authorize(request, context);
  if (auth.response) return auth.response;
  if (!auth.eligible) return jumpaError(403, "PREMIUM_HOST_ONLY", "Rekaman hanya untuk pemandu Premium.");
  return jumpaError(503, "RECORDING_NOT_READY", "Rekaman belum tersedia.");
}

export async function POST(request: Request, context: Context) {
  return rejectMutation(request, context);
}

export async function DELETE(request: Request, context: Context) {
  return rejectMutation(request, context);
}
