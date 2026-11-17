import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";

const base = process.env.QA_BASE || "http://127.0.0.1:3100";
const out = process.env.QA_OUT || "qa-output/guardian-consent";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const student = { id: "student-qa", name: "Murid Uji" };
const authId = "00000000-0000-4000-8000-000000000020";
const group = { id: "kelas-qa", name: "Kelas VII Uji", teacher: { fullName: "Guru Uji" } };
const version = "qa-fixture-v1";

function pageUrl(path) {
  return `${base}/qa-fixture/frame?view=page&app=1&route=${encodeURIComponent(path)}`;
}

async function assertFits(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
}

try {
  for (const viewport of [{ width: 360, height: 780 }, { width: 780, height: 360 }]) {
    const context = await browser.newContext({ ...devices["Pixel 7"], viewport });
    try {
      const page = await context.newPage();
      let status = null;
      let postCount = 0;
      let signedIn = false;
      const decisions = [];
      await page.route("**/api/admin/guardian-consent**", async (route) => {
        const request = route.request();
        if (request.method() === "POST") {
          const payload = request.postDataJSON();
          postCount++;
          assert.equal(payload.groupId, group.id);
          assert.equal(payload.students.length, 1);
          assert.equal(payload.students[0].studentUserId, student.id);
          assert.equal(payload.students[0].reviewReference, "QA_CLASS_001");
          for (const key of ["ageChecked", "guardianRelationshipChecked", "guardianAuthorityChecked"]) {
            assert.equal(payload.students[0][key], true);
          }
          status = "PENDING";
          return route.fulfill({ status: 201, json: { status, linked: 1 } });
        }
        if (new URL(request.url()).searchParams.has("classSearch")) {
          return route.fulfill({ json: { classes: [group] } });
        }
        return route.fulfill({ json: {
          id: group.id, name: group.name, teacher: group.teacher.fullName,
          guardianReady: true, students: [{ ...student, status }],
        } });
      });
      await page.route("**/api/auth/login", async (route) => {
        const credentials = route.request().postDataJSON();
        assert.equal(credentials.email, "wali-qa@example.test");
        signedIn = true;
        await route.fulfill({ json: { needsRole: true } });
      });
      await page.route("**/api/auth/guardian-consent", async (route) => {
        if (!signedIn) return route.fulfill({ status: 401, json: { error: "Silakan masuk." } });
        if (route.request().method() === "POST") {
          const body = route.request().postDataJSON();
          assert.equal(body.studentAuthId, authId);
          assert.equal(body.noticeVersion, version);
          decisions.push(body.decision);
          status = body.decision === "grant" ? "GRANTED" : "REVOKED";
          return route.fulfill({ json: { status } });
        }
        return route.fulfill({ json: {
          noticeVersion: version, notice: "Persetujuan untuk kegiatan belajar murid.",
          privacyUrl: "/kebijakan-privasi", students: [{
            studentAuthId: authId, studentLabel: student.name,
            verifiedUntil: "2099-12-31T12:00:00.000Z", status,
          }],
        } });
      });

      await page.goto(pageUrl("/admin/guardian-consent"), { timeout: 120_000 });
      await page.getByLabel("Pilih kelas", { exact: true }).selectOption(group.id, { timeout: 60_000 });
      await page.getByRole("button", { name: "Tinjau" }).click();
      await page.getByLabel("Nomor referensi peninjauan").fill("QA_CLASS_001");
      await page.getByLabel("Verifikasi berlaku hingga").fill("2099-12-31T12:00");
      await page.getByLabel("Usia murid sudah diperiksa.").check();
      await page.getByLabel("Hubungan guru dengan murid sudah diperiksa.").check();
      await page.getByRole("button", { name: "Tautkan sebagai wali" }).click();
      assert.equal(postCount, 0);
      await page.getByLabel("Kewenangan guru sebagai wali sudah diperiksa.").check();
      await page.getByRole("button", { name: "Tautkan sebagai wali" }).click();
      await page.getByText("Menunggu persetujuan", { exact: true }).waitFor();
      assert.equal(postCount, 1);
      await assertFits(page);
      await page.screenshot({ path: `${out}/admin-${viewport.width}.png`, fullPage: true });

      await page.goto(pageUrl("/auth/guardian-consent"), { timeout: 120_000 });
      await page.getByLabel("Alamat email").fill("wali-qa@example.test");
      await page.getByLabel("Kata sandi").fill("kata-sandi-uji");
      await page.getByRole("button", { name: "Masuk sebagai wali" }).click();
      await page.getByRole("button", { name: "Berikan persetujuan" }).click();
      await page.getByText("Disetujui", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Cabut persetujuan" }).click();
      await page.getByText("Dicabut", { exact: true }).waitFor();
      await assertFits(page);
      assert.deepEqual(decisions, ["grant", "revoke"]);
      await page.screenshot({ path: `${out}/wali-${viewport.width}.png`, fullPage: true });
      console.log(`PASS: alur admin dan wali pada viewport Android ${viewport.width}×${viewport.height}.`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
