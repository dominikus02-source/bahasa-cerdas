/**
 * Regression: unified Midtrans checkout and Guru Cerdas Sejahtera pause.
 * No database, network, or real gateway charge required.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GCS_PROGRAM_PAUSED, GCS_PROGRAM_NOTICE } from "../lib/commission/config";
import { getPlan } from "../lib/billing/plans";
import { validateMidtransConfig, MidtransError } from "../lib/payments/midtrans-server";

const src = (path: string) => readFileSync(path, "utf8");
assert.equal(GCS_PROGRAM_PAUSED, true, "GCS must be paused");
assert.match(GCS_PROGRAM_NOTICE, /sedang dalam pengembangan/);
for (const path of [
  "app/(dashboard)/guru/komisi/page.tsx",
  "app/(dashboard)/guru/komisi/program/page.tsx",
]) {
  assert.match(src(path), /<ProgramPaused\s*\/>/);
  assert.doesNotMatch(src(path), /KomisiClient|ProgramClient/);
}
assert.match(src("app/api/teacher/commissions/withdraw/route.ts"), /GCS_PROGRAM_PAUSED/);
assert.match(src("app/api/teacher/commissions/payout-profile/route.ts"), /GCS_PROGRAM_PAUSED/);
assert.match(src("lib/commission/attribution.ts"), /if \(GCS_PROGRAM_PAUSED\)/);
assert.match(src("lib/commission/engine.ts"), /if \(GCS_PROGRAM_PAUSED\)/);
assert.match(src("components/shared/upgrade-modal.tsx"), /\/guru\/berlangganan\?plan=/);
assert.doesNotMatch(src("components/shared/upgrade-modal.tsx"), /\/api\/payment\/create-invoice/);
assert.match(src("app/api/payment/create-invoice/route.ts"), /status:\s*410/);
for (const [file, id] of [
  ["app/(dashboard)/guru/berlangganan/page.tsx", "GURU_PRO_MONTHLY"],
  ["app/(dashboard)/murid/premium/page.tsx", "MURID_PREMIUM_MONTHLY"],
]) {
  assert.match(src(file), /\/api\/billing\/checkout/);
  assert.ok(getPlan(id), id);
}
assert.match(src("app/api/billing/checkout/route.ts"), /createMidtransSnapTransaction/);
assert.match(src("app/api/payment/webhook/route.ts"), /reverseCommissionForTransaction/, "Existing refund/reversal must remain functional");

const saved = new Map<string, string | undefined>();
const keys = ["MIDTRANS_SERVER_KEY", "NEXT_PUBLIC_MIDTRANS_CLIENT_KEY", "MIDTRANS_IS_PRODUCTION", "NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION"];
for (const key of keys) saved.set(key, process.env[key]);
function checkConfig(serverKey: string, clientKey: string, production: boolean, shouldPass: boolean) {
  process.env.MIDTRANS_SERVER_KEY = serverKey;
  process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY = clientKey;
  process.env.MIDTRANS_IS_PRODUCTION = String(production);
  process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION = String(production);
  if (shouldPass) assert.doesNotThrow(validateMidtransConfig);
  else assert.throws(validateMidtransConfig, (e) => e instanceof MidtransError && e.code === "MIDTRANS_MODE_MISMATCH");
}
try {
  checkConfig("SB-Mid-server-sample", "SB-Mid-client-sample", false, true);
  checkConfig("Mid-server-sample", "Mid-client-sample", true, true);
  checkConfig("SB-Mid-server-sample", "SB-Mid-client-sample", true, false);
  checkConfig("Mid-server-sample", "Mid-client-sample", false, false);
  checkConfig("Mid-server-sample", "SB-Mid-client-sample", true, false);
} finally {
  for (const key of keys) {
    const val = saved.get(key);
    if (val === undefined) delete process.env[key];
    else process.env[key] = val;
  }
}
console.log("PASS unified Guru/Murid Midtrans, GCS paused, and Midtrans mode checks");
