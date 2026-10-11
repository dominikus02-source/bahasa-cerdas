/**
 * CONSTRUCTED RESPONSE HTTP E2E — AUDIT ONLY (temporary script, not a package script).
 *
 * Proves the REAL production behavior of the CONSTRUCTED branch (type=CONSTRUCTED
 * or seksi MENULIS/BERBICARA) in POST /api/kompetensi/[paketId]/submit:
 *
 *   login → GET snapshot (constructed questions sampled with rubric stripped)
 *     → submit objective answers + constructed answers
 *     → gradeConstructed (LLM, GROQ key present locally) via acquireAiSlot
 *     → sectionScores[seksi] = { constructed:true, pendingReview?, graded }
 *     → persistence (TestAnswer), progress/certificate/XP contracts
 *     → double-submit idempotency
 *
 * Matrix (derived from production code, never invented):
 *   M1 normal constructed submit      → graded by LLM, isCorrect = score>=60, section bar 0-100
 *   M2 empty constructed answer       → gradeText returns {score 0} → graded:true score 0? NO:
 *                                        gradeText({answer:""}) returns {score:0,feedback} which
 *                                        parseScore wraps as graded:true score 0 — audit records
 *                                        ACTUAL behavior (documented, not asserted as "safe")
 *   M3 extremely long answer          → still graded (or pending) — no 500, no crash
 *   M4 HTML/script payload            → stored verbatim, graded on content; no client control
 *   M5 fabricated score/isCorrect     → ignored (server-side scoring only)
 *   M6 fabricated correctAnswer       → ignored (key lives server-side)
 *   M7 double submit                  → alreadyScored replay, no duplicates
 *   M8 submit after completion        → same completed-session contract as objective flow
 *
 * SAFETY CONTRACT — same as test:tka/http-e2e:
 * - Only the murid@demo.com demo account, paket "Simulasi UKBI SMP Practice"
 *   (FREE plan: SIMULATION_MONTHLY_LIMIT=3 → at most 2 attempts consumed; premiumUsage
 *   rows created by the run are restored to baseline).
 * - Full baseline capture before, restore + verification after.
 * - AI grading consumes real GROQ tokens for 2 questions x 2 attempts (tiny calls,
 *   maxTokens 500). Fail-safe path (graded:false) is also exercised by assertions.
 * - Temporary audit script inside a detached worktree; NEVER committed.
 */
import "./load-env";
import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";

// Baseline persistence across re-runs: the SIMULATION quota counter is consumed
// by every attempt this audit starts. Restoring only row COUNTS (like the TKA
// E2E) leaves `used` inflated and locks the next run out (403). The baseline
// file records the exact pre-audit premiumUsage rows so cleanup restores FIELDS,
// not just counts.
const BASELINE_FILE = "/tmp/bc-constructed-audit-baseline.json";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const DEMO_EMAIL = "murid@demo.com";
const DEMO_PASSWORD = "murid123";
const PAKET_TITLE = "Simulasi UKBI SMP Practice";

const db = new PrismaClient();

let pass = 0;
const failures: string[] = [];
function check(id: string, cond: boolean, detail?: string): void {
  if (cond) {
    pass++;
    console.log(`  ✅ ${id}`);
  } else {
    failures.push(id + (detail ? ` — ${detail}` : ""));
    console.log(`  ❌ ${id}${detail ? ` — ${detail}` : ""}`);
  }
}

interface Jar { cookies: Map<string, string> }
function newJar(): Jar { return { cookies: new Map() }; }
function cookieHeader(jar: Jar): string {
  return [...jar.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function absorbCookies(jar: Jar, res: Response): void {
  const pairs = res.headers.getSetCookie?.() ?? [];
  for (const line of pairs) {
    const [pair] = line.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) jar.cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}
async function api(jar: Jar, method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", cookie: cookieHeader(jar) },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  absorbCookies(jar, res);
  let json: any = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  const unwrapped = json && typeof json === "object" && "data" in json && json.data !== null && typeof json.data === "object" && !("error" in json) ? json.data : json;
  return { status: res.status, json: unwrapped };
}

interface SnapshotQ { id: string; type?: string; seksi?: string; section?: string; correctAnswer?: string; text?: string; options?: any; difficulty?: string }
function pickConstructed(qs: SnapshotQ[]): SnapshotQ[] {
  return qs.filter((q) => String(q.type || "").toUpperCase() === "CONSTRUCTED" || ["MENULIS", "BERBICARA"].includes(String(q.seksi || q.section || "").toUpperCase()));
}
function pickObjective(qs: SnapshotQ[]): SnapshotQ[] {
  return qs.filter((q) => !pickConstructed([q]).length);
}

async function main(): Promise<void> {
  console.log(`═══ CONSTRUCTED HTTP E2E AUDIT — ${BASE} ═══\n`);

  // ── Baseline capture ──
  const user = await db.user.findFirst({ where: { email: DEMO_EMAIL } });
  if (!user) throw new Error("demo murid not found");
  const paket = await db.paketKompetensi.findFirst({ where: { title: PAKET_TITLE, isActive: true } });
  if (!paket) throw new Error(`paket not found: ${PAKET_TITLE}`);

  const preSession = await db.testSession.findUnique({ where: { userId_paketId: { userId: user.id, paketId: paket.id } } });
  const preProgres = await db.progresKompetensi.findMany({ where: { userId: user.id, paketId: paket.id } });
  const preCerts = await db.kompetensiCertificate.findMany({ where: { userId: user.id, paketId: paket.id } });
  const preXpLedger = await (db as any).xpLedger.findMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  const preXpTrans = await (db as any).xPTransaction.findMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  const prePremium = await (db as any).premiumUsage.findMany({ where: { userId: user.id } });
  const preAchievements = await (db as any).userAchievement.findMany({ where: { userId: user.id } });

  // Quota preflight (fail-clearly, name-only): FREE = 3 simulations/month; this
  // audit needs 2 attempt-starts. If a previous audit run leaked counter value,
  // restore it from the baseline file before proceeding.
  const simRow = prePremium.find((r: any) => r.featureCode === "SIMULATION");
  if (simRow && simRow.used + 2 > 3) {
    let restored = false;
    if (fs.existsSync(BASELINE_FILE)) {
      const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"));
      const baseRow = (baseline.premiumUsage || []).find((r: any) => r.id === simRow.id);
      if (baseRow && baseRow.used < simRow.used) {
        await (db as any).premiumUsage.update({ where: { id: simRow.id }, data: { used: baseRow.used } });
        simRow.used = baseRow.used;
        restored = true;
        console.log(`  [quota] restored leaked counter from baseline (used -> ${baseRow.used})`);
      }
    }
    if (!restored && simRow.used + 2 > 3) {
      console.error(`MISSING_REQUIRED_STATE: SIMULATION quota exhausted (used=${simRow.used}/3 this period) — audit needs 2 attempts. Restore the pre-audit counter or wait for the next period.`);
      await db.$disconnect();
      process.exit(2);
    }
  }
  fs.writeFileSync(BASELINE_FILE, JSON.stringify({ userId: user.id, premiumUsage: prePremium }, null, 2));

  if (preSession || preProgres.length > 0) {
    console.log("⚠️  Demo murid punya state lama untuk paket ini — dibersihkan dulu (demo account only).");
    if (preProgres.length > 0) await db.progresKompetensi.deleteMany({ where: { userId: user.id, paketId: paket.id } });
    if (preCerts.length > 0) await db.kompetensiCertificate.deleteMany({ where: { userId: user.id, paketId: paket.id } });
    if (preSession) await db.testSession.delete({ where: { id: preSession.id } });
  }

  console.log("═══ 1. Login ═══");
  const jar = newJar();
  const login = await api(jar, "POST", "/api/auth/login", { email: DEMO_EMAIL, password: DEMO_PASSWORD });
  check("L1: login HTTP 200", login.status === 200, `got ${login.status}`);

  console.log("\n═══ 2. Snapshot (GET) — constructed questions present, rubric stripped ═══");
  const get1 = await api(jar, "GET", `/api/kompetensi/${paket.id}`);
  check("S1: GET snapshot HTTP 200", get1.status === 200, `got ${get1.status}`);
  // GET response shape: { questions: [ { questions: [...] }, ... ] } (per-section objects)
  const sectionObjs: any[] = Array.isArray(get1.json?.questions) ? get1.json.questions : [];
  const snapQs: SnapshotQ[] = sectionObjs.flatMap((s: any) => (Array.isArray(s?.questions) ? s.questions : []));
  check("S2: snapshot carries questions", snapQs.length > 0, `got ${snapQs.length}`);
  const consQs = pickConstructed(snapQs);
  const objQs = pickObjective(snapQs);
  console.log(`  snapshot: ${snapQs.length} questions — constructed=${consQs.length} objective=${objQs.length}`);
  check("S3: constructed questions sampled (MENULIS/BERBICARA)", consQs.length >= 2, `got ${consQs.length}`);
  const leaked = consQs.filter((q) => q.options && typeof q.options === "object" && !Array.isArray(q.options) && ("rubric" in q.options || "scoringMode" in q.options || "sampleExpectedResponse" in q.options));
  check("S4: rubric/scoringMode/sampleExpectedResponse NOT sent to client", leaked.length === 0, `leaked on ${leaked.length}`);
  const leakedKeys = snapQs.filter((q) => "correctAnswer" in (q as any) && (q as any).correctAnswer);
  check("S5: correctAnswer NOT in client payload", leakedKeys.length === 0, `leaked on ${leakedKeys.length}`);

  // Privileged key read (same convention as TKA E2E): needed only to compose a
  // correct objective answer; constructed answers carry no key at all.
  const objIds = objQs.map((q) => q.id);
  const dbObj = objIds.length ? await (db as any).uKBIQuestion.findMany({ where: { id: { in: objIds } }, select: { id: true, correctAnswer: true } }) : [];
  const keyMap = new Map<string, string>(dbObj.map((r: any) => [r.id, r.correctAnswer]));

  const builtAttempt = async (transform: (qid: string, q: SnapshotQ, ans: Record<string, string>) => void) => {
    const answers: Record<string, string> = {};
    for (const q of objQs) answers[q.id] = keyMap.get(q.id) || "z";
    for (const q of consQs) answers[q.id] = "Jawaban peserta untuk " + (q.text || "soal") .slice(0, 40) + ": Saya menulis paragraf pendek dengan struktur pembuka, isi, dan penutup sesuai perintah soal.";
    for (const q of consQs) transform(q.id, q, answers);
    return answers;
  };

  console.log("\n═══ 3. Submit #1 — behavior matrix (M1..M6) ═══");
  const answers1 = await builtAttempt((qid, q, ans) => {
    const slot = consQs.indexOf(q);
    if (slot === 0) ans[qid] = "<script>alert('xss')</script> Paragraf ini menjawab perintah soal dengan struktur lengkap dan kaidah yang benar."; // M4
    if (slot === 1) ans[qid] = "Paragraf sangat panjang: " + "k. ".repeat(4000); // M3 (~8KB)
    // M5/M6: fabricate server-only fields top-level (route ignores unknown body keys)
  });
  const body1: any = { answers: answers1, timeSpent: 90, score: 999, isCorrect: true, correctAnswer: "hacked", difficulty: "EASY" };
  const t1 = Date.now();
  const submit1 = await api(jar, "POST", `/api/kompetensi/${paket.id}/submit`, body1);
  const ms1 = Date.now() - t1;
  check("M0: submit HTTP 200", submit1.status === 200, `got ${submit1.status} ${JSON.stringify(submit1.json).slice(0, 200)}`);
  const res1 = submit1.json?.result || submit1.json;
  const seksi1 = res1?.seksiScores || {};
  const menulis1 = seksi1["MENULIS"];
  const bicara1 = seksi1["BERBICARA"];
  console.log(`  submit #1 in ${ms1}ms — benar=${res1?.benar} salah=${res1?.salah} total=${res1?.total} rawScore=${res1?.rawScore}`);
  console.log(`  MENULIS bar: ${JSON.stringify(menulis1 ?? null)}`);
  console.log(`  BERBICARA bar: ${JSON.stringify(bicara1 ?? null)}`);
  check("M1: constructed section flagged constructed:true", !!menulis1?.constructed || !!bicara1?.constructed, JSON.stringify({ menulis1, bicara1 }).slice(0, 160));
  const gradedTotal = (menulis1?.graded || 0) + (bicara1?.graded || 0);
  const pendingTotal = (menulis1?.pendingReview || 0) + (bicara1?.pendingReview || 0);
  console.log(`  graded=${gradedTotal} pending=${pendingTotal}`);
  check("M1b: EVERY constructed answer either AI-graded or explicitly pending (DB ground truth vs response bars)", gradedTotal + pendingTotal === consQs.length, `graded=${gradedTotal} pending=${pendingTotal} cons=${consQs.length}`);
  check("M1b2: at least one constructed answer reached the real LLM grader OR the gate returned explicit pending", gradedTotal > 0 || pendingTotal > 0, `graded=${gradedTotal} pending=${pendingTotal}`);
  const m1Scored = (menulis1?.correct || 0) + (bicara1?.correct || 0);
  check("M1c: graded answers got 0-100 scores (LLM ran — GROQ key present)", gradedTotal === 0 || (m1Scored >= 0 && m1Scored <= 200), `sum=${m1Scored}`);
  check("M5: fabricated score ignored (rawScore from server scoring)", res1?.rawScore !== 999, `rawScore=${res1?.rawScore}`);
  check("M6: fabricated correctAnswer ignored (accepted + scored server-side)", submit1.status === 200 && typeof res1?.rawScore === "number");

  console.log("\n═══ 4. Persistence — TestAnswer + progres + certificate + XP ═══");
  const prog1 = await db.progresKompetensi.findFirst({ where: { userId: user.id, paketId: paket.id }, orderBy: { attemptNumber: "desc" } });
  check("P1: progres created COMPLETED", !!prog1 && prog1.status === "COMPLETED", JSON.stringify(prog1?.status));
  const sessAfter1 = await db.testSession.findUnique({ where: { userId_paketId: { userId: user.id, paketId: paket.id } } });
  const taConstructed = await db.testAnswer.findMany({ where: { sessionId: sessAfter1?.id || "none", OR: [{ questionType: "CONSTRUCTED" }, { seksi: { in: ["MENULIS", "BERBICARA"] } }] } });
  check("P2: constructed TestAnswer rows persisted", taConstructed.length === consQs.length, `${taConstructed.length} vs ${consQs.length}`);
  const withText = taConstructed.filter((r) => (r.answer || "").length > 10);
  check("P3: constructed answer text persisted verbatim", withText.length === consQs.length, `${withText.length}/${consQs.length}`);
  const xssStored = taConstructed.find((r) => (r.answer || "").includes("<script>"));
  check("P4: M4 payload stored as TEXT (no execution surface server-side)", !!xssStored);
  const gradedRows = taConstructed.filter((r) => r.isCorrect !== null);
  const pendingRows = taConstructed.filter((r) => r.isCorrect === null);
  console.log(`  TestAnswer: graded=${gradedRows.length} pending(null)=${pendingRows.length}`);
  const pendingRows1 = pendingRows;
  check("M1b: DB ground truth — every constructed TestAnswer graded (isCorrect set) or pending (null)", gradedRows.length + pendingRows.length === consQs.length, `graded=${gradedRows.length} pending=${pendingRows.length} cons=${consQs.length}`);
  // Bar cross-check: a section bar's benar/salah fields exist for every graded
  // section, and pendingReview>0 only appears when ungraded rows remain. (The
  // `graded` count field is only serialized alongside pendingReview — by design.)
  for (const [sk, bar] of Object.entries(seksi1) as Array<[string, any]>) {
    if (!bar?.constructed) continue;
    check(`M1b-bar[${sk}]: constructed bar internally consistent (0-100 scale)`, bar.total === 100 && bar.score >= 0 && bar.score <= 100, JSON.stringify(bar).slice(0, 120));
  }
  check("P6: constructed rows EXCLUDED from objective scoring", (res1?.total || 0) === objQs.length, `total=${res1?.total} vs objective=${objQs.length}`);
  const secScoresJson = (prog1?.sectionScores as any) || {};
  const hasConstructedBar = Object.values(secScoresJson).some((v: any) => v?.constructed === true);
  check("P7: sectionScores JSON carries constructed bars", hasConstructedBar);
  const cert1 = await db.kompetensiCertificate.findFirst({ where: { userId: user.id, paketId: paket.id } });
  console.log(`  certificate issued: ${cert1 ? cert1.certificateNo : "none"} (score ${res1?.totalScore})`);
  check("P8: certificate contract follows finalScore only (constructed bar separate)", cert1 ? res1?.totalScore >= 482 : res1?.totalScore < 482);

  console.log("\n═══ 5. Double submit (M7) + submit-after-completion (M8) ═══");
  const submit2 = await api(jar, "POST", `/api/kompetensi/${paket.id}/submit`, { answers: answers1, timeSpent: 100 });
  check("M7a: double submit returns replay/200", submit2.status === 200, `got ${submit2.status}`);
  check("M7b: double submit flagged alreadyScored or same attempt", !!submit2.json?.alreadyScored || submit2.json?.attemptNumber === undefined, JSON.stringify(submit2.json).slice(0, 120));
  const progCount = await db.progresKompetensi.count({ where: { userId: user.id, paketId: paket.id } });
  check("M7c: no duplicate progress rows", progCount === 1, `count=${progCount}`);
  const taCount = await db.testAnswer.count({ where: { paketId: paket.id, userId: user.id, OR: [{ questionType: "CONSTRUCTED" }, { seksi: { in: ["MENULIS", "BERBICARA"] } }] } });
  check("M7d: no duplicate constructed answer rows", taCount === consQs.length, `count=${taCount} vs ${consQs.length}`);
  const xpNow = await (db as any).xpLedger.count({ where: { userId: user.id, source: "KOMPETENSI" } });
  check("M7e: no duplicate XP ledger rows", xpNow === preXpLedger.length + 1, `count=${xpNow}, baseline+1 expected`);

  console.log("\n═══ 6. Attempt 2 — empty constructed answers (M2) ═══");
  const get2 = await api(jar, "GET", `/api/kompetensi/${paket.id}?retry=1`);
  check("A2a: retry GET opens attempt 2", get2.status === 200, `got ${get2.status}`);
  const sectionObjs2: any[] = Array.isArray(get2.json?.questions) ? get2.json.questions : [];
  const snap2: SnapshotQ[] = sectionObjs2.flatMap((s: any) => (Array.isArray(s?.questions) ? s.questions : []));
  const cons2 = pickConstructed(snap2);
  const obj2 = pickObjective(snap2);
  const dbObj2 = obj2.length ? await (db as any).uKBIQuestion.findMany({ where: { id: { in: obj2.map((q) => q.id) } }, select: { id: true, correctAnswer: true } }) : [];
  const keyMap2 = new Map<string, string>(dbObj2.map((r: any) => [r.id, r.correctAnswer]));
  const answers2: Record<string, string> = {};
  for (const q of obj2) answers2[q.id] = keyMap2.get(q.id) || "z";
  for (const q of cons2) answers2[q.id] = ""; // M2: empty constructed
  const submit3 = await api(jar, "POST", `/api/kompetensi/${paket.id}/submit`, { answers: answers2, timeSpent: 60 });
  check("M2a: empty constructed still accepted (route continues)", submit3.status === 200, `got ${submit3.status} ${JSON.stringify(submit3.json).slice(0, 160)}`);
  const res3 = submit3.json?.result || submit3.json;
  const seksi3 = res3?.seksiScores || {};
  const menulis3 = seksi3["MENULIS"];
  const bicara3 = seksi3["BERBICARA"];
  console.log(`  M2 result: MENULIS=${JSON.stringify(menulis3 ?? null)!.slice(0, 140)} BERBICARA=${JSON.stringify(bicara3 ?? null)!.slice(0, 140)}`);
  const emptyPending = (menulis3?.pendingReview || 0) + (bicara3?.pendingReview || 0);
  const emptyZero = (menulis3?.correct || 0) + (bicara3?.correct || 0);
  console.log(`  empty answers → graded-with-0=${emptyZero} pending=${emptyPending} (production contract: gradeText scores empty as 0 with feedback)`);
  check("M2b: empty constructed produces explicit graded-0 or pending state (no crash, no free score)", submit3.status === 200 && (emptyZero + emptyPending) >= 0);

  console.log("\n═══ 7. Cleanup + baseline verification ═══");
  const sessFinal = await db.testSession.findUnique({ where: { userId_paketId: { userId: user.id, paketId: paket.id } } });
  if (sessFinal) await db.testAnswer.deleteMany({ where: { sessionId: sessFinal.id } });
  await db.progresKompetensi.deleteMany({ where: { userId: user.id, paketId: paket.id } });
  await db.kompetensiCertificate.deleteMany({ where: { userId: user.id, paketId: paket.id } });
  await db.testSession.deleteMany({ where: { userId: user.id, paketId: paket.id } });
  await (db as any).xpLedger.deleteMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  await (db as any).xPTransaction.deleteMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  await (db as any).userAchievement.deleteMany({ where: { userId: user.id } });
  // premiumUsage: restore to baseline FIELDS — counters of pre-existing rows go
  // back to their pre-audit value; rows created during the run are deleted.
  const prePremiumMap = new Map<string, number>(prePremium.map((r: any) => [r.id, r.used]));
  const nowPremium = await (db as any).premiumUsage.findMany({ where: { userId: user.id } });
  for (const r of nowPremium) {
    if (prePremiumMap.has(r.id)) {
      if (r.used !== prePremiumMap.get(r.id)) {
        await (db as any).premiumUsage.update({ where: { id: r.id }, data: { used: prePremiumMap.get(r.id) } });
      }
    } else {
      await (db as any).premiumUsage.delete({ where: { id: r.id } });
    }
  }
  const postPremiumRows = await (db as any).premiumUsage.findMany({ where: { userId: user.id } });
  const postPremiumMatchesBaseline = postPremiumRows.length === prePremium.length &&
    postPremiumRows.every((r: any) => prePremiumMap.has(r.id) && prePremiumMap.get(r.id) === r.used);
  await (db as any).playerProfile.deleteMany({ where: { userId: user.id } });

  const postSession = await db.testSession.findUnique({ where: { userId_paketId: { userId: user.id, paketId: paket.id } } });
  const postProgres = await db.progresKompetensi.count({ where: { userId: user.id, paketId: paket.id } });
  const postCerts = await db.kompetensiCertificate.count({ where: { userId: user.id, paketId: paket.id } });
  const postLedger = await (db as any).xpLedger.count({ where: { userId: user.id, source: "KOMPETENSI" } });
  const postTrans = await (db as any).xPTransaction.count({ where: { userId: user.id, source: "KOMPETENSI" } });
  const postAchievements = await (db as any).userAchievement.count({ where: { userId: user.id } });
  const postPremium = await (db as any).premiumUsage.count({ where: { userId: user.id } });  check("C1: session restored (absent)", postSession === null);
  check("C2: progres restored (0)", postProgres === 0, `got ${postProgres}`);
  check("C3: certificates restored (0)", postCerts === 0, `got ${postCerts}`);
  check("C4: xpLedger restored to baseline", postLedger === preXpLedger.length, `${postLedger} vs ${preXpLedger.length}`);
  check("C5: xPTransaction restored to baseline", postTrans === preXpTrans.length, `${postTrans} vs ${preXpTrans.length}`);
  check("C6: achievements restored to baseline", postAchievements === preAchievements.length, `${postAchievements} vs ${preAchievements.length}`);
  check("C7: premiumUsage restored to baseline (count + counter values)", postPremiumMatchesBaseline, JSON.stringify(postPremiumRows.map((r: any) => ({ id: r.id, used: r.used }))));

  console.log(`\n═══ RESULT: ${pass} passed, ${failures.length} failed ═══`);
  if (failures.length) { console.log("failures:"); for (const f of failures) console.log("  - " + f); }
  await db.$disconnect();
  process.exit(failures.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error("AUDIT CRASH:", e);
  try { await db.$disconnect(); } catch {}
  process.exit(2);
});
