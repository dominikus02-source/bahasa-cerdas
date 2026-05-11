"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Users, Star, TrendingUp, ChevronRight } from "lucide-react";

const mockSiswa = [
  { name: "Ahmad Rizki", avatar: "AR", xp: 2450, level: 6, streak: 14, league: "SILVER", accuracy: 87, lastActive: "Baru saja" },
  { name: "Siti Nurhaliza", avatar: "SN", xp: 8900, level: 18, streak: 30, league: "GOLD", accuracy: 94, lastActive: "Baru saja" },
  { name: "Budi Santoso", avatar: "BS", xp: 450, level: 2, streak: 3, league: "BRONZE", accuracy: 65, lastActive: "2 jam lalu" },
  { name: "Dewi Lestari", avatar: "DL", xp: 12000, level: 25, streak: 45, league: "DIAMOND", accuracy: 96, lastActive: "Kemarin" },
  { name: "Fajar Nugroho", avatar: "FN", xp: 1500, level: 4, streak: 8, league: "BRONZE", accuracy: 78, lastActive: "3 hari lalu" },
];

const leagueColors: Record<string, string> = {
  BRONZE: "from-amber-600 to-amber-800",
  SILVER: "from-gray-300 to-gray-500",
  GOLD: "from-yellow-400 to-amber-500",
  DIAMOND: "from-cyan-400 to-blue-500",
};

export default function DataSiswaPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"xp" | "accuracy" | "streak">("xp");

  const filtered = mockSiswa
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Siswa</h1>
          <p className="mt-1 text-sm text-gray-600">Pantau progres dan performa siswa</p>
        </div>
        <Button><Plus className="h-4 w-4" /> Tambah Siswa</Button>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama siswa..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="xp">Urutkan: XP</option>
            <option value="accuracy">Urutkan: Akurasi</option>
            <option value="streak">Urutkan: Streak</option>
          </select>
        </div>
      </Card>

      <div className="grid gap-4">
        {filtered.map((siswa, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${leagueColors[siswa.league]} flex items-center justify-center text-white font-bold`}>
                {siswa.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{siswa.name}</p>
                  <Badge variant={siswa.league === "DIAMOND" ? "gold" : siswa.league === "GOLD" ? "warning" : "secondary"} className="text-[10px]">
                    {siswa.league}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span>Level {siswa.level}</span>
                  <span>🔥 {siswa.streak} streak</span>
                  <span>Terakhir: {siswa.lastActive}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">{siswa.xp.toLocaleString()}</p>
                <p className="text-xs text-gray-500">XP Total</p>
              </div>
              <div className="text-right min-w-[80px]">
                <p className="text-lg font-bold">{siswa.accuracy}%</p>
                <p className="text-xs text-gray-500">Akurasi</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </div>
            <div className="mt-3 pl-16">
              <div className="flex items-center gap-2">
                <Progress value={siswa.accuracy} className="flex-1 h-2" />
                <span className="text-xs text-gray-500">{Math.round(siswa.xp / 500) % 10}/10 level</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}