/**
 * Regression (M2b): /api/guru/materi GET/POST/PUT/DELETE dan /api/ai/soal
 * hanya memercayai sesi Supabase. supabaseId dari query/formData/body
 * diabaikan. Mock-only (tanpa jaringan, DB, Supabase).
 *
 *   npx tsx scripts/test-guru-materi-session.ts
 */
import Module from "node:module";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.test";

type U = { id: string; supabaseId: string; email: string; role: string; fullName: string; isFounder: boolean; isPremium: boolean };
type M = { id: string; title: string; uploaderId: string; isPublished: boolean; fileKey: string | null; fileUrl: string | null; fileType: string | null; downloads: number; [k: string]: unknown };
let dbUsers: U[] = [];
let materi: M[] = [];
let session: { id: string; email: string } | null = null;
const events: string[] = [];

const matchWhere = (m: M, w: any): boolean => {
  if (!w) return true;
  if (w.OR && !w.OR.some((c: any) => matchWhere(m, c))) return false;
  if (w.AND && !w.AND.every((c: any) => matchWhere(m, c))) return false;
  if ("isPublished" in w && m.isPublished !== w.isPublished) return false;
  if ("uploaderId" in w && m.uploaderId !== w.uploaderId) return false;
  if (w.fileType?.in && !w.fileType.in.includes(m.fileType)) return false;
  return true;
};
const db = {
  user: {
    findUnique: async ({ where }: any) => dbUsers.find((u) => (where.supabaseId ? u.supabaseId === where.supabaseId : u.id === where.id)) ?? null,
    findMany: async () => dbUsers.filter((u) => u.role === "ADMIN" || u.isFounder).map((u) => ({ id: u.id })),
  },
  materi: {
    findMany: async ({ where }: any) => materi.filter((m) => matchWhere(m, where)),
    count: async ({ where }: any) => materi.filter((m) => matchWhere(m, where)).length,
    findUnique: async ({ where }: any) => materi.find((m) => m.id === where.id) ?? null,
    create: async ({ data }: any) => { const m = { id: `m-new-${materi.length}`, downloads: 0, ...data }; materi.push(m); events.push(`create:${data.uploaderId}`); return m; },
    update: async ({ where, data }: any) => { const m = materi.find((x) => x.id === where.id)!; Object.assign(m, data); events.push(`update:${where.id}:${Object.keys(data).sort().join("+")}`); return m; },
    delete: async ({ where }: any) => { materi = materi.filter((m) => m.id !== where.id); events.push(`delete:${where.id}`); return {}; },
  },
  materiDownload: { count: async () => 0 },
  notifikasi: { createMany: async () => ({ count: 0 }) },
  soal: { createMany: async () => ({ count: 0 }) },
};
const storageRemoved: string[] = [];
const serverClient = {
  auth: { getUser: async () => ({ data: { user: session }, error: null }) },
  storage: { from: (b: string) => ({ remove: async (keys: string[]) => { storageRemoved.push(...keys.map((k) => `${b}:${k}`)); return {}; } }) },
};

const orig = (Module as any)._load;
(Module as any)._load = function (name: string, parent: unknown, isMain: boolean) {
  if (name === "@/lib/db") return { db };
  if (name === "@/lib/supabase/server") return {
    createClient: async () => serverClient,
    getUser: async () => (session ? dbUsers.find((u) => u.supabaseId === session!.id) ?? null : null),
  };
  if (name === "@/lib/redis") return { default: null, __esModule: true };
  if (name === "@/lib/rate-limit") return { rateLimitRoute: async () => null };
  if (name === "@/lib/upload") return { uploadFileServer: async () => ({ error: "no upload in test" }) };
  if (name === "@/lib/gamification/teacher-xp") return { awardGuruXp: async () => { events.push("xp"); } };
  if (name === "@/lib/premium") return {
    checkAIQuota: async () => { events.push("ai-quota"); return { allowed: false, used: 9, limit: 9 }; },
    recordAIUsage: async () => {},
  };
  return orig(name, parent, isMain);
};

const route = require("../app/api/guru/materi/route");
const soal = require("../app/api/ai/soal/route");

const row = (id: string, role: string, extra: Partial<U> = {}): U =>
  ({ id: `app-${id}`, supabaseId: `auth-${id}`, email: `${id}@x.test`, role, fullName: id, isFounder: false, isPremium: false, ...extra });
const mat = (id: string, uploaderId: string, isPublished: boolean): M =>
  ({ id, title: id, uploaderId, isPublished, fileKey: `${uploaderId}/materi/${id}.pdf`, fileUrl: `https://proj.supabase.test/storage/v1/object/public/documents/${id}.pdf`, fileType: "PDF", downloads: 0 });
function reset() {
  dbUsers = [row("guru", "GURU"), row("guru2", "GURU"), row("murid", "MURID"), row("admin", "ADMIN"), row("founder", "MURID", { isFounder: true }),
    row("umum", "UMUM"), row("mati", "GURU", { email: "deleted-1@account.invalid" })];
  materi = [mat("m-guru-pub", "app-guru", true), mat("m-guru-priv", "app-guru", false), mat("m-guru2-priv", "app-guru2", false)];
  session = null; events.length = 0; storageRemoved.length = 0;
}
const as = (id: string | null) => { session = id ? { id: `auth-${id}`, email: `${id}@x.test` } : null; };
const req = (url: string, method: string, body?: object) =>
  new NextRequest(`https://app.test${url}`, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return new NextRequest("https://app.test/api/guru/materi", { method: "POST", body: fd });
};
const okFile = (key: string) => ({ fileKey: key, fileUrl: `https://proj.supabase.test/storage/v1/object/public/documents/${key}`, fileType: "PDF" });

let failed = 0;
async function check(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`PASS ${name}`); } catch (e: any) { failed++; console.log(`FAIL ${name}\n     -> ${e?.message ?? e}`); }
}
function expect(c: unknown, msg: string) { if (!c) throw new Error(msg); }

async function main() {
  console.log("\n== Penyerang tanpa sesi + supabaseId korban ==");
  await check("GET ?supabaseId=korban tanpa sesi → 401 (bukan daftar materi privat korban)", async () => {
    reset();
    const r = await route.GET(req("/api/guru/materi?supabaseId=auth-guru", "GET"));
    const b = await r.json();
    expect(r.status === 401 && !b.data, `status ${r.status} body=${JSON.stringify(b).slice(0, 200)}`);
  });
  await check("POST formData supabaseId=korban tanpa sesi → 401, tidak ada materi dibuat", async () => {
    reset();
    const r = await route.POST(form({ supabaseId: "auth-guru", title: "palsu", ...okFile("auth-guru/materi/x.pdf") }));
    expect(r.status === 401 && !events.some((e) => e.startsWith("create")), `status ${r.status} events=${events}`);
  });
  await check("PUT body supabaseId=korban tanpa sesi → 401, materi korban tidak berubah", async () => {
    reset();
    const r = await route.PUT(req("/api/guru/materi", "PUT", { supabaseId: "auth-guru", id: "m-guru-priv", title: "dibajak" }));
    expect(r.status === 401 && !events.some((e) => e.startsWith("update")), `status ${r.status} events=${events}`);
  });
  await check("DELETE ?supabaseId=korban tanpa sesi → 401, materi & file korban utuh", async () => {
    reset();
    const r = await route.DELETE(req("/api/guru/materi?id=m-guru-priv&supabaseId=auth-guru", "DELETE"));
    expect(r.status === 401 && materi.some((m) => m.id === "m-guru-priv") && storageRemoved.length === 0, `status ${r.status}`);
  });
  await check("ai/soal body supabaseId=korban tanpa sesi → 401, kuota korban tidak tersentuh", async () => {
    reset();
    const r = await soal.POST(req("/api/ai/soal", "POST", { supabaseId: "auth-guru", topic: "x" }));
    expect(r.status === 401 && !events.includes("ai-quota"), `status ${r.status} events=${events}`);
  });

  console.log("\n== Sesi milik user lain + supabaseId korban (diabaikan) ==");
  await check("guru2 + ?supabaseId=guru → GET hanya melihat publik + miliknya sendiri", async () => {
    reset(); as("guru2");
    const r = await route.GET(req("/api/guru/materi?supabaseId=auth-guru", "GET"));
    const ids = (await r.json()).data.map((m: M) => m.id).sort().join(",");
    expect(r.status === 200 && ids === "m-guru-pub,m-guru2-priv", `ids=${ids}`);
  });
  await check("guru2 + body supabaseId=guru → PUT materi guru → 404 (bukan pemilik)", async () => {
    reset(); as("guru2");
    const r = await route.PUT(req("/api/guru/materi", "PUT", { supabaseId: "auth-guru", id: "m-guru-priv", title: "x" }));
    expect(r.status === 404 && !events.some((e) => e.startsWith("update")), `status ${r.status}`);
  });
  await check("guru2 + ?supabaseId=guru → DELETE materi guru → 404", async () => {
    reset(); as("guru2");
    const r = await route.DELETE(req("/api/guru/materi?id=m-guru-priv&supabaseId=auth-guru", "DELETE"));
    expect(r.status === 404 && materi.length === 3, `status ${r.status}`);
  });
  await check("guru2 + formData supabaseId=guru → POST tercatat atas nama guru2", async () => {
    reset(); as("guru2");
    const r = await route.POST(form({ supabaseId: "auth-guru", title: "punya guru2", tema: "t", isPublished: "true", ...okFile("auth-guru2/materi/a.pdf") }));
    expect(r.status === 201 && events.includes("create:app-guru2") && !events.includes("create:app-guru"), `status ${r.status} events=${events}`);
  });

  console.log("\n== Peran: MURID/UMUM 403, tombstone 401 ==");
  for (const id of ["murid", "umum"]) {
    await check(`${id} bersesi → GET/POST/PUT/DELETE 403 "Khusus guru."`, async () => {
      reset(); as(id);
      const rs = [
        await route.GET(req("/api/guru/materi", "GET")),
        await route.POST(form({ title: "x", ...okFile(`auth-${id}/materi/a.pdf`) })),
        await route.PUT(req("/api/guru/materi", "PUT", { id: "m-guru-priv", title: "x" })),
        await route.DELETE(req("/api/guru/materi?id=m-guru-priv", "DELETE")),
      ];
      expect(rs.every((r) => r.status === 403) && events.length === 0, `statuses ${rs.map((r) => r.status)}`);
    });
  }
  await check("akun tombstone (@account.invalid) → 401", async () => {
    reset(); as("mati");
    const r = await route.GET(req("/api/guru/materi", "GET"));
    expect(r.status === 401, `status ${r.status}`);
  });
  await check("sesi tanpa row DB → 401", async () => {
    reset(); session = { id: "auth-ghost", email: "ghost@x.test" };
    const r = await route.GET(req("/api/guru/materi", "GET"));
    expect(r.status === 401, `status ${r.status}`);
  });

  console.log("\n== Alur guru normal (list, upload, edit, publish, delete) ==");
  for (const id of ["guru", "admin", "founder"]) {
    await check(`${id} → GET 200 dengan quota & folderCounts`, async () => {
      reset(); as(id);
      const r = await route.GET(req("/api/guru/materi?page=1&limit=24&sort=recent", "GET"));
      const b = await r.json();
      expect(r.status === 200 && Array.isArray(b.data) && b.quota && b.folderCounts, `status ${r.status}`);
    });
  }
  await check("guru upload pre-upload (key = supabaseId/...) + isPublished → 201 + XP", async () => {
    reset(); as("guru");
    const r = await route.POST(form({ title: "Modul", tema: "Puisi", grade: "SMP Kelas 7", isPublished: "true", ...okFile("auth-guru/materi/123-abc.pdf") }));
    const b = await r.json();
    expect(r.status === 201 && b.materi?.uploaderId === "app-guru" && b.materi?.fileType === "PDF" && events.includes("xp"), `status ${r.status} ${JSON.stringify(b)}`);
  });
  await check("guru upload PPTX huruf kecil diterima & dinormalisasi", async () => {
    reset(); as("guru");
    const r = await route.POST(form({ title: "Slide", fileKey: "auth-guru/materi/s.pptx", fileUrl: "https://proj.supabase.test/storage/v1/object/public/documents/auth-guru/materi/s.pptx", fileType: "pptx" }));
    const b = await r.json();
    expect(r.status === 201 && b.materi?.fileType === "PPTX", `status ${r.status} ${JSON.stringify(b)}`);
  });
  await check("guru upload tanpa file (konten teks saja) tetap 201", async () => {
    reset(); as("guru");
    const r = await route.POST(form({ title: "Teks", content: "isi" }));
    expect(r.status === 201, `status ${r.status}`);
  });
  for (const [label, f] of [
    ["fileKey milik guru lain", okFile("auth-guru2/materi/x.pdf")],
    ["fileKey path traversal", okFile("auth-guru/../auth-guru2/x.pdf")],
    ["fileUrl javascript:", { fileKey: "auth-guru/materi/x.pdf", fileUrl: "javascript:alert(1)", fileType: "PDF" }],
    ["fileUrl host lain", { fileKey: "auth-guru/materi/x.pdf", fileUrl: "https://evil.test/storage/v1/object/public/documents/auth-guru/materi/x.pdf", fileType: "PDF" }],
    ["fileUrl bucket lain", { fileKey: "auth-guru/materi/x.pdf", fileUrl: "https://proj.supabase.test/storage/v1/object/public/avatars/x.pdf", fileType: "PDF" }],
    ["fileType EXE", { ...okFile("auth-guru/materi/x.exe"), fileType: "EXE" }],
  ] as const) {
    await check(`guru upload ditolak 400: ${label}`, async () => {
      reset(); as("guru");
      const r = await route.POST(form({ title: "x", ...(f as Record<string, string>) }));
      expect(r.status === 400 && !events.some((e) => e.startsWith("create")), `status ${r.status}`);
    });
  }
  await check("guru PUT miliknya: edit + publish → 200, hanya field yang diizinkan", async () => {
    reset(); as("guru");
    const r = await route.PUT(req("/api/guru/materi", "PUT", { id: "m-guru-priv", title: "Baru", isPublished: true, supabaseId: "auth-guru", uploaderId: "app-guru2", downloads: 9999 }));
    const m = materi.find((x) => x.id === "m-guru-priv")!;
    expect(r.status === 200 && m.title === "Baru" && m.isPublished === true && m.uploaderId === "app-guru" && m.downloads === 0, `status ${r.status} m=${JSON.stringify(m)}`);
    expect(events.includes("update:m-guru-priv:isPublished+title"), `events=${events}`);
  });
  await check("guru DELETE miliknya → 200, file storage miliknya dihapus", async () => {
    reset(); as("guru");
    const r = await route.DELETE(req("/api/guru/materi?id=m-guru-priv", "DELETE"));
    expect(r.status === 200 && !materi.some((m) => m.id === "m-guru-priv") && storageRemoved.includes("documents:app-guru/materi/m-guru-priv.pdf"), `status ${r.status} removed=${storageRemoved}`);
  });
  await check("ai/soal dengan sesi guru tetap masuk ke cek kuota (429 dari mock)", async () => {
    reset(); as("guru");
    const r = await soal.POST(req("/api/ai/soal", "POST", { topic: "x" }));
    expect(r.status === 429 && events.includes("ai-quota"), `status ${r.status}`);
  });

  console.log("\n== Statis ==");
  const noComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const src = noComments(readFileSync("app/api/guru/materi/route.ts", "utf8") + readFileSync("app/api/ai/soal/route.ts", "utf8"));
  await check("route tidak lagi membaca supabaseId dari request", async () => {
    expect(!/\.get\("supabaseId"\)|body\.supabaseId/.test(src), "masih ada pembacaan supabaseId");
  });
  const page = noComments(readFileSync("app/(dashboard)/guru/materi-ajar/page.tsx", "utf8"));
  await check("halaman materi-ajar tidak mengirim supabaseId", async () => {
    expect(!/supabaseId/.test(page), "page masih menyebut supabaseId");
  });

  console.log(failed ? `\n${failed} FAIL` : "\nSemua PASS");
  process.exit(failed ? 1 : 0);
}
main();
