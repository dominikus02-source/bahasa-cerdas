/**
 * Gate CI: Kerahasiaan penyedia AI (keputusan founder, 2 Nov 2026).
 *
 * Pengguna tidak boleh tahu model/penyedia AI yang dipakai BahasaCerdas.
 * Gate ini gagal bila:
 *  A. Teks yang dilihat pengguna (halaman, komponen, hook, public/, buku
 *     panduan) memuat nama penyedia/model AI.
 *  B. Komponen klien mengimpor pembersih khusus server (daftar nama penyedia
 *     akan ikut ke bundle browser).
 *  C. Respons API rute AI (JSON / SSE / pesan job) memuat nama penyedia, field
 *     provider/model yang tidak netral, atau detail kegagalan per-penyedia.
 *  D. Rute yang memanggil API AI langsung tidak menempelkan instruksi
 *     kerahasiaan ke prompt.
 *  E. Unit runtime: scrubber, netralisasi hasil/event, dan instruksi sistem.
 *
 * Jalankan: npm run test:no-ai-provider
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  AI_PROVIDER_NAME_PATTERN,
  containsAiProviderName,
  scrubAiProviderNames,
  publicAiMeta,
  toPublicAgentResult,
  toPublicStreamEvent,
} from "../lib/ai/public-ai-sanitize";
import {
  AI_CONFIDENTIALITY_INSTRUCTION,
  AI_PUBLIC_MODEL,
  AI_PUBLIC_PROVIDER,
  withConfidentialityPrompt,
} from "../lib/ai/ai-confidentiality";
import { withAiConfidentiality } from "../src/ai/core/provider";

const ROOT = path.resolve(__dirname, "..");
let failures = 0;
let checks = 0;

function ok(cond: unknown, label: string) {
  checks++;
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}`);
  }
}

function rel(p: string) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

function walk(dir: string, exts: RegExp, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.test(entry.name)) out.push(full);
  }
  return out;
}

function findProviderNames(text: string): string[] {
  const re = new RegExp(AI_PROVIDER_NAME_PATTERN.source, "gi");
  return Array.from(text.matchAll(re), (m) => m[0]);
}

function parse(file: string): ts.SourceFile {
  const src = fs.readFileSync(file, "utf8");
  const kind = file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, kind);
}

/** Semua potongan teks literal (string, template, JSX text) di file. Komentar diabaikan. */
function literalTexts(sf: ts.SourceFile): { text: string; line: number }[] {
  const out: { text: string; line: number }[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
    ) {
      // Spesifier impor bukan teks yang dilihat pengguna.
      if (!(node.parent && (ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent)))) {
        out.push({ text: node.text, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

// ─── E. Unit runtime ─────────────────────────────────────────────
console.log("\nE. Unit runtime pembersih & instruksi kerahasiaan");
{
  ok(containsAiProviderName("Pendamping Menulis AI (DeepSeek)."), "deteksi 'DeepSeek'");
  for (const name of ["deepseek-chat", "openai/gpt-oss-120b", "gemini-2.5-flash", "Groq", "ChatGPT", "Claude", "llama-3.3-70b", "whisper-large-v3"]) {
    ok(containsAiProviderName(name), `deteksi '${name}'`);
  }
  for (const benign of ["levelLama", "coherence", "Pendamping Menulis AI (NARA)", "kecerdasan buatan (AI)", "Model Pembelajaran"]) {
    ok(!containsAiProviderName(benign), `tidak salah deteksi '${benign}'`);
  }
  const scrubbed = scrubAiProviderNames("All providers failed: deepseek: 429; groq: DEEPSEEK_API_KEY missing; gemini-2.5-flash timeout");
  ok(!containsAiProviderName(scrubbed) && !/DEEPSEEK/i.test(scrubbed), `scrub pesan error → "${scrubbed}"`);
  ok(scrubAiProviderNames(null) === null && scrubAiProviderNames(undefined) === undefined, "scrub null/undefined aman");

  ok(publicAiMeta().provider === AI_PUBLIC_PROVIDER && publicAiMeta().model === AI_PUBLIC_MODEL, "publicAiMeta netral");
  ok(!containsAiProviderName(`${AI_PUBLIC_PROVIDER} ${AI_PUBLIC_MODEL}`), "nilai netral tidak memuat nama penyedia");

  const result = toPublicAgentResult({
    success: false,
    provider: "groq",
    model: "openai/gpt-oss-120b",
    error: "deepseek: 500; groq: timeout",
    warnings: ["Fallback dari DeepSeek ke Groq"],
    output: { model: "Problem Based Learning", note: "rasi Gemini" },
    metadata: { provider: "deepseek", model: "deepseek-chat", latencyMs: 12 },
  });
  ok(result.provider === AI_PUBLIC_PROVIDER && result.model === AI_PUBLIC_MODEL, "toPublicAgentResult: provider/model netral");
  ok(!containsAiProviderName(String(result.error)), "toPublicAgentResult: error dibersihkan");
  ok(!containsAiProviderName(JSON.stringify(result.warnings)), "toPublicAgentResult: warnings dibersihkan");
  const meta = result.metadata as Record<string, unknown>;
  ok(meta.provider === AI_PUBLIC_PROVIDER && meta.model === AI_PUBLIC_MODEL && meta.latencyMs === 12, "toPublicAgentResult: metadata netral, field lain utuh");
  ok(JSON.stringify(result.output) === JSON.stringify({ model: "Problem Based Learning", note: "rasi Gemini" }), "toPublicAgentResult: output karya TIDAK diubah");
  const nullMeta = toPublicAgentResult({ provider: null, model: null });
  ok(nullMeta.provider === null && nullMeta.model === null, "toPublicAgentResult: null tetap null");

  const ev1 = toPublicStreamEvent({ type: "provider", provider: "groq", model: "openai/gpt-oss-120b" });
  ok(!containsAiProviderName(JSON.stringify(ev1)), "event 'provider' netral");
  const ev2 = toPublicStreamEvent({ type: "final_result", result: { provider: "deepseek", model: "deepseek-chat", output: {} } });
  ok(!containsAiProviderName(JSON.stringify(ev2)), "event 'final_result' netral");
  const ev3 = toPublicStreamEvent({ type: "error", message: "Semua provider gagal: deepseek, groq, gemini" });
  ok(!containsAiProviderName(JSON.stringify(ev3)), "event 'error' dibersihkan");
  const ev4 = toPublicStreamEvent({ type: "delta", text: "Gemini adalah rasi bintang" });
  ok((ev4 as { text: string }).text === "Gemini adalah rasi bintang", "event 'delta' (isi karya) tidak diubah");

  ok(!containsAiProviderName(AI_CONFIDENTIALITY_INSTRUCTION), "instruksi kerahasiaan sendiri tidak menyebut nama penyedia");
  ok(/rahasia/i.test(AI_CONFIDENTIALITY_INSTRUCTION) && /model/i.test(AI_CONFIDENTIALITY_INSTRUCTION) && /penyedia/i.test(AI_CONFIDENTIALITY_INSTRUCTION), "instruksi melarang menyebut model/penyedia");

  const withSys = withAiConfidentiality({ model: "x", messages: [{ role: "system", content: "Kamu NARA." }, { role: "user", content: "kamu AI apa?" }] });
  ok(withSys.messages[0].content.startsWith("Kamu NARA.") && withSys.messages[0].content.includes(AI_CONFIDENTIALITY_INSTRUCTION), "withAiConfidentiality: ditempel ke system prompt yang ada");
  ok(withSys.messages.length === 2, "withAiConfidentiality: tidak menambah pesan bila system sudah ada");
  const noSys = withAiConfidentiality({ model: "x", messages: [{ role: "user", content: "halo" }] });
  ok(noSys.messages[0].role === "system" && noSys.messages[0].content === AI_CONFIDENTIALITY_INSTRUCTION, "withAiConfidentiality: menambah system prompt bila belum ada");
  const twice = withAiConfidentiality(withSys);
  ok(twice.messages[0].content.split(AI_CONFIDENTIALITY_INSTRUCTION).length === 2, "withAiConfidentiality: idempoten");
  ok(withConfidentialityPrompt(withConfidentialityPrompt("p")).split(AI_CONFIDENTIALITY_INSTRUCTION).length === 2, "withConfidentialityPrompt: idempoten");
}

// ─── A. Teks yang dilihat pengguna ────────────────────────────────
console.log("\nA. Teks yang dilihat pengguna bebas nama penyedia AI");
{
  const uiFiles = [
    ...walk(path.join(ROOT, "app"), /\.(tsx?|jsx?|mdx?)$/).filter((f) => !rel(f).startsWith("app/api/")),
    ...walk(path.join(ROOT, "components"), /\.(tsx?|jsx?)$/),
    ...walk(path.join(ROOT, "hooks"), /\.(tsx?|jsx?)$/),
    ...walk(path.join(ROOT, "data", "buku-panduan"), /\.(tsx?|jsx?)$/),
    path.join(ROOT, "lib", "ai", "ai-confidentiality.ts"),
  ].filter((f) => fs.existsSync(f));
  const hits: string[] = [];
  for (const file of uiFiles) {
    if (/\.mdx?$/.test(file)) {
      findProviderNames(fs.readFileSync(file, "utf8")).forEach((n) => hits.push(`${rel(file)}: "${n}"`));
      continue;
    }
    for (const { text, line } of literalTexts(parse(file))) {
      for (const n of findProviderNames(text)) hits.push(`${rel(file)}:${line}: "${n}"`);
    }
  }
  const publicFiles = walk(path.join(ROOT, "public"), /\.(json|html?|txt|svg|xml|webmanifest|md|js)$/);
  for (const file of publicFiles) {
    findProviderNames(fs.readFileSync(file, "utf8")).forEach((n) => hits.push(`${rel(file)}: "${n}"`));
  }
  if (hits.length) hits.slice(0, 50).forEach((h) => console.error(`    ${h}`));
  ok(hits.length === 0, `${uiFiles.length + publicFiles.length} file UI/public dipindai — ${hits.length} temuan`);

  const landing = fs.readFileSync(path.join(ROOT, "app", "aku-sastrawan", "page.tsx"), "utf8");
  ok(landing.includes("Pendamping Menulis AI (NARA)"), "landing AKU SASTRAWAN memakai sebutan netral 'Pendamping Menulis AI (NARA)'");
}

// ─── B. Klien tidak mengimpor pembersih khusus server ─────────────
console.log("\nB. Komponen klien tidak mengimpor public-ai-sanitize");
{
  const offenders: string[] = [];
  const all = [
    ...walk(path.join(ROOT, "app"), /\.(tsx?|jsx?)$/),
    ...walk(path.join(ROOT, "components"), /\.(tsx?|jsx?)$/),
    ...walk(path.join(ROOT, "hooks"), /\.(tsx?|jsx?)$/),
    ...walk(path.join(ROOT, "lib"), /\.(tsx?|jsx?)$/),
  ];
  for (const file of all) {
    const src = fs.readFileSync(file, "utf8");
    if (/^\s*["']use client["']/m.test(src.slice(0, 300)) && /public-ai-sanitize/.test(src)) offenders.push(rel(file));
  }
  offenders.forEach((o) => console.error(`    ${o}`));
  ok(offenders.length === 0, `tidak ada komponen klien yang mengimpor public-ai-sanitize (${offenders.length} temuan)`);
}

// ─── C. Respons API rute AI ───────────────────────────────────────
console.log("\nC. Respons API rute AI netral");
{
  const AI_ROUTE_SIGNAL =
    /callWithFallback|streamProviderText|callProvider|runAgent|agent-runner|agent-stream-runner|api\.deepseek\.com|api\.groq\.com|generativelanguage\.googleapis|@\/src\/ai\/|@\/lib\/ai\/|aiSavedResult|failJob/;
  const routes = walk(path.join(ROOT, "app", "api"), /\.(ts|tsx)$/).filter((f) => AI_ROUTE_SIGNAL.test(fs.readFileSync(f, "utf8")));
  const RESPONSE_CALLEE = /(?:^|\.)(?:NextResponse\.json|Response\.json|sse|failJob|completeJob)$/;
  // Pengecualian terdokumentasi: diagnosa per-penyedia di /api/ai/chat hanya
  // dikirim ke founder/ADMIN (bolehLihatSebab).
  const ALLOW = [{ file: "app/api/ai/chat/route.ts", property: "diagnosa" }];
  const hits: string[] = [];

  for (const file of routes) {
    const sf = parse(file);
    const r = rel(file);
    const usesSaved = /aiSavedResult/.test(sf.text);
    const where = (n: ts.Node) => `${r}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;

    const inspect = (root: ts.Node) => {
      const visit = (node: ts.Node) => {
        if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
          const name = node.name.getText(sf).replace(/["']/g, "");
          if (ALLOW.some((a) => a.file === r && a.property === name)) return;
          if (name === "provider" || name === "model") {
            const init = ts.isPropertyAssignment(node) ? node.initializer : node.name;
            const txt = init.getText(sf);
            const neutral =
              init.kind === ts.SyntaxKind.NullKeyword ||
              /^publicAiMeta\(\)\.(provider|model)$/.test(txt) ||
              /^AI_PUBLIC_(PROVIDER|MODEL)$/.test(txt) ||
              ((ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) && !containsAiProviderName(init.text));
            if (!neutral) hits.push(`${where(node)}: field '${name}' tidak netral (${txt.slice(0, 60)})`);
          }
          if (usesSaved && name === "data" && ts.isPropertyAssignment(node)) {
            const txt = node.initializer.getText(sf);
            if (!/toPublicAgentResult/.test(txt) && ts.isIdentifier(node.initializer)) {
              hits.push(`${where(node)}: baris aiSavedResult dikirim tanpa toPublicAgentResult (${txt})`);
            }
          }
        }
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
          for (const n of findProviderNames(node.text)) hits.push(`${where(node)}: teks respons memuat "${n}"`);
        }
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "join") {
          const target = node.expression.expression.getText(sf);
          if (/^(errors|sebabGagal|providerErrors)$/.test(target)) hits.push(`${where(node)}: detail kegagalan penyedia (${target}.join) dikirim ke klien`);
        }
        if (ts.isPropertyAccessExpression(node) && /^(provider|model)$/.test(node.name.text) && /^(result|res|data|response|event)$/.test(node.expression.getText(sf))) {
          // contoh: { ...x, p: result.provider } — nilai asli bocor lewat properti lain
          const parent = node.parent;
          if (!(parent && ts.isCallExpression(parent) && /publicAiMeta|toPublic/.test(parent.expression.getText(sf)))) {
            hits.push(`${where(node)}: nilai asli ${node.getText(sf)} dikirim ke klien`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(root);
    };

    const scan = (node: ts.Node) => {
      if (ts.isCallExpression(node) && RESPONSE_CALLEE.test(node.expression.getText(sf))) {
        node.arguments.forEach(inspect);
      } else if (
        ts.isNewExpression(node) &&
        node.expression.getText(sf) === "Response" &&
        node.arguments?.[0] &&
        ts.isCallExpression(node.arguments[0]) &&
        node.arguments[0].expression.getText(sf) === "JSON.stringify"
      ) {
        node.arguments[0].arguments.forEach(inspect);
      }
      ts.forEachChild(node, scan);
    };
    scan(sf);
  }
  hits.forEach((h) => console.error(`    ${h}`));
  ok(hits.length === 0, `${routes.length} rute AI dipindai — ${hits.length} temuan`);

  // SSE agent harus lewat toPublicStreamEvent; hasil agent lewat publicAiMeta.
  const stream = fs.readFileSync(path.join(ROOT, "app/api/ai/agents/stream/route.ts"), "utf8");
  ok(/JSON\.stringify\(toPublicStreamEvent\(event\)\)/.test(stream), "agents/stream: setiap event SSE lewat toPublicStreamEvent");
  const run = fs.readFileSync(path.join(ROOT, "app/api/ai/agents/run/route.ts"), "utf8");
  ok(/\.\.\.publicAiMeta\(\)/.test(run) && /scrubAiProviderNames\(result\.error\)/.test(run), "agents/run: provider/model netral & error dibersihkan");
  const job = fs.readFileSync(path.join(ROOT, "app/api/ai/rpp/[jobId]/route.ts"), "utf8");
  ok(/scrubAiProviderNames\(job\.error\)/.test(job), "ai/rpp/[jobId]: pesan job lama dibersihkan");
}

// ─── D. Instruksi kerahasiaan di rute pemanggil API AI langsung ──
console.log("\nD. Instruksi kerahasiaan terpasang di semua jalur AI");
{
  const direct = walk(path.join(ROOT, "app"), /\.(ts|tsx)$/).filter((f) =>
    /api\.deepseek\.com|api\.groq\.com\/openai\/v1\/chat|generativelanguage\.googleapis/.test(fs.readFileSync(f, "utf8")),
  );
  for (const file of direct) {
    const src = fs.readFileSync(file, "utf8");
    ok(/withConfidentialityPrompt\(|AI_CONFIDENTIALITY_INSTRUCTION/.test(src), `${rel(file)} menempelkan instruksi kerahasiaan`);
  }
  const coach = fs.readFileSync(path.join(ROOT, "app/api/aku-sastrawan/coach/route.ts"), "utf8");
  ok(/AI_CONFIDENTIALITY_INSTRUCTION/.test(coach), "aku-sastrawan/coach: instruksi kerahasiaan di SYSTEM");
  const provider = fs.readFileSync(path.join(ROOT, "src/ai/core/provider.ts"), "utf8");
  const wired = provider.match(/req = withAiConfidentiality\(req\);/g) ?? [];
  ok(wired.length >= 3, `src/ai/core/provider.ts: withAiConfidentiality di callProvider/callWithFallback/streamProviderText (${wired.length}×)`);
}

console.log(`\n${checks - failures}/${checks} cek lulus`);
if (failures > 0) {
  console.error(`\n✗ Kerahasiaan penyedia AI: ${failures} cek gagal.`);
  process.exit(1);
}
console.log("\n✓ Kerahasiaan penyedia AI: semua cek lulus.");
