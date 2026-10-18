/**
 * GET /api/jumpa/health — kesiapan JUMPA untuk operator. Hanya boolean,
 * tanpa nilai rahasia. Pola: app/api/main-bersama/health.
 */
import { db } from "@/lib/db";
import { JUMPA_ENABLED } from "@/lib/features";
import { getLivekitServerConfig } from "@/lib/jumpa/config";
import { jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

export async function GET() {
  let storage: "ready" | "unavailable" = "unavailable";
  try {
    const rows = await db.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*)::bigint AS n FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('JumpaRoom', 'JumpaParticipant', 'JumpaEvent')`;
    storage = Number(rows?.[0]?.n ?? 0) === 3 ? "ready" : "unavailable";
  } catch {
    storage = "unavailable";
  }
  return jumpaJson({ ok: true, enabled: JUMPA_ENABLED, livekitConfigured: Boolean(getLivekitServerConfig()), storage });
}
