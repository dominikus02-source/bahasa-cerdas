"use client"

import { useState, useEffect } from "react"
import { Gift, Sparkles, Zap, Star, Heart, CheckCircle2, Trophy, Diamond, Gem, Flame } from "lucide-react"

const STORAGE_KEY = "bc-kotak-harian"
const boxList = [
  { hari: 1, label: "Hr 1", hadiah: "+50 XP", icon: Zap, warna: "from-amber-400 to-orange-500" },
  { hari: 2, label: "Hr 2", hadiah: "+5 Koin", icon: Star, warna: "from-blue-400 to-cyan-500" },
  { hari: 3, label: "Hr 3", hadiah: "Streak Freeze", icon: Heart, warna: "from-rose-400 to-pink-500" },
  { hari: 4, label: "Hr 4", hadiah: "+100 XP", icon: Zap, warna: "from-amber-400 to-orange-500" },
  { hari: 5, label: "Hr 5", hadiah: "+10 Koin", icon: Star, warna: "from-violet-400 to-purple-500" },
  { hari: 6, label: "Hr 6", hadiah: "+150 XP", icon: Zap, warna: "from-amber-400 to-orange-500" },
  { hari: 7, label: "Hr 7", hadiah: "Mystery Box", icon: Gem, warna: "from-yellow-400 to-amber-500" },
]

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function MysteryBoxPage() {
  const [phase, setPhase] = useState<"idle" | "shaking" | "opening" | "revealed">("idle")
  const [claimedDays, setClaimedDays] = useState<number[]>([])
  const rewardIdx = claimedDays.length % 7
  const currentReward = boxList[rewardIdx]

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}-${getTodayKey()}`)
      if (raw) {
        const days: number[] = JSON.parse(raw)
        setClaimedDays(days)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      if (claimedDays.length > 0) {
        localStorage.setItem(`${STORAGE_KEY}-${getTodayKey()}`, JSON.stringify(claimedDays))
      }
    } catch { /* ignore */ }
  }, [claimedDays])

  const isClaimed = (hari: number) => claimedDays.includes(hari)
  const today = getTodayKey()

  const handleBuka = () => {
    if (phase !== "idle") return
    setPhase("shaking")
    setTimeout(() => setPhase("opening"), 600)
    setTimeout(() => {
      setPhase("revealed")
      const nextDay = (claimedDays.length % 7) + 1
      if (!isClaimed(nextDay)) {
        setClaimedDays(prev => [...prev, nextDay])
      }
    }, 1800)
  }

  return (
    <div className="px-4 py-5 arena-page">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Kotak Harian</h1>
        <p className="text-base text-gray-500 mt-1">Buka setiap hari — makin rajin, makin besar hadiahnya!</p>
      </div>

      {/* Kotak utama */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative" onClick={handleBuka}>
          {phase === "revealed" && (
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 opacity-30 animate-ping" />
          )}

          <div
            className={`w-36 h-36 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-xl relative z-10 ${
              phase === "idle"
                ? "hover:scale-105 active:scale-95 shadow-violet-200"
                : phase === "shaking"
                  ? "animate-[wiggle_0.5s_ease-in-out] shadow-violet-300"
                  : phase === "opening"
                    ? "scale-110 animate-pulse shadow-violet-400"
                    : "scale-100 shadow-emerald-300"
            }`}
          >
            {phase === "idle" && <Gift className="w-16 h-16 text-white" />}
            {(phase === "shaking" || phase === "opening") && <Sparkles className="w-16 h-16 text-white" />}
            {phase === "revealed" && (
              <div className="text-center">
                <currentReward.icon className="w-10 h-10 text-yellow-300 mx-auto mb-1" />
                <p className="text-white font-bold text-xs">{currentReward.hadiah}</p>
              </div>
            )}
          </div>
        </div>
        <p className="text-base font-bold text-gray-700 mt-4">
          {phase === "idle" && "Ketuk untuk membuka"}
          {phase === "shaking" && "Bersiaplah..."}
          {phase === "opening" && "Membuka..."}
          {phase === "revealed" && "Hadiah diklaim!"}
        </p>
        <p className="text-sm text-gray-400">Buka setiap hari untuk hadiah spesial</p>
      </div>

      {phase === "revealed" && (
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-amber-200">
            <currentReward.icon className="w-5 h-5" />
            <span className="font-bold">{currentReward.hadiah}</span>
          </div>
        </div>
      )}

      {/* 7 hari streak */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">7 Hari Berturut-turut</h2>
      <div className="flex gap-2 mb-6">
        {boxList.map((box) => {
          const Icon = box.icon
          const claimed = isClaimed(box.hari)
          return (
            <div key={box.hari} className={`flex-1 flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${claimed ? "bg-gray-100 border-gray-200 opacity-50" : claimedDays.length > 0 && claimedDays[claimedDays.length - 1] === box.hari - 1 ? "bg-violet-50 border-violet-200" : "bg-gray-50 border-gray-100"}`}>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${claimed ? "from-gray-300 to-gray-400" : box.warna} flex items-center justify-center text-white`}>
                {claimed ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-medium ${claimed ? "text-gray-400 line-through" : "text-gray-600"}`}>{box.label}</span>
            </div>
          )
        })}
      </div>

      {/* Hadiah box */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5">
        <h3 className="font-bold text-amber-800 text-base mb-3 flex items-center gap-1.5">
          <Sparkles className="w-5 h-5" />
          Isi Mystery Box
        </h3>
        <div className="space-y-3">
          {[
            { label: "200 XP", icon: Zap, warna: "text-amber-500", prob: "30%" },
            { label: "20 Koin", icon: Star, warna: "text-yellow-500", prob: "25%" },
            { label: "Streak Freeze", icon: Heart, warna: "text-rose-500", prob: "20%" },
            { label: "Skin Avatar", icon: Diamond, warna: "text-violet-500", prob: "15%" },
            { label: "500 XP", icon: Trophy, warna: "text-amber-500", prob: "10%" },
          ].map((r, i) => {
            const Icon = r.icon
            return (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${r.warna}`} />
                  <span className="text-sm font-medium text-gray-700">{r.label}</span>
                </div>
                <span className="text-xs text-gray-400 font-medium">{r.prob}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
