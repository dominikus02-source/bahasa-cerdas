/**
 * AKU SASTRAWAN — semua teks yang dilihat pengguna wajib Bahasa Indonesia.
 *
 * Memindai (AST TypeScript) setiap teks JSX, atribut yang terlihat pengguna
 * (placeholder, aria-label, title, alt), dan literal string/template di file
 * AKU SASTRAWAN (halaman, komponen, API, prompt pendamping AI), lalu gagal bila
 * ditemukan kata/frasa antarmuka bahasa Inggris yang umum.
 * Dilewati: className, import, console.*, kunci objek, kode SCREAMING_CASE,
 * path/URL/MIME, header HTTP, dan nilai teknis tanpa spasi.
 *
 * Usage: npx tsx scripts/test-aku-sastrawan-bahasa.ts
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import ts from "typescript";

const ROOTS = [
  "app/aku-sastrawan",
  "app/api/aku-sastrawan",
  "components/aku-sastrawan",
  "components/student-home/AkuSastrawanHomeCard.tsx",
  "lib/aku-sastrawan",
];

// Kata/frasa antarmuka bahasa Inggris yang umum. "Premium", "Studio", "Novel",
// "Draf", "AI" adalah kata yang lazim/serapan dalam Bahasa Indonesia → tidak dilarang.
const ENGLISH = [
  "the", "and", "your", "you", "with", "for", "of", "to", "is", "are", "this", "that", "please",
  "save", "saved", "saving", "delete", "deleted", "remove", "cancel", "confirm", "loading", "error", "failed",
  "success", "project", "projects", "chapter", "chapters", "writing", "writer", "coach", "upgrade", "unlock",
  "locked", "submit", "edit", "create", "new", "back", "next", "previous", "login", "logout", "sign in", "sign up",
  "log in", "settings", "start", "continue", "export", "download", "read-only", "read only", "untitled", "draft",
  "drafts", "not found", "unauthorized", "forbidden", "invalid", "required", "try again", "words", "word count",
  "academy", "by", "welcome", "home", "dashboard", "story", "stories", "plan", "free", "trial", "expired",
  "feedback", "progress", "lesson", "lessons", "stage", "done", "completed", "ready", "close", "open", "view",
  "share", "upload", "title", "synopsis", "manuscript", "subscribe", "subscription", "renew", "buy", "get started",
  "learn more", "coming soon", "feature", "features", "write", "here", "now",
];
const pattern = new RegExp(`(^|[^\\p{L}])(${ENGLISH.map((w) => w.replace(/[-\s]/g, "[-\\s]")).join("|")})(?=$|[^\\p{L}])`, "iu");
const VISIBLE_ATTRS = new Set(["placeholder", "aria-label", "title", "alt", "label"]);
const SKIP_ATTRS = new Set(["className", "class", "href", "src", "id", "htmlFor", "key", "type", "rel", "target", "role", "method", "name", "style"]);
const SKIP_CALLS = new Set(["console", "fetch", "headers", "redirect", "require", "useState<", "set"]);

function files(p: string): string[] {
  const st = statSync(p);
  if (st.isFile()) return /\.(tsx?|jsx?)$/.test(p) ? [p] : [];
  return readdirSync(p).flatMap((n) => files(join(p, n)));
}

function technical(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/^[A-Z0-9_]+$/.test(t)) return true;                        // KODE_ERROR
  if (/^[A-Z][a-z]+[.…!?]?$/.test(t)) return false;                // satu kata berhuruf kapital = label tombol (mis. "Simpan")
  if (!/\s/.test(t) && /^[\w\-./:#%?=&@*+[\]{}$,;]+$/.test(t)) return true; // id, path, mime, kelas, nilai teknis
  if (/^(GET|POST|PATCH|PUT|DELETE)$/.test(t)) return true;
  if (/^[a-z-]+\/[a-z0-9.+-]+(;.*)?$/i.test(t)) return true;       // MIME
  if (/^(attachment|private, no-store|use client|use server)/.test(t)) return true;
  return false;
}

function skippedByContext(node: ts.Node): boolean {
  for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
    if (ts.isJsxAttribute(p)) {
      const name = p.name.getText();
      if (VISIBLE_ATTRS.has(name)) return false;
      if (SKIP_ATTRS.has(name) || name.startsWith("on") === false) return true;
    }
    if (ts.isCallExpression(p)) {
      const callee = p.expression.getText();
      const head = callee.split(/[.(]/)[0];
      if (SKIP_CALLS.has(head) || /^(cn|clsx|console\.|rateLimitRoute|db\.|searchParams\.get)/.test(callee)) return true;
    }
    if (ts.isPropertyAssignment(p) && p.name === node) return true;
    if (ts.isElementAccessExpression(p) || ts.isLiteralTypeNode(p) || ts.isTypeNode(p)) return true;
    if (ts.isBinaryExpression(p) && /^(===|!==|==|!=)$/.test(p.operatorToken.getText())) return true; // perbandingan nilai
    if (ts.isCaseClause(p) && p.expression === node) return true;
    if (ts.isPropertyAssignment(p) && /^(model|track|identifier|status|genre|code|cache|method|runtime|dynamic|role|orderBy|mode|tone|className)$/.test(p.name.getText())) return true;
    if (ts.isVariableDeclaration(p) && /^(runtime|dynamic)$/.test(p.name.getText())) return true;
    if (ts.isNewExpression(p) && /^(Set|Map|RegExp)$/.test(p.expression.getText())) return true;
  }
  return false;
}

type Hit = { file: string; line: number; text: string; word: string };
const hits: Hit[] = [];
let scanned = 0;

function scan(file: string, src: string) {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const check = (node: ts.Node, raw: string) => {
    for (const piece of raw.split(/\$\{[^}]*\}/)) {
      if (technical(piece)) continue;
      scanned++;
      if (process.env.BAHASA_DUMP) console.log(`· ${file}: ${piece.trim().slice(0, 140)}`);
      const m = piece.match(pattern);
      if (m) hits.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, text: piece.trim().slice(0, 90), word: m[2] });
    }
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) { if (node.getText().trim()) check(node, node.getText()); }
    else if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && !skippedByContext(node)) check(node, node.text);
    else if (ts.isTemplateExpression(node) && !skippedByContext(node)) {
      check(node, [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(" ${x} "));
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// Fixture: pemindai AST wajib menangkap teks Inggris di JSX/atribut/pesan API.
const fixture = `"use client";
export function X({ busy }: { busy: boolean }) {
  return <div className="flex items-center"><h1>Writing Studio</h1><input placeholder="Untitled draft" />
    <button>{busy ? "Saving…" : "Save"}</button></div>;
}
export function y() { return Response.json({ error: "Project not found" }, { status: 404 }); }`;
const before = hits.length;
scan("__fixture__.tsx", fixture);
const fixtureHits = hits.splice(before).length;

for (const file of ROOTS.flatMap(files)) scan(file, readFileSync(file, "utf8"));

// Sanity: pemindai harus benar-benar menangkap teks Inggris.
const probe = ["Save", "Cancel", "Save draft", "Loading…", "Delete project", "Your story", "AI Writing Coach", "Upgrade now"];
const probeMiss = probe.filter((t) => !pattern.test(t));
const okProbe = ["Simpan", "Batal", "Selesai", "Simpan draf", "Memuat…", "Hapus karya", "Ceritamu", "Pendamping Menulis AI", "Aktifkan Premium", "Studio Menulis", "Unduh .txt"];
const probeFalse = okProbe.filter((t) => pattern.test(t));

console.log(`Teks terlihat yang dipindai: ${scanned}`);
console.log(`Fixture bahasa Inggris tertangkap: ${fixtureHits}/5`);
if (fixtureHits !== 5) console.log("❌ pemindai AST tidak menangkap semua teks Inggris di fixture");
if (probeMiss.length) console.log(`❌ pola tidak menangkap: ${probeMiss.join(" | ")}`);
if (probeFalse.length) console.log(`❌ pola salah menandai teks Indonesia: ${probeFalse.join(" | ")}`);
for (const h of hits) console.log(`❌ ${h.file}:${h.line} kata "${h.word}" → ${JSON.stringify(h.text)}`);
const failed = hits.length + probeMiss.length + probeFalse.length + (fixtureHits === 5 ? 0 : 1);
console.log(failed ? `\nGAGAL: ${failed} temuan bahasa Inggris.` : `\nLULUS: 0 teks bahasa Inggris di AKU SASTRAWAN.`);
if (failed) process.exit(1);
