"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Users, Plus, Play, QrCode, Copy, CheckCircle2 } from "lucide-react";
import { useGameStore } from "@/store";

export default function KuisGamePage() {
  const gameStore = useGameStore();
  const [roomCode, setRoomCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const generateRoomCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    gameStore.setRoom({ roomId: code, isGameActive: false, players: [] });
    setShowCreate(true);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`https://bahasacerdas.site/murid/kuis-game?room=${roomCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modes = [
    { id: "classic", name: "Classic", desc: "Pilihan ganda bergiliran", color: "bg-blue-100 text-blue-700" },
    { id: "goldquest", name: "Gold Quest", desc: "Cari kata emas tersembunyi", color: "bg-amber-100 text-amber-700" },
    { id: "agenkata", name: "Agen Kata", desc: "Tebak kata dari petunjuk", color: "bg-purple-100 text-purple-700" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Kuis Game</h1>
        <p className="mt-1 text-sm text-gray-600">Host kuis multiplayer real-time dengan siswa</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Buat Room Baru</h2>
          <div className="space-y-3">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  gameStore.setRoom({ mode: mode.id });
                  generateRoomCode();
                }}
                className="w-full flex items-center gap-4 rounded-xl border p-4 hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${mode.color}`}>
                  <Gamepad2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold">{mode.name}</p>
                  <p className="text-xs text-gray-500">{mode.desc}</p>
                </div>
                <Play className="ml-auto h-5 w-5 text-gray-400" />
              </button>
            ))}
          </div>
        </Card>

        {showCreate && roomCode && (
          <Card className="p-6">
            <h2 className="font-semibold mb-4">Room Aktif</h2>
            <div className="text-center">
              <div className="mb-4">
                <Badge variant="success" className="text-lg px-4 py-1">{roomCode}</Badge>
              </div>
              <p className="text-sm text-gray-500 mb-4">Bagikan kode ini ke siswa untuk bergabung</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={copyLink} variant="outline">
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Tersalin!" : "Salin Link"}
                </Button>
                <Button variant="outline"><QrCode className="h-4 w-4" /> QR Code</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Play className="h-4 w-4" /> Mulai Game
                </Button>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">Player Joined (0)</p>
              <p className="text-xs text-gray-400">Menunggu siswa bergabung...</p>
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Riwayat Game</h2>
          <div className="space-y-3">
            {[
              { date: "Hari ini, 10:30", mode: "Classic", players: 12, avgScore: 85 },
              { date: "Kemarin, 14:00", mode: "Gold Quest", players: 8, avgScore: 72 },
            ].map((game, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{game.mode}</p>
                  <p className="text-xs text-gray-500">{game.date} • {game.players} pemain</p>
                </div>
                <Badge variant="secondary">Avg: {game.avgScore}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}