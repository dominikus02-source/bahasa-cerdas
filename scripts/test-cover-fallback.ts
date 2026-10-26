/**
 * TEST — sampul cadangan bermerek + URL media Supabase Cloud lama (2026-10-26).
 *
 * Proyek Supabase Cloud lama mati; Storage kini self-host di domain utama.
 *  A. resolveMediaUrlWithBase: URL Cloud /storage/v1/object/public → Storage aktif,
 *     host sama dibiarkan, tanpa base / bukan path publik → null, URL lain lolos.
 *  B. isStorageMediaUrl untuk memaksa `unoptimized` di next/image.
 *  C. coverJenis: varian per jenis karya (puisi/sastra/prosa/opini/artikel/karya).
 *  D. GeneratedCover: deterministik, teks di-escape (tanpa HTML mentah), aria-label.
 *  E. CSS .bc-cover hanya memakai token (tanpa hex/rgb), ada varian & mode gelap via token.
 *  F. Kartu/halaman artikel & karya meneruskan prop `cover`.
 */
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isStorageMediaUrl, isSupabaseCloudUrl, resolveMediaUrlWithBase } from "../lib/media/resolve-media-url";
import { COVER_VARIANTS, coverJenis, coverSeed, coverTitle } from "../lib/media/generated-cover";
import GeneratedCover from "../components/shared/GeneratedCover";

const ROOT = path.resolve(__dirname, "..");
let passed = 0;
let failed = 0;
function ok(desc: string, cond: boolean, extra = "") {
  if (cond) { passed++; console.log(`PASS  ${desc}`); }
  else { failed++; console.log(`FAIL  ${desc}${extra ? ` — ${extra}` : ""}`); }
}
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

// ── A ──
const SELF = "https://www.bahasacerdas.com";
const CLOUD = "https://ibtlhoocaoopgtcsnvzr.supabase.co/storage/v1/object/public/images/toko/u1/1790657524122-x.jpg";
ok("A1 URL Cloud → path sama di Storage self-host",
  resolveMediaUrlWithBase(CLOUD, SELF) === `${SELF}/storage/v1/object/public/images/toko/u1/1790657524122-x.jpg`,
  String(resolveMediaUrlWithBase(CLOUD, SELF)));
ok("A2 query string ikut dipertahankan",
  resolveMediaUrlWithBase(`${CLOUD}?v=2`, SELF)?.endsWith("x.jpg?v=2") === true);
ok("A3 host sama dengan base (staging Cloud) dibiarkan",
  resolveMediaUrlWithBase(CLOUD, "https://ibtlhoocaoopgtcsnvzr.supabase.co") === CLOUD);
ok("A4 tanpa base → null (langsung sampul buatan)", resolveMediaUrlWithBase(CLOUD, "") === null);
ok("A5 URL Cloud bukan path publik → null",
  resolveMediaUrlWithBase("https://abc.supabase.co/storage/v1/object/sign/images/a.png?token=t", SELF) === null);
ok("A6 URL non-Supabase lolos apa adanya",
  resolveMediaUrlWithBase("https://images.unsplash.com/photo-1?w=800", SELF) === "https://images.unsplash.com/photo-1?w=800");
ok("A7 path lokal /images lolos", resolveMediaUrlWithBase("/images/a.png", SELF) === "/images/a.png");
ok("A8 kosong/null → null", resolveMediaUrlWithBase("  ", SELF) === null && resolveMediaUrlWithBase(null, SELF) === null);
ok("A9 skema berbahaya → null; blob:/data:image (pratinjau) tetap",
  resolveMediaUrlWithBase("javascript:alert(1)", SELF) === null
  && resolveMediaUrlWithBase(" JavaScript:alert(1)", SELF) === null
  && resolveMediaUrlWithBase("data:text/html,<b>x</b>", SELF) === null
  && resolveMediaUrlWithBase("blob:https://www.bahasacerdas.com/abc", SELF) === "blob:https://www.bahasacerdas.com/abc"
  && resolveMediaUrlWithBase("data:image/png;base64,AAAA", SELF) === "data:image/png;base64,AAAA");
ok("A10 isSupabaseCloudUrl", isSupabaseCloudUrl(CLOUD) && !isSupabaseCloudUrl(`${SELF}/storage/v1/object/public/a.png`)
  && !isSupabaseCloudUrl("https://supabase.co.evil.example/a.png"));

// ── B ──
ok("B1 URL Storage self-host → unoptimized", isStorageMediaUrl(`${SELF}/storage/v1/object/public/images/a.png`));
ok("B2 URL Storage Cloud → unoptimized", isStorageMediaUrl(CLOUD));
ok("B3 path relatif /storage/v1 → unoptimized", isStorageMediaUrl("/storage/v1/object/public/a.png"));
ok("B4 unsplash/aset lokal tetap dioptimasi", !isStorageMediaUrl("https://images.unsplash.com/x") && !isStorageMediaUrl("/images/a.png"));

// ── C ──
const v = (input: Parameters<typeof coverJenis>[0]) => coverJenis(input).variant;
ok("C1 PUISI → puisi", v({ type: "PUISI" }) === "puisi" && coverJenis({ type: "puisi" }).label === "Karya Puisi");
ok("C2 tag 'karya puisi' pada artikel → puisi", v({ type: "ARTIKEL", tags: ["karya puisi"] }) === "puisi");
ok("C3 PANTUN/SYAIR/GURINDAM → sastra", ["PANTUN", "SYAIR", "GURINDAM"].every((t) => v({ type: t }) === "sastra"));
ok("C4 CERPEN/ANEKDOT → prosa", v({ type: "CERPEN" }) === "prosa" && v({ type: "ANEKDOT" }) === "prosa");
ok("C5 OPINI/SLOGAN → opini", v({ type: "OPINI" }) === "opini" && v({ type: "SLOGAN" }) === "opini");
ok("C6 tanpa jenis → artikel (default) / karya (fallback karya)",
  v({}) === "artikel" && v({ fallback: "karya" }) === "karya" && v({ type: "KARYA_BEBAS" }) === "karya");
ok("C7 semua varian dikenal", COVER_VARIANTS.length === 6);
ok("C8 seed deterministik", coverSeed("Di Pagi Kau Pergi") === coverSeed("Di Pagi Kau Pergi") && coverSeed("a") !== coverSeed("b"));
ok("C9 judul kosong → 'Tanpa Judul'", coverTitle("  ") === "Tanpa Judul");

// ── D ──
const html = (title: string, type?: string) =>
  renderToStaticMarkup(React.createElement(GeneratedCover, { title, author: "Guru Contoh", type }));
const a = html("Di Pagi Kau Pergi", "PUISI");
ok("D1 render deterministik", a === html("Di Pagi Kau Pergi", "PUISI"));
ok("D2 varian + aria-label", a.includes("bc-cover--puisi") && a.includes('role="img"') && a.includes("Sampul Karya Puisi: Di Pagi Kau Pergi, oleh Guru Contoh"));
ok("D3 memuat merek, judul, penulis", a.includes("BahasaCerdas") && a.includes("Di Pagi Kau Pergi") && a.includes("oleh Guru Contoh"));
const x = html('<img src=x onerror="alert(1)"><script>alert(1)</script>', "CERPEN");
ok("D4 judul berbahaya di-escape (tanpa tag mentah)", !x.includes("<script") && !x.includes("<img") && x.includes("&lt;script&gt;"));
ok("D5 tanpa request eksternal (tanpa src/href http)", !/(src|href)="https?:/.test(a));

// ── E ──
const css = read("app/globals.css");
const start = css.indexOf(".bc-cover");
const block = start >= 0 ? css.slice(start) : "";
ok("E1 CSS .bc-cover ada", start >= 0);
ok("E2 CSS sampul tanpa hex/rgb mentah", !/#[0-9a-f]{3,8}\b|rgba?\(/i.test(block.replace(/\/\*[\s\S]*?\*\//g, "")));
ok("E3 semua varian punya gradien", COVER_VARIANTS.every((name) => block.includes(`.bc-cover--${name}`)));
ok("E4 warna dari token (ikut mode gelap)", block.includes("var(--clr-") && block.includes("var(--bc-grad-brand)"));
const comp = read("components/shared/GeneratedCover.tsx");
ok("E5 komponen tanpa hex & tanpa dangerouslySetInnerHTML", !/#[0-9a-f]{6}\b/i.test(comp) && !comp.includes("dangerouslySetInnerHTML"));

// ── F ──
const callSites: [string, RegExp][] = [
  ["components/shared/ArticleCoverLightbox.tsx", /cover=\{cover\}/],
  ["app/artikel/page.tsx", /cover=\{\{/],
  ["components/guru/GuruBerkarya.tsx", /cover=\{\{/],
  ["app/(dashboard)/guru/karya/page.tsx", /cover=\{\{/],
  ["components/student-karya/KaryaFeed.tsx", /cover=\{\{/],
  ["components/student-karya/FeaturedWorks.tsx", /cover=\{\{/],
  ["app/(dashboard)/murid/karya/[id]/page.tsx", /cover=\{\{/],
  ["app/arena/feed/[id]/page.tsx", /cover=\{\{/],
];
for (const [file, re] of callSites) ok(`F ${file} memakai sampul cadangan`, re.test(read(file)));
ok("F artikel/[slug] OG pakai resolveMediaUrl", /resolveMediaUrl\(artikel\.coverImage\)/.test(read("app/artikel/[slug]/page.tsx")));
ok("F SiaranBanner: Storage tidak lewat optimizer", /unoptimized=\{isStorageMediaUrl\(gambar\)\}/.test(read("components/arena/SiaranBanner.tsx")));
ok("F arena feed tanpa <img src={karya.coverImage}> mentah", !/<img[^>]*src=\{karya\.coverImage\}/.test(read("app/arena/feed/[id]/page.tsx")));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
