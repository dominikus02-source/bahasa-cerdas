import { Server } from 'socket.io';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PORT = parseInt(process.env.GAME_PORT || '3001', 10);

interface Player {
  id: string;
  odiceId: string;
  playerName: string;
  avatarUrl?: string;
  score: number;
  correct: number;
  wrong: number;
  streak: number;
  maxStreak: number;
  answerTimes: number[];
  ready: boolean;
  hearts?: number;
  eliminated?: boolean;
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
      p.maxStreak = 0; p.answerTimes = []; p.ready = false;
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

const io = new Server(PORT, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
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
  }) => {
    try {
      let code = generateCode();
      while (rooms.has(code)) {
        code = generateCode();
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

      const hostPlayer: Player = {
        id: data.hostId,
        odiceId: socket.id,
        playerName: data.hostName,
        avatarUrl: data.hostAvatar,
        score: 0,
        correct: 0,
        wrong: 0,
        streak: 0,
        maxStreak: 0,
        answerTimes: [],
        ready: true,
      };

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
  }) => {
    try {
      const room = rooms.get(data.code);
      if (!room) {
        socket.emit('error', { message: 'Room tidak ditemukan' });
        return;
      }
      if (room.status !== 'WAITING') {
        socket.emit('error', { message: 'Game sudah dimulai' });
        return;
      }

      if (room.players.has(data.userId)) {
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

      await prisma.gameSession.create({
        data: {
          roomId: room.id,
          userId: data.userId,
          playerName: data.playerName,
          avatarUrl: data.avatarUrl,
        },
      });

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

  socket.on('toggle-ready', (data: { code: string; userId: string }) => {
    const room = rooms.get(data.code);
    if (!room) return;

    const player = room.players.get(data.userId);
    if (!player || player.id === room.hostId) return;

    player.ready = !player.ready;
    room.players.set(data.userId, player);
    io.to(data.code).emit('player-list', getPlayersList(room));
  });

  socket.on('start-game', async (data: { code: string }) => {
    try {
      const room = rooms.get(data.code);
      if (!room) return;

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
    userId: string;
    questionIndex: number;
    answerIndex: number;
    timeSpent: number;
  }) => {
    const room = rooms.get(data.code);
    if (!room || room.status !== 'IN_PROGRESS') return;
    if (data.questionIndex !== room.currentQuestion) return;

    const player = room.players.get(data.userId);
    if (!player) return;

    const question = room.questions[data.questionIndex];
    const isCorrect = data.answerIndex === parseInt(question.correctAnswer);

    player.answerTimes.push(data.timeSpent);

    if (isCorrect) {
      player.streak++;
      player.correct++;
      const bonusStreak = Math.min(player.streak - 1, 5) * 10;
      const timeBonus = Math.floor((data.timeSpent / room.timePerQuestion) * 50);

      if (room.gameType === 'GOLD_RUSH') {
        const goldEarned = 50 + bonusStreak + Math.floor(Math.random() * 50);
        player.score += goldEarned;
      } else if (room.gameType === 'SPEED_BATTLE') {
        const speedBonus = Math.max(0, Math.floor((1 - data.timeSpent / room.timePerQuestion) * 150));
        player.score += 50 + speedBonus + bonusStreak;
      } else if (room.gameType === 'SURVIVAL') {
        player.score += 100 + bonusStreak;
      } else if (room.gameType === 'TIMED_TRIAL') {
        const timeBonus = Math.floor((1 - data.timeSpent / room.timePerQuestion) * 100);
        player.score += 50 + timeBonus;
      } else {
        player.score += 100 + bonusStreak;
      }

      if (player.streak > player.maxStreak) {
        player.maxStreak = player.streak;
      }

      if (room.gameType === 'GOLD_RUSH') {
        const otherPlayers = Array.from(room.players.values()).filter(p => p.id !== player.id && p.score > 0);
        if (otherPlayers.length > 0 && Math.random() < 0.3) {
          const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          const stolen = Math.min(30, target.score);
          target.score = Math.max(0, target.score - stolen);
          player.score += stolen;
          room.players.set(target.id, target);
          io.to(data.code).emit('notification', { message: `${player.playerName} mencuri ${stolen} emas dari ${target.playerName}!` });
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
        if (player.hearts <= 0) {
          player.eliminated = true;
        }
      }
    }

    room.players.set(data.userId, player);
    io.to(data.code).emit('score-update', {
      playerId: data.userId,
      playerName: player.playerName,
      score: player.score,
      correct: player.correct,
      wrong: player.wrong,
      streak: player.streak,
      hearts: player.hearts,
      eliminated: player.eliminated,
    });

    io.to(data.code).emit('answer-result', {
      playerId: data.userId,
      playerName: player.playerName,
      isCorrect,
      correctAnswer: question.correctAnswer,
      score: player.score,
    });
  });

  socket.on('end-game', async (data: { code: string }) => {
    const room = rooms.get(data.code);
    if (!room) return;
    await finishGame(room);
  });

  socket.on('leave-room', (data: { code: string; userId: string }) => {
    handleLeave(socket, data.code, data.userId);
  });

  // Matchmaking
  socket.on('join-queue', (data: { userId: string; userName: string; avatarUrl?: string; gameType?: string }) => {
    if (matchmakingQueue.some(p => p.userId === data.userId)) {
      socket.emit('queue-status', { inQueue: true, message: 'Sudah dalam antrean' });
      return;
    }

    const qp: QueuePlayer = {
      userId: data.userId,
      userName: data.userName,
      avatarUrl: data.avatarUrl,
      socketId: socket.id,
      gameType: data.gameType || 'KUIS_BATTLE',
      joinedAt: new Date(),
    };

    matchmakingQueue.push(qp);
    socket.emit('queue-status', { inQueue: true, position: matchmakingQueue.length, message: 'Mencari lawan sepadan...' });
    console.log(`[Matchmaking] ${data.userName} joined queue (${matchmakingQueue.length} waiting)`);

    tryMatchPlayers();

    // Auto-remove after timeout
    setTimeout(() => {
      const stillIn = matchmakingQueue.find(p => p.userId === data.userId);
      if (stillIn) {
        removeFromQueue(data.userId);
        socket.emit('queue-timeout', { message: 'Tidak ada lawan ditemukan. Coba lagi!' });
        console.log(`[Matchmaking] ${data.userName} queue timeout`);
      }
    }, MATCH_TIMEOUT_MS);
  });

  socket.on('leave-queue', (data: { userId: string }) => {
    removeFromQueue(data.userId);
    socket.emit('queue-status', { inQueue: false, message: 'Keluar dari antrean' });
    console.log(`[Matchmaking] ${data.userId} left queue`);
  });

  socket.on('rematch', (data: { userId: string; userName: string; avatarUrl?: string; gameType?: string }) => {
    const qp: QueuePlayer = {
      userId: data.userId,
      userName: data.userName,
      avatarUrl: data.avatarUrl,
      socketId: socket.id,
      gameType: data.gameType || 'KUIS_BATTLE',
      joinedAt: new Date(),
    };
    matchmakingQueue.push(qp);
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
        room.players.forEach((p, odiceId) => {
          if (p.odiceId === socket.id) {
            handleLeave(socket, code, odiceId);
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
    correctAnswer: question.correctAnswer,
    difficulty: question.difficulty,
    timePerQuestion: room.timePerQuestion,
  });

  const timer = setTimeout(async () => {
    io.to(room.code).emit('time-up', {
      questionIndex: room.currentQuestion,
      correctAnswer: question.correctAnswer,
    });

    room.players.forEach((p) => {
      if (p.answerTimes.length <= room.currentQuestion) {
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

  io.to(code).emit('player-list', getPlayersList(room));
  io.to(code).emit('notification', {
    type: 'PLAYER_LEFT',
    message: `${player.playerName} keluar`,
    playerName: player.playerName,
  });

  if (wasHost && room.players.size > 0) {
    const newHost = room.players.values().next().value;
    if (!newHost) return;
    room.hostId = newHost.id;
    io.to(code).emit('host-changed', { newHostId: newHost.id });
  }

  if (room.players.size === 0) {
    rooms.delete(code);
    console.log(`[Room] Deleted empty room: ${code}`);
  }
}

console.log(`[Game Server] Running on port ${PORT}`);
