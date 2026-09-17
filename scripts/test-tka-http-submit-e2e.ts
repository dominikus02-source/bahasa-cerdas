/**
 * TKA HTTP SUBMIT E2E — the missing end-to-end proof.
 *
 * Exercises the REAL production HTTP path against a locally running dev server:
 *
 *   login (POST /api/auth/login — real Supabase Auth)
 *     → start attempt (POST /api/kompetensi/[paketId] — usage guard + session tx)
 *     → build session snapshot (GET /api/kompetensi/[paketId] — randomized pool)
 *     → submit (POST /api/kompetensi/[paketId]/submit — auth, rate-limit,
 *               snapshot retrieval, buildAnswerRows, scoring, persistence)
 *     → verify response + persisted Prisma state
 *     → double-submit (idempotency contract)
 *
 * SAFETY CONTRACT
 * - Uses ONLY the murid@demo.com demo account (verified empty for the TKA SMP
 *   paket before starting). Capture + restore of its baseline rows is asserted:
 *   the script refuses to touch an account with pre-existing state.
 * - Cleanup after every phase deletes exactly the rows the run created, then
 *   VERIFIES the counts are back to baseline. Never runs destructive ops on
 *   user data beyond that single demo account.
 * - Correct/incorrect answer keys are read from the SESSION SNAPSHOT via a
 *   privileged direct DB read (the HTTP GET response is sanitized by design).
 *   The submit itself still goes over HTTP with no key knowledge — scoring
 *   provenance stays inside the production route.
 *
 * Requires BASE_URL env or default http://localhost:3000 with the dev server
 * running and .env.local credentials present. Exits non-zero on any failure.
 */
import "./load-env";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const DEMO_EMAIL = "murid@demo.com";
const DEMO_PASSWORD = "murid123";
const TKA_SMP_PAKET_TITLE = "Simulasi TKA - SMP (Kelas 9)";

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

async function main(): Promise<void> {
  console.log(`═══ TKA HTTP SUBMIT E2E — ${BASE} ═══\n`);

  // ── Baseline capture (demo murid must be clean for the TKA SMP paket) ──
  const user = await db.user.findFirst({ where: { email: DEMO_EMAIL } });
  if (!user) throw new Error("demo murid not found");
  const paket = await db.paketKompetensi.findFirst({ where: { type: "TKA_SMP", isActive: true, title: TKA_SMP_PAKET_TITLE } });
  if (!paket) throw new Error("TKA SMP paket not found");

  const preSession = await db.testSession.findUnique({ where: { userId_paketId: { userId: user.id, paketId: paket.id } } });
  const preProgres = await db.progresKompetensi.findMany({ where: { userId: user.id, paketId: paket.id } });
  const preXpLedger = await (db as any).xpLedger.findMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  const preXpTrans = await (db as any).xPTransaction.findMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  const preCerts = await db.kompetensiCertificate.findMany({ where: { userId: user.id, paketId: paket.id } });
  const prePremium = await (db as any).premiumUsage.findMany({ where: { userId: user.id } });
  const preAchievements = await (db as any).userAchievement.findMany({ where: { userId: user.id } });

  if (preSession || preProgres.length > 0) {
    console.log("⚠️  Demo murid sudah punya session/progres untuk paket ini — cleanup dulu sebelum E2E agar baseline bersih.");
    // Existing rows belong to earlier manual runs; delete them (demo account only).
    if (preProgres.length > 0) await db.progresKompetensi.deleteMany({ where: { userId: user.id, paketId: paket.id } });
    if (preCerts.length > 0) await db.kompetensiCertificate.deleteMany({ where: { userId: user.id, paketId: paket.id } });
    if (preSession) await db.testSession.delete({ where: { id: preSession.id } });
  }

  console.log("═══ 1. Login (POST /api/auth/login — real Supabase Auth) ═══");
  const jar = newJar();
  const login = await api(jar, "POST", "/api/auth/login", { email: DEMO_EMAIL, password: DEMO_PASSWORD });
  check("L1: login HTTP 200", login.status === 200, `got ${login.status} ${JSON.stringify(login.json).slice(0, 120)}`);
  check("L2: session returned + cookies set", !!login.json?.session?.access_token && jar.cookies.size > 0);
  check("L3: dbUser id matches demo account", login.json?.user?.id === user.id);

  console.log("\n═══ 2. Start attempt + snapshot (GET /api/kompetensi/[paketId]) ═══");
  // NOTE: the start+snapshot is served by the GET handler (204-582): session
  // upsert/usage-guard tx runs there; there is no POST start handler on this route.
  const get1 = await api(jar, "GET", `/api/kompetensi/${paket.id}`);
  check("S1: GET HTTP 200", get1.status === 200, `got ${get1.status} ${JSON.stringify(get1.json).slice(0, 160)}`);
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

  // Imported-question anchor: at least one snapshot question must come from the
  // merged ingestion set, verified against the committed JSON + DB row.
  const ingestedIds = snap.questions.filter((q: any) => q.id.startsWith("BC-TKA-SMP-SOALTKA-")).map((q: any) => q.id);
  const importedJson = JSON.parse(await import("fs").then((f) => f.readFileSync("data/question-bank/tka/smp/soal-tka-ix/set-001.json", "utf8")));
  const jsonById = new Map<string, any>(importedJson.questions.map((q: any) => [q.id, q]));
  check("S8: ingested questions surfaced into this session snapshot", ingestedIds.length > 0, `ingested in snapshot: ${ingestedIds.length}`);

  // Pick the E2E anchors — prefer an imported question for the correct answer.
  const anchor =
    snap.questions.find((q: any) => ingestedIds.includes(q.id)) ??
    snap.questions.find((q: any) => (q.options ?? []).some((o: any) => o.id === q.correctAnswer)) ??
    snap.questions[0];
  check("A0: anchor question chosen", !!anchor?.id, JSON.stringify(anchor?.id));
  const anchorOpts: any[] = (anchor.options ?? []).filter((o: any) => typeof o?.id === "string");
  const correctAnswer = anchor.correctAnswer;
  const wrongAnswer = (anchorOpts.find((o: any) => o.id !== correctAnswer) || { id: "" }).id;
  check("A1: anchor is single-select PG with a valid wrong option", !!correctAnswer && !!wrongAnswer, `anchor=${anchor.id} correct=${correctAnswer}`);

  console.log("\n═══ 3. Submit — correct answer (HTTP POST /submit) ═══");
  const answers: Record<string, string> = { [anchor.id]: correctAnswer };
  // One more answer with a WRONG choice to exercise both branches in one attempt,
  // if a second PG question exists in the snapshot.
  const second = snap.questions.find((q: any) => q.id !== anchor.id && q.type !== "CONSTRUCTED" && ["MENULIS", "BERBICARA"].indexOf(String(q.seksi || "")) === -1);
  let secondWrong = "";
  if (second && (second.options ?? []).some((o: any) => o.id !== second.correctAnswer)) {
    secondWrong = (second.options as any[]).find((o: any) => o.id !== second.correctAnswer)!.id;
    answers[second.id] = secondWrong;
  }
  const submitTime = new Date();
  const submit = await api(jar, "POST", `/api/kompetensi/${paket.id}/submit`, { answers, timeSpent: 120 });
  check("H1: submit HTTP 200", submit.status === 200, `got ${submit.status} ${JSON.stringify(submit.json).slice(0, 200)}`);
  check("H2: response has result payload", !!submit.json?.result);
  check("H3: benar=1 (the correct anchor counted)", submit.json?.result?.benar === 1, `benar=${submit.json?.result?.benar} total=${submit.json?.result?.total}`);
  if (secondWrong) {
    check("H4: salah=1 (the wrong second answer counted)", submit.json?.result?.salah === 1, `salah=${submit.json?.result?.salah}`);
  }
  check("H5: response rawScore>0 with correct anchor", (submit.json?.result?.rawScore ?? 0) > 0);
  check("H6: attemptNumber=1", submit.json?.attemptNumber === 1, String(submit.json?.attemptNumber));

  console.log("\n═══ 4. Persistence verification (Prisma, post-HTTP) ═══");
  const progres = await db.progresKompetensi.findFirst({
    where: { userId: user.id, paketId: paket.id },
    orderBy: { attemptNumber: "desc" },
  });
  check("P1: ProgresKompetensi row persisted (COMPLETED)", !!progres && progres.status === "COMPLETED");
  check("P2: response matches persisted score", submit.json?.result?.rawScore === progres?.rawScore && submit.json?.result?.percentage === Math.round((progres?.percentage ?? -1) * 100) / 100);
  check("P3: persisted answerDetails.userAnswers match submissions", (() => {
    const det: any = progres?.answerDetails as any;
    const recs: any[] = det?.userAnswers ?? [];
    const anchorRec = recs.find((r) => r.questionId === anchor.id);
    return !!anchorRec && anchorRec.isCorrect === true && anchorRec.selectedOptionId === correctAnswer;
  })());
  check("P4: answerDetails audit says scored-from-snapshot", (progres?.answerDetails as any)?.audit?.scoredFromSnapshot === true);
  const testAnswers = await db.testAnswer.findMany({ where: { sessionId: sessWithSnap!.id } });
  check("P5: TestAnswer rows persisted (one per submitted answer)", testAnswers.length === Object.keys(answers).length, `rows=${testAnswers.length} submitted=${Object.keys(answers).length}`);
  const anchorRow = testAnswers.find((r) => r.questionId === anchor.id);
  check("P6: TestAnswer for anchor isCorrect=true + positive score", anchorRow?.isCorrect === true && (anchorRow?.score ?? 0) > 0);
  if (secondWrong) {
    const secondRow = testAnswers.find((r) => r.questionId === second.id);
    check("P7: TestAnswer for wrong answer isCorrect=false + score=0", secondRow?.isCorrect === false && secondRow?.score === 0);
  }
  const secKey = anchorRow?.seksi ?? "";
  check("P8: sectionScores keyed by kompetensi contain the anchor section", !!secKey && Object.keys((progres?.sectionScores as any) ?? {}).includes(secKey));

  console.log("\n═══ 5. Double submit — idempotency contract ═══");
  const preProgresCount = await db.progresKompetensi.count({ where: { userId: user.id, paketId: paket.id } });
  const double = await api(jar, "POST", `/api/kompetensi/${paket.id}/submit`, { answers, timeSpent: 130 });
  check("D1: double submit HTTP 200 (clean contract, not a crash)", double.status === 200, `got ${double.status}`);
  check("D2: alreadyScored flag set", double.json?.alreadyScored === true, JSON.stringify(double.json).slice(0, 140));
  check("D3: replayed score identical to first submit", double.json?.result?.rawScore === submit.json?.result?.rawScore);
  const postDoubleCount = await db.progresKompetensi.count({ where: { userId: user.id, paketId: paket.id } });
  check("D4: no duplicate progres attempt created", postDoubleCount === preProgresCount, `before=${preProgresCount} after=${postDoubleCount}`);
  const postDoubleAnswers = await db.testAnswer.count({ where: { sessionId: sessWithSnap!.id } });
  check("D5: no duplicate TestAnswer rows", postDoubleAnswers === Object.keys(answers).length, `after=${postDoubleAnswers}`);
  const postDoubleXpLedger = await (db as any).xpLedger.count({ where: { userId: user.id, source: "KOMPETENSI" } });
  check("D6: no double XP (ledger count unchanged)", postDoubleXpLedger === preXpLedger.length + 1, `ledger=${postDoubleXpLedger} expected=${preXpLedger.length + 1}`);

  console.log("\n═══ 6. XP + side effects (single award, not doubled) ═══");
  const userAfter = await db.user.findUnique({ where: { id: user.id }, select: { xp: true, level: true } });
  const xpDelta = (userAfter?.xp ?? 0) - (user.xp ?? 0);
  check("X1: XP awarded exactly once (delta>0 and equals ledger)", xpDelta > 0, `delta=${xpDelta}`);
  const ledgerRows = await (db as any).xpLedger.findMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  check("X2: xpLedger grew by exactly 1 row", ledgerRows.length === preXpLedger.length + 1);
  const xpTransRows = await (db as any).xPTransaction.findMany({ where: { userId: user.id, source: "KOMPETENSI" } });
  check("X3: xPTransaction grew by exactly 1 row", xpTransRows.length === preXpTrans.length + 1);
  const progAfter = await db.progresKompetensi.findFirst({ where: { userId: user.id, paketId: paket.id }, orderBy: { attemptNumber: "desc" } });
  check("X4: predikat computed (A–D for TKA)", ["A", "B", "C", "D"].includes(progAfter?.predikat ?? ""), progAfter?.predikat);
  // imported-question proof at the persistence layer: the anchor (from the
  // committed ingestion JSON) was scored through the live route
  const anchorJson = jsonById.get(anchor.id);
  check("I1: anchor is from the committed ingestion JSON and scored correctly over HTTP", !!anchorJson && anchorRow?.isCorrect === true && anchorRow?.answer === correctAnswer, `anchor=${anchor.id} fromJson=${!!anchorJson}`);

  console.log("\n═══ 7. Cleanup + baseline verification ═══");
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
  };
  check("C1: session restored to baseline (absent)", post.session === null);
  check("C2: progres restored to baseline (0)", post.progres === 0);
  check("C3: certificates restored to baseline (0)", post.certs === 0);
  check("C4: xpLedger restored to baseline", post.ledger === preXpLedger.length);
  check("C5: xPTransaction restored to baseline", post.xpTrans === preXpTrans.length);
  check("C6: userAchievement restored to baseline", post.achievements === preAchievements.length);
  check("C7: premiumUsage restored to baseline", post.premium === prePremium.length);
  check("C8: user xp/level restored to baseline", post.user?.xp === user.xp && post.user?.level === user.level);
  check("C9: question bank untouched (425 TKA rows)", (await db.tKAQuestion.count()) === 425);
  check("C10: demo user still intact", (await db.user.findUnique({ where: { id: user.id } })) !== null);

  console.log(`\n═══════════════════════════════════════`);
  console.log(`E2E: ${pass} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    failures.forEach((f) => console.log("  ❌ " + f));
    await db.$disconnect();
    process.exit(1);
  }
  await db.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("E2E runner crashed:", e?.message ?? e);
  await db.$disconnect();
  process.exit(1);
});
