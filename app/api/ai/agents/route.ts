/**
 * GET /api/ai/agents — List Available AI Agents
 *
 * Returns public agent metadata (no internals).
 * Filtered by user role if authenticated.
 * No auth required — public read-only endpoint for agent discovery.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { listAgents, getAgentsForUser } from "@/src/ai/core/agent-registry";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    const _url = new URL(req.url);
    const targetRole = _url.searchParams.get("role") ?? (user?.role.toLowerCase() ?? "murid");

    const agents = getAgentsForUser(targetRole as "guru" | "murid" | "admin");

    // Public-safe metadata — never leak system prompts, schemas, or internals
    const safeList = agents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      role: a.role,
      targetUser: a.targetUser,
      capabilities: a.capabilities,
      limitations: a.limitations,
      temperature: a.temperature,
      maxTokens: a.maxTokens,
      workflowSteps: a.workflowSteps,
      qualityChecklist: a.qualityChecklist.map((q) => ({
        id: q.id,
        label: q.label,
        description: q.description,
      })),
      examples: a.examples.map((e) => ({
        name: e.name,
        description: e.description,
        input: e.input,
        output: e.output,
      })),
    }));

    return NextResponse.json({
      agents: safeList,
      count: safeList.length,
    });
  } catch (error) {
    console.error("[AI Agents List] Unhandled error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
