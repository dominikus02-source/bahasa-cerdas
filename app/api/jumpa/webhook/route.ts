/**
 * POST /api/jumpa/webhook — webhook LiveKit (kehadiran & ruang selesai).
 *
 * Diautentikasi tanda tangan JWT LiveKit (Authorization) dengan kunci API
 * yang sama (WebhookReceiver). Dipanggil dari jaringan internal Docker
 * (http://web:3000) — lib/supabase/proxy.ts mengecualikan path ini dari
 * redirect domain. Idempoten (JumpaEvent.dedupeKey).
 */
import { WebhookReceiver } from "livekit-server-sdk";
import { getLivekitServerConfig } from "@/lib/jumpa/config";
import { handleJumpaWebhook } from "@/lib/jumpa/background";
import { jumpaDisabledResponse, jumpaError, jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const disabled = jumpaDisabledResponse();
  if (disabled) return disabled;
  const config = getLivekitServerConfig();
  if (!config) return jumpaError(503, "MEDIA_NOT_CONFIGURED", "Server video belum dikonfigurasi.");

  const auth = request.headers.get("authorization") ?? undefined;
  if (!auth) return jumpaError(401, "UNAUTHORIZED", "Unauthorized");
  const body = await request.text();
  if (body.length > 65_536) return jumpaError(413, "TOO_LARGE", "Payload too large");

  let evt;
  try {
    evt = await new WebhookReceiver(config.apiKey, config.apiSecret).receive(body, auth);
  } catch {
    return jumpaError(401, "UNAUTHORIZED", "Unauthorized");
  }

  try {
    const result = await handleJumpaWebhook({
      event: evt.event,
      id: evt.id || undefined,
      createdAt: evt.createdAt ? Number(evt.createdAt) : undefined,
      roomName: evt.room?.name,
      identity: evt.participant?.identity,
    });
    return jumpaJson({ ok: true, result });
  } catch (error) {
    console.error("JUMPA_WEBHOOK_FAILED", { event: evt.event, error: error instanceof Error ? error.message : String(error) });
    // 5xx → LiveKit mencoba ulang; aman karena idempoten.
    return jumpaError(503, "STORAGE_UNAVAILABLE", "Retry later");
  }
}
