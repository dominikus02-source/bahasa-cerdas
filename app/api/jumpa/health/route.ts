/**
 * GET /api/jumpa/health — kesiapan JUMPA untuk operator. Hanya boolean,
 * tanpa nilai rahasia. Pola: app/api/main-bersama/health.
 */
import { db } from "@/lib/db";
import { JUMPA_ENABLED } from "@/lib/features";
import { getLivekitServerConfig } from "@/lib/jumpa/config";
import { jumpaJson } from "@/lib/jumpa/http";

export const dynamic = "force-dynamic";

const PHASE1_TABLES = ["JumpaRoom", "JumpaParticipant", "JumpaEvent"];
const PHASE2_TABLES = ["JumpaInvite", "JumpaChatMessage", "JumpaReport"];

/**
 * storage: "ready" = tabel Fase 1 + Fase 2 ada (kode Fase 2 butuh keduanya),
 * "phase1-only" = migrasi Fase 2 belum diterapkan, "unavailable" = lainnya.
 */
export async function GET() {
  let storage: "ready" | "phase1-only" | "unavailable" = "unavailable";
  try {
    const rows = await db.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'Jumpa%'`;
    const have = new Set(rows.map((r) => r.table_name));
    const p1 = PHASE1_TABLES.every((t) => have.has(t));
    const p2 = PHASE2_TABLES.every((t) => have.has(t));
    storage = p1 && p2 ? "ready" : p1 ? "phase1-only" : "unavailable";
  } catch {
    storage = "unavailable";
  }
  return jumpaJson({ ok: true, enabled: JUMPA_ENABLED, livekitConfigured: Boolean(getLivekitServerConfig()), storage });
}
