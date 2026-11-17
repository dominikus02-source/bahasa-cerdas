import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import Module from "node:module";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isStudentProvisioningAllowed } from "../lib/auth/student-provisioning";

const databaseUrl = "postgresql://postgres:local_fixture@127.0.0.1:55432/postgres?schema=public";
const authUrl = "http://127.0.0.1:54999";
const signingKey = "ci-only-local-gotrue-fixture-signing-key-student-verification";
const student = {
  email: process.env.BC_TEST_STUDENT_EMAIL?.trim().toLowerCase() || "bc-student-qa-auth@example.test",
  password: "ci-fixture-student-2026",
};
const guardian = {
  email: process.env.BC_TEST_GUARDIAN_EMAIL?.trim().toLowerCase() || "bc-guardian-qa-auth@example.test",
  password: "ci-fixture-guardian-2026",
};
const options = {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(String(input).replace(`${authUrl}/auth/v1/`, `${authUrl}/`), {
      ...init, redirect: "error", signal: AbortSignal.timeout(10_000),
    }) },
};

function token(role: "anon" | "service_role") {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + 300 })).toString("base64url");
  const content = `${header}.${payload}`;
  return `${content}.${createHmac("sha256", signingKey).update(content).digest("base64url")}`;
}

async function main() {
  if (process.env.DATABASE_URL !== databaseUrl || process.env.DIRECT_URL !== databaseUrl || process.env.DATABASE_URL_POOLED) {
    throw new Error("Jalankan pengujian dengan basis data Docker lokal yang terisolasi.");
  }
  assert.ok(student.email !== guardian.email, "Gunakan alamat berbeda untuk murid dan wali.");
  process.env.BC_REQUIRE_STUDENT_VERIFICATION = "1";
  const admin = createClient(authUrl, token("service_role"), options);
  const browser = createClient(authUrl, token("anon"), options);
  const guardianClient = createClient(authUrl, token("anon"), options);
  const created = await admin.auth.admin.createUser({ ...student, email_confirm: true });
  assert.ifError(created.error);
  assert.ok(created.data.user);
  const authId = created.data.user.id;

  const { db } = await import("../lib/db");

  let guardianId: string | undefined;
  try {
    const guardianCreated = await admin.auth.admin.createUser({ ...guardian, email_confirm: true });
    assert.ifError(guardianCreated.error);
    assert.ok(guardianCreated.data.user);
    guardianId = guardianCreated.data.user.id;
    // Supply the real signed-in SDK client at the Next.js cookie boundary.
    // Everything from the route handler through Prisma uses the actual code.
    const loader = Module as typeof Module & { _load: (...args: unknown[]) => unknown };
    const originalLoad = loader._load;
    let post: typeof import("../app/api/auth/complete-role/route").POST;
    let decide: typeof import("../app/api/auth/guardian-consent/route").POST;
    let activeClient = browser;
    let login: typeof import("../app/api/auth/login/route").POST;
    let loginClient = guardianClient;
    try {
      loader._load = function (name, ...args) {
        if (name === "@/lib/supabase/server") return { createClient: async () => activeClient };
        if (name === "@/lib/supabase/server-login") return { createLoginClient: async () => loginClient };
        return originalLoad.call(this, name, ...args);
      };
      ({ POST: post } = require("../app/api/auth/complete-role/route"));
      ({ POST: decide } = require("../app/api/auth/guardian-consent/route"));
      ({ POST: login } = require("../app/api/auth/login/route"));
    } finally {
      loader._load = originalLoad;
    }
    const signIn = (account: typeof student) => login(new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(account),
    }));
    const guardianLogin = await signIn(guardian);
    assert.equal(guardianLogin.status, 200);
    assert.equal((await guardianLogin.json()).needsRole, true);
    const guardianSession = await guardianClient.auth.getUser();
    assert.ifError(guardianSession.error);
    assert.ok(guardianSession.data.user?.id === guardianId && guardianId !== authId);

    loginClient = browser;
    const studentLogin = await signIn(student);
    assert.equal(studentLogin.status, 200);
    assert.equal((await studentLogin.json()).needsRole, true);
    const session = await browser.auth.getSession();
    assert.ifError(session.error);
    assert.ok(session.data.session);
    const accessToken = session.data.session.access_token;
    const proof = { version: 1, ageVerified: true, guardianConsent: "granted", validUntil: Date.now() + 60_000 };

    async function expectAdmission(allowed: boolean) {
      const current = await browser.auth.getUser(accessToken);
      assert.ifError(current.error);
      assert.ok(current.data.user);
      assert.equal(current.data.user.id, authId);
      assert.equal(isStudentProvisioningAllowed("MURID", current.data.user.app_metadata.bc_student_verification), allowed);
    }

    const submitRole = () => post(new Request("http://localhost/api/auth/complete-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "MURID", bc_student_verification: proof }),
    }));
    const findUser = () => db.user.findUnique({ where: { supabaseId: authId } });
    async function expectBlocked() {
      const response = await submitRole();
      assert.equal(response.status, 403);
      assert.equal((await response.json()).code, "STUDENT_VERIFICATION_REQUIRED");
      assert.equal(await findUser(), null);
    }

    const unauthorized = await guardianClient.auth.admin.updateUserById(authId, {
      app_metadata: { bc_student_verification: proof },
    });
    assert.ok(unauthorized.error && [401, 403].includes(unauthorized.error.status ?? 0));
    await expectAdmission(false);
    await expectBlocked();
    assert.ifError((await browser.auth.updateUser({ data: { bc_student_verification: proof } })).error);
    await expectAdmission(false);
    await expectBlocked();
    assert.ifError((await admin.auth.admin.updateUserById(authId, {
      app_metadata: { bc_student_verification: proof },
    })).error);
    await expectAdmission(true);
    assert.ifError((await admin.auth.admin.updateUserById(authId, {
      app_metadata: { bc_student_verification: { ...proof, guardianConsent: "revoked" } },
    })).error);
    await expectAdmission(false);
    await expectBlocked();
    assert.ifError((await admin.auth.admin.updateUserById(authId, {
      app_metadata: { bc_student_verification: proof },
    })).error);
    await db.studentGuardianConsent.create({
      data: {
        studentAuthId: authId,
        guardianAuthId: guardianId,
        studentLabel: "Murid Uji",
        reviewReference: "qa-only",
        verifiedUntil: new Date(Date.now() + 60_000),
      },
    });
    const decideConsent = (decision: string) => decide(new Request("http://localhost/api/auth/guardian-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentAuthId: authId, decision, noticeVersion: "2026-11-17-v1" }),
    }));
    // A pending database record supersedes previously granted metadata.
    await expectBlocked();
    assert.equal((await decideConsent("grant")).status, 404);
    activeClient = guardianClient;
    assert.equal((await decideConsent("grant")).status, 200);
    assert.equal((await decideConsent("revoke")).status, 200);
    assert.equal((await decideConsent("grant")).status, 409);
    activeClient = browser;
    await expectBlocked();
    console.log("PASS: hanya wali terverifikasi bisa menyetujui atau mencabut dan metadata lama tidak dapat melewati pencabutan.");
    await db.studentGuardianConsent.update({
      where: { studentAuthId: authId },
      data: { status: "PENDING", decidedAt: null, noticeVersion: null },
    });
    activeClient = guardianClient;
    assert.equal((await decideConsent("grant")).status, 200);
    activeClient = browser;
    assert.equal((await submitRole()).status, 200);
    const provisioned = await findUser();
    assert.equal(provisioned?.role, "MURID");
    assert.equal((await submitRole()).status, 200);
    assert.equal(await db.user.count({ where: { supabaseId: authId } }), 1);
    const returning = await signIn(student);
    assert.equal(returning.status, 200);
    assert.equal((await returning.json()).user?.role, "MURID");
    console.log("PASS: dua akun dummy masuk lewat API login dan akun murid yang aktif dapat masuk kembali.");
    console.log("PASS: API menolak bukti palsu dan dicabut, lalu membuat satu akun dengan bukti server yang sah.");
    console.log("PASS: sesi wali tidak memiliki akses admin untuk mengubah bukti murid secara langsung.");
    console.log("PASS: GoTrue menolak bukti dari pengguna dan membaca pencabutan dengan token sesi yang sama.");
  } finally {
    try {
      const ids = guardianId ? [guardianId, authId] : [authId];
      const cleanup = await Promise.all(ids.map((id) => admin.auth.admin.deleteUser(id)));
      cleanup.forEach((result) => assert.ifError(result.error));
    } finally {
      await db.$disconnect();
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
