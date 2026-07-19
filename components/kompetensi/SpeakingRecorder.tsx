"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, Loader2, AlertCircle, CheckCircle2, Clock, Volume2 } from "lucide-react";

interface SpeakingRecorderProps {
  questionId: string;
  questionNumber: number;
  sectionName: string;
  prompt: string;
  instruction?: string;
  passage?: string;
  imageUrl?: string;
  /** Waktu persiapan membaca soal (detik) sebelum merekam. */
  prepSec?: number;
  /** Batas durasi rekaman (detik). */
  recordSec?: number;
  /** URL rekaman tersimpan (jika sudah pernah merekam). */
  value?: string;
  /** Dipanggil dengan URL hasil unggah setelah rekaman selesai. */
  onChange: (questionId: string, url: string) => void;
}

function pickMime(): string {
  const cands = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of cands) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "audio/webm";
}

function baseMime(m: string): { mime: string; ext: string } {
  if (m.startsWith("audio/mp4")) return { mime: "audio/mp4", ext: "mp4" };
  return { mime: "audio/webm", ext: "webm" };
}

export default function SpeakingRecorder({
  questionId,
  questionNumber,
  sectionName,
  prompt,
  instruction,
  passage,
  imageUrl,
  prepSec = 30,
  recordSec = 60,
  value,
  onChange,
}: SpeakingRecorderProps) {
  const [phase, setPhase] = useState<"idle" | "prep" | "recording" | "uploading" | "done" | "error">(
    value ? "done" : "idle"
  );
  const [error, setError] = useState("");
  const [prepLeft, setPrepLeft] = useState(prepSec);
  const [recLeft, setRecLeft] = useState(recordSec);
  const [level, setLevel] = useState(0); // 0..1 level mikrofon
  const [audioUrl, setAudioUrl] = useState<string | null>(value || null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const saveAnswerImmediate = useCallback(async (qid: string, val: string) => {
    try {
      const match = window.location.pathname.match(/\/kompetisi\/([^/]+)/);
      if (!match) return;
      const paketId = match[1];
      await fetch(`/api/kompetensi/${paketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: { [qid]: val } }),
      });
    } catch {}
  }, []);

  const uploadBlob = useCallback(async (blob: Blob, ext: string, mime: string) => {
    setPhase("uploading");
    try {
      const file = new File([blob], `rekaman-${questionId}-${Date.now()}.${ext}`, { type: mime });
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/rekaman", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Unggah gagal");
      const url = data.url;
      setAudioUrl(url);
      onChange(questionId, url);
      saveAnswerImmediate(questionId, url);
      setPhase("done");
    } catch (e: any) {
      setError(e?.message || "Rekaman gagal diunggah. Coba rekam ulang.");
      setPhase("error");
    }
  }, [questionId, onChange, saveAnswerImmediate]);

  const stopRecording = useCallback(() => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const beginRecording = useCallback(async () => {
    try {
      const stream = streamRef.current || (await navigator.mediaDevices.getUserMedia({ audio: true }));
      streamRef.current = stream;

      // Visualizer level mikrofon.
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
        setLevel(Math.min(1, avg / 128));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      const chosen = pickMime();
      const rec = new MediaRecorder(stream, { mimeType: chosen });
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const { mime, ext } = baseMime(chosen);
        const blob = new Blob(chunksRef.current, { type: mime });
        cleanup();
        if (blob.size > 0) uploadBlob(blob, ext, mime);
        else { setError("Rekaman kosong. Coba lagi."); setPhase("error"); }
      };
      rec.start();

      setPhase("recording");
      setRecLeft(recordSec);
      recTimerRef.current = setInterval(() => {
        setRecLeft((s) => {
          if (s <= 1) { stopRecording(); return 0; }
          return s - 1;
        });
      }, 1000);
    } catch {
      setError("Mikrofon tidak dapat diakses. Izinkan mikrofon di pengaturan browser lalu coba lagi.");
      setPhase("error");
    }
  }, [recordSec, cleanup, uploadBlob, stopRecording]);

  const startPrep = useCallback(async () => {
    setError("");
    // Ambil izin mikrofon dulu (biar prep tidak sia-sia bila ditolak).
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Izin mikrofon ditolak. Buka pengaturan browser Anda dan izinkan mikrofon.");
      setPhase("error");
      return;
    }
    if (prepSec <= 0) { beginRecording(); return; }
    setPhase("prep");
    setPrepLeft(prepSec);
    prepTimerRef.current = setInterval(() => {
      setPrepLeft((s) => {
        if (s <= 1) { if (prepTimerRef.current) clearInterval(prepTimerRef.current); beginRecording(); return 0; }
        return s - 1;
      });
    }, 1000);
  }, [prepSec, beginRecording]);

  const reRecord = () => {
    cleanup();
    setAudioUrl(null);
    setError("");
    setPhase("idle");
  };

  const bars = Array.from({ length: 12 });

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
          {sectionName || "Berbicara"} · Soal {questionNumber}
        </span>
      </div>

      {passage && (
        <div className="mb-3 max-h-40 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          {passage}
        </div>
      )}
      {imageUrl && (
        <img src={imageUrl} alt="Gambar soal" className="mb-3 max-h-56 w-full rounded-xl border border-slate-100 object-contain" />
      )}

      <div className="mb-4 flex items-start gap-2">
        <Mic className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
        <div>
          <p className="text-sm font-medium leading-relaxed text-slate-800 sm:text-base">{prompt}</p>
          {instruction && <p className="mt-1 text-xs text-slate-500">{instruction}</p>}
          <p className="mt-1 text-[11px] text-slate-400">Persiapan {prepSec} detik · Waktu rekam maks {recordSec} detik</p>
        </div>
      </div>

      {/* Panel status */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        {phase === "idle" && (
          <button
            onClick={startPrep}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 font-bold text-white transition-colors hover:bg-rose-700 active:scale-[0.99]"
          >
            <Mic className="h-5 w-5" /> Mulai (persiapan lalu merekam)
          </button>
        )}

        {phase === "prep" && (
          <div className="text-center">
            <Clock className="mx-auto mb-2 h-6 w-6 text-amber-500" />
            <p className="text-sm font-semibold text-slate-700">Persiapan — baca & pahami soal</p>
            <p className="mt-1 text-3xl font-black text-amber-500">{prepLeft}</p>
            <p className="text-[11px] text-slate-400">Rekaman mulai otomatis saat waktu habis</p>
          </div>
        )}

        {phase === "recording" && (
          <div className="text-center">
            <div className="mb-3 flex items-end justify-center gap-1" style={{ height: 40 }} aria-hidden>
              {bars.map((_, i) => {
                const active = level * bars.length > i;
                const h = 8 + (active ? level : 0.05) * 32 * (0.6 + Math.random() * 0.4);
                return <span key={i} className="w-1.5 rounded-full bg-rose-500 transition-all" style={{ height: `${h}px`, opacity: active ? 1 : 0.3 }} />;
              })}
            </div>
            <p className="text-sm font-semibold text-rose-600">● Merekam… {recLeft}s</p>
            <button
              onClick={stopRecording}
              className="mx-auto mt-3 flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 font-bold text-white hover:bg-slate-900"
            >
              <Square className="h-4 w-4" fill="currentColor" /> Berhenti & Simpan
            </button>
          </div>
        )}

        {phase === "uploading" && (
          <div className="flex items-center justify-center gap-2 py-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" /> Mengunggah rekaman…
          </div>
        )}

        {phase === "done" && audioUrl && (
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Rekaman tersimpan
            </div>
            <div className="mb-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">Putar hasil rekaman Anda</span>
              </div>
              <audio
                controls
                src={audioUrl.includes("supabase.co") ? `/api/audio-proxy?url=${encodeURIComponent(audioUrl)}` : audioUrl}
                className="w-full"
                preload="metadata"
              >
                Browser tidak mendukung pemutar audio.
              </audio>
            </div>
            <button onClick={reRecord} className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
              <RotateCcw className="h-3.5 w-3.5" /> Rekam ulang
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="text-center">
            <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={reRecord} className="mx-auto mt-3 rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Coba lagi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
