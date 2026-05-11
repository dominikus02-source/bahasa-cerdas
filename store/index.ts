import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  id: string | null;
  supabaseId: string | null;
  email: string | null;
  fullName: string | null;
  role: string | null;
  avatar: string | null;
  isPremium: boolean;
  isFounder: boolean;
  xp: number;
  level: number;
  streak: number;
  league: string;
  setUser: (user: Partial<UserState>) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      id: null,
      supabaseId: null,
      email: null,
      fullName: null,
      role: null,
      avatar: null,
      isPremium: false,
      isFounder: false,
      xp: 0,
      level: 1,
      streak: 0,
      league: "BRONZE",
      setUser: (user) => set((state) => ({ ...state, ...user })),
      clearUser: () =>
        set({
          id: null,
          supabaseId: null,
          email: null,
          fullName: null,
          role: null,
          avatar: null,
          isPremium: false,
          isFounder: false,
          xp: 0,
          level: 1,
          streak: 0,
          league: "BRONZE",
        }),
    }),
    { name: "bc-user" }
  )
);

interface GamePlayer {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  isReady: boolean;
}

interface GameState {
  roomId: string | null;
  mode: string | null;
  category: string | null;
  players: GamePlayer[];
  currentQuestion: number;
  totalQuestions: number;
  questionTime: number;
  myPlayerId: string | null;
  isGameActive: boolean;
  score: number;
  setRoom: (room: Partial<GameState> | ((state: GameState) => Partial<GameState>)) => void;
  addPlayer: (player: GamePlayer) => void;
  removePlayer: (playerId: string) => void;
  updateScore: (playerId: string, score: number) => void;
  nextQuestion: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      roomId: null,
      mode: null,
      category: null,
      players: [],
      currentQuestion: 0,
      totalQuestions: 10,
      questionTime: 30,
      myPlayerId: null,
      isGameActive: false,
      score: 0,
      setRoom: (room) => set((state) => ({ 
          ...state, 
          ...(typeof room === 'function' ? room(state) : room) 
        })),
      addPlayer: (player) =>
        set((state) => ({ players: [...state.players, player] })),
      removePlayer: (playerId) =>
        set((state) => ({
          players: state.players.filter((p) => p.id !== playerId),
        })),
      updateScore: (playerId, score) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === playerId ? { ...p, score } : p
          ),
        })),
      nextQuestion: () =>
        set((state) => ({ currentQuestion: state.currentQuestion + 1 })),
      resetGame: () =>
        set({
          roomId: null,
          mode: null,
          category: null,
          players: [],
          currentQuestion: 0,
          isGameActive: false,
          score: 0,
        }),
    }),
    { name: "bc-game" }
  )
);