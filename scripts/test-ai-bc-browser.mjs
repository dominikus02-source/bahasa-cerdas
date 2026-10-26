/**
 * Browser QA with actual AI BC components, shell and mobile nav, without DB/auth.
 * The local HTTP server streams fixture SSE through the unchanged streamBcChat.
 * Run: AI_BC_PLAYWRIGHT_MODULE=/path/to/playwright node scripts/test-ai-bc-browser.mjs
 * Optional: AI_BC_CHROME_PATH=/path/to/chrome, AI_BC_QA_OUTPUT=/path/to/screenshots.
 * This verifies UI behavior, not production auth/provider or a physical keyboard.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.AI_BC_PLAYWRIGHT_MODULE || "playwright");
const root = process.cwd();
const bundleDir = await fs.mkdtemp(path.join(os.tmpdir(), "bc-ai-bundle-"));
const outputDir = process.env.AI_BC_QA_OUTPUT || "/tmp/bc-ai-ui-qa";
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "results.json"), JSON.stringify({ status: "RUNNING" }));

await build({
  stdin: {
    resolveDir: root,
    loader: "tsx",
    contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import Student from './components/ai-bc/AiBcArenaWorkspace';
      import Teacher from './components/ai-bc/AiBcGuruWorkspace';
      import {ShellLayout} from './components/shell/ShellLayout';
      import MuridMobileNav from './components/dashboard/MuridMobileNav';
      import {GuruMobileNav} from './components/dashboard/GuruNav';
      import {BottomNav} from './app/arena/bottom-nav';
      import {BCAssistantForm} from './app/(dashboard)/guru/ai-tools/_components/forms/bc-assistant-form';
      import {AgentResultPanel} from './app/(dashboard)/guru/ai-tools/_components/agent-result-panel';
      import PublicPage from './app/ai-bc/page';
      const role = new URLSearchParams(location.search).get('role') || 'student';
      const teacher = role === 'teacher';
      const hints = [{label:'Arti kata',prompt:'Jelaskan arti apresiasi.'},{label:'Arti kata duplikat',prompt:'Jelaskan arti apresiasi.'}];
      const content = role === 'public' ? await PublicPage() : role === 'tool'
        ? <div data-audience="guru" className="bc-guru mx-auto max-w-xl space-y-6 p-4">
            <BCAssistantForm loading={false} onSubmit={value=>{window.qaToolPayload=value}} />
            <AgentResultPanel agentId="bc-assistant" loading={false} error={null}
              result={{success:true, output:{reply:'## Hasil diskusi\\n\\nContoh materi dengan **penjelasan**.\\n\\n'+'kata'.repeat(80), suggestedAgent:'soal'}, text:null, error:null, warnings:[], qualityScore:90, provider:'fixture', model:'fixture', latencyMs:10}}
              onRegenerate={()=>{window.qaRegenerate=true}} onClear={()=>{}}
              onSuggestedAgent={agent=>{window.qaSuggestedAgent=agent}} />
          </div>
        : <ShellLayout
            rootClassName={teacher ? 'bc-guru-shell' : ''}
            sidebar={<div>BahasaCerdas</div>}
            header={<header className="h-14 shrink-0 border-b border-border bg-background px-4">BahasaCerdas</header>}
            mainClassName={teacher ? 'bc-guru flex-1 px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 lg:py-8 pb-24 md:pb-8 mx-auto max-w-[1440px] w-full' : 'mx-auto px-0 w-full py-0'}
            bottomNav={teacher ? <GuruMobileNav role="GURU" isFounder={false} /> : role === 'apk' ? <BottomNav /> : <MuridMobileNav />}>
              {teacher ? <Teacher userName="Guru QA" personaTitle="Teman Berpikir, Berkata, dan Berkarya." greeting="Halo, mari berdiskusi." hints={hints}/>
                : <div className="w-full py-0 md:px-6"><Student userName="Murid QA" personaTitle="Teman Berpikir, Berkata, dan Berkarya." greeting="Halo, mari belajar." hints={hints}/></div>}
          </ShellLayout>;
      createRoot(document.getElementById('root')).render(content);
    `,
  },
  outfile: path.join(bundleDir, "bundle.js"),
  bundle: true,
  format: "esm",
  jsx: "automatic",
  tsconfig: path.join(root, "tsconfig.json"),
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [{
    name: "next-fixture-adapters",
    setup(api) {
      api.onResolve({ filter: /^(next\/(image|link|navigation)|@\/lib\/supabase\/server)$/ }, args => ({ path: args.path, namespace: "fixture" }));
      api.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path: id }) => ({
        resolveDir: root,
        loader: "tsx",
        contents: id === "next/image" ? `import React from 'react'; export default function Image({priority, sizes, ...props}) { return <img {...props}/> }`
          : id === "next/link" ? `import React from 'react'; export default function Link({prefetch, ...props}) { return <a {...props}/> }`
          : id === "next/navigation" ? `export const usePathname=()=>new URLSearchParams(location.search).get('role')==='teacher'?'/guru/ai-bc':'/arena/ai'; export const redirect=()=>{throw Error('Unexpected fixture redirect')}`
          : `export const getUser=async()=>null;`,
      }));
    },
  }],
});

execFileSync(process.execPath, [path.join(root, "node_modules/tailwindcss/lib/cli.js"), "-i", "app/globals.css", "-o", path.join(bundleDir, "globals.css"), "--minify"], { cwd: root, stdio: "ignore" });

let mode = "ok";
let nextStreamGate = null;
function holdNextStream() {
  let release;
  nextStreamGate = new Promise(resolve => { release = resolve; });
  return release;
}
const requests = [];
const richText = "## Memahami ide pokok\n\nIde pokok adalah gagasan utama.\n\nContoh baris pertama<br />Contoh baris kedua\n\n1. Baca teks.\n2. Temukan inti pembahasan.\n\n**Contoh** dan [tautan](https://example.com/" + "a".repeat(160) + ")\n\n```ts\nconst kalimat = '" + "b".repeat(220) + "';\n```\n\n| Materi | Contoh yang panjang | Pembahasan |\n| --- | --- | --- |\n| Kosakata | " + "c".repeat(180) + " | Pelajari maknanya |\n\nSelesai memahami materi.";
const html = `<!doctype html><html lang="id"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/globals.css"><link rel="stylesheet" href="/classroom.css"><link rel="stylesheet" href="/bundle.css"></head><body><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/ai/bc/chat") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    requests.push(JSON.parse(raw));
    if (mode === "error") {
      res.writeHead(503, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Fixture busy" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
    res.flushHeaders();
    const gate = nextStreamGate;
    nextStreamGate = null;
    if (gate) await gate;
    const responseMode = mode;
    await new Promise(resolve => setTimeout(resolve, responseMode === "slow" ? 900 : 180));
    for (const [index, text] of ["## Memahami ide pokok\n\n", richText.slice("## Memahami ide pokok\n\n".length)].entries()) {
      // "stall": the first delta arrives, then the stream pauses so the user can press Stop.
      if (index > 0 && responseMode === "stall") await new Promise(resolve => setTimeout(resolve, 5000));
      if (res.destroyed) return;
      const frame = `data: ${JSON.stringify({ type: "delta", text })}\n\n`;
      res.write(frame.slice(0, 15));
      await new Promise(resolve => setTimeout(resolve, 80));
      res.write(frame.slice(15));
      await new Promise(resolve => setTimeout(resolve, 160));
    }
    res.end('data: {"type":"done","provider":"fixture","model":"fixture"}\n\n');
    return;
  }
  const files = {
    "/bundle.js": [path.join(bundleDir, "bundle.js"), "text/javascript"],
    "/bundle.css": [path.join(bundleDir, "bundle.css"), "text/css"],
    "/globals.css": [path.join(bundleDir, "globals.css"), "text/css"],
    "/classroom.css": [path.join(root, "components/kelas/classroom.css"), "text/css"],
  };
  if (files[url.pathname]) {
    const [file, type] = files[url.pathname];
    res.writeHead(200, { "Content-Type": type }); res.end(await fs.readFile(file)); return;
  }
  if (url.pathname.startsWith("/junior/karakter/") || url.pathname.startsWith("/brand/")) {
    try { res.end(await fs.readFile(path.join(root, "public", url.pathname))); }
    catch { res.writeHead(404); res.end(); }
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html" }); res.end(html);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
console.log(`AI BC fixture: ${base}`);
const browser = await chromium.launch({ headless: true, args: ["--disable-gpu"], ...(process.env.AI_BC_CHROME_PATH ? { executablePath: process.env.AI_BC_CHROME_PATH } : {}) });
const results = [];
const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"], reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(60_000);
const runtimeErrors = [];
const failedRequests = [];
page.on("pageerror", error => runtimeErrors.push(error.message));
page.on("requestfailed", request => {
  if (request.url().includes("/api/ai/bc/chat")) failedRequests.push(request.failure()?.errorText);
});

// Wait until the layout signature is identical for several consecutive frames (bounded).
// useAiBcViewport measures in rAF after a resize; measuring or focusing before that frame
// raced with the hook and made the short-viewport check flaky.
async function settleLayout() {
  await page.evaluate(() => new Promise(resolve => {
    const signature = () => {
      const root = document.documentElement;
      const workspace = document.querySelector(".ai-bc-workspace, .ai-bc-guru-workspace");
      return [innerWidth, innerHeight, scrollY, root.scrollWidth, root.scrollHeight, workspace?.getBoundingClientRect().height ?? -1].join("/");
    };
    let last = "";
    let stable = 0;
    let frames = 0;
    const tick = () => {
      const current = signature();
      stable = current === last ? stable + 1 : 0;
      last = current;
      frames += 1;
      if (stable >= 4 || frames >= 120) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
}

async function checkBounds(label) {
  await settleLayout();
  const geometry = await page.evaluate(() => {
    const rect = document.querySelector('[aria-label="Kirim pertanyaan"]')?.getBoundingClientRect();
    const nav = document.querySelector(".bc-mobile-nav, .arena-bottom-nav")?.getBoundingClientRect();
    const workspace = document.querySelector(".ai-bc-guru-workspace")?.getBoundingClientRect();
    const shell = document.querySelector(".shell-main")?.getBoundingClientRect();
    return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1,
      pageOverflow: document.documentElement.scrollHeight > innerHeight + 2,
      button: rect && { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height },
      limit: nav?.height > 0 ? nav.top : innerHeight,
      teacherEdges: workspace && shell && [Math.abs(workspace.left-shell.left), Math.abs(workspace.right-shell.right)],
      placeholderClipped: (() => {
        const input = document.querySelector('[aria-label="Tulis pesan untuk Nara"]');
        return input && !input.value && input.scrollHeight > input.clientHeight + 1;
      })() };
  });
  assert.equal(geometry.overflow, false, `${label}: horizontal overflow`);
  assert.ok(!geometry.placeholderClipped, `${label}: placeholder clipped`);
  if (geometry.teacherEdges) assert.ok(geometry.teacherEdges.every(gap => gap < 1), `${label}: teacher canvas gap`);
  if (geometry.button) {
    assert.equal(geometry.pageOverflow, false, `${label}: double page scroll`);
    assert.ok(geometry.button.left >= 0 && geometry.button.right <= geometry.width, `${label}: send clipped`);
    assert.ok(geometry.button.bottom <= geometry.limit + 1 && geometry.button.height >= 44, `${label}: send hidden by nav`);
  }
}

try {
  for (const role of ["student", "teacher", "apk"]) {
    for (const theme of ["light", "dark"]) {
      for (const [width, height] of [[360, 740], [390, 844], [768, 1024], [1440, 900]]) {
        await page.setViewportSize({ width, height });
        await page.goto(`${base}/?role=${role}`);
        await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
        await page.getByRole("heading", { level: 1 }).waitFor();
        assert.equal(await page.locator('[aria-label="Saran pertanyaan utama"] button').count(), 3);
        await checkBounds(`${role}/${theme}/${width} lobby`);
        console.log(`PASS bounds: ${role}/${theme}/${width} lobby`);
        await page.screenshot({ path: path.join(outputDir, `${role}-${theme}-${width}-lobby.png`) });
        const release = holdNextStream();
        await page.getByRole("button", { name: "Bahas soal", exact: true }).click();
        await page.getByText("Nara sedang berpikir…", { exact: true }).waitFor();
        assert.ok(await page.getByRole("button", { name: "Kirim pertanyaan", exact: true }).isDisabled());
        release();
        await page.getByText("Selesai memahami materi.", { exact: true }).waitFor({ state: "attached" });
        await page.locator('[role="status"]').waitFor({ state: "detached" });
        assert.ok((await page.locator(".prose").last().textContent()).includes("Contoh baris pertama\nContoh baris kedua"), "preserve production br normalization");
        results.push(`${role}/${theme}/${width}: lobby, suggestion, SSE, Markdown`);
        await checkBounds(`${role}/${theme}/${width} chat`);
        await page.screenshot({ path: path.join(outputDir, `${role}-${theme}-${width}-chat.png`) });
      }
    }
  }

  for (const role of ["student", "teacher"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/?role=${role}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.getByText(role === "student" ? "Saran sesuai belajarmu" : "Saran sesuai kebutuhan mengajar", { exact: true }).click();
    assert.equal(await page.locator("details button").count(), 1, "deduplicate contextual hints");
    await page.getByRole("button", { name: "Arti kata", exact: true }).click();
    await page.getByText("Selesai memahami materi.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Mulai percakapan baru" }).click();
    const input = page.getByRole("textbox", { name: "Tulis pesan untuk Nara" });
    mode = "error";
    await input.fill("Bahas teks ini");
    await input.press("Shift+Enter");
    assert.equal(await input.inputValue(), "Bahas teks ini\n");
    await input.press("Enter");
    await page.getByRole("button", { name: "Coba Lagi", exact: true }).waitFor();
    mode = "ok";
    await page.getByRole("button", { name: "Coba Lagi", exact: true }).click();
    await page.getByText("Selesai memahami materi.", { exact: true }).waitFor();
    assert.equal(requests.at(-1).messages.filter(message => message.role === "user" && message.content === "Bahas teks ini").length, 1, `${role} retry sends one copy of the latest question`);
    if (role === "teacher") {
      await page.getByRole("button", { name: "Tanya ulang", exact: true }).last().click();
      await page.locator('[role="status"]').waitFor({ state: "detached" });
      assert.equal(requests.at(-1).messages.filter(message => message.role === "user" && message.content === "Bahas teks ini").length, 1, "teacher regenerate sends one copy of the latest question");
    }
    await page.getByRole("button", { name: "Salin", exact: true }).last().click();
    await page.getByRole("button", { name: "Tersalin", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Tanya ulang", exact: true }).count(), 1, `${role}: Tanya ulang only on the latest reply`);
    // Stop after the first delta keeps the partial answer.
    mode = "stall";
    await input.fill("Pertanyaan yang dihentikan");
    await input.press("Enter");
    await page.getByText("Nara sedang menulis…", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Tanya ulang", exact: true }).count(), 0, `${role}: Tanya ulang hidden while streaming`);
    await page.screenshot({ path: path.join(outputDir, `${role}-390-streaming-stop.png`) });
    await page.getByRole("button", { name: "Hentikan jawaban", exact: true }).click();
    await page.locator('[role="status"]').waitFor({ state: "detached" });
    const stoppedText = await page.locator(".prose").last().textContent();
    assert.ok(stoppedText.includes("Memahami ide pokok") && stoppedText.includes("(Jawaban dihentikan.)"), `${role}: stop keeps partial answer`);
    assert.ok(!stoppedText.includes("Selesai memahami materi."), `${role}: stop ends the stream`);
    assert.equal(await page.getByRole("button", { name: "Tanya ulang", exact: true }).count(), 1, `${role}: Tanya ulang after stop`);
    // Stop before any delta shows a retryable notice.
    mode = "ok";
    const releaseStop = holdNextStream();
    await input.fill("Pertanyaan dihentikan lebih awal");
    await input.press("Enter");
    await page.getByText("Nara sedang berpikir…", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Hentikan jawaban", exact: true }).click();
    await page.getByText("Jawaban dihentikan sebelum Nara sempat menulis.", { exact: true }).waitFor();
    releaseStop();
    await page.getByRole("button", { name: "Coba Lagi", exact: true }).click();
    await page.getByText("Selesai memahami materi.", { exact: true }).last().waitFor();
    await page.locator('[role="status"]').waitFor({ state: "detached" });
    assert.equal(requests.at(-1).messages.filter(message => message.role === "user" && message.content === "Pertanyaan dihentikan lebih awal").length, 1, `${role}: retry after stop sends one copy`);
    await page.getByRole("button", { name: "Mulai percakapan baru" }).click();
    mode = "slow";
    const releaseReset = holdNextStream();
    await input.fill("Pertanyaan sebelum reset");
    await input.press("Enter");
    await page.getByRole("button", { name: "Mulai percakapan baru" }).click();
    releaseReset();
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.waitForTimeout(1400);
    assert.equal(await page.locator(".ai-bc-messages").count(), 0, "stale response after reset");
    mode = "ok";
    await page.setViewportSize({ width: 390, height: 380 });
    // Let the viewport hook re-measure before focusing the composer (mirrors resize → tap order).
    await settleLayout();
    await input.fill("Viewport pendek");
    await checkBounds(`${role} short viewport`);
    results.push(`${role}: hints, Enter/Shift+Enter, error/retry, copy, Tanya ulang on latest only, stop (partial + empty), reset during SSE, short viewport`);
  }

  // ?q= prefill (home-card chips): fills the composer, never auto-sends, strips the query.
  {
    await page.setViewportSize({ width: 390, height: 844 });
    const before = requests.length;
    await page.goto(`${base}/?role=student&q=${encodeURIComponent("Apa arti kata ")}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    const input = page.getByRole("textbox", { name: "Tulis pesan untuk Nara" });
    await page.waitForFunction(() => document.querySelector('[aria-label="Tulis pesan untuk Nara"]')?.value === "Apa arti kata ");
    assert.equal(await input.inputValue(), "Apa arti kata ");
    assert.ok(!new URL(page.url()).searchParams.has("q"), "prefill strips ?q=");
    assert.equal(new URL(page.url()).searchParams.get("role"), "student", "prefill keeps other params");
    await page.waitForTimeout(400);
    assert.equal(requests.length, before, "prefill does not auto-send");
    results.push("student: ?q= prefill without auto-send");
  }

  for (const role of ["public", "tool"]) {
    for (const theme of ["light", "dark"]) {
      for (const width of [360, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(`${base}/?role=${role}`);
        await page.locator(role === "public" ? "h1" : "#bc-assistant-message").waitFor();
        await page.evaluate(theme => document.documentElement.classList.toggle("dark", theme === "dark"), theme);
        await checkBounds(`${role}/${theme}/${width}`);
        await page.screenshot({ path: path.join(outputDir, `${role}-${theme}-${width}.png`), fullPage: true });
        results.push(`${role}/${theme}/${width}: responsive/theme`);
      }
    }
  }
  await page.getByRole("textbox", { name: "Pesan", exact: true }).fill("Bantu bahas soal.");
  await page.getByRole("textbox", { name: "Konteks tambahan", exact: false }).fill("Kelas X");
  await page.getByRole("button", { name: "Tanya Nara" }).click();
  assert.deepEqual(await page.evaluate(() => window.qaToolPayload), { message: "Bantu bahas soal.", context: "Kelas X", mode: "guru" });
  await page.getByRole("heading", { name: "Hasil diskusi" }).waitFor();
  await page.getByRole("button", { name: "Buka alat yang disarankan" }).click();
  assert.equal(await page.evaluate(() => window.qaSuggestedAgent), "soal");
  await page.getByText("Jawaban Nara siap", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Tanya ulang", exact: true }).click();
  assert.equal(await page.evaluate(() => window.qaRegenerate), true);
  assert.ok(requests.length >= 24);
  for (const request of requests) {
    assert.deepEqual(Object.keys(request), ["messages"]);
    assert.ok(request.messages.every(message => ["user", "assistant"].includes(message.role) && typeof message.content === "string"));
  }
  assert.deepEqual(runtimeErrors, []);
  await fs.writeFile(path.join(outputDir, "results.json"), JSON.stringify({ status: "PASS", checks: results, requestCount: requests.length, limitations: ["Next Image/link/router adapted in isolated fixture", "no production auth/provider", "short viewport is not a physical keyboard"] }, null, 2));
  console.log(`PASS: ${results.length} browser scenarios; ${requests.length} SSE requests; output ${outputDir}`);
} catch (error) {
  nextStreamGate = null;
  const detail = { status: "FAIL", error: error.message, url: page.url(), requests, runtimeErrors, failedRequests, body: await page.locator("body").innerText() };
  await fs.writeFile(path.join(outputDir, "results.json"), JSON.stringify(detail, null, 2));
  await page.screenshot({ path: path.join(outputDir, "failure.png"), timeout: 10_000 }).catch(() => {});
  throw error;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await fs.rm(bundleDir, { recursive: true, force: true });
}
