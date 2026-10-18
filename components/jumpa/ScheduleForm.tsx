"use client";

/**
 * Formulir jadwal JUMPA (guru): judul, tanggal & jam WIB, durasi dalam batas
 * paket, kelas / komunitas / orang tertentu. Juga mode ubah/batal jadwal.
 * Validasi akhir selalu di server (lib/jumpa/schedule.ts).
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarClock, Check, GraduationCap, Loader2, Plus, Search, Share2, Trash2, Users, X } from "lucide-react";
import type { ScheduleFormData } from "@/lib/jumpa/scheduling";
import { formatWib, toWibParts } from "@/lib/jumpa/schedule";
import ShareSheet, { type ShareTarget } from "./ShareSheet";
import { minutesLabel } from "./entry-format";
import NotifyClassToggle from "./NotifyClassToggle";

type Kind = "KELAS" | "GURU";

export interface ScheduleEditing {
  code: string;
  title: string;
  kind: Kind;
  scheduledAt: string;
  durationMin: number;
}

function defaultStart(now = new Date()): { date: string; time: string } {
  // Jam bulat berikutnya (+1 jam), WIB.
  const t = new Date(Math.ceil((now.getTime() + 60 * 60_000) / (30 * 60_000)) * 30 * 60_000);
  return toWibParts(t);
}

export default function ScheduleForm({ data, initialGroupId, editing, backHref }: { data: ScheduleFormData; initialGroupId?: string | null; editing?: ScheduleEditing | null; backHref: string }) {
  const router = useRouter();
  const start = useMemo(() => (editing ? toWibParts(new Date(editing.scheduledAt)) : defaultStart()), [editing]);
  const [kind, setKind] = useState<Kind>(editing?.kind ?? (data.groups.length ? "KELAS" : "GURU"));
  const [groupId, setGroupId] = useState(initialGroupId && data.groups.some((g) => g.id === initialGroupId) ? initialGroupId : data.groups[0]?.id ?? "");
  const [communityId, setCommunityId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState(start.time);
  const durations = data.durations[kind];
  const [duration, setDuration] = useState(editing?.durationMin ?? Math.min(45, data.limits[kind]));
  const [extraGroups, setExtraGroups] = useState<string[]>([]);
  // "Beri tahu kelas" (nyala bawaan). Mati = tanpa notifikasi kelas/komunitas.
  const [notify, setNotify] = useState(true);
  const [people, setPeople] = useState<Array<{ id: string; name: string; role: "GURU" | "MURID" }>>([]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Array<{ id: string; name: string; role: "GURU" | "MURID" }>>([]);
  const [busy, setBusy] = useState<"save" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; title: string; scheduledAt: string; invited: number; cancelled?: boolean } | null>(null);
  const [share, setShare] = useState<ShareTarget | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const searchTimer = useRef<number | null>(null);
  const today = useMemo(() => toWibParts(new Date()).date, []);

  useEffect(() => {
    if (!durations.includes(duration)) setDuration(durations[Math.min(2, durations.length - 1)]);
  }, [kind, durations, duration]);

  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { setFound([]); return; }
    searchTimer.current = window.setTimeout(() => {
      fetch(`/api/jumpa/orang?jenis=${kind}&q=${encodeURIComponent(q.trim())}`)
        .then((r) => (r.ok ? r.json() : { users: [] }))
        .then((d: { users: Array<{ id: string; name: string; role: "GURU" | "MURID" }> }) => setFound(d.users ?? []))
        .catch(() => setFound([]));
    }, 300);
  }, [q, kind]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("save");
    setError(null);
    try {
      const res = editing
        ? await fetch(`/api/jumpa/rooms/${encodeURIComponent(editing.code)}/jadwal`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, time, durationMin: duration }) })
        : await fetch("/api/jumpa/jadwal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind,
              groupId: kind === "KELAS" ? groupId || undefined : undefined,
              communityId: kind === "GURU" ? communityId || undefined : undefined,
              title: title.trim() || undefined,
              date,
              time,
              durationMin: duration,
              extraGroupIds: kind === "KELAS" ? extraGroups : undefined,
              userIds: people.map((p) => p.id),
              notifyClass: notify,
            }),
          });
      const body = (await res.json().catch(() => null)) as { code?: string; title?: string; scheduledAt?: string; invited?: number; error?: string } | null;
      if (!res.ok || !body?.code || !body.scheduledAt) { setError(body?.error ?? "Jadwal belum tersimpan. Coba lagi."); return; }
      setDone({ code: body.code, title: body.title ?? title, scheduledAt: body.scheduledAt, invited: body.invited ?? 0 });
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!editing) return;
    setBusy("cancel");
    setError(null);
    try {
      const res = await fetch(`/api/jumpa/rooms/${encodeURIComponent(editing.code)}/jadwal`, { method: "DELETE" });
      const body = (await res.json().catch(() => null)) as { notified?: number; error?: string } | null;
      if (!res.ok) { setError(body?.error ?? "Belum bisa dibatalkan."); return; }
      setDone({ code: editing.code, title: editing.title, scheduledAt: editing.scheduledAt, invited: body?.notified ?? 0, cancelled: true });
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(null);
      setConfirmCancel(false);
    }
  };

  if (done) {
    return (
      <section className="jumpa-card jumpa-lobby-info jumpa-in-up text-center" aria-live="polite">
        <span className="jumpa-empty-icon mx-auto" aria-hidden>{done.cancelled ? <Trash2 size={26} /> : <CalendarCheck size={26} />}</span>
        <h1 className="mt-3 text-xl font-extrabold">{done.cancelled ? "JUMPA dibatalkan" : editing ? "Jadwal diperbarui" : "JUMPA terjadwal"}</h1>
        <p className="mt-1 text-sm text-[var(--jp-text-2)]">{done.title}</p>
        <p className="mt-1 text-sm font-semibold">{formatWib(new Date(done.scheduledAt), new Date())}</p>
        <p className="mt-2 text-xs text-[var(--jp-text-3)]">{done.invited > 0 ? `${done.invited} orang diberi tahu.` : "Belum ada yang diberi tahu."}</p>
        <div className="mt-5 grid gap-2.5">
          {!done.cancelled && (
            <button type="button" className="jumpa-primary" onClick={() => setShare({ code: done.code, title: done.title, kind, scheduledAt: done.scheduledAt, canLink: kind === "GURU" })}>
              <Share2 size={18} /> Bagikan
            </button>
          )}
          <Link href="/jumpa/riwayat" className="jumpa-ghost">Lihat semua jadwal</Link>
          <button type="button" className="jumpa-ghost" onClick={() => router.push(backHref)}>Selesai</button>
        </div>
        {share && <ShareSheet target={share} onClose={() => setShare(null)} />}
      </section>
    );
  }

  const otherGroups = data.groups.filter((g) => g.id !== groupId);

  return (
    <form onSubmit={submit} className="jumpa-card jumpa-lobby-info jumpa-in-up grid gap-4" noValidate>
      <div>
        <h1 className="text-2xl font-extrabold">{editing ? "Ubah jadwal" : "Jadwalkan JUMPA"}</h1>
        <p className="mt-1 text-sm text-[var(--jp-text-2)]">{editing ? editing.title : "Penerima dapat notifikasi dan pengingat 10 menit sebelumnya."}</p>
      </div>

      {!editing && (
        <>
          <div className="jumpa-seg !grid-cols-2" role="radiogroup" aria-label="Jenis JUMPA">
            <button type="button" role="radio" aria-checked={kind === "KELAS"} className="jumpa-seg-btn" disabled={data.groups.length === 0} onClick={() => setKind("KELAS")}><GraduationCap size={16} /> Kelas</button>
            <button type="button" role="radio" aria-checked={kind === "GURU"} className="jumpa-seg-btn" onClick={() => setKind("GURU")}><Users size={16} /> Ruang guru</button>
          </div>

          {kind === "KELAS" ? (
            <label className="jumpa-field">
              <span className="jumpa-field-label">Kelas</span>
              <select className="jumpa-input w-full" value={groupId} onChange={(e) => { setGroupId(e.target.value); setExtraGroups((x) => x.filter((id) => id !== e.target.value)); }}>
                {data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
          ) : (
            <label className="jumpa-field">
              <span className="jumpa-field-label">Komunitas</span>
              <select className="jumpa-input w-full" value={communityId} onChange={(e) => setCommunityId(e.target.value)}>
                <option value="">Tanpa komunitas</option>
                {data.communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}

          <label className="jumpa-field">
            <span className="jumpa-field-label">Judul</span>
            <input className="jumpa-input w-full" value={title} maxLength={80} autoComplete="off" onChange={(e) => setTitle(e.target.value)} placeholder={kind === "KELAS" ? "Mis. Teks eksposisi" : "Mis. Rapat MGMP"} />
          </label>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="jumpa-field min-w-0">
          <span className="jumpa-field-label">Tanggal</span>
          <input type="date" className="jumpa-input jumpa-date w-full" value={date} min={today} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="jumpa-field min-w-0">
          <span className="jumpa-field-label">Jam (WIB)</span>
          <input type="time" className="jumpa-input jumpa-date w-full" value={time} step={300} onChange={(e) => setTime(e.target.value)} required />
        </label>
      </div>

      <fieldset className="jumpa-field">
        <legend className="jumpa-field-label mb-1.5">Durasi</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Durasi">
          {durations.map((d) => (
            <button key={d} type="button" role="radio" aria-checked={duration === d} className="jumpa-chip jumpa-dur" onClick={() => setDuration(d)}>{minutesLabel(d)}</button>
          ))}
        </div>
        <span className="jumpa-field-note">Paket {data.tier === "PREMIUM" ? "Premium" : "Gratis"}: maks {minutesLabel(data.limits[kind])}</span>
      </fieldset>

      {!editing && (
        <>
          {kind === "KELAS" && otherGroups.length > 0 && (
            <fieldset className="jumpa-field">
              <legend className="jumpa-field-label mb-1.5">Kelas lain (opsional)</legend>
              <div className="flex flex-wrap gap-2">
                {otherGroups.map((g) => {
                  const on = extraGroups.includes(g.id);
                  return (
                    <button key={g.id} type="button" aria-pressed={on} className="jumpa-chip jumpa-dur" onClick={() => setExtraGroups((x) => (on ? x.filter((id) => id !== g.id) : [...x, g.id]))}>
                      {on ? <Check size={14} /> : <Plus size={14} />} {g.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {(kind === "KELAS" || communityId) && (
            <NotifyClassToggle
              tone="room"
              on={notify}
              onChange={setNotify}
              label={kind === "KELAS" ? "Beri tahu kelas" : "Beri tahu komunitas"}
              hintOn={kind === "KELAS" ? "Murid dapat notifikasi jadwal & pengingat." : "Anggota dapat notifikasi jadwal & pengingat."}
              hintOff={people.length ? "Hanya orang yang diundang." : kind === "KELAS" ? "Tanpa notifikasi ke murid." : "Tanpa notifikasi ke anggota."}
            />
          )}

          <div className="jumpa-field">
            <label htmlFor="jumpa-people" className="jumpa-field-label">Undang orang tertentu (opsional)</label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--jp-text-3)]" aria-hidden />
              <input id="jumpa-people" className="jumpa-input w-full !pl-10" value={q} maxLength={60} onChange={(e) => setQ(e.target.value)} placeholder={kind === "KELAS" ? "Cari guru atau murid kelasmu" : "Cari guru"} autoComplete="off" />
            </div>
            {found.length > 0 && (
              <ul className="grid gap-1.5">
                {found.filter((f) => !people.some((p) => p.id === f.id)).map((f) => (
                  <li key={f.id}>
                    <button type="button" className="jumpa-setting-row !min-h-[48px] text-left" onClick={() => { setPeople((p) => [...p, f]); setQ(""); setFound([]); }}>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.name}</span>
                      <span className="jumpa-mine">{f.role === "GURU" ? "Guru" : "Murid"}</span>
                      <Plus size={16} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {people.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {people.map((p) => (
                  <span key={p.id} className="jumpa-chip">
                    <span className="max-w-[10rem] truncate">{p.name}</span>
                    <button type="button" aria-label={`Hapus ${p.name}`} onClick={() => setPeople((x) => x.filter((y) => y.id !== p.id))}><X size={14} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {error && <p role="alert" className="text-sm text-[var(--clr-danger)]">{error}</p>}

      <button type="submit" className="jumpa-primary w-full" disabled={busy !== null || (kind === "KELAS" && !editing && !groupId)}>
        {busy === "save" ? <Loader2 size={18} className="animate-spin" /> : <CalendarClock size={18} />} {editing ? "Simpan jadwal" : "Jadwalkan"}
      </button>

      {editing && (
        confirmCancel ? (
          <div className="grid gap-2 rounded-2xl border border-[var(--jp-line-strong)] p-3">
            <p className="text-sm font-semibold">Batalkan JUMPA ini? Penerima akan diberi tahu.</p>
            <button type="button" className="jumpa-ghost !text-[var(--clr-danger)]" disabled={busy !== null} onClick={() => void cancel()}>
              {busy === "cancel" ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} Ya, batalkan
            </button>
            <button type="button" className="jumpa-ghost" onClick={() => setConfirmCancel(false)}>Tidak</button>
          </div>
        ) : (
          <button type="button" className="jumpa-ghost !text-[var(--clr-danger)]" onClick={() => setConfirmCancel(true)}><Trash2 size={18} /> Batalkan JUMPA</button>
        )
      )}
    </form>
  );
}
