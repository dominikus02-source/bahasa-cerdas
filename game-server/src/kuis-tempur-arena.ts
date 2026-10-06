import type { Server, Socket } from "socket.io";
const WORLD_W = 1400;
const WORLD_H = 840;
const MATCH_SECONDS = Math.max(1, Number(process.env.KUIS_TEMPUR_MATCH_SECONDS || 180));
const FINISHED_CLEANUP_MS = Math.max(
  100,
  Number(process.env.KUIS_TEMPUR_FINISHED_CLEANUP_MS || 60_000)
);
const HUMAN_HP = 100;
const BOT_HP = 82;
const HUMAN_SPEED = 245;
const BOT_SPEED = 118;
const BOT_COUNT = 0;
const MAX_HUMAN_PLAYERS = 10;
const HUMAN_DAMAGE_TO_HUMAN = 18;
const HUMAN_DAMAGE_TO_BOT = 28;
const BOT_DAMAGE = 8;
const HUMAN_RANGE = 520;
const BOT_RANGE = 330;
const RESPAWN_MS = 3500;
const HUMAN_SHOT_COOLDOWN = 360;
const SNAPSHOT_MS = 100;

type RoomLike = {
  id: string;
  code: string;
  name: string;
  hostId: string;
  gameType: string;
  category?: string;
  difficulty: string;
  status: string;
  questionCount: number;
  timePerQuestion: number;
  currentQuestion: number;
  questions: QuestionLike[];
  players: Map<string, PlayerLike>;
  startedAt?: Date;
};

type PlayerLike = {
  id: string;
  odiceId: string;
  playerName: string;
  avatarUrl?: string;
  characterId?: string;
  score: number;
  correct: number;
  wrong: number;
  streak: number;
  maxStreak: number;
  answerTimes: number[];
  ready: boolean;
};

type QuestionLike = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  difficulty?: string;
};

type ArenaEntity = {
  id: string;
  name: string;
  kind: "human" | "bot";
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hp: number;
  hpMax: number;
  ammo: number;
  score: number;
  kills: number;
  deaths: number;
  correct: number;
  wrong: number;
  combo: number;
  maxCombo: number;
  alive: boolean;
  avatarUrl?: string;
  characterId: string;
  color: string;
  lastShotAt: number;
  respawnAt: number;
  connected: boolean;
  disconnectedAt: number;
};

type ArenaMatch = {
  room: RoomLike;
  entities: Map<string, ArenaEntity>;
  questions: QuestionLike[];
  questionIndex: Map<string, number>;
  questionDeadline: Map<string, number>;
  answeredQuestion: Map<string, string>;
  startedAt: number;
  endsAt: number;
  lastTickAt: number;
  lastSnapshotAt: number;
  seq: number;
  persistenceCode: string;
  interval: ReturnType<typeof setInterval> | null;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  rematchVotes: Set<string>;
  rematchStarting: boolean;
  finishing: boolean;
};

type PersistedArenaResult = {
  playerId: string;
  playerName: string;
  avatarUrl?: string;
  characterId?: string;
  rank: number;
  score: number;
  kills: number;
  deaths: number;
  correct: number;
  wrong: number;
  maxStreak: number;
  xpEarned: number;
};

type ArenaDeps = {
  io: Server;
  rooms: Map<string, RoomLike>;
  loadQuestions: (gameType: string, count: number) => Promise<QuestionLike[]>;
  persistResults: (payload: {
    code: string;
    roomName: string;
    hostId: string;
    startedAt: number;
    endedAt: number;
    results: PersistedArenaResult[];
  }) => Promise<void>;
};

const BOT_NAMES = ["Raka BOT", "Sari BOT", "Bima BOT"];
const BOT_COLORS = ["#f59e0b", "#a78bfa", "#34d399"];
const BOT_SPAWNS = [
  { x: 500, y: 120 },
  { x: 350, y: 470 },
  { x: 650, y: 470 },
];

const HUMAN_SPAWNS = [
  { x: 180, y: 150 },
  { x: 700, y: 120 },
  { x: 1220, y: 150 },
  { x: 1260, y: 420 },
  { x: 1220, y: 690 },
  { x: 700, y: 720 },
  { x: 180, y: 690 },
  { x: 140, y: 420 },
  { x: 450, y: 260 },
  { x: 950, y: 580 },
];

const HUMAN_COLORS = [
  "#22d3ee",
  "#fb7185",
  "#a78bfa",
  "#fbbf24",
  "#34d399",
  "#60a5fa",
  "#f472b6",
  "#fb923c",
  "#2dd4bf",
  "#c084fc",
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(a: ArenaEntity, b: ArenaEntity) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function moveToward(entity: ArenaEntity, tx: number, ty: number, speed: number, dt: number) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const step = Math.min(len, speed * dt);
  entity.x = clamp(entity.x + (dx / len) * step, 36, WORLD_W - 36);
  entity.y = clamp(entity.y + (dy / len) * step, 48, WORLD_H - 38);
}

export function createKuisTempurArena({ io, rooms, loadQuestions, persistResults }: ArenaDeps) {
  const matches = new Map<string, ArenaMatch>();

  function serialize(match: ArenaMatch) {
    const now = Date.now();
    return {
      seq: ++match.seq,
      timeLeft: Math.max(0, (match.endsAt - now) / 1000),
      entities: Array.from(match.entities.values()).map((entity) => ({
        id: entity.id,
        name: entity.name,
        kind: entity.kind,
        x: Math.round(entity.x * 10) / 10,
        y: Math.round(entity.y * 10) / 10,
        hp: Math.max(0, Math.round(entity.hp)),
        hpMax: entity.hpMax,
        ammo: entity.kind === "human" ? entity.ammo : 0,
        score: entity.score,
        kills: entity.kills,
        deaths: entity.deaths,
        correct: entity.correct,
        wrong: entity.wrong,
        combo: entity.combo,
        alive: entity.alive,
        avatarUrl: entity.avatarUrl,
        characterId: entity.characterId,
        color: entity.color,
        respawnIn: entity.alive ? 0 : Math.max(0, (entity.respawnAt - now) / 1000),
        connected: entity.connected,
      })),
    };
  }

  function broadcast(match: ArenaMatch) {
    io.to(match.room.code).emit("arena-state", serialize(match));
  }

  function questionFor(match: ArenaMatch, userId: string, socketId?: string) {
    if (match.finishing || !match.questions.length) return;
    const player = match.room.players.get(userId);
    if (!player) return;
    const index = match.questionIndex.get(userId) || 0;
    const question = match.questions[index % match.questions.length];
    const existingDeadline = match.questionDeadline.get(userId) || 0;
    const alreadyAnswered = match.answeredQuestion.get(userId) === question.id;
    const deadline =
      !alreadyAnswered && existingDeadline > Date.now()
        ? existingDeadline
        : Date.now() + match.room.timePerQuestion * 1000;
    match.questionDeadline.set(userId, deadline);
    if (alreadyAnswered || !match.answeredQuestion.has(userId)) {
      match.answeredQuestion.set(userId, "");
    }
    const targetSocket = socketId || player.odiceId;
    if (!targetSocket) return;
    io.to(targetSocket).emit("arena-question", {
      id: question.id,
      index,
      text: question.text,
      options: question.options,
      timeLimit: match.room.timePerQuestion,
      deadline,
    });
  }

  function nextQuestion(match: ArenaMatch, userId: string, delay = 550) {
    match.questionIndex.set(userId, (match.questionIndex.get(userId) || 0) + 1);
    setTimeout(() => {
      const current = matches.get(match.room.code);
      if (!current || current.finishing) return;
      questionFor(current, userId);
    }, delay);
  }

  function respawn(entity: ArenaEntity, index: number) {
    if (entity.kind === "human") {
      const humanSpawn = HUMAN_SPAWNS[index % HUMAN_SPAWNS.length];
      entity.x = humanSpawn.x;
      entity.y = humanSpawn.y;
    } else {
      const botIndex = Math.max(0, Number(entity.id.replace("bot-", "")) - 1);
      const spawn = BOT_SPAWNS[botIndex % BOT_SPAWNS.length];
      entity.x = spawn.x;
      entity.y = spawn.y;
    }
    entity.targetX = entity.x;
    entity.targetY = entity.y;
    entity.hp = entity.hpMax;
    entity.alive = true;
    entity.respawnAt = 0;
  }

  function knockOut(match: ArenaMatch, target: ArenaEntity, attacker?: ArenaEntity) {
    if (!target.alive) return;
    target.alive = false;
    target.hp = 0;
    target.deaths += 1;
    target.respawnAt = Date.now() + RESPAWN_MS;
    if (attacker && attacker.id !== target.id) {
      attacker.kills += 1;
      attacker.score += target.kind === "human" ? 150 : 85;
      io.to(match.room.code).emit("arena-ko", {
        attackerId: attacker.id,
        attackerName: attacker.name,
        targetId: target.id,
        targetName: target.name,
        attackerKills: attacker.kills,
      });
    }
  }

  function damage(match: ArenaMatch, attacker: ArenaEntity, target: ArenaEntity, amount: number) {
    if (!target.alive || match.finishing) return;
    target.hp = Math.max(0, target.hp - amount);
    io.to(match.room.code).emit("arena-hit", {
      fromId: attacker.id,
      targetId: target.id,
      damage: amount,
    });
    if (target.hp <= 0) knockOut(match, target, attacker);
  }

  async function persistAndFinish(match: ArenaMatch) {
    if (match.finishing) return;
    match.finishing = true;
    if (match.interval) clearInterval(match.interval);
    match.interval = null;

    const humans = Array.from(match.entities.values())
      .filter((entity) => entity.kind === "human")
      .sort((a, b) => b.score - a.score || b.kills - a.kills || b.correct - a.correct);

    const results: PersistedArenaResult[] = humans.map((entity, index) => {
      const xpEarned = Math.max(15, Math.min(140, Math.floor(entity.score / 12) + entity.correct * 2));
      return {
        playerId: entity.id,
        playerName: entity.name,
        avatarUrl: entity.avatarUrl,
        characterId: entity.characterId,
        rank: index + 1,
        score: entity.score,
        kills: entity.kills,
        deaths: entity.deaths,
        correct: entity.correct,
        wrong: entity.wrong,
        maxStreak: entity.maxCombo,
        xpEarned,
      };
    });

    io.to(match.room.code).emit("arena-finished", { results, roomCode: match.room.code });
    match.room.status = "FINISHED";

    // Arm cleanup before persistence. A rematch can happen while persistence
    // is still in flight, so the timer must already exist and be cancellable.
    match.cleanupTimer = setTimeout(() => {
      // Never let a stale finished match delete a newer rematch using the same code.
      if (matches.get(match.room.code) !== match) return;
      matches.delete(match.room.code);
      rooms.delete(match.room.code);
    }, FINISHED_CLEANUP_MS);

    try {
      await persistResults({
        code: match.persistenceCode,
        roomName: match.room.name,
        hostId: match.room.hostId,
        startedAt: match.startedAt,
        endedAt: Date.now(),
        results,
      });
    } catch (error) {
      // Persistence is deliberately decoupled from the authoritative match loop:
      // players still receive their result even if the web API is temporarily slow.
      console.error("[KuisTempurArena] result persistence failed", error);
    }
  }

  function handleQuestionTimeouts(match: ArenaMatch, now: number) {
    for (const entity of match.entities.values()) {
      if (entity.kind !== "human" || !entity.connected) continue;
      const deadline = match.questionDeadline.get(entity.id) || 0;
      if (!deadline || now < deadline) continue;
      const index = match.questionIndex.get(entity.id) || 0;
      const question = match.questions[index % match.questions.length];
      if (!question) continue;
      if (match.answeredQuestion.get(entity.id) === question.id) continue;

      match.answeredQuestion.set(entity.id, question.id);
      entity.combo = 0;
      entity.wrong += 1;
      const player = match.room.players.get(entity.id);
      if (player) {
        player.wrong += 1;
        player.streak = 0;
        player.answerTimes.push(match.room.timePerQuestion);
      }
      if (player?.odiceId) {
        io.to(player.odiceId).emit("arena-feedback", {
          correct: false,
          ammo: entity.ammo,
          combo: entity.combo,
          message: "Waktu habis. Soal berikutnya!",
        });
      }
      nextQuestion(match, entity.id, 450);
    }
  }

  function tick(match: ArenaMatch) {
    if (match.finishing) return;
    const now = Date.now();
    if (now >= match.endsAt) {
      void persistAndFinish(match);
      return;
    }

    const dt = Math.min(0.1, Math.max(0.01, (now - match.lastTickAt) / 1000));
    match.lastTickAt = now;
    handleQuestionTimeouts(match, now);

    const entities = Array.from(match.entities.values());
    const humans = entities.filter((entity) => entity.kind === "human");

    entities.forEach((entity, index) => {
      if (!entity.alive) {
        if (now >= entity.respawnAt) respawn(entity, index);
        return;
      }

      if (entity.kind === "human") {
        if (!entity.connected) return;
        moveToward(entity, entity.targetX, entity.targetY, HUMAN_SPEED, dt);
        return;
      }

      const aliveHumans = humans.filter((human) => human.alive);
      if (!aliveHumans.length) return;
      aliveHumans.sort((a, b) => distance(entity, a) - distance(entity, b));
      const target = aliveHumans[0];
      const d = distance(entity, target);

      if (d > 175) {
        moveToward(entity, target.x, target.y, BOT_SPEED, dt);
      } else if (d < 105) {
        const dx = entity.x - target.x;
        const dy = entity.y - target.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        moveToward(entity, entity.x + (dx / len) * 80, entity.y + (dy / len) * 80, BOT_SPEED * 0.8, dt);
      }

      const botCooldown = 1250 + (Number(entity.id.replace("bot-", "")) % 3) * 220;
      if (d <= BOT_RANGE && now - entity.lastShotAt >= botCooldown) {
        entity.lastShotAt = now;
        damage(match, entity, target, BOT_DAMAGE);
      }
    });

    if (now - match.lastSnapshotAt >= SNAPSHOT_MS) {
      match.lastSnapshotAt = now;
      broadcast(match);
    }
  }

  async function start(room: RoomLike) {
    if (matches.has(room.code)) return;
    if (room.players.size < 2) {
      io.to(room.code).emit("error", { message: "Butuh minimal dua pemain untuk memulai Kuis Tempur." });
      return;
    }

    const questions = await loadQuestions("KUIS_BATTLE", Math.max(10, room.questionCount || 20));
    if (!questions.length) {
      io.to(room.code).emit("error", { message: "Bank soal belum siap." });
      return;
    }

    if (room.players.size < 2) {
      io.to(room.code).emit("error", { message: "Butuh minimal dua pemain untuk memulai Kuis Tempur." });
      return;
    }

    room.questions = questions;
    room.status = "IN_PROGRESS";
    room.startedAt = new Date();

    const entities = new Map<string, ArenaEntity>();
    const humanPlayers = Array.from(room.players.values()).slice(0, MAX_HUMAN_PLAYERS);
    humanPlayers.forEach((player, index) => {
      const spawn = HUMAN_SPAWNS[index % HUMAN_SPAWNS.length];
      entities.set(player.id, {
        id: player.id,
        name: player.playerName,
        kind: "human",
        x: spawn.x,
        y: spawn.y,
        targetX: spawn.x,
        targetY: spawn.y,
        hp: HUMAN_HP,
        hpMax: HUMAN_HP,
        ammo: 0,
        score: 0,
        kills: 0,
        deaths: 0,
        correct: 0,
        wrong: 0,
        combo: 0,
        maxCombo: 0,
        alive: true,
        avatarUrl: player.avatarUrl,
        characterId: player.characterId || "arga",
        color: HUMAN_COLORS[index % HUMAN_COLORS.length],
        lastShotAt: 0,
        respawnAt: 0,
        connected: true,
        disconnectedAt: 0,
      });
      player.score = 0;
      player.correct = 0;
      player.wrong = 0;
      player.streak = 0;
      player.maxStreak = 0;
      player.answerTimes = [];
    });

    for (let index = 0; index < BOT_COUNT; index++) {
      const spawn = BOT_SPAWNS[index];
      const id = `bot-${index + 1}`;
      entities.set(id, {
        id,
        name: BOT_NAMES[index],
        kind: "bot",
        x: spawn.x,
        y: spawn.y,
        targetX: spawn.x,
        targetY: spawn.y,
        hp: BOT_HP,
        hpMax: BOT_HP,
        ammo: 0,
        score: 0,
        kills: 0,
        deaths: 0,
        correct: 0,
        wrong: 0,
        combo: 0,
        maxCombo: 0,
        alive: true,
        characterId: "arga",
        color: BOT_COLORS[index],
        lastShotAt: 0,
        respawnAt: 0,
        connected: true,
        disconnectedAt: 0,
      });
    }

    const now = Date.now();
    const persistenceCode = `${room.code}-${now.toString(36).slice(-8).toUpperCase()}`;
    const match: ArenaMatch = {
      room,
      entities,
      questions,
      questionIndex: new Map(humanPlayers.map((player) => [player.id, 0])),
      questionDeadline: new Map(),
      answeredQuestion: new Map(),
      startedAt: now + 3000,
      endsAt: now + 3000 + MATCH_SECONDS * 1000,
      lastTickAt: now + 3000,
      lastSnapshotAt: 0,
      seq: 0,
      persistenceCode,
      interval: null,
      cleanupTimer: null,
      rematchVotes: new Set(),
      rematchStarting: false,
      finishing: false,
    };
    matches.set(room.code, match);


    io.to(room.code).emit("arena-start", {
      code: room.code,
      duration: MATCH_SECONDS,
      botCount: 0,
      humanCount: humanPlayers.length,
      maxPlayers: MAX_HUMAN_PLAYERS,
    });
    broadcast(match);

    for (let seconds = 3; seconds > 0; seconds--) {
      io.to(room.code).emit("arena-countdown", { seconds });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!matches.has(room.code)) return;
    }
    io.to(room.code).emit("arena-countdown", { seconds: 0 });

    const freshNow = Date.now();
    match.startedAt = freshNow;
    match.endsAt = freshNow + MATCH_SECONDS * 1000;
    match.lastTickAt = freshNow;

    for (const player of humanPlayers) questionFor(match, player.id);
    match.interval = setInterval(() => tick(match), 50);
    broadcast(match);
    console.log(`[KuisTempurArena] Started: ${room.code}`);
  }

  function move(code: string, userId: string, x: number, y: number) {
    const match = matches.get(code);
    const entity = match?.entities.get(userId);
    if (!match || !entity || entity.kind !== "human" || !entity.alive || match.finishing) return;
    entity.targetX = clamp(Number(x) || entity.x, 36, WORLD_W - 36);
    entity.targetY = clamp(Number(y) || entity.y, 48, WORLD_H - 38);
  }

  function shoot(code: string, userId: string, targetId: string) {
    const match = matches.get(code);
    const shooter = match?.entities.get(userId);
    const target = match?.entities.get(targetId);
    if (!match || !shooter || !target || match.finishing) return;
    if (
      shooter.kind !== "human" ||
      !shooter.connected ||
      !shooter.alive ||
      !target.connected ||
      !target.alive ||
      shooter.ammo <= 0
    ) return;

    const now = Date.now();
    if (now - shooter.lastShotAt < HUMAN_SHOT_COOLDOWN) return;
    if (distance(shooter, target) > HUMAN_RANGE) return;

    shooter.lastShotAt = now;
    shooter.ammo -= 1;
    const amount = target.kind === "human" ? HUMAN_DAMAGE_TO_HUMAN : HUMAN_DAMAGE_TO_BOT;
    damage(match, shooter, target, amount);
    broadcast(match);
  }

  function answer(code: string, userId: string, questionId: string, answerIndex: number) {
    const match = matches.get(code);
    const entity = match?.entities.get(userId);
    const player = match?.room.players.get(userId);
    if (!match || !entity || !player || entity.kind !== "human" || match.finishing) return;

    const index = match.questionIndex.get(userId) || 0;
    const question = match.questions[index % match.questions.length];
    if (!question || question.id !== questionId) return;
    if (match.answeredQuestion.get(userId) === question.id) return;

    match.answeredQuestion.set(userId, question.id);
    const deadline = match.questionDeadline.get(userId) || Date.now();
    const elapsed = Math.max(0, match.room.timePerQuestion - Math.max(0, deadline - Date.now()) / 1000);
    player.answerTimes.push(elapsed);

    const correct = Number(answerIndex) === Number.parseInt(question.correctAnswer, 10);
    if (correct) {
      entity.correct += 1;
      entity.combo += 1;
      entity.maxCombo = Math.max(entity.maxCombo, entity.combo);
      entity.ammo = Math.min(6, entity.ammo + 1);
      entity.score += 30 + Math.min(30, (entity.combo - 1) * 5);
      player.correct += 1;
      player.streak = entity.combo;
      player.maxStreak = entity.maxCombo;
      player.score = entity.score;
    } else {
      entity.wrong += 1;
      entity.combo = 0;
      player.wrong += 1;
      player.streak = 0;
    }

    io.to(player.odiceId).emit("arena-feedback", {
      correct,
      ammo: entity.ammo,
      combo: entity.combo,
      message: correct
        ? entity.combo >= 3
          ? `Benar! +1 amunisi · ${entity.combo}× kombo!`
          : "Benar! +1 amunisi."
        : "Belum tepat. Tidak mendapat amunisi.",
    });

    nextQuestion(match, userId, correct ? 500 : 700);
    broadcast(match);
  }

  async function requestRematch(code: string, userId: string) {
    const match = matches.get(code);
    const entity = match?.entities.get(userId);
    const player = match?.room.players.get(userId);
    if (!match || !entity || !player || !match.finishing || match.rematchStarting) return false;
    if (entity.kind !== "human" || !entity.connected) return false;

    match.rematchVotes.add(userId);

    const connectedHumans = Array.from(match.entities.values()).filter(
      (candidate) => candidate.kind === "human" && candidate.connected
    );
    const eligibleIds = new Set(connectedHumans.map((candidate) => candidate.id));
    for (const votedId of Array.from(match.rematchVotes)) {
      if (!eligibleIds.has(votedId)) match.rematchVotes.delete(votedId);
    }

    const totalCount = connectedHumans.length;
    const requiredCount = totalCount <= 2 ? 2 : Math.max(2, Math.ceil(totalCount * 0.6));
    const readyIds = Array.from(match.rematchVotes);
    const readyCount = readyIds.length;

    io.to(code).emit("arena-rematch-status", {
      readyIds,
      readyCount,
      totalCount,
      requiredCount,
      starting: readyCount >= requiredCount && totalCount >= 2,
    });

    if (totalCount < 2 || readyCount < requiredCount) return true;

    match.rematchStarting = true;
    if (match.cleanupTimer) {
      clearTimeout(match.cleanupTimer);
      match.cleanupTimer = null;
    }

    io.to(code).emit("arena-rematch-status", {
      readyIds,
      readyCount,
      totalCount,
      requiredCount,
      starting: true,
    });

    // Replace the finished authoritative match but keep the room and the
    // authenticated players that are still connected. Offline ghosts are
    // removed so they cannot respawn as connected in the next round.
    const connectedIds = new Set(connectedHumans.map((candidate) => candidate.id));
    for (const playerId of Array.from(match.room.players.keys())) {
      if (!connectedIds.has(playerId)) match.room.players.delete(playerId);
    }

    if (!match.room.players.has(match.room.hostId)) {
      const nextHost = match.room.players.values().next().value;
      if (!nextHost) return false;
      match.room.hostId = nextHost.id;
      io.to(code).emit("host-changed", { newHostId: nextHost.id });
    }

    matches.delete(code);
    match.room.status = "WAITING";
    match.room.currentQuestion = 0;
    match.room.questions = [];

    await start(match.room);
    return true;
  }

  function ready(socket: Socket, code: string, userId: string) {
    const match = matches.get(code);
    if (!match) return;
    socket.join(code);
    socket.emit("arena-state", serialize(match));
    if (Date.now() >= match.startedAt) questionFor(match, userId, socket.id);
  }

  function reconnect(socket: Socket, code: string, userId: string) {
    const match = matches.get(code);
    const entity = match?.entities.get(userId);
    const player = match?.room.players.get(userId);
    if (!match || !entity || !player) return false;
    entity.connected = true;
    entity.disconnectedAt = 0;
    player.odiceId = socket.id;
    socket.join(code);
    socket.emit("arena-start", {
      code,
      duration: MATCH_SECONDS,
      reconnect: true,
    });
    socket.emit("arena-countdown", { seconds: Math.max(0, Math.ceil((match.startedAt - Date.now()) / 1000)) });
    socket.emit("arena-state", serialize(match));
    if (Date.now() >= match.startedAt) questionFor(match, userId, socket.id);
    return true;
  }

  function disconnect(code: string, userId: string) {
    const match = matches.get(code);
    const entity = match?.entities.get(userId);
    if (!match || !entity || entity.kind !== "human") return false;
    entity.connected = false;
    entity.disconnectedAt = Date.now();
    entity.targetX = entity.x;
    entity.targetY = entity.y;
    return true;
  }

  function removePlayer(code: string, userId: string) {
    const match = matches.get(code);
    if (!match) return;
    match.entities.delete(userId);
    match.questionDeadline.delete(userId);
    match.answeredQuestion.delete(userId);
    match.questionIndex.delete(userId);
    const humansLeft = Array.from(match.entities.values()).filter((entity) => entity.kind === "human");
    if (humansLeft.length < 2 && !match.finishing) {
      void persistAndFinish(match);
    }
  }

  return {
    isActive(code: string) {
      return matches.has(code);
    },
    start,
    ready(socket: Socket, data: { code: string; userId: string }) {
      ready(socket, data.code, data.userId);
    },
    move(data: { code: string; userId: string; x: number; y: number }) {
      move(data.code, data.userId, data.x, data.y);
    },
    shoot(data: { code: string; userId: string; targetId: string }) {
      shoot(data.code, data.userId, data.targetId);
    },
    answer(data: { code: string; userId: string; questionId: string; answerIndex: number }) {
      answer(data.code, data.userId, data.questionId, data.answerIndex);
    },
    requestRematch(data: { code: string; userId: string }) {
      return requestRematch(data.code, data.userId);
    },
    reconnect,
    disconnect,
    removePlayer,
  };
}
