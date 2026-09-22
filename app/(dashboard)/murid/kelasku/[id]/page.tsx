"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, Crown, FileText, GraduationCap, Megaphone, Pin, RotateCw, Users } from "lucide-react";
import "@/components/kelas/classroom.css";
import { humanDeadline } from "@/lib/classroom/deadline";
import { fetchWithTimeout } from "@/lib/client/fetch-with-timeout";

interface StudentClassData {
  group: {
    id: string; name: string; description?: string | null; grade: string; accessCode: string; memberCount: number;
    teacher: { fullName: string } | null;
  };
  materi: { id: string; materiId: string; title: string; description?: string | null; fileUrl?: string | null; fileType?: string | null; guru: string; createdAt: string }[];
  tugas: { id: string; judul: string; deskripsi?: string | null; jenis: string; tenggat: string | null; createdAt: string; status: string; nilai: number | null; feedback?: string | null }[];
  latihan: { id: string; quizId: string; title: string; description?: string | null; jumlahSoal: number; tenggat: string | null; notes?: string | null; status: string; nilai: number | null }[];
  pengumuman: { id: string; judul: string; deskripsi?: string | null; pinned: boolean; createdAt: string; tenggat: string | null }[];
  insight: {
    hasEvidence: boolean;
    text: string | null;
    title: string | null;
    targetSkillLabel: string | null;
    actionType: string | null;
  } | null;
}

interface Member {
  id: string; userId: string; role: string; user: { id: string; fullName: string; avatar: string | null };
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  BELUM_DIKERJAKAN: { label: "Belum dikerjakan", cls: "bc-status-belum" },
  SEDANG_DIKERJAKAN: { label: "Sedang dikerjakan", cls: "bc-status-sedang" },
  SUDAH_DIKUMPULKAN: { label: "Sudah dikumpulkan", cls: "bc-status-kumpul" },
  DINILAI: { label: "Sudah dinilai", cls: "bc-status-nilai" },
};

export default function MuridKelaskuDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<StudentClassData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [ketua, setKetua] = useState<Member | null>(null);
  const [tab, setTab] = useState<"aktivitas" | "anggota">("aktivitas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [kelasRes, memberRes] = await Promise.all([
        fetchWithTimeout(`/api/murid/kelasku/${id}`),
        fetchWithTimeout(`/api/group/${id}/student`),
      ]);
      if (!kelasRes.ok) throw new Error();
      const kelasData = await kelasRes.json();
      setData(kelasData);
      if (memberRes.ok) {
        const memberData = await memberRes.json();
        setMembers(memberData.group?.members ?? []);
        setKetua(memberData.ketua ?? null);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const stream = useMemo(() => {
    if (!data) return [];
    const items: { key: string; kind: "materi" | "tugas" | "latihan" | "pengumuman"; date: string; node: unknown; rank: number }[] = [
      ...data.materi.map((m) => ({ key: `m-${m.id}`, kind: "materi" as const, date: m.createdAt, node: m, rank: 30 })),
      ...data.tugas.map((t) => ({ key: `t-${t.id}`, kind: "tugas" as const, date: t.createdAt, node: t, rank: t.status === "BELUM_DIKERJAKAN" ? 10 : t.status === "SEDANG_DIKERJAKAN" ? 20 : 40 })),
      ...data.latihan.map((l) => ({ key: `q-${l.id}`, kind: "latihan" as const, date: l.tenggat ?? "", node: l, rank: l.status === "BELUM_DIKERJAKAN" ? 11 : l.status === "SEDANG_DIKERJAKAN" ? 21 : 41 })),
      ...data.pengumuman.map((p) => ({ key: `p-${p.id}`, kind: "pengumuman" as const, date: p.createdAt, node: p, rank: p.pinned ? 0 : 5 })),
    ];
    // STEP 6.2 — hierarki: pengumuman penting → tugas/latihan belum dikerjakan
    // → materi → aktivitas selesai. ("Untukmu" = apa yang perlu dikerjakan.)
    return items.sort((a, b) => a.rank - b.rank || new Date(b.date || a.date).getTime() - new Date(a.date || b.date).getTime());
  }, [data]);

  if (loading) {
    return (
      <div className="bc-classroom bc-student p-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-[var(--clr-text-3)]">Memuat kelas...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bc-classroom bc-student p-6">
        <div className="max-w-3xl mx-auto bc-card bc-empty">
          <p className="text-sm font-bold text-[var(--clr-text)]">Belum dapat memuat kelas.</p>
          <p className="text-xs text-[var(--clr-text-2)] mt-1">Coba lagi.</p>
          <button type="button" onClick={() => void fetchData()} className="bc-btn-primary text-sm mx-auto mt-4">
            <RotateCw size={15} /> Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const hasActivity = data.materi.length + data.tugas.length + data.latihan.length + data.pengumuman.length > 0;

  // STEP 6.4 — "Hari Ini": ringkasan yang butuh tindakan (server-derived status).
  const tugasBelum = data.tugas.filter((t) => t.status === "BELUM_DIKERJAKAN" || t.status === "SEDANG_DIKERJAKAN").length;
  const latihanBelum = data.latihan.filter((l) => l.status === "BELUM_DIKERJAKAN" || l.status === "SEDANG_DIKERJAKAN").length;
  const perluDikerjakan = tugasBelum + latihanBelum;

  return (
    <div className="bc-classroom bc-student p-4 md:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <Link href="/murid/gabung-kelas" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--clr-text-2)] hover:text-[var(--clr-accent-strong)]">
          <ArrowLeft size={16} /> Kelas Saya
        </Link>

        <div className="bc-card p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--clr-accent-strong)] bg-[var(--clr-accent-soft)] px-2.5 py-1 rounded-full">
                Kelas {data.group.grade}
              </span>
              <h1 className="text-2xl md:text-[28px] font-bold text-[var(--clr-text)] mt-2 truncate">{data.group.name}</h1>
              <p className="text-sm text-[var(--clr-text-2)] mt-1">
                {data.group.teacher ? `Guru: ${data.group.teacher.fullName}` : "Guru"}
                <span className="mx-2 text-[var(--clr-text-3)]">·</span>
                <Users size={13} className="inline -mt-0.5" /> {data.group.memberCount} siswa
              </p>
              {data.group.description && <p className="text-sm text-[var(--clr-text-2)] mt-1">{data.group.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => { navigator.clipboard.writeText(data.group.accessCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="inline-flex items-center gap-2 bg-[var(--clr-surface-2)] border border-[var(--clr-border)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--clr-text-2)] shrink-0"
            >
              <code className="font-mono">{data.group.accessCode}</code>
              {copied ? <CheckCircle2 size={15} className="text-[var(--clr-success)]" /> : <GraduationCap size={15} />}
              {copied ? "Tersalin" : "Kode kelas"}
            </button>
          </div>

          <div className="flex gap-2 mt-5 overflow-x-auto pb-1">
            <button type="button" onClick={() => setTab("aktivitas")} className={`bc-chip ${tab === "aktivitas" ? "bc-chip-active" : ""}`} aria-pressed={tab === "aktivitas"}>Aktivitas</button>
            <button type="button" onClick={() => setTab("anggota")} className={`bc-chip ${tab === "anggota" ? "bc-chip-active" : ""}`} aria-pressed={tab === "anggota"}>
              <Users size={15} /> Anggota ({data.group.memberCount})
            </button>
          </div>
        </div>

        {tab === "aktivitas" && (
          <div className="space-y-3">
            {/* STEP 6.4 — "Hari Ini" murid: satu kartu yang butuh tindakan */}
            {perluDikerjakan > 0 && (
              <div className="bc-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--clr-accent-strong)]">Hari Ini</p>
                <p className="text-sm text-[var(--clr-text)] mt-1">
                  {tugasBelum > 0 && <span><strong>{tugasBelum}</strong> tugas belum selesai</span>}
                  {tugasBelum > 0 && latihanBelum > 0 && " · "}
                  {latihanBelum > 0 && <span><strong>{latihanBelum}</strong> latihan belum selesai</span>}
                </p>
                <Link href="#mulai" className="bc-btn-primary mt-3 w-full text-sm">Mulai <span aria-hidden>→</span></Link>
              </div>
            )}

            {data.insight && (
              <div className="bc-card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--clr-accent-strong)]">
                  {data.insight.hasEvidence ? "Perkembanganmu" : "BC masih mengenalimu"}
                </p>
                <p className="text-sm text-[var(--clr-text)] mt-1.5 leading-relaxed">
                  {data.insight.hasEvidence
                    ? (data.insight.text ?? "Terus berlatih dan lihat perkembangannya di profil belajarmu.")
                    : "Selesaikan beberapa latihan lagi agar BC dapat memberikan rekomendasi yang lebih tepat."}
                </p>
                {data.insight.hasEvidence && (
                  <Link href="/arena/player/skills" className="bc-btn-primary mt-3 w-full text-sm">
                    Lihat Rekomendasimu <span aria-hidden>→</span>
                  </Link>
                )}
              </div>
            )}

            {!hasActivity ? (
              <div className="bc-card bc-empty">
                <div className="w-16 h-16 rounded-2xl bg-[var(--clr-accent-soft)] text-[var(--clr-accent-strong)] flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={28} />
                </div>
                <h2 className="text-lg font-bold text-[var(--clr-text)]">Belum ada aktivitas</h2>
                <p className="text-sm text-[var(--clr-text-2)] mt-1 max-w-sm mx-auto">
                  Guru akan mengirim materi, tugas, atau latihan di sini.
                </p>
              </div>
            ) : (
              stream.map((item) => <StreamItem key={item.key} item={item} />)
            )}
          </div>
        )}

        {tab === "anggota" && (
          <div className="bc-card p-5">
            <h3 className="text-sm font-bold text-[var(--clr-text)] mb-3 flex items-center gap-2">
              <Users size={16} className="text-[var(--clr-accent-strong)]" /> Anggota Kelas ({members.length})
            </h3>
            {ketua && (
              <div className="flex items-center gap-3 bg-[var(--clr-accent-soft)] rounded-xl px-4 py-2.5 mb-3">
                <Crown size={16} className="text-amber-400" />
                <span className="text-sm text-[var(--clr-text)]"><strong>{ketua.user.fullName}</strong> — Ketua Kelas</span>
              </div>
            )}
            <div className="space-y-2.5">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--clr-surface-2)] border border-[var(--clr-border)] flex items-center justify-center text-xs font-bold text-[var(--clr-text-2)] shrink-0">
                    {m.user.avatar ? <img src={m.user.avatar} alt={m.user.fullName} className="w-full h-full rounded-full object-cover" /> : m.user.fullName.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-[var(--clr-text)]">{m.user.fullName}</span>
                  {m.role === "ketua" && <span className="ml-auto text-[10px] font-bold text-amber-500 bg-amber-400/10 px-2 py-0.5 rounded-full">Ketua</span>}
                </div>
              ))}
              {members.length === 0 && <p className="text-xs text-[var(--clr-text-3)]">Belum ada anggota lain.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Kartu aktivitas per jenis ──────────────────────────────────────────── */

function StatusBadge({ status, nilai }: { status: string; nilai: number | null }) {
  const meta = STATUS_META[status] ?? STATUS_META.BELUM_DIKERJAKAN;
  return (
    <span className={`bc-status ${meta.cls}`}>
      {status === "DINILAI" && nilai != null ? `${meta.label} · ${nilai}` : meta.label}
    </span>
  );
}

function StreamItem({ item }: { item: { kind: "materi" | "tugas" | "latihan" | "pengumuman"; date: string; node: unknown } }) {
  const date = new Date(item.date || Date.now()).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  if (item.kind === "materi") {
    const m = item.node as StudentClassData["materi"][number];
    return (
      <div className="bc-card p-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-[var(--clr-accent-soft)] text-[var(--clr-accent-strong)] flex items-center justify-center shrink-0"><BookOpen size={18} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--clr-text-3)]">Materi</p>
            <p className="text-[15px] font-bold text-[var(--clr-text)] truncate">{m.title}</p>
            {m.description && <p className="text-sm text-[var(--clr-text-2)] mt-0.5 line-clamp-2">{m.description}</p>}
            <p className="text-xs text-[var(--clr-text-3)] mt-1.5">{m.guru} · {date}</p>
          </div>
        </div>
        <Link href={`/arena/materi?materiId=${m.materiId}`} className="bc-btn-primary mt-3 w-full text-sm">
          Baca Materi <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  if (item.kind === "tugas") {
    const t = item.node as StudentClassData["tugas"][number];
    const dl = humanDeadline(t.tenggat);
    return (
      <div className="bc-card p-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-[var(--clr-violet-soft)] text-[var(--clr-violet)] flex items-center justify-center shrink-0"><FileText size={18} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--clr-text-3)]">Tugas</p>
            <p className="text-[15px] font-bold text-[var(--clr-text)] truncate">{t.judul}</p>
            {t.deskripsi && <p className="text-sm text-[var(--clr-text-2)] mt-0.5 line-clamp-2">{t.deskripsi}</p>}
            <p className="text-xs text-[var(--clr-text-3)] mt-1.5">
              {t.tenggat ? `Deadline: ${dl.label}` : "Tanpa batas waktu"} · {date}
            </p>
            {t.status === "DINILAI" && t.feedback && (
              <p className="text-xs text-[var(--clr-text-2)] mt-2 bg-[var(--clr-surface-2)] border border-[var(--clr-border)] rounded-xl px-3 py-2 whitespace-pre-line">
                <strong className="text-[var(--clr-text)]">Feedback guru: </strong>{t.feedback}
              </p>
            )}
          </div>
          <StatusBadge status={t.status} nilai={t.nilai} />
        </div>
        <Link href={`/arena/tugas/${t.id}/kerjakan`} className="bc-btn-primary mt-3 w-full text-sm">
          {t.status === "SUDAH_DIKUMPULKAN" || t.status === "DINILAI" ? "Lihat Pengumpulan" : "Kerjakan Tugas"} <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  if (item.kind === "latihan") {
    const l = item.node as StudentClassData["latihan"][number];
    const dl = humanDeadline(l.tenggat);
    return (
      <div className="bc-card p-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-[var(--clr-violet-soft)] text-[var(--clr-violet)] flex items-center justify-center shrink-0"><GraduationCap size={18} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--clr-text-3)]">Latihan</p>
            <p className="text-[15px] font-bold text-[var(--clr-text)] truncate">{l.title}</p>
            <p className="text-xs text-[var(--clr-text-3)] mt-0.5">{l.jumlahSoal} soal{l.tenggat ? ` · ${dl.label}` : ""}</p>
          </div>
          <StatusBadge status={l.status} nilai={l.nilai} />
        </div>
        <Link href={`/murid/tugasku/${l.id}/take`} className="bc-btn-primary mt-3 w-full text-sm">
          {l.status === "SUDAH_DIKUMPULKAN" || l.status === "DINILAI" ? "Lihat Hasil" : "Mulai Latihan"} <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  const p = item.node as StudentClassData["pengumuman"][number];
  return (
    <div className={`bc-card p-4 ${p.pinned ? "border-[var(--clr-warning)]" : ""}`}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-amber-400/15 text-amber-500 flex items-center justify-center shrink-0"><Megaphone size={18} /></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--clr-text-3)]">Pengumuman</p>
            {p.pinned && <Pin size={12} className="text-amber-500" />}
          </div>
          <p className="text-[15px] font-bold text-[var(--clr-text)]">{p.judul}</p>
          {p.deskripsi && <p className="text-sm text-[var(--clr-text-2)] mt-0.5 whitespace-pre-line">{p.deskripsi}</p>}
          <p className="text-xs text-[var(--clr-text-3)] mt-1.5">{date}</p>
        </div>
      </div>
    </div>
  );
}
