"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, Clock, Loader2, Save, Search } from "lucide-react";
import "@/components/kelas/classroom.css";

interface MuridRow {
  userId: string;
  fullName: string;
  avatar: string | null;
  status: string;
  score: number | null;
  praktikUrl: string | null;
  praktikFileName: string | null;
  praktikFileType: string | null;
  praktikFileSize: number | null;
  praktikNilai: number | null;
  praktikCatatan: string | null;
  praktikDinilai: boolean;
  submittedAt: string | null;
  isLate: boolean;
}

interface ReviewData {
  id: string;
  judul: string;
  jenis: string;
  unitTitle: string;
  groupName: string;
  tenggat: string | null;
  murid: MuridRow[];
}

type FilterKey = "semua" | "belum" | "sudah" | "terlambat";

function statusLabel(m: MuridRow): string {
  if (m.praktikDinilai && m.praktikNilai != null) return `Sudah dinilai · ${m.praktikNilai}`;
  if (m.isLate) return "Terlambat";
  if (m.praktikUrl) return "Sudah dikumpulkan";
  if (m.status === "IN_PROGRESS") return "Sedang mengerjakan";
  if (m.status === "COMPLETED") return "Sudah dikumpulkan";
  return "Belum mengumpulkan";
}

function statusColor(m: MuridRow): string {
  if (m.praktikDinilai && m.praktikNilai != null) return "text-[var(--clr-accent-strong)]";
  if (m.isLate) return "text-amber-600";
  if (m.praktikUrl) return "text-[var(--clr-accent-strong)]";
  return "text-[var(--clr-text-3)]";
}

function fileIcon(m: MuridRow) {
  if (!m.praktikUrl) return null;
  if (m.praktikFileName) return <FileText size={14} />;
  return <ExternalLink size={14} />;
}

function fileLabel(m: MuridRow): string {
  if (m.praktikFileName) return m.praktikFileName;
  if (m.praktikUrl) {
    try { return new URL(m.praktikUrl).hostname; } catch { return "Tautan"; }
  }
  return "";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

/**
 * Review pengumpulan tugas (guru): daftar murid + status + buka submission
 * → nilai + catatan → simpan (reuse POST nilai-praktik).
 */
export function SubmissionReview({ penugasanId, groupId, onClose, onGraded }: { penugasanId: string; groupId: string; onClose: () => void; onGraded: () => void }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("semua");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MuridRow | null>(null);
  const [insight, setInsight] = useState<{ mode: string; skills?: { label: string; category: string; attempts: number; accuracy: number | null }[]; saran?: { text: string; targetSkillLabel: string | null } } | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [nilai, setNilai] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/guru/penugasan/${penugasanId}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [penugasanId]);

  useEffect(() => { load(); }, [load]);

  const openMurid = (m: MuridRow) => {
    setSelected(m);
    setNilai(m.praktikNilai != null ? String(m.praktikNilai) : "");
    setCatatan(m.praktikCatatan ?? "");
    setSaveError("");
    setInsight(null);
    setInsightLoading(true);
    fetch(`/api/guru/kelasku/${groupId}/insight?muridId=${m.userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInsight(d))
      .catch(() => setInsight(null))
      .finally(() => setInsightLoading(false));
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/guru/penugasan/${penugasanId}/nilai-praktik`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.userId, nilai: Number(nilai), catatan: catatan.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "fail");
      setSelected(null);
      onGraded();
      await load();
    } catch {
      setSaveError("Nilai belum berhasil disimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    let rows = data?.murid ?? [];
    const q = query.trim().toLowerCase();
    if (q) rows = rows.filter((m) => m.fullName.toLowerCase().includes(q));
    if (filter === "belum") rows = rows.filter((m) => !m.praktikUrl && m.status !== "COMPLETED");
    if (filter === "sudah") rows = rows.filter((m) => Boolean(m.praktikUrl) || m.status === "COMPLETED");
    if (filter === "terlambat") rows = rows.filter((m) => m.isLate);
    return rows;
  }, [data, filter, query]);

  const sudahCount = data?.murid.filter((m) => m.praktikUrl || m.status === "COMPLETED").length ?? 0;
  const terlambatCount = data?.murid.filter((m) => m.isLate).length ?? 0;

  return (
    <div className="bc-card p-4 md:p-5 space-y-4">
      <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--clr-text-2)] hover:text-[var(--clr-accent-strong)]">
        <ArrowLeft size={16} /> Kembali ke Kelas
      </button>

      {loading ? (
        <p className="text-sm text-[var(--clr-text-3)] text-center py-8">Memuat pengumpulan...</p>
      ) : error || !data ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-sm font-bold text-[var(--clr-text)]">Belum dapat memuat pengumpulan.</p>
          <p className="text-xs text-[var(--clr-text-2)]">Coba lagi.</p>
          <button type="button" onClick={load} className="bc-btn-secondary text-xs mx-auto mt-2">Coba Lagi</button>
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-bold text-[var(--clr-text)]">{data.judul}</h2>
            <p className="text-sm text-[var(--clr-text-2)] mt-0.5">Kelas {data.groupName}</p>
            {data.tenggat && (
              <p className="text-xs text-[var(--clr-text-3)] mt-1">
                Deadline: {formatTime(data.tenggat)}
              </p>
            )}
            <p className="mt-3 text-sm text-[var(--clr-text)]">
              <strong className="text-[var(--clr-accent-strong)]">{sudahCount} / {data.murid.length}</strong> siswa mengumpulkan
              {terlambatCount > 0 && <span className="text-amber-600 ml-2">· {terlambatCount} terlambat</span>}
            </p>
          </div>

          {data.murid.length === 0 ? (
            <p className="text-sm text-[var(--clr-text-3)]">Belum ada anggota kelas.</p>
          ) : sudahCount === 0 ? (
            <div className="bc-empty">
              <p className="text-sm font-bold text-[var(--clr-text)]">Belum ada pengumpulan.</p>
              <p className="text-xs text-[var(--clr-text-2)] mt-1">Murid akan muncul di sini setelah mereka mengirim tugas.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {([["semua", "Semua"], ["belum", "Belum"], ["sudah", "Sudah"], ["terlambat", "Terlambat"]] as [FilterKey, string][]).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setFilter(k)} className={`bc-chip text-xs ${filter === k ? "bc-chip-active" : ""}`} aria-pressed={filter === k}>
                    {label}
                  </button>
                ))}
                <div className="relative ml-auto">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--clr-text-3)]" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari murid..." className="bc-input pl-8 text-sm" style={{ minHeight: 40 }} aria-label="Cari murid" />
                </div>
              </div>

              <div className="space-y-1.5 max-h-[45dvh] overflow-y-auto">
                {filtered.map((m) => (
                  <button key={m.userId} type="button" onClick={() => openMurid(m)} className="bc-row w-full text-left">
                    <div className="w-9 h-9 rounded-full bg-[var(--clr-surface-2)] border border-[var(--clr-border)] flex items-center justify-center text-xs font-bold text-[var(--clr-text-2)] shrink-0">
                      {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : m.fullName.charAt(0)}
                    </div>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-[var(--clr-text)] truncate">{m.fullName}</span>
                      <span className={`block text-xs ${statusColor(m)} flex items-center gap-1`}>
                        {fileIcon(m)} {statusLabel(m)}
                        {m.praktikFileName && <span className="text-[var(--clr-text-3)] ml-1">· {m.praktikFileName}</span>}
                      </span>
                    </span>
                    {m.praktikDinilai && m.praktikNilai != null && (
                      <span className="text-sm font-bold text-[var(--clr-accent-strong)]">{m.praktikNilai}</span>
                    )}
                  </button>
                ))}
                {filtered.length === 0 && <p className="text-xs text-[var(--clr-text-3)] text-center py-4">Tidak ada murid pada filter ini.</p>}
              </div>
            </>
          )}
        </>
      )}

      {selected && data && (
        <div className="bc-sheet-overlay" role="dialog" aria-modal="true" aria-label="Nilai pengumpulan">
          <div className="bc-sheet">
            <div className="px-5 pt-5 pb-6 space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--clr-text-3)]">Penilaian</p>
                <h3 className="text-lg font-bold text-[var(--clr-text)]">{selected.fullName}</h3>
                <p className="text-xs text-[var(--clr-text-3)] flex items-center gap-1">
                  {statusLabel(selected)}
                  {selected.isLate && <span className="text-amber-600 font-semibold">Terlambat</span>}
                  {selected.submittedAt && <span className="ml-1">· {formatTime(selected.submittedAt)}</span>}
                </p>
              </div>

              {selected.praktikUrl && (
                <div className="bc-card p-3.5 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[var(--clr-accent-soft)] text-[var(--clr-accent-strong)] flex items-center justify-center shrink-0">
                    {selected.praktikFileName ? <FileText size={18} /> : <ExternalLink size={18} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--clr-text)] truncate">
                      {selected.praktikFileName || "Tautan eksternal"}
                    </p>
                    <a href={selected.praktikUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--clr-accent-strong)] truncate block">
                      {selected.praktikFileName ? "Buka File" : selected.praktikUrl}
                    </a>
                    {selected.praktikFileSize != null && (
                      <span className="text-[11px] text-[var(--clr-text-3)]">{formatFileSize(selected.praktikFileSize)}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Insight berbasis evidence */}
              <div className="bc-card p-3.5 bg-[var(--clr-surface-2)]">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--clr-accent-strong)]">Insight BC</p>
                {insightLoading ? (
                  <p className="text-xs text-[var(--clr-text-3)] mt-1.5">Memuat...</p>
                ) : !insight || !insight.skills || insight.skills.length === 0 ? (
                  <p className="text-xs text-[var(--clr-text-2)] mt-1.5">Belum cukup data. Insight muncul setelah murid mengerjakan latihan.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {insight.skills.map((s) => (
                        <span key={s.label} className="text-[11px] font-semibold bg-[var(--clr-surface)] border border-[var(--clr-border)] rounded-full px-2.5 py-1 text-[var(--clr-text-2)]">
                          {s.label}: {s.category === "INSUFFICIENT_EVIDENCE" || s.attempts === 0 ? "Belum cukup data" : s.category === "STRONG" ? "Kuat" : s.category === "DEVELOPING" ? "Berkembang" : "Perlu diperkuat"}
                        </span>
                      ))}
                    </div>
                    {insight.saran?.text && (
                      <p className="text-xs text-[var(--clr-text)] mt-2">
                        <strong>Saran BC: </strong>{insight.saran.text}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--clr-text)] mb-1.5">Nilai (0–100)</label>
                <input type="number" min={0} max={100} value={nilai} onChange={(e) => setNilai(e.target.value)} className="bc-input text-sm" aria-label="Nilai" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--clr-text)] mb-1.5">Catatan guru (opsional)</label>
                <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} className="bc-input bc-textarea text-sm" placeholder="Tulis feedback untuk murid..." aria-label="Catatan guru" />
              </div>
              {saveError && <p className="text-xs font-semibold text-[var(--clr-danger)]">{saveError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelected(null)} className="bc-btn-secondary flex-1 text-sm">Batal</button>
                <button type="button" onClick={save} disabled={saving || nilai === ""} className="bc-btn-primary flex-1 text-sm">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Menyimpan..." : "Simpan Penilaian"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
