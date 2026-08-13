"use client"

import { useState, useEffect } from "react"
import { Gift, Sparkles, Zap, Star, Shield, CheckCircle2, Loader2 } from "lucide-react"
import { BOX_SLOTS, MYSTERY_POOL, type BoxReward, type BoxSlot, type RewardKind } from "@/lib/mystery-box"

type Status = {
  claimedToday: boolean
  claimCount: number
  cycleDay: number
  slot: BoxSlot
}

const ICON_FOR: Record<RewardKind, typeof Zap> = {
  XP: Zap,
  KOIN: Star,
  FREEZE: Shield,
}

const COLOR_FOR: Record<RewardKind, string> = {
  XP: "from-violet-400 to-purple-500",
  KOIN: "from-yellow-400 to-amber-500",
  FREEZE: "from-cyan-400 to-blue-500",
}

export default function MysteryBoxPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [hadiah, setHadiah] = useState<BoxReward | null>(null)
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
        setHadiah(data.reward)
        setStatus(s => s ? { ...s, claimedToday: true, claimCount: s.claimCount + 1, cycleDay: data.cycleDay } : s)
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
        <Loader2 className="w-7 h-7 animate-spin text-violet-500 dark:text-violet-400" />
      </div>
    )
  }

  const HadiahIcon = hadiah ? ICON_FOR[hadiah.jenis] : Gift
  const slotHariIni = status?.slot

  return (
    <div className="px-4 py-5 arena-page">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100">Kotak Harian</h1>
        <p className="text-base text-gray-500 dark:text-slate-400 mt-1">Buka setiap hari — makin rajin, makin besar hadiahnya!</p>
      </div>

      {/* Kotak utama */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative" onClick={handleBuka}>
          {phase === "revealed" && hadiah && (
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
            {phase === "revealed" && (
              hadiah ? (
                <div className="text-center px-2">
                  <HadiahIcon className="w-10 h-10 text-yellow-300 mx-auto mb-1" />
                  <p className="text-white font-bold text-xs leading-tight">{hadiah.label}</p>
                </div>
              ) : (
                <CheckCircle2 className="w-16 h-16 text-white" />
              )
            )}
          </div>
        </div>

        <p className="text-base font-bold text-gray-700 dark:text-slate-300 mt-4">
          {phase === "idle" && (slotHariIni?.misteri ? "Kotak Misterius menantimu!" : "Ketuk untuk membuka")}
          {phase === "shaking" && "Bersiaplah..."}
          {phase === "opening" && "Membuka..."}
          {phase === "revealed" && (hadiah ? "Hadiah diklaim!" : "Sudah dibuka hari ini")}
        </p>
        <p className="text-sm text-gray-400">
          {sudahDiklaim ? "Kembali lagi besok untuk kotak berikutnya" : "Buka setiap hari untuk hadiah spesial"}
        </p>

        {error && <p className="text-sm text-red-500 dark:text-red-400 mt-3">{error}</p>}
      </div>

      {phase === "revealed" && hadiah && (
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-amber-200">
            <HadiahIcon className="w-5 h-5" />
            <span className="font-bold">{hadiah.label}</span>
          </div>
          {hadiah.jenis === "FREEZE" && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">Rentetanmu aman satu hari kalau kamu absen.</p>
          )}
        </div>
      )}

      {/* Siklus 7 hari */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Siklus 7 Hari</h2>
      <div className="flex gap-2 mb-6">
        {BOX_SLOTS.map((box) => {
          const hariIni = status?.cycleDay === box.hari
          const sudahLewat = (status?.cycleDay ?? 1) > box.hari
          const selesai = sudahLewat || (hariIni && sudahDiklaim)
          const Icon = box.misteri ? Gift : ICON_FOR[box.reward!.jenis]

          return (
            <div
              key={box.hari}
              className={`flex-1 flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                selesai
                  ? "bg-gray-100 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 opacity-50"
                  : hariIni
                    ? "bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700 ring-2 ring-violet-200"
                    : "bg-gray-50 dark:bg-slate-800/60 border-gray-100 dark:border-slate-800"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white ${
                selesai
                  ? "from-gray-300 to-gray-400"
                  : box.misteri
                    ? "from-amber-400 to-orange-500"
                    : COLOR_FOR[box.reward!.jenis]
              }`}>
                {selesai ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-medium ${selesai ? "text-gray-400 line-through" : "text-gray-600 dark:text-slate-300"}`}>
                Hr {box.hari}
              </span>
            </div>
          )
        })}
      </div>

      {/* Isi Kotak Misterius (hari ke-7) */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 dark:border-amber-800 p-5 mb-4">
        <h3 className="font-bold text-amber-800 text-base mb-1 flex items-center gap-1.5">
          <Gift className="w-5 h-5" />
          Isi Kotak Misterius
        </h3>
        <p className="text-xs text-amber-700 dark:text-amber-300/70 mb-3">Diundi setiap hari ke-7</p>
        <div className="space-y-3">
          {MYSTERY_POOL.map((p, i) => {
            const Icon = ICON_FOR[p.reward.jenis]
            return (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${p.reward.jenis === "KOIN" ? "text-yellow-500 dark:text-yellow-400" : p.reward.jenis === "FREEZE" ? "text-cyan-500" : "text-violet-500 dark:text-violet-400"}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{p.reward.label}</span>
                </div>
                <span className="text-xs text-gray-400 font-medium">{p.bobot}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Hadiah harian */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-800 p-5">
        <h3 className="font-bold text-gray-800 dark:text-slate-200 text-base mb-3 flex items-center gap-1.5">
          <Sparkles className="w-5 h-5 text-violet-500 dark:text-violet-400" />
          Hadiah Harian
        </h3>
        <div className="space-y-3">
          {BOX_SLOTS.map((r) => {
            const Icon = r.misteri ? Gift : ICON_FOR[r.reward!.jenis]
            return (
              <div key={r.hari} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${r.misteri ? "text-amber-500 dark:text-amber-400" : r.reward!.jenis === "KOIN" ? "text-yellow-500 dark:text-yellow-400" : r.reward!.jenis === "FREEZE" ? "text-cyan-500" : "text-violet-500 dark:text-violet-400"}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Hari {r.hari}</span>
                </div>
                <span className="text-xs font-bold text-gray-500 dark:text-slate-400">{r.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
