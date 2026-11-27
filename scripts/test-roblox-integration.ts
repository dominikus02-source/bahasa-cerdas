/**
 * Roblox integration — HMAC, umur kode tautan, dan idempotensi XP.
 * Tanpa database. Keputusan yang diuji adalah fungsi yang dipakai route.
 */
import { createHmac } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { ageGateSatisfied } from "../lib/roblox/age-gate";
import {
  assessLinkCode,
  formatLinkCode,
  generateLinkCode,
  normalizeLinkCode,
  ROBLOX_CODE_ALPHABET,
  ROBLOX_CODE_LENGTH,
} from "../lib/roblox/codes";
import {
  ROBLOX_EXPERIENCE_URL_DEFAULT,
  ROBLOX_PLACE_ID_DEFAULT,
  ROBLOX_UNIVERSE_ID_DEFAULT,
  robloxAgeGate,
  robloxExperienceUrl,
  robloxPlaceId,
} from "../lib/roblox/config";
import { decideRobloxXp, sanitizeBadgeCodes, xpForRobloxRun } from "../lib/roblox/grading";
import { signRobloxRequest, verifyRobloxSignature } from "../lib/roblox/hmac";
import { authenticateRobloxServer, secretsMatch, type NonceStore } from "../lib/roblox/server-auth";
import { gradeRobloxAnswer, parseUnitQuestions, sampleQuestions, toPublicQuestion } from "../lib/roblox/questions";
import { gameById } from "../lib/arena/game-registry";

let failed = 0;
function check(name: string, ok: boolean) {
  if (!ok) {
    failed += 1;
    console.error(`GAGAL  ${name}`);
  }
}

async function main() {
const secret = "test-secret";
const body = JSON.stringify({ ping: true });
const timestamp = "1700000000000";
const now = 1_700_000_000_000;
const signature = signRobloxRequest(body, timestamp, secret);
const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("base64url");

check("HMAC cocok dengan crypto mandiri", signature === expected);
check("vektor dokumentasi", signature === "WAkTMIWDkX3KQPldfsBIRm4vjzIX0ghrAZH-JX68akY");
check("HMAC sah dalam skew", verifyRobloxSignature(body, timestamp, signature, now + 1_000, secret, 60_000));
check("HMAC menolak jam kedaluwarsa", !verifyRobloxSignature(body, timestamp, signature, now + 120_000, secret, 60_000));
check("HMAC menolak body yang berubah", !verifyRobloxSignature(`${body} `, timestamp, signature, now, secret, 60_000));
check("HMAC menolak secret lain", !verifyRobloxSignature(body, timestamp, signature, now, "secret-lain", 60_000));
check("HMAC menolak timestamp detik", !verifyRobloxSignature(body, "1700000000", signature, 1_700_000_000, secret, 60_000));
check("HMAC menolak tanda tangan rusak", !verifyRobloxSignature(body, timestamp, "bukan-tanda", now, secret, 60_000));
check("HMAC menolak secret kosong", !verifyRobloxSignature(body, timestamp, signature, now, "", 60_000));
check("Bearer cocok secara timing-safe", secretsMatch(secret, secret));
check("Bearer salah ditolak", !secretsMatch("bukan", secret));
check("Bearer beda panjang tetap ditolak", !secretsMatch("x", secret));

function memoryNonces(): NonceStore {
  const seen = new Set<string>();
  return {
    async claim(id) {
      if (seen.has(id)) return "replay";
      seen.add(id);
      return "new";
    },
  };
}

const bearerBase = {
  method: "POST",
  contentType: "application/json",
  authorization: `Bearer ${secret}`,
  timestamp,
  requestId: "req-0001-abcd",
  signature: null,
  rawBody: body,
};

const first = await authenticateRobloxServer(bearerBase, { now, secret, skewMs: 300_000, nonces: memoryNonces() });
check("Bearer diterima dalam 5 menit", first.ok && first.scheme === "bearer");
const skew = await authenticateRobloxServer(bearerBase, { now: now + 300_001, secret, skewMs: 300_000, nonces: memoryNonces() });
check("Bearer menolak selisih di atas 5 menit", !skew.ok && skew.error === "STALE_TIMESTAMP");
const wrong = await authenticateRobloxServer(
  { ...bearerBase, authorization: "Bearer salah", requestId: "req-0002-abcd" },
  { now, secret, skewMs: 300_000, nonces: memoryNonces() },
);
check("Bearer salah ditolak sebelum nonce", !wrong.ok && wrong.error === "UNAUTHORIZED");
const nonces = memoryNonces();
const once = await authenticateRobloxServer(bearerBase, { now, secret, skewMs: 300_000, nonces });
const twice = await authenticateRobloxServer({ ...bearerBase, requestId: "req-0001-abcd" }, { now, secret, skewMs: 300_000, nonces });
check("nonce pertama lolos", once.ok);
check("nonce yang sama ditolak", !twice.ok && twice.error === "REPLAYED_REQUEST");
const freshRetry = await authenticateRobloxServer(
  { ...bearerBase, requestId: "req-0003-abcd" },
  { now, secret, skewMs: 300_000, nonces },
);
check("percobaan ulang butuh request id baru", freshRetry.ok);
const hmacOnly = await authenticateRobloxServer(
  { ...bearerBase, authorization: null, signature, requestId: "req-hmac-0001" },
  { now, secret, skewMs: 300_000, nonces: memoryNonces() },
);
check("HMAC tetap alternatif bila Bearer tidak ada", hmacOnly.ok && hmacOnly.scheme === "hmac");
const notJson = await authenticateRobloxServer(
  { ...bearerBase, contentType: "text/plain", requestId: "req-0004-abcd" },
  { now, secret, skewMs: 300_000, nonces: memoryNonces() },
);
check("bukan JSON ditolak", !notJson.ok && notJson.error === "UNSUPPORTED_MEDIA");
const put = await authenticateRobloxServer(
  { ...bearerBase, method: "PUT", requestId: "req-0005-abcd" },
  { now, secret, skewMs: 300_000, nonces: memoryNonces() },
);
check("selain POST/GET ditolak", !put.ok && put.error === "METHOD_NOT_ALLOWED");

const code = generateLinkCode(() => 0);
check("kode baru hanya dari alfabet", code === "A".repeat(ROBLOX_CODE_LENGTH) && [...code].every((char) => ROBLOX_CODE_ALPHABET.includes(char)));
check("kode tampilan berstrip", formatLinkCode("AB3K9Q2M") === "AB3K-9Q2M");
check("kode dinormalisasi dari strip dan huruf kecil", normalizeLinkCode(" ab3k-9q2m ") === "AB3K9Q2M");
check("kode menolak huruf yang mirip", normalizeLinkCode("AB3K9Q2O") === null);
check("kode menolak panjang salah", normalizeLinkCode("AB3K") === null);

const expires = new Date(now + 60_000);
check("kode hilang", assessLinkCode(null, new Date(now)) === "missing");
check("kode masih berlaku", assessLinkCode({ expiresAt: expires, usedAt: null }, new Date(now)) === "valid");
check("kode habis tepat di batas", assessLinkCode({ expiresAt: new Date(now), usedAt: null }, new Date(now)) === "expired");
check("kode sekali pakai", assessLinkCode({ expiresAt: expires, usedAt: new Date(now) }, new Date(now)) === "used");

check("XP sempurna 50", xpForRobloxRun(10, 10, 50) === 50);
check("XP separuh dibulatkan", xpForRobloxRun(1, 3, 50) === 17);
check("XP nol bila tidak ada yang benar", xpForRobloxRun(0, 5, 50) === 0);
check("XP memotong benar yang melebihi jumlah soal", xpForRobloxRun(10, 4, 50) === 50);
check("XP menolak angka rusak", xpForRobloxRun(Number.NaN, 5, 50) === 0);

const fresh = decideRobloxXp({
  sessionId: "sesi-1",
  sessionConsumed: false,
  sessionKey: null,
  requestKey: "kunci-awal-01",
  correct: 10,
  total: 10,
  baseXp: 50,
});
check("keputusan baru memberi XP dan referensi sesi", fresh.kind === "award" && fresh.xp === 50 && fresh.reference === "roblox-session:sesi-1");
const replay = decideRobloxXp({
  sessionId: "sesi-1",
  sessionConsumed: true,
  sessionKey: "kunci-awal-01",
  requestKey: "kunci-awal-01",
  correct: 10,
  total: 10,
  baseXp: 50,
});
check("kunci yang sama tidak memberi XP lagi", replay.kind === "replay");
const conflict = decideRobloxXp({
  sessionId: "sesi-1",
  sessionConsumed: true,
  sessionKey: "kunci-awal-01",
  requestKey: "kunci-lain-02",
  correct: 10,
  total: 10,
  baseXp: 50,
});
check("kunci berbeda pada sesi selesai ditolak", conflict.kind === "conflict");

check("lencana hanya awalan roblox-", sanitizeBadgeCodes(["roblox-kota-aksara", "ADMIN", "roblox-kota-aksara"]).join() === "roblox-kota-aksara");

const parsed = parseUnitQuestions(JSON.stringify({
  questions: [
    { id: "u01f", tipe: "pilihan_ganda", soal: "Huruf pertama?", opsi: ["t", "l"], jawaban: 0, penjelasan: "Huruf t." },
  ],
}));
const publik = parsed.map(toPublicQuestion);
check("soal publik tanpa kunci", parsed.length === 1 && !("jawaban" in publik[0]) && !("explanation" in publik[0]));
check("nilai menerima indeks", gradeRobloxAnswer(0, 0, ["t", "l"]));
check("nilai menerima teks pilihan", gradeRobloxAnswer(0, "T", ["t", "l"]));
check("nilai menolak pilihan salah", !gradeRobloxAnswer(0, "l", ["t", "l"]));
const sampled = sampleQuestions([1, 2, 3, 4], 2, () => 0);
check("pengambilan soal terpotong", sampled.length === 2);

const saved: Record<string, string | undefined> = {};
for (const key of ["ROBLOX_EXPERIENCE_URL", "ROBLOX_PLACE_ID", "ROBLOX_MIN_AGE", "ROBLOX_AGE_GATE_ENABLED"]) {
  saved[key] = process.env[key];
  delete process.env[key];
}
try {
  check("URL bawaan Kota Aksara", robloxExperienceUrl() === ROBLOX_EXPERIENCE_URL_DEFAULT);
  check("place bawaan", robloxPlaceId() === ROBLOX_PLACE_ID_DEFAULT);
  check("gerbang bawaan 16", robloxAgeGate().enabled && robloxAgeGate().minAge === 16);
  process.env.ROBLOX_EXPERIENCE_URL = "https://www.roblox.com/games/1";
  check("URL env menimpa bawaan", robloxExperienceUrl() === "https://www.roblox.com/games/1");
  delete process.env.ROBLOX_EXPERIENCE_URL;
  process.env.ROBLOX_PLACE_ID = "99";
  check("place pendek tidak merakit URL", robloxExperienceUrl() === ROBLOX_EXPERIENCE_URL_DEFAULT);
  delete process.env.ROBLOX_PLACE_ID;
  process.env.ROBLOX_AGE_GATE_ENABLED = "false";
  check("gerbang bisa dimatikan", ageGateSatisfied(null) === true);
  delete process.env.ROBLOX_AGE_GATE_ENABLED;
  process.env.ROBLOX_MIN_AGE = "0";
  check("batas 0 membuka semua usia", ageGateSatisfied(null, { enabled: false, minAge: 0 }));
  check("konfirmasi 16 lolos batas 16", ageGateSatisfied(16, { enabled: true, minAge: 16 }));
  check("konfirmasi 16 gagal bila batas naik", !ageGateSatisfied(16, { enabled: true, minAge: 18 }));
  check("konfirmasi lebih tinggi tetap sah", ageGateSatisfied(18, { enabled: true, minAge: 16 }));
} finally {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const service = read("lib/roblox/service.ts");
const resultsRoute = read("app/api/roblox/results/route.ts");
const questionsRoute = read("app/api/roblox/questions/route.ts");
const card = read("components/arena/game-hub/GameCard.tsx");
const panel = read("components/arena/roblox/RobloxLinkPanel.tsx");
const envExample = read(".env.example");
const doc = read("docs/roblox-integration.md");
const http = read("lib/roblox/http.ts");

check("XP lewat awardXp dan referensi keputusan", service.includes("awardXp(userId, ROBLOX_XP_SOURCE, decision.xp, decision.reference)"));
check("hasil tidak membaca XP klien", !resultsRoute.includes("xpEarned") && !service.includes("input.xp"));
check("soal publik lewat toPublicQuestion", service.includes("toPublicQuestion"));
check("route soal tidak memilih correctAnswer", !questionsRoute.includes("correctAnswer"));
check("kartu gim memakai kelas CTA yang sama", card.includes("GAME_CARD_CTA_CLASS") && card.includes("gameCardCtaStyle"));
check("halaman Roblox memakai tombol kartu", panel.includes("GAME_CARD_BUTTON_CLASS") && panel.includes("GAME_CARD_QUIET_CLASS"));
const roblox = gameById("roblox");
check("registry punya Kota Aksara", roblox?.href === "/arena/game/roblox" && roblox.title === "BahasaCerdas Kota Aksara");
check("env contoh memuat place dan secret", envExample.includes("ROBLOX_SERVER_SECRET=") && envExample.includes(ROBLOX_PLACE_ID_DEFAULT) && envExample.includes(ROBLOX_UNIVERSE_ID_DEFAULT));
check("dokumen memuat vektor HMAC dan URL", doc.includes("WAkTMIWDkX3KQPldfsBIRm4vjzIX0ghrAZH-JX68akY") && doc.includes(ROBLOX_EXPERIENCE_URL_DEFAULT));
check("dokumen memakai GetSecret Bearer", doc.includes('GetSecret("BAHASACERDAS_ROBLOX_KEY")') && doc.includes('AddPrefix("Bearer ")'));
check("gateway mencatat JobId dan PlaceId", http.includes("x-roblox-job-id") && http.includes("x-roblox-place-id") && http.includes("authenticateRobloxServer"));

if (failed > 0) {
  console.error(`\n${failed} pemeriksaan gagal`);
  process.exit(1);
}
console.log("Roblox integration: semua pemeriksaan lulus");
process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
