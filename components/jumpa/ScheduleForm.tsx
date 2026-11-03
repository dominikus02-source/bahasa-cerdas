"use client";

/** Jadwal JUMPA sederhana: judul, tanggal, jam WIB, durasi; bagikan setelah tersimpan. */
import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarClock, Loader2, Share2, Trash2 } from "lucide-react";
import type { ScheduleFormData } from "@/lib/jumpa/scheduling";
import { formatWib, toWibParts } from "@/lib/jumpa/schedule";
import ShareSheet, { type ShareTarget } from "./ShareSheet";
import { minutesLabel } from "./entry-format";

type Kind = "KELAS" | "GURU";
export interface ScheduleEditing {
  code: string;
  title: string;
  kind: Kind;
  scheduledAt: string;
  durationMin: number;
}
function defaultStart(now = new Date()) {
  return toWibParts(new Date(Math.ceil((now.getTime() + 60 * 60_000) / (30 * 60_000)) * 30 * 60_000));
}
export default function ScheduleForm({ data, editing, backHref }: { data: ScheduleFormData; initialGroupId?: string | null; editing?: ScheduleEditing | null; backHref: string }) {
  const router = useRouter();
  const start = useMemo(() => editing ? toWibParts(new Date(editing.scheduledAt)) : defaultStart(), [editing]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState(start.time);
  const [duration, setDuration] = useState(editing?.durationMin ?? Math.min(45, data.limits.GURU));
  const [busy, setBusy] = useState<"save" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; title: string; scheduledAt: string; invited: number; cancelled?: boolean } | null>(null);
  const [share, setShare] = useState<ShareTarget | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const kind: Kind = editing?.kind ?? "GURU";
  const durations = data.durations[kind];
  const today = useMemo(() => toWibParts(new Date()).date, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy("save"); setError(null);
    try {
      const response = editing
        ? await fetch(`/api/jumpa/rooms/${encodeURIComponent(editing.code)}/jadwal`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, time, durationMin: duration }) })
        : await fetch("/api/jumpa/jadwal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "GURU", title: title.trim() || undefined, date, time, durationMin: duration, notifyClass: false }) });
      const body = await response.json().catch(() => null) as { code?: string; title?: string; scheduledAt?: string; invited?: number; error?: string } | null;
      if (!response.ok || !body?.code || !body.scheduledAt) { setError(body?.error ?? "Jadwal belum tersimpan. Coba lagi."); return; }
      setDone({ code: body.code, title: body.title ?? title, scheduledAt: body.scheduledAt, invited: body.invited ?? 0 });
    } catch { setError("Koneksi bermasalah. Coba lagi."); }
    finally { setBusy(null); }
  };
  const cancel = async () => {
    if (!editing) return;
    setBusy("cancel"); setError(null);
    try {
      const response = await fetch(`/api/jumpa/rooms/${encodeURIComponent(editing.code)}/jadwal`, { method: "DELETE" });
      const body = await response.json().catch(() => null) as { notified?: number; error?: string } | null;
      if (!response.ok) { setError(body?.error ?? "Jadwal belum bisa dibatalkan."); return; }
      setDone({ code: editing.code, title: editing.title, scheduledAt: editing.scheduledAt, invited: body?.notified ?? 0, cancelled: true });
    } catch { setError("Koneksi bermasalah. Coba lagi."); }
    finally { setBusy(null); setConfirmCancel(false); }
  };
  if (done) return (
    <section className="jumpa-in-up rounded-bc-card border border-bc-line bg-bc-surface p-6 text-center shadow-sm" aria-live="polite">
      <span className="jumpa-empty-icon mx-auto" aria-hidden>{done.cancelled ? <Trash2 size={26} /> : <CalendarCheck size={26} />}</span>
      <h2 className="mt-3 text-xl font-bold">{done.cancelled ? "JUMPA dibatalkan" : editing ? "Jadwal diperbarui" : "JUMPA terjadwal"}</h2>
      <p className="mt-2 text-sm text-bc-text-2">{done.title}</p>
      <p className="mt-1 font-semibold">{formatWib(new Date(done.scheduledAt), new Date())}</p>
      {!done.cancelled && <p className="mt-3 text-sm text-bc-text-2">Bagikan tautan kepada peserta yang ingin diundang.</p>}
      <div className="mt-5 grid gap-2.5">
        {!done.cancelled && <button type="button" className="jumpa-primary jumpa-guru" onClick={() => setShare({ code: done.code, title: done.title, kind, scheduledAt: done.scheduledAt, canLink: kind === "GURU" })}><Share2 size={18} /> Bagikan tautan</button>}
        <Link href="/jumpa/riwayat" className="jumpa-ghost">Lihat semua jadwal</Link>
        <button type="button" className="jumpa-ghost" onClick={() => router.push(backHref)}>Selesai</button>
      </div>
      {share && <ShareSheet target={share} onClose={() => setShare(null)} />}
    </section>
  );
  return (
    <form onSubmit={submit} className="jumpa-in-up grid gap-5 rounded-bc-card border border-bc-line bg-bc-surface p-4 shadow-sm sm:p-6">
      <div><h2 className="text-base font-bold text-bc-text">Detail jadwal</h2><p className="mt-1 text-sm text-bc-text-2">Isi waktu pertemuan, lalu bagikan tautan setelah tersimpan.</p></div>
      {!editing && <label className="jumpa-field"><span className="jumpa-field-label">Nama pertemuan (opsional)</span><input className="jumpa-input w-full" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Rapat koordinasi" autoComplete="off" /></label>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="jumpa-field min-w-0"><span className="jumpa-field-label">Tanggal</span><input type="date" className="jumpa-input jumpa-date w-full" value={date} min={today} onChange={(e) => setDate(e.target.value)} required /></label>
        <label className="jumpa-field min-w-0"><span className="jumpa-field-label">Jam (WIB)</span><input type="time" className="jumpa-input jumpa-date w-full" value={time} step={300} onChange={(e) => setTime(e.target.value)} required /></label>
      </div>
      <fieldset className="jumpa-field"><legend className="jumpa-field-label mb-1.5">Durasi</legend><div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Durasi">{durations.map((d) => <button key={d} type="button" role="radio" aria-checked={duration === d} className="jumpa-chip jumpa-dur" onClick={() => setDuration(d)}>{minutesLabel(d)}</button>)}</div><span className="jumpa-field-note">Maksimal {minutesLabel(data.limits[kind])}</span></fieldset>
      {error && <p role="alert" className="text-sm text-[var(--clr-danger)]">{error}</p>}
      <button type="submit" className="jumpa-primary jumpa-guru w-full" disabled={busy !== null}>{busy === "save" ? <Loader2 size={18} className="animate-spin" /> : <CalendarClock size={18} />}{editing ? "Simpan perubahan" : "Jadwalkan JUMPA"}</button>
      {editing && (confirmCancel ? <div className="grid gap-2 rounded-2xl border border-bc-line p-3"><p className="text-sm font-semibold">Batalkan jadwal ini?</p><button type="button" className="jumpa-ghost" disabled={busy !== null} onClick={() => void cancel()}>{busy === "cancel" ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />} Ya, batalkan</button><button type="button" className="jumpa-ghost" onClick={() => setConfirmCancel(false)}>Tidak</button></div> : <button type="button" className="jumpa-ghost" onClick={() => setConfirmCancel(true)}><Trash2 size={18} /> Batalkan JUMPA</button>)}
    </form>
  );
}
