/**
 * Sets a synthetic verification decision for an existing staging Auth fixture.
 * Use an Auth-only fixture named bc-student-qa-<label>@example.test.
 * Usage: node --import tsx scripts/set-staging-student-verification.ts <auth-id> grant|revoke|clear
 */
import { createClient } from "@supabase/supabase-js";
import { PRODUCTION_REF } from "./lib/staging-gate";

const FIXTURE_EMAIL = /^bc-student-qa-[a-z0-9-]+@example\.test$/;
const AUTH_ID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

class FixtureError extends Error {}

async function main() {
  const [authId, action, ...extra] = process.argv.slice(2);
  if (!authId || !AUTH_ID.test(authId) || !["grant", "revoke", "clear"].includes(action) || extra.length) {
    throw new FixtureError("Gunakan ID Auth akun uji dan tindakan grant, revoke, atau clear.");
  }

  const rawUrl = process.env.STAGING_SUPABASE_URL;
  const key = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
  if (!rawUrl || !key) throw new FixtureError("Konfigurasi Auth staging belum tersedia.");

  const url = new URL(rawUrl);
  const ref = url.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/)?.[1];
  if (!ref || ref === PRODUCTION_REF || url.href !== `https://${ref}.supabase.co/`) {
    throw new FixtureError("Gunakan URL HTTPS proyek Supabase staging yang terpisah.");
  }

  const supabase = createClient(url.origin, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, redirect: "error", signal: AbortSignal.timeout(10_000) }) },
  });
  const { data, error } = await supabase.auth.admin.getUserById(authId);
  if (error || !data.user?.email || !FIXTURE_EMAIL.test(data.user.email)) {
    throw new FixtureError("ID tersebut bukan akun Auth sintetis yang dapat diperbarui.");
  }

  const evidence = action === "clear" ? null : {
    version: 1,
    ageVerified: true,
    guardianConsent: action === "grant" ? "granted" : "revoked",
    validUntil: Date.now() + 60 * 60 * 1000,
  };
  const result = await supabase.auth.admin.updateUserById(authId, {
    app_metadata: { bc_student_verification: evidence },
  });
  if (result.error) throw new FixtureError("Pembaruan bukti sintetis gagal.");
  console.log(`Bukti sintetis diperbarui (${action}).`);
}

main().catch((error: unknown) => {
  // URL parsing and transport errors can contain environment details.
  console.error(error instanceof FixtureError ? error.message : "Pemeriksaan konfigurasi Auth staging gagal.");
  process.exitCode = 1;
});
