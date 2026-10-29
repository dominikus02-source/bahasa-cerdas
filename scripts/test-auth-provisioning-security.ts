/**
 * Regression: public account-provisioning endpoints must never adopt, modify,
 * or delete an existing Auth identity, and must never trust client-supplied
 * identity. Mock-only (no network, no DB, no Supabase).
 *
 *   npx tsx scripts/test-auth-provisioning-security.ts
 *
 * Covers security-audit findings C1 (orphan adoption takeover), H1 (rollback
 * deleting a foreign identity), H3 (unauthenticated confirm-email), M1
 * (registerUser trusting formData identity) and the unauthenticated legacy
 * /api/auth/register row-disclosure endpoint.
 */
import Module from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { NextRequest } from "next/server";

type U = { id: string; supabaseId: string; email: string; role: string; fullName: string };
type A = { id: string; email: string; password: string | null; user_metadata: Record<string, unknown> };
let dbUsers: U[] = [];
let authUsers: A[] = [];
let profiles: Record<string, Record<string, unknown>> = {};
let failDbCreate = false;
let sessionUser: { id: string; email: string } | null = null;
const events: string[] = [];

const db = {
  user: {
    findFirst: async ({ where }: any) => dbUsers.find((u) => u.email === where.email) ?? null,
    findUnique: async ({ where }: any) =>
      dbUsers.find((u) => (where.supabaseId ? u.supabaseId === where.supabaseId : u.id === where.id)) ?? null,
    create: async ({ data }: any) => {
      if (failDbCreate || dbUsers.some((u) => u.supabaseId === data.supabaseId || u.email === data.email)) {
        events.push("db-create-failed");
        throw new Error("P2002 unique");
      }
      const u = { id: `app-${dbUsers.length + 1}`, ...data };
      dbUsers.push(u);
      events.push(`db-create:${data.role}:${data.supabaseId}`);
      return u;
    },
    update: async ({ where, data }: any) => {
      const u = dbUsers.find((x) => x.id === where.id)!;
      Object.assign(u, data);
      return u;
    },
  },
  profile: {
    create: async ({ data }: any) => { profiles[data.userId] = { ...data }; return data; },
    upsert: async ({ where, update, create }: any) => {
      profiles[where.userId] = { ...(profiles[where.userId] ?? create), ...update };
      events.push(`profile-upsert:${where.userId}`);
      return profiles[where.userId];
    },
  },
  notifikasi: { createMany: async () => ({ count: 0 }) },
};
const admin = {
  auth: {
    admin: {
      createUser: async ({ email, password, user_metadata }: any) => {
        events.push("auth-create");
        if (authUsers.some((a) => a.email === email)) {
          return { data: { user: null }, error: { message: "A user with this email address has already been registered", status: 422, code: "email_exists" } };
        }
        const a = { id: `auth-${authUsers.length + 1}`, email, password, user_metadata };
        authUsers.push(a);
        return { data: { user: a }, error: null };
      },
      listUsers: async () => { events.push("auth-list"); return { data: { users: authUsers }, error: null }; },
      updateUserById: async (id: string, attrs: any) => {
        const a = authUsers.find((x) => x.id === id);
        if (a && attrs.password) a.password = attrs.password;
        events.push(`auth-update:${id}`);
        return { data: { user: a ?? null }, error: null };
      },
      deleteUser: async (id: string) => {
        authUsers = authUsers.filter((a) => a.id !== id);
        events.push(`auth-delete:${id}`);
        return { error: null };
      },
    },
  },
};
const serverClient = { auth: { getUser: async () => ({ data: { user: sessionUser }, error: null }) } };

const orig = (Module as any)._load;
(Module as any)._load = function (name: string, parent: unknown, isMain: boolean) {
  if (name === "@/lib/db") return { db };
  if (name === "@supabase/supabase-js") return { createClient: () => admin };
  if (name === "@/lib/supabase/server") return { createClient: async () => serverClient, getUser: async () => null };
  if (name === "@/lib/redis") return { default: null, __esModule: true };
  if (name === "@/lib/rate-limit") return { rateLimitRoute: async () => null };
  return orig(name, parent, isMain);
};
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock.supabase.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock";

const root = resolve(__dirname, "..");
const createUser = require("../app/api/auth/create-user/route");
const { registerUser } = require("../app/actions/register");
const post = (url: string, body: object) =>
  new NextRequest(`https://app.test${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const reset = () => { dbUsers = []; authUsers = []; profiles = {}; failDbCreate = false; sessionUser = null; events.length = 0; };
const form = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

let failed = 0;
async function check(name: string, fn: () => Promise<void> | void) {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (e: any) { failed++; console.log(`FAIL ${name}\n     -> ${e?.message ?? e}`); }
}
function expect(cond: unknown, msg: string) { if (!cond) throw new Error(msg); }

async function main() {
  console.log("\n== create-user (C1/H1) ==");
  await check("C1 existing Google identity without DB row -> 409 EMAIL_EXISTS, password untouched", async () => {
    reset();
    authUsers.push({ id: "auth-victim", email: "guru.korban@sekolah.test", password: null, user_metadata: { provider: "google" } });
    const r = await createUser.POST(post("/api/auth/create-user", { email: "guru.korban@sekolah.test", password: "attacker-pw-1", fullName: "Penyerang", role: "GURU" }));
    const body = await r.json();
    expect(r.status === 409, `status ${r.status} (expected 409); events=${events.join(",")}`);
    expect(body.code === "EMAIL_EXISTS", `code ${body.code}`);
    expect(/sudah terdaftar/i.test(body.error) && /Google/.test(body.error) && /Lupa Kata Sandi/i.test(body.error), `message: ${body.error}`);
    expect(authUsers[0].password === null, "victim password was changed");
    expect(dbUsers.length === 0, "a DB row was created for the victim identity");
  });
  await check("C1 no listUsers / updateUserById on any create-user path", async () => {
    expect(!events.some((e) => e === "auth-list" || e.startsWith("auth-update")), `events=${events.join(",")}`);
    const src = readFileSync(resolve(root, "app/api/auth/create-user/route.ts"), "utf8");
    expect(!/listUsers|updateUserById/.test(src), "create-user source still references listUsers/updateUserById");
  });
  await check("H1 Auth email != DB email -> 409 and the foreign Auth identity is NOT deleted", async () => {
    reset();
    authUsers.push({ id: "auth-v2", email: "baru@x.test", password: "victim-pw-1", user_metadata: { role: "GURU" } });
    dbUsers.push({ id: "app-v2", supabaseId: "auth-v2", email: "lama@x.test", role: "GURU", fullName: "V2" });
    const r = await createUser.POST(post("/api/auth/create-user", { email: "baru@x.test", password: "attacker-pw-2", fullName: "X", role: "MURID" }));
    expect(r.status === 409, `status ${r.status} (expected 409); events=${events.join(",")}`);
    expect(!events.some((e) => e.startsWith("auth-delete")), `deleted: ${events.join(",")}`);
    expect(authUsers.length === 1 && authUsers[0].password === "victim-pw-1", "victim identity modified/deleted");
  });
  await check("existing DB email -> 409 EMAIL_EXISTS without touching Auth", async () => {
    reset();
    dbUsers.push({ id: "app-x", supabaseId: "auth-x", email: "ada@x.test", role: "MURID", fullName: "X" });
    const r = await createUser.POST(post("/api/auth/create-user", { email: "ada@x.test", password: "pw-12345678", fullName: "X", role: "MURID" }));
    expect(r.status === 409 && (await r.json()).code === "EMAIL_EXISTS", `status ${r.status}`);
    expect(!events.includes("auth-create"), "Auth createUser was called");
  });
  await check("happy path: new email -> 200, Auth + DB row with chosen role", async () => {
    reset();
    const r = await createUser.POST(post("/api/auth/create-user", { email: "Baru.Guru@X.test", password: "pw-12345678", fullName: "Guru Baru", role: "GURU" }));
    const body = await r.json();
    expect(r.status === 200 && body.userId === "auth-1", `status ${r.status} body=${JSON.stringify(body)}`);
    expect(dbUsers[0]?.role === "GURU" && dbUsers[0]?.email === "baru.guru@x.test", "DB row missing/wrong");
  });
  await check("rollback still deletes the identity THIS request created when the DB write fails", async () => {
    reset();
    failDbCreate = true;
    const r = await createUser.POST(post("/api/auth/create-user", { email: "gagal@x.test", password: "pw-12345678", fullName: "X", role: "MURID" }));
    expect(r.status === 500, `status ${r.status}`);
    expect(events.includes("auth-delete:auth-1") && authUsers.length === 0, `events=${events.join(",")}`);
  });
  await check("role outside GURU/MURID rejected (ADMIN)", async () => {
    reset();
    const r = await createUser.POST(post("/api/auth/create-user", { email: "a@x.test", password: "pw-12345678", fullName: "X", role: "ADMIN" }));
    expect(r.status === 400 && authUsers.length === 0, `status ${r.status}`);
  });

  console.log("\n== confirm-email + legacy register endpoint (H3) ==");
  await check("H3 POST /api/auth/confirm-email removed", () => {
    expect(!existsSync(resolve(root, "app/api/auth/confirm-email/route.ts")), "app/api/auth/confirm-email/route.ts still exists");
  });
  await check("legacy unauthenticated POST /api/auth/register removed", () => {
    expect(!existsSync(resolve(root, "app/api/auth/register/route.ts")), "app/api/auth/register/route.ts still exists");
  });
  await check("no caller references /api/auth/confirm-email or /api/auth/register", () => {
    const out = execSync(
      "git grep -nE \"api/auth/(confirm-email|register)\\b\" -- app components lib hooks public twa src || true",
      { cwd: root, encoding: "utf8" },
    ).trim();
    expect(out === "", `references found:\n${out}`);
  });

  console.log("\n== registerUser server action (M1) ==");
  await check("M1 forged supabaseId/email in formData cannot create or bind an account", async () => {
    reset();
    sessionUser = { id: "auth-attacker", email: "attacker@x.test" };
    dbUsers.push({ id: "app-a", supabaseId: "auth-attacker", email: "attacker@x.test", role: "MURID", fullName: "A" });
    const res = await registerUser(form({ email: "korban@x.test", supabaseId: "00000000-0000-4000-8000-000000000001", fullName: "Korban", role: "GURU", school: "SMA 1" }));
    expect(!events.some((e) => e.startsWith("db-create")), `account created: ${events.join(",")}`);
    expect(dbUsers.length === 1 && dbUsers[0].role === "MURID", "role/row changed");
    expect(res?.ok === true && res.role === "murid", `result ${JSON.stringify(res)} (stored role must win)`);
    expect(events.includes("profile-upsert:app-a") && profiles["app-a"]?.school === "SMA 1", "session user's profile not enriched");
  });
  await check("M1 no session -> error, nothing written (legacy fallback removed)", async () => {
    reset();
    const res = await registerUser(form({ email: "squat@x.test", supabaseId: "00000000-0000-4000-8000-000000000002", fullName: "S", role: "GURU" }));
    expect(res?.error && !res.ok, `result ${JSON.stringify(res)}`);
    expect(dbUsers.length === 0 && !events.some((e) => e.startsWith("db-create") || e.startsWith("profile")), `events=${events.join(",")}`);
  });
  await check("M1 session without DB row -> ROLE_REQUIRED, no account created", async () => {
    reset();
    sessionUser = { id: "auth-google", email: "g@x.test" };
    const res = await registerUser(form({ role: "GURU" }));
    expect(res?.code === "ROLE_REQUIRED" && dbUsers.length === 0, `result ${JSON.stringify(res)} events=${events.join(",")}`);
  });
  await check("M1 role still validated against GURU/MURID allowlist", async () => {
    reset();
    sessionUser = { id: "auth-attacker", email: "attacker@x.test" };
    dbUsers.push({ id: "app-a", supabaseId: "auth-attacker", email: "attacker@x.test", role: "MURID", fullName: "A" });
    const res = await registerUser(form({ role: "ADMIN" }));
    expect(res?.error && !res.ok, `result ${JSON.stringify(res)}`);
  });

  console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL AUTH PROVISIONING SECURITY CHECKS PASSED");
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error("TEST CRASHED", e); process.exit(1); });
