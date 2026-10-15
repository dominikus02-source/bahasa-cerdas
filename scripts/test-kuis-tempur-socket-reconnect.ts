import { createServer } from "node:http";
import { Server } from "socket.io";
import { strict as assert } from "node:assert";

async function main() {
const httpServer = createServer();
const io = new Server(httpServer, { transports: ["websocket", "polling"] });
await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
const address = httpServer.address();
if (!address || typeof address === "string") throw new Error("Test socket port missing");
process.env.NEXT_PUBLIC_GAME_SERVER_URL = "http://127.0.0.1:" + address.port;

const realFetch = globalThis.fetch;
let releaseAuth!: () => void;
const authGate = new Promise<void>((resolve) => { releaseAuth = resolve; });
globalThis.fetch = (async (_input: RequestInfo | URL) => {
  await authGate;
  return { ok: true, json: async () => ({ token: "test-credential" }) } as Response;
}) as typeof fetch;

const received: Array<{ type: string; code: string }> = [];
let original!: { conn: { close(): void } };
io.on("connection", (socket) => {
  if (!original) original = socket;
  socket.on("join-room", (request: { code: string; userId: string }) => {
    received.push({ type: "join", code: request.code });
    socket.join(request.code);
    socket.emit("room-joined", {
      code: request.code,
      roomId: request.code,
      name: request.code,
      isHost: false,
      matchmaking: "PRIVATE",
      player: { id: request.userId, playerName: "Murid Uji" },
    });
  });
});
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean) {
  for (let i = 0; i < 120; i++) {
    if (check()) return;
    await pause(50);
  }
  throw new Error("Timed out awaiting socket event");
}

try {
  const { gameSocket } = await import("../lib/game/socket");
  gameSocket.connect("u-1", "Murid Uji");
  gameSocket.joinRoom({ code: "ABC234", userId: "u-1", playerName: "Murid Uji" });
  assert.equal(received.length, 0, "Command must queue before token response");
  releaseAuth();
  await until(() => received.length === 1);
  assert.deepEqual(received[0], { type: "join", code: "ABC234" });
  console.log("PASS: room join queued until socket authentication");

  original.conn.close();
  await until(() => received.length === 2);
  assert.deepEqual(received[1], { type: "join", code: "ABC234" });
  console.log("PASS: disconnect automatically re-joins the same room");

  gameSocket.leaveRoom({ code: "ABC234", userId: "u-1" });
  await pause(400);
  assert.equal(received.length, 2, "Leaving room must clear resume state");
  console.log("PASS: explicit room exit clears reconnection reservation");
  gameSocket.disconnect();
} finally {
  globalThis.fetch = realFetch;
  io.close();
  httpServer.close();
}

}
main().catch((error) => { console.error(error); process.exitCode = 1; });
