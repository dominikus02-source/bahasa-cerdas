"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { KonfirmasiHapusDialog, KATA_KONFIRMASI_HAPUS } from "@/components/aku-sastrawan/KonfirmasiHapusDialog";
import { ArrowLeft, BookOpen, Check, Clock3, FilePlus2, Feather, LoaderCircle, Save, Trash2, Sparkles, Layers3, Download, Lock } from "lucide-react";

type Project = {
  id: string;
  title: string;
  genre: "CERPEN" | "NOVEL";
  synopsis?: string | null;
  content: string;
  status: "DRAFT" | "REVISION" | "COMPLETED";
  wordCount: number;
  updatedAt: string;
};

const label = (genre: string) => genre === "NOVEL" ? "Novel" : "Cerpen";

export default function WritingStudioPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Draf tersimpan di server setelah menekan Simpan.");
  const [coachPrompt, setCoachPrompt] = useState("Berikan umpan balik tentang kekuatan naskah ini dan tiga hal paling penting untuk diperbaiki.");
  const [coachReply, setCoachReply] = useState("");
  const [coachBusy, setCoachBusy] = useState(false);
  // Read-only mode: premium ended (or never active). Drafts stay readable + exportable.
  const [canWrite, setCanWrite] = useState(true);
  const [upgradeUrl, setUpgradeUrl] = useState("/umum/premium");
  const [hapusTerbuka, setHapusTerbuka] = useState(false);
  const [hapusSibuk, setHapusSibuk] = useState(false);
  const [hapusGalat, setHapusGalat] = useState("");
  const dirty = Boolean(active && (title !== active.title || synopsis !== (active.synopsis || "") || content !== (active.content || "")));
  const confirmDiscard = () => !dirty || window.confirm("Ada perubahan yang belum disimpan. Buang perubahan ini?");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/aku-sastrawan/projects", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || data.error || "Tidak dapat memuat karya.");
        return;
      }
      setProjects(data.projects || []);
      const bisaMenulis = data.canWrite !== false;
      setCanWrite(bisaMenulis);
      if (typeof data.upgradeUrl === "string") setUpgradeUrl(data.upgradeUrl);
      setMessage(bisaMenulis ? "Pilih karya untuk melanjutkan, atau buat proyek baru." : "Mode baca: pilih karya untuk dibaca atau diunduh.");
    } catch {
      setMessage("Koneksi bermasalah. Coba muat ulang halaman.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadProjects(); }, [loadProjects]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const openProject = async (project: Project) => {
    if (project.id !== active?.id && !confirmDiscard()) return;
    setMessage("Memuat naskah…");
    try {
      const response = await fetch(`/api/aku-sastrawan/projects/${project.id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) { setMessage(data.message || data.error || "Naskah tidak dapat dibuka. Draf yang sedang terbuka tetap dipertahankan."); return; }
      const p = data.project as Project;
      // Replace the editor only after the full manuscript loads successfully.
      // The project-list response omits content; setting state early could blank the editor
      // on a network error and risk saving an empty manuscript over the original.
      setTitle(p.title);
      setSynopsis(p.synopsis || "");
      setContent(p.content || "");
      setActive(p);
      setMessage(canWrite ? "Naskah terbuka. Simpan perubahan secara berkala." : "Naskah terbuka dalam mode baca. Kamu bisa membaca dan mengunduhnya.");
    } catch {
      setMessage("Gagal memuat naskah. Draf yang sedang terbuka tetap dipertahankan; periksa koneksi lalu coba lagi.");
    }
  };

  const createProject = async (genre: "CERPEN" | "NOVEL") => {
    if (!confirmDiscard()) return;
    const name = window.prompt(`Beri judul awal untuk proyek ${label(genre).toLowerCase()}:`, genre === "NOVEL" ? "Novel tanpa judul" : "Cerpen tanpa judul");
    if (name === null) return;
    try {
      const response = await fetch("/api/aku-sastrawan/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: name.trim() || "Tanpa judul", genre }),
      });
      const data = await response.json();
      if (!response.ok) { setMessage(data.message || data.error || "Proyek belum dapat dibuat."); return; }
      await loadProjects();
      await openProject(data.project);
    } catch { setMessage("Proyek gagal dibuat. Periksa koneksi."); }
  };

  const saveProject = useCallback(async () => {
    if (!active) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/aku-sastrawan/projects/${active.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, synopsis, content }),
      });
      const data = await response.json();
      if (!response.ok) { setMessage(data.message || data.error || "Gagal menyimpan naskah."); return; }
      setActive(data.project);
      setProjects((current) => current.map((p) => p.id === active.id ? { ...p, title: data.project.title, synopsis: data.project.synopsis, wordCount: data.project.wordCount, updatedAt: data.project.updatedAt } : p));
      setMessage("Tersimpan di server · " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    } catch { setMessage("Gagal menyimpan. Salin drafmu sebelum meninggalkan halaman."); }
    finally { setSaving(false); }
  }, [active, title, synopsis, content]);

  const bukaDialogHapus = () => { if (!active || !canWrite) return; setHapusGalat(""); setHapusTerbuka(true); };
  const tutupDialogHapus = useCallback(() => { setHapusTerbuka(false); setHapusGalat(""); }, []);
  const deleteProject = async () => {
    if (!active || hapusSibuk) return;
    setHapusSibuk(true); setHapusGalat("");
    try {
      const response = await fetch(`/api/aku-sastrawan/projects/${active.id}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ konfirmasi: KATA_KONFIRMASI_HAPUS }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setHapusGalat(data.message || data.error || "Karya belum dapat dihapus."); return; }
      setHapusTerbuka(false);
      setActive(null); setTitle(""); setSynopsis(""); setContent("");
      await loadProjects();
      setMessage("Karya dihapus.");
    } catch { setHapusGalat("Koneksi bermasalah. Karya belum dihapus."); }
    finally { setHapusSibuk(false); }
  };

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  const askCoach = async () => {
    if (!active || coachBusy) return;
    if (!content.trim()) { setMessage("Tulis cuplikan naskah terlebih dahulu agar pendamping bisa memberi masukan."); return; }
    setCoachBusy(true); setCoachReply(""); setMessage("Mengirim cuplikan naskah ke Pendamping Menulis AI…");
    try {
      const response = await fetch("/api/aku-sastrawan/coach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: coachPrompt, track: active.genre === "NOVEL" ? "novel" : "cerpen", task: "Umpan balik naskah", context: [`Judul: ${title}`, `Sinopsis: ${synopsis}`, content.slice(0, 12000)].join("\n\n") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || "Pendamping Menulis AI belum tersedia.");
      setCoachReply(data.reply); setMessage("Masukan pendamping siap. Naskah asli tidak diubah.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Pendamping Menulis AI belum tersedia."); }
    finally { setCoachBusy(false); }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/aku-sastrawan" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size={16} /> AKU SASTRAWAN</Link>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><Feather size={15} /> Studio Menulis</div>
          <button onClick={() => void saveProject()} disabled={!active || saving || !canWrite} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Simpan
          </button>
        </div>
      </header>

      {!canWrite && !loading && (
        <div className="border-b border-amber-500/30 bg-amber-500/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6">
            <p className="flex items-center gap-2 text-amber-800 dark:text-amber-200"><Lock size={15} /> Mode baca: drafmu tetap aman, bisa dibuka dan diunduh. Aktifkan Premium untuk menulis lagi.</p>
            <Link href={upgradeUrl} className="inline-flex min-h-9 items-center rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground">Aktifkan Premium</Link>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:py-8">
        <aside className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Karya pribadimu</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">Studio Menulis</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Tempat ide bertumbuh menjadi cerita yang selesai.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={!canWrite} onClick={() => void createProject("CERPEN")} className="flex min-h-11 disabled:opacity-50 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:border-primary/40"><FilePlus2 size={16} /> Cerpen</button>
            <button disabled={!canWrite} onClick={() => void createProject("NOVEL")} className="flex min-h-11 disabled:opacity-50 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold hover:border-primary/40"><BookOpen size={16} /> Novel</button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Proyekmu</h2><span className="text-xs text-muted-foreground">{projects.length} karya</span></div>
            {loading ? <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">Memuat karya…</p> : projects.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-5 text-center"><Feather size={22} className="mx-auto text-muted-foreground" /><p className="mt-3 text-sm font-semibold">Mulai dari satu ide</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Buat proyek cerpen atau novel pertamamu.</p></div> : projects.map((p) => (
              <button key={p.id} onClick={() => void openProject(p)} className={`w-full rounded-xl border p-3 text-left transition ${active?.id === p.id ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:border-primary/30"}`}>
                <span className="block truncate text-sm font-bold">{p.title}</span><span className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{label(p.genre)}{active?.id === p.id && dirty ? " · Belum disimpan" : ""}</span><span>{p.wordCount} kata</span></span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
          {!active ? <div className="flex min-h-[520px] flex-col items-center justify-center px-6 py-12 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Feather size={26} /></span><h2 className="mt-5 text-xl font-black">Ceritamu dimulai di sini.</h2><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Buat proyek baru atau pilih naskah di sebelah kiri. Draf disimpan secara privat di akun BahasaCerdas milikmu.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><button disabled={!canWrite} onClick={() => void createProject("CERPEN")} className="disabled:opacity-50 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Tulis cerpen</button><button disabled={!canWrite} onClick={() => void createProject("NOVEL")} className="disabled:opacity-50 rounded-full border border-border px-5 py-2.5 text-sm font-bold">Mulai novel</button></div></div> : <>
            <div className="border-b border-border p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{label(active.genre)} · Draf pribadi</span><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 size={13} /> {words} kata</span></div>
              <input readOnly={!canWrite} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-label="Judul karya" placeholder="Judul ceritamu" className="mt-4 w-full bg-transparent text-2xl font-black tracking-tight outline-none placeholder:text-muted-foreground/60 sm:text-3xl" />
              <textarea readOnly={!canWrite} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} maxLength={10000} aria-label="Sinopsis" placeholder="Sinopsis atau catatan cerita (opsional)…" rows={2} className="mt-3 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none focus:border-primary/50" />
            </div>
            <textarea readOnly={!canWrite} value={content} onChange={(e) => setContent(e.target.value)} aria-label="Isi naskah" placeholder={"Mulai menulis di sini…\n\nTidak perlu sempurna pada draf pertama. Teruskan ceritamu."} className="min-h-[55vh] w-full resize-y bg-card px-4 py-5 text-base leading-8 outline-none sm:px-7 sm:py-7" />
            {active.genre === "NOVEL" && <div className="border-t border-border px-4 py-4 sm:px-6"><Link href={"/aku-sastrawan/novel/" + active.id} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold"><Layers3 size={16}/> Kelola bab novel</Link></div>}
            <div className="border-t border-border p-4 sm:p-6">
              <div className="flex items-center gap-2"><Sparkles size={18} className="text-primary"/><h2 className="text-lg font-bold">Pendamping Menulis AI</h2><span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Premium</span></div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Minta masukan tentang karakter, konflik, dialog, struktur, atau revisi. Pendamping memberi saran; suara dan keputusan kreatif tetap milikmu.</p>
              {!canWrite && <p className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200"><Lock size={13}/> Pendamping Menulis AI hanya tersedia selama Premium aktif. <Link href={upgradeUrl} className="font-bold underline underline-offset-4">Aktifkan Premium</Link></p>}
              <textarea readOnly={!canWrite} value={coachPrompt} onChange={(e) => setCoachPrompt(e.target.value)} rows={2} maxLength={8000} className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary" placeholder="Apa yang ingin kamu diskusikan dengan pendamping?"/>
              <button onClick={() => void askCoach()} disabled={coachBusy || !canWrite} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"><Sparkles size={15}/>{coachBusy ? "Pendamping sedang membaca…" : "Minta masukan"}</button>
              {coachReply && <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-7">{coachReply}</div>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3 sm:px-6"><p className="flex items-center gap-2 text-xs text-muted-foreground"><Check size={14} /> {dirty ? "Ada perubahan yang belum disimpan." : message}</p><div className="flex items-center gap-4"><a href={`/api/aku-sastrawan/projects/${active.id}/export`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:opacity-80"><Download size={14} /> Unduh .txt</a>{canWrite && <button onClick={bukaDialogHapus} className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:opacity-80"><Trash2 size={14} /> Hapus karya</button>}</div></div>
          </>}
        </section>
      </div>
      <KonfirmasiHapusDialog
        open={hapusTerbuka}
        judul="Hapus karya ini secara permanen?"
        deskripsi={`“${active?.title || "Tanpa judul"}” beserta seluruh isinya${active?.genre === "NOVEL" ? " dan semua babnya" : ""} akan dihapus dari akunmu dan tidak dapat dipulihkan. Unduh .txt terlebih dahulu bila ingin menyimpan salinan.`}
        peringatan={dirty ? "Ada perubahan yang belum disimpan di karya ini." : undefined}
        sibuk={hapusSibuk}
        galat={hapusGalat}
        onBatal={tutupDialogHapus}
        onHapus={() => void deleteProject()}
      />
    </main>
  );
}
