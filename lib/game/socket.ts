'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const gameSocket = {
  connect(userId: string, userName: string, avatarUrl?: string) {
    if (socket?.connected) return socket;

    const serverUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL || 'http://localhost:3001';
    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to game server');
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from game server');
    });

    socket.on('error', (data: { message: string }) => {
      console.error('[Socket] Error:', data.message);
    });

    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket() {
    return socket;
  },

  on(event: string, callback: (...args: any[]) => void) {
    socket?.on(event, callback);
  },

  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      socket?.off(event, callback);
    } else {
      socket?.off(event);
    }
  },

  emit(event: string, data?: any) {
    socket?.emit(event, data);
  },

  onRoomCreated(callback: (data: { roomId: string; code: string; name: string; isHost: boolean; player: any }) => void) {
    socket?.on('room-created', callback);
  },

  onRoomJoined(callback: (data: { roomId: string; code: string; name: string; isHost: boolean; player: any }) => void) {
    socket?.on('room-joined', callback);
  },

  onPlayerList(callback: (players: any[]) => void) {
    socket?.on('player-list', callback);
  },

  onGameStarting(callback: (data: { totalQuestions: number; timePerQuestion: number; category?: string }) => void) {
    socket?.on('game-starting', callback);
  },

  onShowQuestion(callback: (data: {
    index: number;
    total: number;
    gameMode: string;
    id: string;
    text: string;
    audioUrl?: string;
    imageUrl?: string;
    passage?: string;
    type: string;
    options: string[];
    correctAnswer?: string;
    difficulty?: string;
    timePerQuestion: number;
  }) => void) {
    socket?.on('show-question', callback);
  },

  onTimeUp(callback: (data: { questionIndex: number; correctAnswer: string }) => void) {
    socket?.on('time-up', callback);
  },

  onAnswerResult(callback: (data: { playerId: string; playerName: string; isCorrect: boolean; correctAnswer: string; score: number }) => void) {
    socket?.on('answer-result', callback);
  },

  onScoreUpdate(callback: (data: { playerId: string; playerName?: string; score: number; correct: number; wrong: number; streak: number; hearts?: number; eliminated?: boolean }) => void) {
    socket?.on('score-update', callback);
  },

  onGameFinished(callback: (data: {
    results: Array<{
      playerId: string;
      playerName: string;
      avatarUrl?: string;
      rank: number;
      score: number;
      correct: number;
      wrong: number;
      maxStreak: number;
      avgTime: number;
      isHost: boolean;
    }>;
    roomCode: string;
    roomName: string;
  }) => void) {
    socket?.on('game-finished', callback);
  },

  onNotification(callback: (data: { type: string; message: string; playerName: string }) => void) {
    socket?.on('notification', callback);
  },

  onHostChanged(callback: (data: { newHostId: string }) => void) {
    socket?.on('host-changed', callback);
  },

  // Matchmaking events
  onMatchFound(callback: (data: { roomCode: string; opponent: { id: string; name: string; avatar?: string }; gameType: string; isHost: boolean }) => void) {
    socket?.on('match-found', callback);
  },

  onMatchCountdown(callback: (data: { seconds: number }) => void) {
    socket?.on('match-countdown', callback);
  },

  onQueueStatus(callback: (data: { inQueue: boolean; position?: number; message: string }) => void) {
    socket?.on('queue-status', callback);
  },

  onQueueTimeout(callback: (data: { message: string }) => void) {
    socket?.on('queue-timeout', callback);
  },

  joinQueue(data: { userId: string; userName: string; avatarUrl?: string; gameType?: string }) {
    socket?.emit('join-queue', data);
  },

  leaveQueue(data: { userId: string }) {
    socket?.emit('leave-queue', data);
  },

  rematch(data: { userId: string; userName: string; avatarUrl?: string; gameType?: string }) {
    socket?.emit('rematch', data);
  },

  createRoom(data: {
    hostId: string;
    hostName: string;
    hostAvatar?: string;
    name: string;
    gameType: string;
    category?: string;
    difficulty?: string;
    questionCount?: number;
    timePerQuestion?: number;
  }) {
    socket?.emit('create-room', data);
  },

  joinRoom(data: { code: string; userId: string; playerName: string; avatarUrl?: string }) {
    socket?.emit('join-room', data);
  },

  toggleReady(data: { code: string; userId: string }) {
    socket?.emit('toggle-ready', data);
  },

  startGame(data: { code: string }) {
    socket?.emit('start-game', data);
  },

  submitAnswer(data: {
    code: string;
    userId: string;
    questionIndex: number;
    answerIndex: number;
    timeSpent: number;
  }) {
    socket?.emit('submit-answer', data);
  },

  endGame(data: { code: string }) {
    socket?.emit('end-game', data);
  },

  leaveRoom(data: { code: string; userId: string }) {
    socket?.emit('leave-room', data);
  },
};