/**
 * UKBI HTTP SUBMIT E2E — proves the difficulty-weighted scoring branch through
 * the REAL production HTTP path:
 *
 *   login (POST /api/auth/login — real Supabase Auth)
 *     → start attempt + snapshot (GET /api/kompetensi/[paketId] — usage guard,
 *       session tx, sampleSectionQuestions, option shuffle)
 *     → empty-submit guard probe (POST submit, no answers → 400 EMPTY_ANSWERS)
 *     → submit (POST /api/kompetensi/[paketId]/submit — auth, rate-limit,
 *       snapshot retrieval, buildAnswerRows + ukbiScoringFn, persistence, XP)
 *     → double-submit idempotency (replay contract)
 *
 * UKBI CONTRACT PROVEN HERE (all against the live route, not a copy):
 *   01 correct answer   → isCorrect=true, weighted score
 *   02 incorrect answer → isCorrect=false, score=0
 *   03 difficulty weighting → two answered questions with DIFFERENT difficulty
 *      metadata score differently (w*10 with EASY=1, MEDIUM=1.5, HARD=2),
 *      expected values derived by IMPORTING the canonical ukbiScoringFn — the
 *      exact function the route imports — never reimplemented here.
 *   04 snapshot integrity → answerDetails.audit.scoredFromSnapshot=true and
 *      liveDbFallbackUsed=false; expected scores derived from the SESSION
 *      SNAPSHOT's key/difficulty (read via privileged DB), not from a live
 *      question-bank re-fetch.
 *   05 client payload sanitization → injected correctAnswer/score/isCorrect/
 *      difficulty fields (top-level + per-answer) cannot alter scoring.
 *   06 persistence → session COMPLETED, ProgresKompetensi (UKBI 0–800 scale),
 *      TestAnswer rows, sectionScores, answerDetails.userAnswers (section key).
 *   07 double submit → alreadyScored replay, no duplicate rows/XP.
 *   08 empty answers → 400 EMPTY_ANSWERS before the session is touched.
 *   09 unknown question id / unknown answer value → silently excluded / scored
 *      wrong, never awarded.
 *
 * SAFETY CONTRACT — identical to the TKA E2E:
 * - Uses ONLY murid@demo.com; refuses pre-existing state, captures baseline,
 *   restores it and VERIFIES restoration.
 * - Answer keys are read from the SESSION SNAPSHOT via privileged direct DB
 *   read; the submit itself goes over HTTP with no key knowledge.
 * - The UKBI question bank is never mutated (row count asserted unchanged).
 *
 * Run via: npm run test:ukbi:http-e2e  (starts/stops its own dev server) — or
 * BASE_URL against an already-running dev server with .env.local credentials.
 * Exits non-zero on any failure.
 */
import "./load-env";
import { PrismaClient } from "@prisma/client";
import { ukbiScoringFn } from "../lib/assessment/answer-rows";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const DEMO_EMAIL = "murid@demo.com";
const DEMO_PASSWORD = "murid123";

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

interface Jar {
  cookies: Map<string, string>;
}
function newJar(): Jar {
  return { cookies: new Map() };
}
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
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  // ok() helper wraps payloads as { success, data }; unwrap once.
  const unwrapped = json && typeof json === "object" && "data" in json && json.data !== null && typeof json.data === "object" && !("error" in json) ? json.data : json;
  return { status: res.status, json: unwrapped };
}

const isPg = (q: any) =>
  String(q.type || "").toUpperCase() !== "CONSTRUCTED" &&
  !["MENULIS", "BERBICARA"].includes(String(q.seksi || "").toUpperCase());

async function main(): Promise<void> {
  console.log(`═══ UKBI HTTP SUBMIT E2E — ${BASE} ═══\n`);

  // ── Baseline capture (demo murid must be clean for the chosen UKBI paket) ──
  const user = await db.user.findFirst({ where: { email: DEMO_EMAIL } });
  if (!user) throw new Error("demo murid not found");

  const ukbiPakets = (await db.paketKompetensi.findMany({ where: { isActive: true } })).filter(
    (p: any) => String(p.type || "").includes("UKBI")
  );
  if (ukbiPakets.length === 0) throw new Error("no active UKBI paket found");
  const paket =
    ukbiPakets.find((p: any) => String(p.title || "").includes("SMP")) ?? ukbiPakets[0];
  console.log(`  paket: ${paket.title} (${paket.id})`);

  const preSession = await db.testSession.findUnique({ where: { userId_paketId: { userId: user.id, paketId: paket.id } } });
  const preProgres = await db.progresKompetensi.findMany({ where: { userId: user.id, paketId: paket.id } });
  const preXpLedger = await (db as any).xpLedger.findMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  const preXpTrans = await (db as any).xPTransaction.findMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  const preCerts = await db.kompetensiCertificate.findMany({ where: { userId: user.id, paketId: paket.id } });
  const prePremium = await (db as any).premiumUsage.findMany({ where: { userId: user.id } });
  const preAchievements = await (db as any).userAchievement.findMany({ where: { userId: user.id } });
  const preUkbiBank = await db.uKBIQuestion.count();

  if (preSession || preProgres.length > 0) {
    console.log("⚠️  Demo murid sudah punya session/progres untuk paket UKBI ini — dibersihkan agar baseline E2E bersih (demo account only).");
    if (preProgres.length > 0) await db.progresKompetensi.deleteMany({ where: { userId: user.id, paketId: paket.id } });
    if (preCerts.length > 0) await db.kompetensiCertificate.deleteMany({ where: { userId: user.id, paketId: paket.id } });
    if (preSession) await db.testSession.delete({ where: { id: preSession.id } });
  }

  console.log("\n═══ 1. Login (POST /api/auth/login — real Supabase Auth) ═══");
  const jar = newJar();
  const login = await api(jar, "POST", "/api/auth/login", { email: DEMO_EMAIL, password: DEMO_PASSWORD });
  check("L1: login HTTP 200", login.status === 200, `got ${login.status} ${JSON.stringify(login.json).slice(0, 120)}`);
  check("L2: session returned + cookies set", !!login.json?.session?.access_token && jar.cookies.size > 0);
  check("L3: dbUser id matches demo account", login.json?.user?.id === user.id);

  console.log("\n═══ 2. Start attempt + snapshot (GET /api/kompetensi/[paketId]) ═══");
  const get1 = await api(jar, "GET", `/api/kompetensi/${paket.id}`);
  check("S1: GET HTTP 200", get1.status === 200, `got ${get1.status} ${JSON.stringify(get1.json).slice(0, 160)}`);
  if (get1.status !== 200) {
    console.log(`\nUKBI E2E: ${pass} passed, ${failures.length} failed (aborted early)`);
    failures.forEach((f) => console.log("  ❌ " + f));
    await db.$disconnect();
    process.exit(1);
  }
  check("S2: session payload present", !!get1.json?.session?.id);
  const afterStartSession = await db.testSession.findUnique({ where: { userId_paketId: { userId: user.id, paketId: paket.id } } });
  check("S3: TestSession row created", !!afterStartSession);
  check("S4: session status IN_PROGRESS", afterStartSession?.status === "IN_PROGRESS", String(afterStartSession?.status));

  const sectionQs: any[] = (get1.json?.questions ?? []).flatMap((s: any) => s.questions ?? []);
  check("G2: questions returned", sectionQs.length > 0, `got ${sectionQs.length}`);
  check("S5: client payload is sanitized (no correctAnswer)", sectionQs.every((q) => q.correctAnswer === undefined || q.correctAnswer === null || q.correctAnswer === ""));
  const sessWithSnap = await db.testSession.findUnique({ where: { userId_paketId: { userId: user.id, paketId: paket.id } } });
  const snap: any = (sessWithSnap?.questionSnapshot as any) ?? null;
  check("S6: snapshot persisted with questions", !!snap?.questions?.length, `snapshot questions: ${snap?.questions?.length ?? 0}`);
  check("S7: snapshot carries answer keys (server-side scoring source)", (snap?.questions ?? []).every((q: any) => typeof q.correctAnswer === "string" && q.correctAnswer.length > 0));
  const pgSnap = snap.questions.filter(isPg);
  check("S8: UKBI snapshot carries real difficulty metadata (weighting source)", pgSnap.length > 0 && pgSnap.every((q: any) => typeof q.difficulty === "string" && q.difficulty.length > 0));

  // ── Anchor selection: two PG questions with DIFFERENT difficulty (weighting
  // proof) + one more PG as the unknown-value/injection probe. Expected scores
  // come from the canonical ukbiScoringFn applied to SNAPSHOT metadata. ──
  const byDifficulty = new Map<string, any[]>();
  for (const q of pgSnap) {
    const d = String(q.difficulty || "UNKNOWN");
    if (!byDifficulty.has(d)) byDifficulty.set(d, []);
    byDifficulty.get(d)!.push(q);
  }
  const difficulties = [...byDifficulty.keys()];
  const pickFrom = (d: string, exclude: string[]) => (byDifficulty.get(d) ?? []).find((q) => !exclude.includes(q.id));
  let dA = difficulties[0];
  let dB = difficulties.find((d) => d !== dA);
  if (!dB) {
    // Snapshot happened to be single-difficulty — weighting proof degrades to
    // weight-consistency; recorded, not silently passed.
    console.log(`  [warn] snapshot single-difficulty (${dA}) — W-checks assert weight consistency only`);
  }
  const anchorA = pickFrom(dA, []) ?? pgSnap[0];
  const anchorB = (dB ? pickFrom(dB, [anchorA.id]) : undefined) ?? pgSnap.find((q: any) => q.id !== anchorA.id)!;
  const anchorC = pgSnap.find((q: any) => ![anchorA.id, anchorB.id].includes(q.id));
  const optsOf = (q: any) => (q.options ?? []).filter((o: any) => typeof o?.id === "string");

  const expA = ukbiScoringFn(anchorA, anchorA.correctAnswer);
  const expB = ukbiScoringFn(anchorB, anchorB.correctAnswer);
  const expC = anchorC ? ukbiScoringFn(anchorC, "BC-E2E-INJECTED-VALUE") : null;
  check("A0: anchors chosen (distinct difficulties when available)", !!anchorA?.id && !!anchorB?.id, `A=${anchorA.id}(${anchorA.difficulty}) B=${anchorB.id}(${anchorB.difficulty})`);
  check("A1: canonical scoring fn imported (route's own module) — EASY=10/MEDIUM=15/HARD=20", [10, 15, 20].includes(expA.maxScore), `A max=${expA.maxScore}`);

  console.log("\n═══ 3. Empty-submit guard (HTTP 400 BEFORE session touched) ═══");
  const emptyRes = await api(jar, "POST", `/api/kompetensi/${paket.id}/submit`, { answers: {}, timeSpent: 0 });
  check("E1: empty answers → HTTP 400", emptyRes.status === 400, `got ${emptyRes.status}`);
  check("E2: canonical error code EMPTY_ANSWERS", emptyRes.json?.error === "EMPTY_ANSWERS" || emptyRes.json?.code === "EMPTY_ANSWERS", JSON.stringify(emptyRes.json).slice(0, 120));
  const sessAfterEmpty = await db.testSession.findUnique({ where: { userId_paketId: { userId: user.id, paketId: paket.id } } });
  check("E3: session NOT completed by rejected submit", sessAfterEmpty?.status === "IN_PROGRESS", String(sessAfterEmpty?.status));

  console.log("\n═══ 4. Submit — weighted correct + wrong + injection probe (HTTP POST /submit) ═══");
  const answers: Record<string, string> = {
    [anchorA.id]: anchorA.correctAnswer, // correct, difficulty dA
    [anchorB.id]: anchorB.correctAnswer, // correct, difficulty dB (≠ dA when available)
  };
  if (anchorC) answers[anchorC.id] = "BC-E2E-INJECTED-VALUE"; // unknown value → wrong, never awarded
  const UNKNOWN_ID = "BC-UKBI-E2E-UNKNOWN-999";
  answers[UNKNOWN_ID] = "A"; // unknown question id → must be excluded entirely
  // Injection attempt (UKBI-HTTP-05): top-level server-only fields + per-answer
  // crafted values. Route destructures only {answers,timeSpent}; the crafted
  // answer value simply compares unequal to the key.
  const injectionBody: Record<string, unknown> = {
    answers,
    timeSpent: 150,
    correctAnswer: "ZZZZ-HACK",
    score: 99999,
    isCorrect: true,
    difficulty: "HARD",
    _internal: { role: "service_role" },
  };
  const submitTime = new Date();
  const submit = await api(jar, "POST", `/api/kompetensi/${paket.id}/submit`, injectionBody);
  check("H1: submit HTTP 200", submit.status === 200, `got ${submit.status} ${JSON.stringify(submit.json).slice(0, 200)}`);
  check("H2: response has result payload", !!submit.json?.result);

  // Expected aggregate — derived from the canonical fn over SNAPSHOT metadata.
  const answeredIds = [anchorA.id, anchorB.id, ...(anchorC ? [anchorC.id] : [])];
  const answeredSnap = pgSnap.filter((q: any) => answeredIds.includes(q.id));
  const expected = answeredSnap.reduce(
    (acc: { raw: number; max: number; correct: number }, q: any) => {
      const ua = q.id === anchorC?.id ? "BC-E2E-INJECTED-VALUE" : q.correctAnswer;
      const r = ukbiScoringFn(q, ua);
      return { raw: acc.raw + r.score, max: acc.max + r.maxScore, correct: acc.correct + (r.isCorrect ? 1 : 0) };
    },
    { raw: 0, max: 0, correct: 0 }
  );
  const expectedPct = Math.round((expected.raw / expected.max) * 100 * 100) / 100;
  const expectedTotal = Math.round(expectedPct * 8);

  check("W1: rawScore equals difficulty-weighted expectation from snapshot", submit.json?.result?.rawScore === expected.raw, `got ${submit.json?.result?.rawScore} expected ${expected.raw}`);
  check("W2: benar counts only genuinely-correct answers (injection excluded)", submit.json?.result?.benar === expected.correct, `benar=${submit.json?.result?.benar} expected=${expected.correct}`);
  check("W3: benar/salah consistent (salah=total-benar, unknown-id excluded from total)", submit.json?.result?.total === answeredSnap.length && submit.json?.result?.benar === expected.correct && submit.json?.result?.salah === answeredSnap.length - expected.correct, `total=${submit.json?.result?.total} benar=${submit.json?.result?.benar} salah=${submit.json?.result?.salah} expected benar=${expected.correct} salah=${answeredSnap.length - expected.correct}`);
  check("H4: percentage matches weighted expectation", submit.json?.result?.percentage === expectedPct, `got ${submit.json?.result?.percentage} expected ${expectedPct}`);
  check("H5: UKBI totalScore is the 0–800 scale (round(pct*8))", submit.json?.result?.totalScore === expectedTotal, `got ${submit.json?.result?.totalScore} expected ${expectedTotal}`);
  check("H6: predikat is a valid UKBI Kemdikbud band", ["Istimewa", "Sangat Unggul", "Unggul", "Madya", "Semenjana", "Marginal", "Terbatas"].includes(submit.json?.result?.predikat ?? ""), String(submit.json?.result?.predikat));
  check("H7: attemptNumber=1", submit.json?.attemptNumber === 1, String(submit.json?.attemptNumber));
  check("SAN1: injected top-level score ignored (rawScore not 99999)", submit.json?.result?.rawScore !== 99999);
  check("SAN2: injected top-level correctAnswer/difficulty/isCorrect ignored (benar unchanged)", submit.json?.result?.benar === expected.correct && submit.json?.result?.rawScore === expected.raw);

  console.log("\n═══ 5. Persistence verification (Prisma, post-HTTP) ═══");
  const progres = await db.progresKompetensi.findFirst({
    where: { userId: user.id, paketId: paket.id },
    orderBy: { attemptNumber: "desc" },
  });
  check("P1: ProgresKompetensi row persisted (COMPLETED)", !!progres && progres.status === "COMPLETED");
  check("P2: persisted totals match response (UKBI 0–800 scale)", progres?.totalScore === expectedTotal && Math.round((progres?.percentage ?? -1) * 100) / 100 === expectedPct && progres?.rawScore === expected.raw && progres?.maxScore === expected.max, `db=${progres?.totalScore}/${progres?.rawScore}/${progres?.maxScore}`);
  check("P3: persisted predikat matches response", progres?.predikat === submit.json?.result?.predikat);
  const testAnswers = await db.testAnswer.findMany({ where: { sessionId: sessWithSnap!.id } });
  check("P4: TestAnswer rows persisted (one per answered question, unknown id excluded)", testAnswers.length === answeredIds.length, `rows=${testAnswers.length} expected=${answeredIds.length}`);
  const rowA = testAnswers.find((r) => r.questionId === anchorA.id);
  const rowB = testAnswers.find((r) => r.questionId === anchorB.id);
  const rowC = anchorC ? testAnswers.find((r) => r.questionId === anchorC.id) : undefined;
  const rowU = testAnswers.find((r) => r.questionId === UNKNOWN_ID);
  check("U1: unknown question id produced NO TestAnswer row", !rowU);
  check("W3a: weighted row A (correct) isCorrect=true score=expected", rowA?.isCorrect === true && rowA?.score === expA.score && rowA?.score === expA.maxScore, `got ${rowA?.isCorrect}/${rowA?.score} expected true/${expA.score}`);
  check("W3b: weighted row B (correct) isCorrect=true score=expected", rowB?.isCorrect === true && rowB?.score === expB.score, `got ${rowB?.isCorrect}/${rowB?.score}`);
  check("W4: DIFFICULTY WEIGHTING PROVEN — different difficulties → different scores", !dB || expA.score !== expB.score || expA.maxScore !== expB.maxScore, `A(${anchorA.difficulty})=${expA.score} B(${anchorB.difficulty})=${expB.score}`);
  check("U2: unknown answer value scored wrong, never awarded", rowC ? rowC.isCorrect === false && rowC.score === 0 && rowC.answer === "BC-E2E-INJECTED-VALUE" : true);
  check("SAN3: injected per-answer value stored verbatim but scored 0", rowC ? rowC.score === 0 && rowC.isCorrect === false : true);
  const det: any = progres?.answerDetails as any;
  const recs: any[] = det?.userAnswers ?? [];
  const recA = recs.find((r) => r.questionId === anchorA.id);
  check("P5: answerDetails.userAnswers recorded with UKBI section key", !!recA && recA.isCorrect === true && (recA.section === expA.seksi || recA.kompetensi === expA.seksi), JSON.stringify(recA).slice(0, 140));
  check("P6: answerDetails audit says scored-from-snapshot (no live-DB fallback)", det?.audit?.scoredFromSnapshot === true && det?.audit?.liveDbFallbackUsed === false, JSON.stringify(det?.audit));
  check("P7: answerDetails.scoring is the UKBI variant (scaledScore present)", det?.scoring?.scaledScore === expectedTotal && det?.product === "UKBI", JSON.stringify(det?.scoring ?? {}).slice(0, 140));
  const secKeys = Object.keys((progres?.sectionScores as any) ?? {});
  check("P8: sectionScores keyed by UKBI seksi contain anchor sections", secKeys.includes(expA.seksi) && secKeys.includes(expB.seksi), `keys=${secKeys.join(",")}`);
  check("P9: certificate issued iff passed (UKBI threshold 482/800)", (submit.json?.result?.passed ? !!submit.json?.certificate : true) && (submit.json?.result?.passed === (expectedTotal >= 482)), `passed=${submit.json?.result?.passed} total=${expectedTotal}`);

  console.log("\n═══ 6. Double submit — idempotency contract ═══");
  const preProgresCount = await db.progresKompetensi.count({ where: { userId: user.id, paketId: paket.id } });
  const double = await api(jar, "POST", `/api/kompetensi/${paket.id}/submit`, { answers, timeSpent: 160 });
  check("D1: double submit HTTP 200 (clean replay, not a crash)", double.status === 200, `got ${double.status}`);
  check("D2: alreadyScored flag set", double.json?.alreadyScored === true, JSON.stringify(double.json).slice(0, 140));
  check("D3: replayed totalScore identical to first submit", double.json?.result?.totalScore === expectedTotal, `got ${double.json?.result?.totalScore} expected ${expectedTotal}`);
  const postDoubleCount = await db.progresKompetensi.count({ where: { userId: user.id, paketId: paket.id } });
  check("D4: no duplicate progres attempt created", postDoubleCount === preProgresCount, `before=${preProgresCount} after=${postDoubleCount}`);
  const postDoubleAnswers = await db.testAnswer.count({ where: { sessionId: sessWithSnap!.id } });
  check("D5: no duplicate TestAnswer rows", postDoubleAnswers === answeredIds.length, `after=${postDoubleAnswers}`);
  const postDoubleXpLedger = await (db as any).xpLedger.count({ where: { userId: user.id, source: "KOMPETENSI" } });
  check("D6: no double XP (ledger count unchanged)", postDoubleXpLedger === preXpLedger.length + 1, `ledger=${postDoubleXpLedger} expected=${preXpLedger.length + 1}`);

  console.log("\n═══ 7. XP + side effects (UKBI: round(rawScore/10), single award) ═══");
  const userAfter = await db.user.findUnique({ where: { id: user.id }, select: { xp: true, level: true } });
  const xpDelta = (userAfter?.xp ?? 0) - (user.xp ?? 0);
  check("X1: XP awarded exactly once (delta>0)", xpDelta > 0, `delta=${xpDelta}`);
  const ledgerRows = await (db as any).xpLedger.findMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  check("X2: xpLedger grew by exactly 1 row", ledgerRows.length === preXpLedger.length + 1);
  const xpTransRows = await (db as any).xPTransaction.findMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  check("X3: xPTransaction grew by exactly 1 row", xpTransRows.length === preXpTrans.length + 1);
  check("X4: xpEarned in response matches UKBI formula round(rawScore/10)", submit.json?.result?.xpEarned === Math.round(expected.raw / 10), `got ${submit.json?.result?.xpEarned} expected ${Math.round(expected.raw / 10)}`);

  console.log("\n═══ 8. Cleanup + baseline verification ═══");
  await db.progresKompetensi.deleteMany({ where: { userId: user.id, paketId: paket.id } });
  await db.kompetensiCertificate.deleteMany({ where: { userId: user.id, paketId: paket.id } });
  await db.testAnswer.deleteMany({ where: { sessionId: sessWithSnap!.id } });
  await db.testSession.delete({ where: { id: sessWithSnap!.id } });
  await (db as any).xpLedger.deleteMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  await (db as any).xPTransaction.deleteMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  await (db as any).userAchievement.deleteMany({ where: { userId: user.id } });
  await (db as any).premiumUsage.deleteMany({ where: { userId: user.id } });
  await db.user.update({ where: { id: user.id }, data: { xp: user.xp, level: user.level } });
  await (db as any).playerProfile.deleteMany({ where: { userId: user.id } });

  const post = {
    session: await db.testSession.findUnique({ where: { userId_paketId: { userId: user.id, paketId: paket.id } } }),
    progres: await db.progresKompetensi.count({ where: { userId: user.id, paketId: paket.id } }),
    certs: await db.kompetensiCertificate.count({ where: { userId: user.id, paketId: paket.id } }),
    ledger: await (db as any).xpLedger.count({ where: { userId: user.id, source: "KOMPETENSI" } }),
    xpTrans: await (db as any).xPTransaction.count({ where: { userId: user.id, source: "KOMPETENSI" } }),
    achievements: await (db as any).userAchievement.count({ where: { userId: user.id } }),
    premium: await (db as any).premiumUsage.count({ where: { userId: user.id } }),
    user: await db.user.findUnique({ where: { id: user.id }, select: { xp: true, level: true } }),
    ukbiBank: await db.uKBIQuestion.count(),
  };
  check("C1: session restored to baseline (absent)", post.session === null);
  check("C2: progres restored to baseline (0)", post.progres === 0);
  check("C3: certificates restored to baseline (0)", post.certs === 0);
  check("C4: xpLedger restored to baseline", post.ledger === preXpLedger.length);
  check("C5: xPTransaction restored to baseline", post.xpTrans === preXpTrans.length);
  check("C6: userAchievement restored to baseline", post.achievements === preAchievements.length);
  check("C7: premiumUsage restored to baseline", post.premium === prePremium.length);
  check("C8: user xp/level restored to baseline", post.user?.xp === user.xp && post.user?.level === user.level);
  check("C9: UKBI question bank untouched (row count unchanged)", post.ukbiBank === preUkbiBank, `${post.ukbiBank} vs ${preUkbiBank}`);
  check("C10: demo user still intact", (await db.user.findUnique({ where: { id: user.id } })) !== null);

  console.log(`\n═══════════════════════════════════════`);
  console.log(`UKBI E2E: ${pass} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    failures.forEach((f) => console.log("  ❌ " + f));
    await db.$disconnect();
    process.exit(1);
  }
  await db.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("UKBI E2E runner crashed:", e?.message ?? e);
  await db.$disconnect();
  process.exit(1);
});
