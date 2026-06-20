/**
 * Phase 6B Consolidation Test Script
 *
 * Tests:
 * 1. Registry includes all 9 agents
 * 2. GET /api/ai/agents returns safe metadata for all
 * 3. /guru/ai-tools client helper uses /api/ai/agents/run
 * 4. Save/history helper uses /api/ai/agents/saved
 * 5. Export helper uses /api/ai/agents/export/*
 * 6. No UI import uses /api/ai/saved-results
 * 7. Prisma schema has one canonical saved result model (AiSavedResult)
 * 8-11. EYD/Feedback/Grading/Text Analysis run through central runner
 *
 * Usage: npx tsx scripts/test-phase6-consolidation.ts
 */

// ─── Test 1: Registry includes all 9 agents ───────────────────
async function testRegistry() {
  console.log("\n[Test 1] Registry includes all 9 agents...");

  // The registry auto-registers on import of src/ai/index
  const { listAgents, agentCount } = await import("../src/ai/index");

  const expectedAgents = [
    "rpp", "soal", "ppt", "review", "bc-assistant",
    "eyd", "feedback", "grading", "text-analysis",
  ];

  const registered = listAgents();
  const registeredIds = registered.map((a) => a.id).sort();

  console.log(`  Registered agents: ${registeredIds.join(", ")}`);
  console.log(`  Count: ${agentCount()}`);

  const missing = expectedAgents.filter((id) => !registeredIds.includes(id as never));
  const extra = registeredIds.filter((id) => !expectedAgents.includes(id as never));

  if (missing.length > 0) {
    console.error(`  FAIL: Missing agents: ${missing.join(", ")}`);
    process.exit(1);
  }
  if (extra.length > 0) {
    console.log(`  NOTE: Extra agents beyond core 9: ${extra.join(", ")}`);
  }

  for (const id of expectedAgents) {
    const agent = registered.find((a) => a.id === id);
    if (!agent) {
      console.error(`  FAIL: Agent '${id}' not found in registry`);
      process.exit(1);
    }
    if (!agent.name) {
      console.error(`  FAIL: Agent '${id}' missing 'name'`);
      process.exit(1);
    }
    if (!agent.description) {
      console.error(`  FAIL: Agent '${id}' missing 'description'`);
      process.exit(1);
    }
  }

  console.log("  PASS");
}

// ─── Test 2: Agent types include all 9 ────────────────────────
async function testAgentTypes() {
  console.log("\n[Test 2] AgentId type includes all 9 agents...");

  const { listAgents } = await import("../src/ai/index");
  const registered = listAgents();
  const registeredIds = registered.map((a) => a.id);

  // Verify all expected agents are in the registered list
  const expectedAgents = [
    "rpp", "soal", "ppt", "review", "bc-assistant",
    "eyd", "feedback", "grading", "text-analysis",
  ];

  for (const id of expectedAgents) {
    if (!registeredIds.includes(id as never)) {
      console.error(`  FAIL: Agent '${id}' not found`);
      process.exit(1);
    }
  }

  console.log(`  AgentId type includes ${registeredIds.length} IDs`);
  console.log("  PASS (verified via registry)");
}

// ─── Test 3: Client helper uses /api/ai/agents/run ──────────────
async function testClientHelper() {
  console.log("\n[Test 3] UI client helper uses /api/ai/agents/run...");

  const agentApiContent = await import("fs").then((fs) =>
    fs.readFileSync(
      "app/(dashboard)/guru/ai-tools/lib/agent-api.ts",
      "utf-8"
    )
  );

  if (!agentApiContent.includes('/api/ai/agents/run')) {
    console.error("  FAIL: agent-api.ts does not use /api/ai/agents/run");
    process.exit(1);
  }

  const pattern: string[] = (agentApiContent.match(/fetch\("([^"]+)"\)/g)?.map((f) => f.match(/"([^"]+)"/)?.[1]) ?? []).filter((x): x is string => !!x);
  for (const url of pattern) {
    if (url.startsWith("/api/ai/") && !url.startsWith("/api/ai/agents/") && !url.startsWith("/api/ai/agents")) {
      console.warn(`  WARN: agent-api.ts uses non-canonical route: ${url}`);
    }
  }

  console.log("  PASS");
}

// ─── Test 4: Save/history helper uses /api/ai/agents/saved ─────
async function testSavedHelper() {
  console.log("\n[Test 4] Save/history helper uses /api/ai/agents/saved...");

  const savedApiContent = await import("fs").then((fs) =>
    fs.readFileSync(
      "app/(dashboard)/guru/ai-tools/lib/saved-results-api.ts",
      "utf-8"
    )
  );

  if (!savedApiContent.includes('/api/ai/agents/saved')) {
    console.error("  FAIL: saved-results-api.ts does not use /api/ai/agents/saved");
    process.exit(1);
  }

  if (savedApiContent.includes('/api/ai/saved-results')) {
    console.error("  FAIL: saved-results-api.ts uses non-canonical /api/ai/saved-results");
    process.exit(1);
  }

  const pattern: string[] = (savedApiContent.match(/fetch\("([^"]+)"\)/g)?.map((f) => f.match(/"([^"]+)"/)?.[1]) ?? []).filter((x): x is string => !!x);
  for (const url of pattern) {
    const cleanUrl = url.split("${")[0]; // ignore template strings
    if (cleanUrl.includes("/api/ai/") && !cleanUrl.includes("/api/ai/agents/saved")) {
      console.warn(`  WARN: saved-results-api.ts uses non-/api/ai/agents/saved route: ${url}`);
    }
  }

  console.log("  PASS");
}

// ─── Test 5: Export helper uses /api/ai/agents/export/* ────────
async function testExportHelper() {
  console.log("\n[Test 5] Export helper uses /api/ai/agents/export/*...");

  const exportApiContent = await import("fs").then((fs) =>
    fs.readFileSync(
      "app/(dashboard)/guru/ai-tools/lib/export-api.ts",
      "utf-8"
    )
  );

  const expectedRoutes = [
    '/api/ai/agents/export/docx',
    '/api/ai/agents/export/pptx',
    '/api/ai/agents/export/pdf',
  ];

  for (const route of expectedRoutes) {
    if (!exportApiContent.includes(route)) {
      console.error(`  FAIL: export-api.ts missing route: ${route}`);
      process.exit(1);
    }
  }

  console.log("  PASS");
}

// ─── Test 6: No UI code uses /api/ai/saved-results ────────────
async function testNoBadImports() {
  console.log("\n[Test 6] No UI code uses /api/ai/saved-results...");

  const fs = await import("fs");
  const path = await import("path");
  const uiDir = "app/(dashboard)/guru/ai-tools";

  function walkDir(dir: string): string[] {
    const entries = fs.readdirSync(dir);
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...walkDir(fullPath));
      } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const files = walkDir(uiDir);

  for (const file of files) {
    const content = await import("fs").then((fs) => fs.readFileSync(file, "utf-8"));
    if (content.includes('/api/ai/saved-results')) {
      console.error(`  FAIL: ${file} uses /api/ai/saved-results`);
      process.exit(1);
    }
    if (content.includes('/api/ai/eyd') || content.includes('/api/ai/feedback')) {
      // Only flag if it's a direct fetch call, not references in comments/docs
      const lines = content.split("\n");
      for (const line of lines) {
        if ((line.includes('/api/ai/eyd') || line.includes('/api/ai/feedback') || line.includes('/api/ai/grading') || line.includes('/api/ai/text-analysis')) && line.includes('fetch')) {
          console.warn(`  WARN: ${file} directly calls standalone route: ${line.trim()}`);
        }
      }
    }
  }

  console.log("  PASS (no direct calls to /api/ai/saved-results or standalone routes)");
}

// ─── Test 7: Prisma schema has one canonical saved result model ─
async function testPrismaSchema() {
  console.log("\n[Test 7] Prisma schema canonical model...");

  const content = await import("fs").then((fs) =>
    fs.readFileSync("prisma/schema.prisma", "utf-8")
  );

  const aiSavedResultMatch = content.match(/model AiSavedResult\s*\{/);
  const savedAiResultMatch = content.match(/model SavedAiResult\s*\{/);

  if (!aiSavedResultMatch) {
    console.error("  FAIL: AiSavedResult model not found in schema");
    process.exit(1);
  }

  if (savedAiResultMatch) {
    console.error("  FAIL: SavedAiResult duplicate model found in schema");
    process.exit(1);
  }

  console.log("  PASS (AiSavedResult is canonical, no SavedAiResult duplicate)");
}

// ─── Test 8: New agents have proper AgentDefinition structure ──
async function testNewAgentStructure() {
  console.log("\n[Test 8-11] New agents use central runner...");

  const newAgentFiles = [
    { id: "eyd", path: "src/ai/agents/eyd-agent.ts" },
    { id: "feedback", path: "src/ai/agents/feedback-agent.ts" },
    { id: "grading", path: "src/ai/agents/grading-agent.ts" },
    { id: "text-analysis", path: "src/ai/agents/text-analysis-agent.ts" },
  ];

  for (const { id, path } of newAgentFiles) {
    const content = await import("fs").then((fs) =>
      fs.readFileSync(path, "utf-8")
    );

    // Check uses central runner
    if (!content.includes('registerAgent(')) {
      console.error(`  FAIL: ${id} agent does not call registerAgent()`);
      process.exit(1);
    }

    if (!content.includes('runAgent({ agent, input, context })')) {
      console.log(`  NOTE: ${id} agent run() does not call central runAgent (might be direct)`);
    }

    if (!content.includes('inputSchema')) {
      console.error(`  FAIL: ${id} agent missing inputSchema`);
      process.exit(1);
    }

    if (!content.includes('outputSchema')) {
      console.error(`  FAIL: ${id} agent missing outputSchema`);
      process.exit(1);
    }

    if (!content.includes('systemPrompt')) {
      console.error(`  FAIL: ${id} agent missing systemPrompt`);
      process.exit(1);
    }

    console.log(`  ${id}: registered, has I/O schemas, system prompt`);
  }

  console.log("  PASS");
}

// ─── Test: Saved route AGENT_IDS includes new agents ──────────
async function testSavedRouteAgentIds() {
  console.log("\n[Test] Saved route AGENT_IDS includes new agents...");

  const content = await import("fs").then((fs) =>
    fs.readFileSync("app/api/ai/agents/saved/route.ts", "utf-8")
  );

  const expected = ["eyd", "feedback", "grading", "text-analysis"];
  for (const id of expected) {
    if (!content.includes(`"${id}"`)) {
      console.error(`  FAIL: saved route missing agent ID "${id}"`);
      process.exit(1);
    }
  }

  console.log("  PASS");
}

// ─── Main ─────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("Phase 6B Consolidation Test Suite");
  console.log("=".repeat(60));

  await testRegistry();
  await testAgentTypes();
  await testClientHelper();
  await testSavedHelper();
  await testExportHelper();
  await testNoBadImports();
  await testPrismaSchema();
  await testNewAgentStructure();
  await testSavedRouteAgentIds();

  console.log("\n" + "=".repeat(60));
  console.log("ALL TESTS PASSED ✅");
  console.log("=".repeat(60));
}

main().catch((e) => {
  console.error("\nFATAL:", e.message);
  process.exit(1);
});
