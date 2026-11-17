import assert from "node:assert/strict";
import { isStudentProvisioningAllowed } from "../lib/auth/student-provisioning";

const flag = "BC_REQUIRE_STUDENT_VERIFICATION";
const original = process.env[flag];
const now = Date.UTC(2026, 10, 17);
const valid = { version: 1, ageVerified: true, guardianConsent: "granted", validUntil: now + 60_000 };

try {
  delete process.env[flag];
  assert.equal(isStudentProvisioningAllowed("MURID", undefined, now), true);
  process.env[flag] = "1";
  assert.equal(isStudentProvisioningAllowed("GURU", undefined, now), true);
  assert.equal(isStudentProvisioningAllowed("UMUM", undefined, now), true);
  assert.equal(isStudentProvisioningAllowed("MURID", valid, now), true);
  for (const evidence of [
    undefined, null, true, [], "granted",
    { ...valid, ageVerified: false },
    { ...valid, ageVerified: "true" },
    { ...valid, guardianConsent: "pending" },
    { ...valid, guardianConsent: "revoked" },
    { ...valid, validUntil: now },
    { ...valid, validUntil: now - 1 },
    { ...valid, validUntil: Number.POSITIVE_INFINITY },
    { ...valid, version: 2 },
  ]) {
    assert.equal(isStudentProvisioningAllowed("MURID", evidence, now), false);
  }
  console.log("PASS: cakupan peran, mode bawaan, bukti valid, penolakan dan kedaluwarsa");
} finally {
  if (original === undefined) delete process.env[flag];
  else process.env[flag] = original;
}
