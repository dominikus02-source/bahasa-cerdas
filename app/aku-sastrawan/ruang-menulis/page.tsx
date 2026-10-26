"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Layers3, Plus, Save, Cloud, AlertCircle, Sparkles } from "lucide-react";

type Track = "cerpen" | "novel";
type Draft = { id: string; title: string; track: Track; body: string; saved?: boolean };
type ApiProject = { id: string; title: string; genre: string; content: string; updatedAt?: string };
const KEY = "bc-aku-sastrawan-drafts-v1";

function fromApi(p: ApiProject): Draft {
  return { id: p.id, title: p.title, track: p.genre === "NOVEL" ? "novel" : "cerpen", body: p.content, saved: true };
}

export default function RuangMenulisPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeId, setActiveId] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [coachPrompt, setCoachPrompt] = useState("Berikan umpan balik atas kekuatan dan hal yang perlu dikembangkan dari tulisan ini.");
  const [coachReply, setCoachReply] = useState("");
  const [coachBusy, setCoachBusy] = useState(false);
  const active = drafts.find((d) => d.id === activeId);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/aku-sastrawan/drafts", { cache: "no-store" });
        if (res.status === 401) {
          if (!cancelled) { setNotice("Masuk ke akun BahasaCerdas untuk menyimpan draf ke akunmu."); setReady(true); }
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Draf gagal dimuat.");
        if (cancelled) return;
        const serverDrafts = (data.projects as ApiProject[]).map(fromApi);
        if (serverDrafts.length) {
          setDrafts(serverDrafts); setActiveId(serverDrafts[0].id);
        } else {
          // Preserve drafts from the earlier local-only MVP and offer them for import/save.
          let local: Draft[] = [];
          try { const parsed = JSON.parse(localStorage.getItem(KEY) || "[]"); if (Array.isArray(parsed)) local = parsed; } catch {}
          const initial = local.length ? local : [{ id: "local-" + Date.now(), title: "Cerpen tanpa judul", track: "cerpen" as const, body: "", saved: false }];
          setDrafts(initial.map((d) => ({ ...d, saved: false }))); setActiveId(initial[0].id);
        }
        setReady(true);
      } catch (error) {
        if (!cancelled) {
          setNotice(error instanceof Error ? error.message : "Draf gagal dimuat.");
          let local: Draft[] = [];
          try { const parsed = JSON.parse(localStorage.getItem(KEY) || "[]"); if (Array.isArray(parsed)) local = parsed; } catch {}
          const initial = local.length ? local : [{ id: "local-" + Date.now(), title: "Cerpen tanpa judul", track: "cerpen" as const, body: "", saved: false }];
          setDrafts(initial.map((d) => ({ ...d, saved: false }))); setActiveId(initial[0].id); setReady(true);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (ready) {
      try { localStorage.setItem(KEY, JSON.stringify(drafts)); } catch {}
    }
  }, [drafts, ready]);

  function add(track: Track) {
    const draft: Draft = { id: "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), title: track === "cerpen" ? "Cerpen tanpa judul" : "Novel tanpa judul", track, body: "", saved: false };
    setDrafts((current) => [draft, ...current]); setActiveId(draft.id); setNotice("");
  }
  function patch(patchValue: Partial<Draft>) {
    setDrafts((current) => current.map((d) => d.id === activeId ? { ...d, ...patchValue, saved: false } : d));
  }
  async function saveActive() {
    if (!active || saving) return;
    setSaving(true); setNotice("");
    try {
      const isNew = !active.saved || active.id.startsWith("local-") || active.id === "draft-awal";
      const res = await fetch("/api/aku-sastrawan/drafts", {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(isNew ? {} : { id: active.id }), title: active.title, genre: active.track === "novel" ? "NOVEL" : "CERPEN", content: active.body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Draf belum tersimpan.");
      const saved = fromApi(data.project as ApiProject);
      setDrafts((current) => current.map((d) => d.id === active.id ? saved : d));
      setActiveId(saved.id);
      setNotice("Draf tersimpan ke akun BahasaCerdas.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Draf belum tersimpan. Salinan lokal tetap dipertahankan.");
    } finally { setSaving(false); }
  }
  const words = active?.body.trim() ? active.body.trim().split(/\s+/u).length : 0;
  async function askCoach() {
    if (!active || coachBusy) return;
    if (!active.body.trim()) { setNotice("Tulis atau tempelkan cuplikan naskah terlebih dahulu agar coach bisa memberi masukan yang spesifik."); return; }
    setCoachBusy(true); setCoachReply(""); setNotice("");
    try {
      const res = await fetch("/api/aku-sastrawan/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: coachPrompt, track: active.track, task: "Umpan balik dan pengembangan naskah", context: active.body.slice(0, 12000) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI Writing Coach belum dapat menjawab.");
      setCoachReply(data.reply);
    } catch (error) { setNotice(error instanceof Error ? error.message : "AI Writing Coach belum tersedia."); }
    finally { setCoachBusy(false); }
  }

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border px-4 py-4 sm:px-6"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
      <Link href="/aku-sastrawan" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft size={16}/> AKU SASTRAWAN</Link>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Cloud size={14}/>{ready ? "Ruang menulis" : "Memuat draf…"}</span>
    </div></header>
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Writing Studio</p><h1 className="text-3xl font-black">Ruang menulismu.</h1>
        <p className="text-sm leading-6 text-muted-foreground">Mulai dari satu paragraf. Sedikit demi sedikit, ceritamu akan terbentuk.</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => add("cerpen")} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-primary px-2 text-sm font-bold text-primary-foreground"><Plus size={15}/> Cerpen</button>
          <button onClick={() => add("novel")} className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-border px-2 text-sm font-bold"><Plus size={15}/> Novel</button>
        </div>
        <section className="rounded-2xl border border-border bg-card p-3"><h2 className="px-2 pb-2 text-xs font-bold text-muted-foreground">DRAF SAYA</h2>
          {drafts.map((d) => <button key={d.id} onClick={() => setActiveId(d.id)} className={`mb-1 w-full rounded-xl p-3 text-left ${d.id === activeId ? "bg-primary/10" : "hover:bg-muted"}`}>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">{d.track === "cerpen" ? <BookOpen size={13}/> : <Layers3 size={13}/>} {d.track === "cerpen" ? "Cerpen" : "Novel"} {!d.saved && <span className="text-amber-600">· belum disimpan</span>}</span>
            <span className="mt-1 block truncate text-sm font-semibold">{d.title || "Tanpa judul"}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{d.body.trim() ? d.body.trim().split(/\s+/u).length + " kata" : "Belum ada tulisan"}</span>
          </button>)}
        </section>
        <p className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">Gunakan tombol Simpan ke akun untuk menyimpan karya ke akun BahasaCerdas. Salinan lokal juga dipertahankan sebagai cadangan perangkat ini.</p>
      </aside>
      <section className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card">
        {active ? <><div className="border-b border-border p-4 sm:p-6"><label htmlFor="draft-title" className="text-xs font-bold text-muted-foreground">JUDUL KARYA</label><input id="draft-title" value={active.title} onChange={(e) => patch({ title: e.target.value })} maxLength={160} className="mt-2 w-full bg-transparent text-2xl font-black outline-none" placeholder="Beri judul untuk ceritamu"/></div>
          <div className="flex gap-3 border-b border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground"><span>{active.track === "cerpen" ? "Jalur Cerpen" : "Jalur Novel"}</span><span>·</span><span>{words} kata</span></div>
          <textarea value={active.body} onChange={(e) => patch({ body: e.target.value })} placeholder={active.track === "cerpen" ? "Mulai dari sebuah adegan: siapa tokohnya, apa yang ia inginkan, dan apa yang menghalanginya?" : "Mulai dengan premis, adegan pembuka, atau catatan tentang novelmu…"} className="min-h-[60vh] w-full resize-y bg-card px-5 py-6 font-serif text-lg leading-8 outline-none placeholder:font-sans placeholder:text-sm sm:px-8 sm:py-8"/>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4"><span className="text-xs text-muted-foreground">{active.saved ? "Tersimpan ke akun" : "Ada perubahan belum disimpan"}</span><button onClick={saveActive} disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"><Save size={15}/>{saving ? "Menyimpan…" : "Simpan ke akun"}</button></div>
          {active.track === "novel" && active.saved && <div className="border-t border-border px-4 py-4"><Link href={"/aku-sastrawan/novel/" + active.id} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold"><Layers3 size={15}/> Kelola bab novel</Link></div>}
        </> : <p className="p-8 text-sm text-muted-foreground">Menyiapkan ruang menulis…</p>}
        {notice && <p role="status" className="flex items-start gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground"><AlertCircle size={16} className="mt-0.5 shrink-0"/>{notice}</p>}
        <div className="border-t border-border p-4 sm:p-6">
          <div className="flex items-center gap-2"><Sparkles size={18} className="text-primary"/><h2 className="text-lg font-bold">AI Writing Coach</h2><span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Premium</span></div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Minta masukan tentang karakter, konflik, dialog, pembuka cerita, atau revisi. Coach membantu; keputusan kreatif tetap di tanganmu.</p>
          <textarea value={coachPrompt} onChange={(e) => setCoachPrompt(e.target.value)} rows={2} maxLength={8000} className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary" placeholder="Apa yang ingin kamu diskusikan dengan coach?"/>
          <button onClick={askCoach} disabled={coachBusy || !active} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"><Sparkles size={15}/>{coachBusy ? "Coach sedang membaca…" : "Minta masukan"}</button>
          {coachReply && <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-border bg-muted/30 p-4 text-sm leading-7">{coachReply}</div>}
        </div>
      </section>
    </div>
  </main>;
}
