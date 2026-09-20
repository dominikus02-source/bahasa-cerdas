"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Search, Send, Users, BookOpen, GraduationCap, X, Check, ChevronDown,
  FileText, Sparkles, Quote, PenLine, ScrollText, Newspaper, MessageSquare,
  BookMarked, Library, PenTool, Globe, Megaphone, Star, ListChecks, FilePlus2,
  Compass, MonitorPlay, Sparkle, ArrowRight,
} from "lucide-react";
import { ThemeCard, type ThemeCardData } from "@/components/guru/bank-soal/ThemeCard";
import { categoryVisual, themeVariant, ThemeCoverArt } from "@/components/guru/bank-soal/theme-cover";

const CAT_COLORS: Record<string, { from: string; to: string; text: string; light: string; ring: string }> = {
  "Tata Bahasa":   { from: "from-emerald-500", to: "to-emerald-600",  text: "text-emerald-600", light: "bg-emerald-50",  ring: "ring-emerald-200" },
  "Sastra":        { from: "from-violet-500",  to: "to-violet-600",   text: "text-violet-600",  light: "bg-violet-50",   ring: "ring-violet-200"  },
  "Jenis Teks":    { from: "from-blue-500",    to: "to-blue-600",     text: "text-blue-600",    light: "bg-blue-50",     ring: "ring-blue-200"    },
  "Fungsional":    { from: "from-amber-500",   to: "to-amber-600",    text: "text-amber-600",   light: "bg-amber-50",    ring: "ring-amber-200"   },
  "Lainnya":       { from: "from-slate-500",   to: "to-slate-600",    text: "text-slate-600",   light: "bg-slate-50",    ring: "ring-slate-200"   },
};

interface ThemeData {
  name: string;
  total: number;
  kelas: string[];
  difficulties: Record<string, number>;
}

interface GroupItem {
  id: string;
  name: string;
  memberCount?: number;
}

/**
 * Satu tema Bank Soal dapat dipakai untuk DUA aktivitas. Modal tidak
 * lagi diasumsikan selalu "Latihan" — guru memilih di segmented control
 * ("Gunakan Tema"). Mode default = Latihan agar alur lama tidak berubah;
 * dibuka dari Main Bersama (?untuk=main-bersama) default = Main Bersama.
 */
type ThemeUseMode = "latihan" | "main-bersama";

interface LatihanItem {
  id: string;
  title: string;
  topik: string | null;
  kelas: string | null;
  difficulty: string | null;
  totalSoal: number;
  totalAssignments: number;
  totalSubmitted: number;
  avgScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function BankSoalPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Konteks masuk: halaman ini dibuka dari tombol "Pilih dari Bank Soal"
  // di setup Main Bersama → modal langsung di mode Main Bersama.
  const openedForMainBersama = searchParams.get("untuk") === "main-bersama";
  const [themes, setThemes] = useState<ThemeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeData | null>(null);
  const [modalMode, setModalMode] = useState<ThemeUseMode>("latihan");
  // Seed pemilihan soal mode Main Bersama: dibuat SEKALI per pembukaan
  // modal, dipakai untuk "Lihat Soal" dan diteruskan ke setup sehingga
  // yang dipratinjau == yang dimainkan. Identifier internal, bukan isi soal.
  const [mbSeed, setMbSeed] = useState("");
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [sendJumlah, setSendJumlah] = useState(10);
  const [sendDifficulty, setSendDifficulty] = useState("");
  // Question Set: seed + ID soal di-generate SEKALI saat "Lihat Soal" —
  // preview dan kirim memakai set yang sama persis (kelas hanyalah tujuan).
  const [questionSet, setQuestionSet] = useState<{ seed: string; questionIds: string[] } | null>(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [latihans, setLatihans] = useState<LatihanItem[]>([]);
  const [latihanLoading, setLatihanLoading] = useState(true);
  const [preview, setPreview] = useState<{
    tema: string;
    totalAvailable: number;
    deliverableTotal: number;
    seed: string;
    questionIds: string[];
    soal: { id: string; nomor: number; text: string; options: string[]; correctAnswer: string | null; explanation: string | null; difficulty: string | null }[];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  /**
   * Preview soal. `fixedSeed` dipakai mode Main Bersama (set stabil yang
   * sama dengan yang diteruskan ke sesi); tanpa itu perilaku Latihan
   * lama dipertahankan (seed baru tiap klik + disimpan untuk kiriman).
   */
  const handlePreview = async (fixedSeed?: string) => {
    if (!selectedTheme) return;
    setPreviewLoading(true);
    try {
      const seed = fixedSeed ?? Math.random().toString(36).slice(2, 12);
      const params = new URLSearchParams({
        tema: selectedTheme.name,
        jumlah: String(sendJumlah),
        seed,
      });
      if (sendDifficulty) params.set("difficulty", sendDifficulty);
      const res = await fetch(`/api/guru/bank-soal/preview?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPreview(data);
        if (!fixedSeed) setQuestionSet({ seed: data.seed, questionIds: data.questionIds });
      } else {
        setSuccess(`❌ ${data.error || "Gagal memuat preview"}`);
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch {
      setSuccess("❌ Gagal menghubungi server");
      setTimeout(() => setSuccess(null), 4000);
    }
    setPreviewLoading(false);
  };

  const fetchLatihans = useCallback(async () => {
    try {
      const res = await fetch("/api/guru/latihan");
      const data = await res.json();
      if (data.latihans) setLatihans(data.latihans);
    } catch {}
    setLatihanLoading(false);
  }, []);

  const fetchThemes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/guru/bank-soal");
      const data = await res.json();
      if (data.success) setThemes(data.themes || []);
    } catch {}
    setLoading(false);
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/group");
      const data = await res.json();
      if (data.groups) setGroups(data.groups);
    } catch {}
  }, []);

  useEffect(() => { fetchThemes(); }, [fetchThemes]);
  useEffect(() => { fetchLatihans(); }, [fetchLatihans]);

  const handleOpenSend = (theme: ThemeData) => {
    setSelectedTheme(theme);
    setModalMode(openedForMainBersama ? "main-bersama" : "latihan");
    setMbSeed(Math.random().toString(36).slice(2, 12));
    setSelectedGroups([]);
    setSendJumlah(10);
    setSendDifficulty("");
    setQuestionSet(null);
    setPreview(null);
    fetchGroups();
  };

  /**
   * Handoff ke setup Main Bersama: hanya identitas + parameter pilihan
   * yang dibawa lewat URL (tema, jumlah, tingkat, seed). Tidak ada isi
   * soal/kunci jawaban di query string; verifikasi tetap server-side.
   */
  const handleUseForMainBersama = () => {
    if (!selectedTheme) return;
    const params = new URLSearchParams({
      untuk: "main-bersama",
      tema: selectedTheme.name,
      jumlah: String(sendJumlah),
    });
    if (sendDifficulty) params.set("tingkat", sendDifficulty);
    if (mbSeed) params.set("seed", mbSeed);
    router.push(`/guru/game/main-bersama?${params.toString()}`);
  };

  const selectedEmptyGroups = selectedGroups.filter(id => {
    const g = groups.find(gr => gr.id === id);
    return g && (g.memberCount || 0) === 0;
  });

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (!selectedTheme || selectedGroups.length === 0) return;
    // Kelas tanpa murid: assignment tetap berguna (murid yang bergabung lewat
    // kode kelas nanti bisa mengerjakan), tapi kirim harus disengaja —
    // minta konfirmasi eksplisit, jangan diam-diam dibuat.
    if (selectedEmptyGroups.length > 0) {
      const names = selectedEmptyGroups.map(id => groups.find(gr => gr.id === id)?.name || id).join(", ");
      const ok = window.confirm(
        `${names} belum memiliki murid. Latihan tetap dikirim dan murid yang bergabung nanti dapat mengerjakannya. Lanjutkan?`
      );
      if (!ok) return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/guru/bank-soal/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tema: selectedTheme.name,
          groupIds: selectedGroups,
          jumlah: sendJumlah,
          difficulty: sendDifficulty || undefined,
          seed: questionSet?.seed,
          questionIds: questionSet?.questionIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`✅ "${selectedTheme.name}" terkirim ke ${selectedGroups.length} kelas`);
        setTimeout(() => setSuccess(null), 4000);
        setSelectedTheme(null);
        setPreview(null);
        fetchThemes();
      } else {
        setSuccess(`❌ ${data.error || "Gagal mengirim"}`);
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch {
      setSuccess("❌ Gagal menghubungi server");
      setTimeout(() => setSuccess(null), 4000);
    }
    setSending(false);
  };

  const CATEGORIES = [
    { name: "Tata Bahasa", pattern: /^(SPOK|Kalimat|Kalimat Efektif|Paragraf|Ide Pokok|Gagasan Utama|Simpulan|Sinonim|Antonim|Makna Kata|Imbuhan|Kata Baku|Kata Tidak Baku|PUEBI|Ejaan|Tanda Baca)$/ },
    { name: "Sastra", pattern: /^(Majas|Puisi|Pantun|Syair|Gurindam|Cerpen|Novel|Drama|Fabel|Legenda|Hikayat|Mitos|Cerita Inspiratif|Anekdot)$/ },
    { name: "Jenis Teks", pattern: /^(Teks Deskripsi|Teks Narasi|Teks Eksposisi|Teks Eksplanasi|Teks Persuasi|Teks Argumentasi|Teks Prosedur|Teks Berita|Teks Ulasan|Resensi|Editorial|Artikel)$/ },
    { name: "Fungsional", pattern: /^(Surat Pribadi|Surat Dinas|Proposal|Pidato|Poster|Iklan|Slogan)$/ },
  ];

  const filtered = themes.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    themes: filtered.filter(t => cat.pattern.test(t.name)),
  })).filter(g => g.themes.length > 0);

  // Uncategorized
  const categorizedNames = new Set(CATEGORIES.flatMap(c => filtered.filter(t => c.pattern.test(t.name)).map(t => t.name)));
  const uncategorized = filtered.filter(t => !categorizedNames.has(t.name));

  if (uncategorized.length > 0) {
    grouped.push({ name: "Lainnya", pattern: /$^/, themes: uncategorized });
  }

  const totalQuestions = themes.reduce((s, t) => s + t.total, 0);

  // Matcher statis konstanta module-level — tidak perlu memoization;
  // plain function aman karena CATEGORIES tidak berubah antar render.
  // DIDEKLARASI SEBELUM useMemo yang memakainya (hindari TDZ saat render).
  const getCategoryKey = (name: string) => {
    for (const c of CATEGORIES) {
      if (c.pattern.test(name)) return c.name;
    }
    return "Lainnya";
  };

  // ── Discovery shelves (§I) — editorial dari data existing, tanpa
  // klaim popularitas palsu. Pilihan kategori = slice deterministik.
  const shelf = useMemo(() => {
    const byCat = new Map<string, ThemeData[]>();
    for (const t of themes) {
      const k = getCategoryKey(t.name);
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k)!.push(t);
    }
    for (const list of byCat.values()) {
      list.sort((a, b) => b.total - a.total);
    }
    // "Jelajahi Tema": tema terbesar per kategori (data faktual).
    const jelajahi: ThemeData[] = [];
    for (const key of ["Tata Bahasa", "Sastra", "Jenis Teks", "Fungsional"]) {
      const top = byCat.get(key)?.[0];
      if (top) jelajahi.push(top);
    }
    // "Pilihan Berdasarkan Kategori": editorial per kategori utama.
    const kategori: { key: string; item: ThemeData | null }[] = ["Tata Bahasa", "Sastra", "Jenis Teks", "Fungsional", "Lainnya"]
      .map((key) => ({ key, item: byCat.get(key)?.[0] ?? null }));
    return { jelajahi, kategori };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getCategoryKey stabil (matcher konstanta)
  }, [themes]);

  const getInitials = (name: string) => {
    const parts = name.split(/[\s/]+/);
    return parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {success && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          success.includes("✅") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {success}
        </div>
      )}

      {/* ── HEADER DISCOVERY (§G) ──────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-emerald-50/70 via-white to-violet-50/50 p-5 sm:p-6">
        <div aria-hidden className="absolute -top-14 -right-8 w-48 h-48 rounded-full bg-emerald-200/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-16 left-1/3 w-40 h-40 rounded-full bg-violet-200/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Perpustakaan Konten</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bank Soal</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Temukan bahan belajar yang pas untuk kelasmu.
          </p>
          {!loading && (
            <p className="mt-1 text-sm font-semibold text-gray-700 tabular-nums">
              {totalQuestions.toLocaleString("id-ID")} soal • {themes.length} tema
            </p>
          )}

          {/* Search lebih prominent (§G) */}
          <div className="relative mt-4 max-w-md">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari tema, soal, atau kompetensi..."
              aria-label="Cari tema, soal, atau kompetensi"
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 text-sm bg-white shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Navigasi internal (bukan submenu sidebar) — refined (§G) */}
      <div className="flex gap-1.5 bg-white border border-slate-200/80 rounded-2xl p-1.5 w-fit max-w-full shadow-sm">
        {[
          { label: "Bank Soal", href: "/guru/bank-soal", icon: Library },
          { label: "Latihan", href: "/guru/bank-soal", icon: ListChecks },
          { label: "Kuis", href: "/guru/kuis", icon: FileText },
          { label: "Soal", href: "/guru/soal", icon: FilePlus2 },
        ].map((item) => {
          const active = item.href === "/guru/bank-soal"
            ? pathname === "/guru/bank-soal"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* ── STATS — compact strip (§H) ─────────────────────── */}
      {!loading && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-slate-100 bg-white px-4 sm:px-5 py-3 shadow-sm">
          {[
            { icon: BookOpen, label: "Tema", value: String(themes.length), chip: "bg-emerald-50 text-emerald-600" },
            { icon: GraduationCap, label: "Total soal", value: totalQuestions.toLocaleString("id-ID"), chip: "bg-blue-50 text-blue-600" },
            { icon: Users, label: "Jenjang", value: String(new Set(themes.flatMap(t => t.kelas)).size), chip: "bg-violet-50 text-violet-600" },
            { icon: Send, label: "Kirim ke kelas", value: "1 klik", chip: "bg-amber-50 text-amber-600" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2.5 min-w-0">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.chip}`}>
                <s.icon size={15} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-gray-900 leading-tight tabular-nums">{s.value}</span>
                <span className="block text-[11px] text-gray-400 leading-tight">{s.label}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── DISCOVERY SHELVES (§I) ─────────────────────────── */}
      {!loading && !search && shelf.jelajahi.length > 0 && (
        <section aria-labelledby="shelf-jelajahi">
          <div className="flex items-center gap-2 mb-3">
            <Compass size={16} className="text-emerald-600" aria-hidden />
            <h2 id="shelf-jelajahi" className="text-base font-bold text-gray-900">Jelajahi Tema</h2>
            <span className="text-xs text-gray-400">tema pilihan dari tiap kategori</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {shelf.jelajahi.map(t => {
              const catKey = getCategoryKey(t.name);
              const visual = categoryVisual(catKey);
              const v = themeVariant(t.name);
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => handleOpenSend(t)}
                  className="group relative text-left rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 motion-safe:transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                >
                  <ThemeCoverArt visual={visual} variant={v} name={t.name} />
                  <div className="p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{catKey}</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{t.name}</p>
                    <p className="mt-1.5 text-xs text-gray-500">
                      <span className="font-bold text-gray-700 tabular-nums">{t.total}</span> soal siap dipakai
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!loading && !search && (
        <section aria-labelledby="shelf-mb" className="relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50 via-white to-emerald-50 p-5">
          <div aria-hidden className="absolute -top-10 right-8 w-36 h-36 rounded-full bg-teal-200/25 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                <MonitorPlay size={20} className="text-white" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 id="shelf-mb" className="text-base font-bold text-gray-900">Coba di Main Bersama</h2>
                <p className="text-xs sm:text-sm text-gray-500">Kuis kelas live dari paket soalmu — pilih tema, buka ruang, bagikan PIN.</p>
              </div>
            </div>
            <Link
              href="/guru/game/main-bersama"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold shadow-sm hover:bg-teal-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            >
              <MonitorPlay size={15} aria-hidden /> Buka Main Bersama <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {/* ── CATEGORY SECTIONS (§J) — ThemeCard + aksen kategori ── */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="space-y-10">
          {grouped.map(cat => {
            const visual = categoryVisual(cat.name);
            return (
              <section key={cat.name} aria-labelledby={`cat-${cat.name.replace(/\s+/g, "-")}`}>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className={`w-1.5 h-6 rounded-full ${visual.accentBar}`} aria-hidden />
                  <h2
                    id={`cat-${cat.name.replace(/\s+/g, "-")}`}
                    className="text-lg font-bold text-gray-900"
                  >
                    {cat.name}
                  </h2>
                  <span className="text-xs font-semibold text-gray-400 tabular-nums">{cat.themes.length} tema</span>
                </div>
                <p className="text-xs text-gray-400 mb-4 ml-4">{visual.subtitle}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {cat.themes.map(t => (
                    <ThemeCard key={t.name} theme={t} onOpen={handleOpenSend} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ── LATIHAN SAYA (§O) — bagian dari discovery hub, bukan tail ── */}
      <section aria-labelledby="latihan-saya" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100 text-emerald-600`}>
            <ListChecks size={16} aria-hidden />
          </span>
          <h2 id="latihan-saya" className="text-base font-bold text-gray-900">Latihan Saya</h2>
          <span className="ml-auto text-xs font-semibold text-gray-400 tabular-nums">
            {latihanLoading ? "" : `${latihans.length} latihan`}
          </span>
        </div>
        {latihanLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
        ) : latihans.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Belum ada latihan. Pilih tema di atas untuk mengirim latihan ke kelas.
          </p>
        ) : (
          <div className="space-y-2">
            {latihans.map(l => (
              <Link
                key={l.id}
                href={`/guru/bank-soal/${l.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{l.title}</p>
                  <p className="text-xs text-gray-400">
                    {l.kelas && `Kelas ${l.kelas}`}{l.topik && ` · ${l.topik}`} · {l.totalSoal} soal
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-900">
                      {l.avgScore !== null ? `${l.avgScore}%` : "—"}
                    </p>
                    <p className="text-[10px] text-gray-400">rata-rata</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{l.totalSubmitted}</p>
                    <p className="text-[10px] text-gray-400">dikerjakan</p>
                  </div>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    Analitik →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Gunakan Tema — SATU modal, dua aktivitas: Latihan | Main Bersama */}
      <Modal isOpen={!!selectedTheme} onClose={() => setSelectedTheme(null)} title="Gunakan Tema" className="max-w-md">
        {selectedTheme && (() => {
          const catKey = getCategoryKey(selectedTheme.name);
          const cc = CAT_COLORS[catKey] || CAT_COLORS["Lainnya"];
          const isMB = modalMode === "main-bersama";
          return (
          <div className="space-y-4">
            <div className={`p-3 bg-gradient-to-br ${cc.from} ${cc.to} rounded-xl text-white flex items-center gap-3`}>
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur">
                <span className="text-white text-sm font-bold tracking-wider uppercase">{getInitials(selectedTheme.name)}</span>
              </div>
              <div>
                <p className="text-sm font-bold">{selectedTheme.name}</p>
                <p className="text-[10px] opacity-80">{selectedTheme.total} soal tersedia</p>
              </div>
            </div>

            {/* Segmented control — aktivitas yang dituju */}
            <div role="radiogroup" aria-label="Gunakan tema untuk" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                role="radio"
                aria-checked={!isMB}
                onClick={() => setModalMode("latihan")}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                  !isMB ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <BookOpen size={15} aria-hidden />
                Latihan
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={isMB}
                onClick={() => setModalMode("main-bersama")}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                  isMB ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <MonitorPlay size={15} aria-hidden />
                Main Bersama
              </button>
            </div>            {/* Seksi 1 — SOAL */}
            <div>
              <label className="block text-sm font-medium mb-1">Jumlah soal</label>
              <input
                type="number" min={1} max={30}
                value={sendJumlah}
                onChange={e => { setSendJumlah(Math.min(30, Math.max(1, parseInt(e.target.value) || 1))); setQuestionSet(null); }}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              {questionSet && (
                <p className="mt-1 text-xs text-emerald-700">✓ {sendJumlah} soal dipilih — lihat di "Lihat Soal"</p>
              )}
            </div>

            {/* Seksi 2 — FILTER */}
            <div>
              <label className="block text-sm font-medium mb-1">Tingkat kesulitan</label>
              <select
                value={sendDifficulty}
                onChange={e => { setSendDifficulty(e.target.value); setQuestionSet(null); }}
                className={"w-full rounded-lg border px-3 py-2 text-sm bg-white"}
              >
                <option value="">Semua</option>
                <option value="MUDAH">Mudah / LOTS</option>
                <option value="SEDANG">Sedang / MOTS</option>
                <option value="SULIT">Sulit / HOTS</option>
              </select>
            </div>

            {isMB ? (
              <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">
                Kelas dapat dipilih setelah kembali ke Main Bersama.
              </p>
            ) : null}

            {/* Seksi 4 — TUJUAN (hanya Latihan; kelas dipilih di setup Main Bersama) */}
            {!isMB ? (
            <div>
              <label className="block text-sm font-semibold mb-2">Pilih Kelas</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {groups.map(g => {
                  const sel = selectedGroups.includes(g.id);
                  const empty = (g.memberCount || 0) === 0;
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGroup(g.id)}
                      aria-pressed={sel}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                        sel ? "border-emerald-500 bg-emerald-50" : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        sel ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                      }`} role="checkbox" aria-checked={sel}>
                        {sel && <Check size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{g.name}</p>
                        <p className={`text-xs ${empty ? "text-amber-600" : "text-gray-400"}`}>
                          {empty ? "⚠ Belum ada murid" : `${g.memberCount || 0} murid`}
                        </p>
                      </div>
                    </button>
                  );
                })}
                {groups.length === 0 && (
                  <p className="text-sm text-gray-400 italic">Belum ada kelas. Buat kelas di menu KelasKu.</p>
                )}
              </div>
            </div>
            ) : null}

            <div className="pt-2 space-y-2">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedTheme(null)} className="flex-1">Batal</Button>
                <Button
                  variant="outline"
                  onClick={() => void handlePreview(isMB ? mbSeed : undefined)}
                  disabled={previewLoading}
                  className="flex-1"
                >
                  {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen size={16} className="mr-1" />}
                  Lihat Soal
                </Button>
              </div>
              {isMB ? (
                <Button
                  onClick={handleUseForMainBersama}
                  className="w-full bg-violet-600"
                >
                  <MonitorPlay size={16} className="mr-1" />
                  Gunakan untuk Main Bersama
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={sending || selectedGroups.length === 0}
                  className="w-full bg-emerald-600"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} className="mr-1" />}
                  {sending ? "Mengirim..." : "Kirim Latihan"}
                </Button>
              )}
              <p className="text-center text-xs text-gray-400">
                {isMB
                  ? "Jumlah soal & tingkat kesulitan bisa diubah lagi di Main Bersama."
                  : selectedGroups.length === 0
                    ? "Pilih minimal 1 kelas"
                    : `${selectedGroups.length} kelas dipilih`}
              </p>
            </div>
          </div>);
        })()}
      </Modal>

      {/* Preview Modal — guru-only, kunci jawaban terlihat di sini */}
      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title="Lihat Soal" className="max-w-2xl">
        {preview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                {preview.tema} · {preview.soal.length} soal dipilih
              </p>
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">
                {preview.deliverableTotal ?? preview.totalAvailable} soal lolos verifikasi
              </Badge>
            </div>
            <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3">
              {preview.soal.map(s => (
                <div key={s.id} className="p-3 rounded-xl border border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    <span className="text-gray-400 mr-1.5">{s.nomor}.</span>
                    {s.text}
                    {s.difficulty && (
                      <span className="ml-2 text-[10px] font-semibold text-gray-400 uppercase">{s.difficulty}</span>
                    )}
                  </p>
                  <div className="mt-2 space-y-1">
                    {s.options.map((opt, oi) => {
                      const isCorrect = String(s.correctAnswer) === String(oi);
                      return (
                        <div
                          key={oi}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                            isCorrect ? "bg-emerald-50 text-emerald-800 font-semibold" : "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {isCorrect ? <Check size={12} className="text-emerald-600 shrink-0" /> : <span className="w-3 shrink-0" />}
                          <span className="truncate">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                  {s.explanation && (
                    <p className="mt-2 text-[11px] text-gray-500 border-t border-gray-50 pt-1.5">
                      <span className="font-semibold text-gray-600">Pembahasan:</span> {s.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setPreview(null)} className="flex-1">
                Kembali
              </Button>
              <Button
                onClick={() => setPreview(null)}
                className="flex-1 bg-emerald-600"
              >
                <Check size={16} className="mr-1" /> Set ini yang dikirim
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
