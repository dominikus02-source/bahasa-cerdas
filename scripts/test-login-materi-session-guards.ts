/**
 * Regression: password login never provisions from user_metadata (PR-B) and
 * guru materi / perangkat-ajar endpoints require a real session (PR-C).
 * Mock-only (no network, no DB, no Supabase).
 *
 *   npx tsx scripts/test-login-materi-session-guards.ts
 *
 * Login matrix: existing MURID / GURU / ADMIN / founder / UMUM row, Auth user
 * without row (metadata GURU / ADMIN / none), tombstoned, wrong password.
 */
import Module from "node:module";
import { NextRequest } from "next/server";

type U = { id: string; supabaseId: string; email: string; role: string; fullName: string; isFounder: boolean; isPremium: boolean };
let dbUsers: U[] = [];
let session: { id: string; email: string } | null = null;
let signIn: { user: { id: string; email: string; user_metadata: Record<string, unknown> } | null; error: any } = { user: null, error: null };
const materi = [
  { id: "m-pub", fileUrl: "https://files.test/pub.pdf", fileType: "PDF", title: "Pub", isPublished: true, uploaderId: "app-guru", downloads: 0 },
  { id: "m-priv", fileUrl: "https://files.test/priv.pdf", fileType: "PDF", title: "Priv", isPublished: false, uploaderId: "app-guru", downloads: 0 },
];
const downloads: { userId: string; materiId: string }[] = [];
const events: string[] = [];

const db = {
  user: {
    findUnique: async ({ where }: any) =>
      dbUsers.find((u) => (where.supabaseId ? u.supabaseId === where.supabaseId : u.id === where.id)) ?? null,
    findFirst: async ({ where }: any) =>
      dbUsers.find((u) => u.email === where.email && (!where.NOT || u.id !== where.NOT.id)) ?? null,
    create: async ({ data }: any) => {
      const u = { id: `app-new-${dbUsers.length}`, isFounder: false, isPremium: false, ...data };
      dbUsers.push(u);
      events.push(`db-create:${data.role}`);
      return u;
    },
    update: async ({ where, data }: any) => {
      const u = dbUsers.find((x) => x.id === where.id)!;
      Object.assign(u, data);
      events.push(`db-update:${Object.keys(data).join("+")}`);
      return u;
    },
  },
  materi: {
    findFirst: async ({ where }: any) =>
      materi.find((m) => m.id === where.id && where.OR.some((c: any) => (c.isPublished ? m.isPublished : m.uploaderId === c.uploaderId))) ?? null,
    update: async ({ where }: any) => {
      const m = materi.find((x) => x.id === where.id);
      if (!m) throw new Error("not found");
      m.downloads++;
      events.push(`materi-inc:${where.id}`);
      return m;
    },
  },
  materiDownload: {
    findUnique: async ({ where }: any) =>
      downloads.find((d) => d.userId === where.userId_materiId.userId && d.materiId === where.userId_materiId.materiId) ?? null,
    count: async ({ where }: any) => downloads.filter((d) => d.userId === where.userId).length,
    create: async ({ data }: any) => { downloads.push(data); events.push(`download:${data.userId}:${data.materiId}`); return data; },
  },
};
const loginClient = {
  auth: {
    signInWithPassword: async () => (signIn.error ? { data: { user: null, session: null }, error: signIn.error } : { data: { user: signIn.user, session: { access_token: "x" } }, error: null }),
    signOut: async () => { events.push("signout"); return { error: null }; },
  },
};
const serverClient = { auth: { getUser: async () => ({ data: { user: session }, error: null }) } };

const orig = (Module as any)._load;
(Module as any)._load = function (name: string, parent: unknown, isMain: boolean) {
  if (name === "@/lib/db") return { db };
  if (name === "@/lib/supabase/server-login") return { createLoginClient: async () => loginClient };
  if (name === "@/lib/supabase/server") return { createClient: async () => serverClient };
  if (name === "@/lib/redis") return { default: null, __esModule: true };
  if (name === "@/lib/rate-limit") return { rateLimitRoute: async () => null };
  if (name === "@/lib/upload") return { uploadFileServer: async () => ({}) };
  if (name === "@/lib/gamification/teacher-xp") return { awardGuruXp: async () => {} };
  return orig(name, parent, isMain);
};

const login = require("../app/api/auth/login/route");
const download = require("../app/api/guru/materi/[id]/download/route");
const materiRoute = require("../app/api/guru/materi/route");
const perangkat = require("../app/api/guru/perangkat-ajar/route");

const json = (url: string, method: string, body?: object) =>
  new NextRequest(`https://app.test${url}`, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
const row = (id: string, role: string, extra: Partial<U> = {}): U =>
  ({ id: `app-${id}`, supabaseId: `auth-${id}`, email: `${id}@x.test`, role, fullName: id, isFounder: false, isPremium: false, ...extra });
const authUser = (id: string, meta: Record<string, unknown> = {}, email = `${id}@x.test`) => ({ id: `auth-${id}`, email, user_metadata: meta });
function reset() {
  dbUsers = [row("murid", "MURID"), row("guru", "GURU"), row("admin", "ADMIN"), row("founder", "GURU", { isFounder: true }),
    row("umum", "UMUM"), row("mati", "MURID", { email: "deleted-1@account.invalid" })];
  session = null; signIn = { user: null, error: null }; events.length = 0; downloads.length = 0;
  materi.forEach((m) => (m.downloads = 0));
}

let failed = 0;
async function check(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (e: any) { failed++; console.log(`FAIL ${name}\n     -> ${e?.message ?? e}`); }
}
function expect(cond: unknown, msg: string) { if (!cond) throw new Error(msg); }
async function doLogin(id: string, meta: Record<string, unknown> = {}, email?: string) {
  signIn = { user: authUser(id, meta, email), error: null };
  const r = await login.POST(json("/api/auth/login", "POST", { email: email ?? `${id}@x.test`, password: "pw-12345678" }));
  return { status: r.status, body: await r.json() };
}

async function main() {
  console.log("\n== PR-B: password login matrix ==");
  for (const [id, role, founder] of [["murid", "MURID", false], ["guru", "GURU", false], ["admin", "ADMIN", false], ["founder", "GURU", true], ["umum", "UMUM", false]] as const) {
    await check(`existing ${id} row → 200, role ${role}${founder ? " + isFounder" : ""} preserved, no create`, async () => {
      reset();
      // Hostile metadata must never change an existing account.
      const { status, body } = await doLogin(id, { role: "ADMIN" });
      expect(status === 200 && body.user?.role === role && body.user?.isFounder === founder, `status ${status} body=${JSON.stringify(body)}`);
      expect(!events.some((e) => e.startsWith("db-create")), `events=${events.join(",")}`);
    });
  }
  await check("existing row with changed Auth email → email synced, role kept", async () => {
    reset();
    const { status, body } = await doLogin("guru", {}, "guru.baru@x.test");
    expect(status === 200 && body.user?.role === "GURU" && body.user?.email === "guru.baru@x.test", JSON.stringify(body));
  });
  for (const meta of [{ role: "GURU" }, { role: "ADMIN" }, {}]) {
    await check(`Auth user WITHOUT row, metadata ${JSON.stringify(meta)} → no DB row, needsRole → /auth/pilih-peran`, async () => {
      reset();
      const { status, body } = await doLogin("baru", meta);
      expect(!events.some((e) => e.startsWith("db-create")), `row created from metadata: ${events.join(",")}`);
      expect(status === 200 && body.user === null && body.needsRole === true && body.redirect === "/auth/pilih-peran", `status ${status} body=${JSON.stringify(body)}`);
    });
  }
  await check("tombstoned account → 403 + local signOut", async () => {
    reset();
    const { status } = await doLogin("mati", {}, "deleted-1@account.invalid");
    expect(status === 403 && events.includes("signout"), `status ${status} events=${events.join(",")}`);
  });
  await check("wrong password → Supabase error status + friendly message", async () => {
    reset();
    signIn = { user: null, error: { message: "Invalid login credentials", status: 400 } };
    const r = await login.POST(json("/api/auth/login", "POST", { email: "guru@x.test", password: "salah" }));
    const body = await r.json();
    expect(r.status === 400 && body.error === "Email atau kata sandi salah", `status ${r.status} ${JSON.stringify(body)}`);
  });

  console.log("\n== PR-C: materi download (M2) ==");
  await check("no session + victim supabaseId in body → 401, nothing recorded", async () => {
    reset();
    const r = await download.POST(json("/api/guru/materi/m-priv/download", "POST", { supabaseId: "auth-guru" }), { params: Promise.resolve({ id: "m-priv" }) });
    const body = await r.json();
    expect(r.status === 401 && !body.fileUrl, `status ${r.status} body=${JSON.stringify(body)}`);
    expect(downloads.length === 0, `victim quota consumed: ${events.join(",")}`);
  });
  await check("session MURID + forged supabaseId → acts as session user only", async () => {
    reset();
    session = { id: "auth-murid", email: "murid@x.test" };
    const r = await download.POST(json("/api/guru/materi/m-priv/download", "POST", { supabaseId: "auth-guru" }), { params: Promise.resolve({ id: "m-priv" }) });
    expect(r.status === 404, `status ${r.status} (victim's unpublished file must not be reachable)`);
  });
  await check("session GURU (legit caller, body still carries own supabaseId) → 200 fileUrl + quota", async () => {
    reset();
    session = { id: "auth-guru", email: "guru@x.test" };
    const r = await download.POST(json("/api/guru/materi/m-pub/download", "POST", { supabaseId: "auth-guru" }), { params: Promise.resolve({ id: "m-pub" }) });
    const body = await r.json();
    expect(r.status === 200 && body.fileUrl === "https://files.test/pub.pdf" && body.used === 1, `status ${r.status} ${JSON.stringify(body)}`);
  });

  console.log("\n== PR-C: materi PATCH counter (L2) ==");
  await check("no session → 401, counter unchanged", async () => {
    reset();
    const r = await materiRoute.PATCH(json("/api/guru/materi", "PATCH", { id: "m-pub" }));
    expect(r.status === 401 && materi[0].downloads === 0, `status ${r.status} downloads=${materi[0].downloads}`);
  });
  await check("with session → ok, counter +1", async () => {
    reset();
    session = { id: "auth-guru", email: "guru@x.test" };
    const r = await materiRoute.PATCH(json("/api/guru/materi", "PATCH", { id: "m-pub" }));
    const body = await r.json();
    expect(r.status === 200 && body.ok === true && materi[0].downloads === 1, `status ${r.status} ${JSON.stringify(body)}`);
  });

  console.log("\n== PR-C: perangkat-ajar GET (L1) ==");
  const cases: [string, string | null, number[]][] = [
    ["no session", null, [401]], ["MURID", "murid", [403]], ["UMUM", "umum", [403]], ["tombstoned", "mati", [401]],
    ["GURU", "guru", [200, 503]], ["ADMIN", "admin", [200, 503]], ["founder", "founder", [200, 503]],
  ];
  for (const [label, id, allowed] of cases) {
    await check(`${label} → ${allowed.join("/")}`, async () => {
      reset();
      session = id ? { id: `auth-${id}`, email: `${id}@x.test` } : null;
      const r = await perangkat.GET();
      expect(allowed.includes(r.status), `status ${r.status}`);
      if (r.status === 200) expect(Array.isArray((await r.json()).grades), "grades missing");
    });
  }

  console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL LOGIN/MATERI SESSION GUARD CHECKS PASSED");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error("TEST CRASHED", e); process.exit(1); });
