type EventRow = { room: string; event: string; payload: any };

async function main() {
  process.env.KUIS_TEMPUR_MATCH_SECONDS = "1";
  process.env.KUIS_TEMPUR_FINISHED_CLEANUP_MS = "250";
  const { createKuisTempurArena } = await import("../game-server/src/kuis-tempur-arena.ts");

  const events: EventRow[] = [];
  let persisted = 0;
  const io: any = {
    to(room: string) {
      return {
        emit(event: string, payload: any) {
          events.push({ room, event, payload });
        },
      };
    },
  };

  const players = new Map(
    ["p1", "p2", "p3"].map((id, index) => [
      id,
      {
        id,
        odiceId: `socket-${id}`,
        playerName: `Pemain ${index + 1}`,
        score: 0,
        correct: 0,
        wrong: 0,
        streak: 0,
        maxStreak: 0,
        answerTimes: [],
        ready: true,
      },
    ])
  );

  const room: any = {
    id: "rematch-room",
    code: "REMATCH",
    name: "Rematch Test",
    hostId: "p1",
    gameType: "KUIS_BATTLE",
    category: "KUIS_TEMPUR_ARENA",
    difficulty: "MEDIUM",
    status: "WAITING",
    questionCount: 10,
    timePerQuestion: 3,
    currentQuestion: 0,
    questions: [],
    players,
  };

  const questions = Array.from({ length: 10 }, (_, i) => ({
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
    persistResults: async () => {
      await new Promise((resolve) => setTimeout(resolve, 650));
      persisted += 1;
    },
  });

  const assert = (label: string, condition: boolean) => {
    if (!condition) throw new Error(`FAIL: ${label}`);
    console.log(`  ✅ ${label}`);
  };

  console.log("\n— KUIS TEMPUR TRUE REMATCH —");
  await arena.start(room);
  await new Promise((resolve) => setTimeout(resolve, 1250));

  assert("round 1 finishes", events.some((row) => row.event === "arena-finished"));
  assert("room enters FINISHED while persistence can still be in flight", room.status === "FINISHED");

  await arena.requestRematch({ code: room.code, userId: "p1" });
  const vote1 = events.filter((row) => row.event === "arena-rematch-status").at(-1)?.payload;
  assert("first vote waits", vote1?.readyCount === 1 && vote1?.requiredCount === 2 && vote1?.starting === false);

  await arena.requestRematch({ code: room.code, userId: "p2" });
  const starts = events.filter((row) => row.event === "arena-start");
  assert("second vote starts same room", starts.length === 2 && starts.at(-1)?.payload?.code === room.code);
  assert("room returns IN_PROGRESS", room.status === "IN_PROGRESS");

  const latestState = events.filter((row) => row.event === "arena-state").at(-1)?.payload;
  assert("fresh round has 3 humans", latestState?.entities?.filter((e: any) => e.kind === "human").length === 3);
  assert("fresh round resets score/ammo/kills", latestState.entities.every((e: any) => e.score === 0 && e.ammo === 0 && e.kills === 0));
  assert("fresh round sends questions", events.filter((row) => row.event === "arena-question").length >= 6);

  await new Promise((resolve) => setTimeout(resolve, 400));
  assert("stale cleanup cannot delete the new rematch", rooms.has(room.code) && arena.isActive(room.code));
  assert("round 1 persistence still completes exactly once", persisted === 1);

  console.log("\nPASS: true rematch reuses room and resets authoritative state\n");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
