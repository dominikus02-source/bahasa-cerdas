"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Star, TrendingUp, Target, Flame, Award } from "lucide-react";

export default function ProgresPage() {
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");

  const weeklyData = [
    { day: "Sen", xp: 120 },
    { day: "Sel", xp: 85 },
    { day: "Rab", xp: 200 },
    { day: "Kam", xp: 150 },
    { day: "Jum", xp: 90 },
    { day: "Sab", xp: 300 },
    { day: "Today", xp: 45 },
  ];
  const maxXP = Math.max(...weeklyData.map(d => d.xp));

  const achievements = [
    { title: "First Quiz", desc: "Selesaikan 1 kuis", icon: "🎯", unlocked: true },
    { title: "Streak 7", desc: "Aktif 7 hari berturut-turut", icon: "🔥", unlocked: true },
    { title: "100 XP", desc: "Kumpulkan 100 XP", icon: "⭐", unlocked: true },
    { title: "First Gold", desc: "Masuk league Gold", icon: "🏆", unlocked: true },
    { title: "Speed Demon", desc: "Jawab 10 soal <5 detik", icon: "⚡", unlocked: false },
    { title: "Perfect Score", desc: "100% benar di 1 kuis", icon: "💯", unlocked: false },
  ];

  const stats = [
    { label: "Total XP", value: "8,450", icon: Star, color: "text-yellow-600 bg-yellow-50" },
    { label: "Soal Dijawab", value: "342", icon: Target, color: "text-blue-600 bg-blue-50" },
    { label: "Akurasi", value: "87%", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
    { label: "Streak", value: "14 hari", icon: Flame, color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Progresku</h1>
        <p className="mt-1 text-sm text-gray-600">Pantau perjalanan belajarmu</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">XP Mingguan</h2>
            <div className="flex gap-1">
              {(["week", "month", "all"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium ${period === p ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  {p === "week" ? "Minggu" : p === "month" ? "Bulan" : "Semua"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-2 h-32">
            {weeklyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-blue-500 rounded-t-sm transition-all" style={{ height: `${(d.xp / maxXP) * 100}%`, minHeight: d.xp > 0 ? "4px" : "0" }} />
                <span className="text-xs text-gray-500">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Achievement</h2>
          <div className="grid grid-cols-3 gap-3">
            {achievements.map((a, i) => (
              <div
                key={i}
                className={`flex flex-col items-center rounded-xl p-3 text-center ${a.unlocked ? "bg-yellow-50" : "bg-gray-50 opacity-50"}`}
              >
                <span className="text-2xl mb-1">{a.icon}</span>
                <p className="text-xs font-medium">{a.title}</p>
                <p className="text-[10px] text-gray-500">{a.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 md:col-span-2">
          <h2 className="font-semibold mb-4">Koleksi Kata</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { kata: "Metafora", rarity: "RARE", color: "from-blue-400 to-blue-600" },
              { kata: "Paradoks", rarity: "EPIC", color: "from-purple-400 to-purple-600" },
              { kata: "Hipérbola", rarity: "COMMON", color: "from-gray-400 to-gray-600" },
              { kata: "Antonim", rarity: "LEGENDARY", color: "from-yellow-400 to-orange-500" },
              { kata: "Sinonim", rarity: "COMMON", color: "from-gray-400 to-gray-600" },
              { kata: "Pleonasme", rarity: "RARE", color: "from-blue-400 to-blue-600" },
              { kata: "Kalimat", rarity: "COMMON", color: "from-gray-400 to-gray-600" },
              { kata: "+ Tambah", rarity: "", color: "from-gray-200 to-gray-300" },
            ].map((item, i) => (
              <div key={i} className={`flex flex-col items-center rounded-xl p-3 bg-gradient-to-br ${item.color} text-white`}>
                <p className="font-bold text-sm">{item.kata}</p>
                {item.rarity && <p className="text-[10px] opacity-80">{item.rarity}</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}