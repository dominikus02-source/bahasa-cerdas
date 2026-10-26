"use client";

/**
 * Satu sumber musik per perangkat.
 *
 * Bila ruang guru dibuka di dua tab, atau ruang guru dan layar murid
 * terbuka di perangkat yang sama, musik kompetitif hanya diputar oleh
 * SATU tab. Tab-tab saling mengumumkan diri lewat BroadcastChannel per
 * sesi; pemimpin dipilih secara deterministik:
 *   1. prioritas permukaan tertinggi (guru > layar kelas > murid),
 *   2. yang paling dulu ingin memutar musik,
 *   3. id tab (pemecah seri).
 * Hanya tab yang suaranya aktif (tidak dibisukan & audio sudah diizinkan
 * browser) yang ikut pemilihan, jadi tombol bisu di tab mana pun tetap
 * bekerja: tab yang dibisukan langsung mundur.
 */

import { useEffect, useRef, useState } from "react";

export type MusicSurface = "guru" | "layar" | "murid";

export const MUSIC_SURFACE_PRIORITY: Record<MusicSurface, number> = {
  guru: 3,
  layar: 2,
  murid: 1,
};

export interface MusicCandidate {
  id: string;
  priority: number;
  /** Waktu (ms epoch) kandidat mulai ingin memutar musik. */
  since: number;
}

/** Pilih pemimpin musik dari daftar kandidat (murni, mudah diuji). */
export function pickMusicLeader(candidates: readonly MusicCandidate[]): string | null {
  let best: MusicCandidate | null = null;
  for (const c of candidates) {
    if (
      !best ||
      c.priority > best.priority ||
      (c.priority === best.priority && (c.since < best.since || (c.since === best.since && c.id < best.id)))
    ) {
      best = c;
    }
  }
  return best ? best.id : null;
}

/** Interval detak & batas kedaluwarsa peserta yang diam (tab ditutup paksa). */
export const MUSIC_HEARTBEAT_MS = 1000;
export const MUSIC_PEER_TTL_MS = 3200;
/** Jeda dengar sebelum mengklaim kepemimpinan, agar tab baru tidak menimpa. */
export const MUSIC_LISTEN_MS = 450;

type Message =
  | { type: "hb"; id: string; priority: number; since: number }
  | { type: "probe"; id: string }
  | { type: "bye"; id: string };

function newTabId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * true bila tab ini boleh memutar musik untuk sesi `channelKey`.
 * Tanpa BroadcastChannel (browser lama) tab selalu memimpin.
 */
export function useMusicLeadership({
  channelKey,
  surface,
  wants,
}: {
  channelKey: string | null | undefined;
  surface: MusicSurface;
  wants: boolean;
}): boolean {
  const [isLeader, setIsLeader] = useState(false);
  const idRef = useRef<string>("");
  if (!idRef.current) idRef.current = newTabId();

  useEffect(() => {
    if (!wants) {
      setIsLeader(false);
      return;
    }
    if (!channelKey || typeof BroadcastChannel === "undefined") {
      setIsLeader(true);
      return;
    }

    const id = idRef.current;
    const self: MusicCandidate = { id, priority: MUSIC_SURFACE_PRIORITY[surface], since: Date.now() };
    const peers = new Map<string, MusicCandidate & { seen: number }>();
    const channel = new BroadcastChannel(`mb-music:${channelKey}`);
    let settled = false;

    const decide = () => {
      if (!settled) return;
      const now = Date.now();
      for (const [pid, p] of peers) if (now - p.seen > MUSIC_PEER_TTL_MS) peers.delete(pid);
      setIsLeader(pickMusicLeader([self, ...peers.values()]) === id);
    };
    const announce = () => {
      const msg: Message = { type: "hb", id, priority: self.priority, since: self.since };
      channel.postMessage(msg);
    };

    channel.onmessage = (event: MessageEvent<Message>) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object" || msg.id === id) return;
      if (msg.type === "probe") {
        announce();
        return;
      }
      if (msg.type === "bye") {
        peers.delete(msg.id);
      } else if (msg.type === "hb" && typeof msg.priority === "number" && typeof msg.since === "number") {
        peers.set(msg.id, { id: msg.id, priority: msg.priority, since: msg.since, seen: Date.now() });
      }
      decide();
    };

    channel.postMessage({ type: "probe", id } satisfies Message);
    announce();
    const listen = window.setTimeout(() => {
      settled = true;
      decide();
    }, MUSIC_LISTEN_MS);
    const beat = window.setInterval(() => {
      announce();
      decide();
    }, MUSIC_HEARTBEAT_MS);
    const bye = () => channel.postMessage({ type: "bye", id } satisfies Message);
    window.addEventListener("pagehide", bye);

    return () => {
      window.clearTimeout(listen);
      window.clearInterval(beat);
      window.removeEventListener("pagehide", bye);
      try {
        bye();
      } catch {
        // Saluran sudah tertutup.
      }
      channel.close();
      setIsLeader(false);
    };
  }, [channelKey, surface, wants]);

  return isLeader;
}
