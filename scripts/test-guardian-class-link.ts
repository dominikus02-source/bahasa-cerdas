import assert from "node:assert/strict";
import Module from "node:module";

const teacherAuthId = "00000000-0000-4000-8000-000000000001";
const studentAuthId = "00000000-0000-4000-8000-000000000002";
const reviewer = { id: "reviewer", role: "ADMIN" };
let writes = 0;
const auth = { getUserById: async () => ({ data: { user: { email_confirmed_at: "2026-11-17" } } }) };
const db = {
  group: {
    findUnique: async () => ({
      teacher: { role: "GURU", supabaseId: teacherAuthId, email: "teacher@example.test" },
      members: [{ user: { id: "student", role: "MURID", supabaseId: studentAuthId, fullName: "Murid Uji", email: "student@example.test" } }],
    }),
  },
  studentGuardianConsent: {
    createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
      writes++;
      assert.deepEqual(data.map(({ guardianAuthId, status, reviewedBy }) => [guardianAuthId, status, reviewedBy]),
        [[teacherAuthId, undefined, reviewer.id]]);
    },
  },
};

async function main() {
  const loader = Module as typeof Module & { _load: (...args: unknown[]) => unknown };
  const original = loader._load;
  let post: typeof import("../app/api/admin/guardian-consent/route").POST;
  try {
    loader._load = function (name, ...args) {
      if (name === "@/lib/db") return { db };
      if (name === "@/lib/admin/guard") return { withAdmin: (handler: unknown) => handler };
      if (name === "@/lib/supabase/server") return { getUser: async () => reviewer };
      if (name === "@supabase/supabase-js") return { createClient: () => ({ auth: { admin: auth } }) };
      return original.call(this, name, ...args);
    };
    ({ POST: post } = require("../app/api/admin/guardian-consent/route"));
  } finally {
    loader._load = original;
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.example.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
  const student = {
    studentUserId: "student", reviewReference: "CASE_123",
    verifiedUntil: new Date(Date.now() + 60_000).toISOString(),
    ageChecked: true, guardianRelationshipChecked: true, guardianAuthorityChecked: true,
  };
  const submit = (students: unknown[]) => post(new Request("http://localhost/api/admin/guardian-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId: "test-class", students }),
  }));

  assert.equal((await submit([{ ...student, guardianAuthorityChecked: false }])).status, 400);
  assert.equal((await submit([student, student])).status, 400);
  assert.equal((await submit([{ ...student, studentUserId: "different-class" }])).status, 422);
  assert.equal(writes, 0);
  const linked = await submit([student]);
  assert.equal(linked.status, 201);
  assert.deepEqual(await linked.json(), { status: "PENDING", linked: 1 });
  assert.equal(writes, 1);
  console.log("PASS: hanya anggota kelas yang ditinjau ditautkan, persetujuan tetap menunggu wali.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
