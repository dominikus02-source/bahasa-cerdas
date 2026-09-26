"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardCopy, FileText, GraduationCap, Megaphone, Plus, QrCode, Search, Trash2, Users, X, Pin, Pencil, RotateCw, Loader2, MessageCircle } from "lucide-react";
import "@/components/kelas/classroom.css";
import { humanDeadline } from "@/lib/classroom/deadline";
import { ClassPicker, type PickerClass } from "@/components/kelas/ClassPicker";
import { ClassroomComposer, readLastClassIds } from "@/components/kelas/ClassroomComposer";
import { SubmissionReview } from "@/components/kelas/SubmissionReview";
import { ClassShareCard } from "@/components/guru/gcs/ClassShareCard";
import ShareTaskButton from "@/components/kelas/ShareTaskButton";

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
  members: { id: string; fullName: string; avatar: string | null; email: string | null; xp: number; level: number; streak: number; league: string | null; lastActiveAt: string | null; attendanceNumber: string | null }[];
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
  const [penilaianStats, setPenilaianStats] = useState<any>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerInitial, setComposerInitial] = useState<string[] | undefined>(undefined);
  const [codeGroup, setCodeGroup] = useState<Group | null>(null);
  const [success, setSuccess] = useState<{ label: string; names: string[] } | null>(null);
  const [reviewPenugasan, setReviewPenugasan] = useState<DetailData["tugasPenugasan"][number] | null>(null);
  // Hapus tugas yang sudah dikirim (per kelas / latihan penuh).
  const [deleteTask, setDeleteTask] = useState<{ kind: "penugasan" | "latihan"; id: string; label: string } | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  const confirmDeleteTask = async () => {
    if (!deleteTask || deletingTask) return;
    setDeletingTask(true);
    try {
      const res = await fetch(
        deleteTask.kind === "penugasan" ? `/api/guru/penugasan/${deleteTask.id}` : `/api/guru/latihan/${deleteTask.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      setDeleteTask(null);
      setToast("Tugas berhasil dihapus.");
      if (activeGroup) loadDetail(activeGroup.id);
    } catch {
      setToast("Tugas belum berhasil dihapus. Silakan coba lagi.");
    } finally {
      setDeletingTask(false);
    }
  };
  // STEP 6.5 — "Kirim lagi": pilihan kelas terakhir (localStorage, aman).
  const [lastClassIds, setLastClassIds] = useState<string[]>([]);

  useEffect(() => {
    setLastClassIds(readLastClassIds());
  }, []);

  const openComposer = (initial?: string[]) => {
    setComposerInitial(initial);
    setComposerOpen(true);
  };

  // Pengumuman: edit lewat EditPengumumanModal (STEP 6.11); pembuatan via composer.
  const [editPengumuman, setEditPengumuman] = useState<DetailData["pengumuman"][number] | null>(null);
  const [pinBusyId, setPinBusyId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!activeGroup) { setPenilaianStats(null); return; }
    fetch("/api/guru/nilai/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const match = d?.stats?.find((s: any) => s.id === activeGroup.id);
        setPenilaianStats(match || null);
      })
      .catch(() => {});
  }, [activeGroup]);

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

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback: textarea + execCommand untuk browser tanpa Clipboard API
      // (pola sama dengan ClassCodeModal).
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* best-effort */ }
      document.body.removeChild(ta);
    }
    setCopied(code);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleRefreshCode = async (groupId: string) => {
    try {
      const res = await fetch(`/api/group/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateCode: true }),
      });
      if (!res.ok) { setToast("Kode kelas belum berhasil diperbarui. Coba lagi."); return; }
      const data = await res.json();
      const newCode: string | undefined = data?.group?.accessCode;
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, accessCode: newCode ?? g.accessCode } : g)));
      if (activeGroup?.id === groupId) setActiveGroup((prev) => (prev ? { ...prev, accessCode: newCode ?? prev.accessCode } : prev));
      setToast("Kode kelas berhasil diperbarui.");
      fetchGroups();
    } catch { setToast("Kode kelas belum berhasil diperbarui. Coba lagi."); }
  };

  const togglePin = async (p: DetailData["pengumuman"][number]) => {
    if (!activeGroup || pinBusyId) return;
    setPinBusyId(p.id);
    try {
      const res = await fetch(`/api/guru/pengumuman/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !p.pinned }),
      });
      if (!res.ok) { setToast("Gagal menyematkan pengumuman. Coba lagi."); return; }
      loadDetail(activeGroup.id);
    } catch { setToast("Gagal menyematkan pengumuman. Coba lagi."); } finally {
      setPinBusyId(null);
    }
  };

  const deletePengumuman = async (p: DetailData["pengumuman"][number]) => {
    if (!activeGroup) return;
    try {
      const res = await fetch(`/api/guru/pengumuman/${p.id}`, { method: "DELETE" });
      if (!res.ok) { setToast("Pengumuman belum berhasil dihapus. Coba lagi."); return; }
      loadDetail(activeGroup.id);
    } catch { setToast("Pengumuman belum berhasil dihapus. Coba lagi."); }
  };

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups;
  }, [groups, search]);

  const pickerClasses: PickerClass[] = useMemo(() => groups.map((g) => ({ id: g.id, name: g.name, memberCount: g.memberCount })), [groups]);

  // STEP 6.9 HOTFIX — hook (useMemo) WAJIB di atas semua early return:
  // React error #310 terjadi bila jumlah hook berubah antar render
  // (list view 0 hook tambahan vs detail view 1). stream dihitung di sini.
  const stream = useMemo(() => {
    if (!detail) return [];
    const items: { id: string; kind: "pengumuman" | "tugas" | "materi"; date: string; node: unknown }[] = [
      ...(detail.pengumuman ?? []).map((p) => ({ id: `p-${p.id}`, kind: "pengumuman" as const, date: p.createdAt, node: p })),
      ...(detail.tugasQuiz ?? []).map((t) => ({ id: `q-${t.id}`, kind: "tugas" as const, date: t.assignedAt, node: t })),
      ...(detail.tugasPenugasan ?? []).map((p) => ({ id: `t-${p.id}`, kind: "tugas" as const, date: p.createdAt, node: p })),
      ...(detail.materis ?? []).map((m) => ({ id: `m-${m.id}`, kind: "materi" as const, date: m.createdAt, node: m })),
    ];
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 40);
  }, [detail]);

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

          {/* P8B — Bagikan akses kelas (kontekstual, tampil bila ada kelas) */}
          {groups.length > 0 && <ClassShareCard variant="kelasku" />}

          {loading ? (
            <p className="text-sm text-[var(--clr-text-3)] text-center py-10">Memuat kelas...</p>
          ) : error ? (
            /* STEP 6.9 — error state manusiawi + tindakan (Coba Lagi) */
            <div className="bc-card bc-empty">
              <p className="text-sm font-bold text-[var(--clr-text)]">Kelas belum dapat dimuat.</p>
              <p className="text-xs text-[var(--clr-text-2)] mt-1">Periksa koneksi lalu coba lagi.</p>
              <button type="button" onClick={() => { setLoading(true); fetchGroups().finally(() => setLoading(false)); }} className="bc-btn-primary mt-4 text-sm mx-auto">
                <RotateCw size={16} /> Coba Lagi
              </button>
            </div>
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
                <div key={g.id} className={`bc-card overflow-hidden transition-colors bc-class-tint-${stableClassTint(g.id)}`}>
                  {/* Header tinted — identitas visual kelas (deterministik) */}
                  <div className="bc-class-header px-5 pt-4 pb-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ color: "var(--class-accent)", background: "var(--class-soft)" }}>
                      Kelas {g.grade}
                    </span>
                    <span className="text-[var(--clr-text-3)] opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowLeft size={16} className="rotate-180" />
                    </span>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <button type="button" onClick={() => openGroup(g)} className="w-full text-left group" aria-label={`Buka kelas ${g.name}`}>
                      <h3 className="text-lg font-bold text-[var(--clr-text)] truncate">{g.name}</h3>
                      <p className="flex items-center gap-1.5 text-sm text-[var(--clr-text-2)] mt-1">
                        <Users size={14} /> {g.memberCount} siswa
                      </p>
                    </button>

                    {/* STEP 6.9B — KODE KELAS prominent */}
                    <div className="flex items-center gap-3 rounded-xl border border-[var(--clr-border)] px-3 py-2.5" style={{ background: "var(--clr-surface-2)" }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--clr-text-3)]">Kode Kelas</p>
                        <p className="bc-class-code truncate">{g.accessCode}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCopy(g.accessCode); }}
                        className="bc-chip text-[11px] shrink-0"
                        aria-label={`Salin kode kelas ${g.name}`}
                      >
                        {copied === g.accessCode ? <CheckCircle2 size={14} className="text-[var(--clr-success)]" /> : <ClipboardCopy size={14} />}
                        {copied === g.accessCode ? "Tersalin" : "Salin"}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCodeGroup(g); }}
                        className="bc-btn-secondary text-xs"
                        aria-label={`Lihat kode kelas ${g.name}`}
                      >
                        <QrCode size={15} /> Lihat Kode
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(g); }}
                        className="text-[var(--clr-text-3)] hover:text-[var(--clr-danger)] p-2 ml-auto"
                        aria-label={`Hapus kelas ${g.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
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

        {/* STEP 6.9B — modal kode kelas (Lihat Kode) */}
        {codeGroup && <ClassCodeModal group={codeGroup} onClose={() => setCodeGroup(null)} />}

        {/* Hapus tugas yang sudah dikirim */}
        {deleteTask && (
          <ConfirmTaskDeleteModal
            kind={deleteTask.kind}
            label={deleteTask.label}
            deleting={deletingTask}
            onCancel={() => setDeleteTask(null)}
            onConfirm={confirmDeleteTask}
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
  return (
    <div className="bc-classroom p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-5">
        <button type="button" onClick={closeGroup} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--clr-text-2)] hover:text-[var(--clr-accent-strong)]">
          <ArrowLeft size={16} /> Kelasku
        </button>

        {/* STEP 6.11 — hero: satu primary action, identitas kelas via stableClassTint */}
        <div className={`bc-card p-5 md:p-6 bc-class-tint-${stableClassTint(activeGroup.id)}`}>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full" style={{ color: "var(--class-accent)", background: "var(--class-soft)" }}>
                Kelas {activeGroup.grade}
              </span>
              <h1 className="text-2xl md:text-[28px] font-bold text-[var(--clr-text)] mt-2 truncate">{activeGroup.name}</h1>
              <p className="flex items-center gap-1.5 text-sm text-[var(--clr-text-2)] mt-1">
                <Users size={14} /> {detail?.stats?.totalMurid ?? activeGroup.memberCount} siswa
                {detail && (detail.stats?.tugasAktif ?? 0) > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[var(--clr-warning)] font-semibold">
                    <FileText size={13} /> {detail.stats?.tugasAktif ?? 0} tugas aktif
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 shrink-0">
              {/* Kode kelas first-class: Salin · Lihat Kode (modal: WhatsApp) · Perbarui */}
              <div className="flex items-center gap-2 bg-[var(--clr-surface-2)] border border-[var(--clr-border)] rounded-xl px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--clr-text-3)]">Kode Kelas</p>
                  <code className="bc-class-code truncate">{activeGroup.accessCode}</code>
                </div>
                <button type="button" onClick={() => handleCopy(activeGroup.accessCode)} aria-label="Salin kode kelas" className="text-[var(--clr-text-3)] hover:text-[var(--clr-accent-strong)] p-1">
                  {copied === activeGroup.accessCode ? <CheckCircle2 size={16} className="text-[var(--clr-success)]" /> : <ClipboardCopy size={16} />}
                </button>
                <button type="button" onClick={() => setCodeGroup(activeGroup)} aria-label="Lihat kode kelas" className="text-[var(--clr-text-3)] hover:text-[var(--clr-accent-strong)] p-1">
                  <QrCode size={16} />
                </button>
                <button type="button" onClick={() => handleRefreshCode(activeGroup.id)} aria-label="Perbarui kode kelas" className="text-[var(--clr-text-3)] hover:text-[var(--clr-accent-strong)] p-1">
                  <RotateCw size={15} />
                </button>
              </div>
              <button type="button" onClick={() => openComposer(activeGroup ? [activeGroup.id] : undefined)} className="bc-btn-primary text-sm shrink-0">
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

        {detail && <TodayView detail={detail} lastClassIds={lastClassIds} groupId={activeGroup.id} onKirimLagi={(ids) => openComposer(ids)} onReview={setReviewPenugasan} />}

        {detailLoading && !detail ? (
          <p className="text-sm text-[var(--clr-text-3)] text-center py-10">Memuat kelas...</p>
        ) : tab === "aktivitas" && detail ? (
          <div className="space-y-3">
            {/* STEP 6.11 — pembuatan pengumuman lewat satu pintu: + Tambahkan → Pengumuman
                (ClassroomComposer.ContentTypePicker). Form inline permanen dihapus.
                Edit pengumuman tetap lewat EditPengumumanModal (PATCH). */}
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
                      ? (detail.ringkasanPenugasan ?? []).find((x) => x.id === (item.node as DetailData["tugasPenugasan"][number]).id)
                      : (detail.ringkasanQuiz ?? []).find((x) => x.id === (item.node as DetailData["tugasQuiz"][number]).id)
                  }
                  groupId={activeGroup.id}
                  onReview={setReviewPenugasan}
                  onDeleteTask={(t) => setDeleteTask(t)}
                  onEditPengumuman={setEditPengumuman}
                  onPin={togglePin}
                  onDeletePengumuman={deletePengumuman}
                  pinBusyId={pinBusyId}
                />
              ))
            )}
          </div>
        ) : tab === "materi" && detail ? (
          (detail.materis ?? []).length === 0 ? (
            <div className="bc-card bc-empty">
              <p className="text-sm font-bold text-[var(--clr-text)]">Belum ada materi</p>
              <p className="text-xs text-[var(--clr-text-2)] mt-1">Bagikan materi pertama dengan tombol + Tambahkan.</p>
              <button type="button" onClick={() => openComposer(activeGroup ? [activeGroup.id] : undefined)} className="bc-btn-primary mt-4 text-sm mx-auto">
                <Plus size={17} /> Tambahkan Materi
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {(detail.materis ?? []).map((m) => (
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
          <div className="space-y-4">
            {(detail.tugasQuiz ?? []).length === 0 && (detail.tugasPenugasan ?? []).length === 0 ? (
              <div className="bc-card bc-empty">
                <p className="text-sm font-bold text-[var(--clr-text)]">Belum ada tugas</p>
                <p className="text-xs text-[var(--clr-text-2)] mt-1">Berikan tugas pertama dengan tombol + Tambahkan.</p>
                <button type="button" onClick={() => openComposer(activeGroup ? [activeGroup.id] : undefined)} className="bc-btn-primary mt-4 text-sm mx-auto">
                  <Plus size={17} /> Tambahkan Tugas
                </button>
              </div>
            ) : (
              <>
                {(detail.tugasQuiz ?? []).map((t) => {
                  const r = (detail.ringkasanQuiz ?? []).find((x) => x.id === t.id);
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
                    <a href={`/guru/kuis/${t.quiz.id}/results?from=kelasku&groupId=${activeGroup.id}`} className="bc-btn-secondary text-xs shrink-0">Lihat Pengumpulan</a>
                    <ShareTaskButton taskType="QUIZ" quizId={t.quiz.id} groupId={activeGroup.id} />
                    <button
                      type="button"
                      onClick={() => setDeleteTask({ kind: "latihan", id: t.quiz.id, label: t.quiz.title })}
                      className="text-[var(--clr-text-3)] hover:text-[var(--clr-danger)] p-2 shrink-0"
                      aria-label={`Hapus latihan ${t.quiz.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  );
                })}
                {(detail.tugasPenugasan ?? []).map((p) => {
                  const r = (detail.ringkasanPenugasan ?? []).find((x) => x.id === p.id);
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
                    <ShareTaskButton taskType="PENUGASAN" penugasanId={p.id} groupId={activeGroup.id} />
                    <button
                      type="button"
                      onClick={() => setDeleteTask({ kind: "penugasan", id: p.id, label: p.judul })}
                      className="text-[var(--clr-text-3)] hover:text-[var(--clr-danger)] p-2 shrink-0"
                      aria-label={`Hapus tugas ${p.judul}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  );
                })}
                <div className="flex flex-wrap gap-2 pt-1">
                  <a href="/guru/tugas-murid" className="bc-btn-secondary text-xs">Lihat & nilai pengumpulan</a>
                </div>
              </>
            )}
          </div>
        ) : tab === "nilai" && detail ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bc-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--clr-text-3)]">Rata-rata Nilai</p>
                <p className="text-3xl font-bold text-[var(--clr-text)] mt-1">{detail.stats?.nilaiRata ?? "—"}</p>
                {detail.stats?.nilaiRata == null && (
                  <p className="text-xs text-[var(--clr-text-3)] mt-1">Belum ada nilai. Nilai muncul setelah tugas dinilai.</p>
                )}
              </div>
              <div className="bc-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--clr-text-3)]">Progres Belajar</p>
                <p className="text-3xl font-bold text-[var(--clr-text)] mt-1">{detail.stats?.progressMurid ?? 0}%</p>
              </div>
            </div>

            {penilaianStats && (
              <div className="bc-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[var(--clr-text)]">Ringkasan Penilaian</h4>
                  <a href="/guru/penilaian" className="bc-btn-secondary text-[10px] py-1 px-2">Buka Penilaian →</a>
                </div>
                {penilaianStats.rataKategoris && Object.keys(penilaianStats.rataKategoris).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(penilaianStats.rataKategoris).map(([nama, skor]: [string, any]) => (
                      <div key={nama} className="flex items-center justify-between text-xs">
                        <span className="text-[var(--clr-text-2)]">{nama}</span>
                        <span className={`font-semibold ${skor >= 80 ? "text-[var(--clr-accent)]" : skor >= 60 ? "text-[var(--clr-warning)]" : "text-[var(--clr-danger)]"}`}>
                          {skor}
                        </span>
                      </div>
                    ))}
                    {penilaianStats.belumDinilai > 0 && (
                      <p className="text-[10px] text-[var(--clr-danger)] font-medium pt-1">{penilaianStats.belumDinilai} nilai belum dinilai</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--clr-text-3)]">Belum ada kategori penilaian. Atur di halaman Penilaian.</p>
                )}
              </div>
            )}

            <ClassInsight groupId={activeGroup.id} />
            <div className="flex flex-wrap gap-2">
              <a href="/guru/penilaian" className="bc-btn-secondary text-xs">Buka Penilaian</a>
              <a href="/guru/gradebook" className="bc-btn-secondary text-xs">Buka Buku Nilai</a>
            </div>
          </div>
        ) : tab === "orang" && detail ? (
          <div className="space-y-3">
            <div className="bc-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--clr-text)]">Anggota Kelas</p>
                <p className="text-xs text-[var(--clr-text-2)] mt-0.5">
                  {detail.members?.length ?? 0} siswa tergabung di kelas ini
                </p>
              </div>
              <a href="/guru/data-siswa" className="bc-btn-secondary text-xs shrink-0">Kelola Data Siswa</a>
            </div>
            {(!detail.members || detail.members.length === 0) ? (
              <div className="bc-card bc-empty">
                <div className="w-14 h-14 rounded-2xl bg-[var(--clr-accent-soft)] text-[var(--clr-accent-strong)] flex items-center justify-center mx-auto mb-3">
                  <Users size={24} />
                </div>
                <p className="text-sm font-bold text-[var(--clr-text)]">Belum ada anggota</p>
                <p className="text-xs text-[var(--clr-text-2)] mt-1 max-w-xs mx-auto">
                  Bagikan kode kelas agar siswa bisa bergabung.
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {(detail.members ?? []).map((m) => (
                  <div key={m.id} className="bc-card p-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {(m.fullName || "??").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[var(--clr-text)] truncate">{m.fullName}</p>
                        {m.attendanceNumber && (
                          <span className="text-[10px] font-medium text-[var(--clr-accent-strong)] bg-[var(--clr-accent-soft)] rounded-full px-1.5 py-0.5 shrink-0">
                            #{m.attendanceNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[var(--clr-text-3)]">
                        <span>Lv {m.level || 1}</span>
                        {(m.streak ?? 0) > 0 && <span>🔥 {m.streak} streak</span>}
                        {m.lastActiveAt && (
                          <span>Terakhir: {new Date(m.lastActiveAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[var(--clr-accent-strong)]">{(m.xp || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-[var(--clr-text-3)]">XP</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {reviewPenugasan && (
          <SubmissionReview penugasanId={reviewPenugasan.id} groupId={activeGroup.id} onClose={() => setReviewPenugasan(null)} onGraded={() => loadDetail(activeGroup.id)} />
        )}

        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

        {/* STEP 6.11 — modal edit pengumuman (sheet) + modal kode kelas (Lihat Kode di hero) */}
        {editPengumuman && (
          <EditPengumumanModal
            pengumuman={editPengumuman}
            onClose={() => setEditPengumuman(null)}
            onSaved={() => { setEditPengumuman(null); loadDetail(activeGroup.id); }}
          />
        )}
        {codeGroup && <ClassCodeModal group={codeGroup} onClose={() => setCodeGroup(null)} />}

        {/* Hapus tugas yang sudah dikirim — dirender juga di cabang DETAIL
            (tombol hapus berada di tab Tugas & stream Aktivitas). */}
        {deleteTask && (
          <ConfirmTaskDeleteModal
            kind={deleteTask.kind}
            label={deleteTask.label}
            deleting={deletingTask}
            onCancel={() => setDeleteTask(null)}
            onConfirm={confirmDeleteTask}
          />
        )}

        <ClassroomComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          groups={pickerClasses}
          initialClassIds={activeGroup ? [activeGroup.id, ...(composerInitial ?? [])] : composerInitial}
          onDelivered={(info) => { setSuccess(info); setLastClassIds(readLastClassIds()); if (activeGroup) loadDetail(activeGroup.id); }}
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

/** STEP 6.4 — "Hari Ini di Kelas X": kondisi kelas dalam beberapa detik.
 *  STEP 6.11 — tanpa tombol tambah (primary action hanya di hero). */
function TodayView({ detail, lastClassIds, groupId, onKirimLagi, onReview }: {
  detail: DetailData;
  lastClassIds: string[];
  groupId: string;
  onKirimLagi: (ids: string[]) => void;
  onReview: (p: DetailData["tugasPenugasan"][number]) => void;
}) {
  const active = [
    ...(detail.tugasPenugasan ?? []).map((p) => {
      const r = (detail.ringkasanPenugasan ?? []).find((x) => x.id === p.id);
      return { id: p.id, judul: p.judul, jenis: "tugas" as const, sudah: r?.sudah ?? 0, belum: r?.belum ?? 0, total: detail.stats?.totalMurid ?? 0 };
    }),
    ...(detail.tugasQuiz ?? []).map((t) => {
      const r = (detail.ringkasanQuiz ?? []).find((x) => x.id === t.id);
      return { id: t.id, judul: t.quiz.title, jenis: "latihan" as const, sudah: r?.sudah ?? 0, belum: r?.belum ?? 0, total: detail.stats?.totalMurid ?? 0 };
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
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => { const p = detail.tugasPenugasan.find((x) => x.id === a.id); if (p) onReview(p); }} className="bc-chip text-[11px] shrink-0">Lihat Pengumpulan</button>
                  {(() => { const p = detail.tugasPenugasan.find((x) => x.id === a.id); return p ? <ShareTaskButton taskType="PENUGASAN" penugasanId={p.id} groupId={groupId} /> : null; })()}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {(() => { const t = detail.tugasQuiz.find((x) => x.id === a.id); return t ? <a href={`/guru/kuis/${t.quiz.id}/results?from=kelasku&groupId=${groupId}`} className="bc-chip text-[11px] shrink-0">Lihat Hasil</a> : null; })()}
                  {(() => { const t = detail.tugasQuiz.find((x) => x.id === a.id); return t ? <ShareTaskButton taskType="QUIZ" quizId={t.quiz.id} groupId={groupId} /> : null; })()}
                </div>
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

/** STEP 6.9B — warna kelas DETERMINISTIK dari class id (djb2 hash → index).
 *  Kelas yang sama selalu mendapat warna yang sama (tanpa Math.random). */
function stableClassTint(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) + hash + id.charCodeAt(i)) | 0;
  return Math.abs(hash) % 8;
}

/** STEP 6.9B — message WhatsApp otomatis (frontend; tanpa backend).
 *  Join URL memakai canonical site config (NEXT_PUBLIC_SITE_URL). */
function waShareUrl(name: string, code: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://bahasacerdas.com";
  const text = [
    "Halo, silakan bergabung ke kelas BahasaCerdas saya.",
    "",
    `Kelas: ${name}`,
    `Kode Kelas: ${code}`,
    "",
    "Gunakan kode tersebut untuk bergabung ke kelas.",
    `Bergabung: ${site}/murid/gabung-kelas`,
  ].join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

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

function StreamCard({ item, progress, groupId, onReview, onDeleteTask, onEditPengumuman, onPin, onDeletePengumuman, pinBusyId }: {
  item: { id: string; kind: "pengumuman" | "tugas" | "materi"; date: string; node: unknown };
  progress?: { sudah: number; sedang: number; belum: number };
  groupId: string;
  onReview: (p: DetailData["tugasPenugasan"][number]) => void;
  onDeleteTask: (t: { kind: "penugasan" | "latihan"; id: string; label: string }) => void;
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
          <>
            <button type="button" onClick={() => onReview(t as DetailData["tugasPenugasan"][number])} className="bc-btn-secondary text-xs shrink-0">Lihat Pengumpulan</button>
            <ShareTaskButton taskType="PENUGASAN" penugasanId={(t as DetailData["tugasPenugasan"][number]).id} groupId={groupId} />
          </>
        ) : (
          <>
            <a href={`/guru/kuis/${(t as DetailData["tugasQuiz"][number]).quiz.id}/results?from=kelasku&groupId=${groupId}`} className="bc-btn-secondary text-xs shrink-0">Lihat Pengumpulan</a>
            <ShareTaskButton taskType="QUIZ" quizId={(t as DetailData["tugasQuiz"][number]).quiz.id} groupId={groupId} />
          </>
        )}
        <button
          type="button"
          onClick={() => onDeleteTask(
            isPenugasan
              ? { kind: "penugasan", id: (t as DetailData["tugasPenugasan"][number]).id, label: (t as DetailData["tugasPenugasan"][number]).judul }
              : { kind: "latihan", id: (t as DetailData["tugasQuiz"][number]).quiz.id, label: (t as DetailData["tugasQuiz"][number]).quiz.title }
          )}
          className="text-[var(--clr-text-3)] hover:text-[var(--clr-danger)] p-2 shrink-0"
          aria-label={`Hapus ${isPenugasan ? "tugas" : "latihan"} ${isPenugasan ? (t as DetailData["tugasPenugasan"][number]).judul : (t as DetailData["tugasQuiz"][number]).quiz.title}`}
        >
          <Trash2 size={16} />
        </button>
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

/** STEP 6.11 — edit pengumuman (sheet). Pembuatan pengumuman tetap lewat
 *  composer (ContentTypePicker → PENGUMUMAN). Capability edit dipertahankan. */
function EditPengumumanModal({ pengumuman, onClose, onSaved }: {
  pengumuman: DetailData["pengumuman"][number];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [judul, setJudul] = useState(pengumuman.judul);
  const [deskripsi, setDeskripsi] = useState(pengumuman.deskripsi ?? "");
  const [tenggat, setTenggat] = useState(pengumuman.tenggat ? pengumuman.tenggat.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Escape menutup modal (a11y).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const res = await fetch(`/api/guru/pengumuman/${pengumuman.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judul: judul.trim(),
          deskripsi: deskripsi.trim(),
          tenggat: tenggat || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Gagal menyimpan pengumuman"); return; }
      onSaved();
    } catch {
      setErr("Gagal menyimpan pengumuman. Periksa koneksi Anda.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bc-sheet-overlay" role="dialog" aria-modal="true" aria-label="Edit pengumuman">
      <div className="bc-sheet">
        <div className="px-5 pt-5 pb-2 flex items-center justify-between">
          <p className="text-[17px] font-bold text-[var(--clr-text)]">Edit pengumuman</p>
          <button type="button" onClick={onClose} aria-label="Tutup" className="w-10 h-10 rounded-full bg-[var(--clr-surface-2)] text-[var(--clr-text-2)] flex items-center justify-center"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="px-5 pb-6 space-y-3.5 pt-3">
          <input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul pengumuman" className="bc-input text-sm" aria-label="Judul pengumuman" required />
          <textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Apa yang ingin kamu sampaikan? (opsional)" className="bc-input bc-textarea text-sm" aria-label="Isi pengumuman" />
          <label className="block">
            <span className="block text-xs font-semibold text-[var(--clr-text-2)] mb-1">Tenggat (opsional)</span>
            <input type="date" value={tenggat} onChange={(e) => setTenggat(e.target.value)} className="bc-input text-sm" aria-label="Tenggat pengumuman" />
          </label>
          {err && <p className="text-xs font-semibold text-[var(--clr-danger)]">{err}</p>}
          <button type="submit" disabled={saving || !judul.trim()} className="bc-btn-primary w-full text-sm">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>
      </div>
    </div>
  );
}

/** STEP 6.9B — modal kode kelas: kode besar, Salin, Bagikan WhatsApp. */
function ClassCodeModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const tint = `bc-class-tint-${stableClassTint(group.id)}`;

  // Escape menutup modal (a11y).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(group.accessCode);
    } catch {
      // Fallback: textarea + execCommand untuk browser tanpa Clipboard API.
      const ta = document.createElement("textarea");
      ta.value = group.accessCode;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* best-effort */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bc-sheet-overlay" role="dialog" aria-modal="true" aria-label={`Kode kelas ${group.name}`}>
      <div className={`bc-sheet bc-code-sheet ${tint}`}>
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--class-accent)" }}>Kelas {group.grade}</p>
            <h2 className="text-xl font-bold text-[var(--clr-text)]">{group.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="w-10 h-10 rounded-full bg-[var(--clr-surface-2)] text-[var(--clr-text-2)] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-2xl border px-4 py-6 text-center" style={{ borderColor: "var(--class-border)", background: "var(--class-soft)" }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--clr-text-3)] mb-2">Kode Kelas</p>
            <p className="bc-class-code text-[30px] leading-tight" aria-label={`Kode kelas ${group.accessCode}`}>{group.accessCode}</p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button type="button" onClick={copy} className="bc-btn-primary w-full text-sm" aria-live="polite">
              {copied ? <CheckCircle2 size={18} /> : <ClipboardCopy size={18} />}
              {copied ? "✓ Kode Disalin" : "Salin Kode"}
            </button>
            <a
              href={waShareUrl(group.name, group.accessCode)}
              target="_blank"
              rel="noopener noreferrer"
              className="bc-btn-secondary w-full text-sm"
            >
              <MessageCircle size={18} className="text-[#25D366]" />
              Bagikan ke WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Konfirmasi hapus tugas/latihan yang sudah dikirim ke kelas. */
function ConfirmTaskDeleteModal({ kind, label, deleting, onCancel, onConfirm }: {
  kind: "penugasan" | "latihan";
  label: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="bc-sheet-overlay" role="dialog" aria-modal="true" aria-label={`Hapus ${kind === "penugasan" ? "tugas" : "latihan"}`}>
      <div className="bc-sheet">
        <div className="px-6 py-7 space-y-4">
          <h2 className="text-lg font-bold text-[var(--clr-text)]">
            Hapus {kind === "penugasan" ? "tugas" : "latihan"} "{label}"?
          </h2>
          <p className="text-sm text-[var(--clr-text-2)]">
            {kind === "penugasan"
              ? "Tugas akan dihapus dari kelas ini. Pengumpulan murid ikut terhapus."
              : "Latihan akan dihapus dari semua kelas yang menerimanya. Pengumpulan murid ikut terhapus."}
          </p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel} disabled={deleting} className="bc-btn-secondary flex-1 text-sm">Batal</button>
            <button type="button" onClick={onConfirm} disabled={deleting} className="bc-btn-primary flex-1 text-sm" style={{ background: "var(--clr-danger)" }}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {deleting ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {  return (
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
