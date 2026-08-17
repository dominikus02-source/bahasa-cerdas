import fs from "fs";
import path from "path";
import {
  MasterQuestion,
  isWrongTypeMCQ,
  isSelfAnswer,
  explanationContradictsKey,
} from "../lib/master-recovery";
import { runSemanticRepairV2, sha256Source } from "../lib/master-repair/v2/engine";
import { V2EngineContext, RepairV2Record, PilotDecision } from "../lib/master-repair/v2/types";

const AUDIT_DIR = "data/question-bank/audit";
const CANDIDATES_FILE = path.join(AUDIT_DIR, "master-repair-candidates-2026-08-17.json");
const OUTPUT_FILE = path.join(AUDIT_DIR, "master-semantic-repair-v2-pilot-2026-08-17.json");

interface PoolRecord {
  id: string;
  repairType: string[];
  original: MasterQuestion;
}

interface Selection {
  bucket: string;
  purpose: string;
  ids: string[];
}

function loadPool(): PoolRecord[] {
  const d = JSON.parse(fs.readFileSync(CANDIDATES_FILE, "utf8"));
  return (d.records as Array<{ id: string; repairType: string[]; original: MasterQuestion }>).map((r) => ({
    id: r.id,
    repairType: r.repairType,
    original: r.original,
  }));
}

function spreadTake(records: PoolRecord[], n: number): PoolRecord[] {
  const byFile = new Map<string, PoolRecord[]>();
  for (const r of records) {
    const f = r.original.file || "misc";
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f)!.push(r);
  }
  const files = [...byFile.keys()].sort();
  const out: PoolRecord[] = [];
  let fi = 0;
  while (out.length < n && files.length) {
    const f = files[fi % files.length];
    const bucket = byFile.get(f)!;
    const item = bucket.shift();
    if (item) out.push(item);
    if (bucket.length === 0) files.splice(fi % files.length, 1);
    fi++;
  }
  for (const r of records) {
    if (out.length >= n) break;
    if (!out.includes(r)) out.push(r);
  }
  return out.slice(0, n);
}

function semanticPool(pool: PoolRecord[], keys: RegExp[]): PoolRecord[] {
  return pool
    .filter((r) => {
      const text = [r.original.text, r.original.indikator, r.original.tema, ...(r.original.kataKunci || [])].join(" ");
      return keys.some((k) => k.test(text));
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function main() {
  const useAi = process.argv.includes("--ai");
  const groqKey = process.argv.includes("--groq-key") ? process.argv[process.argv.indexOf("--groq-key") + 1] : undefined;
  const maxAi = Math.min(500, Math.max(0, Number(process.argv[process.argv.indexOf("--max-ai") + 1] ?? 12)));

  if (useAi && groqKey) {
    process.env.GROQ_API_KEY = groqKey;
  }

  const pool = loadPool();
  if (pool.length !== 1481) {
    console.error(`pool kandidat tidak sesuai: ${pool.length} (diharapkan 1481)`);
    process.exit(2);
  }

  const concat = spreadTake(pool.filter((r) => r.repairType[0] === "CONCEPT_TO_CONTEXT"), 20);
  const taut = spreadTake(pool.filter((r) => r.repairType[0] === "TAUTOLOGY_TO_VALID_ITEM"), 20);
  const badExp = spreadTake(pool.filter((r) => r.repairType[0] === "BAD_EXPLAIN_TO_MCQ"), 20);

  const keyCand = pool
    .filter((r) => isSelfAnswer(r.original).is || explanationContradictsKey(r.original))
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 10);
  const typeCand = pool.filter((r) => isWrongTypeMCQ(r.original)).sort((a, b) => a.id.localeCompare(b.id)).slice(0, 10);

  const sinAnt = semanticPool(pool, [/sinonim/i, /antonim/i]).slice(0, 10);
  const mixedA = semanticPool(pool, [/makna kata/i]).slice(0, 2);
  const mixedB = semanticPool(pool, [/spok/i]).slice(0, 2);
  const mixedC = semanticPool(pool, [/majas/i]).slice(0, 2);
  const mixedD = semanticPool(pool, [/ejaan/i]).slice(0, 2);
  const mixedE = semanticPool(pool, [/kalimat efektif/i]).slice(0, 2);
  const mixed = [...mixedA, ...mixedB, ...mixedC, ...mixedD, ...mixedE];

  const used = new Map<string, string>();
  const selections: Selection[] = [
    { bucket: "CONCEPT_TO_CONTEXT", purpose: "20 konsep tanpa konteks → konteks", ids: concat.map((r) => r.id) },
    { bucket: "TAUTOLOGY", purpose: "20 tautologi → butir valid", ids: taut.map((r) => r.id) },
    { bucket: "BAD_EXPLANATION", purpose: "20 penjelasan langsung → MCQ kontekstual", ids: badExp.map((r) => r.id) },
    { bucket: "KEY_REPAIR", purpose: "10 kunci berpotensi salah", ids: keyCand.map((r) => r.id) },
    { bucket: "TYPE_REPAIR", purpose: "10 tipe soal salah", ids: typeCand.map((r) => r.id) },
    { bucket: "SINONIM_ANTONIM", purpose: "10 sinonim/antonim", ids: sinAnt.map((r) => r.id) },
    { bucket: "MIXED_SEMANTIC", purpose: "10 kasus semantik campuran (makna/spok/majas/ejaan/kalimat)", ids: mixed.map((r) => r.id) },
  ];

  let total = 0;
  for (const s of selections) {
    for (const id of s.ids) {
      if (!used.has(id)) used.set(id, s.bucket);
    }
  }
  total = used.size;

  if (total < 100) {
    const soFar = new Set(used.keys());
    const filler = pool
      .filter((r) => !soFar.has(r.id) && r.repairType[0] === "CONCEPT_TO_CONTEXT")
      .sort((a, b) => a.id.localeCompare(b.id));
    let need = 100 - total;
    for (const r of filler) {
      if (need <= 0) break;
      used.set(r.id, "CONCEPT_TO_CONTEXT");
      need--;
    }
    total = used.size;
  }

  const distribution = new Map<string, { purpose: string; count: number }>();
  for (const s of selections) {
    const count = s.ids.filter((id) => used.get(id) === s.bucket).length;
    if (count > 0) distribution.set(s.bucket, { purpose: s.purpose, count });
  }
  const fillerCount = [...used.values()].filter((b) => b === "CONCEPT_TO_CONTEXT").length -
    distribution.get("CONCEPT_TO_CONTEXT")?.count!;
  if (fillerCount > 0) {
    distribution.set("CONCEPT_TO_CONTEXT", {
      purpose: "konsep tanpa konteks → konteks (termasuk pengisi distribusi karena KEY/TYPE < 10 tersedia)",
      count: distribution.get("CONCEPT_TO_CONTEXT")?.count! + fillerCount,
    });
  }
  if (total > 100) {
    console.error(`terlalu banyak: ${total}`);
    process.exit(4);
  }

  const byId = new Map(pool.map((r) => [r.id, r]));
  const order = [...used.keys()];
  const ctx: V2EngineContext = {
    allBank: pool.map((r) => r.original),
    aiEnabled: useAi,
    maxAiAttempts: maxAi,
    aiBudgetUsed: 0,
  };

  const records: RepairV2Record[] = [];
  let cursor = 0;
  const run = async (): Promise<void> => {
    while (cursor < order.length) {
      const id = order[cursor++];
      const rec = byId.get(id)!;
      const record = await runSemanticRepairV2(rec.original, ctx, rec.repairType[0]);
      records.push(record);
    }
  };
  void run;

  // Concurrency 1 (deterministik — cepat); AI path selalu sequential agar rate-limit aman.
  (async () => {
    for (const id of order) {
      const rec = byId.get(id)!;
      const record = await runSemanticRepairV2(rec.original, ctx, rec.repairType[0]);
      records.push(record);
      if (cursor % 25 === 0) {
        const done = records.length;
        const byD = counts(records);
        console.log(`${done}/100 — ${JSON.stringify(byD)}`);
      }
    }
    finish(records, selections, useAi, ctx, distribution);
  })().catch((e) => {
    console.error("PILOT FAILED:", e);
    process.exit(1);
  });
}

function counts(records: RepairV2Record[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) out[r.decision] = (out[r.decision] || 0) + 1;
  return out;
}

function finish(records: RepairV2Record[], selections: Selection[], useAi: boolean, ctx: V2EngineContext, distribution: Map<string, { purpose: string; count: number }>): void {
  const decisions = counts(records);
  const gold = records.filter((r) => r.decision === "GOLD");
  const hallucinatedFactsGold = gold.filter((r) => /fakta|atribusi/i.test(r.reason.join(" "))).length;
  const multiCorrectGold = gold.filter((r) => r.gates.some((g) => g.name === "single-correct" && !g.passed)).length;
  const dupGold = gold.filter((r) => r.gates.some((g) => g.name === "duplicate" && !g.passed)).length;
  const sourceMutated = records.filter((r) => r.sourceSha256 !== sha256Source(r.original)).length;

  const confidence: Record<string, number> = {};
  for (const r of records) confidence[r.confidence] = (confidence[r.confidence] || 0) + 1;

  const gateStats: Record<string, { pass: number; fail: number }> = {};
  for (const r of records) {
    for (const g of r.gates) {
      if (!gateStats[g.name]) gateStats[g.name] = { pass: 0, fail: 0 };
      gateStats[g.name][g.passed ? "pass" : "fail"]++;
    }
  }

  const summary = {
    schemaVersion: "master-semantic-repair-v2",
    generatedAt: new Date().toISOString(),
    source: CANDIDATES_FILE,
    aiEnabled: useAi,
    aiAttemptsUsed: ctx.aiBudgetUsed,
    total: records.length,
    distribution: [...distribution.entries()].map(([bucket, v]) => ({ bucket, purpose: v.purpose, count: v.count })),
    decisions,
    confidence,
    gates: gateStats,
    metrics: {
      hallucinatedFactGold: hallucinatedFactsGold,
      multipleCorrectGold: multiCorrectGold,
      duplicateGold: dupGold,
      sourceMutated,
      goldRate: parseFloat(((gold.length / records.length) * 100).toFixed(1)),
    },
  };

  const payload = { summary, records };
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));
  console.log("DONE —", JSON.stringify(summary));
  console.log("artifact:", OUTPUT_FILE);
}

main();