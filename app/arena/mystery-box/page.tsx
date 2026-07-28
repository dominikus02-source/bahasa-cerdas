"use client"

import { useState, useEffect } from "react"
import { Gift, Sparkles, Zap, Star, CheckCircle2, Loader2 } from "lucide-react"
import { BOX_REWARDS, type BoxReward } from "@/lib/mystery-box"

type Status = {
  claimedToday: boolean
  claimCount: number
  cycleDay: number
  reward: BoxReward
}

export default function MysteryBoxPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<"idle" | "shaking" | "opening" | "revealed">("idle")
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/siswa/mystery-box")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: Status) => {
        setStatus(d)
        if (d.claimedToday) setPhase("revealed")
      })
      .catch(() => setError("Gagal memuat kotak harian."))
      .finally(() => setLoading(false))
  }, [])

  const sudahDiklaim = status?.claimedToday ?? false

  const handleBuka = async () => {
    // Status klaim dipegang server; tombol ini hanya boleh jalan sekali sehari.
    if (phase !== "idle" || claiming || sudahDiklaim) return

    setClaiming(true)
    setError("")
    setPhase("shaking")
    setTimeout(() => setPhase("opening"), 600)

    try {
      const res = await fetch("/api/siswa/mystery-box/claim", { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        // 409 = sudah dibuka hari ini (mis. dari perangkat lain).
        if (res.status === 409) {
          setStatus(s => s ? { ...s, claimedToday: true } : s)
          setPhase("revealed")
        } else {
          setPhase("idle")
          setError(data.error || "Gagal membuka kotak.")
        }
        return
      }

      // Tunggu animasinya selesai dulu baru tampilkan hadiah.
      setTimeout(() => {
        setStatus(s => s ? {
          ...s,
          claimedToday: true,
          claimCount: s.claimCount + 1,
          cycleDay: data.cycleDay,
          reward: data.reward,
        } : s)
        setPhase("revealed")
      }, 1200)
    } catch {
      setPhase("idle")
      setError("Gagal membuka kotak. Coba lagi.")
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
      </div>
    )
  }

  const reward = status?.reward
  const RewardIcon = reward?.jenis === "KOIN" ? Star : Zap

  return (
    <div className="px-4 py-5 arena-page">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Kotak Harian</h1>
        <p className="text-base text-gray-500 mt-1">Buka setiap hari — makin rajin, makin besar hadiahnya!</p>
      </div>

      {/* Kotak utama */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative" onClick={handleBuka}>
          {phase === "revealed" && !sudahDiklaim && (
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 opacity-30 animate-ping" />
          )}

          <div
            className={`w-36 h-36 rounded-3xl bg-gradient-to-br flex items-center justify-center transition-all duration-300 shadow-xl relative z-10 ${
              sudahDiklaim && phase === "revealed"
                ? "from-gray-300 to-gray-400 cursor-default shadow-gray-200"
                : "from-violet-500 to-purple-600 cursor-pointer"
            } ${
              phase === "idle"
                ? "hover:scale-105 active:scale-95 shadow-violet-200"
                : phase === "shaking"
                  ? "animate-[wiggle_0.5s_ease-in-out] shadow-violet-300"
                  : phase === "opening"
                    ? "scale-110 animate-pulse shadow-violet-400"
                    : "scale-100"
            }`}
          >
            {phase === "idle" && <Gift className="w-16 h-16 text-white" />}
            {(phase === "shaking" || phase === "opening") && <Sparkles className="w-16 h-16 text-white" />}
            {phase === "revealed" && reward && (
              <div className="text-center">
                <RewardIcon className="w-10 h-10 text-yellow-300 mx-auto mb-1" />
                <p className="text-white font-bold text-xs">{reward.label}</p>
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
        <p className="text-sm text-gray-400">
          {sudahDiklaim ? "Kembali lagi besok untuk kotak berikutnya" : "Buka setiap hari untuk hadiah spesial"}
        </p>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
      </div>

      {phase === "revealed" && reward && (
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-amber-200">
            <RewardIcon className="w-5 h-5" />
            <span className="font-bold">{reward.label}</span>
          </div>
        </div>
      )}

      {/* Siklus 7 hari */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Siklus 7 Hari</h2>
      <div className="flex gap-2 mb-6">
        {BOX_REWARDS.map((box) => {
          const Icon = box.jenis === "KOIN" ? Star : Zap
          const hariIni = status?.cycleDay === box.hari
          const sudahLewat = (status?.cycleDay ?? 1) > box.hari
          const selesai = sudahLewat || (hariIni && sudahDiklaim)

          return (
            <div
              key={box.hari}
              className={`flex-1 flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                selesai
                  ? "bg-gray-100 border-gray-200 opacity-50"
                  : hariIni
                    ? "bg-violet-50 border-violet-300 ring-2 ring-violet-200"
                    : "bg-gray-50 border-gray-100"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white ${
                selesai ? "from-gray-300 to-gray-400" : box.jenis === "KOIN" ? "from-yellow-400 to-amber-500" : "from-violet-400 to-purple-500"
              }`}>
                {selesai ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-medium ${selesai ? "text-gray-400 line-through" : "text-gray-600"}`}>
                Hr {box.hari}
              </span>
            </div>
          )
        })}
      </div>

      {/* Daftar hadiah */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5">
        <h3 className="font-bold text-amber-800 text-base mb-3 flex items-center gap-1.5">
          <Sparkles className="w-5 h-5" />
          Hadiah Siklus 7 Hari
        </h3>
        <div className="space-y-3">
          {BOX_REWARDS.map((r) => {
            const Icon = r.jenis === "KOIN" ? Star : Zap
            return (
              <div key={r.hari} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${r.jenis === "KOIN" ? "text-yellow-500" : "text-violet-500"}`} />
                  <span className="text-sm font-medium text-gray-700">Hari {r.hari}</span>
                </div>
                <span className="text-xs font-bold text-gray-500">{r.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
