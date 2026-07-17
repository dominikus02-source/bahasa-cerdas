"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, Mic, CheckCircle2, XCircle, Loader2, AlertCircle, Play, ShieldCheck } from "lucide-react";

interface DeviceCheckProps {
  /** Wajib cek mikrofon (paket punya seksi Berbicara). */
  requireMic: boolean;
  /** Wajib cek speaker (paket punya seksi Mendengarkan). */
  requireSpeaker: boolean;
  onComplete: () => void;
}

type CheckState = "idle" | "pending" | "pass" | "fail";

/**
 * Gerbang wajib sebelum simulasi: cek kompatibilitas, speaker, dan mikrofon.
 * Tombol "Mulai Simulasi" hanya aktif jika semua pemeriksaan RELEVAN lulus.
 */
export default function DeviceCheck({ requireMic, requireSpeaker, onComplete }: DeviceCheckProps) {
  const [compat, setCompat] = useState<CheckState>("pending");
  const [speaker, setSpeaker] = useState<CheckState>(requireSpeaker ? "idle" : "pass");
  const [mic, setMic] = useState<CheckState>(requireMic ? "idle" : "pass");
  const [micErr, setMicErr] = useState("");
  const [level, setLevel] = useState(0);
  const [recState, setRecState] = useState<"idle" | "recording" | "recorded">("idle");
  const [recUrl, setRecUrl] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Langkah 1: kompatibilitas browser.
  useEffect(() => {
    const ok =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window !== "undefined" &&
      (typeof AudioContext !== "undefined" || typeof (window as any).webkitAudioContext !== "undefined") &&
      (!requireMic || typeof MediaRecorder !== "undefined");
    setCompat(ok ? "pass" : "fail");
  }, [requireMic]);

  const stopAll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  // Langkah 2: putar nada uji speaker.
  const playTone = async () => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440;
      gain.gain.value = 0.15;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close().catch(() => {}); }, 1200);
    } catch {
      /* biarkan user menilai sendiri */
    }
  };

  // Langkah 3: cek mikrofon — izin + visualizer + rekam 4 detik + putar ulang.
  const startMicCheck = async () => {
    setMicErr("");
    setMic("pending");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        setLevel(Math.min(1, buf.reduce((s, v) => s + v, 0) / buf.length / 128));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      // Rekam 4 detik.
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setRecUrl(URL.createObjectURL(blob));
        setRecState("recorded");
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
      rec.start();
      setRecState("recording");
      setTimeout(() => { if (rec.state !== "inactive") rec.stop(); }, 4000);
    } catch (e: any) {
      const denied = e?.name === "NotAllowedError" || e?.name === "SecurityError";
      setMicErr(denied
        ? "Izin mikrofon ditolak — buka pengaturan izin di browser Anda, aktifkan mikrofon untuk situs ini, lalu ulangi."
        : "Mikrofon tidak terdeteksi. Pastikan perangkat mikrofon terpasang lalu ulangi.");
      setMic("fail");
      stopAll();
    }
  };

  const allRelevantPass =
    compat === "pass" &&
    (!requireSpeaker || speaker === "pass") &&
    (!requireMic || mic === "pass");

  const Row = ({ state, icon, title, children }: { state: CheckState; icon: React.ReactNode; title: string; children?: React.ReactNode }) => (
    <div className={`rounded-xl border p-4 ${state === "pass" ? "border-emerald-200 bg-emerald-50" : state === "fail" ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-2">
        <span className="text-slate-500">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-slate-800">{title}</span>
        {state === "pass" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        {state === "fail" && <XCircle className="h-5 w-5 text-red-500" />}
        {state === "pending" && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 text-center">
        <ShieldCheck className="mx-auto mb-2 h-10 w-10 text-emerald-500" />
        <h1 className="text-xl font-black text-slate-900">Pemeriksaan Perangkat</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pastikan perangkat Anda siap sebelum memulai simulasi.
        </p>
      </div>

      <div className="space-y-3">
        {/* 1. Kompatibilitas */}
        <Row state={compat} icon={<ShieldCheck className="h-5 w-5" />} title="Kompatibilitas browser">
          {compat === "fail" && (
            <p className="flex items-start gap-1.5 text-xs text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Browser Anda tidak mendukung fitur audio yang diperlukan. Gunakan Google Chrome versi terbaru.
            </p>
          )}
        </Row>

        {/* 2. Speaker */}
        {requireSpeaker && (
          <Row state={speaker} icon={<Volume2 className="h-5 w-5" />} title="Speaker / keluaran suara">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={playTone} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700">
                <Play className="h-3.5 w-3.5" /> Putar suara uji
              </button>
              <span className="text-xs text-slate-500">Apakah Anda mendengar nada?</span>
              <button onClick={() => setSpeaker("pass")} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${speaker === "pass" ? "bg-emerald-600 text-white" : "border border-emerald-300 text-emerald-700 hover:bg-emerald-50"}`}>
                Ya, saya mendengar
              </button>
              <button onClick={() => setSpeaker("fail")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">
                Tidak
              </button>
            </div>
            {speaker === "fail" && (
              <p className="mt-2 text-xs text-red-600">Naikkan volume perangkat, pastikan speaker/headphone aktif, lalu putar ulang.</p>
            )}
          </Row>
        )}

        {/* 3. Mikrofon */}
        {requireMic && (
          <Row state={mic} icon={<Mic className="h-5 w-5" />} title="Mikrofon">
            {mic !== "pass" && (
              <>
                {recState === "idle" && mic !== "fail" && (
                  <button onClick={startMicCheck} className="w-full rounded-lg bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700">
                    Mulai uji mikrofon (rekam 4 detik)
                  </button>
                )}
                {recState === "recording" && (
                  <div className="text-center">
                    <div className="mb-2 flex items-end justify-center gap-1" style={{ height: 28 }} aria-hidden>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span key={i} className="w-1.5 rounded-full bg-rose-500 transition-all" style={{ height: `${8 + (level * 10 > i ? level : 0.05) * 20}px`, opacity: level * 10 > i ? 1 : 0.3 }} />
                      ))}
                    </div>
                    <p className="text-xs font-semibold text-rose-600">Berbicaralah… sedang merekam</p>
                  </div>
                )}
                {recState === "recorded" && recUrl && (
                  <div>
                    <p className="mb-2 text-xs text-slate-600">Putar ulang — apakah suara Anda terdengar jelas?</p>
                    <audio controls src={recUrl} className="w-full" />
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => setMic("pass")} className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                        Ya, jelas
                      </button>
                      <button onClick={() => { setRecState("idle"); setRecUrl(null); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50">
                        Ulangi
                      </button>
                    </div>
                  </div>
                )}
                {mic === "fail" && (
                  <div>
                    <p className="flex items-start gap-1.5 text-xs text-red-600">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {micErr}
                    </p>
                    <button onClick={() => { setMic("idle"); setRecState("idle"); }} className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                      Coba lagi
                    </button>
                  </div>
                )}
              </>
            )}
          </Row>
        )}
      </div>

      <button
        onClick={() => { stopAll(); onComplete(); }}
        disabled={!allRelevantPass}
        className={`mt-6 w-full rounded-xl py-3.5 text-sm font-bold transition-all ${
          allRelevantPass ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99]" : "cursor-not-allowed bg-slate-200 text-slate-400"
        }`}
      >
        {allRelevantPass ? "Mulai Simulasi" : "Selesaikan pemeriksaan di atas dulu"}
      </button>
    </div>
  );
}
