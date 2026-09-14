import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getAgentTaskService } from "@/src/agent/control/service";
import { resumeIntelligenceWait } from "@/src/agent/intelligence/waiting";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * BC Agent P6 — parked-task sweeper (WAITING_INTELLIGENCE resume).
 *
 * P5 limitation (§31.5): a WAITING_INTELLIGENCE task resumes only when
 * something calls `resumeIntelligenceWait` (operator/sweeper). This route is
 * that sweeper, with hard guardrails:
 *
 * - GATED: dormant unless BC_AGENT_SWEEPER_SECRET is set, and then only via
 *   `Authorization: Bearer <secret>`. Not wired into vercel.json crons —
 *   enabling the schedule is an explicit founder/ops decision.
 * - BOUNDED: at most 10 tasks per invocation, oldest-parked first.
 * - CANONICAL: only the P3 `resumeIntelligenceWait` transition (INTELLIGENCE_
 *   RECOVERED → RUNNING). No tools are executed here, no approvals are
 *   bypassed, no attempts are created, no status is written directly.
 * - CONCURRENCY-SAFE/IDEMPOTENT: transitionTask is core-validated with an
 *   optimistic guard; a task that moved concurrently yields a typed illegal-
 *   transition error which this loop treats as "already handled".
 * - NEVER fabricates events or evidence; the P2 service audits the event.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.BC_AGENT_SWEEPER_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Sweeper dinonaktifkan (BC_AGENT_SWEEPER_SECRET tidak diset)." }, { status: 404 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const parked = await db.agentTask
    .findMany({
      where: { status: "WAITING_INTELLIGENCE" },
      orderBy: { updatedAt: "asc" },
      take: 10,
      select: { id: true },
    })
    .catch(() => []);

  const taskService = getAgentTaskService();
  let resumed = 0;
  let skipped = 0;
  for (const t of parked) {
    try {
      await resumeIntelligenceWait(taskService, t.id, "P6-SWEEPER");
      resumed++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, scanned: parked.length, resumed, skipped });
}
