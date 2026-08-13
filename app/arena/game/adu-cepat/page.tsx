"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import { gameSocket } from "@/lib/game/socket"
import GamePlay from "@/components/game/GamePlay"
import { ArrowLeft, Swords, Zap, Trophy, Search, Users, Sparkles, RefreshCw } from "lucide-react"
import { MULTIPLAYER_ENABLED } from "@/lib/features"
import ComingSoon from "@/components/game/ComingSoon"

type Phase = "idle" | "searching" | "found" | "countdown" | "playing" | "result"

export default function AduCepatPage() {
  if (!MULTIPLAYER_ENABLED) return <ComingSoon title="Adu Cepat — Segera Hadir" />

  const [phase, setPhase] = useState<Phase>("idle")
  const [countdown, setCountdown] = useState(3)
  const [roomCode, setRoomCode] = useState("")
  const [opponent, setOpponent] = useState<{ id: string; name: string; avatar?: string } | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [xpEarned, setXpEarned] = useState(0)
  const [xpBoosted, setXpBoosted] = useState(false)
  const [xpSaved, setXpSaved] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [queueMsg, setQueueMsg] = useState("Mencari lawan sepadan...")
  // Server gim berjalan di VPS terpisah. Kalau ia mati, tanpa keadaan ini layar
  // hanya menampilkan "mencari lawan" selamanya.
  const [serverMati, setServerMati] = useState(false)
  const resultRef = useRef<any[]>([])

  useEffect(() => {
    const stored = localStorage.getItem("bc-user")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUserData(parsed.state)
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (!userData?.supabaseId) return
    gameSocket.connect(userData.supabaseId, userData.fullName || "Pemain", userData.avatar || "")

    const unsubGagal = gameSocket.onGagalSambung(() => setServerMati(true))

    const unsubFound = gameSocket.onMatchFound((data) => {
      setRoomCode(data.roomCode)
      setOpponent(data.opponent)
      setIsHost(data.isHost)
      setPhase("found")
    })

    const unsubCount = gameSocket.onMatchCountdown((data) => {
      setCountdown(data.seconds)
      if (data.seconds > 0) {
        setPhase("countdown")
      } else {
        setPhase("playing")
      }
    })

    const unsubQueue = gameSocket.onQueueStatus((data) => {
      setQueueMsg(data.message)
    })

    const unsubTimeout = gameSocket.onQueueTimeout((data) => {
      setPhase("idle")
      setQueueMsg(data.message)
    })

    const unsubFinished = gameSocket.onGameFinished((data) => {
      resultRef.current = data.results
      const myResult = data.results.find((r: any) => r.playerId === userData.supabaseId)
      setXpEarned(myResult ? Math.floor(myResult.score / 10) : 0)
      setResults(data.results)
      setPhase("result")
    })

    return () => {
      unsubFound(); unsubCount(); unsubQueue(); unsubTimeout(); unsubFinished(); unsubGagal()
    }
  }, [userData])

  const handleSearch = useCallback(() => {
    if (!userData?.supabaseId) return
    setPhase("searching")
    setOpponent(null)
    setResults([])
    setXpEarned(0)
    gameSocket.joinQueue({
      userId: userData.supabaseId,
      userName: userData.fullName || "Pemain",
      avatarUrl: userData.avatar,
      gameType: "KUIS_BATTLE",
    })
  }, [userData])

  const handleCancel = useCallback(() => {
    if (userData?.supabaseId) {
      gameSocket.leaveQueue({ userId: userData.supabaseId })
    }
    setPhase("idle")
  }, [userData])

  const handleRematch = useCallback(() => {
    if (!userData?.supabaseId) return
    setPhase("searching")
    setOpponent(null)
    setResults([])
    setXpEarned(0)
    gameSocket.rematch({
      userId: userData.supabaseId,
      userName: userData.fullName || "Pemain",
      avatarUrl: userData.avatar,
      gameType: "KUIS_BATTLE",
    })
  }, [userData])

  const myResult = results.find((r: any) => r.playerId === userData?.supabaseId)

  useEffect(() => {
    if (phase !== "result" || xpSaved || xpEarned <= 0) return
    setXpSaved(true)
    fetch("/api/game/xp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: myResult?.score || 0,
        correct: myResult?.correct || 0,
        wrong: myResult?.wrong || 0,
        xpEarned,
        gameType: "KUIS_BATTLE",
        roomCode,
        supabaseId: userData?.supabaseId,
      }),
    }).then(r => r.json()).then(d => {
      if (d.boosted) setXpBoosted(true);
    }).catch(() => {})
  }, [phase, xpSaved, xpEarned, myResult, roomCode])

  const handleGameFinish = useCallback(() => {
    // handled by socket event above
  }, [])
  const opponentResult = results.find((r: any) => r.playerId !== userData?.supabaseId)
  const winner = results.length > 0 ? results.sort((a: any, b: any) => a.rank - b.rank)[0] : null
  const didWin = winner?.playerId === userData?.supabaseId

  const handleBack = useCallback(() => {
    gameSocket.disconnect()
    window.location.href = "/arena/game"
  }, [])

  // Layar berhenti, bukan pesan kecil di pojok: tanpa server gim tidak ada satu
  // pun yang bisa dilakukan di halaman ini, dan membiarkan animasi "mencari
  // lawan" berputar di belakangnya hanya membuat murid menunggu sia-sia.
  if (serverMati) {
    return (
      <div className="game-fullscreen min-h-screen bg-gradient-to-b from-slate-900 via-violet-950 to-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="text-5xl mb-4">🔌</div>
          <h1 className="text-xl font-extrabold mb-2">Server gim sedang tidak aktif</h1>
          <p className="text-sm text-white/70 leading-relaxed">
            Adu Cepat butuh sambungan ke server pertandingan, dan sekarang server itu tidak bisa
            dihubungi. Gim lain di Arena tetap bisa dimainkan seperti biasa.
          </p>
          <button
            onClick={handleBack}
 className="mt-6 px-6 py-3 rounded-xl bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 font-bold active:scale-95 transition-transform"
          >
            Kembali ke daftar gim
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="game-fullscreen min-h-screen bg-gradient-to-b from-slate-900 via-violet-950 to-slate-900 text-white">
      <button
        onClick={handleBack}
 className="fixed top-3 left-3 z-[70] w-9 h-9 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-gray-200 dark:border-slate-700 shadow-md flex items-center justify-center text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800/90 active:scale-95 transition-all arena-btn"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {phase === "playing" && roomCode ? (
        <div className="fixed inset-0 z-[60]">
          <GamePlay roomCode={roomCode} onFinish={() => handleGameFinish()} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen px-6 pb-16">
          {phase === "idle" && (
            <div className="text-center max-w-sm animate-fade-in">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-500/30">
                <Swords className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold mb-2">Adu Cepat</h1>
              <p className="text-sm text-violet-200/70 mb-8 leading-relaxed">
                Tantang pemain lain secara langsung! Jawab soal Bahasa Indonesia secepat dan secerdas mungkin.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleSearch}
                  disabled={!userData?.supabaseId}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-lg shadow-lg shadow-violet-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40"
                >
                  <Swords className="w-5 h-5 inline mr-2" />
                  Cari Lawan
                </button>
                <Link
                  href="/arena/game/kuis-tempur"
 className="block w-full py-3.5 rounded-2xl bg-white/10 dark:bg-slate-900/10 border border-white/20 text-white/80 font-semibold text-sm text-center hover:bg-white/20 transition-all"
                >
                  Buat Ruangan Manual
                </Link>
              </div>
              <div className="mt-6 flex items-center gap-4 text-xs text-violet-300/50">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> 10 Soal</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 1v1</span>
                <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> Dapat XP</span>
              </div>
            </div>
          )}

          {phase === "searching" && (
            <div className="text-center animate-fade-in">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Search className="w-8 h-8 text-violet-400" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-2">Mencari Lawan</h2>
              <p className="text-sm text-violet-200/70 mb-2">{queueMsg}</p>
              <div className="flex justify-center gap-1.5 mb-8">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <button
                onClick={handleCancel}
 className="px-6 py-2.5 rounded-xl bg-white/10 dark:bg-slate-900/10 border border-white/20 text-white/70 text-sm font-medium hover:bg-white/20 transition-all"
              >
                Batalkan
              </button>
            </div>
          )}

          {(phase === "found" || phase === "countdown") && opponent && (
            <div className="text-center animate-fade-in w-full max-w-sm">
              <p className="text-xs text-violet-300/50 uppercase tracking-widest mb-4">Lawan Ditemukan!</p>

              <div className="flex items-center justify-center gap-6 mb-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-bold mx-auto mb-2 shadow-lg">
                    {userData?.fullName?.charAt(0) || "A"}
                  </div>
                  <p className="text-xs font-medium truncate max-w-[100px]">{userData?.fullName?.split(" ")[0] || "Kamu"}</p>
                </div>
                <div className="flex flex-col items-center">
                  <Swords className="w-6 h-6 text-violet-400 mb-1" />
                  <span className="text-[10px] text-violet-300/50">VS</span>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl font-bold mx-auto mb-2 shadow-lg">
                    {opponent.name?.charAt(0) || "?"}
                  </div>
                  <p className="text-xs font-medium truncate max-w-[100px]">{opponent.name?.split(" ")[0] || "Lawan"}</p>
                </div>
              </div>

              {phase === "found" && (
                <div className="animate-pulse">
                  <p className="text-sm text-violet-200">Bersiap...</p>
                </div>
              )}

              {phase === "countdown" && (
                <div className="mt-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto shadow-2xl shadow-violet-500/50 animate-pulse">
                    <span className="text-5xl font-black">{countdown}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {phase === "result" && (
            <div className="text-center animate-fade-in w-full max-w-sm">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl ${
                didWin
                  ? "bg-gradient-to-br from-amber-400 to-yellow-500"
                  : "bg-gradient-to-br from-slate-500 to-slate-600"
              }`}>
                {didWin ? (
                  <Trophy className="w-10 h-10 text-white" />
                ) : (
                  <span className="text-4xl">{">_<"}</span>
                )}
              </div>

              <h2 className={`text-2xl font-extrabold mb-1 ${didWin ? "text-yellow-400" : "text-white"}`}>
                {didWin ? "Kamu Menang!" : "Kamu Kalah"}
              </h2>
              <p className="text-sm text-violet-200/60 mb-6">
                {didWin ? "Selamat! Kamu berhasil mengalahkan lawanmu!" : "Jangan menyerah, coba lagi!"}
              </p>

              <div className="bg-white/10 dark:bg-slate-900/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/30 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-violet-300" />
                    </div>
                    <div>
                      <p className="text-xs text-violet-200/60">Skor Kamu</p>
                      <p className="text-lg font-bold">{myResult?.score || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${didWin ? "bg-yellow-500/30" : "bg-slate-500/30"} flex items-center justify-center`}>
                      <Users className="w-4 h-4 text-violet-300" />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-violet-200/60">{opponent?.name?.split(" ")[0] || "Lawan"}</p>
                      <p className="text-lg font-bold">{opponentResult?.score || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-violet-200/60 pt-3 border-t border-white/10">
                  <span>Benar: {myResult?.correct || 0}</span>
                  <span>Salah: {myResult?.wrong || 0}</span>
                  <span>Streak: {myResult?.maxStreak || 0}</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-amber-200/70">XP Didapatkan</p>
                     <div className="flex items-center gap-2">
                       <p className="text-xl font-extrabold text-yellow-400">+{xpEarned} XP</p>
                       {xpBoosted && (
                         <span className="text-[10px] font-bold bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30">
                           2x
                         </span>
                       )}
                     </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRematch}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <RefreshCw className="w-4 h-4 inline mr-1.5" />
                  Main Lagi
                </button>
                <button
                  onClick={handleBack}
 className="flex-1 py-3.5 rounded-2xl bg-white/10 dark:bg-slate-900/10 border border-white/20 text-white/80 font-semibold text-sm text-center hover:bg-white/20 transition-all"
                >
                  Ke Menu Gim
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
