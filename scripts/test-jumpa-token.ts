/**
 * JUMPA Fase 1 — uji token LiveKit (grant aman, TTL, metadata, konfigurasi).
 * Jalankan: npm run test:jumpa-token
 *
 * Opsional integrasi nyata: set JUMPA_TEST_LIVEKIT_URL (mis. http://127.0.0.1:7880)
 * + JUMPA_TEST_LIVEKIT_KEY/SECRET untuk livekit-server lokal (--dev / LIVEKIT_KEYS).
 */
import { TokenVerifier, TrackSource } from "livekit-server-sdk"
import { buildJoinGrant, mintJoinToken } from "../lib/jumpa/token"
import { JUMPA_TOKEN_TTL_SEC } from "../lib/jumpa/caps"
import { getLivekitServerConfig, getLivekitPublicWsUrl, DEFAULT_LIVEKIT_URL } from "../lib/jumpa/config"
import { ensureLivekitRoom, countActiveOthers } from "../lib/jumpa/livekit"

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✅ ${label}`) }
  else { failed++; console.log(`  ❌ ${label}`) }
}

const KEY = "testkey"
const SECRET = "testsecret_testsecret_testsecret_0123456789"

async function main() {
  console.log("\n=== JUMPA — TOKEN & CONFIG ===\n")

  console.log("1. Grant")
  const g = buildJoinGrant("bc-room-1", ["camera", "microphone"])
  check("roomJoin hanya untuk ruang yang diminta", g.roomJoin === true && g.room === "bc-room-1")
  check("Tidak ada roomAdmin/roomCreate/roomRecord/roomList", !g.roomAdmin && !g.roomCreate && !g.roomRecord && !g.roomList)
  check("Tidak hidden/recorder", !g.hidden && !g.recorder)
  check("canUpdateOwnMetadata = false (peran tak bisa dipalsukan)", g.canUpdateOwnMetadata === false)
  check("Sumber publish hanya kamera + mikrofon", JSON.stringify(g.canPublishSources) === JSON.stringify([TrackSource.CAMERA, TrackSource.MICROPHONE]))
  const none = buildJoinGrant("bc-room-1", [])
  check("Tanpa sumber → canPublish false", none.canPublish === false)

  console.log("\n2. JWT")
  const jwt = await mintJoinToken({
    apiKey: KEY,
    apiSecret: SECRET,
    identity: "user-123",
    name: "Bu Siti",
    metadata: { v: 1, bcRole: "GURU", roomRole: "HOST", avatar: null },
    grant: g,
  })
  const claims = await new TokenVerifier(KEY, SECRET).verify(jwt)
  check("Tanda tangan valid", !!claims)
  check("identity = userId", claims.sub === "user-123")
  check("name terbawa", claims.name === "Bu Siti")
  const ttl = (claims.exp ?? 0) - (claims.nbf ?? claims.iat ?? 0)
  check(`TTL pendek (${JUMPA_TOKEN_TTL_SEC}s)`, Math.abs(ttl - JUMPA_TOKEN_TTL_SEC) <= 5)
  const meta = JSON.parse(claims.metadata ?? "{}")
  check("Metadata peran dari server", meta.bcRole === "GURU" && meta.roomRole === "HOST" && meta.v === 1)
  check("Klaim video tidak berisi admin", !claims.video?.roomAdmin && !claims.video?.roomCreate && claims.video?.canUpdateOwnMetadata === false)
  let rejected = false
  try { await new TokenVerifier(KEY, "secret-lain-secret-lain-secret-lain-00").verify(jwt) } catch { rejected = true }
  check("Secret salah → token ditolak", rejected)

  console.log("\n3. Konfigurasi (env)")
  const saved = { ...process.env }
  delete process.env.LIVEKIT_API_KEY; delete process.env.LIVEKIT_API_SECRET; delete process.env.LIVEKIT_URL; delete process.env.NEXT_PUBLIC_LIVEKIT_WS_URL
  check("Tanpa kunci → null (API jawab 503, bukan crash)", getLivekitServerConfig() === null)
  process.env.LIVEKIT_API_KEY = "k"; process.env.LIVEKIT_API_SECRET = "s"
  check("Default URL internal docker", getLivekitServerConfig()?.url === DEFAULT_LIVEKIT_URL)
  process.env.LIVEKIT_URL = "https://media.vps-lain.id/"
  check("LIVEKIT_URL bisa diarahkan ke VPS lain", getLivekitServerConfig()?.url === "https://media.vps-lain.id")
  check("WS default wss://jumpa.bahasacerdas.com", getLivekitPublicWsUrl() === "wss://jumpa.bahasacerdas.com")
  process.env = saved

  console.log("\n4. Degradasi aman bila LiveKit mati")
  const deadCfg = { url: "http://127.0.0.1:1", apiKey: KEY, apiSecret: SECRET }
  check("countActiveOthers → 0 saat server tak terjangkau", (await countActiveOthers("bc-x", "u", deadCfg)) === 0)
  let threw = false
  try { await ensureLivekitRoom({ name: "bc-x", maxParticipants: 5, config: deadCfg }) } catch { threw = true }
  check("ensureLivekitRoom melempar (→ 503 MEDIA_UNAVAILABLE)", threw)

  const liveUrl = process.env.JUMPA_TEST_LIVEKIT_URL
  if (liveUrl) {
    console.log("\n5. Integrasi livekit-server lokal")
    const cfg = { url: liveUrl, apiKey: process.env.JUMPA_TEST_LIVEKIT_KEY ?? "devkey", apiSecret: process.env.JUMPA_TEST_LIVEKIT_SECRET ?? "secret" }
    const name = `bc-test-${Date.now()}`
    await ensureLivekitRoom({ name, maxParticipants: 8, config: cfg })
    check("createRoom berhasil", true)
    await ensureLivekitRoom({ name, maxParticipants: 8, config: cfg })
    check("createRoom idempoten", true)
    check("Ruang kosong → 0 peserta", (await countActiveOthers(name, "u", cfg)) === 0)
  } else {
    console.log("\n5. Integrasi dilewati (JUMPA_TEST_LIVEKIT_URL tidak di-set)")
  }

  console.log(`\n${passed} lulus, ${failed} gagal\n`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
