import assert from "node:assert/strict";
import { canManageRecording, recordingEnabled, recordingTierVerified } from "../lib/jumpa/recording-policy";

assert.equal(canManageRecording("FREE", true), false);
assert.equal(canManageRecording("FREE", false), false);
assert.equal(canManageRecording("PREMIUM", false), false);
assert.equal(canManageRecording("PREMIUM", true), true);
for (const tier of ["FREE", "PREMIUM"] as const) {
  for (const host of [false, true]) {
    assert.equal(recordingEnabled(tier, host, false), false);
  }
}
assert.equal(recordingEnabled("PREMIUM", true, true), true);
assert.equal(recordingEnabled("FREE", true, true), false);
assert.equal(recordingTierVerified({ tier: "PREMIUM" }), true);
for (const metadata of [null, undefined, {}, { tier: "FREE" }, { tier: "premium" }, [], "PREMIUM"]) {
  assert.equal(recordingTierVerified(metadata), false);
}
console.log("Kebijakan rekaman Premium-only dan metadata eksplisit: lulus (fitur belum aktif).");
