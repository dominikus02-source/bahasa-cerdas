"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useGameStore } from "@/store";

let socket: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001", {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });
    }

    socketRef.current = socket;

    const store = useGameStore.getState();

    socket.on("roomCreated", (data: { roomId: string; player: { id: string; name: string } }) => {
      store.setRoom({ roomId: data.roomId, myPlayerId: data.player.id, isGameActive: false });
    });

    socket.on("roomJoined", (data: { roomId: string; players: any[] }) => {
      store.setRoom({ roomId: data.roomId, players: data.players });
    });

    socket.on("playerList", (players: any[]) => {
      store.setRoom({ players });
    });

    socket.on("gameStarted", (data: { totalQuestions: number; questionTime: number; mode: string; category: string }) => {
      store.setRoom({
        isGameActive: true,
        totalQuestions: data.totalQuestions,
        questionTime: data.questionTime,
        mode: data.mode,
        category: data.category,
        currentQuestion: 0,
      });
    });

    socket.on("questionChanged", (data: { questionIndex: number }) => {
      store.setRoom({ currentQuestion: data.questionIndex });
    });

    socket.on("hostChanged", (data: { newHostId: string }) => {
      store.setRoom((state) => ({
        players: state.players.map((p) => ({
          ...p,
          isHost: p.id === data.newHostId,
        })),
      }));
    });

    return () => {
      socket?.off("roomCreated");
      socket?.off("roomJoined");
      socket?.off("playerList");
      socket?.off("gameStarted");
      socket?.off("questionChanged");
      socket?.off("hostChanged");
    };
  }, []);

  return socketRef.current;
}