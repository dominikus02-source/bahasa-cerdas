import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { isStudentProvisioningAllowed } from "../lib/auth/student-provisioning";

const authUrl = "http://127.0.0.1:54999";
const signingKey = "ci-only-local-gotrue-fixture-signing-key-student-verification";
const account = { email: "bc-student-qa-auth@example.test", password: "ci-fixture-student-2026" };
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
  process.env.BC_REQUIRE_STUDENT_VERIFICATION = "1";
  const admin = createClient(authUrl, token("service_role"), options);
  const browser = createClient(authUrl, token("anon"), options);
  const created = await admin.auth.admin.createUser({ ...account, email_confirm: true });
  assert.ifError(created.error);
  assert.ok(created.data.user);
  const authId = created.data.user.id;

  try {
    const login = await browser.auth.signInWithPassword(account);
    assert.ifError(login.error);
    assert.ok(login.data.session);
    const accessToken = login.data.session.access_token;
    const proof = { version: 1, ageVerified: true, guardianConsent: "granted", validUntil: Date.now() + 60_000 };

    async function expectAdmission(allowed: boolean) {
      const current = await browser.auth.getUser(accessToken);
      assert.ifError(current.error);
      assert.ok(current.data.user);
      assert.equal(current.data.user.id, authId);
      assert.equal(isStudentProvisioningAllowed("MURID", current.data.user.app_metadata.bc_student_verification), allowed);
    }

    await expectAdmission(false);
    assert.ifError((await browser.auth.updateUser({ data: { bc_student_verification: proof } })).error);
    await expectAdmission(false);
    assert.ifError((await admin.auth.admin.updateUserById(authId, {
      app_metadata: { bc_student_verification: proof },
    })).error);
    await expectAdmission(true);
    assert.ifError((await admin.auth.admin.updateUserById(authId, {
      app_metadata: { bc_student_verification: { ...proof, guardianConsent: "revoked" } },
    })).error);
    await expectAdmission(false);
    console.log("PASS: GoTrue menolak bukti dari pengguna dan membaca pencabutan dengan token sesi yang sama.");
  } finally {
    const cleanup = await admin.auth.admin.deleteUser(authId);
    assert.ifError(cleanup.error);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
