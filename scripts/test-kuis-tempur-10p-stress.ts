import { performance } from "node:perf_hooks";
import { createKuisTempurArena } from "../game-server/src/kuis-tempur-arena.ts";

type EventRow = { room: string; event: string; payload: any };
const events: EventRow[] = [];

const io: any = {
  to(room: string) {
    return {
      emit(event: string, payload: any) {
        events.push({ room, event, payload });
      },
    };
  },
};

const characterIds = [
  "arga", "ki-jaka", "bu-ratmi", "bu-sari", "eyang-kartala",
  "pak-empu", "arga", "ki-jaka", "bu-ratmi", "bu-sari",
];

const players = new Map(
  Array.from({ length: 10 }, (_, i) => {
    const id = `p${i + 1}`;
    return [
      id,
      {
        id,
        odiceId: `socket-${id}`,
        playerName: `Pemain ${i + 1}`,
        characterId: characterIds[i],
        score: 0,
        correct: 0,
        wrong: 0,
        streak: 0,
        maxStreak: 0,
        answerTimes: [],
        ready: true,
      },
    ];
  })
);

const room: any = {
  id: "stress-room",
  code: "STRESS10",
  name: "Stress 10 Players",
  hostId: "p1",
  gameType: "KUIS_BATTLE",
  category: "KUIS_TEMPUR_ARENA",
  difficulty: "MEDIUM",
  status: "WAITING",
  questionCount: 30,
  timePerQuestion: 15,
  currentQuestion: 0,
  questions: [],
  players,
};

const questions = Array.from({ length: 30 }, (_, i) => ({
  id: `q${i}`,
  text: `Question ${i}`,
  options: ["A", "B", "C", "D"],
  correctAnswer: "0",
}));

const rooms = new Map([[room.code, room]]) as any;
const arena = createKuisTempurArena({
  io,
  rooms,
  loadQuestions: async () => questions,
  persistResults: async () => {},
});

function latestState() {
  return events.filter((row) => row.event === "arena-state").at(-1)?.payload;
}

function assert(label: string, condition: boolean) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`  ✅ ${label}`);
}

async function main() {
  console.log("\n— KUIS TEMPUR 10P STRESS / RECONNECT —");
  await arena.start(room);

  const initial = latestState();
  assert("match starts with 10 humans", initial?.entities?.filter((e: any) => e.kind === "human").length === 10);
  assert("main multiplayer has zero bots", initial?.entities?.filter((e: any) => e.kind === "bot").length === 0);
  assert("character choices survive into authoritative state", initial?.entities?.filter((e: any) => e.kind === "human").every((e: any, index: number) => e.characterId === characterIds[index]));

  for (let i = 1; i <= 10; i++) {
    arena.answer({ code: room.code, userId: `p${i}`, questionId: "q0", answerIndex: 0 });
  }
  await new Promise((resolve) => setTimeout(resolve, 80));

  const afterAnswers = latestState();
  assert(
    "10 simultaneous correct answers grant ammo",
    afterAnswers.entities.filter((e: any) => e.kind === "human").every((e: any) => e.ammo === 1)
  );

  const moveStarted = performance.now();
  for (let round = 0; round < 1000; round++) {
    for (let i = 1; i <= 10; i++) {
      arena.move({
        code: room.code,
        userId: `p${i}`,
        x: 80 + ((round * 37 + i * 113) % 1240),
        y: 80 + ((round * 29 + i * 71) % 680),
      });
    }
  }
  const moveDuration = performance.now() - moveStarted;
  assert("10,000 authoritative move commands stay responsive", moveDuration < 1500);
  console.log(`     movement burst: ${moveDuration.toFixed(1)} ms`);

  arena.disconnect(room.code, "p9");
  await new Promise((resolve) => setTimeout(resolve, 130));
  const disconnectedState = latestState();
  const disconnectedP9 = disconnectedState.entities.find((e: any) => e.id === "p9");
  assert("disconnect is projected to clients", disconnectedP9?.connected === false);

  const hitsBeforeOfflineShot = events.filter((row) => row.event === "arena-hit").length;
  arena.shoot({ code: room.code, userId: "p2", targetId: "p9" });
  await new Promise((resolve) => setTimeout(resolve, 30));
  const hitsAfterOfflineShot = events.filter((row) => row.event === "arena-hit").length;
  assert("offline player cannot be damaged", hitsAfterOfflineShot === hitsBeforeOfflineShot);

  const reconnectSocket: any = {
    id: "socket-p9-reconnected",
    join() {},
    emit(event: string, payload: any) {
      events.push({ room: "socket-p9-reconnected", event, payload });
    },
  };
  assert("reconnect succeeds", arena.reconnect(reconnectSocket, room.code, "p9") === true);
  await new Promise((resolve) => setTimeout(resolve, 130));
  const reconnectedState = latestState();
  assert("reconnected player returns online", reconnectedState.entities.find((e: any) => e.id === "p9")?.connected === true);

  const reconnectEvents = events.filter((row) => row.room === "socket-p9-reconnected").map((row) => row.event);
  assert("reconnect resends arena start", reconnectEvents.includes("arena-start"));
  assert("reconnect resends state", reconnectEvents.includes("arena-state"));
  assert("reconnect restores question stream", reconnectEvents.includes("arena-question"));

  console.log("\nPASS: 10-player stress + reconnect safety\n");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
