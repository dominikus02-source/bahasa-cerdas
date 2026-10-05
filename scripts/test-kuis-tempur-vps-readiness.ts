import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const server = read("game-server/src/server.ts");
const dockerfile = read("game-server/Dockerfile");
const envExample = read("game-server/.env.example");
const socketClient = read("lib/game/socket.ts");
const socketTokenRoute = read("app/api/game/socket-token/route.ts");

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    failed += 1;
    console.error(`  ❌ ${label}`);
  }
}

console.log("\n— KUIS TEMPUR VPS READINESS —");

check("health endpoint tersedia", server.includes("req.url === '/health'"));
check("server bind ke 0.0.0.0", server.includes("httpServer.listen(PORT, '0.0.0.0'"));
check("CORS wildcard sudah dihapus", !server.includes("origin: '*'"));
check("allowed origin bisa dikonfigurasi env", server.includes("GAME_ALLOWED_ORIGINS"));
check("WebSocket upgrade memakai origin policy", server.includes("allowRequest(req, callback)"));
check("production default hanya domain BahasaCerdas", server.includes("https://www.bahasacerdas.com") && server.includes("https://bahasacerdas.com"));
check("socket tetap memakai signed identity", server.includes("verifySocketToken") && server.includes("Unauthorized game connection"));
check("web bridge memakai HMAC secret", server.includes("KUIS_TEMPUR_SERVER_SECRET") && server.includes("createHmac('sha256'"));
check("web bridge URL configurable", server.includes("BAHASACERDAS_WEB_URL"));
check("SIGTERM graceful shutdown", server.includes("process.on('SIGTERM'") && server.includes("Shutdown complete"));
check("Prisma ditutup saat shutdown", server.includes("prisma.$disconnect()"));
check("Docker image menjalankan compiled JS", dockerfile.includes('CMD ["node", "dist/server.js"]'));
check("Docker punya HEALTHCHECK", dockerfile.includes("HEALTHCHECK"));
check("Docker berjalan non-root", dockerfile.includes("USER node"));
check("Docker menerima SIGTERM", dockerfile.includes("STOPSIGNAL SIGTERM"));
check("env example memuat production origin", envExample.includes("GAME_ALLOWED_ORIGINS="));
check("env example memuat bridge URL", envExample.includes("BAHASACERDAS_WEB_URL="));
check("env example memuat bridge secret", envExample.includes("KUIS_TEMPUR_SERVER_SECRET="));
check("frontend game server URL configurable", socketClient.includes("NEXT_PUBLIC_GAME_SERVER_URL"));
check("signed token expiry memakai unit ms yang sama", socketTokenRoute.includes("Date.now() + 5 * 60 * 1000") && server.includes("identity.exp <= Date.now()"));
check("client refresh token saat reconnect unauthorized", socketClient.includes("MAX_AUTH_REFRESH_ATTEMPTS") && socketClient.includes("authenticateCurrentSocket") && socketClient.includes("/unauthorized/i"));
check("auth refresh dibatasi retry", socketClient.includes("authRefreshAttempts < MAX_AUTH_REFRESH_ATTEMPTS"));
check("signing public key bisa dirotasi via env", server.includes("GAME_SERVER_SIGNING_PUBLIC_KEY_B64") && envExample.includes("GAME_SERVER_SIGNING_PUBLIC_KEY_B64="));
check("leave-room terikat signed socket identity", server.includes("const userId = identity?.sub || data.userId") && server.includes("player.odiceId !== socket.id"));

console.log(`\nHasil: ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
