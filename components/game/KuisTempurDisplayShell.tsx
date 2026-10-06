"use client";

import { Maximize2, Minimize2, RotateCw, Smartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

export type KuisTempurDisplayMode = "fullscreen" | "normal";

const STORAGE_KEY = "kuis-tempur-display-mode";

function readSavedMode(): KuisTempurDisplayMode {
  if (typeof window === "undefined") return "normal";
  return window.localStorage.getItem(STORAGE_KEY) === "fullscreen" ? "fullscreen" : "normal";
}

export function saveKuisTempurDisplayMode(mode: KuisTempurDisplayMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, mode);
}

export function KuisTempurDisplayChoice({
  onChoose,
  title = "Pilih tampilan bertempur",
}: {
  onChoose: (mode: KuisTempurDisplayMode) => void;
  title?: string;
}) {
  const saved = useMemo(() => readSavedMode(), []);

  const choose = useCallback(async (mode: KuisTempurDisplayMode) => {
    saveKuisTempurDisplayMode(mode);
    if (mode === "fullscreen" && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Some browsers reject fullscreen even after a gesture; the in-game toggle remains available.
      }
    } else if (mode === "normal" && document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
    onChoose(mode);
  }, [onChoose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#020617]/88 p-4 backdrop-blur-xl">
      <section className="w-full max-w-lg rounded-[30px] border border-white/12 bg-[#071020] p-5 text-white shadow-[0_35px_120px_rgba(0,0,0,.65)] sm:p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-200">
          <Smartphone size={24} />
        </div>
        <h2 className="mt-4 text-center text-2xl font-black tracking-tight">{title}</h2>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm font-semibold leading-6 text-slate-400">
          Full screen paling imersif. Main biasa tetap tersedia kapan saja.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => choose("fullscreen")}
            className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4 text-left transition hover:border-cyan-200/45 hover:bg-cyan-300/15"
          >
            <div className="flex items-center gap-2 text-sm font-black text-cyan-100">
              <Maximize2 size={18} /> FULL SCREEN
            </div>
            <div className="mt-1 text-xs font-semibold leading-5 text-slate-400">
              Arena memenuhi layar. Di HP, landscape sangat dianjurkan.
            </div>
            {saved === "fullscreen" && (
              <div className="mt-3 text-[10px] font-black tracking-widest text-cyan-300">PILIHAN TERAKHIR</div>
            )}
          </button>

          <button
            onClick={() => choose("normal")}
            className="rounded-2xl border border-white/12 bg-white/[.055] p-4 text-left transition hover:border-white/25 hover:bg-white/[.08]"
          >
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Minimize2 size={18} /> MAIN BIASA
            </div>
            <div className="mt-1 text-xs font-semibold leading-5 text-slate-400">
              Tetap bermain di halaman normal dan bisa beralih ke fullscreen saat match.
            </div>
            {saved === "normal" && (
              <div className="mt-3 text-[10px] font-black tracking-widest text-slate-400">PILIHAN TERAKHIR</div>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function KuisTempurDisplayShell({
  children,
  preferredMode,
  showToggle = true,
}: {
  children: ReactNode;
  preferredMode?: KuisTempurDisplayMode;
  showToggle?: boolean;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortraitPhone, setIsPortraitPhone] = useState(false);

  const enterFullscreen = useCallback(async () => {
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) {
      try {
        await root.requestFullscreen();
      } catch {
        // Browser may require a direct user gesture. The toggle remains available.
      }
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    saveKuisTempurDisplayMode(document.fullscreenElement ? "normal" : "fullscreen");
    if (document.fullscreenElement) void exitFullscreen();
    else void enterFullscreen();
  }, [enterFullscreen, exitFullscreen]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const onViewport = () => {
      setIsPortraitPhone(window.innerWidth < 768 && window.innerHeight > window.innerWidth);
    };
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("resize", onViewport);
    window.addEventListener("orientationchange", onViewport);
    onChange();
    onViewport();
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("resize", onViewport);
      window.removeEventListener("orientationchange", onViewport);
    };
  }, []);

  useEffect(() => {
    if (preferredMode === "fullscreen") void enterFullscreen();
  }, [enterFullscreen, preferredMode]);

  return (
    <div className="relative min-h-full">
      {children}

      {showToggle && (
        <button
          type="button"
          onClick={toggleFullscreen}
          className="fixed right-3 top-3 z-[110] inline-flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/75 px-3 py-2 text-[10px] font-black tracking-wide text-white shadow-lg backdrop-blur hover:bg-slate-900/90"
          aria-label={isFullscreen ? "Keluar fullscreen" : "Masuk fullscreen"}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          <span className="hidden sm:inline">{isFullscreen ? "KELUAR FULLSCREEN" : "FULL SCREEN"}</span>
        </button>
      )}

      {isPortraitPhone && (
        <div className="pointer-events-none fixed inset-x-3 top-14 z-[105] flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-amber-200/20 bg-slate-950/88 px-4 py-2 text-[11px] font-black text-amber-100 shadow-xl backdrop-blur">
            <RotateCw size={15} />
            Putar HP ke samping untuk bertempur
          </div>
        </div>
      )}
    </div>
  );
}
