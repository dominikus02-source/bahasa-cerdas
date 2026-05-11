import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());

interface Player {
  id: string;
  odName: string;
  score: number;
  isHost: boolean;
  isReady: boolean;
  socketId: string;
}

interface Room {
  roomId: string;
  hostId: string;
  mode: string;
  category?: string;
  players: Player[];
  status: "waiting" | "playing" | "finished";
  currentQuestion: number;
  totalQuestions: number;
  questionTime: number;
  kuisId?: string;
  createdAt: Date;
}

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("createRoom", (data: { userId: string; userName: string; mode: string; category?: string }) => {
    const roomId = generateRoomId();
    const hostPlayer: Player = {
      id: data.userId,
      odName: data.userName,
      score: 0,
      isHost: true,
      isReady: true,
      socketId: socket.id,
    };

    const room: Room = {
      roomId,
      hostId: data.userId,
      mode: data.mode || "classic",
      category: data.category,
      players: [hostPlayer],
      status: "waiting",
      currentQuestion: 0,
      totalQuestions: 10,
      questionTime: 30,
      createdAt: new Date(),
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit("roomCreated", { roomId, player: hostPlayer });
    console.log(`Room ${roomId} created by ${data.userName}`);
  });

  socket.on("joinRoom", (data: { roomId: string; userId: string; userName: string }) => {
    const room = rooms.get(data.roomId);

    if (!room) {
      socket.emit("error", { message: "Room tidak ditemukan" });
      return;
    }

    if (room.status !== "waiting") {
      socket.emit("error", { message: "Game sudah dimulai" });
      return;
    }

    if (room.players.length >= room.totalQuestions) {
      socket.emit("error", { message: "Room penuh" });
      return;
    }

    const player: Player = {
      id: data.userId,
      odName: data.userName,
      score: 0,
      isHost: false,
      isReady: false,
      socketId: socket.id,
    };

    room.players.push(player);
    socket.join(data.roomId);
    socket.emit("roomJoined", { roomId: data.roomId, mode: room.mode, category: room.category, player });
    socket.to(data.roomId).emit("playerList", room.players);
    console.log(`${data.userName} joined room ${data.roomId}`);
  });

  socket.on("startGame", (data: { roomId: string; hostId: string }) => {
    const room = rooms.get(data.roomId);
    if (!room || room.hostId !== data.hostId) return;

    room.status = "playing";
    room.currentQuestion = 0;
    io.to(data.roomId).emit("gameStarted", {
      mode: room.mode,
      category: room.category,
      totalQuestions: room.totalQuestions,
      questionTime: room.questionTime,
    });
    console.log(`Game started in room ${data.roomId}`);
  });

  socket.on("submitAnswer", (data: { roomId: string; userId: string; questionId: number; answer: string; timeMs: number }) => {
    const room = rooms.get(data.roomId);
    if (!room || room.status !== "playing") return;

    const player = room.players.find((p) => p.id === data.userId);
    if (player) {
      const baseScore = 100;
      const timeBonus = Math.max(0, Math.floor((room.questionTime * 1000 - data.timeMs) / 100));
      player.score += baseScore + timeBonus;
      io.to(data.roomId).emit("answerSubmitted", {
        userId: data.userId,
        questionId: data.questionId,
        answerCount: 1,
        totalPlayers: room.players.length,
      });
    }
  });

  socket.on("nextQuestion", (data: { roomId: string; hostId: string }) => {
    const room = rooms.get(data.roomId);
    if (!room || room.hostId !== data.hostId) return;

    room.currentQuestion++;
    if (room.currentQuestion >= room.totalQuestions) {
      room.status = "finished";
      const ranking = [...room.players].sort((a, b) => b.score - a.score);
      io.to(data.roomId).emit("gameFinished", { ranking });
    } else {
      io.to(data.roomId).emit("questionChanged", { questionIndex: room.currentQuestion });
    }
  });

  socket.on("leaveRoom", (data: { roomId: string; userId: string }) => {
    const room = rooms.get(data.roomId);
    if (!room) return;

    const playerIndex = room.players.findIndex((p) => p.id === data.userId);
    if (playerIndex === -1) return;

    const player = room.players[playerIndex];
    room.players.splice(playerIndex, 1);
    socket.leave(data.roomId);

    if (room.players.length === 0) {
      rooms.delete(data.roomId);
    } else if (player.isHost) {
      const newHost = room.players[0];
      newHost.isHost = true;
      room.hostId = newHost.id;
      io.to(data.roomId).emit("hostChanged", { newHostId: newHost.id });
    }

    io.to(data.roomId).emit("playerList", room.players);
    console.log(`User ${player.odName} left room ${data.roomId}`);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const [roomId, room] of rooms.entries()) {
      const player = room.players.find((p) => p.socketId === socket.id);
      if (player) {
        room.players = room.players.filter((p) => p.socketId !== socket.id);
        socket.to(roomId).emit("playerList", room.players);

        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else if (player.isHost) {
          const newHost = room.players[0];
          newHost.isHost = true;
          room.hostId = newHost.id;
          io.to(roomId).emit("hostChanged", { newHostId: newHost.id });
        }
      }
    }
  });
});

const PORT = Number(process.env.PORT) || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});