import { Server } from 'socket.io';
import { createServer } from 'http';
import { createHmac, createPublicKey, verify } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createKuisTempurArena } from './kuis-tempur-arena.js';

const prisma = new PrismaClient();
// Prefer PORT (injected by container/platform), fall back to GAME_PORT, then 3001.
const PORT = parseInt(process.env.PORT || process.env.GAME_PORT || '3001', 10);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DEFAULT_GAME_ORIGINS = [
  'https://www.bahasacerdas.com',
  'https://bahasacerdas.com',
];
const GAME_ALLOWED_ORIGINS = (process.env.GAME_ALLOWED_ORIGINS || DEFAULT_GAME_ORIGINS.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const GAME_DB_REQUIRED = process.env.GAME_DB_REQUIRED !== 'false';

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;
  if (GAME_ALLOWED_ORIGINS.includes(origin)) return true;
  if (!IS_PRODUCTION && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

interface Player {
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
  hearts?: number;
  eliminated?: boolean;
  lastAnsweredQuestion?: number;
}

interface Room {
  id: string;
  code: string;
  name: string;
  hostId: string;
  gameType: string;
  category?: string;
  difficulty: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  questionCount: number;
  timePerQuestion: number;
  currentQuestion: number;
  questions: Question[];
  players: Map<string, Player>;
  startedAt?: Date;
  questionStartedAt?: number;
  matchmaking?: 'PUBLIC' | 'PRIVATE';
  autoStartDeadline?: number;
  autoStartInterval?: ReturnType<typeof setInterval>;
}

interface Question {
  id: string;
  text: string;
  audioUrl?: string;
  imageUrl?: string;
  passage?: string;
  type: string;
  options: string[];
  correctAnswer: string;
  difficulty: string;
}

const rooms = new Map<string, Room>();
const playerSockets = new Map<string, string>();

// Matchmaking queue
interface QueuePlayer {
  userId: string;
  userName: string;
  avatarUrl?: string;
  socketId: string;
  gameType: string;
  joinedAt: Date;
}

const matchmakingQueue: QueuePlayer[] = [];
const MATCH_TIMEOUT_MS = 30000;
const MAX_KUIS_TEMPUR_PLAYERS = 10;
const KUIS_TEMPUR_CHARACTER_IDS = new Set([
  'arga',
  'ki-jaka',
  'bu-ratmi',
  'bu-sari',
  'eyang-kartala',
  'bagas',
  'pak-warsa',
  'pendaki',
  'pak-empu',
]);
const DEFAULT_KUIS_TEMPUR_CHARACTER_ID = 'arga';

function normalizeKuisTempurCharacterId(value?: string) {
  return value && KUIS_TEMPUR_CHARACTER_IDS.has(value)
    ? value
    : DEFAULT_KUIS_TEMPUR_CHARACTER_ID;
}

function clearPublicArenaCountdown(room: Room) {
  if (room.autoStartInterval) clearInterval(room.autoStartInterval);
  room.autoStartInterval = undefined;
  room.autoStartDeadline = undefined;
}

async function startPublicArena(room: Room) {
  if (room.status !== 'WAITING' || room.matchmaking !== 'PUBLIC' || room.players.size < 2) return;
  clearPublicArenaCountdown(room);
  io.to(room.code).emit('match-countdown', { seconds: 0 });
  await kuisTempurArena.start(room);
}

function schedulePublicArenaStart(room: Room) {
  if (room.status !== 'WAITING' || room.matchmaking !== 'PUBLIC') return;
  if (room.players.size >= MAX_KUIS_TEMPUR_PLAYERS) {
    void startPublicArena(room);
    return;
  }
  if (room.players.size < 2 || room.autoStartInterval) return;

  room.autoStartDeadline = Date.now() + 12_000;
  io.to(room.code).emit('match-countdown', { seconds: 12 });
  room.autoStartInterval = setInterval(() => {
    if (room.status !== 'WAITING') {
      clearPublicArenaCountdown(room);
      return;
    }
    if (room.players.size < 2) {
      clearPublicArenaCountdown(room);
      io.to(room.code).emit('match-countdown', { seconds: -1 });
      return;
    }
    if (room.players.size >= MAX_KUIS_TEMPUR_PLAYERS) {
      void startPublicArena(room);
      return;
    }
    const seconds = Math.max(0, Math.ceil(((room.autoStartDeadline || Date.now()) - Date.now()) / 1000));
    io.to(room.code).emit('match-countdown', { seconds });
    if (seconds <= 0) void startPublicArena(room);
  }, 1000);
}

function tryMatchPlayers() {
  if (matchmakingQueue.length < 2) return;

  const groups = new Map<string, QueuePlayer[]>();
  for (const p of matchmakingQueue) {
    const list = groups.get(p.gameType) || [];
    list.push(p);
    groups.set(p.gameType, list);
  }

  for (const [, players] of groups) {
    while (players.length >= 2) {
      const p1 = players.shift()!;
      const p2 = players.shift()!;

      const idx1 = matchmakingQueue.findIndex(p => p.userId === p1.userId);
      if (idx1 >= 0) matchmakingQueue.splice(idx1, 1);
      const idx2 = matchmakingQueue.findIndex(p => p.userId === p2.userId);
      if (idx2 >= 0) matchmakingQueue.splice(idx2, 1);

      createMatchRoom(p1, p2, p1.gameType);
    }
  }
}

function removeFromQueue(userId: string) {
  const idx = matchmakingQueue.findIndex(p => p.userId === userId);
  if (idx >= 0) matchmakingQueue.splice(idx, 1);
}

function removeFromQueueBySocket(socketId: string) {
  const idx = matchmakingQueue.findIndex(p => p.socketId === socketId);
  if (idx >= 0) matchmakingQueue.splice(idx, 1);
}

async function createMatchRoom(p1: QueuePlayer, p2: QueuePlayer, gameType: string) {
  try {
    let code = generateCode();
    while (rooms.has(code)) code = generateCode();

    const dbRoom = await prisma.gameRoom.create({
      data: {
        code,
        name: `Pertandingan ${p1.userName} vs ${p2.userName}`,
        gameType: gameType as any,
        hostId: p1.userId,
        difficulty: 'MEDIUM',
        questionCount: 10,
        timePerQuestion: 20,
        status: 'WAITING' as any,
      },
    });

    const makePlayer = (p: QueuePlayer, isHost: boolean): Player => ({
      id: p.userId,
      odiceId: p.socketId,
      playerName: p.userName,
      avatarUrl: p.avatarUrl,
      score: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
      maxStreak: 0,
      answerTimes: [],
      ready: true,
    });

    const room: Room = {
      id: dbRoom.id,
      code: dbRoom.code,
      name: dbRoom.name,
      hostId: dbRoom.hostId,
      gameType: dbRoom.gameType,
      difficulty: dbRoom.difficulty,
      status: 'WAITING',
      questionCount: dbRoom.questionCount,
      timePerQuestion: dbRoom.timePerQuestion,
      currentQuestion: 0,
      questions: [],
      players: new Map(),
    };

    const pl1 = makePlayer(p1, true);
    const pl2 = makePlayer(p2, false);
    room.players.set(p1.userId, pl1);
    room.players.set(p2.userId, pl2);
    rooms.set(code, room);

    await prisma.gameSession.createMany({
      data: [
        { roomId: room.id, userId: p1.userId, playerName: p1.userName, avatarUrl: p1.avatarUrl },
        { roomId: room.id, userId: p2.userId, playerName: p2.userName, avatarUrl: p2.avatarUrl },
      ],
      skipDuplicates: true,
    });

    const s1 = io.sockets.sockets.get(p1.socketId);
    const s2 = io.sockets.sockets.get(p2.socketId);
    if (s1) { s1.join(code); playerSockets.set(p1.socketId, code); }
    if (s2) { s2.join(code); playerSockets.set(p2.socketId, code); }

    // Notify both of match found
    io.to(p1.socketId).emit('match-found', {
      roomCode: code,
      opponent: { id: p2.userId, name: p2.userName, avatar: p2.avatarUrl },
      gameType,
      isHost: true,
    });
    io.to(p2.socketId).emit('match-found', {
      roomCode: code,
      opponent: { id: p1.userId, name: p1.userName, avatar: p1.avatarUrl },
      gameType,
      isHost: false,
    });

    console.log(`[Matchmaking] Matched ${p1.userName} vs ${p2.userName} in room ${code}`);

    // Start countdown then game
    await new Promise(resolve => setTimeout(resolve, 1000));

    for (let i = 3; i > 0; i--) {
      io.to(code).emit('match-countdown', { seconds: i });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    io.to(code).emit('match-countdown', { seconds: 0 });

    // Auto-start the game (reuse existing start-game logic)
    const questions = await loadQuestions(gameType, room.questionCount);
    if (questions.length === 0) {
      io.to(code).emit('error', { message: 'Tidak ada soal tersedia' });
      return;
    }

    room.questions = questions;
    room.status = 'IN_PROGRESS';
    room.currentQuestion = 0;
    room.startedAt = new Date();

    room.players.forEach((p) => {
      p.score = 0; p.correct = 0; p.wrong = 0; p.streak = 0;
      p.maxStreak = 0; p.answerTimes = []; p.ready = false; p.lastAnsweredQuestion = -1;
    });

    await prisma.gameRoom.update({
      where: { code },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });

    io.to(code).emit('game-starting', {
      totalQuestions: questions.length,
      timePerQuestion: room.timePerQuestion,
      category: room.category,
    });

    setTimeout(() => emitQuestion(room), 3000);
    console.log(`[Matchmaking] Game started: ${code}`);
  } catch (err) {
    console.error('[Matchmaking] Error creating match:', err);
  }
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const httpServer = createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/') {
    if (!GAME_DB_REQUIRED) {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({
        ok: true,
        status: 'ok',
        db: 'skipped',
        service: 'bahasacerdas-game',
        rooms: rooms.size,
        queue: matchmakingQueue.length,
        uptime: Math.round(process.uptime()),
      }));
      return;
    }

    try {
      await prisma.$queryRaw`SELECT 1`;
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({
        ok: true,
        status: 'ok',
        db: 'up',
        service: 'bahasacerdas-game',
        rooms: rooms.size,
        queue: matchmakingQueue.length,
        uptime: Math.round(process.uptime()),
      }));
    } catch {
      res.writeHead(503, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({
        ok: false,
        status: 'degraded',
        db: 'down',
        service: 'bahasacerdas-game',
      }));
    }
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});

const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed'));
    },
    methods: ['GET', 'POST'],
    credentials: false,
  },
  // Enforce the same origin policy for WebSocket upgrades as defense-in-depth.
  // Socket authentication remains the primary security boundary.
  allowRequest(req, callback) {
    callback(null, isAllowedOrigin(req.headers.origin));
  },
  transports: ['websocket', 'polling'],
  pingInterval: 10000,
  pingTimeout: 12000,
});

const DEFAULT_GAME_SERVER_SIGNING_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAdZGdsISldkKar6htuL4/B9JDw8/2RHEF7DSq/CFOMqI=
-----END PUBLIC KEY-----`;
const GAME_SERVER_SIGNING_PUBLIC_KEY = process.env.GAME_SERVER_SIGNING_PUBLIC_KEY_B64
  ? Buffer.from(process.env.GAME_SERVER_SIGNING_PUBLIC_KEY_B64, 'base64').toString('utf8')
  : DEFAULT_GAME_SERVER_SIGNING_PUBLIC_KEY;

async function callKuisTempurWebBridge(payload: Record<string, unknown>) {
  const secret = process.env.KUIS_TEMPUR_SERVER_SECRET;
  const baseUrl = (process.env.BAHASACERDAS_WEB_URL || 'https://www.bahasacerdas.com').replace(/\/$/, '');
  if (!secret) throw new Error('KUIS_TEMPUR_SERVER_SECRET is not configured');

  const raw = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${raw}`)
    .digest('base64url');

  const response = await fetch(`${baseUrl}/api/game/kuis-tempur/server`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-game-timestamp': timestamp,
      'x-game-signature': signature,
    },
    body: raw,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Web bridge ${response.status}: ${body.slice(0, 180)}`);
  }
  return response.json() as Promise<any>;
}

async function loadArenaQuestions(_gameType: string, count: number): Promise<Question[]> {
  try {
    const data = await callKuisTempurWebBridge({ action: 'questions', count });
    const questions = Array.isArray(data?.questions) ? data.questions : [];
    if (questions.length > 0) {
      return questions.map((q: any) => ({
        id: String(q.id),
        text: String(q.text),
        type: String(q.type || 'PILIHAN_GANDA'),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        correctAnswer: String(q.correctAnswer),
        difficulty: String(q.difficulty || 'MEDIUM'),
      }));
    }
  } catch (error) {
    console.error('[KuisTempurArena] question bridge failed, using defaults', error);
  }
  return getDefaultQuestions('KUIS_BATTLE', count);
}

async function persistArenaResults(payload: {
  code: string;
  roomName: string;
  hostId: string;
  startedAt: number;
  endedAt: number;
  results: any[];
}) {
  await callKuisTempurWebBridge({ action: 'results', ...payload });
}

const kuisTempurArena = createKuisTempurArena({
  io,
  rooms,
  loadQuestions: loadArenaQuestions,
  persistResults: persistArenaResults,
});

type SocketIdentity = {
  v: number;
  sub: string;
  name: string;
  avatar?: string | null;
  exp: number;
};

function verifySocketToken(raw: unknown): SocketIdentity | null {
  if (typeof raw !== 'string') return null;

  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;

  try {
    const publicKey = createPublicKey(GAME_SERVER_SIGNING_PUBLIC_KEY);
    const valid = verify(
      null,
      Buffer.from(payload, 'utf8'),
      publicKey,
      Buffer.from(signature, 'base64url')
    );
    if (!valid) return null;

    const identity = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SocketIdentity;
    if (
      identity.v !== 1 ||
      typeof identity.sub !== 'string' ||
      typeof identity.name !== 'string' ||
      typeof identity.exp !== 'number' ||
      identity.exp <= Date.now()
    ) {
      return null;
    }
    return identity;
  } catch {
    return null;
  }
}

io.use((socket, next) => {
  const identity = verifySocketToken(socket.handshake.auth?.token);
  if (!identity) return next(new Error('Unauthorized game connection'));
  socket.data.identity = identity;
  socket.data.user = {
    id: identity.sub,
    name: identity.name,
    avatarUrl: identity.avatar || undefined,
  };
  return next();
});

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('create-room', async (data: {
    hostId: string;
    hostName: string;
    hostAvatar?: string;
    name: string;
    gameType: string;
    category?: string;
    difficulty?: string;
    questionCount?: number;
    timePerQuestion?: number;
    characterId?: string;
  }) => {
    try {
      const identity = socket.data.identity as SocketIdentity | undefined;
      if (!identity) return socket.emit('error', { message: 'Sesi tidak valid' });
      data.hostId = identity.sub;
      data.hostName = identity.name;
      data.hostAvatar = identity.avatar || undefined;

      let code = generateCode();
      while (rooms.has(code)) code = generateCode();

      const hostPlayer: Player = {
        id: data.hostId,
        odiceId: socket.id,
        playerName: data.hostName,
        avatarUrl: data.hostAvatar,
        characterId: normalizeKuisTempurCharacterId(data.characterId),
        score: 0,
        correct: 0,
        wrong: 0,
        streak: 0,
        maxStreak: 0,
        answerTimes: [],
        ready: true,
      };

      // Kuis Tempur 2.0 rooms are intentionally kept in memory on the realtime
      // service. Production persistence is handled through the authenticated web
      // bridge, so the game server never needs production database credentials.
      if (data.category === 'KUIS_TEMPUR_ARENA') {
        const room: Room = {
          id: `arena-${code}`,
          code,
          name: data.name,
          hostId: data.hostId,
          gameType: 'KUIS_BATTLE',
          category: 'KUIS_TEMPUR_ARENA',
          difficulty: 'MEDIUM',
          status: 'WAITING',
          questionCount: Math.max(10, Math.min(30, data.questionCount || 20)),
          timePerQuestion: Math.max(8, Math.min(30, data.timePerQuestion || 15)),
          currentQuestion: 0,
          questions: [],
          players: new Map(),
        };

        room.players.set(data.hostId, hostPlayer);
        rooms.set(code, room);
        playerSockets.set(socket.id, code);
        socket.join(code);
        socket.emit('room-created', {
          roomId: room.id,
          code: room.code,
          name: room.name,
          isHost: true,
          player: hostPlayer,
        });
        io.to(code).emit('player-list', getPlayersList(room));
        console.log(`[ArenaRoom] Created: ${code} by host ${data.hostId}`);
        return;
      }

      const dbRoom = await prisma.gameRoom.create({
        data: {
          code,
          name: data.name,
          gameType: data.gameType as any,
          hostId: data.hostId,
          category: data.category,
          difficulty: data.difficulty as any || 'MEDIUM',
          questionCount: data.questionCount || 10,
          timePerQuestion: data.timePerQuestion || 20,
          status: 'WAITING' as any,
        },
      });

      const room: Room = {
        id: dbRoom.id,
        code: dbRoom.code,
        name: dbRoom.name,
        hostId: dbRoom.hostId,
        gameType: dbRoom.gameType,
        category: dbRoom.category || undefined,
        difficulty: dbRoom.difficulty,
        status: 'WAITING',
        questionCount: dbRoom.questionCount,
        timePerQuestion: dbRoom.timePerQuestion,
        currentQuestion: 0,
        questions: [],
        players: new Map(),
      };

      room.players.set(data.hostId, hostPlayer);
      rooms.set(code, room);
      playerSockets.set(socket.id, code);

      await prisma.gameSession.create({
        data: {
          roomId: room.id,
          userId: data.hostId,
          playerName: data.hostName,
          avatarUrl: data.hostAvatar,
        },
      });

      socket.join(code);
      socket.emit('room-created', {
        roomId: dbRoom.id,
        code: dbRoom.code,
        name: dbRoom.name,
        isHost: true,
        player: hostPlayer,
      });

      io.to(code).emit('player-list', getPlayersList(room));
      console.log(`[Room] Created: ${code} by host ${data.hostId}`);
    } catch (err) {
      console.error('[Error] create-room:', err);
      socket.emit('error', { message: 'Gagal membuat room' });
    }
  });

  socket.on('join-room', async (data: {
    code: string;
    userId: string;
    playerName: string;
    avatarUrl?: string;
    characterId?: string;
  }) => {
    try {
      const identity = socket.data.identity as SocketIdentity | undefined;
      if (!identity) return socket.emit('error', { message: 'Sesi tidak valid' });
      data.userId = identity.sub;
      data.playerName = identity.name;
      data.avatarUrl = identity.avatar || undefined;
      const room = rooms.get(data.code);
      if (!room) {
        socket.emit('error', { message: 'Room tidak ditemukan' });
        return;
      }
      if (room.status !== 'WAITING') {
        const canReconnect =
          room.category === 'KUIS_TEMPUR_ARENA' &&
          kuisTempurArena.isActive(room.code) &&
          room.players.has(data.userId);

        if (!canReconnect) {
          socket.emit('error', { message: 'Game sudah dimulai' });
          return;
        }

        const existing = room.players.get(data.userId)!;
        existing.odiceId = socket.id;
        room.players.set(data.userId, existing);
        playerSockets.set(socket.id, data.code);
        socket.join(data.code);
        socket.emit('room-joined', {
          roomId: room.id,
          code: room.code,
          name: room.name,
          isHost: data.userId === room.hostId,
          player: existing,
        });
        io.to(data.code).emit('player-list', getPlayersList(room));
        kuisTempurArena.reconnect(socket, data.code, data.userId);
        console.log(`[Room] ${data.playerName} reconnected to arena ${data.code}`);
        return;
      }

      if (
        room.category === 'KUIS_TEMPUR_ARENA' &&
        room.players.size >= MAX_KUIS_TEMPUR_PLAYERS &&
        !room.players.has(data.userId)
      ) {
        socket.emit('error', {
          message: `Arena sudah penuh. Maksimal ${MAX_KUIS_TEMPUR_PLAYERS} pemain per room.`,
        });
        return;
      }

      if (room.players.has(data.userId)) {
        const existing = room.players.get(data.userId)!;
        existing.odiceId = socket.id;
        if (room.category === 'KUIS_TEMPUR_ARENA') {
          existing.characterId = normalizeKuisTempurCharacterId(data.characterId || existing.characterId);
        }
        room.players.set(data.userId, existing);
        playerSockets.set(socket.id, data.code);
        socket.join(data.code);
        socket.emit('room-joined', {
          roomId: room.id,
          code: room.code,
          name: room.name,
          isHost: data.userId === room.hostId,
          player: room.players.get(data.userId),
        });
        io.to(data.code).emit('player-list', getPlayersList(room));
        return;
      }

      const player: Player = {
        id: data.userId,
        odiceId: socket.id,
        playerName: data.playerName,
        avatarUrl: data.avatarUrl,
        characterId:
          room.category === 'KUIS_TEMPUR_ARENA'
            ? normalizeKuisTempurCharacterId(data.characterId)
            : undefined,
        score: 0,
        correct: 0,
        wrong: 0,
        streak: 0,
        maxStreak: 0,
        answerTimes: [],
        ready: false,
      };

      room.players.set(data.userId, player);
      playerSockets.set(socket.id, data.code);
      socket.join(data.code);

      if (room.category !== 'KUIS_TEMPUR_ARENA') {
        await prisma.gameSession.create({
          data: {
            roomId: room.id,
            userId: data.userId,
            playerName: data.playerName,
            avatarUrl: data.avatarUrl,
          },
        });
      }

      socket.emit('room-joined', {
        roomId: room.id,
        code: room.code,
        name: room.name,
        isHost: data.userId === room.hostId,
        player,
      });

      io.to(data.code).emit('player-list', getPlayersList(room));
      socket.to(data.code).emit('notification', {
        type: 'PLAYER_JOINED',
        message: `${data.playerName} bergabung`,
        playerName: data.playerName,
      });

      console.log(`[Room] ${data.playerName} joined room ${data.code}`);
    } catch (err) {
      console.error('[Error] join-room:', err);
      socket.emit('error', { message: 'Gagal bergabung ke room' });
    }
  });

  socket.on('toggle-ready', (data: { code: string; userId?: string }) => {
    const identity = socket.data.identity as SocketIdentity | undefined;
    if (!identity) return;
    const room = rooms.get(data.code);
    if (!room) return;

    const player = room.players.get(identity.sub);
    if (!player || player.id === room.hostId || player.odiceId !== socket.id) return;

    player.ready = !player.ready;
    room.players.set(identity.sub, player);
    io.to(data.code).emit('player-list', getPlayersList(room));
  });

  socket.on('arena-character-select', (data: { code: string; userId: string; characterId: string }) => {
    const identity = socket.data.identity as SocketIdentity | undefined;
    const userId = identity?.sub || data.userId;
    const room = rooms.get(data.code);
    const player = room?.players.get(userId);
    if (
      !room ||
      room.category !== 'KUIS_TEMPUR_ARENA' ||
      room.status !== 'WAITING' ||
      !player ||
      player.odiceId !== socket.id
    ) {
      return;
    }

    player.characterId = normalizeKuisTempurCharacterId(data.characterId);
    room.players.set(userId, player);
    io.to(data.code).emit('player-list', getPlayersList(room));
    socket.emit('arena-character-selected', { characterId: player.characterId });
  });

  socket.on('start-game', async (data: { code: string }) => {
    try {
      const identity = socket.data.identity as SocketIdentity | undefined;
      if (!identity) return;
      const room = rooms.get(data.code);
      if (!room || room.hostId !== identity.sub) return;

      if (room.category === 'KUIS_TEMPUR_ARENA') {
        const caller = Array.from(room.players.values()).find((player) => player.odiceId === socket.id);
        if (!caller || caller.id !== room.hostId) {
          socket.emit('error', { message: 'Hanya host yang bisa memulai pertandingan.' });
          return;
        }
        await kuisTempurArena.start(room);
        return;
      }

      const questions = await loadQuestions(room.gameType, room.questionCount);
      if (questions.length === 0) {
        socket.emit('error', { message: 'Tidak ada soal tersedia' });
        return;
      }

      room.questions = questions;
      room.status = 'IN_PROGRESS';
      room.currentQuestion = 0;
      room.startedAt = new Date();

      room.players.forEach((p) => {
        p.score = 0;
        p.correct = 0;
        p.wrong = 0;
        p.streak = 0;
        p.maxStreak = 0;
        p.answerTimes = [];
        p.ready = false;
        p.lastAnsweredQuestion = -1;
        p.hearts = room.gameType === 'SURVIVAL' ? 3 : undefined;
        p.eliminated = false;
      });

      await prisma.gameRoom.update({
        where: { code: data.code },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });

      io.to(data.code).emit('game-starting', {
        totalQuestions: questions.length,
        timePerQuestion: room.timePerQuestion,
        category: room.category,
      });

      setTimeout(() => {
        emitQuestion(room);
      }, 3000);

      console.log(`[Game] Started: ${data.code}`);
    } catch (err) {
      console.error('[Error] start-game:', err);
      socket.emit('error', { message: 'Gagal memulai game' });
    }
  });

  socket.on('submit-answer', async (data: {
    code: string;
    userId?: string;
    questionIndex: number;
    answerIndex: number;
    timeSpent: number;
  }) => {
    const identity = socket.data.identity as SocketIdentity | undefined;
    if (!identity) return;

    const room = rooms.get(data.code);
    if (!room || room.status !== 'IN_PROGRESS') return;
    if (data.questionIndex !== room.currentQuestion) return;

    const player = room.players.get(identity.sub);
    if (!player || player.odiceId !== socket.id || player.lastAnsweredQuestion === data.questionIndex) return;

    const question = room.questions[data.questionIndex];
    const isCorrect = data.answerIndex === parseInt(question.correctAnswer);
    const elapsed = Math.min(
      room.timePerQuestion,
      Math.max(0, (Date.now() - (room.questionStartedAt || Date.now())) / 1000)
    );

    player.lastAnsweredQuestion = data.questionIndex;
    player.answerTimes.push(elapsed);

    if (isCorrect) {
      player.streak++;
      player.correct++;
      const bonusStreak = Math.min(player.streak - 1, 5) * 10;

      if (room.gameType === 'GOLD_RUSH') {
        const goldEarned = 50 + bonusStreak + Math.floor(Math.random() * 50);
        player.score += goldEarned;
      } else if (room.gameType === 'SPEED_BATTLE') {
        const speedBonus = Math.max(0, Math.floor((1 - elapsed / room.timePerQuestion) * 150));
        player.score += 50 + speedBonus + bonusStreak;
      } else if (room.gameType === 'SURVIVAL') {
        player.score += 100 + bonusStreak;
      } else if (room.gameType === 'TIMED_TRIAL') {
        const timeBonus = Math.floor((1 - elapsed / room.timePerQuestion) * 100);
        player.score += 50 + timeBonus;
      } else {
        player.score += 100 + bonusStreak;
      }

      if (player.streak > player.maxStreak) {
        player.maxStreak = player.streak;
      }

      if (room.gameType === 'GOLD_RUSH') {
        const otherPlayers = Array.from(room.players.values()).filter(
          (candidate) => candidate.id !== player.id && candidate.score > 0
        );
        if (otherPlayers.length > 0 && Math.random() < 0.3) {
          const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          const stolen = Math.min(30, target.score);
          target.score = Math.max(0, target.score - stolen);
          player.score += stolen;
          room.players.set(target.id, target);
          io.to(data.code).emit('notification', {
            message: `${player.playerName} mencuri ${stolen} emas dari ${target.playerName}!`,
          });
        }
      }
    } else {
      player.streak = 0;
      player.wrong++;
      if (room.gameType === 'GOLD_RUSH') {
        const penalty = Math.min(30, player.score);
        player.score = Math.max(0, player.score - penalty);
      }
      if (room.gameType === 'SURVIVAL') {
        player.hearts = (player.hearts || 3) - 1;
        if (player.hearts <= 0) player.eliminated = true;
      }
    }

    room.players.set(identity.sub, player);
    io.to(data.code).emit('score-update', {
      playerId: identity.sub,
      playerName: player.playerName,
      score: player.score,
      correct: player.correct,
      wrong: player.wrong,
      streak: player.streak,
      hearts: player.hearts,
      eliminated: player.eliminated,
    });

    socket.emit('answer-result', {
      playerId: identity.sub,
      playerName: player.playerName,
      isCorrect,
      score: player.score,
    });
  });

  const arenaIdentity = (code: string) => {
    const room = rooms.get(code);
    if (!room || room.category !== 'KUIS_TEMPUR_ARENA') return null;
    return Array.from(room.players.values()).find((player) => player.odiceId === socket.id) || null;
  };

  socket.on('arena-ready', (data: { code: string; userId: string }) => {
    const player = arenaIdentity(data.code);
    if (!player || player.id !== data.userId) return;
    kuisTempurArena.ready(socket, { code: data.code, userId: player.id });
  });

  socket.on('arena-move', (data: { code: string; userId: string; x: number; y: number }) => {
    const player = arenaIdentity(data.code);
    if (!player || player.id !== data.userId) return;
    kuisTempurArena.move({ code: data.code, userId: player.id, x: data.x, y: data.y });
  });

  socket.on('arena-shoot', (data: { code: string; userId: string; targetId: string }) => {
    const player = arenaIdentity(data.code);
    if (!player || player.id !== data.userId) return;
    kuisTempurArena.shoot({ code: data.code, userId: player.id, targetId: data.targetId });
  });

  socket.on('arena-answer', (data: { code: string; userId: string; questionId: string; answerIndex: number }) => {
    const player = arenaIdentity(data.code);
    if (!player || player.id !== data.userId) return;
    kuisTempurArena.answer({
      code: data.code,
      userId: player.id,
      questionId: data.questionId,
      answerIndex: data.answerIndex,
    });
  });

  socket.on('arena-rematch', (data: { code: string; userId: string }) => {
    const player = arenaIdentity(data.code);
    if (!player || player.id !== data.userId) return;
    void kuisTempurArena.requestRematch({ code: data.code, userId: player.id });
  });

  socket.on('end-game', async (data: { code: string }) => {
    const identity = socket.data.identity as SocketIdentity | undefined;
    const room = rooms.get(data.code);
    if (!identity || !room || room.hostId !== identity.sub) return;
    await finishGame(room);
  });

  socket.on('leave-room', (data: { code: string; userId?: string }) => {
    const identity = socket.data.identity as SocketIdentity | undefined;
    if (!identity) return;
    const userId = identity.sub;
    const room = rooms.get(data.code);
    const player = room?.players.get(userId);
    if (!room || !player || player.odiceId !== socket.id) return;

    if (kuisTempurArena.isActive(data.code)) {
      kuisTempurArena.removePlayer(data.code, userId);
    }
    handleLeave(socket, data.code, userId);
  });

  // Matchmaking
  socket.on('join-queue', (data: { userId?: string; userName?: string; avatarUrl?: string; gameType?: string; characterId?: string }) => {
    const identity = socket.data.identity as SocketIdentity | undefined;
    if (!identity) return;

    if (data.gameType === 'KUIS_TEMPUR_ARENA') {
      const existingRoom = Array.from(rooms.values()).find((candidate) =>
        candidate.category === 'KUIS_TEMPUR_ARENA' &&
        candidate.matchmaking === 'PUBLIC' &&
        candidate.status === 'WAITING' &&
        candidate.players.size < MAX_KUIS_TEMPUR_PLAYERS
      );

      const player: Player = {
        id: identity.sub,
        odiceId: socket.id,
        playerName: identity.name,
        avatarUrl: identity.avatar || undefined,
        characterId: normalizeKuisTempurCharacterId(data.characterId),
        score: 0,
        correct: 0,
        wrong: 0,
        streak: 0,
        maxStreak: 0,
        answerTimes: [],
        ready: true,
      };

      if (existingRoom) {
        existingRoom.players.set(identity.sub, player);
        playerSockets.set(socket.id, existingRoom.code);
        socket.join(existingRoom.code);
        socket.emit('room-joined', {
          roomId: existingRoom.id,
          code: existingRoom.code,
          name: existingRoom.name,
          isHost: identity.sub === existingRoom.hostId,
          player,
        });
        io.to(existingRoom.code).emit('player-list', getPlayersList(existingRoom));
        io.to(existingRoom.code).emit('queue-status', {
          inQueue: true,
          message: `${existingRoom.players.size}/10 pemain siap di arena publik`,
        });
        schedulePublicArenaStart(existingRoom);
        console.log(`[QuickMatch] ${identity.name} joined public arena ${existingRoom.code} (${existingRoom.players.size}/10)`);
        return;
      }

      let code = generateCode();
      while (rooms.has(code)) code = generateCode();
      const room: Room = {
        id: `public-arena-${code}`,
        code,
        name: `Main Cepat · Arena ${code}`,
        hostId: identity.sub,
        gameType: 'KUIS_BATTLE',
        category: 'KUIS_TEMPUR_ARENA',
        difficulty: 'MEDIUM',
        status: 'WAITING',
        questionCount: 20,
        timePerQuestion: 15,
        currentQuestion: 0,
        questions: [],
        players: new Map([[identity.sub, player]]),
        matchmaking: 'PUBLIC',
      };
      rooms.set(code, room);
      playerSockets.set(socket.id, code);
      socket.join(code);
      socket.emit('room-created', {
        roomId: room.id,
        code: room.code,
        name: room.name,
        isHost: true,
        player,
      });
      io.to(code).emit('player-list', getPlayersList(room));
      socket.emit('queue-status', { inQueue: true, position: 1, message: 'Menunggu pemain lain...' });
      console.log(`[QuickMatch] ${identity.name} created public arena ${code}`);
      return;
    }

    if (matchmakingQueue.some((player) => player.userId === identity.sub)) {
      socket.emit('queue-status', { inQueue: true, message: 'Sudah dalam antrean' });
      return;
    }

    const queued: QueuePlayer = {
      userId: identity.sub,
      userName: identity.name,
      avatarUrl: identity.avatar || undefined,
      socketId: socket.id,
      gameType: data.gameType || 'KUIS_BATTLE',
      joinedAt: new Date(),
    };

    matchmakingQueue.push(queued);
    socket.emit('queue-status', {
      inQueue: true,
      position: matchmakingQueue.length,
      message: 'Mencari lawan sepadan...',
    });
    console.log(`[Matchmaking] ${identity.name} joined queue (${matchmakingQueue.length} waiting)`);

    tryMatchPlayers();

    setTimeout(() => {
      const stillIn = matchmakingQueue.find((player) => player.userId === identity.sub);
      if (stillIn) {
        removeFromQueue(identity.sub);
        socket.emit('queue-timeout', { message: 'Tidak ada lawan ditemukan. Coba lagi!' });
        console.log(`[Matchmaking] ${identity.name} queue timeout`);
      }
    }, MATCH_TIMEOUT_MS);
  });

  socket.on('leave-queue', (_data: { userId?: string }) => {
    const identity = socket.data.identity as SocketIdentity | undefined;
    if (!identity) return;
    removeFromQueue(identity.sub);
    socket.emit('queue-status', { inQueue: false, message: 'Keluar dari antrean' });
    console.log(`[Matchmaking] ${identity.sub} left queue`);
  });

  socket.on('rematch', (data: { userId?: string; userName?: string; avatarUrl?: string; gameType?: string }) => {
    const identity = socket.data.identity as SocketIdentity | undefined;
    if (!identity) return;
    const queued: QueuePlayer = {
      userId: identity.sub,
      userName: identity.name,
      avatarUrl: identity.avatar || undefined,
      socketId: socket.id,
      gameType: data.gameType || 'KUIS_BATTLE',
      joinedAt: new Date(),
    };
    matchmakingQueue.push(queued);
    socket.emit('queue-status', { inQueue: true, message: 'Mencari lawan sepadan...' });
    tryMatchPlayers();
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    removeFromQueueBySocket(socket.id);
    const code = playerSockets.get(socket.id);
    if (code) {
      const room = rooms.get(code);
      if (room) {
        room.players.forEach((p, userId) => {
          if (p.odiceId !== socket.id) return;
          if (kuisTempurArena.isActive(code)) {
            kuisTempurArena.disconnect(code, userId);
          } else {
            handleLeave(socket, code, userId);
          }
        });
      }
      playerSockets.delete(socket.id);
    }
  });
});

function getPlayersList(room: Room) {
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    playerName: p.playerName,
    avatarUrl: p.avatarUrl,
    characterId: p.characterId || DEFAULT_KUIS_TEMPUR_CHARACTER_ID,
    score: p.score,
    correct: p.correct,
    wrong: p.wrong,
    streak: p.streak,
    maxStreak: p.maxStreak,
    ready: p.ready,
    isHost: p.id === room.hostId,
  }));
}

async function loadQuestions(gameType: string, count: number): Promise<Question[]> {
  try {
    const dbQuestions = await prisma.gameQuestion.findMany({
      where: {
        gameRoomId: null,
      },
      take: count,
      orderBy: { orderIndex: 'asc' },
    });

    if (dbQuestions.length >= count) {
      return dbQuestions.map((q: any) => ({
        id: q.id,
        text: q.text,
        audioUrl: q.audioUrl || undefined,
        imageUrl: q.imageUrl || undefined,
        passage: q.passage || undefined,
        type: q.type,
        options: q.options as string[],
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty,
      }));
    }
  } catch (err) {
    console.log('[Game] No DB questions, using defaults');
  }

  return getDefaultQuestions(gameType, count);
}

function getDefaultQuestions(gameType: string, count: number): Question[] {
  const kuisBattle: Question[] = [
    { id: 'kb1', text: 'Apa sinonim dari kata "cerdas"?', type: 'PILIHAN_GANDA', options: ['Bodoh', 'Pintar', 'Malas', 'Lambat'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'kb2', text: 'Kalimat berikut yang menggunakan kata baku adalah...', type: 'PILIHAN_GANDA', options: ['Dia pergi ke minimarket untuk membeli snack', 'Dia pergi ke swalayan untuk membeli gorengan', 'Dia pergi ke took untuk membeli buku', 'Dia pergi ke tempat untuk membeli barang'], correctAnswer: '1', difficulty: 'MEDIUM' },
    { id: 'kb3', text: '"Merdeka" adalah kata yang berasal dari bahasa...', type: 'PILIHAN_GANDA', options: ['Belanda', 'Sanskerta', 'Jawa', 'Arab'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'kb4', text: 'Konjungsi yang menunjukkan hubungan sebab-akibat adalah...', type: 'PILIHAN_GANDA', options: ['tetapi', 'karena', 'atau', 'meski'], correctAnswer: '1', difficulty: 'MEDIUM' },
    { id: 'kb5', text: 'Kalimat sempurna harus memiliki...', type: 'PILIHAN_GANDA', options: ['Subjek dan predikat', 'Predikat saja', 'Objek saja', 'Keterangan saja'], correctAnswer: '0', difficulty: 'MEDIUM' },
    { id: 'kb6', text: 'Imbuhan "me-" pada kata "membangun" berfungsi untuk...', type: 'PILIHAN_GANDA', options: ['Negasi', 'Kata kerja aktif', 'Kata benda', 'Keterangan'], correctAnswer: '1', difficulty: 'HARD' },
    { id: 'kb7', text: 'Berikut yang merupakan kalimat langsung adalah...', type: 'PILIHAN_GANDA', options: ['Diah mengatakan bahwa ia akan pergi.', 'Diah berkata, "Aku akan pergi."', 'Diah menginginkan agar aku pergi.', 'Diah memintaku untuk pergi.'], correctAnswer: '1', difficulty: 'HARD' },
    { id: 'kb8', text: 'Kata "kebangsaan" termasuk kata turunan jenis...', type: 'PILIHAN_GANDA', options: ['Awalan', 'Sisipan', 'Akhiran', 'Gabungan'], correctAnswer: '2', difficulty: 'MEDIUM' },
    { id: 'kb9', text: 'Kosakata yang menunjukkan waktu adalah...', type: 'PILIHAN_GANDA', options: ['di sini', 'kemarin', 'di sana', 'ke sini'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'kb10', text: 'Antonim dari kata "sementara" adalah...', type: 'PILIHAN_GANDA', options: ['Selamanya', 'Sebentar', 'Sekarang', 'Nanti'], correctAnswer: '0', difficulty: 'MEDIUM' },
  ];

  const goldRush: Question[] = [
    { id: 'gr1', text: 'Apa arti kata "gugur" dalam kalimat "Rencana itu gugur"?', type: 'PILIHAN_GANDA', options: ['Jatuh', 'Batal', 'Tumbuh', 'Berhasil'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'gr2', text: 'Kata "efektif" berarti...', type: 'PILIHAN_GANDA', options: ['Ada hasilnya', 'Cepat selesai', 'Mahal harganya', 'Sulit dilakukan'], correctAnswer: '0', difficulty: 'MEDIUM' },
    { id: 'gr3', text: 'Majas yang membandingkan dua hal menggunakan kata "seperti" disebut...', type: 'PILIHAN_GANDA', options: ['Metafora', 'Personifikasi', 'Simile', 'Hiperbola'], correctAnswer: '2', difficulty: 'MEDIUM' },
    { id: 'gr4', text: 'Kata baku dari "nasehat" adalah...', type: 'PILIHAN_GANDA', options: ['Nasehat', 'Nasihat', 'Nasehad', 'Nasihad'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'gr5', text: 'Apa jenis kata dari "keindahan"?', type: 'PILIHAN_GANDA', options: ['Kata kerja', 'Kata sifat', 'Kata benda', 'Kata keterangan'], correctAnswer: '2', difficulty: 'MEDIUM' },
    { id: 'gr6', text: '"Angin berbisik lembut" menggunakan majas...', type: 'PILIHAN_GANDA', options: ['Simile', 'Personifikasi', 'Metafora', 'Ironi'], correctAnswer: '1', difficulty: 'HARD' },
    { id: 'gr7', text: 'Kata "praktek" yang baku adalah...', type: 'PILIHAN_GANDA', options: ['Praktek', 'Praktik', 'Practik', 'Prakteq'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'gr8', text: 'Teks yang berisi langkah-langkah melakukan sesuatu disebut teks...', type: 'PILIHAN_GANDA', options: ['Deskripsi', 'Narasi', 'Prosedur', 'Eksposisi'], correctAnswer: '2', difficulty: 'MEDIUM' },
    { id: 'gr9', text: 'Prefiks "ber-" pada kata "berlari" menunjukkan...', type: 'PILIHAN_GANDA', options: ['Kata benda', 'Kata kerja aktif', 'Kata sifat', 'Kata keterangan'], correctAnswer: '1', difficulty: 'MEDIUM' },
    { id: 'gr10', text: 'Apa persamaan kata "gundah"?', type: 'PILIHAN_GANDA', options: ['Senang', 'Gelisah', 'Tenang', 'Marah'], correctAnswer: '1', difficulty: 'EASY' },
  ];

  const speedBattle: Question[] = [
    { id: 'sb1', text: 'Kata "apoteek" yang benar adalah...', type: 'PILIHAN_GANDA', options: ['Apoteek', 'Apotek', 'Apotik', 'Apotiq'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'sb2', text: 'Sinonim "gundah" adalah...', type: 'PILIHAN_GANDA', options: ['Senang', 'Gelisah', 'Tenang', 'Marah'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'sb3', text: 'Kata "risiko" yang baku adalah...', type: 'PILIHAN_GANDA', options: ['Resiko', 'Risiko', 'Risico', 'Risikoh'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'sb4', text: 'Apa arti "ambigu"?', type: 'PILIHAN_GANDA', options: ['Jelas', 'Bermakna ganda', 'Singkat', 'Panjang'], correctAnswer: '1', difficulty: 'MEDIUM' },
    { id: 'sb5', text: 'Kata "di" sebagai kata depan ditulis...', type: 'PILIHAN_GANDA', options: ['Serangkai', 'Terpisah', 'Dengan tanda hubung', 'Di akhir kata'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'sb6', text: '"Dia sangat pintar" termasuk kalimat...', type: 'PILIHAN_GANDA', options: ['Majemuk', 'Tunggal', 'Langsung', 'Tidak langsung'], correctAnswer: '1', difficulty: 'MEDIUM' },
    { id: 'sb7', text: 'Kata "kwalitas" yang baku adalah...', type: 'PILIHAN_GANDA', options: ['Kwalitas', 'Kualitas', 'Kualitass', 'Qualitas'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'sb8', text: 'Apa lawan kata "abstrak"?', type: 'PILIHAN_GANDA', options: ['Nyata', 'Samar', 'Jelas', 'Sulit'], correctAnswer: '0', difficulty: 'MEDIUM' },
    { id: 'sb9', text: 'Kata "aktif" termasuk kata...', type: 'PILIHAN_GANDA', options: ['Benda', 'Sifat', 'Kerja', 'Keterangan'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'sb10', text: 'Imbuhan "ter-" pada "terbuka" menunjukkan...', type: 'PILIHAN_GANDA', options: ['Sengaja', 'Tidak sengaja', 'Sangat', 'Paling'], correctAnswer: '1', difficulty: 'MEDIUM' },
  ];

  const survival: Question[] = [
    { id: 'sv1', text: 'Kata "sutra" yang baku adalah...', type: 'PILIHAN_GANDA', options: ['Sutera', 'Sutra', 'Sutrah', 'Suteraa'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'sv2', text: 'Apa arti kata "kontradiksi"?', type: 'PILIHAN_GANDA', options: ['Persamaan', 'Pertentangan', 'Kesamaan', 'Penjelasan'], correctAnswer: '1', difficulty: 'MEDIUM' },
    { id: 'sv3', text: 'Kata "jadwal" yang benar adalah...', type: 'PILIHAN_GANDA', options: ['Jadwal', 'Jadual', 'Jadwall', 'Jadual'], correctAnswer: '0', difficulty: 'EASY' },
    { id: 'sv4', text: 'Majas yang melebih-lebihkan disebut...', type: 'PILIHAN_GANDA', options: ['Personifikasi', 'Hiperbola', 'Simile', 'Metafora'], correctAnswer: '1', difficulty: 'MEDIUM' },
    { id: 'sv5', text: 'Kata "karni" yang baku adalah...', type: 'PILIHAN_GANDA', options: ['Karni', 'Karena', 'Karna', 'Karne'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'sv6', text: 'Apa jenis kata dari "berlari"?', type: 'PILIHAN_GANDA', options: ['Kata benda', 'Kata sifat', 'Kata kerja', 'Kata keterangan'], correctAnswer: '2', difficulty: 'EASY' },
    { id: 'sv7', text: 'Kata "faham" yang baku adalah...', type: 'PILIHAN_GANDA', options: ['Faham', 'Faham', 'Paham', 'Faam'], correctAnswer: '2', difficulty: 'MEDIUM' },
    { id: 'sv8', text: 'Teks yang menceritakan peristiwa nyata disebut...', type: 'PILIHAN_GANDA', options: ['Fiksi', 'Nonfiksi', 'Puisi', 'Drama'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'sv9', text: 'Apa sinonim "pandai"?', type: 'PILIHAN_GANDA', options: ['Bodoh', 'Cerdas', 'Malas', 'Lambat'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'sv10', text: 'Kata "sistim" yang baku adalah...', type: 'PILIHAN_GANDA', options: ['Sistim', 'Sistem', 'Sisttem', 'System'], correctAnswer: '1', difficulty: 'EASY' },
  ];

  const timedTrial: Question[] = [
    { id: 'tt1', text: 'Kata "nasehat" yang baku adalah...', type: 'PILIHAN_GANDA', options: ['Nasehat', 'Nasihat', 'Nasehad', 'Nasihad'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'tt2', text: 'Apa arti "sinonim"?', type: 'PILIHAN_GANDA', options: ['Lawan kata', 'Persamaan kata', 'Kata baru', 'Kata lama'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'tt3', text: 'Kata "praktek" yang baku adalah...', type: 'PILIHAN_GANDA', options: ['Praktek', 'Praktik', 'Practik', 'Prakteq'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'tt4', text: 'Kata "obyek" yang baku adalah...', type: 'PILIHAN_GANDA', options: ['Obyek', 'Objek', 'Obek', 'Objec'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'tt5', text: 'Apa arti "antonim"?', type: 'PILIHAN_GANDA', options: ['Persamaan kata', 'Lawan kata', 'Kata dasar', 'Kata turunan'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'tt6', text: 'Kata "kwantitas" yang baku adalah...', type: 'PILIHAN_GANDA', options: ['Kwantitas', 'Kuantitas', 'Kuantitass', 'Quantitas'], correctAnswer: '1', difficulty: 'MEDIUM' },
    { id: 'tt7', text: 'Apa jenis kata "cantik"?', type: 'PILIHAN_GANDA', options: ['Kata benda', 'Kata sifat', 'Kata kerja', 'Kata keterangan'], correctAnswer: '1', difficulty: 'EASY' },
    { id: 'tt8', text: 'Kata "aktifitas" yang baku adalah...', type: 'PILIHAN_GANDA', options: ['Aktifitas', 'Aktivitas', 'Aktipitas', 'Activity'], correctAnswer: '1', difficulty: 'MEDIUM' },
    { id: 'tt9', text: 'Apa arti "denotasi"?', type: 'PILIHAN_GANDA', options: ['Makna kiasan', 'Makna sebenarnya', 'Makna ganda', 'Makna tersirat'], correctAnswer: '1', difficulty: 'MEDIUM' },
    { id: 'tt10', text: 'Kata "metode" yang baku adalah...', type: 'PILIHAN_GANDA', options: ['Metoda', 'Metode', 'Method', 'Metod'], correctAnswer: '1', difficulty: 'EASY' },
  ];

  const questionsMap: Record<string, Question[]> = {
    KUIS_BATTLE: kuisBattle,
    GOLD_RUSH: goldRush,
    SPEED_BATTLE: speedBattle,
    SURVIVAL: survival,
    TIMED_TRIAL: timedTrial,
  };

  const questions = questionsMap[gameType] || kuisBattle;
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function emitQuestion(room: Room) {
  if (room.currentQuestion >= room.questions.length) {
    finishGame(room);
    return;
  }

  const question = room.questions[room.currentQuestion];
  room.questionStartedAt = Date.now();
  io.to(room.code).emit('show-question', {
    index: room.currentQuestion,
    total: room.questions.length,
    gameMode: room.gameType,
    id: question.id,
    text: question.text,
    audioUrl: question.audioUrl,
    imageUrl: question.imageUrl,
    passage: question.passage,
    type: question.type,
    options: question.options,
    difficulty: question.difficulty,
    timePerQuestion: room.timePerQuestion,
  });

  const timer = setTimeout(async () => {
    io.to(room.code).emit('time-up', {
      questionIndex: room.currentQuestion,
      correctAnswer: question.correctAnswer,
    });

    room.players.forEach((p) => {
      if (p.lastAnsweredQuestion !== room.currentQuestion) {
        p.streak = 0;
        p.wrong++;
        p.answerTimes.push(room.timePerQuestion);
        room.players.set(p.id, p);
      }
    });

    room.currentQuestion++;
    setTimeout(() => emitQuestion(room), 3000);
  }, room.timePerQuestion * 1000);

  (room as any)._currentTimer = timer;
}

async function finishGame(room: Room) {
  if (room.status === 'FINISHED') return;
  room.status = 'FINISHED';

  if ((room as any)._currentTimer) {
    clearTimeout((room as any)._currentTimer);
  }

  const sortedPlayers = Array.from(room.players.values()).sort((a, b) => b.score - a.score);

  const results = sortedPlayers.map((p, index) => ({
    playerId: p.id,
    playerName: p.playerName,
    avatarUrl: p.avatarUrl,
    rank: index + 1,
    score: p.score,
    correct: p.correct,
    wrong: p.wrong,
    maxStreak: p.maxStreak,
    avgTime: p.answerTimes.length > 0
      ? p.answerTimes.reduce((a, b) => a + b, 0) / p.answerTimes.length
      : 0,
    isHost: p.id === room.hostId,
  }));

  io.to(room.code).emit('game-finished', {
    results,
    roomCode: room.code,
    roomName: room.name,
  });

  try {
    for (const result of results) {
      const session = await prisma.gameSession.findFirst({
        where: { roomId: room.id, userId: result.playerId },
      });
      if (session) {
        await prisma.gameResult.create({
          data: {
            roomId: room.id,
            userId: result.playerId,
            sessionId: session.id,
            finalScore: result.score,
            rank: result.rank,
            correct: result.correct,
            wrong: result.wrong,
            maxStreak: result.maxStreak,
            avgTime: result.avgTime,
            xpEarned: Math.floor(result.score / 10),
          },
        });

        await prisma.user.update({
          where: { id: result.playerId },
          data: {
            xp: { increment: Math.floor(result.score / 10) },
          },
        });
      }
    }

    await prisma.gameRoom.update({
      where: { code: room.code },
      data: { status: 'FINISHED', endedAt: new Date() },
    });
  } catch (err) {
    console.error('[Error] finish-game:', err);
  }

  setTimeout(() => {
    rooms.delete(room.code);
  }, 60000);

  console.log(`[Game] Finished: ${room.code}`);
}

function handleLeave(socket: any, code: string, odiceId: string) {
  const room = rooms.get(code);
  if (!room) return;

  const player = room.players.get(odiceId);
  if (!player) return;

  const wasHost = odiceId === room.hostId;
  room.players.delete(odiceId);
  socket.leave(code);
  playerSockets.delete(socket.id);

  if (wasHost && room.players.size > 0) {
    const newHost = room.players.values().next().value;
    if (!newHost) return;
    room.hostId = newHost.id;
    io.to(code).emit('host-changed', { newHostId: newHost.id });
  }

  // Emit the list only after a possible host transfer so every client's
  // isHost flag is immediately coherent.
  io.to(code).emit('player-list', getPlayersList(room));
  io.to(code).emit('notification', {
    type: 'PLAYER_LEFT',
    message: `${player.playerName} keluar`,
    playerName: player.playerName,
  });

  if (room.matchmaking === 'PUBLIC' && room.players.size < 2) {
    clearPublicArenaCountdown(room);
    io.to(code).emit('match-countdown', { seconds: -1 });
  }

  if (room.players.size === 0) {
    clearPublicArenaCountdown(room);
    rooms.delete(code);
    console.log(`[Room] Deleted empty room: ${code}`);
  }
}

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Game Server] ${signal} received, closing gracefully...`);

  const forceExit = setTimeout(() => {
    console.error('[Game Server] Graceful shutdown timed out');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  io.close();
  httpServer.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.error('[Game Server] Prisma disconnect failed', error);
    } finally {
      clearTimeout(forceExit);
      console.log('[Game Server] Shutdown complete');
      process.exit(0);
    }
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[Game Server] Running on port ${PORT}`);
  console.log(`[Game Server] Allowed origins: ${GAME_ALLOWED_ORIGINS.join(', ')}`);
});
