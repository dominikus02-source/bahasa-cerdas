/** Uji kebijakan JUMPA bersama menggantikan segmentasi paket lama. */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { limitsFor, cameraCapFor, screenCapFor, checkDailyQuota, tierView, startOfJakartaDay, startOfJakartaWeek } from "../lib/jumpa/tiers";
import { JUMPA_TRIAL } from "../lib/jumpa/trial-policy";
import { jumpaRoomLimits } from "../lib/jumpa/server-limits";
import { tierForRoomKind } from "../lib/jumpa/entitlement";
import { classifyDevice, publishPolicy, receivePolicy } from "../components/jumpa/media-policy";
import { DEFAULT_MEDIA_PREFS, parseMediaPrefs } from "../components/jumpa/media-prefs";
let passed = 0;
function check(label: string, condition: boolean) { assert.ok(condition, label); passed++; }
for (const tier of ["FREE", "PREMIUM"] as const) for (const kind of ["KELAS", "GURU", "MURID", "UMUM"] as const) {
  const cap = limitsFor(tier, kind);
  check(`${tier}/${kind}: batas sesuai paket`, cap.maxParticipants === (tier === "FREE" ? 30 : 150) && cap.maxDurationMin === (tier === "FREE" ? 45 : 240));
  check(`${tier}/${kind}: caps konsisten`, JSON.stringify(cap) === JSON.stringify(limitsFor(tier, "GURU")));
  check(`${tier}/${kind}: kualitas sama`, cameraCapFor(tier, kind) === 720 && screenCapFor(tier, kind) === 720);
  check(`${tier}/${kind}: tanpa kuota harian produk`, checkDailyQuota(tier, kind, 100).ok);
  check(`${tier}/${kind}: payload webinar tidak mengubah batas`, JSON.stringify(limitsFor(tier, kind, true)) === JSON.stringify(cap));
  const view = tierView({ tier, kind, ...cap, viewerIsGuruCreator: true });
  check(`${tier}/${kind}: tanpa upsell`, !view.canUpgrade && view.upgradeUrl === null && view.label === (tier === "FREE" ? "Free" : "Premium"));
}
const previousLimit = process.env.JUMPA_MAX_PARTICIPANTS;
try {
  delete process.env.JUMPA_MAX_PARTICIPANTS;
  check("Premium dibatasi kapasitas operasional default", jumpaRoomLimits("PREMIUM").maxParticipants === 30);
  process.env.JUMPA_MAX_PARTICIPANTS = "150";
  check("Premium dapat 150 setelah kapasitas server dikonfigurasi", jumpaRoomLimits("PREMIUM").maxParticipants === 150);
  check("Free tetap 30 pada server besar", jumpaRoomLimits("FREE").maxParticipants === 30);
  check("Premium murid berlaku pada semua jenis ruang", tierForRoomKind("MURID_PREMIUM", "GURU") === "PREMIUM");
} finally {
  if (previousLimit === undefined) delete process.env.JUMPA_MAX_PARTICIPANTS;
  else process.env.JUMPA_MAX_PARTICIPANTS = previousLimit;
}
const mutable = limitsFor("FREE", "GURU"); mutable.maxParticipants = 999;
check("Tidak memutasi kebijakan bersama", limitsFor("FREE", "GURU").maxParticipants === 30);
check("Hari WIB benar", startOfJakartaDay(new Date("2026-11-02T17:10:00Z")).toISOString() === "2026-11-02T17:00:00.000Z");
check("Minggu WIB benar", startOfJakartaWeek(new Date("2026-11-02T03:00:00Z")).toISOString() === "2026-11-01T17:00:00.000Z");
console.log("\n6. Kebijakan media (ringan di HP)")
const android = classifyDevice({ userAgent: "Mozilla/5.0 (Linux; Android 11; SM-A125F) Chrome/120 Mobile", hardwareConcurrency: 8, deviceMemory: 3 })
const iphone = classifyDevice({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari", hardwareConcurrency: 6, deviceMemory: undefined })
const ipad = classifyDevice({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari", maxTouchPoints: 5 })
const laptop = classifyDevice({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120", hardwareConcurrency: 8, deviceMemory: 8 })
check("Android RAM 3 GB terdeteksi HP lemah", android.mobile && android.android && android.lowEnd)
check("iPhone & iPadOS terdeteksi iOS", iphone.ios && ipad.ios && ipad.mobile)
check("Codec: H.264 di iOS, VP8 di Android & desktop", publishPolicy("auto", iphone, 720).codec === "h264" && publishPolicy("auto", android, 720).codec === "vp8" && publishPolicy("auto", laptop, 720).codec === "vp8")
const pa = publishPolicy("auto", android, 720)
check("HP lemah Otomatis: 360p ≤ 20 fps", pa.capture.height === 360 && pa.capture.fps <= 20)
const pl = publishPolicy("auto", laptop, 1080)
check("Desktop Otomatis: 540p, satu lapis tambahan", pl.capture.height === 540 && pl.layers.length === 1)
check("Lapisan simulcast urut rendah → tinggi & di bawah capture", pl.layers.every((l, i, a) => l.height < pl.capture.height && (i === 0 || a[i - 1].height < l.height)))
check("HP Otomatis fps lebih rendah dari desktop", publishPolicy("auto", { ...android, lowEnd: false }, 720).capture.fps < 30)
check("Hemat Data: 360p/15 fps + audio speech", publishPolicy("hemat", laptop, 1080).capture.height === 360 && publishPolicy("hemat", laptop, 1080).capture.fps === 15 && publishPolicy("hemat", laptop, 1080).audio === "speech")
check("HD Gratis dibatasi 720p", publishPolicy("hd", laptop, 720).capture.height === 720)
check("HD Premium desktop 1080p", publishPolicy("hd", laptop, 1080).capture.height === 1080)
check("HD di HP tetap maks 720p", publishPolicy("hd", iphone, 1080).capture.height === 720)
const rm = receivePolicy("auto", android)
check("HP: grid 4 tile per halaman, strip dibatasi", rm.pageSize === 4 && rm.stripMax <= 6)
check("Desktop: maksimal 9 tile per halaman", receivePolicy("auto", laptop).pageSize === 9)
check("Koneksi lemah → kualitas terima rendah & strip lebih kecil", receivePolicy("auto", laptop, true).remoteQuality === "low" && receivePolicy("auto", laptop, true).stripMax < receivePolicy("auto", laptop).stripMax)
check("Koneksi lemah → kualitas kamera kirim ikut diturunkan", publishPolicy("hemat", laptop, 1080).capture.maxBitrate < publishPolicy("auto", laptop, 1080).capture.maxBitrate)
check("Hemat Data di HP: pixelDensity 1", receivePolicy("hemat", android).pixelDensity === 1)

console.log("\n7. Preferensi media")
check("Pengguna baru masuk dengan kamera dan mikrofon mati", !parseMediaPrefs(null).camera && !parseMediaPrefs(null).mic)
const old = parseMediaPrefs(JSON.stringify({ camera: false, mic: true }))
check("Preferensi Fase 1/2 tetap terbaca (default field baru)", old.camera === false && old.quality === "auto" && old.audioOnly === false && old.noiseSuppression === true)
check("Kualitas tak dikenal → auto", parseMediaPrefs(JSON.stringify({ quality: "ultra" })).quality === "auto")
check("deviceId aneh dibuang", parseMediaPrefs(JSON.stringify({ devices: { videoinput: "<script>", audioinput: "abc123" } })).devices.videoinput === undefined)
check("JSON rusak → default", parseMediaPrefs("{oops").camera === DEFAULT_MEDIA_PREFS.camera)


const home = readFileSync("components/jumpa/JumpaHome.tsx", "utf8");
check("Satu alur rapat, paket otomatis tanpa pilihan webinar", home.includes("Gabung ruang") && home.includes("Mulai ruang baru") && home.includes("packageTier") && !home.includes("isWebinar"));
console.log(`${passed} lulus, 0 gagal`);
