import assert from "node:assert/strict";
import { canManageRecording, recordingEnabled } from "../lib/jumpa/recording-policy";

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
console.log("Kebijakan rekaman Premium-only: lulus (fitur belum aktif).");
