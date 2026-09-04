/**
 * P0.6 route tests — guru bank-soal send/pick + murid serve-time (STEP 6).
 *
 * The repo has no in-process route harness; its route tests are either
 * source-wiring assertions (see test-murid-quiz-leakage) or HTTP against a
 * live base URL. Live HTTP for these routes is gated by auth/group
 * prerequisites (demo guru owns no group → send 404s before the quarantine
 * check; demo murid belongs to no group → serve-time 403 before it), and DB
 * writes to fabricate that state are prohibited. So this suite proves the
 * route logic through the tightest available seams:
 *
 *  A. Source wiring: every quarantine route calls the delivery gate, returns
 *     the controlled 422, and the send route gates BEFORE any DB write.
 *  B. Handler seam on real DB rows: the exact candidate set + filter the send
 *     route uses for a real tema → 0 deliverable → deterministic 422 branch;
 *     audited broken ids fail the gate; real non-master rows pass.
 *
 * Read-only on the database; without env/DB access section B self-skips.
 */
import { readFileSync } from "fs";
import { loadScriptEnv } from "./_env";
import { isMasterBankDeliverable, toDeliverySoal } from "../lib/question-bank/delivery-gate";

let pass = 0;
let total = 0;
const check = (name: string, ok: boolean, detail = "") => {
  total++;
  if (ok) pass++;
  else console.log(`  ✗ FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
};

function assertOrder(name: string, haystack: string, before: string, after: string) {
  const i1 = haystack.indexOf(before);
  const i2 = haystack.indexOf(after);
  check(name, i1 !== -1 && i2 !== -1 && i1 < i2, `indexOf("${before.slice(0, 24)}…")=${i1} vs "${after.slice(0, 24)}…")=${i2}`);
}

console.log("=== P0.6 Quiz Delivery Routes — Seam Tests ===\n");

// ---------- A. Source wiring (route files as written) ----------
console.log("A. Route wiring:");
const sendRoute = readFileSync("app/api/guru/bank-soal/send/route.ts", "utf-8");
const pickRoute = readFileSync("app/api/guru/latihan/pick/route.ts", "utf-8");
const quizRoute = readFileSync("app/api/murid/quiz/[id]/route.ts", "utf-8");
const subRoute = readFileSync("app/api/murid/quiz/submission/[id]/route.ts", "utf-8");

check("send imports gate", sendRoute.includes("isMasterBankDeliverable") && sendRoute.includes("toDeliverySoal"));
check("pick imports gate", pickRoute.includes("isMasterBankDeliverable") && pickRoute.includes("toDeliverySoal"));
check("murid quiz GET imports gate", quizRoute.includes("isMasterBankDeliverable") && quizRoute.includes("toDeliverySoal"));
check("submission GET imports gate", subRoute.includes("isMasterBankDeliverable") && subRoute.includes("toDeliverySoal"));

check("send fail-closed 422 on empty deliverable", sendRoute.includes('deliverable.length === 0') && sendRoute.includes("belum memiliki soal yang lolos verifikasi"));
check("pick fail-closed 422 on empty deliverable", pickRoute.includes('totalAvailable === 0') && pickRoute.includes("sedang diaudit"));
check("murid quiz GET serve-time 422", quizRoute.includes("QUIZ_CONTENT_QUARANTINED") && quizRoute.includes("blocked.length > 0"));
check("submission GET serve-time 422", subRoute.includes("QUIZ_CONTENT_QUARANTINED") && subRoute.includes("blocked.length > 0"));

// send: quarantine guard must precede every DB write (usedCount + quiz.create).
assertOrder("send gates before usedCount write", sendRoute, "belum memiliki soal yang lolos", "usedCount: { increment: 1 }");
assertOrder("send gates before quiz create", sendRoute, "belum memiliki soal yang lolos", "db.quiz.create");
// murid GET: quarantine guard precedes the student response build.
assertOrder("quiz GET gates before response", quizRoute, "QUIZ_CONTENT_QUARANTINED", "sanitizeSoalForStudent(soalMap.get");

// ---------- B. Handler seam on real production rows ----------
console.log("\nB. Handler seam (real DB rows, read-only):");
(async () => {
  loadScriptEnv();
  const rawUrl = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "") ?? process.env.DIRECT_URL?.trim().replace(/^["']|["']$/g, "");
  if (!rawUrl || rawUrl === "[SENSITIVE]" || !/^postgres(ql)?:\/\//.test(rawUrl)) {
    console.log("  ⚠️  DB env unavailable — section B self-skip (exit 0, like check-diagnostic-pool).");
  } else {
    const { PrismaClient } = await import("@prisma/client");
    const { requireDatabaseUrl } = await import("./_env");
    const db = new PrismaClient({ datasources: { db: { url: requireDatabaseUrl() } } });
    try {
      // Exact query the send route runs for tema Antonim kelas 7.
      const candidates = await db.soal.findMany({ where: { source: "MASTER_BANK", topik: "Antonim", kelas: "7" } });
      const deliverable = candidates.filter((s: any) => isMasterBankDeliverable(toDeliverySoal(s as any)));
      check(`send seam (Antonim/7): ${candidates.length} raw → 0 deliverable → 422 branch`, candidates.length > 0 && deliverable.length === 0,
        `${candidates.length} raw, ${deliverable.length} deliverable`);

      // Audited broken ids must never be deliverable.
      for (const kode of ["BC-SINONIM-0003", "BC-CERPEN-0014", "BC-EJAAN-0002"]) {
        const row = await db.soal.findUnique({ where: { kodeSoal: kode } });
        check(`audited broken id ${kode} blocked`, !!row && !isMasterBankDeliverable(toDeliverySoal(row as any)), row ? "row missing" : "not found");
      }

      // Real non-master rows (AI / IMPORT) must remain deliverable.
      const nonMaster = await db.soal.findFirst({ where: { source: { in: ["AI", "IMPORT"] } } });
      check("non-master (AI/IMPORT) row deliverable", !!nonMaster && isMasterBankDeliverable(toDeliverySoal(nonMaster as any)));
      await db.$disconnect();
    } catch (e) {
      check("DB section ran clean", false, String((e as Error).message ?? e).slice(0, 120));
      await db.$disconnect().catch(() => {});
    }
  }

  console.log(`\n--- Results ---`);
  console.log(`Tests: ${pass}/${total} passed`);
  if (pass !== total) process.exit(1);
  console.log(`\n✅ ALL TESTS PASSED — quarantine routes wired fail-closed before any write; serve-time guards in place`);
  process.exit(0);
})();
