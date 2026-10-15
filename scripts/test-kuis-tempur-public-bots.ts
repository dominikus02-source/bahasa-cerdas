import { createKuisTempurArena } from "../game-server/src/kuis-tempur-arena.ts";

type TestPlayer = {
  id: string;
  odiceId: string;
  playerName: string;
  characterId: string;
  score: number;
  correct: number;
  wrong: number;
  streak: number;
  maxStreak: number;
  answerTimes: number[];
  ready: boolean;
};

const events: Array<{ room: string; event: string; payload: unknown }> = [];
const io = {
  to(room: string) {
    return {
      emit(event: string, payload: unknown) {
        events.push({ room, event, payload });
      },
    };
  },
};
const questions = Array.from({ length: 12 }, (_, index) => ({
  id: "q" + index,
  text: "Soal " + index,
  options: ["A", "B", "C", "D"],
  correctAnswer: "0",
}));
const makePlayer = (id: string): TestPlayer => ({
  id,
  odiceId: "socket-" + id,
  playerName: "Murid " + id,
  characterId: "arga",
  score: 0,
  correct: 0,
  wrong: 0,
  streak: 0,
  maxStreak: 0,
  answerTimes: [],
  ready: true,
});
const makeRoom = (code: string, matchmaking: "PUBLIC" | "PRIVATE", count: number) => ({
  id: code,
  code,
  name: code,
  hostId: "p1",
  gameType: "KUIS_BATTLE",
  category: "KUIS_TEMPUR_ARENA",
  matchmaking,
  difficulty: "MEDIUM",
  status: "WAITING",
  questionCount: 12,
  timePerQuestion: 15,
  currentQuestion: 0,
  questions: [],
  players: new Map(Array.from({ length: count }, (_, i) => {
    const player = makePlayer("p" + (i + 1));
    return [player.id, player];
  })),
});
function check(message: string, condition: boolean) {
  if (!condition) throw new Error(message);
  console.log("PASS:", message);
}
async function main() {
  const publicRoom = makeRoom("PUBLIC1", "PUBLIC", 1);
  const privateRoom = makeRoom("PRIVATE2", "PRIVATE", 2);
  const rooms = new Map<string, ReturnType<typeof makeRoom>>([
    [publicRoom.code, publicRoom],
    [privateRoom.code, privateRoom],
  ]);
  const arena = createKuisTempurArena({
    io: io as never,
    rooms: rooms as never,
    loadQuestions: async () => questions,
    persistResults: async () => {},
  });

  await arena.start(publicRoom);
  const publicStart = events.find((row) => row.room === "PUBLIC1" && row.event === "arena-start")?.payload as { humanCount: number; botCount: number } | undefined;
  const publicState = events.find((row) => row.room === "PUBLIC1" && row.event === "arena-state")?.payload as { entities: Array<{ kind: string; monsterId?: string }> } | undefined;
  check("one student can start public Quick Play", publicRoom.status === "IN_PROGRESS" && publicStart?.humanCount === 1);
  check("public arena fills with three monster bots", publicStart?.botCount === 3 && publicState?.entities.filter((p) => p.kind === "bot").length === 3);
  check("monster bots have individual artwork", publicState?.entities.filter((p) => p.kind === "bot").every((p) => Boolean(p.monsterId)) === true);

  await arena.start(privateRoom);
  const privateStart = events.find((row) => row.room === "PRIVATE2" && row.event === "arena-start")?.payload as { humanCount: number; botCount: number } | undefined;
  check("private room remains human only", privateStart?.humanCount === 2 && privateStart?.botCount === 0);
  console.log("PASS: public bots and private multiplayer separation");
  process.exit(0);
}
main().catch((error) => { console.error(error); process.exit(1); });
