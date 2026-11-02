"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { KonfirmasiHapusDialog, KATA_KONFIRMASI_HAPUS } from "@/components/aku-sastrawan/KonfirmasiHapusDialog";
import { ArrowLeft, Plus, Save, Trash2, BookOpen, Download, Lock } from "lucide-react";

type Chapter = { id: string; title: string; content: string; orderIndex: number; wordCount: number };
export default function NovelChaptersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [canWrite, setCanWrite] = useState(true);
  const [upgradeUrl, setUpgradeUrl] = useState("/umum/premium");
  const [activeId, setActiveId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [hapusTerbuka, setHapusTerbuka] = useState(false);
  const [hapusGalat, setHapusGalat] = useState("");
  const tutupDialogHapus = useCallback(() => { setHapusTerbuka(false); setHapusGalat(""); }, []);
  const active = chapters.find((c) => c.id === activeId);
  const dirty = Boolean(active && (title !== active.title || body !== active.content));
  const confirmDiscard = () => !dirty || window.confirm("Ada perubahan yang belum disimpan. Buang perubahan ini?");
  const load = useCallback(async (id: string) => {
    const res = await fetch(`/api/aku-sastrawan/projects/${id}/chapters`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "Bab gagal dimuat.");
    setChapters(data.chapters);
    setCanWrite(data.canWrite !== false);
    if (typeof data.upgradeUrl === "string") setUpgradeUrl(data.upgradeUrl);
    if (data.chapters.length) {
      const first = data.chapters[0] as Chapter;
      setActiveId((current) => current && data.chapters.some((c: Chapter) => c.id === current) ? current : first.id);
    } else { setActiveId(""); setTitle(""); setBody(""); }
  }, []);
  useEffect(() => { let cancelled = false; params.then(({ projectId: id }) => { if (cancelled) return; setProjectId(id); load(id).catch((e) => setNotice(e.message)).finally(() => { if (!cancelled) setLoading(false); }); }); return () => { cancelled = true; }; }, [params, load]);
  useEffect(() => { if (!active) return; setTitle(active.title); setBody(active.content); }, [activeId, active?.title, active?.content]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function createChapter() {
    if (!projectId || !confirmDiscard()) return;
    setSaving(true); setNotice("");
    try {
      const res = await fetch(`/api/aku-sastrawan/projects/${projectId}/chapters`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `Bab ${chapters.length + 1}` }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Bab belum dapat dibuat.");
      await load(projectId); setActiveId(data.chapter.id); setNotice("Bab baru dibuat.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Bab belum dapat dibuat."); }
    finally { setSaving(false); }
  }
  async function saveChapter() {
    if (!active || saving) return;
    setSaving(true); setNotice("");
    try {
      const res = await fetch(`/api/aku-sastrawan/projects/${projectId}/chapters/${active.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, content: body }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Bab belum tersimpan.");
      setChapters((current) => current.map((c) => c.id === active.id ? data.chapter : c)); setNotice("Bab tersimpan ke akun BahasaCerdas.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Bab belum tersimpan."); }
    finally { setSaving(false); }
  }
  async function deleteChapter() {
    if (!active || saving) return;
    setSaving(true); setHapusGalat("");
    try {
      const res = await fetch(`/api/aku-sastrawan/projects/${projectId}/chapters/${active.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ konfirmasi: KATA_KONFIRMASI_HAPUS }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setHapusGalat(data.message || data.error || "Bab belum dihapus."); return; }
      setHapusTerbuka(false);
      await load(projectId); setNotice("Bab dihapus.");
    } catch { setHapusGalat("Koneksi bermasalah. Bab belum dihapus."); }
    finally { setSaving(false); }
  }
  const count = body.trim() ? body.trim().split(/\s+/u).length : 0;
  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border px-4 py-4 sm:px-6"><div className="mx-auto flex max-w-7xl items-center justify-between"><Link href="/aku-sastrawan/studio" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft size={16}/> Kembali ke Studio Menulis</Link><span className="text-xs text-muted-foreground">Manuskrip novel</span></div></header>
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">AKU SASTRAWAN · NOVEL</p><h1 className="mt-2 text-3xl font-black">Bab-bab novelmu.</h1><p className="mt-2 text-sm text-muted-foreground">Bangun manuskrip sedikit demi sedikit, satu bab pada satu waktu.</p></div><div className="flex flex-wrap gap-2">{projectId && <a href={`/api/aku-sastrawan/projects/${projectId}/export`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold"><Download size={16}/> Unduh .txt</a>}<button onClick={createChapter} disabled={saving || loading || !canWrite} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"><Plus size={16}/> Tambah bab</button></div></div>
      {!canWrite && !loading && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm"><p className="flex items-center gap-2 text-amber-800 dark:text-amber-200"><Lock size={15}/> Mode baca: bab-bab novelmu tetap aman dan bisa diunduh. Aktifkan Premium untuk menulis lagi.</p><Link href={upgradeUrl} className="inline-flex min-h-9 items-center rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground">Aktifkan Premium</Link></div>}
      {notice && <p role="status" className="mb-4 rounded-xl border border-border bg-muted/40 p-3 text-sm">{notice}</p>}
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-border bg-card p-3"><h2 className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Daftar bab ({chapters.length})</h2>{loading ? <p className="p-3 text-sm text-muted-foreground">Memuat bab…</p> : chapters.length ? chapters.map((chapter) => <button key={chapter.id} onClick={() => { if (chapter.id !== activeId && confirmDiscard()) setActiveId(chapter.id); }} className={`mb-1 w-full rounded-xl p-3 text-left ${chapter.id === activeId ? "bg-primary/10" : "hover:bg-muted"}`}><span className="block text-xs text-muted-foreground">Bab {chapter.orderIndex}</span><span className="mt-1 block truncate text-sm font-semibold">{chapter.title}</span><span className="mt-1 block text-xs text-muted-foreground">{chapter.wordCount} kata</span></button>) : <div className="p-3 text-sm leading-6 text-muted-foreground"><BookOpen size={20} className="mb-2"/>Belum ada bab. Tekan “Tambah bab” untuk mulai.</div>}</aside>
        <section className="overflow-hidden rounded-3xl border border-border bg-card">{active ? <><div className="border-b border-border p-4 sm:p-6"><label htmlFor="chapter-title" className="text-xs font-bold text-muted-foreground">JUDUL BAB</label><input id="chapter-title" readOnly={!canWrite} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className="mt-2 w-full bg-transparent text-2xl font-black outline-none" placeholder="Misalnya: Pertemuan pertama"/></div><div className="border-b border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">{count} kata · Bab {active.orderIndex}{dirty ? " · Belum disimpan" : " · Tersimpan"}</div><textarea readOnly={!canWrite} value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[60vh] w-full resize-y bg-card px-5 py-6 font-serif text-lg leading-8 outline-none sm:px-8 sm:py-8" placeholder="Mulai tulis bab ini…"/><div className="flex flex-wrap justify-between gap-3 border-t border-border px-4 py-4"><button onClick={() => { setHapusGalat(""); setHapusTerbuka(true); }} disabled={saving || !canWrite} title={canWrite ? undefined : "Hapus bab memerlukan Premium aktif"} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold disabled:opacity-50"><Trash2 size={15}/> Hapus bab</button><button onClick={saveChapter} disabled={saving || !canWrite} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"><Save size={15}/>{saving ? "Menyimpan…" : "Simpan bab"}</button></div></> : <div className="p-8 text-sm text-muted-foreground">{loading ? "Memuat manuskrip…" : "Buat bab pertama untuk mulai menulis novel."}</div>}</section>
      </div>
    </div>
    <KonfirmasiHapusDialog
      open={hapusTerbuka}
      judul="Hapus bab ini secara permanen?"
      deskripsi={`“${active?.title || "Bab tanpa judul"}” akan dihapus dari manuskrip dan tidak dapat dipulihkan. Unduh .txt terlebih dahulu bila ingin menyimpan salinan.`}
      peringatan={dirty ? "Ada perubahan yang belum disimpan di bab ini." : undefined}
      sibuk={saving}
      galat={hapusGalat}
      onBatal={tutupDialogHapus}
      onHapus={() => void deleteChapter()}
    />
  </main>;
}
