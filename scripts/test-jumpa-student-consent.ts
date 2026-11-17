import assert from "node:assert/strict";
import Module from "node:module";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { removeLivekitParticipant, ensureLivekitRoom, listLivekitIdentities } from "../lib/jumpa/livekit";
import { AccessToken } from "livekit-server-sdk";
import type { Room } from "livekit-client";

const removed: Array<[string, string]> = [];
let status = "REVOKED";
let disconnectFails = false;
let disconnectLive = false;
const roomName = "ruang-uji";
const db = {
  user: {
    findUnique: async () => ({ id: "murid-qa", role: "MURID", supabaseId: "auth-qa" }),
  },
  studentGuardianConsent: {
    findUnique: async () => ({ status, verifiedUntil: new Date(Date.now() + 60_000) }),
  },
  jumpaParticipant: {
    findMany: async () => [{ room: { livekitRoomName: "ruang-uji" } }],
  },
};

async function main() {
  const loader = Module as typeof Module & { _load: (...args: unknown[]) => unknown };
  const original = loader._load;
  let controls: typeof import("../lib/jumpa/student-consent");
  try {
    loader._load = function (name, ...args) {
      if (name === "@/lib/db") return { db };
      if (name === "./livekit") return {
        removeLivekitParticipant: async (room: string, identity: string) => {
          if (disconnectFails) throw new Error("fixture timeout");
          removed.push([room, identity]);
          if (disconnectLive) await removeLivekitParticipant(room, identity);
        },
      };
      return original.call(this, name, ...args);
    };
    controls = require("../lib/jumpa/student-consent");
  } finally {
    loader._load = original;
  }

  delete process.env.BC_REQUIRE_STUDENT_VERIFICATION;
  await controls.removeRevokedStudentFromJumpa("auth-qa");
  assert.equal(removed.length, 0);
  process.env.BC_REQUIRE_STUDENT_VERIFICATION = "1";
  await controls.removeRevokedStudentFromJumpa("auth-qa");
  assert.deepEqual(removed.splice(0), [["ruang-uji", "murid-qa"], ["ruang-uji", "screen:murid-qa"]]);
  assert.equal(await controls.rejectRevokedJumpaJoin("ruang-uji", "screen:murid-qa"), true);
  assert.deepEqual(removed.splice(0), [["ruang-uji", "screen:murid-qa"]]);

  disconnectFails = true;
  await assert.rejects(controls.removeRevokedStudentFromJumpa("auth-qa"), /JUMPA_CONSENT_DISCONNECT_FAILED/);
  await assert.rejects(controls.rejectRevokedJumpaJoin("ruang-uji", "murid-qa"), /fixture timeout/);
  disconnectFails = false;
  status = "GRANTED";
  assert.equal(await controls.rejectRevokedJumpaJoin("ruang-uji", "murid-qa"), false);
  assert.deepEqual(removed, []);
  console.log("PASS: pencabutan memutus identitas peserta dan layar, serta menolak sambung ulang.");

  const url = process.env.LIVEKIT_URL;
  if (!url) return;
  assert.equal(url, "http://127.0.0.1:7880", "Gunakan hanya LiveKit lokal untuk uji koneksi.");
  const config = { url, apiKey: "devkey", apiSecret: "secret" };
  await ensureLivekitRoom({ name: roomName, maxParticipants: 4, config });
  const token = new AccessToken(config.apiKey, config.apiSecret, { identity: "murid-qa" });
  token.addGrant({ roomJoin: true, room: roomName });

  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  try {
    const page = await browser.newPage();
    await page.goto(url);
    await page.addScriptTag({ path: resolve("node_modules/livekit-client/dist/livekit-client.umd.js") });
    await page.evaluate(async ({ endpoint, jwt }) => {
      const context = window as typeof window & {
        LivekitClient: typeof import("livekit-client");
        qaRoom: Room;
      };
      context.qaRoom = new context.LivekitClient.Room();
      await context.qaRoom.connect(endpoint, jwt, { autoSubscribe: false });
    }, { endpoint: "ws://127.0.0.1:7880", jwt: await token.toJwt() });
    const before = await listLivekitIdentities(roomName, config);
    assert.ok(before.some(({ identity }) => identity === "murid-qa"));
    disconnectLive = true;
    status = "REVOKED";
    await controls.removeRevokedStudentFromJumpa("auth-qa");
    await page.waitForFunction(() => {
      const context = window as typeof window & { qaRoom: Room };
      return context.qaRoom.state === "disconnected";
    }, undefined, { timeout: 10_000 });
    const after = await listLivekitIdentities(roomName, config);
    assert.ok(!after.some(({ identity }) => identity === "murid-qa"));
    console.log("PASS: peserta yang sedang terhubung dikeluarkan dari LiveKit lokal.");
  } finally {
    await browser.close();
  }

}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
