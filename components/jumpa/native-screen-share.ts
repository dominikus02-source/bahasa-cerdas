"use client";
/**
 * Jembatan berbagi layar native Android (WebView tidak punya getDisplayMedia).
 *
 * Kapabilitas dinegosiasikan: tombol hanya muncul bila aplikasi Android
 * memasang JavaScript channel `BahasaCerdasScreenShare` (APK lama tidak
 * punya → tidak ada tombol mati). Web meminta token identitas-layar yang
 * sempit & singkat ke server, lalu menyerahkannya ke native. Native
 * mengirim status balik lewat event `bc:native-screen`.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export const NATIVE_SCREEN_EVENT = "bc:native-screen";
export type NativeScreenState = "idle" | "starting" | "active";

type Bridge = { postMessage: (message: string) => void };

export function nativeScreenBridge(): Bridge | null {
  if (typeof window === "undefined") return null;
  const b = (window as Window & { BahasaCerdasScreenShare?: Partial<Bridge> }).BahasaCerdasScreenShare;
  return b && typeof b.postMessage === "function" ? (b as Bridge) : null;
}

export interface NativeScreenEvent {
  state: "starting" | "active" | "stopped" | "error";
  reason?: "denied" | "failed" | "revoked" | "ended" | "busy" | "invalid";
}

const STATES = new Set(["starting", "active", "stopped", "error"]);
const REASONS = new Set(["denied", "failed", "revoked", "ended", "busy", "invalid"]);

/** Validasi detail event dari native; nilai asing diabaikan. */
export function parseNativeScreenEvent(detail: unknown): NativeScreenEvent | null {
  if (!detail || typeof detail !== "object") return null;
  const d = detail as { state?: unknown; reason?: unknown };
  if (typeof d.state !== "string" || !STATES.has(d.state)) return null;
  const reason = typeof d.reason === "string" && REASONS.has(d.reason) ? (d.reason as NativeScreenEvent["reason"]) : undefined;
  return { state: d.state as NativeScreenEvent["state"], reason };
}

/** Pesan Indonesia untuk status akhir/error dari native. */
export function nativeScreenMessage(evt: NativeScreenEvent): { text: string; tone: "ok" | "warn" } | null {
  if (evt.state === "active") return { text: "Layar kamu sedang dibagikan.", tone: "ok" };
  if (evt.state === "stopped") {
    if (evt.reason === "revoked") return { text: "Berbagi layar dihentikan oleh pemandu atau ruang.", tone: "warn" };
    if (evt.reason === "ended") return { text: "Berbagi layar dihentikan dari perangkat.", tone: "ok" };
    return { text: "Berbagi layar dihentikan.", tone: "ok" };
  }
  if (evt.state === "error") {
    if (evt.reason === "denied") return { text: "Izin merekam layar tidak diberikan. Layar tidak dibagikan.", tone: "warn" };
    if (evt.reason === "busy") return { text: "Berbagi layar sedang diproses. Tunggu sebentar.", tone: "warn" };
    return { text: "Layar belum bisa dibagikan. Coba lagi.", tone: "warn" };
  }
  return null;
}

export function buildNativeStartMessage(serverUrl: string, token: string): string {
  return JSON.stringify({ v: 1, type: "start", serverUrl, token });
}
export const NATIVE_STOP_MESSAGE = JSON.stringify({ v: 1, type: "stop" });

export function useNativeScreenShare(code: string, toast: (text: string, tone?: "ok" | "warn") => void) {
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<NativeScreenState>("idle");
  const stateRef = useRef<NativeScreenState>("idle");
  const set = (s: NativeScreenState) => {
    stateRef.current = s;
    setState(s);
  };

  useEffect(() => {
    setAvailable(nativeScreenBridge() !== null);
    const onEvent = (e: Event) => {
      const evt = parseNativeScreenEvent((e as CustomEvent).detail);
      if (!evt) return;
      set(evt.state === "active" ? "active" : evt.state === "starting" ? "starting" : "idle");
      const msg = nativeScreenMessage(evt);
      if (msg && evt.state !== "starting") toast(msg.text, msg.tone);
    };
    window.addEventListener(NATIVE_SCREEN_EVENT, onEvent);
    return () => {
      window.removeEventListener(NATIVE_SCREEN_EVENT, onEvent);
      // Keluar dari ruang/halaman → hentikan tangkapan layar native (idempoten).
      nativeScreenBridge()?.postMessage(NATIVE_STOP_MESSAGE);
    };
    // toast stabil dari konteks ruang; jangan pasang ulang listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(async () => {
    const bridge = nativeScreenBridge();
    if (!bridge || stateRef.current !== "idle") return;
    set("starting");
    try {
      const invite = new URLSearchParams(window.location.search).get("u");
      const res = await fetch(`/api/jumpa/rooms/${encodeURIComponent(code)}/token`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invite ? { mode: "screen", invite } : { mode: "screen" }),
      });
      const data = (await res.json().catch(() => null)) as { token?: unknown; serverUrl?: unknown; error?: unknown } | null;
      if (!res.ok || typeof data?.token !== "string" || typeof data?.serverUrl !== "string") {
        set("idle");
        toast(typeof data?.error === "string" ? data.error : "Layar belum bisa dibagikan. Coba lagi.", "warn");
        return;
      }
      bridge.postMessage(buildNativeStartMessage(data.serverUrl, data.token));
    } catch {
      set("idle");
      toast("Layar belum bisa dibagikan. Periksa koneksi lalu coba lagi.", "warn");
    }
  }, [code, toast]);

  const stop = useCallback(() => {
    nativeScreenBridge()?.postMessage(NATIVE_STOP_MESSAGE);
  }, []);

  return { available, state, active: state === "active", start, stop };
}
