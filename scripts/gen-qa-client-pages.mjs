// Membuat app/qa-fixture/client-pages.tsx: registri SEMUA halaman klien ("use client")
// untuk audit overflow fixture QA. Jalankan ulang bila rute klien bertambah.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SKIP = new Set(["app/(dashboard)/murid/tugasku/page.tsx"]); // default export bukan komponen (hanya redirect)
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== "qa-fixture" && n !== "api") walk(p, out); }
    else if (n === "page.tsx") out.push(p);
  }
  return out;
}
const files = walk("app").filter((f) => !SKIP.has(f) && /^\s*["']use client["']/.test(readFileSync(f, "utf8"))).sort();
const route = (f) => ("/" + f.replace(/^app\/?/, "").replace(/\/?page\.tsx$/, "")).replace(/\/\([^)]+\)/g, "").replace(/^\/\([^)]+\)/, "") || "/";
const lines = [
  '"use client";',
  "/** QA-only (dibuat oleh scripts/gen-qa-client-pages.mjs): registri halaman klien asli; tanpa data server, tanpa bypass auth. */",
  'import dynamic from "next/dynamic";',
  'import type { ComponentType } from "react";',
  "",
  "// Halaman dinamis menerima props params/searchParams (Promise); diisi QaClientPage.",
  "type QaPageProps = { params?: Promise<Record<string, string>>; searchParams?: Promise<Record<string, string | string[] | undefined>> };",
  "export const QA_CLIENT_PAGES: Record<string, ComponentType<QaPageProps>> = {",
  ...files.map((f) => `  "${route(f) || "/"}": dynamic(() => import("@/${f.replace(/\.tsx$/, "")}"), { ssr: false }),`),
  "};",
  "",
];
writeFileSync("app/qa-fixture/client-pages.tsx", lines.join("\n"));
console.log(`${files.length} halaman klien`);
