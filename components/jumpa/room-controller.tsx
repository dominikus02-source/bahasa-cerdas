"use client";

/**
 * JUMPA Fase 2 — state ruang di sisi klien (obrolan, tangan, reaksi,
 * status host, toast). Hidup di dalam <LiveKitRoom>.
 *
 * Kepercayaan: topik obrolan/moderasi/ruang hanya diterima dari SERVER
 * (pengirim participant undefined). Reaksi & tangan dari peserta;
 * "turunkan tangan" hanya diterima dari HOST/COHOST (metadata diset server).
 * Semua aksi berisiko lewat API server — UI hanya cermin izin.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { RoomEvent, type RemoteParticipant } from "livekit-client";
import type { ChatView } from "@/lib/jumpa/chat";
import { allowReaction, encodeSignal, JUMPA_TOPICS, parsePeerSignal, parseServerSignal, type JumpaReaction, type PeerSignal } from "@/lib/jumpa/signals";
import { parseParticipantMeta } from "./format";

export interface JumpaRoomInfo {
  code: string;
  title: string;
  kind: "KELAS" | "GURU" | "MURID" | "UMUM";
  isLocked: boolean;
  chatEnabled: boolean;
  allowMuridScreenShare: boolean;
  endsAt: string | null;
  groupName: string | null;
  communityName: string | null;
}

export interface JumpaSelf {
  userId: string;
  bcRole: "GURU" | "MURID" | "UMUM";
  /** Peran dari respons token; dipakai sampai metadata LiveKit tiba. */
  roomRole?: "HOST" | "COHOST" | "MEMBER";
}

export type EndedReason = "HOST" | "TIME_LIMIT" | "EMPTY" | "STALE";

interface Toast {
  id: number;
  text: string;
  tone: "info" | "warn" | "ok";
}

export interface FloatingReaction {
  id: number;
  r: JumpaReaction;
  name: string;
  x: number;
}

type ApiResult = { ok: true; data: Record<string, unknown> } | { ok: false; message: string };

interface Ctl {
  info: JumpaRoomInfo;
  self: JumpaSelf & { roomRole: "HOST" | "COHOST" | "MEMBER" };
  messages: ChatView[];
  chatLoaded: boolean;
  unread: number;
  setChatVisible: (v: boolean) => void;
  sendChat: (content: string) => Promise<ApiResult>;
  deleteChat: (id: string) => Promise<ApiResult>;
  hands: Map<string, number>;
  myHand: boolean;
  toggleHand: () => void;
  lowerHand: (userId: string) => void;
  reactions: FloatingReaction[];
  react: (r: JumpaReaction) => void;
  moderate: (action: string, targetUserId?: string) => Promise<ApiResult>;
  api: (path: string, init?: RequestInit) => Promise<ApiResult>;
  toast: (text: string, tone?: Toast["tone"]) => void;
  toasts: Toast[];
  endedReasonRef: React.MutableRefObject<EndedReason | null>;
}

const JumpaCtx = createContext<Ctl | null>(null);

export function useJumpa(): Ctl {
  const v = useContext(JumpaCtx);
  if (!v) throw new Error("useJumpa di luar JumpaRoomProvider");
  return v;
}

const MUTE_TEXT = {
  microphone: "Pemandu mematikan mikrofonmu.",
  camera: "Pemandu mematikan kameramu.",
  screen_share: "Pemandu menghentikan berbagi layarmu.",
} as const;

async function callApi(path: string, init?: RequestInit): Promise<ApiResult> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = ((await res.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    if (!res.ok) return { ok: false, message: typeof body.error === "string" ? body.error : "Terjadi kesalahan. Coba lagi." };
    return { ok: true, data: body };
  } catch {
    return { ok: false, message: "Koneksi bermasalah. Coba lagi." };
  }
}

export function JumpaRoomProvider({ initial, self, children }: { initial: JumpaRoomInfo; self: JumpaSelf; children: ReactNode }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [info, setInfo] = useState(initial);
  const [roomRole, setRoomRole] = useState<"HOST" | "COHOST" | "MEMBER">(() => parseParticipantMeta(localParticipant.metadata).roomRole ?? self.roomRole ?? "MEMBER");
  const [messages, setMessages] = useState<ChatView[]>([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [unread, setUnread] = useState(0);
  const chatVisible = useRef(false);
  const [hands, setHands] = useState<Map<string, number>>(new Map());
  const [myHand, setMyHand] = useState(false);
  const myHandAt = useRef<number | null>(null);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const reactHistory = useRef<number[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const endedReasonRef = useRef<EndedReason | null>(null);
  const base = `/api/jumpa/rooms/${encodeURIComponent(info.code)}`;

  const toast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const publish = useCallback(
    (topic: string, sig: PeerSignal, to?: string[]) => {
      void localParticipant
        .publishData(encodeSignal(sig), { reliable: true, topic, destinationIdentities: to })
        .catch(() => undefined);
    },
    [localParticipant],
  );

  const showReaction = useCallback((r: JumpaReaction, name: string) => {
    const id = ++seq.current;
    setReactions((list) => [...list.slice(-14), { id, r, name, x: 8 + Math.random() * 76 }]);
    setTimeout(() => setReactions((list) => list.filter((x) => x.id !== id)), 2800);
  }, []);

  // Riwayat obrolan sekali saat masuk.
  useEffect(() => {
    let alive = true;
    void callApi(`${base}/chat`).then((r) => {
      if (!alive) return;
      if (r.ok && Array.isArray(r.data.messages)) {
        setMessages((cur) => {
          const ids = new Set(cur.map((m) => m.id));
          return [...(r.data.messages as ChatView[]).filter((m) => !ids.has(m.id)), ...cur];
        });
      }
      setChatLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [base]);

  const addMessage = useCallback((m: ChatView) => {
    setMessages((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur.slice(-199), m]));
  }, []);

  // Peran sendiri berubah (co-host) → metadata dari server.
  useEffect(() => {
    const onMeta = () => setRoomRole(parseParticipantMeta(localParticipant.metadata).roomRole ?? "MEMBER");
    localParticipant.on("participantMetadataChanged", onMeta);
    return () => {
      localParticipant.off("participantMetadataChanged", onMeta);
    };
  }, [localParticipant]);

  useEffect(() => {
    const onData = (payload: Uint8Array, participant?: RemoteParticipant, _kind?: unknown, topic?: string) => {
      const server = parseServerSignal(topic, payload, !participant);
      if (server) {
        switch (server.t) {
          case "chat.new":
            addMessage(server.message);
            if (!chatVisible.current && server.message.userId !== self.userId) setUnread((n) => n + 1);
            break;
          case "chat.deleted":
            setMessages((cur) => cur.map((m) => (m.id === server.id ? { ...m, deleted: true, content: "Pesan telah dihapus" } : m)));
            break;
          case "mod.muted":
            toast(MUTE_TEXT[server.source], "warn");
            if (server.source === "screen_share") void localParticipant.setScreenShareEnabled(false).catch(() => undefined);
            break;
          case "mod.removed":
            break; // ditangani onDisconnected (PARTICIPANT_REMOVED)
          case "room.ended":
            endedReasonRef.current = server.reason;
            break;
          case "room.locked":
            setInfo((i) => ({ ...i, isLocked: server.locked }));
            toast(server.locked ? "Ruang dikunci untuk peserta baru." : "Kunci ruang dibuka.");
            break;
          case "room.warning":
            setInfo((i) => ({ ...i, endsAt: server.endsAt }));
            toast("Ruang berakhir dalam 10 menit.", "warn");
            break;
          case "room.screen":
            setInfo((i) => ({ ...i, allowMuridScreenShare: server.allowMurid }));
            if (self.bcRole === "MURID") {
              toast(server.allowMurid ? "Guru mengizinkan murid berbagi layar." : "Berbagi layar murid dimatikan guru.");
              if (!server.allowMurid) void localParticipant.setScreenShareEnabled(false).catch(() => undefined);
            }
            break;
          case "room.chat":
            setInfo((i) => ({ ...i, chatEnabled: server.enabled }));
            toast(server.enabled ? "Obrolan dibuka kembali." : "Obrolan dimatikan pemandu.");
            break;
          case "room.role":
            if (server.userId === self.userId) {
              setRoomRole(server.roomRole);
              toast(server.roomRole === "COHOST" ? "Kamu sekarang wakil pemandu." : "Kamu bukan wakil pemandu lagi.", "ok");
            }
            break;
        }
        return;
      }
      if (!participant) return;
      const peer = parsePeerSignal(topic, payload, parseParticipantMeta(participant.metadata).roomRole);
      if (!peer) return;
      if (peer.t === "hand") {
        setHands((cur) => {
          const next = new Map(cur);
          if (peer.raised) next.set(participant.identity, peer.at);
          else next.delete(participant.identity);
          return next;
        });
      } else if (peer.t === "hand.lower") {
        setHands((cur) => {
          const next = new Map(cur);
          next.delete(peer.userId);
          return next;
        });
        if (peer.userId === self.userId) {
          setMyHand(false);
          myHandAt.current = null;
          toast("Pemandu menurunkan tanganmu.");
        }
      } else if (peer.t === "react") {
        showReaction(peer.r, participant.name || "Peserta");
      }
    };
    // Peserta baru tidak tahu siapa yang sedang angkat tangan → kabari.
    const onJoin = (p: RemoteParticipant) => {
      if (myHandAt.current) publish(JUMPA_TOPICS.hand, { t: "hand", raised: true, at: myHandAt.current }, [p.identity]);
    };
    const onLeave = (p: RemoteParticipant) =>
      setHands((cur) => {
        if (!cur.has(p.identity)) return cur;
        const next = new Map(cur);
        next.delete(p.identity);
        return next;
      });
    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
    };
  }, [room, localParticipant, self.userId, self.bcRole, addMessage, toast, publish, showReaction]);

  const toggleHand = useCallback(() => {
    const raised = !myHandAt.current;
    const at = Date.now();
    myHandAt.current = raised ? at : null;
    setMyHand(raised);
    setHands((cur) => {
      const next = new Map(cur);
      if (raised) next.set(self.userId, at);
      else next.delete(self.userId);
      return next;
    });
    publish(JUMPA_TOPICS.hand, { t: "hand", raised, at });
  }, [publish, self.userId]);

  const lowerHand = useCallback(
    (userId: string) => {
      setHands((cur) => {
        const next = new Map(cur);
        next.delete(userId);
        return next;
      });
      publish(JUMPA_TOPICS.hand, { t: "hand.lower", userId });
    },
    [publish],
  );

  const react = useCallback(
    (r: JumpaReaction) => {
      const now = Date.now();
      if (!allowReaction(reactHistory.current, now)) return;
      reactHistory.current = [...reactHistory.current.filter((t) => now - t < 3000), now];
      showReaction(r, "Kamu");
      publish(JUMPA_TOPICS.reaction, { t: "react", r });
    },
    [publish, showReaction],
  );

  const sendChat = useCallback(
    async (content: string) => {
      const r = await callApi(`${base}/chat`, { method: "POST", body: JSON.stringify({ content }) });
      if (r.ok && r.data.message) addMessage(r.data.message as ChatView);
      return r;
    },
    [base, addMessage],
  );

  const deleteChat = useCallback(async (id: string) => {
    const r = await callApi(`/api/jumpa/chat/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) setMessages((cur) => cur.map((m) => (m.id === id ? { ...m, deleted: true, content: "Pesan telah dihapus" } : m)));
    return r;
  }, []);

  const moderate = useCallback(
    async (action: string, targetUserId?: string) => {
      const r = await callApi(`${base}/moderation`, { method: "POST", body: JSON.stringify({ action, targetUserId }) });
      if (r.ok && r.data.room && typeof r.data.room === "object") {
        const s = r.data.room as Partial<JumpaRoomInfo>;
        setInfo((i) => ({ ...i, isLocked: s.isLocked ?? i.isLocked, chatEnabled: s.chatEnabled ?? i.chatEnabled, allowMuridScreenShare: s.allowMuridScreenShare ?? i.allowMuridScreenShare }));
      }
      if (!r.ok) toast(r.message, "warn");
      return r;
    },
    [base, toast],
  );

  const setChatVisible = useCallback((v: boolean) => {
    chatVisible.current = v;
    if (v) setUnread(0);
  }, []);

  const value = useMemo<Ctl>(
    () => ({
      info,
      self: { ...self, roomRole },
      messages,
      chatLoaded,
      unread,
      setChatVisible,
      sendChat,
      deleteChat,
      hands,
      myHand,
      toggleHand,
      lowerHand,
      reactions,
      react,
      moderate,
      api: callApi,
      toast,
      toasts,
      endedReasonRef,
    }),
    [info, self, roomRole, messages, chatLoaded, unread, setChatVisible, sendChat, deleteChat, hands, myHand, toggleHand, lowerHand, reactions, react, moderate, toast, toasts],
  );

  return <JumpaCtx.Provider value={value}>{children}</JumpaCtx.Provider>;
}
