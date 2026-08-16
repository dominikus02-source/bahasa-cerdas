"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardCopy, FileText, GraduationCap, Megaphone, Plus, Search, Trash2, Users, X, Pin, Pencil, RotateCw, Loader2 } from "lucide-react";
import "@/components/kelas/classroom.css";
import { humanDeadline } from "@/lib/classroom/deadline";
import { ClassPicker, type PickerClass } from "@/components/kelas/ClassPicker";
import { ClassroomComposer, readLastClassIds } from "@/components/kelas/ClassroomComposer";
import { SubmissionReview } from "@/components/kelas/SubmissionReview";

interface Group {
  id: string;
  name: string;
  description?: string | null;
  grade: string;
  accessCode: string;
  isActive: boolean;
  memberCount: number;
}

interface DetailData {
  stats: { totalMurid: number; tugasAktif: number; pengumuman: number; nilaiRata: number | null; progressMurid: number };
  tugasQuiz: { id: string; dueDate: string | null; isPublished: boolean; assignedAt: string; quiz: { id: string; title: string }; _count: { submissions: number } }[];
  tugasPenugasan: { id: string; judul: string; jenis: string; tenggat: string | null; createdAt: string; _count: { submissions: number } }[];
  pengumuman: { id: string; judul: string; deskripsi?: string | null; pinned: boolean; createdAt: string; tenggat: string | null; _count: { submissions: number } }[];
  materis: { id: string; createdAt: string; materi: { id: string; title: string; description?: string | null } }[];
  ringkasanPenugasan: { id: string; sudah: number; sedang: number; belum: number }[];
  ringkasanQuiz: { id: string; sudah: number; sedang: number; belum: number }[];
}

type TabId = "aktivitas" | "materi" | "tugas" | "nilai" | "orang";

export default function KelasKuPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState<TabId>("aktivitas");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", grade: "X", tahunAjaran: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [newGroupCode, setNewGroupCode] = useState<{ code: string; name: string } | null>(null);
  const [copied, setCopied] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitial, setComposerInitial] = useState<string[] | undefined>(undefined);
  const [success, setSuccess] = useState<{ label: string; names: string[] } | null>(null);
  const [reviewPenugasan, setReviewPenugasan] = useState<DetailData["tugasPenugasan"][number] | null>(null);
  // STEP 6.5 — "Kirim lagi": pilihan kelas terakhir (localStorage, aman).
  const [lastClassIds, setLastClassIds] = useState<string[]>([]);

  useEffect(() => {
    setLastClassIds(readLastClassIds());
  }, []);

  const openComposer = (initial?: string[]) => {
    setComposerInitial(initial);
    setComposerOpen(true);
  };

  // Pengumuman CRUD
  const [editPengumuman, setEditPengumuman] = useState<DetailData["pengumuman"][number] | null>(null);
  const [pinBusyId, setPinBusyId] = useState<string | null>(null);
  const [pengumumanForm, setPengumumanForm] = useState({ judul: "", deskripsi: "", tenggat: "" });
  const [savingPengumuman, setSavingPengumuman] = useState(false);
  const [pengumumanError, setPengumumanError] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/group");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGroups((data.groups ?? []).map((g: Record<string, unknown>) => ({
        id: String(g.id),
        name: String(g.name),
        description: (g.description as string) ?? null,
        grade: String(g.grade),
        accessCode: String(g.accessCode),
        isActive: g.isActive !== false,
        memberCount: Number((g as { memberCount?: number; _count?: { members?: number } }).memberCount ?? (g as { _count?: { members?: number } })._count?.members ?? 0),
      })));
    } catch {
      setError("Kelas tidak bisa dimuat. Periksa koneksi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const loadDetail = useCallback(async (groupId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/guru/kelasku/${groupId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDetail(data);
    } catch {
      setToast("Detail kelas tidak bisa dimuat. Coba lagi.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openGroup = (g: Group) => {
    setActiveGroup(g);
    setTab("aktivitas");
    setSuccess(null);
    loadDetail(g.id);
  };

  const closeGroup = () => {
    setActiveGroup(null);
    setDetail(null);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => {
    if (!activeGroup) return;
    loadDetail(activeGroup.id);
    pollRef.current = setInterval(() => loadDetail(activeGroup.id), 20000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [activeGroup, loadDetail]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gagal membuat kelas"); return; }
      if (data.group) {
        setShowCreate(false);
        setCreateForm({ name: "", description: "", grade: "X", tahunAjaran: "" });
        setError("");
        setNewGroupCode({ code: data.group.accessCode, name: data.group.name });
        fetchGroups();
      }
    } catch {
      setError("Gagal membuat kelas. Periksa koneksi Anda.");
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteGroup = async () => {
    if (!confirmDelete || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/group/${confirmDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setGroups((prev) => prev.filter((g) => g.id !== confirmDelete.id));
      if (activeGroup?.id === confirmDelete.id) closeGroup();
      setConfirmDelete(null);
      setToast("Kelas berhasil dihapus dari daftar aktif.");
    } catch {
      setToast("Kelas belum berhasil dihapus. Silakan coba lagi.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleRefreshCode = async (groupId: string) => {
    try {
      await fetch(`/api/group/${groupId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      fetchGroups();
    } catch { /* best-effort */ }
  };

  const savePengumuman = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;
    setSavingPengumuman(true);
    setPengumumanError("");
    try {
      const body: Record<string, unknown> = {
        groupId: activeGroup.id,
        judul: pengumumanForm.judul.trim(),
        deskripsi: pengumumanForm.deskripsi.trim(),
        tenggat: pengumumanForm.tenggat || null,
      };
      const res = await fetch(editPengumuman ? `/api/guru/pengumuman/${editPengumuman.id}` : "/api/guru/pengumuman", {
        method: editPengumuman ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setPengumumanError(data.error || "Gagal menyimpan pengumuman"); return; }
      setEditPengumuman(null);
      setPengumumanForm({ judul: "", deskripsi: "", tenggat: "" });
      loadDetail(activeGroup.id);
    } catch {
      setPengumumanError("Gagal menyimpan pengumuman. Periksa koneksi Anda.");
    } finally {
      setSavingPengumuman(false);
    }
  };

  const togglePin = async (p: DetailData["pengumuman"][number]) => {
    if (!activeGroup || pinBusyId) return;
    setPinBusyId(p.id);
    try {
      await fetch(`/api/guru/pengumuman/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !p.pinned }),
      });
      loadDetail(activeGroup.id);
    } catch { /* best-effort */ } finally {
      setPinBusyId(null);
    }
  };

  const deletePengumuman = async (p: DetailData["pengumuman"][number]) => {
    if (!activeGroup) return;
    try {
      await fetch(`/api/guru/pengumuman/${p.id}`, { method: "DELETE" });
      loadDetail(activeGroup.id);
    } catch { /* best-effort */ }
  };

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups;
  }, [groups, search]);

  const pickerClasses: PickerClass[] = useMemo(() => groups.map((g) => ({ id: g.id, name: g.name, memberCount: g.memberCount })), [groups]);

  // ── Daftar kelas (tanpa kelas aktif) ────────────────────────────────────
  if (!activeGroup) {
    return (
      <div className="bc-classroom p-4 md:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[var(--clr-text)]">Kelasku</h1>
              <p className="text-sm text-[var(--clr-text-2)] mt-0.5">Bagikan materi, tugas, latihan, dan pengumuman ke kelasmu.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--clr-text-3)]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kelas..." className="bc-input pl-10 text-sm" aria-label="Cari kelas" />
              </div>
              <button type="button" onClick={() => setShowCreate(true)} className="bc-btn-secondary text-sm shrink-0">
                <Plus size={18} /> Buat Kelas
              </button>
              <button type="button" onClick={() => openComposer()} disabled={groups.length === 0} className="bc-btn-primary text-sm shrink-0">
                <Plus size={18} /> Tambahkan
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-[var(--clr-text-3)] text-center py-10">Memuat kelas...</p>
          ) : filteredGroups.length === 0 ? (
            <div className="bc-card bc-empty">
              <div className="w-16 h-16 rounded-2xl bg-[var(--clr-accent-soft)] text-[var(--clr-accent-strong)] flex items-center justify-center mx-auto mb-4">
                <GraduationCap size={30} />
              </div>
              <h2 className="text-lg font-bold text-[var(--clr-text)]">Belum ada kelas</h2>
              <p className="text-sm text-[var(--clr-text-2)] mt-1 max-w-sm mx-auto">
                Buat kelas pertamamu untuk mulai mengajar di BahasaCerdas.
              </p>
              <p className="text-xs text-[var(--clr-text-3)] mt-2">Materi · Tugas · Latihan · Pengumuman</p>
              <button type="button" onClick={() => setShowCreate(true)} className="bc-btn-primary mt-5 text-sm mx-auto">
                <Plus size={18} /> Buat Kelas
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((g) => (
                <button key={g.id} type="button" onClick={() => openGroup(g)} className="bc-card p-5 text-left hover:border-[var(--clr-accent)] transition-colors group">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--clr-accent-strong)] bg-[var(--clr-accent-soft)] px-2.5 py-1 rounded-full">
                      Kelas {g.grade}
                    </span>
                    <span className="text-[var(--clr-text-3)] opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowLeft size={16} className="rotate-180" />
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--clr-text)] mt-3 truncate">{g.name}</h3>
                  <p className="flex items-center gap-1.5 text-sm text-[var(--clr-text-2)] mt-1">
                    <Users size={14} /> {g.memberCount} siswa
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <code className="text-xs font-mono bg-[var(--clr-surface-2)] border border-[var(--clr-border)] rounded-lg px-2.5 py-1 text-[var(--clr-text-2)]">
                      {g.accessCode}
                    </code>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleCopy(g.accessCode); }}
                      className="text-[var(--clr-text-3)] hover:text-[var(--clr-accent-strong)] p-1.5"
                      aria-label="Salin kode kelas"
                    >
                      {copied === g.accessCode ? <CheckCircle2 size={16} className="text-[var(--clr-success)]" /> : <ClipboardCopy size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(g); }}
                      className="text-[var(--clr-text-3)] hover:text-[var(--clr-danger)] p-1.5 ml-auto"
                      aria-label={`Hapus kelas ${g.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

        {showCreate && (
          <CreateClassModal
            form={createForm}
            setForm={setCreateForm}
            creating={creating}
            error={error}
            onClose={() => { setShowCreate(false); setError(""); }}
            onSubmit={handleCreate}
          />
        )}

        {newGroupCode && (
          <NewClassCodeModal code={newGroupCode} onClose={() => setNewGroupCode(null)} />
        )}

        {confirmDelete && (
          <ConfirmDeleteModal
            name={confirmDelete.name}
            deleting={deleting}
            onCancel={() => setConfirmDelete(null)}
            onConfirm={confirmDeleteGroup}
          />
        )}

        <ClassroomComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          groups={pickerClasses}
          onDelivered={(info) => { setSuccess(info); }}
        />

        {success && (
          <SuccessBanner info={success} onClose={() => setSuccess(null)} onView={() => setSuccess(null)} onAddAgain={() => { setSuccess(null); openComposer(lastClassIds.length ? lastClassIds : undefined); }} />
        )}
      </div>
    );
  }

  // ── Detail kelas ────────────────────────────────────────────────────────
  const stream = useMemo(() => {
    if (!detail) return [];
    const items: { id: string; kind: "pengumuman" | "tugas" | "materi"; date: string; node: unknown }[] = [
      ...detail.pengumuman.map((p) => ({ id: `p-${p.id}`, kind: "pengumuman" as const, date: p.createdAt, node: p })),
      ...detail.tugasQuiz.map((t) => ({ id: `q-${t.id}`, kind: "tugas" as const, date: t.assignedAt, node: t })),
      ...detail.tugasPenugasan.map((p) => ({ id: `t-${p.id}`, kind: "tugas" as const, date: p.createdAt, node: p })),
      ...detail.materis.map((m) => ({ id: `m-${m.id}`, kind: "materi" as const, date: m.createdAt, node: m })),
    ];
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 40);
  }, [detail]);

  return (
    <div className="bc-classroom p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-5">
        <button type="button" onClick={closeGroup} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--clr-text-2)] hover:text-[var(--clr-accent-strong)]">
          <ArrowLeft size={16} /> Kelasku
        </button>

        <div className="bc-card p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--clr-accent-strong)] bg-[var(--clr-accent-soft)] px-2.5 py-1 rounded-full">
                Kelas {activeGroup.grade}
              </span>
              <h1 className="text-2xl md:text-[28px] font-bold text-[var(--clr-text)] mt-2 truncate">{activeGroup.name}</h1>
              <p className="flex items-center gap-1.5 text-sm text-[var(--clr-text-2)] mt-1">
                <Users size={14} /> {detail?.stats.totalMurid ?? activeGroup.memberCount} siswa
                {detail && detail.stats.tugasAktif > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[var(--clr-warning)] font-semibold">
                    <FileText size={13} /> {detail.stats.tugasAktif} tugas aktif
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[var(--clr-surface-2)] border border-[var(--clr-border)] rounded-xl px-3 py-2">
                <code className="text-xs font-mono text-[var(--clr-text-2)]">{activeGroup.accessCode}</code>
                <button type="button" onClick={() => handleCopy(activeGroup.accessCode)} aria-label="Salin kode kelas" className="text-[var(--clr-text-3)] hover:text-[var(--clr-accent-strong)]">
                  {copied === activeGroup.accessCode ? <CheckCircle2 size={16} className="text-[var(--clr-success)]" /> : <ClipboardCopy size={16} />}
                </button>
                <button type="button" onClick={() => handleRefreshCode(activeGroup.id)} aria-label="Perbarui kode kelas" className="text-[var(--clr-text-3)] hover:text-[var(--clr-accent-strong)]">
                  <RotateCw size={15} />
                </button>
              </div>
              <button type="button" onClick={() => openComposer(activeGroup ? [activeGroup.id] : undefined)} className="bc-btn-primary text-sm">
                <Plus size={18} /> Tambahkan
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-5 overflow-x-auto pb-1">
            {([["aktivitas", "Aktivitas", null], ["materi", "Materi", BookOpen], ["tugas", "Tugas", FileText], ["nilai", "Nilai", GraduationCap], ["orang", "Orang", Users]] as [TabId, string, typeof BookOpen | null][]).map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => setTab(id)} className={`bc-chip ${tab === id ? "bc-chip-active" : ""} flex items-center gap-1.5`} aria-pressed={tab === id}>
                {Icon && <Icon size={15} />}
                {label}
              </button>
            ))}
          </div>
        </div>

        {detail && <TodayView detail={detail} lastClassIds={lastClassIds} onAdd={() => openComposer(activeGroup ? [activeGroup.id] : undefined)} onKirimLagi={(ids) => openComposer(ids)} onReview={setReviewPenugasan} />}

        {detailLoading && !detail ? (
          <p className="text-sm text-[var(--clr-text-3)] text-center py-10">Memuat kelas...</p>
        ) : tab === "aktivitas" && detail ? (
          <div className="space-y-3">
            {/* Form pengumuman cepat (single class — dari kelas ini) */}
            <form onSubmit={savePengumuman} className="bc-card p-4 space-y-3">
              <p className="text-sm font-bold text-[var(--clr-text)]">Buat pengumuman</p>
              <input
                value={pengumumanForm.judul}
                onChange={(e) => setPengumumanForm((f) => ({ ...f, judul: e.target.value }))}
                placeholder="Judul pengumuman"
                className="bc-input text-sm"
                aria-label="Judul pengumuman"
              />
              <textarea
                value={pengumumanForm.deskripsi}
                onChange={(e) => setPengumumanForm((f) => ({ ...f, deskripsi: e.target.value }))}
                placeholder="Apa yang ingin kamu sampaikan? (opsional)"
                className="bc-input bc-textarea text-sm"
                aria-label="Isi pengumuman"
              />
              {pengumumanError && <p className="text-xs font-semibold text-[var(--clr-danger)]">{pengumumanError}</p>}
              <button type="submit" disabled={savingPengumuman || !pengumumanForm.judul.trim()} className="bc-btn-primary text-sm w-full sm:w-auto">
                {savingPengumuman ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
                {editPengumuman ? "Simpan Perubahan" : "Kirim Pengumuman"}
              </button>
            </form>

            {stream.length === 0 ? (
              <div className="bc-card bc-empty">
                <div className="w-16 h-16 rounded-2xl bg-[var(--clr-accent-soft)] text-[var(--clr-accent-strong)] flex items-center justify-center mx-auto mb-4">
                  <Plus size={28} />
                </div>
                <h2 className="text-lg font-bold text-[var(--clr-text)]">Belum ada aktivitas</h2>
                <p className="text-sm text-[var(--clr-text-2)] mt-1 max-w-sm mx-auto">
                  Mulai kelasmu dengan memberikan materi, tugas, latihan, atau pengumuman.
                </p>
                <button type="button" onClick={() => openComposer(activeGroup ? [activeGroup.id] : undefined)} className="bc-btn-primary mt-5 text-sm mx-auto">
                  <Plus size={18} /> Tambahkan
                </button>
              </div>
            ) : (
              stream.map((item) => (
                <StreamCard
                  key={item.id}
                  item={item}
                  progress={
                    item.kind === "tugas"
                      ? detail.ringkasanPenugasan.find((x) => x.id === (item.node as DetailData["tugasPenugasan"][number]).id)
                      : detail.ringkasanQuiz.find((x) => x.id === (item.node as DetailData["tugasQuiz"][number]).id)
                  }
                  onReview={setReviewPenugasan}
                  onEditPengumuman={setEditPengumuman}
                  onPin={togglePin}
                  onDeletePengumuman={deletePengumuman}
                  pinBusyId={pinBusyId}
                />
              ))
            )}
          </div>
        ) : tab === "materi" && detail ? (
          detail.materis.length === 0 ? (
            <div className="bc-card bc-empty">
              <p className="text-sm font-bold text-[var(--clr-text)]">Belum ada materi</p>
              <p className="text-xs text-[var(--clr-text-2)] mt-1">Bagikan materi pertama dengan tombol + Tambahkan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {detail.materis.map((m) => (
                <div key={m.id} className="bc-card p-4 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[var(--clr-accent-soft)] text-[var(--clr-accent-strong)] flex items-center justify-center shrink-0"><BookOpen size={18} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--clr-text)] truncate">{m.materi.title}</p>
                    {m.materi.description && <p className="text-xs text-[var(--clr-text-3)] truncate">{m.materi.description}</p>}
                  </div>
                  <span className="text-xs text-[var(--clr-text-3)] shrink-0">{new Date(m.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                </div>
              ))}
            </div>
          )
        ) : tab === "tugas" && detail ? (
          reviewPenugasan ? (
            <SubmissionReview penugasanId={reviewPenugasan.id} groupId={activeGroup.id} onClose={() => setReviewPenugasan(null)} onGraded={() => loadDetail(activeGroup.id)} />
          ) : (
          <div className="space-y-4">
            {detail.tugasQuiz.length === 0 && detail.tugasPenugasan.length === 0 ? (
              <div className="bc-card bc-empty">
                <p className="text-sm font-bold text-[var(--clr-text)]">Belum ada tugas</p>
                <p className="text-xs text-[var(--clr-text-2)] mt-1">Berikan tugas pertama dengan tombol + Tambahkan.</p>
              </div>
            ) : (
              <>
                {detail.tugasQuiz.map((t) => {
                  const r = detail.ringkasanQuiz.find((x) => x.id === t.id);
                  return (
                  <div key={t.id} className="bc-card p-4 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[var(--clr-violet-soft)] text-[var(--clr-violet)] flex items-center justify-center shrink-0"><FileText size={18} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--clr-text)] truncate">{t.quiz.title}</p>
                      <p className="text-xs text-[var(--clr-text-3)]">
                        {t.dueDate ? `Tenggat ${new Date(t.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} · ` : ""}
                        {t._count.submissions} dikumpulkan
                      </p>
                      {r && <RingkasanChips r={r} />}
                    </div>
                    <a href={`/guru/kuis/${t.quiz.id}/results`} className="bc-btn-secondary text-xs shrink-0">Lihat Pengumpulan</a>
                  </div>
                  );
                })}
                {detail.tugasPenugasan.map((p) => {
                  const r = detail.ringkasanPenugasan.find((x) => x.id === p.id);
                  return (
                  <div key={p.id} className="bc-card p-4 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[var(--clr-violet-soft)] text-[var(--clr-violet)] flex items-center justify-center shrink-0"><BookOpen size={18} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--clr-text)] truncate">{p.judul}</p>
                      <p className="text-xs text-[var(--clr-text-3)]">
                        {p.jenis === "KUIS" ? "Latihan · " : "Tugas · "}
                        {p.tenggat ? `tenggat ${new Date(p.tenggat).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} · ` : ""}
                        {p._count.submissions} mengerjakan
                      </p>
                      {r && <RingkasanChips r={r} />}
                    </div>
                    <button type="button" onClick={() => setReviewPenugasan(p)} className="bc-btn-secondary text-xs shrink-0">Lihat Pengumpulan</button>
                  </div>
                  );
                })}
                <div className="flex flex-wrap gap-2 pt-1">
                  <a href="/guru/tugas-murid" className="bc-btn-secondary text-xs">Lihat & nilai pengumpulan</a>
                </div>
              </>
            )}
          </div>
          )
        ) : tab === "nilai" && detail ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bc-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--clr-text-3)]">Rata-rata Nilai</p>
                <p className="text-3xl font-bold text-[var(--clr-text)] mt-1">{detail.stats.nilaiRata ?? "—"}</p>
              </div>
              <div className="bc-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--clr-text-3)]">Progres Belajar</p>
                <p className="text-3xl font-bold text-[var(--clr-text)] mt-1">{detail.stats.progressMurid}%</p>
              </div>
            </div>
            <ClassInsight groupId={activeGroup.id} />
            <div className="flex flex-wrap gap-2">
              <a href="/guru/penilaian" className="bc-btn-secondary text-xs">Buka Penilaian</a>
              <a href="/guru/gradebook" className="bc-btn-secondary text-xs">Buka Buku Nilai</a>
            </div>
          </div>
        ) : tab === "orang" && detail ? (
          <div className="bc-card p-5">
            <p className="text-sm font-bold text-[var(--clr-text)]">Anggota kelas</p>
            <p className="text-sm text-[var(--clr-text-2)] mt-1">{detail.stats.totalMurid} siswa tergabung.</p>
            <div className="flex gap-2 mt-4">
              <a href="/guru/data-siswa" className="bc-btn-secondary text-xs">Kelola Data Siswa</a>
            </div>
          </div>
        ) : null}

        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

        <ClassroomComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          groups={pickerClasses}
          initialClassIds={activeGroup ? [activeGroup.id, ...(composerInitial ?? [])] : composerInitial}
          onDelivered={(info) => { setSuccess(info); setLastClassIds(readLastClassIds()); }}
        />

        {success && <SuccessBanner info={success} onClose={() => setSuccess(null)} onView={() => setSuccess(null)} onAddAgain={() => { setSuccess(null); openComposer(lastClassIds.length ? lastClassIds : undefined); }} />}
      </div>
    </div>
  );
}

/* ── Sub-komponen presentasi ────────────────────────────────────────────── */

/** STEP 6.2 — ringkasan "✓ sudah · ◷ sedang · — belum" (bahasa manusiawi). */
function RingkasanChips({ r }: { r: { sudah: number; sedang: number; belum: number } }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs">
      <span className="text-[var(--clr-success)] font-semibold">✓ {r.sudah} sudah mengumpulkan</span>
      {r.sedang > 0 && <span className="text-[var(--clr-warning)] font-semibold">◷ {r.sedang} sedang mengerjakan</span>}
      {r.belum > 0 && <span className="text-[var(--clr-text-3)] font-semibold">— {r.belum} belum mengerjakan</span>}
    </span>
  );
}

/** STEP 6.4 — "Hari Ini di Kelas X": kondisi kelas dalam beberapa detik. */
function TodayView({ detail, lastClassIds, onAdd, onKirimLagi, onReview }: {
  detail: DetailData;
  lastClassIds: string[];
  onAdd: () => void;
  onKirimLagi: (ids: string[]) => void;
  onReview: (p: DetailData["tugasPenugasan"][number]) => void;
}) {
  const active = [
    ...detail.tugasPenugasan.map((p) => {
      const r = detail.ringkasanPenugasan.find((x) => x.id === p.id);
      return { id: p.id, judul: p.judul, jenis: "tugas" as const, sudah: r?.sudah ?? 0, belum: r?.belum ?? 0, total: detail.stats.totalMurid };
    }),
    ...detail.tugasQuiz.map((t) => {
      const r = detail.ringkasanQuiz.find((x) => x.id === t.id);
      return { id: t.id, judul: t.quiz.title, jenis: "latihan" as const, sudah: r?.sudah ?? 0, belum: r?.belum ?? 0, total: detail.stats.totalMurid };
    }),
  ];

  const perluPerhatian = active.filter((a) => a.belum > 0);

  return (
    <div className="bc-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[var(--clr-text)]">Hari Ini</p>
          <p className="text-xs text-[var(--clr-text-2)] mt-0.5">
            {active.length === 0
              ? "Belum ada aktivitas berjalan."
              : `${active.length} aktivitas sedang berjalan`}
          </p>
        </div>
        <button type="button" onClick={onAdd} className="bc-btn-primary text-sm shrink-0">
          <Plus size={17} /> Tambahkan
        </button>
      </div>

      {/* STEP 6.4/6.5 — "Perlu perhatian" didahulukan (server-derived, tanpa AI) */}
      {perluPerhatian.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--clr-text-3)]">Perlu perhatian</p>
          {perluPerhatian.slice(0, 3).map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <p className="text-xs text-[var(--clr-text)] flex-1 min-w-0 truncate">
                <strong>{a.belum} siswa belum {a.jenis === "tugas" ? "mengumpulkan" : "mengerjakan"}</strong> · {a.judul}
              </p>
              {a.jenis === "tugas" ? (
                <button type="button" onClick={() => { const p = detail.tugasPenugasan.find((x) => x.id === a.id); if (p) onReview(p); }} className="bc-chip text-[11px] shrink-0">Lihat Pengumpulan</button>
              ) : (
                (() => { const t = detail.tugasQuiz.find((x) => x.id === a.id); return t ? <a href={`/guru/kuis/${t.quiz.id}/results`} className="bc-chip text-[11px] shrink-0">Lihat Hasil</a> : null; })()
              )}
            </div>
          ))}
        </div>
      )}

      {perluPerhatian.length === 0 && active.length > 0 && (
        <p className="text-xs text-[var(--clr-text-2)]">Semua aktivitas berjalan baik. Tidak ada yang perlu kamu tindak lanjuti.</p>
      )}

      {active.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--clr-text-3)]">Sedang berjalan</p>
          {active.slice(0, 3).map((a) => (
            <div key={a.id} className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[var(--clr-violet-soft)] text-[var(--clr-violet)] flex items-center justify-center shrink-0">
                {a.jenis === "tugas" ? <FileText size={15} /> : <GraduationCap size={15} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--clr-text)] truncate">{a.judul}</p>
                <p className="text-xs text-[var(--clr-text-3)]">
                  {a.sudah} dari {a.total} {a.jenis === "tugas" ? "sudah mengumpulkan" : "sudah mengerjakan"}
                  {a.belum > 0 && <span className="text-[var(--clr-warning)] font-semibold"> · {a.belum} belum</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 6.5 — "Kirim lagi" (pilihan kelas terakhir, tanpa state global) */}
      {lastClassIds.length > 0 && (
        <div className="border-t border-[var(--clr-border)] pt-3 flex items-center gap-2">
          <p className="text-xs text-[var(--clr-text-2)] flex-1 min-w-0">
            Terakhir kamu mengirim ke <strong>{lastClassIds.length} kelas</strong>. Kirim lagi ke kelas yang sama?
          </p>
          <button type="button" onClick={() => onKirimLagi(lastClassIds)} className="bc-chip text-[11px] shrink-0">Kirim Lagi</button>
        </div>
      )}
    </div>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  STRONG: "Kuat",
  DEVELOPING: "Berkembang",
  WEAK: "Perlu diperkuat",
  BELUM_CUKUP_DATA: "Belum cukup data",
};

/** STEP 6.3 — "Perkembangan Kelas" (tab Nilai): insight per-skill dari
 *  LearnerState anggota; skill tanpa evidence cukup → "Belum cukup data". */
function ClassInsight({ groupId }: { groupId: string }) {
  const [skills, setSkills] = useState<{ skill: string; label: string; attempts: number; accuracy: number | null; category: string }[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/guru/kelasku/${groupId}/insight`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setSkills(d?.skills ?? []); })
      .catch(() => { if (alive) setSkills([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [groupId]);

  return (
    <div className="bc-card p-5">
      <p className="text-sm font-bold text-[var(--clr-text)]">Perkembangan Kelas</p>
      <p className="text-xs text-[var(--clr-text-3)] mt-0.5">Berdasarkan hasil latihan murid. Guru tetap menentukan penilaian.</p>
      {loading ? (
        <p className="text-xs text-[var(--clr-text-3)] mt-3">Memuat...</p>
      ) : !skills || skills.length === 0 ? (
        <p className="text-sm text-[var(--clr-text-2)] mt-3">Belum cukup data. Murid akan tampil setelah mengerjakan latihan.</p>
      ) : (
        <div className="space-y-2.5 mt-3">
          {skills.map((s) => (
            <div key={s.skill} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[var(--clr-text)] w-28 shrink-0">{s.label}</span>
              <div className="flex-1 h-2 rounded-full bg-[var(--clr-surface-2)] border border-[var(--clr-border)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--clr-accent)]" style={{ width: `${s.accuracy ?? 0}%` }} />
              </div>
              <span className={`text-xs font-bold w-24 text-right shrink-0 ${s.category === "BELUM_CUKUP_DATA" ? "text-[var(--clr-text-3)]" : "text-[var(--clr-accent-strong)]"}`}>
                {s.category === "BELUM_CUKUP_DATA" ? CATEGORY_LABEL.BELUM_CUKUP_DATA : `${s.accuracy}% · ${CATEGORY_LABEL[s.category] ?? s.category}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StreamCard({ item, progress, onReview, onEditPengumuman, onPin, onDeletePengumuman, pinBusyId }: {
  item: { id: string; kind: "pengumuman" | "tugas" | "materi"; date: string; node: unknown };
  progress?: { sudah: number; sedang: number; belum: number };
  onReview: (p: DetailData["tugasPenugasan"][number]) => void;
  onEditPengumuman: (p: DetailData["pengumuman"][number]) => void;
  onPin: (p: DetailData["pengumuman"][number]) => void;
  onDeletePengumuman: (p: DetailData["pengumuman"][number]) => void;
  pinBusyId: string | null;
}) {
  const date = new Date(item.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  if (item.kind === "pengumuman") {
    const p = item.node as DetailData["pengumuman"][number];
    return (
      <div className={`bc-card p-4 ${p.pinned ? "border-[var(--clr-warning)]" : ""}`}>
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-[var(--clr-warning)]/15 text-[var(--clr-warning)] flex items-center justify-center shrink-0"><Megaphone size={18} /></span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[var(--clr-text)] truncate">{p.judul}</p>
              {p.pinned && <Pin size={13} className="text-[var(--clr-warning)] shrink-0" />}
            </div>
            {p.deskripsi && <p className="text-sm text-[var(--clr-text-2)] mt-0.5 whitespace-pre-line">{p.deskripsi}</p>}
            <p className="text-xs text-[var(--clr-text-3)] mt-1.5">{date}{p.tenggat ? ` · tenggat ${new Date(p.tenggat).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}` : ""}</p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button type="button" onClick={() => onPin(p)} disabled={pinBusyId === p.id} aria-label={p.pinned ? "Lepas semat" : "Sematkan"} className="p-2 text-[var(--clr-text-3)] hover:text-[var(--clr-warning)]">
              <Pin size={15} />
            </button>
            <button type="button" onClick={() => { onEditPengumuman(p); }} aria-label="Edit pengumuman" className="p-2 text-[var(--clr-text-3)] hover:text-[var(--clr-accent-strong)]">
              <Pencil size={15} />
            </button>
            <button type="button" onClick={() => onDeletePengumuman(p)} aria-label="Hapus pengumuman" className="p-2 text-[var(--clr-text-3)] hover:text-[var(--clr-danger)]">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (item.kind === "tugas") {
    const t = item.node as DetailData["tugasQuiz"][number] | DetailData["tugasPenugasan"][number];
    const title = "quiz" in t ? t.quiz.title : t.judul;
    const tenggat = "tenggat" in t ? t.tenggat : "dueDate" in t ? t.dueDate : null;
    const dl = humanDeadline(tenggat);
    const isPenugasan = !("quiz" in t);
    return (
      <div className="bc-card p-4 flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-[var(--clr-violet-soft)] text-[var(--clr-violet)] flex items-center justify-center shrink-0"><FileText size={18} /></span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[var(--clr-text)] truncate">{title}</p>
          <p className="text-xs text-[var(--clr-text-3)] mt-0.5">{date} · tugas{tenggat ? ` · deadline ${dl.label}` : ""}</p>
          {progress && <RingkasanChips r={progress} />}
        </div>
        {isPenugasan ? (
          <button type="button" onClick={() => onReview(t as DetailData["tugasPenugasan"][number])} className="bc-btn-secondary text-xs shrink-0">Lihat Pengumpulan</button>
        ) : (
          <a href={`/guru/kuis/${(t as DetailData["tugasQuiz"][number]).quiz.id}/results`} className="bc-btn-secondary text-xs shrink-0">Lihat Pengumpulan</a>
        )}
      </div>
    );
  }
  const m = item.node as DetailData["materis"][number];
  return (
    <div className="bc-card p-4 flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl bg-[var(--clr-accent-soft)] text-[var(--clr-accent-strong)] flex items-center justify-center shrink-0"><BookOpen size={18} /></span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--clr-text)] truncate">{m.materi.title}</p>
        <p className="text-xs text-[var(--clr-text-3)]">{date} · materi</p>
      </div>
    </div>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bc-card px-5 py-3 text-sm font-semibold text-[var(--clr-text)] flex items-center gap-3 shadow-lg">
      <CheckCircle2 size={17} className="text-[var(--clr-success)]" />
      {msg}
      <button type="button" onClick={onClose} aria-label="Tutup" className="text-[var(--clr-text-3)]"><X size={16} /></button>
    </div>
  );
}

function SuccessBanner({ info, onClose, onView, onAddAgain }: { info: { label: string; names: string[] }; onClose: () => void; onView: () => void; onAddAgain: () => void }) {
  return (
    <div className="bc-sheet-overlay" role="dialog" aria-modal="true" aria-label="Berhasil dikirim">
      <div className="bc-sheet">
        <div className="px-6 py-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[var(--clr-accent-soft)] text-[var(--clr-accent-strong)] flex items-center justify-center mx-auto">
            <CheckCircle2 size={34} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--clr-text)]">✓ Berhasil dikirim</h2>
            <p className="text-sm text-[var(--clr-text-2)] mt-1">
              {info.label} telah dikirim ke:
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {info.names.map((n) => (
                <span key={n} className="text-xs font-bold text-[var(--clr-accent-strong)] bg-[var(--clr-accent-soft)] px-3 py-1.5 rounded-full">{n}</span>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <button type="button" onClick={onView} className="bc-btn-primary text-sm">Lihat Aktivitas</button>
            <button type="button" onClick={onAddAgain} className="bc-btn-secondary text-sm">Tambahkan Lagi</button>
            <button type="button" onClick={onClose} className="bc-btn-secondary text-sm">Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateClassModal({ form, setForm, creating, error, onClose, onSubmit }: {
  form: { name: string; description: string; grade: string; tahunAjaran: string };
  setForm: (f: { name: string; description: string; grade: string; tahunAjaran: string }) => void;
  creating: boolean; error: string; onClose: () => void; onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="bc-sheet-overlay" role="dialog" aria-modal="true" aria-label="Buat kelas">
      <div className="bc-sheet">
        <div className="px-5 pt-5 pb-2 flex items-center justify-between">
          <p className="text-[17px] font-bold text-[var(--clr-text)]">Buat Kelas</p>
          <button type="button" onClick={onClose} aria-label="Tutup" className="w-10 h-10 rounded-full bg-[var(--clr-surface-2)] text-[var(--clr-text-2)] flex items-center justify-center"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="px-5 pb-6 space-y-3.5 pt-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama kelas (mis. Bahasa Indonesia — 7A)" className="bc-input text-sm" aria-label="Nama kelas" required />
          <input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi (opsional)" className="bc-input text-sm" aria-label="Deskripsi" />
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-semibold text-[var(--clr-text-2)] mb-1">Jenjang</span>
              <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} className="bc-input text-sm" aria-label="Jenjang">
                {["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"].map((g) => <option key={g} value={g}>Kelas {g}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-[var(--clr-text-2)] mb-1">Tahun ajaran</span>
              <input value={form.tahunAjaran} onChange={(e) => setForm({ ...form, tahunAjaran: e.target.value })} placeholder="2026/2027" className="bc-input text-sm" aria-label="Tahun ajaran" />
            </label>
          </div>
          {error && <p className="text-xs font-semibold text-[var(--clr-danger)]">{error}</p>}
          <button type="submit" disabled={creating || !form.name.trim()} className="bc-btn-primary w-full text-sm">
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
            {creating ? "Membuat..." : "Buat Kelas"}
          </button>
        </form>
      </div>
    </div>
  );
}

function NewClassCodeModal({ code, onClose }: { code: { code: string; name: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bc-sheet-overlay" role="dialog" aria-modal="true" aria-label="Kode kelas">
      <div className="bc-sheet">
        <div className="px-6 py-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[var(--clr-accent-soft)] text-[var(--clr-accent-strong)] flex items-center justify-center mx-auto">
            <GraduationCap size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--clr-text)]">{code.name} siap!</h2>
            <p className="text-sm text-[var(--clr-text-2)] mt-1">Bagikan kode ini agar murid bisa bergabung:</p>
            <p className="text-3xl font-mono font-bold tracking-widest text-[var(--clr-accent-strong)] mt-3">{code.code}</p>
          </div>
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(code.code); setCopied(true); }}
            className="bc-btn-primary w-full text-sm"
          >
            {copied ? <CheckCircle2 size={16} /> : <ClipboardCopy size={16} />}
            {copied ? "Tersalin!" : "Salin Kode"}
          </button>
          <button type="button" onClick={onClose} className="bc-btn-secondary w-full text-sm">Selesai</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ name, deleting, onCancel, onConfirm }: { name: string; deleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="bc-sheet-overlay" role="dialog" aria-modal="true" aria-label="Hapus kelas">
      <div className="bc-sheet">
        <div className="px-6 py-7 space-y-4">
          <h2 className="text-lg font-bold text-[var(--clr-text)]">Hapus kelas "{name}"?</h2>
          <p className="text-sm text-[var(--clr-text-2)]">Kelas akan dihapus dari daftar aktif. Data kelas lain tidak terpengaruh.</p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} disabled={deleting} className="bc-btn-secondary flex-1 text-sm">Batal</button>
            <button type="button" onClick={onConfirm} disabled={deleting} className="bc-btn-primary flex-1 text-sm bg-[var(--clr-danger)] hover:opacity-90" style={{ background: "var(--clr-danger)" }}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
