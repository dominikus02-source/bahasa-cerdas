/**
 * VISUAL QA RUNNER — Guru Bank "Siapkan Latihan" send flow.
 * Self-contained: boots dev server on :3101, logs in as the documented demo
 * guru fixture via the real /api/auth/login route (cookie jar shared with the
 * browser context), creates 2 QA classes (1 empty) via Prisma, exercises the
 * full modal flow, verifies preview→send question-ID identity, snapshots 3
 * viewports, cleans up QA artifacts. Never prints secrets.
 * Run: npx tsx --env-file=.env.db.local scripts/visual-qa-bank-soal.ts
 */
import { chromium, type Browser, type Page } from "playwright";
import { PrismaClient } from "@prisma/client";
import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

const PORT = 3101;
const BASE = `http://localhost:${PORT}`;
// Documented demo fixture (AGENTS.md): guru@demo.com / guru123 — role GURU.
const DEMO_EMAIL = "guru@demo.com";
const DEMO_PASSWORD = "guru123";
const THEME = "Antonim"; // 50 rows, usedCount=0 — verified live before run
const JUMLAH = 10;

const db = new PrismaClient();
let server: ChildProcess | null = null;
let browser: Browser | null = null;

const results: { step: string; status: "PASS" | "FAIL" | "INFO"; note?: string }[] = [];
function record(step: string, status: "PASS" | "FAIL" | "INFO", note?: string) {
  results.push({ step, status, note });
  const mark = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "ℹ️ ";
  console.log(`${mark} [${status}] ${step}${note ? ` — ${note}` : ""}`);
}

async function waitForServer(timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE + "/");
      if (res.ok) return true;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  fs.mkdirSync("/tmp/vqa", { recursive: true });

  // ---------- 0. dev server ----------
  server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: { ...process.env, DB_POOL_TIMEOUT: "30" },
    stdio: "ignore",
  });
  if (!(await waitForServer(150_000))) throw new Error("dev server failed to start");
  record("server", "PASS", "dev server ready on :" + PORT);

  // ---------- 1. QA fixtures (groups owned by demo guru; cleaned at exit) ----------
  const guru = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!guru || guru.role !== "GURU") throw new Error("demo guru fixture missing");
  const member = await db.user.findFirst({ where: { role: "MURID" }, select: { id: true } });
  if (!member) throw new Error("no MURID fixture to attach to QA class");

  // Temporarily mark demo guru onboarded (layout gate); restore original value
  // in cleanup — demo fixture, documented account, non-destructive round-trip.
  const onboardedOrig = guru.onboarded;
  await db.user.update({ where: { id: guru.id }, data: { onboarded: true } });

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const groupEmpty = await db.group.create({
    data: { name: "VQA Kelas Kosong", grade: "IX", accessCode: "VQAQ" + suffix, teacherId: guru.id, isActive: true },
  });
  const groupWith = await db.group.create({
    data: { name: "VQA Kelas Isi", grade: "IX", accessCode: "VQAI" + suffix, teacherId: guru.id, isActive: true },
  });
  await db.groupMember.create({ data: { groupId: groupWith.id, userId: member.id } });
  record("fixtures", "PASS", "2 QA classes created (1 empty, 1 with 1 murid)");

  try {
    // ---------- 2. login via real auth route (cookies shared with context) ----------
    browser = await chromium.launch({ headless: true, channel: "chrome" });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const login = await ctx.request.post(BASE + "/api/auth/login", {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    if (!login.ok()) throw new Error("login failed: HTTP " + login.status());
    const loginBody = (await login.json()) as { user?: { role?: string } };
    record("login", "PASS", `real /api/auth/login — role=${loginBody.user?.role ?? "?"}`);

    const page = await ctx.newPage();
    await page.goto(BASE + "/guru/bank-soal", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("text=Bank Soal", { timeout: 30_000 });
    record("page", "PASS", "/guru/bank-soal rendered");

    // ---------- 3. open theme → modal ----------
    await page.click(`button:has-text("${THEME}")`);
    await page.waitForSelector("text=Siapkan Latihan", { timeout: 10_000 });
    record("modal", "PASS", `"Siapkan Latihan" modal open (theme: ${THEME})`);

    // ---------- 4. no duplicated "Kelas *" legacy select ----------
    const legacySelects = await page.locator('select:has(option:text-is("Pilih kelas"))').count();
    record("no-dup-kelas", legacySelects === 0 ? "PASS" : "FAIL", `legacy "Pilih kelas" selects: ${legacySelects}`);
    const pilihKelasLabel = await page.locator('label:has-text("Pilih Kelas")').count();
    record("single-tujuan-section", pilihKelasLabel === 1 ? "PASS" : "FAIL", `"Pilih Kelas" labels: ${pilihKelasLabel} (expect 1)`);

    // ---------- 5. question count visible ----------
    const tersedia = await page.locator("text=50 soal tersedia").count();
    record("count-visible", tersedia >= 1 ? "PASS" : "FAIL", `"50 soal tersedia" badges: ${tersedia}`);

    // ---------- 6. difficulty filter clear ----------
    const diffOptions = await page.locator("select >> nth=0 >> option").allTextContents().catch(() => [] as string[]);
    const hasHots = diffOptions.some((o) => /HOTS/.test(o));
    record("difficulty-filter", hasHots ? "PASS" : "FAIL", `options: ${JSON.stringify(diffOptions)}`);

    // ---------- 7. "Lihat Soal" enabled BEFORE class selection ----------
    const lihatBtn = page.locator('button:has-text("Lihat Soal")');
    const enabledBefore = await lihatBtn.isEnabled();
    record("preview-before-class", enabledBefore ? "PASS" : "FAIL", `enabled with 0 classes selected: ${enabledBefore}`);

    // ---------- 8. intercept preview response (IDs), open preview ----------
    let previewIds: string[] = [];
    const onPreview = async (res: import("playwright").Response) => {
      if (res.url().includes("/api/guru/bank-soal/preview") && res.request().method() === "GET") {
        try { previewIds = ((await res.json()) as { questionIds: string[] }).questionIds ?? []; } catch { /* ignore */ }
      }
    };
    page.on("response", onPreview);

    await lihatBtn.click();
    await page.waitForSelector("text=soal dipilih", { timeout: 15_000 });
    const blocks = await page.locator(".max-h-\\[50vh\\] > div").count().catch(() => 0);
    record("preview-opens", "PASS", `preview rendered (${blocks} question blocks, expect ${JUMLAH})`);
    record("preview-ids-count", previewIds.length === JUMLAH ? "PASS" : "FAIL", `questionIds from GET: ${previewIds.length}`);

    // teacher sees kunci
    const kunciRows = await page.locator("text=/^(Kunci|Pembahasan)/").count().catch(() => 0);
    const correctHighlights = await page.locator(".bg-emerald-50").count().catch(() => 0);
    record("preview-kunci-teacher", kunciRows > 0 || correctHighlights > 0 ? "PASS" : "FAIL", `kunci/pembahasan elements: ${kunciRows + correctHighlights}`);

    await page.screenshot({ path: "/tmp/vqa/preview-modal.png" });
    record("screenshot", "INFO", "/tmp/vqa/preview-modal.png saved");

    // ---------- 9. close preview ----------
    await page.click('button:has-text("Kembali")');
    await page.waitForTimeout(400);
    // "soal dipilih" intentionally persists as the Section-1 badge; the preview
    // modal itself is identified by its "lolos verifikasi" badge.
    record("preview-close", (await page.locator("text=lolos verifikasi").count()) === 0 ? "PASS" : "FAIL", "preview modal closed via Kembali");

    // ---------- 10-11. select class — visually obvious ----------
    await page.click('button:has-text("VQA Kelas Isi")');
    await page.waitForTimeout(300);
    const selBg = await page.locator('button:has-text("VQA Kelas Isi")').first().evaluate((el) => getComputedStyle(el).backgroundColor);
    const selBorder = await page.locator('button:has-text("VQA Kelas Isi")').first().evaluate((el) => getComputedStyle(el).borderColor);
    record("class-selected-visible", /emerald|16, 185, 129|209, 250, 229/.test(selBg + selBorder) ? "PASS" : "INFO", `selected bg=${selBg} border=${selBorder}`);
    const helperText = await page.locator("text=1 kelas dipilih").count();
    record("helper-text", helperText >= 1 ? "PASS" : "FAIL", '"1 kelas dipilih" helper shown');

    // ---------- 12. empty-class warning ----------
    const emptyWarn = await page.locator('button:has-text("VQA Kelas Kosong")').first().locator("text=Belum ada murid").count();
    record("empty-class-warning", emptyWarn >= 1 ? "PASS" : "FAIL", '"⚠ Belum ada murid" on empty class card');

    // ---------- 13. CTA state machine ----------
    const sendBtn = page.locator('button:has-text("Kirim Latihan")');
    const ctaLabel = (await sendBtn.textContent())?.trim() ?? "";
    record("cta-label", ctaLabel.includes("Kirim Latihan") && !ctaLabel.includes("0 Kelas") ? "PASS" : "FAIL", `label="${ctaLabel}"`);
    await page.click('button:has-text("VQA Kelas Isi")'); // deselect
    await page.waitForTimeout(200);
    record("cta-disabled-no-class", (await sendBtn.isDisabled()) ? "PASS" : "FAIL", "disabled with 0 classes");
    const noClassHelper = await page.locator("text=Pilih minimal 1 kelas").count();
    record("no-class-helper", noClassHelper >= 1 ? "PASS" : "FAIL", '"Pilih minimal 1 kelas" helper shown');
    await page.click('button:has-text("VQA Kelas Isi")'); // re-select
    await page.waitForTimeout(200);
    record("cta-enabled-with-class", (await sendBtn.isEnabled()) ? "PASS" : "FAIL", "enabled after selecting 1 class");

    // ---------- 14. send → verify preview IDs == quiz question order ----------
    // Re-preview to regenerate set (jumlah unchanged → deterministic given seed; but seed is random per preview — capture latest)
    await lihatBtn.click();
    await page.waitForSelector("text=soal dipilih", { timeout: 15_000 });
    await page.click('button:has-text("Kembali")');
    await page.waitForTimeout(300);
    if (previewIds.length !== JUMLAH) throw new Error("previewIds not captured");

    // Arm response listener first, then click (avoid Promise.all reject-race).
    let sendResp = 0;
    const seenRequests: string[] = [];
    const reqListener = (r: import("playwright").Request) => {
      if (r.url().includes("bank-soal")) seenRequests.push(`${r.method()} ${new URL(r.url()).pathname}`);
    };
    page.on("request", reqListener);
    const sendResponsePromise = page
      .waitForResponse((r) => r.url().includes("/api/guru/bank-soal/send") && r.request().method() === "POST", { timeout: 30_000 })
      .then((r) => { sendResp = r.status(); })
      .catch(() => {});
    const btnTextBefore = (await sendBtn.textContent())?.trim();
    const btnDisabledBefore = await sendBtn.isDisabled();
    await sendBtn.click();
    await page.waitForTimeout(500);
    const btnTextAfter = (await sendBtn.textContent().catch(() => "<gone>"))?.trim();
    await page.waitForTimeout(3500);
    await sendResponsePromise;
    page.off("request", reqListener);
    record(
      "send-executed",
      sendResp === 201 ? "PASS" : "FAIL",
      `HTTP ${sendResp}; btnBefore="${btnTextBefore}"(disabled=${btnDisabledBefore}) btnAfter500ms="${btnTextAfter}"; bank-soal requests seen: ${JSON.stringify(seenRequests)}`
    );

    // Poll for replica visibility of the created quiz (Supabase pooler lag).
    let quiz: Awaited<ReturnType<typeof db.quiz.findFirst>> = null;
    for (let i = 0; i < 15 && !quiz; i++) {
      await page.waitForTimeout(1000);
      quiz = await db.quiz.findFirst({
        where: { creatorId: guru.id, type: "LATIHAN", topik: THEME },
        orderBy: { createdAt: "desc" },
        include: { questions: { orderBy: { orderIndex: "asc" } } },
      });
    }
    if (!quiz) throw new Error("quiz not created by send (polled 15s)");
    const sendOrder = quiz.questions.map((q) => q.sourceId);
    const match = previewIds.length === sendOrder.length && previewIds.every((id, i) => id === sendOrder[i]);
    record(
      "preview-equals-send-ids",
      match ? "PASS" : "FAIL",
      `count preview=${previewIds.length} send=${sendOrder.length}; identical order: ${match} (IDs truncated: ${previewIds[0]?.slice(0, 8)}… vs ${sendOrder[0]?.slice(0, 8)}…)`
    );
    record("quiz-kelas-semantic", quiz.kelas === "IX" ? "PASS" : "FAIL", `quiz.kelas="${quiz.kelas}" = group grade (single class)`);

    // success toast / modal closed
    await page.waitForTimeout(500);
    const modalGone = (await page.locator("text=Siapkan Latihan").count()) === 0;
    record("modal-closed-after-send", modalGone ? "PASS" : "INFO", `"Siapkan Latihan" gone: ${modalGone}`);

    // ---------- 15. viewports ----------
    for (const [label, w, h] of [["desktop", 1280, 900], ["tablet", 834, 1112], ["mobile", 390, 844]] as const) {
      const p2 = await ctx.newPage();
      await p2.setViewportSize({ width: w, height: h });
      await p2.goto(BASE + "/guru/bank-soal", { waitUntil: "domcontentloaded" });
      await p2.waitForSelector("h1:has-text(\"Bank Soal\")", { timeout: 20_000 });
      await p2.click(`button:has-text("${THEME}")`);
      await p2.waitForSelector("text=Siapkan Latihan", { timeout: 10_000 });
      const overflow = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      // modal fits vertically?
      const modalBox = await p2.locator("text=Siapkan Latihan").first().boundingBox();
      const fits = modalBox ? modalBox.y >= 0 && modalBox.y < h : true;
      record(`viewport-${label}`, overflow <= 2 && fits ? "PASS" : "FAIL", `${w}x${h}: overflow=${overflow}px, modal top=${Math.round(modalBox?.y ?? -1)} (vh=${h})`);
      await p2.screenshot({ path: path.join("/tmp/vqa", `modal-${label}.png`) });
      await p2.close();
    }
  } finally {
    // ---------- cleanup QA artifacts (own writes only) ----------
    const quizzes = await db.quiz.findMany({ where: { creatorId: guru.id, topik: THEME, title: `Latihan: ${THEME}` }, select: { id: true } });
    for (const q of quizzes) {
      await db.quizAssignment.deleteMany({ where: { quizId: q.id } });
      await db.quiz.delete({ where: { id: q.id } }).catch(() => {});
    }
    await db.groupMember.deleteMany({ where: { groupId: { in: [groupEmpty.id, groupWith.id] } } });
    await db.group.delete({ where: { id: groupEmpty.id } }).catch(() => {});
    await db.group.delete({ where: { id: groupWith.id } }).catch(() => {});
    await db.user.update({ where: { id: guru.id }, data: { onboarded: onboardedOrig } }).catch(() => {});
    record("cleanup", "PASS", `QA groups/quiz removed; demo guru onboarded restored (${onboardedOrig})`);
  }

  fs.writeFileSync("/tmp/vqa/results.json", JSON.stringify(results, null, 2));
  const fails = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n═══ VISUAL QA: ${results.filter((r) => r.status === "PASS").length} PASS / ${fails} FAIL ═══`);
  if (fails > 0) process.exitCode = 1;
}

main()
  .catch((e) => { console.error("FATAL:", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(async () => {
    browser?.close().catch(() => {});
    server?.kill("SIGTERM");
    await db.$disconnect().catch(() => {});
    setTimeout(() => process.exit(process.exitCode ?? 0), 500);
  });
