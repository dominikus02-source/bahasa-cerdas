"use client";

/** JUMPA Fase 2 — panel pantau minimal (log ruang & laporan). */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, ChevronRight, Clock, Flag, Loader2, MessageSquare, RotateCcw, Users, X } from "lucide-react";
import type { PantauDetail, PantauReport, PantauRoomRow } from "@/lib/jumpa/pantau";

const KIND = { KELAS: "Kelas", GURU: "Guru", MURID: "Belajar bareng" } as Record<string, string>;
const STATUS = { SCHEDULED: "Belum mulai", LIVE: "Berlangsung", ENDED: "Selesai" } as Record<string, string>;
const END = { HOST: "diakhiri pemandu", TIME_LIMIT: "waktu habis", EMPTY: "kosong", STALE: "tidak dipakai" } as Record<string, string>;

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}
function dur(sec: number): string {
  const m = Math.round(sec / 60);
  return m < 60 ? `${m} mnt` : `${Math.floor(m / 60)} j ${m % 60} mnt`;
}

function ReportCard({ r }: { r: PantauReport }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = async (status: "REVIEWED" | "DISMISSED" | "OPEN") => {
    setBusy(status);
    setErr(null);
    const res = await fetch(`/api/jumpa/reports/${encodeURIComponent(r.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).catch(() => null);
    setBusy(null);
    if (!res?.ok) return setErr("Gagal menyimpan. Coba lagi.");
    router.refresh();
  };
  return (
    <li className="jumpa-glass rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="jumpa-badge" data-role="HOST"><Flag size={10} className="mr-1 inline" />{r.categoryLabel}</span>
        <span className="text-xs text-[var(--jp-text-3)]">{fmt(r.createdAt)}</span>
        <span className="ml-auto text-xs font-semibold text-[var(--jp-text-2)]">{r.status === "OPEN" ? "Terbuka" : r.status === "REVIEWED" ? "Ditinjau" : "Diabaikan"}</span>
      </div>
      <p className="mt-2 text-sm">
        <b>{r.reporterName}</b> melapor{r.reportedName ? <> tentang <b>{r.reportedName}</b></> : null} di{" "}
        <Link href={`/jumpa/pantau?ruang=${r.roomCode}`} className="font-semibold text-[var(--jp-accent)] hover:underline">{r.roomTitle}</Link>
      </p>
      {r.description && <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--jp-text-2)]">“{r.description}”</p>}
      {r.snapshot.length > 0 && (
        <button type="button" className="mt-2 text-xs font-semibold text-[var(--jp-accent)]" onClick={() => setOpen((v) => !v)}>
          {open ? "Sembunyikan" : `Lihat cuplikan obrolan (${r.snapshot.length})`}
        </button>
      )}
      {open && (
        <ol className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl bg-[var(--jp-glass-strong)] p-3 text-xs">
          {r.snapshot.map((m, i) => (
            <li key={i} className={m.deleted ? "text-[var(--jp-text-3)] line-through" : ""}>
              <b>{m.name}</b> <span className="text-[var(--jp-text-3)]">{fmt(m.at)}</span>: {m.content} {m.deleted && <em>(dihapus)</em>}
            </li>
          ))}
        </ol>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {r.status === "OPEN" ? (
          <>
            <button type="button" className="jumpa-chip" disabled={busy !== null} onClick={() => void set("REVIEWED")}>
              {busy === "REVIEWED" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Tandai ditinjau
            </button>
            <button type="button" className="jumpa-chip" disabled={busy !== null} onClick={() => void set("DISMISSED")}>
              {busy === "DISMISSED" ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Abaikan
            </button>
          </>
        ) : (
          <button type="button" className="jumpa-chip" disabled={busy !== null} onClick={() => void set("OPEN")}>
            <RotateCcw size={14} /> Buka lagi
          </button>
        )}
      </div>
      {err && <p className="mt-2 text-xs text-[var(--clr-warning)]">{err}</p>}
    </li>
  );
}

export function PantauOverview({ rooms, reports, backHref }: { rooms: PantauRoomRow[]; reports: PantauReport[]; backHref: string }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col gap-6 px-4 pb-10 pt-[max(20px,env(safe-area-inset-top))] sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--jp-accent)]">JUMPA · Pantau</p>
          <h1 className="text-2xl font-extrabold">Log ruang & laporan</h1>
        </div>
        <Link href={backHref} className="jumpa-ghost !min-h-[44px]"><ArrowLeft size={16} /> Kembali</Link>
      </header>

      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-[.12em] text-[var(--clr-warning)]">
          <AlertTriangle size={16} /> Laporan terbuka · {reports.length}
        </h2>
        {reports.length === 0 ? (
          <p className="jumpa-glass rounded-2xl px-4 py-6 text-center text-sm text-[var(--jp-text-2)]">Tidak ada laporan terbuka.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2">{reports.map((r) => <ReportCard key={r.id} r={r} />)}</ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-[.12em] text-[var(--jp-text-3)]">Ruang 30 hari terakhir</h2>
        {rooms.length === 0 ? (
          <p className="jumpa-glass rounded-2xl px-4 py-6 text-center text-sm text-[var(--jp-text-2)]">Belum ada ruang.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {rooms.map((r) => (
              <li key={r.code}>
                <Link href={`/jumpa/pantau?ruang=${r.code}`} className="jumpa-glass jumpa-room-row flex items-center gap-3 rounded-2xl px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block break-words font-semibold">{r.title}</span>
                    <span className="block break-words text-xs text-[var(--jp-text-3)]">
                      {KIND[r.kind]} · {r.creatorName}{r.groupName ? ` · ${r.groupName}` : ""} · {fmt(r.createdAt)}
                    </span>
                  </span>
                  <span className="hidden items-center gap-1 text-xs text-[var(--jp-text-2)] sm:inline-flex"><Users size={14} /> {r.participants}</span>
                  {r.openReports > 0 && <span className="jumpa-badge" data-role="HOST">{r.openReports} laporan</span>}
                  {r.status === "LIVE" ? <span className="jumpa-live">Berlangsung</span> : <span className="text-xs text-[var(--jp-text-3)]">{STATUS[r.status]}</span>}
                  <ChevronRight size={18} className="text-[var(--jp-text-3)]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export function PantauRoom({ d }: { d: PantauDetail }) {
  const r = d.room;
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col gap-5 px-4 pb-10 pt-[max(20px,env(safe-area-inset-top))] sm:px-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--jp-accent)]">JUMPA · {KIND[r.kind]}</p>
          <h1 className="truncate text-2xl font-extrabold">{r.title}</h1>
          <p className="mt-1 text-sm text-[var(--jp-text-2)]">
            {r.creatorName}{r.groupName ? ` · ${r.groupName}` : ""} · {STATUS[r.status]}{r.endReason ? ` (${END[r.endReason] ?? r.endReason})` : ""}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--jp-text-3)]"><Clock size={12} /> Mulai {fmt(r.startedAt)} · Selesai {fmt(r.endedAt)} · Batas {r.maxDurationMin} mnt</p>
        </div>
        <Link href="/jumpa/pantau" className="jumpa-ghost !min-h-[44px] shrink-0"><ArrowLeft size={16} /> Semua</Link>
      </header>

      {d.reports.length > 0 && (
        <section>
          <h2 className="jumpa-section-label">Laporan · {d.reports.length}</h2>
          <ul className="grid grid-cols-1 gap-2">{d.reports.map((x) => <ReportCard key={x.id} r={x} />)}</ul>
        </section>
      )}

      <section>
        <h2 className="jumpa-section-label"><Users size={12} className="mr-1 inline" /> Kehadiran · {d.participants.length}</h2>
        <div className="jumpa-glass overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-[var(--jp-text-3)]">
              <tr><th className="px-4 py-2">Nama</th><th className="px-2 py-2">Peran</th><th className="px-2 py-2">Masuk</th><th className="px-2 py-2">Durasi</th><th className="px-2 py-2">Akses</th></tr>
            </thead>
            <tbody>
              {d.participants.map((p, i) => (
                <tr key={i} className="border-t border-[var(--jp-line)]">
                  <td className="px-4 py-2 font-semibold">{p.name}{p.removed && <span className="ml-2 text-xs text-[var(--jp-danger)]">dikeluarkan</span>}</td>
                  <td className="px-2 py-2">{p.roomRole}</td>
                  <td className="px-2 py-2">{p.joinCount}×</td>
                  <td className="px-2 py-2">{dur(p.totalSeconds)}</td>
                  <td className="px-2 py-2 text-xs text-[var(--jp-text-3)]">{p.accessVia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="jumpa-section-label"><MessageSquare size={12} className="mr-1 inline" /> Obrolan · {d.chat.length}</h2>
        {d.chat.length === 0 ? (
          <p className="jumpa-glass rounded-2xl px-4 py-4 text-sm text-[var(--jp-text-2)]">Tidak ada obrolan (atau sudah melewati masa simpan 90 hari).</p>
        ) : (
          <ol className="jumpa-glass max-h-[50vh] space-y-1.5 overflow-y-auto rounded-2xl p-4 text-sm">
            {d.chat.map((m) => (
              <li key={m.id} className={m.deleted ? "text-[var(--jp-text-3)]" : ""}>
                <span className="text-xs text-[var(--jp-text-3)]">{fmt(m.at)}</span> <b>{m.name}</b>: <span className={m.deleted ? "line-through" : ""}>{m.content}</span>
                {m.deleted && <em className="ml-1 text-xs">(dihapus)</em>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="jumpa-section-label">Aktivitas</h2>
        <ol className="jumpa-glass max-h-[40vh] space-y-1 overflow-y-auto rounded-2xl p-4 text-xs text-[var(--jp-text-2)]">
          {d.events.map((e, i) => (
            <li key={i}>{fmt(e.at)} · <b>{e.actorName ?? "Sistem"}</b> · {e.action}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
