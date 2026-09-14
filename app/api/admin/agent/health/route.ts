import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { getWorkerHealthView } from "@/src/agent/persistence/queries";

export const dynamic = "force-dynamic";

/**
 * BC Agent P7 — read-only worker health endpoint (§P7 Phase 9).
 *
 * Three distinct questions, never conflated (principle 12 — no fake health):
 *
 *   LIVENESS  — the web process answering this request (always 200 here; the
 *               route existing and responding IS the liveness signal).
 *   READINESS — the DB is reachable (a 503 with no task data means "do not
 *               route work to me", distinct from a liveness failure).
 *   WORKER    — is a BC Agent worker process ALIVE and claiming work? This
 *               is persisted truth only: the AgentWorker registry heartbeat
 *               (P7) plus the P5 attempt-lease contract. "A process exists"
 *               is never reported as "worker healthy".
 *
 * Access: founder/admin session OR `Authorization: Bearer $BC_AGENT_HEALTH_TOKEN`
 * (for container liveness probes / uptime checks). No secrets, no keys, no
 * internal identifiers beyond bounded worker metadata in the response.
 */
export async function GET(req: NextRequest) {
  const token = process.env.BC_AGENT_HEALTH_TOKEN;
  const auth = req.headers.get("authorization");
  const bearerOk = Boolean(token) && auth === `Bearer ${token}`;
  if (!bearerOk) {
    const user = await getUser();
    if (!user || (user.role !== "ADMIN" && !user.isFounder)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }

  // READINESS probe: DB reachability, bounded, no task payloads.
  let dbReady: boolean;
  try {
    await db.$queryRaw`SELECT 1`;
    dbReady = true;
  } catch {
    dbReady = false;
  }
  if (!dbReady) {
    return NextResponse.json(
      { ok: false, liveness: "ALIVE", readiness: "DB_UNAVAILABLE", worker: null },
      { status: 503 }
    );
  }

  // WORKER health: persisted truth only.
  const health = await getWorkerHealthView(db);
  return NextResponse.json({
    ok: true,
    liveness: "ALIVE",
    readiness: "READY",
    worker: {
      // Registry signal (P7): the worker process's own durable heartbeat.
      registry: health.registry,
      staleWorkers: health.staleWorkers,
      workers: health.workers,
      // Lease-derived processing state (P5 contract, unchanged).
      lease: {
        runtimeState: health.runtimeState,
        activeLeases: health.activeLeases,
        activeTaskId: health.activeTaskId,
        lastHeartbeatAt: health.lastHeartbeatAt,
        secondsSinceHeartbeat: health.secondsSinceHeartbeat,
      },
      note: health.note,
    },
  });
}
