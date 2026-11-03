"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Compass, Download, FileText, FileType2, Layers3, LoaderCircle, Lock, Maximize2, Minimize2, MoreHorizontal, Plus, Sparkles, Trash2, CloudOff } from "lucide-react";
import { KonfirmasiHapusDialog, KATA_KONFIRMASI_HAPUS } from "@/components/aku-sastrawan/KonfirmasiHapusDialog";
import { useAutosave, bacaCadangan, hapusCadangan } from "@/components/aku-sastrawan/studio/useAutosave";
import { Laci } from "@/components/aku-sastrawan/studio/Laci";
import { NaraPanel } from "@/components/aku-sastrawan/studio/NaraPanel";
import { PetaCeritaPanel } from "@/components/aku-sastrawan/studio/PetaCeritaPanel";
import { RancangCerita, type JenisKarya } from "@/components/aku-sastrawan/studio/RancangCerita";
import { bacaSinopsis, hitungKata, petaKosong, petaSebagaiTeks, tulisSinopsis, type PetaCerita } from "@/lib/aku-sastrawan/peta-cerita";
import { FORMAT_EKSPOR, tautanEkspor } from "@/lib/aku-sastrawan/ekspor/format";

type Project = {
  id: string;
  title: string;
  genre: JenisKarya;
  synopsis?: string | null;
  content?: string;
  status: "DRAFT" | "REVISION" | "COMPLETED";
  wordCount: number;
  updatedAt: string;
};
type Muatan = { title: string; synopsis: string; content: string };

const JUDUL_KOSONG = "Tanpa judul";
const namaJenis = (g: string) => (g === "NOVEL" ? "Novel" : "Cerpen");
const tanggal = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
const muatan = (judul: string, sinopsis: string, peta: PetaCerita, isi: string): Muatan => ({ title: judul.trim() || JUDUL_KOSONG, synopsis: tulisSinopsis(sinopsis, peta), content: isi });

export default function StudioMenulisPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galatDaftar, setGalatDaftar] = useState("");
  const [canWrite, setCanWrite] = useState(true);
  const [upgradeUrl, setUpgradeUrl] = useState("/umum/premium");

  const [active, setActive] = useState<Project | null>(null);
  const [judul, setJudul] = useState("");
  const [sinopsis, setSinopsis] = useState("");
  const [peta, setPeta] = useState<PetaCerita>(petaKosong);
  const [isi, setIsi] = useState("");
  const [membuka, setMembuka] = useState<string | null>(null);
  const [galatBuka, setGalatBuka] = useState("");

  const [rancang, setRancang] = useState<{ terbuka: boolean; langkah: number }>({ terbuka: false, langkah: 0 });
  const [laci, setLaci] = useState<null | "peta" | "nara">(null);
  const [fokus, setFokus] = useState(false);
  const [menu, setMenu] = useState(false);
  const [cadangan, setCadangan] = useState<Muatan | null>(null);
  const [hapusTerbuka, setHapusTerbuka] = useState(false);
  const [hapusSibuk, setHapusSibuk] = useState(false);
  const [hapusGalat, setHapusGalat] = useState("");
  const isiRef = useRef<HTMLTextAreaElement>(null);

  const nilai = useMemo(() => muatan(judul, sinopsis, peta, isi), [judul, sinopsis, peta, isi]);
  const kunci = active?.id ?? null;

  const simpanKeServer = useCallback(async (m: Muatan, { keepalive, kunci }: { keepalive: boolean; kunci: string }) => {
    const body = JSON.stringify(m);
    const res = await fetch(`/api/aku-sastrawan/projects/${kunci}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body,
      keepalive: keepalive && body.length < 60_000,
    });
    if (!res.ok) throw new Error("gagal");
    const data = await res.json().catch(() => null) as { project?: Project } | null;
    if (data?.project) {
      const p = data.project;
      setProjects((list) => list.map((x) => (x.id === p.id ? { ...x, title: p.title, wordCount: p.wordCount, updatedAt: p.updatedAt } : x)));
    }
  }, []);

  const simpan = useAutosave<Muatan>({ kunci, nilai, aktif: canWrite && !!active, simpan: simpanKeServer });

  const muatDaftar = useCallback(async () => {
    setMemuat(true); setGalatDaftar("");
    try {
      const res = await fetch("/api/aku-sastrawan/projects", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { setGalatDaftar(data.message || data.error || "Karya belum dapat dimuat."); return null; }
      setProjects(data.projects || []);
      setCanWrite(data.canWrite !== false);
      if (typeof data.upgradeUrl === "string") setUpgradeUrl(data.upgradeUrl);
      return data as { projects: Project[]; canWrite?: boolean };
    } catch {
      setGalatDaftar("Koneksi bermasalah. Coba muat ulang halaman.");
      return null;
    } finally { setMemuat(false); }
  }, []);

  /** Pastikan naskah aktif tersimpan sebelum berpindah. */
  const amankan = useCallback(async () => {
    if (!active || !canWrite) return true;
    if (await simpan.simpanSekarang()) return true;
    return window.confirm("Perubahan terakhir belum sampai ke server, tetapi tersalin di perangkat ini. Tetap lanjut?");
  }, [active, canWrite, simpan]);

  const pasang = useCallback((p: Project) => {
    const { sinopsis: s, peta: pt } = bacaSinopsis(p.synopsis);
    const j = p.title === JUDUL_KOSONG ? "" : p.title;
    const awal = muatan(j, s, pt, p.content || "");
    simpan.tetapkanAwal(awal);
    setJudul(j); setSinopsis(s); setPeta(pt); setIsi(p.content || "");
    setActive(p);
    const c = bacaCadangan<Muatan>(p.id);
    if (c && JSON.stringify(c.nilai) !== JSON.stringify(awal) && c.waktu > Date.parse(p.updatedAt) - 1000) setCadangan(c.nilai);
    else { setCadangan(null); if (c) hapusCadangan(p.id); }
    window.history.replaceState(null, "", `/aku-sastrawan/studio?karya=${encodeURIComponent(p.id)}`);
  }, [simpan]);

  const bukaKarya = useCallback(async (id: string) => {
    if (id === active?.id) return;
    if (!(await amankan())) return;
    setMembuka(id); setGalatBuka("");
    try {
      const res = await fetch(`/api/aku-sastrawan/projects/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) { setGalatBuka(data.message || data.error || "Naskah belum dapat dibuka."); return; }
      // Editor baru diganti setelah naskah lengkap termuat — jangan pernah mengosongkan naskah karena galat jaringan.
      pasang(data.project as Project);
      setLaci(null); setFokus(false);
    } catch { setGalatBuka("Naskah belum dapat dibuka. Periksa koneksi, lalu coba lagi."); }
    finally { setMembuka(null); }
  }, [active?.id, amankan, pasang]);

  const keDaftar = useCallback(async () => {
    if (!(await amankan())) return;
    setActive(null); setLaci(null); setFokus(false); setMenu(false); setCadangan(null);
    setJudul(""); setSinopsis(""); setPeta(petaKosong()); setIsi("");
    window.history.replaceState(null, "", "/aku-sastrawan/studio");
    void muatDaftar();
  }, [amankan, muatDaftar]);

  const mulaiMenulis = useCallback(async () => {
    if (!canWrite) return;
    if (active && !(await amankan())) return;
    setActive(null); setLaci(null); setFokus(false); setCadangan(null);
    setJudul(""); setSinopsis(""); setPeta(petaKosong()); setIsi("");
    setRancang({ terbuka: true, langkah: 0 });
  }, [active, amankan, canWrite]);

  const buatKarya = useCallback(async (jenis: JenisKarya) => {
    try {
      const res = await fetch("/api/aku-sastrawan/projects", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: JUDUL_KOSONG, genre: jenis }),
      });
      const data = await res.json();
      if (!res.ok) return false;
      const p = data.project as Project;
      // Titik awal = kondisi server (kosong); rancangan yang sudah diisi ikut tersimpan otomatis.
      simpan.tetapkanAwal(muatan("", "", petaKosong(), ""));
      setActive(p);
      setProjects((list) => [p, ...list]);
      window.history.replaceState(null, "", `/aku-sastrawan/studio?karya=${encodeURIComponent(p.id)}`);
      return true;
    } catch { return false; }
  }, [simpan]);

  // Muat awal: ?karya=… membuka naskah, ?mulai=1 langsung ke Rancang Cerita.
  useEffect(() => {
    void (async () => {
      const data = await muatDaftar();
      const q = new URLSearchParams(window.location.search);
      const id = q.get("karya");
      if (id) { void bukaKarya(id); return; }
      if (q.get("mulai") === "1") {
        window.history.replaceState(null, "", "/aku-sastrawan/studio");
        if (data && data.canWrite !== false) setRancang({ terbuka: true, langkah: 0 });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tinggi area tulis mengikuti isi.
  useEffect(() => {
    const el = isiRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, window.innerHeight * 0.55)}px`;
  }, [isi, active, fokus]);

  useEffect(() => {
    if (!fokus && !menu) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenu(false); setFokus(false); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [fokus, menu]);

  const konteks = useCallback(() => {
    const kepala = [`Judul: ${judul.trim() || JUDUL_KOSONG}`, `Jenis: ${namaJenis(active?.genre ?? "CERPEN")}`, petaSebagaiTeks(sinopsis, peta)].filter(Boolean).join("\n");
    return `${kepala}\n\n${isi.slice(0, Math.max(0, 11_500 - kepala.length))}`;
  }, [judul, active?.genre, sinopsis, peta, isi]);

  const ubahPeta = useCallback((fn: (p: PetaCerita) => PetaCerita) => { if (canWrite) setPeta(fn); }, [canWrite]);
  const tutupLaci = useCallback(() => setLaci(null), []);
  const tutupDialogHapus = useCallback(() => { setHapusTerbuka(false); setHapusGalat(""); }, []);

  const hapusKarya = async () => {
    if (!active || hapusSibuk || !canWrite) return;
    setHapusSibuk(true); setHapusGalat("");
    try {
      const res = await fetch(`/api/aku-sastrawan/projects/${active.id}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ konfirmasi: KATA_KONFIRMASI_HAPUS }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setHapusGalat(data.message || data.error || "Karya belum dapat dihapus."); return; }
      hapusCadangan(active.id);
      setHapusTerbuka(false);
      setActive(null); setJudul(""); setSinopsis(""); setPeta(petaKosong()); setIsi(""); setLaci(null);
      window.history.replaceState(null, "", "/aku-sastrawan/studio");
      await muatDaftar();
    } catch { setHapusGalat("Koneksi bermasalah. Karya belum dihapus."); }
    finally { setHapusSibuk(false); }
  };

  const kata = hitungKata(isi);
  const terbaru = projects[0];
  const lainnya = projects.slice(1);

  const rancangan = (
    <RancangCerita
      terbuka={rancang.terbuka}
      jenis={active?.genre ?? null}
      peta={peta}
      ubah={ubahPeta}
      hanyaBaca={!canWrite}
      konteks={konteks}
      langkahAwal={rancang.langkah}
      onPilihJenis={buatKarya}
      onSelesai={() => { setRancang({ terbuka: false, langkah: 0 }); window.setTimeout(() => isiRef.current?.focus(), 50); }}
      onBatal={() => setRancang({ terbuka: false, langkah: 0 })}
    />
  );

  // ───────────── Daftar karya ─────────────
  if (!active) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        {rancangan}
        <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/aku-sastrawan" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft size={16} /> AKU SASTRAWAN</Link>
          <Link href="/aku-sastrawan/kurikulum" className="text-sm text-muted-foreground transition hover:text-foreground">Kurikulum</Link>
        </header>

        <section className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-8 sm:pt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Karyamu</p>
          <h1 className="mt-3 font-display text-[34px] leading-tight tracking-tight sm:text-5xl">{projects.length ? "Lanjutkan ceritamu." : "Ruang menulismu."}</h1>
          <p className="mt-3 max-w-md text-[15px] leading-7 text-muted-foreground">{canWrite ? "Satu kalimat sudah cukup untuk memulai. Semua tersimpan otomatis." : "Mode baca: karyamu aman, bisa dibaca dan diunduh."}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {canWrite ? (
              <button onClick={() => void mulaiMenulis()} disabled={memuat} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-foreground px-7 text-[15px] font-semibold text-background shadow-sm transition hover:opacity-90 disabled:opacity-60">
                <Plus size={17} /> Mulai Menulis
              </button>
            ) : (
              <Link href={upgradeUrl} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-foreground px-7 text-[15px] font-semibold text-background"><Lock size={16} /> Aktifkan Premium</Link>
            )}
          </div>

          {galatDaftar && <p className="mt-8 text-sm text-destructive" role="alert">{galatDaftar}</p>}
          {galatBuka && <p className="mt-8 text-sm text-destructive" role="alert">{galatBuka}</p>}

          {memuat && !projects.length ? (
            <p className="mt-14 text-sm text-muted-foreground">Memuat karya…</p>
          ) : terbaru ? (
            <div className="mt-14">
              <button onClick={() => void bukaKarya(terbaru.id)} className="group block w-full rounded-3xl border border-border bg-card p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-7">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Terakhir ditulis · {tanggal(terbaru.updatedAt)}</span>
                <span className="mt-3 block truncate font-display text-2xl tracking-tight sm:text-3xl">{terbaru.title}</span>
                <span className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{namaJenis(terbaru.genre)} · {terbaru.wordCount.toLocaleString("id-ID")} kata</span>
                  <span className="inline-flex items-center gap-1.5 text-foreground transition group-hover:translate-x-0.5">{membuka === terbaru.id ? <LoaderCircle size={15} className="animate-spin" /> : null} Buka</span>
                </span>
              </button>
              {lainnya.length > 0 && (
                <ul className="mt-8 divide-y divide-border/70 border-y border-border/70">
                  {lainnya.map((p) => (
                    <li key={p.id}>
                      <button onClick={() => void bukaKarya(p.id)} className="flex w-full items-center justify-between gap-4 py-4 text-left transition hover:opacity-80">
                        <span className="min-w-0"><span className="block truncate font-display text-lg">{p.title}</span><span className="text-xs text-muted-foreground">{namaJenis(p.genre)} · {p.wordCount.toLocaleString("id-ID")} kata</span></span>
                        <span className="shrink-0 text-xs text-muted-foreground">{membuka === p.id ? <LoaderCircle size={14} className="animate-spin" /> : tanggal(p.updatedAt)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  // ───────────── Ruang tulis ─────────────
  const st = simpan.status;
  return (
    <main className="min-h-screen bg-background text-foreground">
      {rancangan}
      <header className={`sticky top-0 z-30 border-b bg-background/85 backdrop-blur transition-all duration-300 ${laci ? "border-transparent lg:border-border" : "border-transparent"} ${fokus ? "pointer-events-none -translate-y-full opacity-0" : ""}`}>
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:px-6">
          <button onClick={() => void keDaftar()} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-sm text-muted-foreground transition hover:text-foreground"><ArrowLeft size={16} /> Karyamu</button>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status" aria-live="polite">
              {!canWrite ? (<><Lock size={13} /> Mode baca</>)
                : st === "gagal" ? (<button onClick={() => void simpan.simpanSekarang()} className="inline-flex items-center gap-1.5 text-destructive"><CloudOff size={13} /> Belum tersimpan · Coba lagi</button>)
                : st === "tersimpan" ? (<><Check size={13} /> Tersimpan</>)
                : (<><LoaderCircle size={13} className="animate-spin" /> Menyimpan…</>)}
            </span>
            <button onClick={() => setLaci((l) => (l === "peta" ? null : "peta"))} aria-pressed={laci === "peta"} aria-label="Peta Cerita" className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm transition ${laci === "peta" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}><Compass size={16} /><span className="hidden sm:inline">Peta Cerita</span></button>
            <button onClick={() => setLaci((l) => (l === "nara" ? null : "nara"))} aria-pressed={laci === "nara"} aria-label="NARA" className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm transition ${laci === "nara" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}><Sparkles size={16} className="text-bc-violet" /><span className="hidden sm:inline">NARA</span></button>
            <button onClick={() => { setLaci(null); setFokus(true); }} aria-label="Mode fokus" className="hidden min-h-10 items-center rounded-full px-3 text-muted-foreground transition hover:text-foreground sm:inline-flex"><Maximize2 size={16} /></button>
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} aria-label="Menu lainnya" aria-expanded={menu} className="inline-flex min-h-10 items-center rounded-full px-2.5 text-muted-foreground transition hover:text-foreground"><MoreHorizontal size={18} /></button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden />
                  <div className="absolute right-0 z-20 mt-1 w-60 animate-fade-in overflow-hidden rounded-2xl border border-border bg-card p-1.5 text-sm shadow-xl" role="menu">
                    {canWrite && <button role="menuitem" onClick={() => { setMenu(false); setRancang({ terbuka: true, langkah: 1 }); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-muted"><Compass size={15} /> Rancang Cerita</button>}
                    <button role="menuitem" onClick={() => { setMenu(false); setLaci(null); setFokus(true); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-muted sm:hidden"><Maximize2 size={15} /> Mode fokus</button>
                    {active.genre === "NOVEL" && <button role="menuitem" onClick={() => { setMenu(false); void amankan().then((ok) => { if (ok) router.push(`/aku-sastrawan/novel/${active.id}`); }); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left hover:bg-muted"><Layers3 size={15} /> Kelola bab</button>}
                    <div className="my-1 h-px bg-border" />
                    {FORMAT_EKSPOR.map((f) => { const url = tautanEkspor(active.id, f.format); return (
                      <a key={f.format} role="menuitem" href={url} download data-testid={`unduh-${f.format}`} onClick={(e) => { e.preventDefault(); setMenu(false); void simpan.simpanSekarang().finally(() => { window.location.href = url; }); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-muted">{f.format === "pdf" ? <FileText size={15} /> : f.format === "docx" ? <FileType2 size={15} /> : <Download size={15} />}<span className="flex flex-col leading-tight"><span>{f.label}</span><span className="text-xs text-muted-foreground">{f.ket}</span></span></a>
                    ); })}
                    {canWrite && <><div className="my-1 h-px bg-border" /><button role="menuitem" onClick={() => { setMenu(false); setHapusGalat(""); setHapusTerbuka(true); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-destructive hover:bg-destructive/10"><Trash2 size={15} /> Hapus karya</button></>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {!canWrite && (
          <div className="border-t border-border/60">
            <p className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-xs text-muted-foreground">Karyamu aman — bisa dibaca dan diunduh. <Link href={upgradeUrl} className="font-semibold text-foreground underline underline-offset-4">Aktifkan Premium untuk menulis lagi</Link></p>
          </div>
        )}
      </header>

      {fokus && (
        <button onClick={() => setFokus(false)} aria-label="Keluar dari mode fokus" className="fixed right-4 top-4 z-30 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground opacity-40 transition hover:bg-muted hover:opacity-100"><Minimize2 size={14} /> Keluar fokus</button>
      )}

      <div className={`transition-[padding] duration-200 ${laci ? "lg:pr-[400px]" : ""}`}>
        <article className={`mx-auto w-full max-w-[680px] px-6 pb-40 transition-[padding] duration-300 ${fokus ? "pt-24" : "pt-10 sm:pt-16"}`}>
          {cadangan && canWrite && (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm" role="status">
              <span>Ada salinan lebih baru di perangkat ini.</span>
              <span className="flex gap-3">
                <button onClick={() => { const c = cadangan; const b = bacaSinopsis(c.synopsis); setJudul(c.title === JUDUL_KOSONG ? "" : c.title); setSinopsis(b.sinopsis); setPeta(b.peta); setIsi(c.content); setCadangan(null); }} className="font-semibold">Pulihkan</button>
                <button onClick={() => { hapusCadangan(active.id); setCadangan(null); }} className="text-muted-foreground">Abaikan</button>
              </span>
            </div>
          )}
          <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-opacity ${fokus ? "opacity-0" : ""}`}>{[namaJenis(active.genre), peta.genre.trim()].filter(Boolean).join(" · ")}</p>
          <input
            readOnly={!canWrite}
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            maxLength={120}
            aria-label="Judul karya"
            placeholder="Judul (opsional)"
            className="mt-3 w-full bg-transparent font-display text-[32px] leading-tight tracking-tight outline-none placeholder:text-muted-foreground/40 sm:text-[42px]"
          />
          <textarea
            ref={isiRef}
            readOnly={!canWrite}
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            onBlur={() => { if (canWrite) void simpan.simpanSekarang(); }}
            aria-label="Isi naskah"
            placeholder={canWrite ? "Mulai dari satu kalimat…" : ""}
            spellCheck
            className="mt-8 w-full resize-none overflow-hidden bg-transparent font-display text-[19px] leading-[1.85] outline-none placeholder:text-muted-foreground/40 sm:text-[20px]"
          />
        </article>
      </div>

      <p className={`pointer-events-none fixed bottom-4 left-5 z-20 text-xs tabular-nums text-muted-foreground/70 transition-opacity ${fokus ? "opacity-40" : ""}`}>{kata.toLocaleString("id-ID")} kata</p>

      <Laci terbuka={laci === "peta"} judul="Peta Cerita" keterangan="Tokoh, latar, dan alur ceritamu." onTutup={tutupLaci} labelId="laci-peta">
        <PetaCeritaPanel peta={peta} ubah={ubahPeta} sinopsis={sinopsis} ubahSinopsis={(v) => { if (canWrite) setSinopsis(v); }} hanyaBaca={!canWrite} onRancang={() => { setLaci(null); setRancang({ terbuka: true, langkah: 1 }); }} />
      </Laci>
      <Laci terbuka={laci === "nara"} judul="NARA" keterangan="Pendamping Menulis AI" onTutup={tutupLaci} labelId="laci-nara">
        <NaraPanel bisaMenulis={canWrite} upgradeUrl={upgradeUrl} track={active.genre === "NOVEL" ? "novel" : "cerpen"} konteks={konteks} adaNaskah={isi.trim().length > 0} />
      </Laci>

      <KonfirmasiHapusDialog
        open={hapusTerbuka}
        judul="Hapus karya ini secara permanen?"
        deskripsi={`“${judul.trim() || JUDUL_KOSONG}” beserta seluruh isinya${active.genre === "NOVEL" ? " dan semua babnya" : ""} akan dihapus dan tidak dapat dipulihkan. Unduh PDF, Word, atau .txt dulu bila ingin menyimpan salinan.`}
        peringatan={simpan.belumTersimpan ? "Ada perubahan yang belum tersimpan di karya ini." : undefined}
        sibuk={hapusSibuk}
        galat={hapusGalat}
        onBatal={tutupDialogHapus}
        onHapus={() => void hapusKarya()}
      />
    </main>
  );
}
