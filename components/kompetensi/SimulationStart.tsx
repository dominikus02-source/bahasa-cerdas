"use client";

import { useMemo, useState } from "react";
import { Headphones, FileText, Mic, Volume2, Loader2, ArrowRight, ChevronLeft } from "lucide-react";
import DeviceCheck from "./DeviceCheck";

interface SectionLike {
  seksi?: string;
  questions?: any[];
}

interface SimulationStartProps {
  title: string;
  sections: SectionLike[];
  /** Apakah soal sudah selesai dimuat di belakang layar. */
  ready: boolean;
  /** mode "full" = pakai perangkat (semua seksi); "noDevice" = tanpa perangkat (tanpa Mendengarkan/Berbicara). */
  onStart: (mode: "full" | "noDevice") => void;
  onExit: () => void;
}

/**
 * Layar mulai simulasi: pilih mode perangkat, cek perangkat bila perlu, lalu
 * mulai. Soal di-preload di belakang layar → "Mulai" langsung tampil.
 */
export default function SimulationStart({ title, sections, ready, onStart, onExit }: SimulationStartProps) {
  const has = (name: string) => sections.some((s) => (s.seksi || "").toUpperCase() === name && (s.questions?.length || 0) > 0);
  const hasSpeaker = useMemo(() => has("MENDENGARKAN"), [sections]);
  const hasMic = useMemo(() => has("BERBICARA"), [sections]);
  const hasAudio = hasSpeaker || hasMic;

  const [step, setStep] = useState<"choose" | "device">("choose");

  // Tombol "Mulai" nonaktif sampai soal siap; label berubah jadi menyiapkan.
  const StartCta = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button
      onClick={onClick}
      disabled={!ready}
      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all ${
        ready ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99]" : "cursor-wait bg-slate-200 text-slate-400"
      }`}
    >
      {ready ? (
        <>
          {label} <ArrowRight className="h-4 w-4" />
        </>
      ) : (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan soal…
        </>
      )}
    </button>
  );

  if (step === "device") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50">
        <div className="mx-auto max-w-lg px-4 pt-4">
          <button onClick={() => setStep("choose")} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ChevronLeft className="h-4 w-4" /> Ganti mode
          </button>
        </div>
        <DeviceCheck requireMic={hasMic} requireSpeaker={hasSpeaker} onComplete={() => onStart("full")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50">
      <div className="mx-auto max-w-lg px-4 py-8">
        <button onClick={onExit} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </button>

        <div className="mb-6 text-center">
          <h1 className="text-xl font-black text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {hasAudio ? "Pilih cara mengerjakan simulasi ini." : "Siapkan diri Anda, lalu mulai simulasi."}
          </p>
        </div>

        {!hasAudio ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <FileText className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
            <p className="mb-5 text-center text-sm text-slate-600">
              Simulasi ini berbasis teks — tidak memerlukan headset atau mikrofon.
            </p>
            <StartCta onClick={() => onStart("full")} label="Mulai Simulasi" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Mode DENGAN perangkat */}
            <div className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <Headphones className="h-5 w-5 text-emerald-600" />
                <span className="text-base font-bold text-slate-900">Dengan Perangkat</span>
                <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Lengkap</span>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-slate-500">
                Mengerjakan SEMUA keterampilan
                {hasSpeaker && (
                  <> termasuk <span className="font-medium text-indigo-600"><Volume2 className="inline h-3 w-3" /> Mendengarkan</span></>
                )}
                {hasMic && (
                  <> dan <span className="font-medium text-rose-600"><Mic className="inline h-3 w-3" /> Berbicara</span></>
                )}
                . Membutuhkan {hasSpeaker && "speaker/headset"}{hasSpeaker && hasMic && " & "}{hasMic && "mikrofon"}.
              </p>
              <StartCta onClick={() => setStep("device")} label="Cek perangkat & mulai" />
            </div>

            {/* Mode TANPA perangkat */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-600" />
                <span className="text-base font-bold text-slate-900">Tanpa Perangkat</span>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">Teks saja</span>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-slate-500">
                Untuk yang tidak punya headset/mikrofon. Seksi
                {hasSpeaker && " Mendengarkan"}{hasSpeaker && hasMic && " &"}{hasMic && " Berbicara"} dilewati —
                Anda tetap bisa simulasi dengan soal berbasis teks.
              </p>
              <StartCta onClick={() => onStart("noDevice")} label="Mulai tanpa perangkat" />
            </div>
          </div>
        )}

        {!ready && (
          <p className="mt-4 text-center text-[11px] text-slate-400">Soal sedang dimuat di belakang layar…</p>
        )}
      </div>
    </div>
  );
}
