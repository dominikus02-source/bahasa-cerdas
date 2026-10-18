"use client";

/**
 * JUMPA Fase 2 — panel kontekstual: Obrolan, Peserta (+ antrean tangan &
 * kontrol host), Undang, Laporkan. Desktop: panel samping. Mobile: sheet.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParticipants } from "@livekit/components-react";
import type { Participant } from "livekit-client";
import {
  Check,
  Copy,
  Crown,
  Flag,
  Hand,
  Loader2,
  Lock,
  LockOpen,
  MessageSquare,
  MessageSquareOff,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  MoreVertical,
  PhoneOff,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  VideoOff,
  X,
} from "lucide-react";
import { canDeleteChat, canModerate, JUMPA_REPORT_CATEGORIES, type JumpaModerationAction, type ModerationActor } from "@/lib/jumpa/permissions";
import { JUMPA_CHAT_MAX_LEN, JUMPA_CHAT_RETENTION_DAYS } from "@/lib/jumpa/caps";
import { handQueue } from "@/lib/jumpa/signals";
import { initials, parseParticipantMeta } from "./format";
import { useJumpa } from "./room-controller";

export type PanelName = "chat" | "people" | "invite" | "report" | "settings";

const TITLES: Record<PanelName, string> = { chat: "Obrolan", people: "Peserta", invite: "Undang", report: "Laporkan masalah", settings: "Pengaturan" };

/**
 * Fase 3: tanpa framer-motion — animasi masuk murni CSS (transform/opacity,
 * dikompositkan GPU), tanpa animasi keluar. Hemat JS dan ringan di HP.
 */
export function PanelFrame({ name, wide, onClose, children }: { name: PanelName; wide: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const head = (
    <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
      <h2 className="text-base font-bold">{TITLES[name]}</h2>
      <button type="button" className="jumpa-icon-btn" aria-label={`Tutup ${TITLES[name]}`} onClick={onClose}>
        <X size={20} />
      </button>
    </div>
  );
  if (wide) {
    return (
      <aside
        aria-label={TITLES[name]}
        className="jumpa-glass jumpa-panel jumpa-in-side flex w-[360px] shrink-0 flex-col overflow-hidden rounded-[var(--jp-radius)]"
      >
        {head}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </aside>
    );
  }
  return (
    <>
      <button
        type="button"
        aria-label="Tutup panel"
        className="jumpa-scrim jumpa-in-fade fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={TITLES[name]}
        className="jumpa-glass jumpa-sheet jumpa-in-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[82dvh] flex-col rounded-t-[28px] pb-[env(safe-area-inset-bottom)]"
      >
        <span className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-[var(--jp-line-strong)]" aria-hidden />
        {head}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </>
  );
}

// ═══════════════════════════════ Obrolan ══════════════════════════════════

function timeLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ChatPanel() {
  const { messages, chatLoaded, sendChat, deleteChat, self, info, toast } = useJumpa();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const actor: ModerationActor = { userId: self.userId, roomRole: self.roomRole, effective: self.bcRole };
  const isGuruHost = self.bcRole === "GURU" && self.roomRole !== "MEMBER";
  const canWrite = info.chatEnabled || isGuruHost;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const r = await sendChat(content);
    setSending(false);
    if (r.ok) setText("");
    else toast(r.message, "warn");
  };

  return (
    <>
      <p className="mx-4 mb-2 rounded-2xl bg-[var(--jp-glass-strong)] px-3 py-2 text-xs text-[var(--jp-text-2)]">
        <ShieldCheck size={14} className="mr-1 inline align-[-2px] text-[var(--jp-accent)]" />
        {info.kind === "MURID"
          ? `Obrolan ruang ini disimpan ${JUMPA_CHAT_RETENTION_DAYS} hari dan bisa dilihat guru kelas. Jaga sopan santun, ya.`
          : `Obrolan disimpan ${JUMPA_CHAT_RETENTION_DAYS} hari untuk keamanan dan bisa ditinjau guru/admin.`}
      </p>
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3" aria-live="polite">
        {!chatLoaded && <Loader2 className="mx-auto mt-6 animate-spin text-[var(--jp-accent)]" aria-label="Memuat obrolan" />}
        {chatLoaded && messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-[var(--jp-text-3)]">Belum ada pesan. Sapa teman-temanmu!</p>
        )}
        {messages.map((m) => {
          const mine = m.userId === self.userId;
          const canDel = !m.deleted && canDeleteChat({ actor, messageUserId: m.userId, roomKind: info.kind }).ok;
          return (
            <div key={m.id} className={`group flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <span className="mb-0.5 px-1 text-[11px] text-[var(--jp-text-3)]">
                {mine ? "Kamu" : m.name} · {timeLabel(m.createdAt)}
              </span>
              <div className="flex max-w-[88%] items-end gap-1">
                {canDel && mine && <DeleteBtn onClick={() => void deleteChat(m.id)} />}
                <p className="jumpa-bubble" data-mine={mine} data-deleted={m.deleted}>
                  {m.content}
                </p>
                {canDel && !mine && <DeleteBtn onClick={() => void deleteChat(m.id)} />}
              </div>
            </div>
          );
        })}
      </div>
      <form
        className="flex items-end gap-2 border-t border-[var(--jp-line)] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, JUMPA_CHAT_MAX_LEN))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={1}
          disabled={!canWrite}
          placeholder={canWrite ? "Tulis pesan…" : "Obrolan dimatikan host"}
          aria-label="Tulis pesan"
          className="jumpa-input max-h-28 min-h-[48px] flex-1 resize-none"
        />
        <button type="submit" className="jumpa-send" aria-label="Kirim pesan" disabled={!canWrite || sending || !text.trim()}>
          {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </form>
    </>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="jumpa-icon-btn !h-8 !w-8 opacity-60 hover:opacity-100" aria-label="Hapus pesan" onClick={onClick}>
      <Trash2 size={14} />
    </button>
  );
}

// ═══════════════════════════════ Peserta ══════════════════════════════════

interface ActionItem {
  action: JumpaModerationAction;
  label: string;
  icon: ReactNode;
  danger?: boolean;
  confirm?: string;
}

function personActions(p: Participant): ActionItem[] {
  const meta = parseParticipantMeta(p.metadata);
  const items: ActionItem[] = [];
  if (p.isMicrophoneEnabled) items.push({ action: "MUTE_AUDIO", label: "Matikan mikrofon", icon: <MicOff size={18} /> });
  if (p.isCameraEnabled) items.push({ action: "MUTE_VIDEO", label: "Matikan kamera", icon: <VideoOff size={18} /> });
  if (p.isScreenShareEnabled) items.push({ action: "STOP_SCREEN", label: "Hentikan berbagi layar", icon: <MonitorX size={18} /> });
  if (meta.roomRole === "COHOST") items.push({ action: "UNSET_COHOST", label: "Cabut co-host", icon: <Crown size={18} /> });
  else items.push({ action: "SET_COHOST", label: "Jadikan co-host", icon: <Crown size={18} /> });
  items.push({ action: "REMOVE", label: "Keluarkan dari ruang", icon: <UserMinus size={18} />, danger: true, confirm: `Keluarkan ${p.name || "peserta"}? Ia tidak bisa masuk lagi ke ruang ini.` });
  return items;
}

export function PeoplePanel({ onInvite }: { onInvite: () => void }) {
  const participants = useParticipants();
  const { self, info, hands, lowerHand, moderate, toast } = useJumpa();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const actor: ModerationActor = { userId: self.userId, roomRole: self.roomRole, effective: self.bcRole };
  const can = (action: JumpaModerationAction, target?: Participant) => {
    const meta = target ? parseParticipantMeta(target.metadata) : null;
    return canModerate({
      actor,
      action,
      roomKind: info.kind,
      target: target ? { userId: target.identity, roomRole: meta?.roomRole ?? "MEMBER", effective: meta?.bcRole ?? "MURID" } : null,
    }).ok;
  };
  const isHostish = self.roomRole !== "MEMBER";
  const canInviteAny = self.bcRole === "GURU" && isHostish && info.kind !== "MURID";

  const queue = useMemo(() => {
    const byId = new Map(participants.map((p) => [p.identity, p]));
    return handQueue([...hands.entries()].map(([userId, at]) => ({ userId, at }))).filter((h) => byId.has(h.userId)).map((h) => ({ ...h, p: byId.get(h.userId)! }));
  }, [hands, participants]);

  const sorted = useMemo(() => {
    const rank = (p: Participant) => {
      const m = parseParticipantMeta(p.metadata);
      return m.roomRole === "HOST" ? 0 : m.roomRole === "COHOST" ? 1 : m.bcRole === "GURU" ? 2 : 3;
    };
    return [...participants].sort((a, b) => rank(a) - rank(b) || (a.name ?? "").localeCompare(b.name ?? "", "id"));
  }, [participants]);

  const run = async (action: JumpaModerationAction, target?: Participant, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(`${action}:${target?.identity ?? ""}`);
    const r = await moderate(action, target?.identity);
    setBusy(null);
    setOpenFor(null);
    if (r.ok) toast("Berhasil.", "ok");
  };

  const roomToggles: Array<{ show: boolean; label: string; icon: ReactNode; action: JumpaModerationAction; on?: boolean }> = [
    { show: can(info.isLocked ? "UNLOCK" : "LOCK"), label: info.isLocked ? "Ruang terkunci" : "Kunci ruang", icon: info.isLocked ? <Lock size={18} /> : <LockOpen size={18} />, action: info.isLocked ? "UNLOCK" : "LOCK", on: info.isLocked },
    { show: can("TOGGLE_CHAT"), label: info.chatEnabled ? "Obrolan aktif" : "Obrolan mati", icon: info.chatEnabled ? <MessageSquare size={18} /> : <MessageSquareOff size={18} />, action: "TOGGLE_CHAT", on: info.chatEnabled },
    {
      show: can(info.allowMuridScreenShare ? "DISALLOW_MURID_SCREEN" : "ALLOW_MURID_SCREEN"),
      label: "Murid boleh berbagi layar",
      icon: <MonitorUp size={18} />,
      action: info.allowMuridScreenShare ? "DISALLOW_MURID_SCREEN" : "ALLOW_MURID_SCREEN",
      on: info.allowMuridScreenShare,
    },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
      {(roomToggles.some((t) => t.show) || canInviteAny) && (
        <div className="mb-3 grid gap-1">
          {roomToggles.filter((t) => t.show).map((t) => (
            <button key={t.action} type="button" role="switch" aria-checked={Boolean(t.on)} className="jumpa-menu-item" disabled={busy !== null} onClick={() => void run(t.action)}>
              {t.icon} {t.label}
              <span className="jumpa-switch ml-auto" data-on={Boolean(t.on)} aria-hidden />
            </button>
          ))}
          {canInviteAny && (
            <button type="button" className="jumpa-menu-item" onClick={onInvite}>
              <UserPlus size={18} /> Undang peserta
            </button>
          )}
        </div>
      )}

      {queue.length > 0 && (
        <section aria-label="Antrean angkat tangan" className="mb-3 rounded-2xl border border-[var(--jp-line)] p-2">
          <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--clr-warning)]">
            <Hand size={12} className="mr-1 inline align-[-1px]" /> Angkat tangan · {queue.length}
          </p>
          <ol>
            {queue.map((h, i) => (
              <li key={h.userId} className="flex items-center gap-2 rounded-xl px-2 py-1.5">
                <span className="w-5 text-center text-xs font-bold text-[var(--jp-text-3)]">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{h.p.isLocal ? "Kamu" : h.p.name || "Peserta"}</span>
                {isHostish && !h.p.isLocal && (
                  <button type="button" className="jumpa-chip" onClick={() => lowerHand(h.userId)}>
                    Turunkan
                  </button>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--jp-text-3)]">
        <Users size={12} className="mr-1 inline align-[-1px]" /> Di ruang · {participants.length}
      </p>
      <ul>
        {sorted.map((p) => {
          const meta = parseParticipantMeta(p.metadata);
          const actions = p.isLocal ? [] : personActions(p).filter((a) => can(a.action, p));
          const name = p.name || "Peserta";
          return (
            <li key={p.identity} className="relative">
              <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
                <span className="jumpa-avatar h-10 w-10 shrink-0 text-sm">{initials(name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {p.isLocal ? `${name} (Kamu)` : name}
                    {hands.has(p.identity) && <Hand size={14} className="ml-1 inline align-[-2px] text-[var(--clr-warning)]" aria-label="Angkat tangan" />}
                  </span>
                  <span className="mt-0.5 flex gap-1">
                    {meta.roomRole === "HOST" && <span className="jumpa-badge" data-role="HOST">Host</span>}
                    {meta.roomRole === "COHOST" && <span className="jumpa-badge" data-role="HOST">Co-host</span>}
                    {meta.bcRole && <span className="jumpa-badge" data-role={meta.bcRole}>{meta.bcRole === "GURU" ? "Guru" : "Murid"}</span>}
                  </span>
                </span>
                {p.isMicrophoneEnabled ? <Mic size={16} className="text-[var(--jp-text-3)]" aria-label="Mikrofon nyala" /> : <MicOff size={16} className="text-[var(--jp-danger)]" aria-label="Mikrofon mati" />}
                {actions.length > 0 && (
                  <button
                    type="button"
                    className="jumpa-icon-btn"
                    aria-haspopup="menu"
                    aria-expanded={openFor === p.identity}
                    aria-label={`Tindakan untuk ${name}`}
                    onClick={() => setOpenFor((v) => (v === p.identity ? null : p.identity))}
                  >
                    <MoreVertical size={18} />
                  </button>
                )}
              </div>
              {openFor === p.identity && (
                  <div role="menu" className="jumpa-in-fade overflow-hidden rounded-2xl bg-[var(--jp-glass-strong)]">
                    {actions.map((a) => (
                      <button
                        key={a.action}
                        type="button"
                        role="menuitem"
                        className="jumpa-menu-item !min-h-[46px] !text-sm"
                        data-danger={a.danger ? "true" : undefined}
                        disabled={busy !== null}
                        onClick={() => void run(a.action, p, a.confirm)}
                      >
                        {busy === `${a.action}:${p.identity}` ? <Loader2 size={18} className="animate-spin" /> : a.icon} {a.label}
                      </button>
                    ))}
                  </div>
                )}
            </li>
          );
        })}
      </ul>

      {can("END") && (
        <button
          type="button"
          className="jumpa-danger mt-4 w-full"
          disabled={busy !== null}
          onClick={() => void run("END", undefined, "Akhiri ruang untuk semua peserta? Semua akan dikeluarkan.")}
        >
          <PhoneOff size={18} /> Akhiri untuk semua
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════ Undang ═══════════════════════════════════

interface Candidates {
  groups: Array<{ id: string; name: string; members: number; invited: boolean }>;
  communities: Array<{ id: string; name: string; members: number; invited: boolean }>;
  canLink: boolean;
}

export function InvitePanel() {
  const { info, self, api, toast } = useJumpa();
  const base = `/api/jumpa/rooms/${encodeURIComponent(info.code)}/invites`;
  const canInvite = self.bcRole === "GURU" && self.roomRole !== "MEMBER" && info.kind !== "MURID";
  const [cands, setCands] = useState<Candidates | null>(null);
  const [copied, setCopied] = useState<"room" | "link" | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; role: "GURU" | "MURID" }>>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!canInvite) return;
    void api(base).then((r) => {
      if (r.ok) setCands(r.data as unknown as Candidates);
    });
  }, [api, base, canInvite]);

  useEffect(() => {
    if (!canInvite || q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      void api(`${base}?q=${encodeURIComponent(q.trim())}`).then((r) => {
        if (r.ok && Array.isArray(r.data.users)) setResults(r.data.users as typeof results);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [api, base, canInvite, q]);

  const copy = async (text: string, which: "room" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      toast("Tidak bisa menyalin. Salin manual dari bilah alamat.", "warn");
    }
  };

  const invite = async (key: string, body: Record<string, string>) => {
    setBusy(key);
    const r = await api(base, { method: "POST", body: JSON.stringify(body) });
    setBusy(null);
    if (!r.ok) return toast(r.message, "warn");
    if (typeof r.data.path === "string") {
      await copy(`${window.location.origin}${r.data.path}`, "link");
      toast("Tautan undangan guru (24 jam) tersalin.", "ok");
      return;
    }
    setDone((s) => new Set(s).add(key));
    const n = typeof r.data.notified === "number" ? r.data.notified : 0;
    toast(n > 0 ? `Undangan terkirim ke ${n} orang.` : "Sudah diundang sebelumnya.", "ok");
  };

  const InviteBtn = ({ k, invited, body }: { k: string; invited?: boolean; body: Record<string, string> }) => {
    const isDone = invited || done.has(k);
    return (
      <button type="button" className="jumpa-chip" data-done={isDone} disabled={isDone || busy !== null} onClick={() => void invite(k, body)}>
        {busy === k ? <Loader2 size={14} className="animate-spin" /> : isDone ? <Check size={14} /> : <UserPlus size={14} />}
        {isDone ? "Diundang" : "Undang"}
      </button>
    );
  };

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
      <section>
        <p className="jumpa-section-label">Tautan ruang</p>
        <button type="button" className="jumpa-menu-item !px-3" onClick={() => void copy(`${window.location.origin}/jumpa/${info.code}`, "room")}>
          {copied === "room" ? <Check size={18} className="text-[var(--jp-accent)]" /> : <Copy size={18} />}
          <span className="min-w-0 flex-1 truncate">{copied === "room" ? "Tautan tersalin" : `…/jumpa/${info.code}`}</span>
        </button>
        <p className="px-3 text-xs text-[var(--jp-text-3)]">
          {info.kind === "MURID"
            ? "Hanya teman sekelas yang bisa masuk."
            : info.kind === "KELAS"
              ? "Hanya murid kelas ini & yang diundang yang bisa masuk."
              : "Hanya guru anggota komunitas & yang diundang yang bisa masuk."}
        </p>
        {canInvite && cands?.canLink && (
          <button type="button" className="jumpa-menu-item !px-3" disabled={busy !== null} onClick={() => void invite("link", { kind: "LINK" })}>
            {copied === "link" ? <Check size={18} className="text-[var(--jp-accent)]" /> : <UserPlus size={18} />} Buat tautan undangan guru (24 jam)
          </button>
        )}
      </section>

      {canInvite && cands && cands.groups.length > 0 && (
        <section>
          <p className="jumpa-section-label">Kelas lain dari KelasKu</p>
          {cands.groups.map((g) => (
            <div key={g.id} className="flex items-center gap-2 rounded-xl px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{g.name}</span>
              <span className="text-xs text-[var(--jp-text-3)]">{g.members} murid</span>
              <InviteBtn k={`g:${g.id}`} invited={g.invited} body={{ kind: "GROUP", groupId: g.id }} />
            </div>
          ))}
        </section>
      )}

      {canInvite && cands && cands.communities.length > 0 && (
        <section>
          <p className="jumpa-section-label">Komunitas MGMP</p>
          {cands.communities.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name}</span>
              <span className="text-xs text-[var(--jp-text-3)]">{c.members} anggota</span>
              <InviteBtn k={`c:${c.id}`} invited={c.invited} body={{ kind: "COMMUNITY", communityId: c.id }} />
            </div>
          ))}
        </section>
      )}

      {canInvite && (
        <section>
          <p className="jumpa-section-label">{info.kind === "KELAS" ? "Undang guru atau murid kelasmu" : "Undang guru"}</p>
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--jp-text-3)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama…" aria-label="Cari nama" className="jumpa-input w-full !pl-9" />
          </label>
          {results.map((u) => (
            <div key={u.id} className="flex items-center gap-2 rounded-xl px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{u.name}</span>
              <span className="jumpa-badge" data-role={u.role}>{u.role === "GURU" ? "Guru" : "Murid"}</span>
              <InviteBtn k={`u:${u.id}`} body={{ kind: "USER", userId: u.id }} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// ═══════════════════════════════ Laporkan ═════════════════════════════════

export function ReportPanel({ onDone }: { onDone: () => void }) {
  const { info, api, toast, self } = useJumpa();
  const participants = useParticipants();
  const [category, setCategory] = useState<string>("");
  const [who, setWho] = useState("");
  const [desc, setDesc] = useState("");
  const [sending, setSending] = useState(false);
  const others = participants.filter((p) => !p.isLocal);

  const submit = async () => {
    if (!category) return;
    setSending(true);
    const r = await api(`/api/jumpa/rooms/${encodeURIComponent(info.code)}/report`, {
      method: "POST",
      body: JSON.stringify({ category, description: desc || undefined, reportedUserId: who || undefined }),
    });
    setSending(false);
    if (!r.ok) return toast(r.message, "warn");
    toast(self.bcRole === "MURID" ? "Laporan terkirim ke guru kelas & admin. Terima kasih sudah berani melapor." : "Laporan terkirim ke admin.", "ok");
    onDone();
  };

  return (
    <form
      className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="text-sm text-[var(--jp-text-2)]">
        Laporan bersifat rahasia — orang yang dilaporkan tidak diberi tahu. Cuplikan obrolan terakhir ikut tersimpan sebagai bukti.
      </p>
      <fieldset className="grid gap-1">
        <legend className="jumpa-section-label">Apa yang terjadi?</legend>
        {Object.entries(JUMPA_REPORT_CATEGORIES).map(([k, label]) => (
          <label key={k} className="jumpa-menu-item !min-h-[46px] cursor-pointer !text-sm" data-checked={category === k}>
            <input type="radio" name="category" value={k} checked={category === k} onChange={() => setCategory(k)} className="accent-[var(--jp-accent)]" />
            {label}
          </label>
        ))}
      </fieldset>
      {others.length > 0 && (
        <label className="block">
          <span className="jumpa-section-label">Siapa? (opsional)</span>
          <select value={who} onChange={(e) => setWho(e.target.value)} className="jumpa-input w-full">
            <option value="">— Tidak spesifik —</option>
            {others.map((p) => (
              <option key={p.identity} value={p.identity}>
                {p.name || "Peserta"}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        <span className="jumpa-section-label">Ceritakan singkat (opsional)</span>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value.slice(0, 1000))} rows={3} className="jumpa-input w-full resize-none" />
      </label>
      <button type="submit" className="jumpa-primary w-full" disabled={!category || sending}>
        {sending ? <Loader2 size={18} className="animate-spin" /> : <Flag size={18} />} Kirim laporan
      </button>
    </form>
  );
}
