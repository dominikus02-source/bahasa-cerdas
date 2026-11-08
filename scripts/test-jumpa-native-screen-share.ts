/* Regression: berbagi layar native Android JUMPA (identitas layar terpisah). */
import { readFileSync } from "node:fs";
import { buildScreenShareGrant, buildJoinGrant, mintJoinToken } from "../lib/jumpa/token";
import { isScreenIdentity, screenIdentityFor, screenIdentityOrNull, screenOwnerOf, SCREEN_TOKEN_TTL_SEC } from "../lib/jumpa/screen-identity";
import { buildNativeStartMessage, NATIVE_STOP_MESSAGE, nativeScreenMessage, parseNativeScreenEvent } from "../components/jumpa/native-screen-share";

let passed = 0, failed = 0;
const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; console.log(`${ok ? "PASS" : "FAIL"} ${n}`); };
const src = (p: string) => readFileSync(p, "utf8");

(async () => {
  // Identitas
  check("identitas layar = screen:<userId>", screenIdentityFor("u_1-A") === "screen:u_1-A");
  check("pemilik dari identitas layar", screenOwnerOf("screen:u_1") === "u_1" && screenOwnerOf("u_1") === null);
  check("identitas tak sah ditolak", screenOwnerOf("screen:a:b") === null && screenIdentityOrNull("a b") === null);
  let threw = false; try { screenIdentityFor("screen:x"); } catch { threw = true; }
  check("tidak bisa membuat identitas layar bertingkat", threw);
  check("userId biasa bukan identitas layar", !isScreenIdentity("8f14e45f-ceea-467f-a0e6-1b2c3d4e5f60"));

  // Grant & token
  const g = buildScreenShareGrant("room-1");
  check("grant layar: hanya SCREEN_SHARE", JSON.stringify(g.canPublishSources) === JSON.stringify([3]) || JSON.stringify(g.canPublishSources) === JSON.stringify(["SCREEN_SHARE"]) || g.canPublishSources?.length === 1);
  check("grant layar: tanpa subscribe/data/admin/metadata", g.canSubscribe === false && g.canPublishData === false && g.roomAdmin === false && g.roomRecord === false && g.canUpdateOwnMetadata === false && g.room === "room-1");
  const token = await mintJoinToken({ apiKey: "k", apiSecret: "s".repeat(32), identity: screenIdentityFor("u1"), name: "A (layar)", metadata: { v: 1, kind: "screen", owner: "u1" }, grant: g, ttlSec: SCREEN_TOKEN_TTL_SEC });
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  check("token: sub screen:, video.canSubscribe=false, canPublishData=false (cocok cek native)", claims.sub === "screen:u1" && claims.video.canSubscribe === false && claims.video.canPublishData === false && JSON.stringify(claims.video.canPublishSources) === '["screen_share"]');
  check("token: TTL 60 detik", claims.exp - claims.nbf === 60);
  check("grant peserta biasa tidak berubah", buildJoinGrant("r", ["camera"]).canSubscribe === true);

  // Jembatan web
  check("start message berbentuk v1", JSON.parse(buildNativeStartMessage("wss://jumpa.bahasacerdas.com", "a.b.c")).type === "start");
  check("stop message berbentuk v1", JSON.parse(NATIVE_STOP_MESSAGE).type === "stop");
  check("event native valid diterima", parseNativeScreenEvent({ state: "error", reason: "denied" })?.reason === "denied");
  check("event native asing ditolak", parseNativeScreenEvent({ state: "hacked" }) === null && parseNativeScreenEvent("x") === null);
  check("alasan asing dibuang", parseNativeScreenEvent({ state: "stopped", reason: "<img>" })?.reason === undefined);
  check("pesan Indonesia: izin ditolak", nativeScreenMessage({ state: "error", reason: "denied" })?.text.includes("Izin merekam layar") === true);
  check("pesan Indonesia: dicabut pemandu", nativeScreenMessage({ state: "stopped", reason: "revoked" })?.text.includes("pemandu") === true);

  // Server: urutan & pembersihan
  const route = src("app/api/jumpa/rooms/[code]/token/route.ts");
  const screenFn = route.slice(route.indexOf("async function screenShareToken"));
  check("token layar: pemilik harus sedang tersambung", screenFn.includes("p.identity === user.id") && screenFn.includes("NOT_CONNECTED"));
  check("token layar: keputusan join yang sama + izin screen_share", screenFn.includes("loadRoomContext(") && screenFn.includes('sources.includes("screen_share")'));
  check("token layar: kapasitas LiveKit tidak dilampaui (termasuk pemandu)", screenFn.includes("activeOthers >= ctx.room.maxParticipants"));
  check("token layar: tidak mencatat kehadiran", !screenFn.includes("recordJoinGranted"));
  check("token layar: grant khusus + TTL singkat", screenFn.includes("buildScreenShareGrant(") && screenFn.includes("SCREEN_TOKEN_TTL_SEC"));
  const actions = src("lib/jumpa/room-actions.ts");
  check("STOP_SCREEN memutus identitas layar", /source === "screen_share"\) await disconnectScreenIdentity\(lk, screenIdentityFor/.test(actions));
  check("REMOVE memutus identitas layar", actions.includes("await disconnectScreenIdentity(lk, screenIdentityFor(target!.userId));") && actions.includes("await removeLivekitParticipant(roomName, screenIdentity)"));
  check("DISALLOW murid memutus layar murid & tak menaikkan izin identitas layar", actions.includes("if (isScreenIdentity(p.identity)) continue;") && actions.includes("muridOwners.has(owner)"));
  const bg = src("lib/jumpa/background.ts");
  check("webhook: identitas layar bukan kehadiran", bg.includes("if (isScreenIdentity(evt.identity)) return \"ok\";"));
  check("webhook: pemilik keluar → layar diputus", bg.includes("screenIdentityOrNull(evt.identity)") && bg.includes("removeLivekitParticipant(room.livekitRoomName, ownedScreen)"));

  // UI
  const view = src("components/jumpa/JumpaRoomView.tsx");
  check("tile kamera mengecualikan identitas layar", view.includes("!isScreenIdentity(t.participant.identity)"));
  check("hitungan peserta mengecualikan identitas layar", view.includes("filter((p) => !isScreenIdentity(p.identity)).length"));
  check("layar milik sendiri tidak dirender (tanpa efek cermin)", view.includes("screenOwnerOf(t.participant.identity) !== localIdentity"));
  check("tombol layar muncul untuk getDisplayMedia ATAU kapabilitas native", view.includes("(screenSupported || nativeScreen.available)"));
  check("daftar peserta/laporan mengecualikan identitas layar", src("components/jumpa/RoomPanels.tsx").includes("filter((p) => !isScreenIdentity(p.identity))"));
  const bridge = src("components/jumpa/native-screen-share.ts");
  check("kapabilitas native = channel BahasaCerdasScreenShare (APK lama tanpa tombol)", bridge.includes("BahasaCerdasScreenShare") && bridge.includes('typeof b.postMessage === "function"'));
  check("unmount/keluar ruang mengirim stop", bridge.includes("nativeScreenBridge()?.postMessage(NATIVE_STOP_MESSAGE);"));

  // Native (sumber)
  const manifest = src("mobile/android/app/src/main/AndroidManifest.xml");
  check("manifest: FGS mediaProjection + izin Android 14", manifest.includes('android:foregroundServiceType="mediaProjection"') && manifest.includes("FOREGROUND_SERVICE_MEDIA_PROJECTION") && /ScreenShareService"[\s\S]*?android:exported="false"/.test(manifest));
  const dart = src("mobile/lib/core/screen_share/native_screen_share.dart");
  const iPerm = dart.indexOf("requestCapturePermission()"), iSvc = dart.indexOf("invokeMethod<void>('startService')"), iPub = dart.indexOf("setScreenShareEnabled(true");
  check("native: urutan persetujuan → FGS → terbitkan layar", iPerm > 0 && iPerm < iSvc && iSvc < iPub);
  check("native: penolakan izin tidak memulai service", /if \(!granted\) \{\s*_status\('error', 'denied'\);\s*return;/.test(dart));
  check("native: autoSubscribe false", dart.includes("ConnectOptions(autoSubscribe: false)"));
  const web = src("mobile/lib/features/webview/webview_screen.dart");
  check("native: channel hanya Android, sebelum loadRequest", web.indexOf("'BahasaCerdasScreenShare'") > 0 && web.indexOf("'BahasaCerdasScreenShare'") < web.indexOf("..loadRequest(") && web.includes("defaultTargetPlatform == TargetPlatform.android"));
  check("native: keluar ruang/dispose menghentikan berbagi", web.includes("if (!active && _screenShare.isActive) unawaited(_screenShare.stop());") && web.includes("unawaited(_screenShare.stop());\n    _authChannel"));
  check("native: pesan divalidasi terhadap URL halaman saat ini", web.includes("ScreenShareRequest.parse(raw, pageUrl: await _controller.currentUrl())"));

  console.log(`RESULT ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
})();
