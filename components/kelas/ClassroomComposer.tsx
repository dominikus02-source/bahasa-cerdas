"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, FileText, GraduationCap, Link2, Loader2, Megaphone, PenLine, Plus, X } from "lucide-react";
import { ClassPicker, type PickerClass } from "./ClassPicker";

/* ── Tipe & sumber ─────────────────────────────────────────────────────── */

export type ComposerType = "MATERI" | "TUGAS" | "LATIHAN" | "PENGUMUMAN";

const TYPE_META: Record<ComposerType, { label: string; desc: string; icon: typeof BookOpen }> = {
  MATERI: { label: "Materi", desc: "Berikan bahan belajar kepada murid", icon: BookOpen },
  TUGAS: { label: "Tugas", desc: "Berikan tugas untuk dikerjakan dan dikumpulkan", icon: PenLine },
  LATIHAN: { label: "Latihan", desc: "Berikan latihan untuk mengukur pemahaman", icon: GraduationCap },
  PENGUMUMAN: { label: "Pengumuman", desc: "Sampaikan informasi kepada kelas", icon: Megaphone },
};

export function ContentTypePicker({ value, onChange }: { value: ComposerType | null; onChange: (t: ComposerType) => void }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[15px] font-bold text-[var(--clr-text)]">Apa yang ingin kamu berikan?</p>
      {(Object.keys(TYPE_META) as ComposerType[]).map((t) => {
        const meta = TYPE_META[t];
        const Icon = meta.icon;
        return (
          <button key={t} type="button" onClick={() => onChange(t)} className="bc-row w-full text-left">
            <span className="w-11 h-11 rounded-xl bg-[var(--clr-accent-soft)] text-[var(--clr-accent-strong)] flex items-center justify-center shrink-0">
              <Icon size={20} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-bold text-[var(--clr-text)]">{meta.label}</span>
              <span className="block text-[13px] text-[var(--clr-text-2)]">{meta.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Picker sumber ─────────────────────────────────────────────────────── */

interface SourceOption { id: string; label: string; desc: string; icon: typeof BookOpen }

export function SourcePicker({ options, value, onChange }: { options: SourceOption[]; value: string | null; onChange: (s: string) => void }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[15px] font-bold text-[var(--clr-text)]">Pilih sumber</p>
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)} className="bc-row w-full text-left">
            <span className="w-10 h-10 rounded-xl bg-[var(--clr-violet-soft)] text-[var(--clr-violet)] flex items-center justify-center shrink-0">
              <Icon size={18} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-[var(--clr-text)]">{o.label}</span>
              <span className="block text-xs text-[var(--clr-text-2)]">{o.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Picker konten (lazy, searchable) ──────────────────────────────────── */

interface ContentItem { id: string; title: string; subtitle?: string }

export function ContentPicker({
  items, loading, query, onQuery, onPick, pickedId, emptyText,
}: {
  items: ContentItem[];
  loading: boolean;
  query: string;
  onQuery: (q: string) => void;
  onPick: (id: string) => void;
  pickedId: string | null;
  emptyText: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[15px] font-bold text-[var(--clr-text)]">Pilih konten</p>
      <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Cari..." className="bc-input" aria-label="Cari konten" />
      <div className="space-y-1.5 max-h-[42dvh] overflow-y-auto">
        {loading && <p className="text-sm text-[var(--clr-text-3)] text-center py-6">Memuat...</p>}
        {!loading && items.length === 0 && <p className="text-sm text-[var(--clr-text-3)] text-center py-6">{emptyText}</p>}
        {!loading && items.map((it) => {
          const on = pickedId === it.id;
          return (
            <button key={it.id} type="button" onClick={() => onPick(it.id)} className={`bc-row w-full text-left ${on ? "bc-row-selected" : ""}`} aria-pressed={on}>
              <span className={`bc-check ${on ? "bc-check-on" : ""}`} aria-hidden>{on && <CheckCircle2 size={15} />}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-[var(--clr-text)] truncate">{it.title}</span>
                {it.subtitle && <span className="block text-xs text-[var(--clr-text-3)] truncate">{it.subtitle}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Pengaturan tugas (opsional, default masuk akal) ───────────────────── */

export function AssignmentSettings({ dueDate, onDueDate, notes, onNotes, showNotes }: {
  dueDate: string; onDueDate: (v: string) => void; notes: string; onNotes: (v: string) => void; showNotes: boolean;
}) {
  // STEP 6.4 — preset deadline manusiawi: Hari ini / Besok / 3 hari / Minggu depan / Kustom.
  const preset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 0, 0);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    onDueDate(local.toISOString().slice(0, 16));
  };
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-semibold text-[var(--clr-text)] mb-1.5">Tanggal pengumpulan</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {[["Hari ini", 0], ["Besok", 1], ["3 hari", 3], ["Minggu depan", 7]].map(([label, days]) => (
            <button key={label as string} type="button" onClick={() => preset(days as number)} className="bc-chip text-xs">{label as string}</button>
          ))}
        </div>
        <input type="datetime-local" value={dueDate} onChange={(e) => onDueDate(e.target.value)} className="bc-input text-sm" aria-label="Tanggal pengumpulan" />
      </div>
      {showNotes && (
        <div>
          <label className="block text-sm font-semibold text-[var(--clr-text)] mb-1.5">Instruksi / catatan (opsional)</label>
          <textarea value={notes} onChange={(e) => onNotes(e.target.value)} className="bc-input bc-textarea text-sm" placeholder="Tulis instruksi untuk murid..." aria-label="Instruksi" />
        </div>
      )}
    </div>
  );
}

export function ComposerFooter({ step, onBack, onSubmit, submitting, submitLabel, canSubmit, backLabel }: {
  step: number; onBack: () => void; onSubmit: () => void; submitting: boolean; submitLabel: string; canSubmit: boolean; backLabel: string;
}) {
  return (
    <div className="sticky bottom-0 bg-[var(--clr-surface)] border-t border-[var(--clr-border)] px-5 py-3.5 flex items-center gap-3 mt-4 -mx-5 -mb-4 rounded-b-[24px]">
      {step > 0 && (
        <button type="button" onClick={onBack} disabled={submitting} className="bc-btn-secondary text-sm">{backLabel}</button>
      )}
      <button type="button" onClick={onSubmit} disabled={submitting || !canSubmit} className="bc-btn-primary flex-1 text-sm">
        {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
        {submitting ? "Mengirim..." : submitLabel}
      </button>
    </div>
  );
}

/* ── Composer utama ─────────────────────────────────────────────────────── */

interface ClassroomComposerProps {
  open: boolean;
  onClose: () => void;
  groups: PickerClass[];
  /** STEP 6.5 — kelas yang otomatis terpilih saat composer dibuka
   *  (kelas aktif / "Kirim lagi"). Fallback: pilihan terakhir (localStorage). */
  initialClassIds?: string[];
  /** Dipanggil setelah sukses: { label, names } untuk success screen. */
  onDelivered: (info: { label: string; names: string[] }) => void;
}

const LAST_ACTION_KEY = "bc.classroom.last";

export function readLastClassIds(): string[] {
  try {
    const raw = localStorage.getItem(LAST_ACTION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed?.groupIds) ? parsed.groupIds : [];
  } catch {
    return [];
  }
}

export function rememberLastAction(info: { judul: string; groupIds: string[] }) {
  try {
    localStorage.setItem(LAST_ACTION_KEY, JSON.stringify({ judul: info.judul, groupIds: info.groupIds, at: Date.now() }));
  } catch {
    // best-effort — jangan pernah gagalkan flow karena storage
  }
}

const SOURCES: Record<ComposerType, SourceOption[]> = {
  MATERI: [
    { id: "materi-ajar", label: "Materi Ajar", desc: "Pilih dari materi yang kamu simpan", icon: BookOpen },
    { id: "link", label: "Link eksternal", desc: "Bagikan tautan video, dokumen, atau halaman", icon: Link2 },
  ],
  TUGAS: [
    { id: "buku-ajar", label: "Buku Ajar", desc: "Berikan bab dari Buku Panduan Guru", icon: BookOpen },
    { id: "quiz", label: "Quiz yang sudah dibuat", desc: "Gunakan kuis yang pernah kamu buat", icon: FileText },
  ],
  LATIHAN: [
    { id: "latihan", label: "Latihan yang sudah dibuat", desc: "Gunakan latihan yang pernah dibuat", icon: FileText },
    { id: "ai", label: "Buat latihan dengan AI", desc: "Buka Bank Soal untuk membuat latihan baru", icon: GraduationCap },
  ],
  PENGUMUMAN: [],
};

export function ClassroomComposer({ open, onClose, groups, initialClassIds, onDelivered }: ClassroomComposerProps) {
  const [type, setType] = useState<ComposerType | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [step, setStep] = useState(0); // 0=type, 1=source, 2=content/settings, 3=classes

  const [materiList, setMateriList] = useState<ContentItem[]>([]);
  const [unitList, setUnitList] = useState<ContentItem[]>([]);
  const [quizList, setQuizList] = useState<ContentItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [query, setQuery] = useState("");

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [lksIds, setLksIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setType(null); setSource(null); setStep(0); setPickedId(null); setLksIds([]);
    setDueDate(""); setNotes(""); setJudul(""); setDeskripsi("");
    setSelected([]); setError(null); setSubmitting(false); setQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    // STEP 6.5 — kelas aktif otomatis terpilih; fallback pilihan terakhir.
    const valid = groups.map((g) => g.id);
    const prefill = initialClassIds?.length
      ? initialClassIds.filter((id) => valid.includes(id))
      : readLastClassIds().filter((id) => valid.includes(id));
    if (prefill.length > 0) setSelected(prefill);
  }, [open, reset, groups, initialClassIds]);

  const loadList = useCallback(async (kind: "materi" | "buku" | "quiz" | "latihan") => {
    setLoadingList(true);
    try {
      if (kind === "materi") {
        const res = await fetch("/api/guru/materi?limit=40");
        const data = await res.json();
        setMateriList((data.data ?? []).map((m: { id: string; title: string; description?: string }) => ({ id: m.id, title: m.title, subtitle: m.description ?? "" })));
      } else if (kind === "buku") {
        const res = await fetch("/api/guru/panduan");
        const data = await res.json();
        const units: ContentItem[] = [];
        for (const level of data.levels ?? data ?? []) {
          for (const u of level.units ?? []) units.push({ id: u.id, title: u.title, subtitle: level.title ?? "" });
        }
        setUnitList(units);
      } else if (kind === "quiz") {
        const res = await fetch("/api/guru/quiz");
        const data = await res.json();
        setQuizList((data.quizzes ?? data.data ?? data).map((q: { id: string; title: string; kelas?: string }) => ({ id: q.id, title: q.title, subtitle: q.kelas ? `Kelas ${q.kelas}` : "" })));
      } else if (kind === "latihan") {
        const res = await fetch("/api/guru/latihan");
        const data = await res.json();
        setQuizList((data.latihans ?? data.data ?? data).map((q: { id: string; title: string; kelas?: string }) => ({ id: q.id, title: q.title, subtitle: q.kelas ? `Kelas ${q.kelas}` : "" })));
      }
    } catch {
      setError("Konten tidak bisa dimuat. Coba lagi.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (step !== 2 || !type || !source) return;
    if (type === "MATERI" && source === "materi-ajar") loadList("materi");
    if (type === "TUGAS" && source === "buku-ajar") loadList("buku");
    if (type === "TUGAS" && source === "quiz") loadList("quiz");
    if (type === "LATIHAN" && source === "latihan") loadList("latihan");
  }, [step, type, source, loadList]);

  const items = useMemo(() => {
    if (!type || !source) return [];
    if (type === "MATERI" && source === "materi-ajar") return materiList;
    if (type === "TUGAS" && source === "buku-ajar") return unitList;
    if (type === "TUGAS" && source === "quiz") return quizList;
    if (type === "LATIHAN" && source === "latihan") return quizList;
    return [];
  }, [type, source, materiList, unitList, quizList]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.title.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const goSource = (t: ComposerType) => { setType(t); setSource(null); setStep(t === "PENGUMUMAN" ? 2 : 1); };

  const canSubmitFinal = (selected.length > 0) && (type === "PENGUMUMAN" ? judul.trim().length > 0 : pickedId != null);

  const submit = async () => {
    if (!type || selected.length === 0) return;
    setSubmitting(true); setError(null);
    try {
      let ok = false;
      if (type === "MATERI" && source === "materi-ajar" && pickedId) {
        // STEP 6.4 — kirim materi utama + LKS opsional (0-4) sekaligus;
        // endpoint existing dipanggil per item (satu konten → banyak kelas).
        const ids = [pickedId, ...lksIds];
        const results = await Promise.all(ids.map((mid) =>
          fetch(`/api/guru/materi/${mid}/kirim`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupIds: selected }) })
            .then((r) => r.ok)
        ));
        ok = results.every(Boolean);
      } else if (type === "MATERI" && source === "link") {
        // Link eksternal → Pengumuman dengan tautan (backend existing).
        const res = await fetch("/api/guru/pengumuman", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupIds: selected, judul: notes.trim() || "Link belajar", deskripsi: judul.trim() }) });
        ok = res.ok;
      } else if (type === "TUGAS" && source === "buku-ajar" && pickedId) {
        const body: Record<string, unknown> = { unitId: pickedId, groupIds: selected, judul: judul.trim() || "Tugas", jenis: "MATERI" };
        if (dueDate) body.tenggat = new Date(dueDate).toISOString();
        if (notes.trim()) body.deskripsi = notes.trim();
        const res = await fetch("/api/guru/penugasan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        ok = res.ok;
      } else if ((type === "TUGAS" && source === "quiz") || (type === "LATIHAN" && source === "latihan")) {
        if (!pickedId) return;
        const body: Record<string, unknown> = { groupIds: selected };
        if (dueDate) body.dueDate = new Date(dueDate).toISOString();
        if (notes.trim()) body.notes = notes.trim();
        const res = await fetch(`/api/guru/quiz/${pickedId}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        ok = res.ok;
      } else if (type === "PENGUMUMAN") {
        const body: Record<string, unknown> = { groupIds: selected, judul: judul.trim(), deskripsi: deskripsi.trim() };
        if (dueDate) body.tenggat = new Date(dueDate).toISOString();
        const res = await fetch("/api/guru/pengumuman", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        ok = res.ok;
      }
      if (!ok) throw new Error("fail");
      const names = groups.filter((g) => selected.includes(g.id)).map((g) => g.name);
      const label = TYPE_META[type].label;
      rememberLastAction({ judul: pickedId ? items.find((i) => i.id === pickedId)?.title ?? label : label, groupIds: selected });
      onDelivered({ label, names });
      reset();
      onClose();
    } catch {
      setError("Belum berhasil dikirim. Coba lagi. Tidak ada data yang hilang.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // Langkah akhir: PENGUMUMAN & link = formulir+kelas dalam satu langkah (2);
  // alur konten = 2 (pilih konten) → 3 (kelas) → kirim.
  const finalStep = type === "PENGUMUMAN" || source === "link" ? 2 : 3;
  const kontenValid = type === "PENGUMUMAN" || source === "link" ? judul.trim().length > 0 : pickedId != null;
  const canSubmit = selected.length > 0 && kontenValid;

  const submitLabel =
    type === "MATERI" ? (selected.length > 1 ? `Kirim Materi ke ${selected.length} Kelas` : "Kirim Materi")
    : type === "TUGAS" ? (selected.length > 1 ? `Kirim Tugas ke ${selected.length} Kelas` : "Kirim Tugas")
    : type === "LATIHAN" ? (selected.length > 1 ? `Kirim Latihan ke ${selected.length} Kelas` : "Kirim Latihan")
    : selected.length > 1 ? `Kirim ke ${selected.length} Kelas` : "Kirim";

  return (
    <div className="bc-sheet-overlay" role="dialog" aria-modal="true" aria-label="Tambahkan ke kelas">
      <div className="bc-sheet">
        <div className="px-5 pt-5 pb-2 flex items-center justify-between sticky top-0 bg-[var(--clr-surface)] z-10 rounded-t-[24px]">
          <p className="text-[17px] font-bold text-[var(--clr-text)]">+ Tambahkan</p>
          <button type="button" onClick={onClose} aria-label="Tutup" className="w-10 h-10 rounded-full bg-[var(--clr-surface-2)] text-[var(--clr-text-2)] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pb-5 pt-3 space-y-4">
          {step === 0 && <ContentTypePicker value={type} onChange={goSource} />}

          {step === 1 && type && type !== "PENGUMUMAN" && (
            <SourcePicker options={SOURCES[type]} value={source} onChange={(s) => { setSource(s); setPickedId(null); setQuery(""); if (s === "ai") { onClose(); window.location.href = "/guru/bank-soal"; return; } setStep(2); }} />
          )}

          {step === 2 && type === "PENGUMUMAN" && (
            <div className="space-y-3">
              <p className="text-[15px] font-bold text-[var(--clr-text)]">Pengumuman</p>
              <input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul pengumuman" className="bc-input" aria-label="Judul pengumuman" />
              <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Apa yang ingin kamu sampaikan?" className="bc-input bc-textarea" aria-label="Isi pengumuman" />
              <AssignmentSettings dueDate={dueDate} onDueDate={setDueDate} notes={notes} onNotes={setNotes} showNotes={false} />
              <ClassPicker classes={groups} selected={selected} onChange={setSelected} error={null} />
            </div>
          )}

          {step === 2 && type && type !== "PENGUMUMAN" && source === "link" && (
            <div className="space-y-3">
              <p className="text-[15px] font-bold text-[var(--clr-text)]">Link eksternal</p>
              <input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Tautan (https://...)" className="bc-input" aria-label="Tautan eksternal" />
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Judul / keterangan (opsional)" className="bc-input" aria-label="Keterangan" />
              <ClassPicker classes={groups} selected={selected} onChange={setSelected} />
            </div>
          )}

          {step === 2 && type && type !== "PENGUMUMAN" && source !== "link" && source !== "ai" && (
            <ContentPicker items={filteredItems} loading={loadingList} query={query} onQuery={setQuery} onPick={setPickedId} pickedId={pickedId} emptyText="Belum ada konten. Buat dulu di Alat Ajar." />
          )}

          {step === 3 && type && type !== "PENGUMUMAN" && source !== "link" && (
            <div className="space-y-4">
              <AssignmentSettings dueDate={dueDate} onDueDate={setDueDate} notes={notes} onNotes={setNotes} showNotes={type === "TUGAS" || type === "LATIHAN"} />

              {/* STEP 6.4 — LKS opsional pada flow Materi (0-4, tidak wajib) */}
              {type === "MATERI" && source === "materi-ajar" && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[var(--clr-text)]">LKS (opsional)</p>
                  {lksIds.length === 0 && (
                    <p className="text-xs text-[var(--clr-text-3)]">Materi akan dikirim tanpa LKS.</p>
                  )}
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {materiList.filter((m) => m.id !== pickedId).slice(0, 8).map((m) => {
                      const on = lksIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (on) setLksIds((ids) => ids.filter((x) => x !== m.id));
                            else if (lksIds.length < 4) setLksIds((ids) => [...ids, m.id]);
                          }}
                          className={`bc-row w-full text-left ${on ? "bc-row-selected" : ""}`}
                          aria-pressed={on}
                        >
                          <span className={`bc-check ${on ? "bc-check-on" : ""}`} aria-hidden>{on && <CheckCircle2 size={14} />}</span>
                          <span className="text-sm font-medium text-[var(--clr-text)] truncate flex-1">{m.title}</span>
                        </button>
                      );
                    })}
                    {materiList.filter((m) => m.id !== pickedId).length === 0 && (
                      <p className="text-xs text-[var(--clr-text-3)]">Belum ada materi lain untuk dijadikan LKS.</p>
                    )}
                  </div>
                </div>
              )}

              <ClassPicker classes={groups} selected={selected} onChange={setSelected} error={null} />
            </div>
          )}

          {error && <div className="bc-error-banner text-sm font-semibold">{error}</div>}

          <ComposerFooter
            step={step}
            onBack={() => setStep((s) => Math.max(0, s - 1))}
            onSubmit={() => { if (step < finalStep) { setStep(step + 1); return; } submit(); }}
            submitting={submitting}
            submitLabel={step < finalStep ? "Lanjut" : submitLabel}
            canSubmit={step < finalStep ? kontenValid : canSubmit}
            backLabel="Kembali"
          />
        </div>
      </div>
    </div>
  );
}
