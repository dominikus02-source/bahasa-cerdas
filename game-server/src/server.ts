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

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function calculateScore(timeRemaining: number, baseScore: number, streak: number): number {
  const timeBonus = Math.floor(timeRemaining / timeRemaining * 50);
  const streakBonus = streak * 10;
  return baseScore + timeBonus + streakBonus;
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
      player.score += 100 + bonusStreak;
      if (player.streak > player.maxStreak) {
        player.maxStreak = player.streak;
      }
    } else {
      player.streak = 0;
      player.wrong++;
    }

    room.players.set(data.userId, player);
    io.to(data.code).emit('score-update', {
      playerId: data.userId,
      score: player.score,
      correct: player.correct,
      streak: player.streak,
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

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
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
        difficulty: 'MEDIUM',
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
  const allQuestions: Question[] = [
    { id: '1', text: 'Apa sinonim dari kata "cerdas"?', type: 'PILIHAN_GANDA', options: ['Bodoh', 'Pintar', 'Malas', 'Lambat'], correctAnswer: '1', difficulty: 'EASY' },
    { id: '2', text: 'Kalimat berikut yang menggunakan kata baku adalah...', type: 'PILIHAN_GANDA', options: ['Dia pergi ke minimarket untuk membeli snack', 'Dia pergi ke swalayan untuk membeli gorengan', 'Dia pergi ke took untuk membeli buku', 'Dia pergi ke tempat untuk membeli barang'], correctAnswer: '1', difficulty: 'MEDIUM' },
    { id: '3', text: '"Merdeka" adalah kata yang berasal dari bahasa...', type: 'PILIHAN_GANDA', options: ['Belanda', 'Sanskerta', 'Jawa', 'Arab'], correctAnswer: '1', difficulty: 'EASY' },
    { id: '4', text: 'Padanan kata "menghargai" yang tepat adalah...', type: 'PILIHAN_GANDA', options: ['Merendahkan', 'Memuji', 'Menyayat', 'Menyakiti'], correctAnswer: '1', difficulty: 'MEDIUM' },
    { id: '5', text: 'Kata baku untuk "nilai" adalah...', type: 'PILIHAN_GANDA', options: ['Nilai', 'Nillai', 'Niliai', 'Nilainya'], correctAnswer: '0', difficulty: 'EASY' },
    { id: '6', text: 'Konjungsi yang menunjukkan hubungan sebab-akibat adalah...', type: 'PILIHAN_GANDA', options: ['tetapi', 'karena', 'atau', 'meski'], correctAnswer: '1', difficulty: 'MEDIUM' },
    { id: '7', text: '"Membaca" adalah kata kerja...', type: 'PILIHAN_GANDA', options: ['Transitif', 'Intransitif', 'Keterangan', 'Subjek'], correctAnswer: '0', difficulty: 'EASY' },
    { id: '8', text: 'Kalimat sempurna harus memiliki...', type: 'PILIHAN_GANDA', options: ['Subjek dan predikat', 'Predikat saja', 'Objek saja', 'Keterangan saja'], correctAnswer: '0', difficulty: 'MEDIUM' },
    { id: '9', text: 'Penulisan kata "serta" yang tepat dalam kalimat adalah...', type: 'PILIHAN_GANDA', options: ['serta', 'Serta', 'SERA', 'serTa'], correctAnswer: '1', difficulty: 'EASY' },
    { id: '10', text: 'Kata yang menunjukkan jumlah tunggal adalah...', type: 'PILIHAN_GANDA', options: ['beberapa', 'banyak', 'sebagian', 'seekor'], correctAnswer: '3', difficulty: 'MEDIUM' },
    { id: '11', text: 'Imbuhan "me-" pada kata "membangun" berfungsi untuk...', type: 'PILIHAN_GANDA', options: ['Negasi', 'Kata kerja aktif', 'Kata benda', 'Keterangan'], correctAnswer: '1', difficulty: 'HARD' },
    { id: '12', text: 'Berikut yang merupakan kalimat langsung adalah...', type: 'PILIHAN_GANDA', options: ['Diah mengatakan bahwa ia akan pergi.', 'Diah berkata, "Aku akan pergi."', 'Diah menginginkan agar aku pergi.', 'Diah memintaku untuk pergi.'], correctAnswer: '1', difficulty: 'HARD' },
    { id: '13', text: 'Kata "kebangsaan" termasuk kata turunan jenis...', type: 'PILIHAN_GANDA', options: ['Awalan', 'Sisipan', 'Akhiran', 'Gabungan'], correctAnswer: '2', difficulty: 'MEDIUM' },
    { id: '14', text: '"Tertawa" merupakan kata yang dibentuk dengan...', type: 'PILIHAN_GANDA', options: ['Prefiks', 'Sufiks', 'Konfiks', 'Infix'], correctAnswer: '3', difficulty: 'HARD' },
    { id: '15', text: 'Kosakata yang menunjukkan waktu adalah...', type: 'PILIHAN_GANDA', options: ['di sini', 'kemarin', 'di sana', 'ke sini'], correctAnswer: '1', difficulty: 'EASY' },
  ];

  return allQuestions.slice(0, Math.min(count, allQuestions.length));
}

function emitQuestion(room: Room) {
  if (room.currentQuestion >= room.questions.length) {
    finishGame(room);
    return;
  }

  const question = room.questions[room.currentQuestion];
  io.to(room.code).emit('show-question', {
    questionIndex: room.currentQuestion,
    totalQuestions: room.questions.length,
    question: {
      id: question.id,
      text: question.text,
      audioUrl: question.audioUrl,
      imageUrl: question.imageUrl,
      passage: question.passage,
      type: question.type,
      options: question.options,
    },
    timeLimit: room.timePerQuestion,
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
