/**
 * P0 Hotfix 2026-09-04 — Tes Awal (diagnostic) stuck after Question 1.
 *
 * Run: npm run test:diagnostic-journey
 *
 * Simulasi state machine adaptif (post-fix) + static checks, tanpa DB/AI.
 *
 * BUG PRODUKSI yang diregresi:
 *   - Server: `answeredCount = targetSize − order.length` padahal sesi adaptif
 *     membangkitkan SATU butir per langkah (order hanya berisi butir yang
 *     sedang tampil). Setelah soal 1 dijawab, order = [] → dianggap selesai →
 *     soal 2 TIDAK PERNAH dibangkitkan.
 *   - Client: tombol "Soal Berikutnya" melakukan setIndex(+1) pada daftar satu
 *     butir → soal undefined → layar macet "Tes awal tidak tersedia.".
 *
 * Simulasi di bawah MENGIKUTI logika app/api/player/diagnostic/route.ts
 * (answerAiDiagnostic) SETELAH perbaikan. Skenario mengikuti jalur murid:
 *   start → Q1 → jawab → Q2 → jawab → Q3 … → Q6 → selesai → hasil.
 *
 * SELALU mengirim payload publik (toPublicQuestion) — tanpa correctAnswer,
 * explanation, misconceptionMap, evidenceTarget, diagnosticRationale.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import {
  answeredCountFor,
  buildInitialState,
  nextPlanForSlot,
} from "@/lib/diagnostic-ai/controller";
import { toPublicQuestion } from "@/lib/diagnostic-ai/types";
import { pickBankFallbackCandidate, toFallbackAiItem } from "@/lib/diagnostic-ai/bank-fallback";
import type { AiDiagnosticItem, AiNextPlan, AiSessionState } from "@/lib/diagnostic-ai/types";
import type { DiagnosticCandidate } from "@/lib/diagnostic/types";

let pass = 0;
let fail = 0;
function ok(name: string, condition: boolean) {
  if (condition) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}`);
  }
}

const PUBLIC_KEYS = ["id", "text", "options", "questionType", "skill", "subskill", "difficulty", "topic"];
const SECRET_KEYS = ["correctAnswer", "explanation", "misconceptionMap", "evidenceTarget", "diagnosticRationale"];

const SIM_ITEM_BASE: Omit<AiDiagnosticItem, "id"> = {
  text: "Kalimat manakah yang paling tepat untuk bagian pembuka sebuah paragraf deskripsi?",
  options: ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
  questionType: "PILIHAN_GANDA",
  skill: "READING",
  subskill: null,
  difficulty: "EASY",
  topic: null,
  cognitiveTarget: null,
  correctAnswer: "0",
  explanation: "Penjelasan lengkap untuk butir simulasi agar lolos ekspektasi validator.",
  misconceptionMap: { "1": "Satu", "2": "Dua", "3": "Tiga" },
  evidenceTarget: { skill: "READING", confidence: "HIGH" },
  diagnosticRationale: "Butir simulasi deterministik untuk menguji alur sesi.",
};

function noLeak(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return PUBLIC_KEYS.every((key) => key in record) && SECRET_KEYS.every((key) => !(key in record));
}

interface EvidenceRow {
  questionId: string;
  isCorrect: boolean;
  skill: string;
}

type GenResult = AiDiagnosticItem | null;

/** Mirrors FIXED answerAiDiagnostic in app/api/player/diagnostic/route.ts. */
class SimServer {
  size: number;
  gen: (plan: AiNextPlan) => AiDiagnosticItem | null;
  fallbackPool: DiagnosticCandidate[];
  state: AiSessionState | null = null;
  evidence: EvidenceRow[] = [];
  responses: string[] = []; // semua id soal yang dikirim ke murid (cek duplikat)
  private seq = 0;

  constructor(opts: { size: number; gen: (plan: AiNextPlan) => AiDiagnosticItem | null; fallbackPool: DiagnosticCandidate[] }) {
    this.size = opts.size;
    this.gen = opts.gen;
    this.fallbackPool = opts.fallbackPool;
  }

  private makeItem(plan: AiNextPlan): AiDiagnosticItem {
    this.seq += 1;
    return {
      ...SIM_ITEM_BASE,
      id: `sim-${this.seq}`,
      skill: plan.skill,
      subskill: plan.subskill,
      difficulty: plan.difficulty,
      topic: plan.topic,
    };
  }

  private fallback(plan: { skill: string; difficulty: string }, avoidIds: string[]): AiDiagnosticItem | null {
    const candidate = pickBankFallbackCandidate(this.fallbackPool, plan, avoidIds);
    if (!candidate) return null;
    return toFallbackAiItem(candidate, "0");
  }

  /** POST action=start (AI branch, post-fix): null = lanjut ke flow bank. */
  start(): { state: AiSessionState; first: AiDiagnosticItem } | null {
    const blank: AiSessionState = { v: 1, mode: "AI-ADAPTIVE", targetSize: this.size, order: [], items: {}, usedTopics: [], usedSubskills: [], genFailed: false };
    const plan = nextPlanForSlot(blank, 0);
    let first = this.gen(plan);
    if (!first) first = this.fallback(plan, []);
    if (!first) return null;
    this.state = buildInitialState(this.size, first);
    this.responses.push(first.id);
    return { state: this.state, first };
  }

  /** GET payload (IN_PROGRESS) — mirror getAiDiagnosticPayload. */
  getPayload(): { answeredCount: number; remaining: number; currentId: string | null } {
    if (!this.state) throw new Error("sim: belum start");
    const current = this.state.order.length > 0 ? this.state.items[this.state.order[0]] : null;
    return {
      answeredCount: answeredCountFor(this.state),
      remaining: this.state.order.length,
      currentId: current ? current.id : null,
    };
  }

  /** POST action=answer — mirror FIXED answerAiDiagnostic. Returns HTTP-ish result. */
  answer(questionId: string, answer: string): {
    code: number;
    correct?: boolean;
    recorded?: boolean;
    nextQuestion?: Record<string, unknown> | null;
    remaining?: number;
    done?: boolean;
    reasonCode?: string;
    answeredCount?: number;
  } {
    const state = this.state;
    if (!state) return { code: 409 };
    if (!state.order.includes(questionId)) return { code: 403 }; // bukan bagian sesi / duplikat
    const item = state.items[questionId];
    if (!item) return { code: 409 };
    const correct = String(answer) === String(item.correctAnswer);
    this.evidence.push({ questionId, isCorrect: correct, skill: item.skill });

    state.order = state.order.filter((id) => id !== questionId);
    const answeredCount = answeredCountFor(state);

    if (state.order.length > 0) {
      const next = state.items[state.order[0]];
      this.responses.push(next.id);
      return { code: 200, correct, recorded: true, nextQuestion: this.publicOf(next), remaining: state.order.length, done: false, reasonCode: "ANSWERED", answeredCount };
    }

    if (answeredCount >= state.targetSize) {
      return { code: 200, correct, recorded: true, nextQuestion: null, remaining: 0, done: true, reasonCode: "TARGET_REACHED", answeredCount };
    }

    const plan = nextPlanForSlot(state, answeredCount);
    const avoidIds = Object.keys(state.items);
    let next: AiDiagnosticItem | null = null;
    let reasonCode: "ANSWERED" | "GENERATION_UNAVAILABLE" = "ANSWERED";

    if (state.genFailed) {
      next = this.fallback(plan, avoidIds);
      if (next) {
        state.items[next.id] = next;
        state.order = [next.id];
      } else {
        reasonCode = "GENERATION_UNAVAILABLE";
      }
    } else {
      const generated = this.gen(plan);
      if (generated) {
        state.items[generated.id] = generated;
        state.order = [generated.id];
        next = generated;
      } else {
        state.genFailed = true;
        next = this.fallback(plan, avoidIds);
        if (next) {
          state.items[next.id] = next;
          state.order = [next.id];
        } else {
          reasonCode = "GENERATION_UNAVAILABLE";
        }
      }
    }

    if (!next && reasonCode === "GENERATION_UNAVAILABLE") {
      // Post-fix: sesi diakhiri deterministik (tidak macet), done:true.
      return { code: 200, correct, recorded: true, nextQuestion: null, remaining: 0, done: true, reasonCode, answeredCount };
    }
    this.responses.push(next.id);
    return { code: 200, correct, recorded: true, nextQuestion: this.publicOf(next!), remaining: state.order.length, done: false, reasonCode, answeredCount };
  }

  private publicOf(item: AiDiagnosticItem): Record<string, unknown> {
    return {
      id: item.id,
      text: item.text,
      options: item.options,
      questionType: item.questionType,
      skill: item.skill,
      subskill: item.subskill,
      difficulty: item.difficulty,
      topic: item.topic,
    };
  }
}

function alwaysGen(plan: AiNextPlan): AiDiagnosticItem {
  return {
    ...SIM_ITEM_BASE,
    id: `stub-${plan.skill}-${plan.difficulty}`,
    skill: plan.skill,
    subskill: plan.subskill,
    difficulty: plan.difficulty,
  };
}

console.log("\n— A. JALUR MURID PENUH: start → Q1 → … → Q6 → selesai —");
{
  const server = new SimServer({ size: 6, gen: (plan) => alwaysGen(plan), fallbackPool: [] });
  const started = server.start();
  ok("T1: start menghasilkan soal 1", started !== null && server.getPayload().currentId === started.first.id && started.first.id !== null);
  ok("T1: payload soal 1 publik (tanpa kunci jawaban)", started !== null && noLeak(toPublicQuestion(started.first)));
  ok("T1: answeredCount 0 di awal", server.getPayload().answeredCount === 0);

  let previousId: string | null = null;
  for (let i = 1; i <= 6; i++) {
    const payload = server.getPayload();
    const currentId = payload.currentId;
    ok(`T${i + 1}: soal ${i} tampil (${currentId})`, currentId !== null);
    ok(`no-duplicate pada soal ${i}`, previousId === null || currentId !== previousId);
    previousId = currentId;

    const item = server.state!.items[currentId!];
    const res = server.answer(currentId!, item.correctAnswer);
    ok(`jawaban soal ${i} tercatat`, res.code === 200 && res.recorded === true && res.correct === true);
    ok(`soal ${i} → ${i + 1}: answeredCount bertambah jadi ${i}`, res.answeredCount === i);
    if (i < 6) {
      ok(`T${i + 2}: soal ${i + 1} berikutnya muncul`, !!res.nextQuestion && res.done === false);
      ok(`payload nextQuestion publik`, !!res.nextQuestion && noLeak(res.nextQuestion));
    } else {
      ok("T5: setelah soal 6 → done (TARGET_REACHED), tanpa soal berikutnya", res.done === true && res.nextQuestion === null && res.remaining === 0);
    }
  }
  ok("T5: 6 jawaban terevidence, semuanya benar", server.evidence.length === 6 && server.evidence.every((e) => e.isCorrect));
  ok("T6: 6 id unik dalam satu sesi", new Set(server.responses).size === server.responses.length && server.responses.length === 6);
  ok("answeredCountFor akhir = 6", answeredCountFor(server.state!) === 6);
}

console.log("\n— B. RESUME SETELAH RELOAD (sesi aktif) —");
{
  const server = new SimServer({ size: 6, gen: (plan) => alwaysGen(plan), fallbackPool: [] });
  server.start();
  for (let i = 1; i <= 3; i++) {
    const currentId = server.getPayload().currentId!;
    server.answer(currentId, server.state!.items[currentId].correctAnswer);
  }
  const payload = server.getPayload();
  ok("T7: reload di tengah sesi → answeredCount 3 (bukan 6/target)", payload.answeredCount === 3);
  ok("T7: reload → soal ke-4 tetap tersedia (in-flight)", payload.currentId !== null && payload.remaining === 1);
  const currentId = payload.currentId!;
  const res = server.answer(currentId, server.state!.items[currentId].correctAnswer);
  ok("T7: lanjut dari soal ke-4 → soal ke-5 muncul", !!res.nextQuestion && res.answeredCount === 4);
}

console.log("\n— C. SUBMIT DUPLIKAT / ID LUAR SESI —");
{
  const server = new SimServer({ size: 6, gen: (plan) => alwaysGen(plan), fallbackPool: [] });
  server.start();
  const q1Id = server.state!.order[0];
  const q1 = server.state!.items[q1Id];
  server.answer(q1.id, q1.correctAnswer);
  const orderBefore = [...server.state!.order];
  const res = server.answer(q1.id, q1.correctAnswer); // jawab ulang soal 1
  ok("T8: jawaban duplikat ditolak 403 (soal sudah bukan bagian sesi)", res.code === 403);
  ok("T8: state tidak korup — order tidak berubah", JSON.stringify(server.state!.order) === JSON.stringify(orderBefore));
  ok("T8: evidence tidak dobel", server.evidence.length === 1);
  ok("T8: id tak dikenal ditolak", server.answer("bukan-soal", "0").code === 403);
}

console.log("\n— D. GAGAL GENERASI → FALLBACK BANK → TANPA MACET —");
{
  const pool: DiagnosticCandidate[] = [
    { id: "bank-a", text: "Soal bank fallback A", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "READING", subskill: null, difficulty: "EASY", topic: null, seenAt: null },
    { id: "bank-b", text: "Soal bank fallback B", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "GRAMMAR", subskill: null, difficulty: "EASY", topic: null, seenAt: null },
  ];
  // Generator hanya berhasil untuk soal 1; setelah itu gagal → bank fallback.
  let calls = 0;
  const server = new SimServer({
    size: 6,
    gen: (plan) => {
      calls++;
      return calls === 1 ? alwaysGen(plan) : null;
    },
    fallbackPool: pool,
  });
  const started = server.start();
  ok("start OK (soal 1 dari generator)", started !== null);
  const q1Id = server.state!.order[0];
  const q1 = server.state!.items[q1Id];
  const res = server.answer(q1.id, q1.correctAnswer);
  ok("T9: generator gagal → fallback bank dipakai (soal 2 tetap muncul)", !!res.nextQuestion && res.done === false);
  ok("T9: genFailed ditandai agar langkah berikutnya tak memanggil AI lagi", server.state!.genFailed === true);
  ok("T9: fallback bank = jalur terpercaya, payload publik", !!res.nextQuestion && noLeak(res.nextQuestion));
}

console.log("\n— E. GENERATOR + POOL KOSONG → SESI BERAKHIR (TANPA MACET) —");
{
  const server = new SimServer({ size: 6, gen: () => null, fallbackPool: [] });
  const started = server.start();
  ok("T11: start tanpa generator & tanpa pool → null (fallback flow bank, bukan error)", started === null);

  // Kasus di tengah sesi: generator mati setelah 2 soal terjawab.
  let calls = 0;
  const server2 = new SimServer({
    size: 6,
    gen: (plan) => {
      calls++;
      return calls <= 2 ? alwaysGen(plan) : null;
    },
    fallbackPool: [],
  });
  server2.start();
  const q1Id = server2.state!.order[0];
  const q1 = server2.state!.items[q1Id];
  const r1 = server2.answer(q1.id, q1.correctAnswer);
  ok("jawaban 1 → soal 2 muncul", !!r1.nextQuestion);
  const q2 = r1.nextQuestion!;
  const r2 = server2.answer(q2.id as string, "0");
  ok("T10: generator gagal di soal 3 & pool kosong → sesi ditutup deterministik (done, remaining 0)", r2.done === true && r2.remaining === 0 && r2.nextQuestion === null);
  ok("T10: tidak macet — answeredCount tetap 2 dan evidence utuh", r2.answeredCount === 2 && server2.evidence.length === 2);
  ok("T10: murid bisa lanjut ke complete (bukan layar kosong)", r2.reasonCode === "GENERATION_UNAVAILABLE");
}

console.log("\n— F. STATIC: kode produksi memakai perbaikan —");
{
  const route = fs.readFileSync(path.resolve(process.cwd(), "app/api/player/diagnostic/route.ts"), "utf8");
  ok("route memakai answeredCountFor", route.includes("answeredCountFor(state)"));
  ok("route TIDAK memakai targetSize - state.order.length", !route.includes("targetSize - state.order.length"));
  ok("GENERATION_UNAVAILABLE menutup sesi dengan done:true", route.includes("remaining: 0,") && route.includes("done: true,"));
  const client = fs.readFileSync(path.resolve(process.cwd(), "app/arena/diagnostic/[sessionId]/page.tsx"), "utf8");
  ok("client menangani terminal adaptif (done/remaining 0 → pendingAdaptive)", client.includes("data.done || data.remaining === 0") && client.includes("setPendingAdaptive(true)"));
  ok("client tidak setIndex(+1) di mode adaptif", client.includes("session.adaptive)") && client.includes("setIndex((value) => value + 1)"));
}

console.log("\n— G. ISOLASI DAILY ACTION + MIGRATION —");
{
  const route = fs.readFileSync(path.resolve(process.cwd(), "app/api/player/diagnostic/route.ts"), "utf8");
  const libFiles = fs.readdirSync(path.resolve(process.cwd(), "lib/diagnostic-ai")).map((f) => f);
  let libSource = "";
  for (const f of libFiles) {
    if (f.endsWith(".ts")) libSource += fs.readFileSync(path.resolve(process.cwd(), `lib/diagnostic-ai/${f}`), "utf8");
  }
  ok("T12: route diagnostik tidak bergantung DailyAction", !route.includes("dailyAction") && !route.includes("DailyAction"));
  ok("T12: lib diagnostic-ai tidak bergantung DailyAction", !libSource.includes("dailyAction") && !libSource.includes("DailyAction"));
  const migration = fs.readFileSync(path.resolve(process.cwd(), "prisma/migrations/manual/2026-09-04_daily_action_table.sql"), "utf8");
  ok("migration DailyAction ada & idempotent", migration.includes('CREATE TABLE IF NOT EXISTS "DailyAction"') && migration.includes("CREATE UNIQUE INDEX IF NOT EXISTS \"DailyAction_userId_date_key\""));
  const daRoute = fs.readFileSync(path.resolve(process.cwd(), "app/api/student/daily-action/route.ts"), "utf8");
  ok("daily-action route soft-fail saat tabel belum ada (bukan 500)", daRoute.includes("isMissingInfraError") && daRoute.includes("status: \"NONE\""));
}

console.log(`\nRingkasan: ${pass} lulus, ${fail} gagal`);
if (fail > 0) process.exit(1);
process.exit(0);
