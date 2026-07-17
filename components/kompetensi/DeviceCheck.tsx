"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Mic, Headphones, CheckCircle2, Volume2, Sparkles, ChevronRight } from "lucide-react"

interface Props {
  paketId: string
  onComplete: (micOk: boolean, speakerOk: boolean) => void
}

type Step = "mic" | "speaker" | "ready"

export default function DeviceCheck({ paketId, onComplete }: Props) {
  const [step, setStep] = useState<Step>("mic")
  const [micPassed, setMicPassed] = useState(false)
  const [speakerPassed, setSpeakerPassed] = useState(false)
  const [micChecking, setMicChecking] = useState(false)
  const [speakerChecking, setSpeakerChecking] = useState(false)
  const [micError, setMicError] = useState("")
  const [speakerError, setSpeakerError] = useState("")
  const [micLevel, setMicLevel] = useState(0)
  const [micActive, setMicActive] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [starting, setStarting] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number>(0)
  const oscillatorRef = useRef<OscillatorNode | null>(null)

  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    setMicLevel(0)
  }, [])

  // Waveform canvas rendering
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    ctx.scale(2, 2)

    const w = rect.width
    const h = rect.height
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteTimeDomainData(dataArray)

    ctx.clearRect(0, 0, w, h)

    // Background
    ctx.fillStyle = "rgba(255,255,255,0.5)"
    ctx.beginPath()
    ctx.roundRect(0, 0, w, h, 12)
    ctx.fill()

    // Gradient line
    const grad = ctx.createLinearGradient(0, 0, w, 0)
    grad.addColorStop(0, "#6366f1")
    grad.addColorStop(0.5, "#8b5cf6")
    grad.addColorStop(1, "#a855f7")

    ctx.lineWidth = 2
    ctx.strokeStyle = grad
    ctx.shadowColor = "rgba(99, 102, 241, 0.2)"
    ctx.shadowBlur = 6
    ctx.beginPath()

    const sliceWidth = w / bufferLength
    let x = 0
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0
      const y = (v * h) / 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
      x += sliceWidth
    }
    ctx.stroke()

    // Filled area
    ctx.shadowBlur = 0
    ctx.globalAlpha = 0.06
    ctx.fillStyle = "#8b5cf6"
    ctx.lineTo(w, h / 2)
    ctx.lineTo(0, h / 2)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1

    // Update level
    const avg = dataArray.reduce((s, v) => s + Math.abs(v - 128), 0) / bufferLength
    const level = Math.min(100, Math.round((avg / 128) * 200))
    setMicLevel(level)
    if (level > 8) setMicActive(true)

    animFrameRef.current = requestAnimationFrame(drawWaveform)
  }, [])

  const checkMicrophone = async () => {
    setMicChecking(true)
    setMicError("")
    setMicActive(false)
    setMicLevel(0)

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("Browser tidak mendukung akses mikrofon. Gunakan Chrome, Firefox, atau Safari terbaru.")
      setMicChecking(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const ctx = new AudioContext()
      audioContextRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyserRef.current = analyser

      drawWaveform()
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicError("Izin mikrofon ditolak. Izinkan akses mikrofon di pengaturan browser, lalu coba lagi.")
      } else if (err.name === "NotFoundError") {
        setMicError("Tidak ada mikrofon yang terdeteksi. Sambungkan mikrofon atau headset.")
      } else if (err.name === "NotReadableError") {
        setMicError("Mikrofon sedang digunakan aplikasi lain. Tutup dan coba lagi.")
      } else {
        setMicError("Mikrofon tidak terdeteksi. Periksa sambungan perangkat.")
      }
      setMicChecking(false)
    }
  }

  const confirmMic = () => {
    setMicPassed(true)
    setMicChecking(false)
  }

  const retryMicrophone = () => {
    cleanupAudio()
    setMicPassed(false)
    setMicError("")
    setMicLevel(0)
    setMicActive(false)
    setMicChecking(false)
  }

  const checkSpeaker = async () => {
    setSpeakerChecking(true)
    setSpeakerError("")

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      audioContextRef.current = ctx

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      gain.gain.value = 0.3
      osc.type = "sine"
      osc.frequency.value = 440
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      oscillatorRef.current = osc
      setPlaying(true)
    } catch {
      setSpeakerError("Tidak dapat memutar audio. Periksa speaker/headset.")
      setSpeakerChecking(false)
    }
  }

  const confirmHeard = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop()
      oscillatorRef.current = null
    }
    setPlaying(false)
    setSpeakerPassed(true)
    setSpeakerChecking(false)
  }

  const retrySpeaker = () => {
    if (oscillatorRef.current) {
      oscillatorRef.current.stop()
      oscillatorRef.current = null
    }
    setPlaying(false)
    setSpeakerPassed(false)
    setSpeakerError("")
  }

  const handleStart = () => {
    setStarting(true)
    cleanupAudio()
    onComplete(micPassed, speakerPassed)
  }

  const handleSkip = () => {
    cleanupAudio()
    onComplete(false, false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupAudio()
  }, [cleanupAudio])

  return (
    <div className="min-h-dvh bg-[#f5f5f7] flex flex-col">
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-5 py-3 bg-white/80 backdrop-blur-xl border-b border-[#e5e5ea]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-[#1d1d1f]">Penyiapan Perangkat</span>
        </div>
        <button onClick={handleSkip} className="text-[13px] text-[#8e8e93] hover:text-[#1d1d1f] transition-colors">
          Lewati
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 px-5 pt-6 pb-4">
        {(["mic", "speaker", "ready"] as const).map((s, i) => {
          const isDone = (s === "mic" && micPassed) || (s === "speaker" && speakerPassed)
          const isCurrent = step === s
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 ${isDone || isCurrent ? "opacity-100" : "opacity-40"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all ${
                  isDone || (s === "ready" && micPassed && speakerPassed)
                    ? "bg-indigo-600 text-white"
                    : "bg-[#e5e5ea] text-[#8e8e93]"
                }`}>
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className="text-[11px] font-medium text-[#1d1d1f]">
                  {s === "mic" ? "Mikrofon" : s === "speaker" ? "Audio" : "Siap"}
                </span>
              </div>
              {i < 2 && <ChevronRight className="w-3 h-3 text-[#c7c7cc]" />}
            </div>
          )
        })}
      </div>

      <div className="flex-1 flex flex-col px-5 pb-8">
        {/* STEP 1: MICROPHONE */}
        {step === "mic" && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center -mt-8">
              {/* Mic Icon */}
              <div className="relative mb-6">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                  micPassed
                    ? "bg-green-100"
                    : micChecking
                    ? "bg-indigo-50"
                    : "bg-[#e8e8ed]"
                }`}>
                  <Mic className={`w-10 h-10 transition-colors ${
                    micPassed ? "text-green-600" : micChecking ? "text-indigo-500" : "text-[#8e8e93]"
                  }`} />
                </div>
                {micChecking && !micPassed && (
                  <span className="absolute -top-1 -right-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full w-5 h-5 bg-indigo-500" />
                  </span>
                )}
              </div>

              <h2 className="text-[22px] font-bold text-[#1d1d1f] text-center mb-1">
                {micPassed ? "Mikrofon Berfungsi" : micChecking ? "Mikrofon Aktif" : "Periksa Mikrofon"}
              </h2>
              <p className="text-[13px] text-[#8e8e93] text-center mb-6 max-w-xs">
                {micPassed
                  ? "Mikrofon terdeteksi dan berfungsi dengan baik."
                  : micChecking
                  ? "Bicaralah — gelombang suara akan muncul jika mikrofon berfungsi."
                  : "Klik tombol di bawah untuk mengizinkan akses mikrofon."}
              </p>

              {/* Waveform Canvas */}
              {micChecking && !micPassed && (
                <div className="w-full max-w-sm mb-4">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-20 rounded-xl"
                  />
                </div>
              )}

              {/* Level Meter */}
              {micChecking && !micPassed && (
                <div className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-sm border border-[#f0f0f0]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-[#8e8e93]">Level Suara</span>
                    <span className="text-[11px] font-mono text-[#8e8e93]">{micLevel}%</span>
                  </div>
                  <div className="h-2.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{
                        width: `${Math.min(100, micLevel)}%`,
                        background: micLevel > 70
                          ? "linear-gradient(90deg, #6366f1, #22c55e)"
                          : micLevel > 30
                          ? "linear-gradient(90deg, #6366f1, #8b5cf6)"
                          : "linear-gradient(90deg, #a1a1aa, #6366f1)",
                      }}
                    />
                  </div>
                  {micActive && (
                    <p className="text-[11px] text-green-600 font-medium mt-2 text-center">
                      Suara terdeteksi! Klik konfirmasi di bawah.
                    </p>
                  )}
                </div>
              )}

              {/* Error */}
              {micError && (
                <div className="w-full max-w-sm mt-4 bg-red-50 rounded-2xl p-4 border border-red-100">
                  <p className="text-[13px] text-red-600 text-center">{micError}</p>
                  <button
                    onClick={retryMicrophone}
                    className="mt-3 w-full py-2.5 bg-red-600 text-white text-[13px] font-semibold rounded-xl hover:bg-red-700 transition-colors"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Button */}
            <div className="pt-4">
              {!micChecking && !micPassed && !micError && (
                <button
                  onClick={checkMicrophone}
                  className="w-full py-3.5 bg-indigo-600 text-white text-[15px] font-semibold rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20"
                >
                  Izinkan & Uji Mikrofon
                </button>
              )}
              {micChecking && !micPassed && (
                <button
                  onClick={confirmMic}
                  disabled={!micActive}
                  className="w-full py-3.5 bg-indigo-600 text-white text-[15px] font-semibold rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {micActive ? "Mikrofon Berfungsi" : "Tunggu deteksi suara..."}
                </button>
              )}
              {micPassed && (
                <button
                  onClick={() => { cleanupAudio(); setStep("speaker") }}
                  className="w-full py-3.5 bg-indigo-600 text-white text-[15px] font-semibold rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20"
                >
                  Lanjutkan
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: SPEAKER */}
        {step === "speaker" && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center -mt-8">
              {/* Speaker Icon */}
              <div className="relative mb-6">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  speakerPassed ? "bg-green-100" : playing ? "bg-indigo-50" : "bg-[#e8e8ed]"
                }`}>
                  <Headphones className={`w-10 h-10 ${
                    speakerPassed ? "text-green-600" : playing ? "text-indigo-500" : "text-[#8e8e93]"
                  }`} />
                </div>
                {playing && (
                  <>
                    <span className="absolute -inset-4 rounded-full border-2 border-indigo-200 animate-ping" />
                    <span className="absolute -inset-8 rounded-full border-2 border-indigo-100 animate-ping" style={{ animationDelay: "0.3s" }} />
                  </>
                )}
              </div>

              <h2 className="text-[22px] font-bold text-[#1d1d1f] text-center mb-1">
                {speakerPassed ? "Audio Berfungsi" : playing ? "Memutar Nada Uji..." : "Periksa Speaker"}
              </h2>
              <p className="text-[13px] text-[#8e8e93] text-center mb-6 max-w-xs">
                {speakerPassed
                  ? "Speaker/headset berfungsi dengan baik."
                  : playing
                  ? "Apakah Anda mendengar nada uji?"
                  : "Pastikan speaker atau headset terhubung."}
              </p>

              {/* Sound Wave Visual */}
              {playing && !speakerPassed && (
                <div className="flex items-center justify-center gap-1 h-12 mb-2">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-[3px] bg-indigo-500 rounded-full"
                      style={{
                        height: `${20 + Math.abs(Math.sin((Date.now() / 200) + i * 0.5)) * 30}px`,
                        opacity: 0.3 + (i / 20) * 0.7,
                        transition: "height 0.1s",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              {playing && !speakerPassed && (
                <div className="flex gap-3 w-full max-w-sm">
                  <button
                    onClick={confirmHeard}
                    className="flex-1 py-3.5 bg-green-600 text-white text-[15px] font-semibold rounded-2xl hover:bg-green-700 active:scale-[0.98] transition-all shadow-lg shadow-green-500/20"
                  >
                    Saya Dengar
                  </button>
                  <button
                    onClick={retrySpeaker}
                    className="flex-1 py-3.5 bg-[#e8e8ed] text-[#1d1d1f] text-[15px] font-semibold rounded-2xl hover:bg-[#d8d8dd] active:scale-[0.98] transition-all"
                  >
                    Tidak
                  </button>
                </div>
              )}

              {/* Error */}
              {speakerError && (
                <div className="w-full max-w-sm bg-red-50 rounded-2xl p-4 border border-red-100">
                  <p className="text-[13px] text-red-600 text-center">{speakerError}</p>
                  <button
                    onClick={retrySpeaker}
                    className="mt-3 w-full py-2.5 bg-red-600 text-white text-[13px] font-semibold rounded-xl hover:bg-red-700 transition-colors"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Button */}
            <div className="pt-4">
              {!playing && !speakerPassed && !speakerError && (
                <button
                  onClick={checkSpeaker}
                  className="w-full py-3.5 bg-indigo-600 text-white text-[15px] font-semibold rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  <Volume2 className="w-4 h-4" />
                  Putar Nada Uji
                </button>
              )}
              {speakerPassed && (
                <button
                  onClick={() => setStep("ready")}
                  className="w-full py-3.5 bg-indigo-600 text-white text-[15px] font-semibold rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20"
                >
                  Lanjutkan
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: READY */}
        {step === "ready" && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center -mt-8">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <span className="absolute -top-2 -right-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full w-5 h-5 bg-green-500" />
                </span>
              </div>

              <h2 className="text-[22px] font-bold text-[#1d1d1f] text-center mb-1">
                Semua Siap!
              </h2>
              <p className="text-[13px] text-[#8e8e93] text-center mb-8 max-w-xs">
                Mikrofon dan audio telah terverifikasi. Anda siap memulai simulasi.
              </p>

              <div className="w-full max-w-sm space-y-2 mb-8">
                <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-[#f0f0f0]">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Mikrofon</p>
                    <p className="text-[11px] text-[#8e8e93]">Berfungsi — level suara terdeteksi</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-[#f0f0f0]">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1d1d1f]">Speaker / Headset</p>
                    <p className="text-[11px] text-[#8e8e93]">Berfungsi — nada uji terkonfirmasi</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleStart}
                disabled={starting}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[15px] font-semibold rounded-2xl hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50"
              >
                {starting ? "Memuat..." : "Mulai Simulasi"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
