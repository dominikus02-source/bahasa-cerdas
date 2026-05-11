"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gamepad2, Users, Play, ArrowRight, QrCode, Trophy, Crown } from "lucide-react";
import { useGameStore } from "@/store";

export default function MuridKuisGamePage() {
  const gameStore = useGameStore();
  const [joinedCode, setJoinedCode] = useState("");
  const [mode, setMode] = useState<string | null>(null);

  const joinRoom = () => {
    if (joinedCode.length === 6) {
      gameStore.setRoom({ roomId: joinedCode.toUpperCase() });
    }
  };

  const modes = [
    { id: "classic", name: "Classic Mode", icon: Trophy, desc: "Jawab pilihan ganda secepat mungkin", players: 1240, color: "text-blue-600 bg-blue-50" },
    { id: "goldquest", name: "Gold Quest", icon: Crown, desc: "Temukan kata emas tersembunyi", players: 856, color: "text-amber-600 bg-amber-50" },
    { id: "selfplay", name: "Latihan Sendiri", icon: Gamepad2, desc: "Belajar tanpa waktu ketat", players: null, color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Kuis Game</h1>
        <p className="mt-1 text-sm text-gray-600">Main bareng atau latihan sendiri</p>
      </div>

      <div className="max-w-lg mx-auto">
        <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <h2 className="font-semibold mb-4 text-center">Masuk Room</h2>
          <div className="flex gap-3">
            <input
              value={joinedCode}
              onChange={(e) => setJoinedCode(e.target.value.toUpperCase())}
              placeholder="KODE ROOM"
              className="flex-1 text-center text-2xl font-bold tracking-widest rounded-xl border-2 border-blue-200 px-4 py-3 focus:outline-none focus:border-blue-500"
              maxLength={6}
            />
            <Button onClick={joinRoom} className="px-6">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-center text-gray-500 mt-3">Minta kode dari gurumu untuk join room</p>
        </Card>

        <div className="space-y-4">
          {modes.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              <button
                onClick={() => setMode(m.id)}
                className="w-full p-5 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${m.color}`}>
                  <m.icon className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{m.name}</h3>
                    {m.id !== "selfplay" && <Badge variant="secondary" className="text-[10px]">POPULER</Badge>}
                  </div>
                  <p className="text-sm text-gray-500">{m.desc}</p>
                </div>
                {m.players && (
                  <div className="text-right">
                    <p className="text-sm font-bold">{m.players.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500">player aktif</p>
                  </div>
                )}
                <Play className="h-5 w-5 text-gray-400" />
              </button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}