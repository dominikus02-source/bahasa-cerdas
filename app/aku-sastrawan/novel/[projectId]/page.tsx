"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Check, CloudOff, LoaderCircle, Lock, Plus, Trash2 } from "lucide-react";
import { KonfirmasiHapusDialog, KATA_KONFIRMASI_HAPUS } from "@/components/aku-sastrawan/KonfirmasiHapusDialog";
import { useAutosave, bacaCadangan, hapusCadangan } from "@/components/aku-sastrawan/studio/useAutosave";
import { MenuUnduh } from "@/components/aku-sastrawan/studio/MenuUnduh";
import { hitungKata } from "@/lib/aku-sastrawan/peta-cerita";

type Chapter = { id: string; title: string; content: string; orderIndex: number; wordCount: number };
type Muatan = { title: string; content: string };

export default function NovelChaptersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [canWrite, setCanWrite] = useState(true);
  const [upgradeUrl, setUpgradeUrl] = useState("/umum/premium");
  const [activeId, setActiveId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sibuk, setSibuk] = useState(false);
  const [notice, setNotice] = useState("");
  const [hapusTerbuka, setHapusTerbuka] = useState(false);
  const [hapusGalat, setHapusGalat] = useState("");
  const [cadangan, setCadangan] = useState<Muatan | null>(null);
  const isiRef = useRef<HTMLTextAreaElement>(null);
  const tutupDialogHapus = useCallback(() => { setHapusTerbuka(false); setHapusGalat(""); }, []);
  const active = chapters.find((c) => c.id === activeId);

  const nilai = useMemo<Muatan>(() => ({ title, content: body }), [title, body]);
  const simpanBab = useCallback(async (m: Muatan, { keepalive, kunci }: { keepalive: boolean; kunci: string }) => {
    const babId = kunci.replace(/^bab:/, "");
    if (!projectId || !babId) return;
    const kirim = JSON.stringify(m);
    const res = await fetch(`/api/aku-sastrawan/projects/${projectId}/chapters/${babId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: kirim, keepalive: keepalive && kirim.length < 60_000,
    });
    if (!res.ok) throw new Error("gagal");
    const data = await res.json().catch(() => null) as { chapter?: Chapter } | null;
    const c = data?.chapter;
    if (c) setChapters((list) => list.map((x) => (x.id === c.id ? { ...x, title: c.title, wordCount: c.wordCount, content: m.content } : x)));
  }, [projectId]);
  const simpan = useAutosave<Muatan>({ kunci: activeId ? `bab:${activeId}` : null, nilai, aktif: canWrite && !!activeId, simpan: simpanBab });

  const { tetapkanAwal } = simpan;
  const pilih = useCallback((c: Chapter | undefined) => {
    setCadangan(null);
    if (!c) { setActiveId(""); setTitle(""); setBody(""); return; }
    const salinan = bacaCadangan<Muatan>(`bab:${c.id}`)?.nilai;
    if (salinan && (salinan.title !== c.title || salinan.content !== c.content)) setCadangan(salinan);
    else if (salinan) hapusCadangan(`bab:${c.id}`);
    tetapkanAwal({ title: c.title, content: c.content });
    setTitle(c.title); setBody(c.content); setActiveId(c.id);
  }, [tetapkanAwal]);

  const load = useCallback(async (id: string, pilihId?: string) => {
    const res = await fetch(`/api/aku-sastrawan/projects/${id}/chapters`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "Bab gagal dimuat.");
    const list = data.chapters as Chapter[];
    setChapters(list);
    setCanWrite(data.canWrite !== false);
    if (typeof data.upgradeUrl === "string") setUpgradeUrl(data.upgradeUrl);
    pilih(list.find((c) => c.id === pilihId) ?? list[0]);
  }, [pilih]);

  useEffect(() => {
    let batal = false;
    params.then(({ projectId: id }) => {
      if (batal) return;
      setProjectId(id);
      load(id).catch((e) => setNotice(e.message)).finally(() => { if (!batal) setLoading(false); });
    });
    return () => { batal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    const el = isiRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, window.innerHeight * 0.5)}px`;
  }, [body, activeId]);

  const amankan = async () => {
    if (!canWrite || !activeId) return true;
    if (await simpan.simpanSekarang()) return true;
    return window.confirm("Perubahan terakhir belum sampai ke server, tetapi tersalin di perangkat ini. Tetap lanjut?");
  };
  const gantiBab = async (c: Chapter) => { if (c.id === activeId || !(await amankan())) return; pilih(c); };

  async function createChapter() {
    if (!projectId || sibuk || !(await amankan())) return;
    setSibuk(true); setNotice("");
    try {
      const res = await fetch(`/api/aku-sastrawan/projects/${projectId}/chapters`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `Bab ${chapters.length + 1}` }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Bab belum dapat dibuat.");
      await load(projectId, data.chapter.id);
      window.setTimeout(() => isiRef.current?.focus(), 50);
    } catch (e) { setNotice(e instanceof Error ? e.message : "Bab belum dapat dibuat."); }
    finally { setSibuk(false); }
  }
  async function deleteChapter() {
    if (!active || sibuk) return;
    setSibuk(true); setHapusGalat("");
    try {
      const res = await fetch(`/api/aku-sastrawan/projects/${projectId}/chapters/${active.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ konfirmasi: KATA_KONFIRMASI_HAPUS }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setHapusGalat(data.message || data.error || "Bab belum dihapus."); return; }
      setHapusTerbuka(false);
      setActiveId("");
      await load(projectId);
    } catch { setHapusGalat("Koneksi bermasalah. Bab belum dihapus."); }
    finally { setSibuk(false); }
  }

  const st = simpan.status;
  const kata = hitungKata(body);
  const kembali = projectId ? `/aku-sastrawan/studio?karya=${encodeURIComponent(projectId)}` : "/aku-sastrawan/studio";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
          <Link href={kembali} onClick={(e) => { if (simpan.belumTersimpan) { e.preventDefault(); void amankan().then((ok) => { if (ok) window.location.href = kembali; }); } }} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft size={16} /> Naskah</Link>
          <div className="flex items-center gap-1">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status" aria-live="polite">
              {!canWrite ? (<><Lock size={13} /> Mode baca</>)
                : !activeId ? null
                : st === "gagal" ? (<button onClick={() => void simpan.simpanSekarang()} className="inline-flex items-center gap-1.5 text-destructive"><CloudOff size={13} /> Belum tersimpan · Coba lagi</button>)
                : st === "tersimpan" ? (<><Check size={13} /> Tersimpan</>)
                : (<><LoaderCircle size={13} className="animate-spin" /> Menyimpan…</>)}
            </span>
            {projectId && <MenuUnduh projectId={projectId} sebelumUnduh={() => simpan.simpanSekarang()} />}
            {canWrite && <button onClick={() => void createChapter()} disabled={sibuk || loading} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60"><Plus size={15} /> Tambah bab</button>}
          </div>
        </div>
        {!canWrite && !loading && (
          <div className="border-t border-border/60"><p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-xs text-muted-foreground">Bab-bab novelmu aman — bisa dibaca dan diunduh. <Link href={upgradeUrl} className="font-semibold text-foreground underline underline-offset-4">Aktifkan Premium untuk menulis lagi</Link></p></div>
        )}
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-32 pt-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:pt-12">
        <nav aria-label="Daftar bab" className="lg:sticky lg:top-20 lg:self-start">
          <p className="hidden px-2 pb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground lg:block">Bab · {chapters.length}</p>
          {loading ? <p className="px-2 text-sm text-muted-foreground">Memuat bab…</p> : chapters.length ? (
            <ul className="-mx-1 flex gap-1.5 overflow-x-auto pb-1 lg:mx-0 lg:block lg:space-y-0.5 lg:overflow-visible">
              {chapters.map((c) => (
                <li key={c.id} className="shrink-0">
                  <button onClick={() => void gantiBab(c)} aria-current={c.id === activeId ? "true" : undefined} className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${c.id === activeId ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <span className="block whitespace-nowrap lg:truncate"><span className="tabular-nums">{c.orderIndex}.</span> {c.title}</span>
                    <span className="hidden text-xs opacity-70 lg:block">{c.wordCount.toLocaleString("id-ID")} kata</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </nav>

        <section className="min-w-0">
          {notice && <p role="status" className="mx-auto mb-6 max-w-[680px] rounded-xl bg-muted/40 px-4 py-3 text-sm">{notice}</p>}
          {active ? (
            <article className="mx-auto w-full max-w-[680px]">
              {cadangan && canWrite && (
                <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Ada salinan bab ini yang belum tersimpan di perangkat ini.</span>
                  <span className="flex gap-2">
                    <button onClick={() => { setTitle(cadangan.title); setBody(cadangan.content); setCadangan(null); }} className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">Pulihkan</button>
                    <button onClick={() => { hapusCadangan(`bab:${activeId}`); setCadangan(null); }} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Abaikan</button>
                  </span>
                </div>
              )}
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Bab {active.orderIndex}</p>
              <input id="chapter-title" readOnly={!canWrite} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} aria-label="Judul bab" placeholder="Judul bab" className="mt-3 w-full bg-transparent font-display text-[30px] leading-tight tracking-tight outline-none placeholder:text-muted-foreground/40 sm:text-[38px]" />
              <textarea ref={isiRef} readOnly={!canWrite} value={body} onChange={(e) => setBody(e.target.value)} onBlur={() => { if (canWrite) void simpan.simpanSekarang(); }} aria-label="Isi bab" placeholder={canWrite ? "Mulai tulis bab ini…" : ""} className="mt-8 w-full resize-none overflow-hidden bg-transparent font-display text-[19px] leading-[1.85] outline-none placeholder:text-muted-foreground/40 sm:text-[20px]" />
              <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
                <span className="tabular-nums">{kata.toLocaleString("id-ID")} kata</span>
                {canWrite && <button onClick={() => { setHapusGalat(""); setHapusTerbuka(true); }} disabled={sibuk} className="inline-flex items-center gap-1.5 transition hover:text-destructive"><Trash2 size={13} /> Hapus bab</button>}
              </div>
            </article>
          ) : !loading && (
            <div className="mx-auto max-w-[680px] py-16 text-center">
              <BookOpen size={22} className="mx-auto text-muted-foreground" />
              <p className="mt-4 font-display text-2xl">Belum ada bab.</p>
              <p className="mt-2 text-sm text-muted-foreground">{canWrite ? "Tambah bab pertama untuk mulai." : "Novel ini belum memiliki bab."}</p>
            </div>
          )}
        </section>
      </div>

      <KonfirmasiHapusDialog
        open={hapusTerbuka}
        judul="Hapus bab ini secara permanen?"
        deskripsi={`“${active?.title || "Bab tanpa judul"}” akan dihapus dari manuskrip dan tidak dapat dipulihkan. Unduh .txt terlebih dahulu bila ingin menyimpan salinan.`}
        peringatan={simpan.belumTersimpan ? "Ada perubahan yang belum tersimpan di bab ini." : undefined}
        sibuk={sibuk}
        galat={hapusGalat}
        onBatal={tutupDialogHapus}
        onHapus={() => void deleteChapter()}
      />
    </main>
  );
}
