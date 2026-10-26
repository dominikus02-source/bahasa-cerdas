"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Layers3, Plus, Save } from "lucide-react";

type Draft = { id: string; title: string; track: "cerpen" | "novel"; body: string };
const KEY = "bc-aku-sastrawan-drafts-v1";

export default function RuangMenulisPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeId, setActiveId] = useState("");
  const [ready, setReady] = useState(false);
  const active = drafts.find((d) => d.id === activeId);
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || "[]") as Draft[];
      const initial = Array.isArray(stored) && stored.length ? stored : [{ id: "draft-awal", title: "Cerpen tanpa judul", track: "cerpen" as const, body: "" }];
      setDrafts(initial); setActiveId(initial[0].id);
    } catch {
      const initial = [{ id: "draft-awal", title: "Cerpen tanpa judul", track: "cerpen" as const, body: "" }];
      setDrafts(initial); setActiveId(initial[0].id);
    }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(KEY, JSON.stringify(drafts)); }, [drafts, ready]);
  function add(track: "cerpen" | "novel") {
    const draft = { id: crypto.randomUUID(), title: track === "cerpen" ? "Cerpen tanpa judul" : "Novel tanpa judul", track, body: "" };
    setDrafts((current) => [draft, ...current]); setActiveId(draft.id);
  }
  function patch(patch: Partial<Draft>) {
    setDrafts((current) => current.map((d) => d.id === activeId ? { ...d, ...patch } : d));
  }
  const words = active?.body.trim() ? active.body.trim().split(/\s+/).length : 0;
  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border px-4 py-4 sm:px-6"><div className="mx-auto flex max-w-7xl items-center justify-between">
      <Link href="/aku-sastrawan" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ArrowLeft size={16}/> AKU SASTRAWAN</Link>
      <span className="text-xs text-muted-foreground">{ready ? "Draf tersimpan di perangkat ini" : "Menyiapkan ruang menulis…"}</span>
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
            <span className="flex items-center gap-2 text-xs text-muted-foreground">{d.track === "cerpen" ? <BookOpen size={13}/> : <Layers3 size={13}/>} {d.track === "cerpen" ? "Cerpen" : "Novel"}</span>
            <span className="mt-1 block truncate text-sm font-semibold">{d.title || "Tanpa judul"}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{d.body.trim() ? d.body.trim().split(/\s+/).length + " kata" : "Belum ada tulisan"}</span>
          </button>)}
        </section>
        <p className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">Catatan: versi awal ini menyimpan draf secara lokal di browser/perangkat ini, belum tersinkron ke akun atau perangkat lain.</p>
      </aside>
      <section className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card">
        {active ? <><div className="border-b border-border p-4 sm:p-6"><label htmlFor="draft-title" className="text-xs font-bold text-muted-foreground">JUDUL KARYA</label><input id="draft-title" value={active.title} onChange={(e) => patch({ title: e.target.value })} maxLength={160} className="mt-2 w-full bg-transparent text-2xl font-black outline-none" placeholder="Beri judul untuk ceritamu"/></div>
          <div className="flex gap-3 border-b border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground"><span>{active.track === "cerpen" ? "Jalur Cerpen" : "Jalur Novel"}</span><span>·</span><span>{words} kata</span></div>
          <textarea value={active.body} onChange={(e) => patch({ body: e.target.value })} placeholder={active.track === "cerpen" ? "Mulai dari sebuah adegan: siapa tokohnya, apa yang ia inginkan, dan apa yang menghalanginya?" : "Mulai dengan premis, adegan pembuka, atau catatan tentang novelmu…"} className="min-h-[60vh] w-full resize-y bg-card px-5 py-6 font-serif text-lg leading-8 outline-none placeholder:font-sans placeholder:text-sm sm:px-8 sm:py-8"/>
          <div className="flex items-center justify-between border-t border-border px-4 py-4"><span className="text-xs text-muted-foreground">Penyimpanan lokal</span><button onClick={() => localStorage.setItem(KEY, JSON.stringify(drafts))} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground"><Save size={15}/> Simpan sekarang</button></div>
        </> : <p className="p-8 text-sm text-muted-foreground">Memuat draf…</p>}
      </section>
    </div>
  </main>;
}
