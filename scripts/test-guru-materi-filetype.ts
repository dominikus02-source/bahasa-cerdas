/**
 * Regression: /api/guru/materi GET 500 (PrismaClientValidationError
 * "Invalid value for argument `in`. Expected FileType.").
 *
 * Penyebab: filter memakai "PPT"/"DOC" yang tidak ada di enum `FileType`
 * (PDF | DOCX | PPTX | XLSX | MP4 | ZIP). Tes ini:
 *   1. memastikan semua nilai yang dikirim ke Prisma ada di enum hasil `prisma generate`;
 *   2. menjalankan route dengan mock DB yang MENOLAK nilai di luar enum (seperti Prisma),
 *      memakai parameter yang sama dengan halaman guru & composer kelas di produksi;
 *   3. memastikan page/limit/sort tidak valid tidak lolos sebagai NaN ke Prisma;
 *   4. memastikan aturan akses guru tetap (tanpa sesi 401, murid 403).
 *
 *   npx tsx scripts/test-guru-materi-filetype.ts
 */
import Module from "node:module";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { FileType } from "@prisma/client";
import {
  MATERI_DB_SEMUA_TIPE,
  MATERI_DB_TYPE,
  MATERI_FOLDER_TYPES,
  MATERI_SEMUA_TIPE,
  materiFolderTypes,
} from "../lib/materi/file-types";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.test";

const ENUM = new Set<string>(Object.values(FileType));
let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`PASS ${name}`);
  else { failed++; console.log(`FAIL ${name}${detail ? `\n     -> ${detail}` : ""}`); }
}

// ── 1. Nilai statis vs enum Prisma ──────────────────────────────────────────
console.log("\n== Nilai fileType yang dikirim ke Prisma ada di enum FileType ==");
check("enum FileType tidak berisi PPT/DOC (asumsi tes masih benar)", !ENUM.has("PPT") && !ENUM.has("DOC"), [...ENUM].join(","));
check("MATERI_DB_SEMUA_TIPE ⊆ FileType", MATERI_DB_SEMUA_TIPE.every((t) => ENUM.has(t)), MATERI_DB_SEMUA_TIPE.join(","));
for (const [f, ts] of Object.entries(MATERI_FOLDER_TYPES)) {
  check(`folder ${f} ⊆ FileType`, ts.length > 0 && ts.every((t) => ENUM.has(t)), ts.join(","));
}
for (const t of MATERI_SEMUA_TIPE) {
  check(`tipe unggah ${t} dipetakan ke enum DB`, ENUM.has(MATERI_DB_TYPE[t]), String(MATERI_DB_TYPE[t]));
}
check("folder tak dikenal / prototype → null", materiFolderTypes("XLS") === null && materiFolderTypes("__proto__") === null && materiFolderTypes("constructor") === null);

const src = readFileSync(new URL("../app/api/guru/materi/route.ts", import.meta.url), "utf8");
check("route tidak memakai MATERI_SEMUA_TIPE (tipe ekstensi) di filter `in:`", !/in:\s*MATERI_SEMUA_TIPE/.test(src));

// ── 2. Route dengan mock DB yang memvalidasi enum seperti Prisma ───────────
type M = { id: string; title: string; uploaderId: string; isPublished: boolean; fileType: string | null; grade: string | null; downloads: number; createdAt: Date; [k: string]: unknown };
const users = [
  { id: "app-guru", supabaseId: "auth-guru", email: "guru@x.test", role: "GURU", fullName: "Guru", isFounder: false, isPremium: false },
  { id: "app-murid", supabaseId: "auth-murid", email: "murid@x.test", role: "MURID", fullName: "Murid", isFounder: false, isPremium: false },
];
const materi: M[] = [
  { id: "m-pdf", title: "PDF", uploaderId: "app-guru", isPublished: true, fileType: "PDF", grade: "SD Kelas 4", downloads: 0, createdAt: new Date() },
  { id: "m-pptx", title: "Slide", uploaderId: "app-guru", isPublished: true, fileType: "PPTX", grade: "SD Kelas 5", downloads: 0, createdAt: new Date() },
  { id: "m-docx", title: "Word", uploaderId: "app-guru", isPublished: false, fileType: "DOCX", grade: "SMP Kelas 7", downloads: 0, createdAt: new Date() },
];
let session: { id: string; email: string } | null = null;
const created: any[] = [];

class FakePrismaValidationError extends Error { name = "PrismaClientValidationError"; }
function validasi(w: any, path = "where"): void {
  if (!w || typeof w !== "object") return;
  if (Array.isArray(w)) { w.forEach((x, i) => validasi(x, `${path}[${i}]`)); return; }
  for (const [k, v] of Object.entries(w)) {
    if (k === "fileType") {
      const vals = v && typeof v === "object" ? ((v as any).in ?? [(v as any).equals]).filter((x: unknown) => x !== undefined) : [v];
      for (const x of vals) if (x !== null && !ENUM.has(String(x))) throw new FakePrismaValidationError(`Invalid value for argument \`in\`. Expected FileType. (${path}.fileType=${x})`);
    } else if (k === "skip" || k === "take") {
      if (v !== undefined && !Number.isInteger(v)) throw new FakePrismaValidationError(`${k} must be Int, got ${v}`);
    } else if (k === "orderBy") {
      // orderBy diperiksa terpisah
    } else validasi(v, `${path}.${k}`);
  }
}
const match = (m: M, w: any): boolean => {
  if (!w) return true;
  if (w.OR && !w.OR.some((c: any) => match(m, c))) return false;
  if (w.AND && !w.AND.every((c: any) => match(m, c))) return false;
  if ("isPublished" in w && m.isPublished !== w.isPublished) return false;
  if ("uploaderId" in w && m.uploaderId !== w.uploaderId) return false;
  if (w.fileType?.in && !w.fileType.in.includes(m.fileType)) return false;
  return true;
};
const db = {
  user: {
    findUnique: async ({ where }: any) => users.find((u) => (where.supabaseId ? u.supabaseId === where.supabaseId : u.id === where.id)) ?? null,
    findMany: async () => [],
  },
  materi: {
    findMany: async (args: any) => { validasi(args.where); validasi({ skip: args.skip, take: args.take }); return materi.filter((m) => match(m, args.where)).slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? 1e9)); },
    count: async (args: any) => { validasi(args?.where); return materi.filter((m) => match(m, args?.where)).length; },
    create: async ({ data }: any) => { validasi(data, "data"); const m = { id: `m-new-${created.length}`, downloads: 0, ...data }; created.push(m); return m; },
  },
  materiDownload: { count: async () => 0 },
  notifikasi: { createMany: async () => ({ count: 0 }) },
};
const orig = (Module as any)._load;
(Module as any)._load = function (name: string, parent: unknown, isMain: boolean) {
  if (name === "@/lib/db") return { db };
  if (name === "@/lib/supabase/server") return {
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: session }, error: null }) }, storage: { from: () => ({ remove: async () => ({}) }) } }),
    getUser: async () => (session ? users.find((u) => u.supabaseId === session!.id) ?? null : null),
  };
  if (name === "@/lib/redis") return { default: null, __esModule: true };
  if (name === "@/lib/rate-limit") return { rateLimitRoute: async () => null };
  if (name === "@/lib/upload") return { uploadFileServer: async () => ({ error: "no upload in test" }) };
  if (name === "@/lib/gamification/teacher-xp") return { awardGuruXp: async () => {} };
  return orig(name, parent, isMain);
};
const route = require("../app/api/guru/materi/route");
const get = (qs: string) => route.GET(new NextRequest(`https://app.test/api/guru/materi?${qs}`, { method: "GET" }));
const as = (id: string | null) => { session = id ? { id: `auth-${id}`, email: `${id}@x.test` } : null; };

async function main() {
  console.log("\n== GET dengan parameter produksi (guru) → 200 + data ==");
  as("guru");
  const kasus: [string, number][] = [
    ["page=1&limit=24&sort=recent", 3],
    ["page=1&limit=24&sort=popular", 3],
    ["page=1&limit=24&sort=recent&level=SD", -1],
    ["page=1&limit=24&sort=recent&folder=PPT", 1],
    ["page=1&limit=24&sort=recent&folder=DOC", 1],
    ["page=1&limit=24&sort=recent&folder=PDF", 1],
    ["page=1&limit=24&sort=recent&folder=ppt", 1],
    ["page=1&limit=24&sort=recent&folder=XLS", 3],
    ["limit=40", 3], // ClassroomComposer
    ["page=abc&limit=xyz&sort=hapus", 3], // dulu NaN → Prisma error
    ["page=-5&limit=100000", 3],
  ];
  for (const [qs, n] of kasus) {
    try {
      const r = await get(qs);
      const b = await r.json();
      const ok = r.status === 200 && Array.isArray(b.data) && (n < 0 || b.data.length === n) && b.folderCounts;
      check(`GET ?${qs} → 200${n >= 0 ? ` (${n} materi)` : ""}`, !!ok, `status ${r.status} n=${b.data?.length} ${JSON.stringify(b).slice(0, 200)}`);
      if (qs === "page=1&limit=24&sort=recent") {
        check("folderCounts menghitung PPT/PDF/DOC dari enum DB", b.folderCounts.PPT === 1 && b.folderCounts.PDF === 1 && b.folderCounts.DOC === 1, JSON.stringify(b.folderCounts));
      }
    } catch (e: any) { check(`GET ?${qs} → 200`, false, e?.message ?? String(e)); }
  }

  console.log("\n== POST unggahan .ppt/.doc disimpan dengan nilai enum DB ==");
  for (const [ext, want] of [["ppt", "PPTX"], ["doc", "DOCX"], ["pptx", "PPTX"], ["pdf", "PDF"]] as const) {
    const fd = new FormData();
    fd.set("title", `f.${ext}`);
    fd.set("fileKey", `auth-guru/materi/f.${ext}`);
    fd.set("fileUrl", `https://proj.supabase.test/storage/v1/object/public/documents/auth-guru/materi/f.${ext}`);
    fd.set("fileType", ext);
    try {
      const r = await route.POST(new NextRequest("https://app.test/api/guru/materi", { method: "POST", body: fd }));
      const b = await r.json();
      check(`POST pre-upload .${ext} → 201 fileType=${want}`, r.status === 201 && b.materi?.fileType === want, `status ${r.status} ${JSON.stringify(b).slice(0, 200)}`);
    } catch (e: any) { check(`POST pre-upload .${ext}`, false, e?.message ?? String(e)); }
  }

  console.log("\n== Aturan akses guru tetap ==");
  as(null);
  check("tanpa sesi → 401", (await get("page=1&limit=24")).status === 401);
  as("murid");
  check("murid → 403", (await get("page=1&limit=24")).status === 403);

  console.log(failed ? `\n${failed} FAIL` : "\nSEMUA PASS");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
