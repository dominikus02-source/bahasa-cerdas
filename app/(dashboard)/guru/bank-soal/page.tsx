"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Search, Send, Users, BookOpen, GraduationCap, Check,
  FileText, FilePlus2, MonitorPlay, ArrowRight, Library,
  Sparkles, TrendingUp,
} from "lucide-react";
import { ThemeCard } from "@/components/guru/bank-soal/ThemeCard";
import { categoryVisual } from "@/components/guru/bank-soal/theme-cover";
import { ThemeShelf } from "@/components/guru/bank-soal/ThemeShelf";
import { FeaturedCollection } from "@/components/guru/bank-soal/FeaturedCollection";
import { BankSoalCategoryNav } from "@/components/guru/bank-soal/BankSoalCategoryNav";
import {
  COLLECTIONS,
} from "@/components/guru/bank-soal/theme-config";

// ─── Category Patterns (canonical source) ────────────────────

const CATEGORIES: { name: string; pattern: RegExp }[] = [
  { name: "Tata Bahasa", pattern: /^(SPOK|Kalimat|Kalimat Efektif|Paragraf|Ide Pokok|Gagasan Utama|Simpulan|Sinonim|Antonim|Makna Kata|Imbuhan|Kata Baku|Kata Tidak Baku|PUEBI|Ejaan|Tanda Baca)$/ },
  { name: "Sastra", pattern: /^(Majas|Puisi|Pantun|Syair|Gurindam|Cerpen|Novel|Drama|Fabel|Legenda|Hikayat|Mitos|Cerita Inspiratif|Anekdot)$/ },
  { name: "Jenis Teks", pattern: /^(Teks Deskripsi|Teks Narasi|Teks Eksposisi|Teks Eksplanasi|Teks Persuasi|Teks Argumentasi|Teks Prosedur|Teks Berita|Teks Ulasan|Resensi|Editorial|Artikel)$/ },
  { name: "Fungsional", pattern: /^(Surat Pribadi|Surat Dinas|Proposal|Pidato|Poster|Iklan|Slogan)$/ },
];

function getCategoryKey(name: string): string {
  for (const c of CATEGORIES) {
    if (c.pattern.test(name)) return c.name;
  }
  return "Lainnya";
}

// ─── Data Types ──────────────────────────────────────────────

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

// ─── Main Page ───────────────────────────────────────────────

export default function BankSoalPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Mode Main Bersama picker (§Phase 2) ──
  // Tidak ada `?untuk=main-bersama` → perilaku produksi normal, 100% tak berubah.
  // Saat picker aktif: layout & kartu modern TETAP SAMA; hanya tambahan
  // banner kontekstual + aksi "Gunakan untuk Main Bersama" pada modal tema.
  const pickerMode = searchParams.get("untuk") === "main-bersama";

  // ── Data state ──
  const [themes, setThemes] = useState<ThemeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupItem[]>([]);

  // ── UI state ──
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Send modal state ──
  const [selectedTheme, setSelectedTheme] = useState<ThemeData | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [sendJumlah, setSendJumlah] = useState(10);
  const [sendDifficulty, setSendDifficulty] = useState("");
  const [questionSet, setQuestionSet] = useState<{ seed: string; questionIds: string[] } | null>(null);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<{
    tema: string;
    totalAvailable: number;
    deliverableTotal: number;
    seed: string;
    questionIds: string[];
    soal: { id: string; nomor: number; text: string; options: string[]; correctAnswer: string | null; explanation: string | null; difficulty: string | null }[];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showAllThemes, setShowAllThemes] = useState(false);

  // ── Handoff Main Bersama: seed baru per pembukaan modal (perilaku lama §8A.3) ──
  const [mbSeed, setMbSeed] = useState<string | null>(null);
  const [mbReturning, setMbReturning] = useState(false);

  /**
   * Handoff ke setup Main Bersama: hanya identitas + parameter pilihan
   * yang dibawa lewat URL (tema, jumlah, tingkat, seed) — kontrak yang
   * SAMA dengan 8A.3. Tidak ada isi soal/kunci jawaban di query string;
   * verifikasi tetap server-side lewat normalizer create-session.
   */
  const handleUseForMainBersama = useCallback(() => {
    if (!selectedTheme) return;
    const params = new URLSearchParams({
      untuk: "main-bersama",
      tema: selectedTheme.name,
      jumlah: String(sendJumlah),
    });
    if (sendDifficulty) params.set("tingkat", sendDifficulty);
    if (mbSeed) params.set("seed", mbSeed);
    setMbReturning(true);
    router.push(`/guru/game/main-bersama?${params.toString()}`);
  }, [selectedTheme, sendJumlah, sendDifficulty, mbSeed, router]);

  // ── Data fetching ──
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

  // ── Derived data ──
  const totalQuestions = useMemo(
    () => themes.reduce((s, t) => s + t.total, 0),
    [themes],
  );

  // Categorized themes
  const categorized = useMemo(() => {
    const byCat = new Map<string, ThemeData[]>();
    for (const t of themes) {
      const k = getCategoryKey(t.name);
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k)!.push(t);
    }
    // Sort each category by question count descending
    for (const list of byCat.values()) {
      list.sort((a, b) => b.total - a.total);
    }
    return byCat;
  }, [themes]);

  // Category nav data
  const categoryNavData = useMemo(() => {
    const keys = ["Tata Bahasa", "Sastra", "Jenis Teks", "Fungsional", "Lainnya"];
    return keys
      .map(key => ({
        key,
        visual: categoryVisual(key),
        count: categorized.get(key)?.length ?? 0,
      }))
      .filter(c => c.count > 0);
  }, [categorized]);

  // Filtered themes for display
  const filtered = useMemo(() => {
    let result = themes;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q));
    }
    if (selectedCategory) {
      result = result.filter(t => getCategoryKey(t.name) === selectedCategory);
    }
    return result;
  }, [themes, search, selectedCategory]);

  // Grouped by category (for shelf display)
  const grouped = useMemo(() => {
    const order = ["Tata Bahasa", "Sastra", "Jenis Teks", "Fungsional", "Lainnya"];
    return order
      .map(key => ({
        key,
        visual: categoryVisual(key),
        themes: filtered.filter(t => getCategoryKey(t.name) === key),
      }))
      .filter(g => g.themes.length > 0);
  }, [filtered]);

  // Collection matching
  const collectionMatches = useMemo(() => {
    return COLLECTIONS.map(col => ({
      collection: col,
      matchedThemes: col.themeNames
        ? col.themeNames
            .map(name => themes.find(t => t.name === name))
            .filter((t): t is ThemeData => !!t)
            .map(t => ({ name: t.name, total: t.total }))
        : themes
            .filter(t => col.category ? getCategoryKey(t.name) === col.category : false)
            .map(t => ({ name: t.name, total: t.total })),
    })).filter(c => c.matchedThemes.length > 0);
  }, [themes]);

  // ── Send flow ──
  const handleOpenSend = (theme: ThemeData) => {
    setSelectedTheme(theme);
    setSelectedGroups([]);
    setSendJumlah(10);
    setSendDifficulty("");
    setQuestionSet(null);
    setPreview(null);
    // Picker mode: seed baru per pembukaan + latihan state tidak dipakai.
    if (pickerMode) setMbSeed(Math.random().toString(36).slice(2, 12));
    if (!pickerMode) fetchGroups();
  };

  const handleOpenByName = (themeName: string) => {
    const t = themes.find(th => th.name === themeName);
    if (t) handleOpenSend(t);
  };

  const selectedEmptyGroups = selectedGroups.filter(id => {
    const g = groups.find(gr => gr.id === id);
    return g && (g.memberCount || 0) === 0;
  });

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id],
    );
  };

  const handlePreview = async () => {
    if (!selectedTheme) return;
    setPreviewLoading(true);
    try {
      const seed = Math.random().toString(36).slice(2, 12);
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
        setQuestionSet({ seed: data.seed, questionIds: data.questionIds });
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

  const handleSend = async () => {
    if (!selectedTheme || selectedGroups.length === 0) return;
    if (selectedEmptyGroups.length > 0) {
      const names = selectedEmptyGroups
        .map(id => groups.find(gr => gr.id === id)?.name || id)
        .join(", ");
      const ok = window.confirm(
        `${names} belum memiliki murid. Latihan tetap dikirim dan murid yang bergabung nanti dapat mengerjakannya. Lanjutkan?`,
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

  const getInitials = (name: string) => {
    const parts = name.split(/[\s/]+/);
    return parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  };

  // ── Render ──
  return (
    <div className="space-y-8">
      {/* Toast */}
      {success && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
            success.includes("✅")
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {success}
        </div>
      )}

      {/* Main Bersama picker banner — hanya saat ?untuk=main-bersama.
          Halaman normal TIDAK PERNAH merender blok ini (zero regression). */}
      {pickerMode && (
        <section
          aria-label="Memilih tema untuk Main Bersama"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-teal-300/70 bg-teal-50 px-4 py-3"
        >
          <span className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
            <MonitorPlay size={17} className="text-white" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900">Pilih tema untuk Main Bersama</p>
            <p className="text-xs text-gray-500">
              Buka sebuah tema, atur jumlah soal, lalu tekan{" "}
              <strong className="font-semibold">Gunakan untuk Main Bersama</strong>.
            </p>
          </div>
          <Link
            href="/guru/game/main-bersama"
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-teal-600/30 text-teal-700 text-sm font-semibold hover:bg-teal-100 transition-colors"
          >
            ← Kembali ke Main Bersama
          </Link>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          1. HERO — Editorial discovery header
         ════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-2xl bg-emerald-700 p-6 sm:p-8 text-white">
        {/* Subtle geometric pattern */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        <div className="relative">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-200">
              Perpustakaan Konten
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
            Bank Soal
          </h1>
          <p className="mt-2 text-sm sm:text-base text-emerald-100/80 max-w-lg">
            Temukan latihan yang tepat untuk kelasmu. Jelajahi {themes.length} tema dari {totalQuestions.toLocaleString("id-ID")} soal.
          </p>

          {/* Stat chips */}
          {!loading && (
            <div className="flex flex-wrap gap-2.5 mt-4">
              {[
                { icon: BookOpen, label: "Tema", value: String(themes.length) },
                { icon: GraduationCap, label: "Soal", value: totalQuestions.toLocaleString("id-ID") },
                { icon: Users, label: "Jenjang", value: String(new Set(themes.flatMap(t => t.kelas)).size) },
              ].map(s => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-semibold"
                >
                  <s.icon size={13} className="opacity-70" aria-hidden />
                  <span className="font-bold">{s.value}</span>
                  <span className="opacity-60">{s.label}</span>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative mt-5 max-w-lg">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-300/60"
              aria-hidden
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari tema, materi, atau kata kunci..."
              aria-label="Cari tema, materi, atau kata kunci"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-sm text-white placeholder:text-emerald-200/50 focus:bg-white/20 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          2. NAV TABS — Bank Soal / Latihan / Kuis / Soal
         ════════════════════════════════════════════════════════ */}
      <div className="flex gap-1.5 bg-white border border-slate-200/80 rounded-2xl p-1.5 w-fit max-w-full shadow-sm">
        {[
          { label: "Bank Soal", href: "/guru/bank-soal", icon: Library },
          { label: "Kuis", href: "/guru/kuis", icon: FileText },
          { label: "Soal", href: "/guru/soal", icon: FilePlus2 },
        ].map(item => {
          const active =
            item.href === "/guru/bank-soal"
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

      {/* ════════════════════════════════════════════════════════
          3. CATEGORY NAV — Quick category filters
         ════════════════════════════════════════════════════════ */}
      {!loading && !search && (
        <BankSoalCategoryNav
          categories={categoryNavData}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      )}

      {/* ════════════════════════════════════════════════════════
          4. FEATURED COLLECTIONS — e.g. Tokoh Sastra
         ════════════════════════════════════════════════════════ */}
      {!loading && !search && !selectedCategory && collectionMatches.length > 0 && (
        <section aria-labelledby="featured-collections">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-1.5 h-6 rounded-full bg-violet-500" aria-hidden />
            <h2 id="featured-collections" className="text-lg font-bold text-gray-900">
              Koleksi Pilihan
            </h2>
            <Sparkles size={14} className="text-violet-500" aria-hidden />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {collectionMatches.map(({ collection, matchedThemes }) => (
              <FeaturedCollection
                key={collection.id}
                collection={collection}
                matchedThemes={matchedThemes}
                onExplore={handleOpenByName}
              />
            ))}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          6. MAIN BERSAMA CTA
         ════════════════════════════════════════════════════════ */}
      {!loading && !search && !selectedCategory && (
        <section
          aria-labelledby="shelf-mb"
          className="relative overflow-hidden rounded-2xl border border-teal-200/60 bg-white p-5"
        >
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
                <MonitorPlay size={20} className="text-white" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 id="shelf-mb" className="text-base font-bold text-gray-900">
                  Coba di Main Bersama
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  Kuis kelas live dari paket soalmu — pilih tema, buka ruang, bagikan PIN.
                </p>
              </div>
            </div>
            <Link
              href="/guru/game/main-bersama"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold shadow-sm hover:bg-teal-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            >
              <MonitorPlay size={15} aria-hidden /> Buka Main Bersama{" "}
              <ArrowRight size={13} aria-hidden />
            </Link>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          7. THEME SHELVES — Horizontal scrollable per category
         ════════════════════════════════════════════════════════ */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : search || selectedCategory ? (
        /* ── Filtered: flat grid (search or category filter active) ── */
        <section aria-labelledby="filtered-results">
          <div className="flex items-center gap-2.5 mb-4">
            <TrendingUp size={16} className="text-emerald-600" aria-hidden />
            <h2 id="filtered-results" className="text-lg font-bold text-gray-900">
              {search ? `Hasil "${search}"` : selectedCategory}
            </h2>
            <span className="text-xs font-semibold text-gray-400 tabular-nums">
              {filtered.length} tema
            </span>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">Tidak ada tema yang cocok.</p>
              <button
                type="button"
                onClick={() => { setSearch(""); setSelectedCategory(null); }}
                className="mt-2 text-sm text-emerald-600 font-semibold hover:underline"
              >
                Reset filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map(t => (
                <ThemeCard key={t.name} theme={t} onOpen={handleOpenSend} />
              ))}
            </div>
          )}
        </section>
      ) : (
        /* ── Default: horizontal shelves per category ── */
        <div className="space-y-10">
          {grouped.map(cat => {
            const vis = cat.visual;
            const Icon = vis.icon;
            return (
              <section
                key={cat.key}
                aria-labelledby={`shelf-${cat.key.replace(/\s+/g, "-")}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-1.5 h-6 rounded-full ${vis.accentBar}`}
                      aria-hidden
                    />
                    <Icon size={16} className={vis.accentText} aria-hidden />
                    <h2
                      id={`shelf-${cat.key.replace(/\s+/g, "-")}`}
                      className="text-lg font-bold text-gray-900"
                    >
                      {cat.key}
                    </h2>
                    <span className="text-xs font-semibold text-gray-400 tabular-nums">
                      {cat.themes.length} tema
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                  >
                    Lihat semua →
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-3 ml-4">{vis.subtitle}</p>
                <ThemeShelf
                  themes={cat.themes}
                  visual={vis}
                  onOpen={handleOpenSend}
                />
              </section>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          8. EXPLORE ALL — Collapsible full grid
         ════════════════════════════════════════════════════════ */}
      {!loading && !search && !selectedCategory && (
        <section aria-labelledby="explore-all" className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-6 rounded-full bg-slate-400" aria-hidden />
              <h2 id="explore-all" className="text-lg font-bold text-gray-900">
                Jelajahi Semua Tema
              </h2>
              <span className="text-xs font-semibold text-gray-400 tabular-nums">
                {themes.length} tema
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAllThemes(prev => !prev)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
            >
              {showAllThemes ? "Sembunyikan" : "Tampilkan semua"}
            </button>
          </div>
          {showAllThemes && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {themes
                .sort((a, b) => b.total - a.total)
                .map(t => (
                  <ThemeCard key={t.name} theme={t} onOpen={handleOpenSend} />
                ))}
            </div>
          )}
        </section>
      )}

      {/* ════════════════════════════════════════════════════════
          SEND MODAL — SOAL → FILTER → PREVIEW → TUJUAN
         ════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!selectedTheme}
        onClose={() => setSelectedTheme(null)}
        title={pickerMode ? "Gunakan Tema" : "Siapkan Latihan"}
        className="max-w-md"
      >
        {selectedTheme &&
          (() => {
            const catKey = getCategoryKey(selectedTheme.name);
            const vis = categoryVisual(catKey);
            return (
              <div className="space-y-4">
                <div
                  className={`p-3 ${vis.coverBg} rounded-xl text-white flex items-center gap-3`}
                >
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur">
                    <span className="text-white text-sm font-bold tracking-wider uppercase">
                      {getInitials(selectedTheme.name)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{selectedTheme.name}</p>
                    <p className="text-[10px] opacity-80">
                      {selectedTheme.total} soal tersedia
                    </p>
                  </div>
                </div>

                {/* Jumlah soal */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Jumlah soal
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={sendJumlah}
                    onChange={e => {
                      setSendJumlah(
                        Math.min(30, Math.max(1, parseInt(e.target.value) || 1)),
                      );
                      setQuestionSet(null);
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                  {questionSet && (
                    <p className="mt-1 text-xs text-emerald-700">
                      ✓ {sendJumlah} soal dipilih — lihat di &quot;Lihat Soal&quot;
                    </p>
                  )}
                </div>

                {/* Tingkat kesulitan */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tingkat kesulitan
                  </label>
                  <select
                    value={sendDifficulty}
                    onChange={e => {
                      setSendDifficulty(e.target.value);
                      setQuestionSet(null);
                    }}
                    className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Semua</option>
                    <option value="MUDAH">Mudah / LOTS</option>
                    <option value="SEDANG">Sedang / MOTS</option>
                    <option value="SULIT">Sulit / HOTS</option>
                  </select>
                </div>

                {/* Pilih Kelas — hanya mode latihan; di Main Bersama kelas
                    dipilih kemudian di Step 3 setup. */}
                {!pickerMode && (
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Pilih Kelas
                  </label>
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
                            sel
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-gray-100 hover:border-gray-200"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                              sel
                                ? "bg-emerald-500 border-emerald-500"
                                : "border-gray-300"
                            }`}
                            role="checkbox"
                            aria-checked={sel}
                          >
                            {sel && <Check size={12} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {g.name}
                            </p>
                            <p
                              className={`text-xs ${empty ? "text-amber-600" : "text-gray-400"}`}
                            >
                              {empty
                                ? "⚠ Belum ada murid"
                                : `${g.memberCount || 0} murid`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                    {groups.length === 0 && (
                      <p className="text-sm text-gray-400 italic">
                        Belum ada kelas. Buat kelas di menu KelasKu.
                      </p>
                    )}
                  </div>
                </div>
                )}

                {/* Actions */}
                <div className="pt-2 space-y-2">
                  {pickerMode ? (
                    <>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedTheme(null)}
                          className="flex-1"
                        >
                          Batal
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handlePreview}
                          disabled={previewLoading}
                          className="flex-1"
                        >
                          {previewLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <BookOpen size={16} className="mr-1" />
                          )}
                          Lihat Soal
                        </Button>
                      </div>
                      <Button
                        onClick={handleUseForMainBersama}
                        disabled={mbReturning || selectedTheme.total === 0}
                        className="w-full bg-teal-600"
                      >
                        <MonitorPlay size={16} className="mr-1" />
                        Gunakan untuk Main Bersama
                      </Button>
                      <p className="text-center text-xs text-gray-400">
                        Jumlah soal &amp; tingkat kesulitan bisa diubah lagi di Main Bersama. Kelas dapat dipilih setelah kembali ke Main Bersama.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedTheme(null)}
                          className="flex-1"
                        >
                          Batal
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handlePreview}
                          disabled={previewLoading}
                          className="flex-1"
                        >
                          {previewLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <BookOpen size={16} className="mr-1" />
                          )}
                          Lihat Soal
                        </Button>
                      </div>
                      <Button
                        onClick={handleSend}
                        disabled={sending || selectedGroups.length === 0}
                        className="w-full bg-emerald-600"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send size={16} className="mr-1" />
                        )}
                        {sending ? "Mengirim..." : "Kirim Latihan"}
                      </Button>
                      <p className="text-center text-xs text-gray-400">
                        {selectedGroups.length === 0
                          ? "Pilih minimal 1 kelas"
                          : `${selectedGroups.length} kelas dipilih`}
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
      </Modal>

      {/* ════════════════════════════════════════════════════════
          PREVIEW MODAL — guru-only, kunci jawaban terlihat
         ════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={!!preview}
        onClose={() => setPreview(null)}
        title="Lihat Soal"
        className="max-w-2xl"
      >
        {preview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                {preview.tema} · {preview.soal.length} soal dipilih
              </p>
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">
                {preview.deliverableTotal ?? preview.totalAvailable} soal lolos
                verifikasi
              </Badge>
            </div>
            <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3">
              {preview.soal.map(s => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-gray-100"
                >
                  <p className="text-sm font-medium text-gray-900">
                    <span className="text-gray-400 mr-1.5">{s.nomor}.</span>
                    {s.text}
                    {s.difficulty && (
                      <span className="ml-2 text-[10px] font-semibold text-gray-400 uppercase">
                        {s.difficulty}
                      </span>
                    )}
                  </p>
                  <div className="mt-2 space-y-1">
                    {s.options.map((opt, oi) => {
                      const isCorrect =
                        String(s.correctAnswer) === String(oi);
                      return (
                        <div
                          key={oi}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                            isCorrect
                              ? "bg-emerald-50 text-emerald-800 font-semibold"
                              : "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {isCorrect ? (
                            <Check
                              size={12}
                              className="text-emerald-600 shrink-0"
                            />
                          ) : (
                            <span className="w-3 shrink-0" />
                          )}
                          <span className="truncate">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                  {s.explanation && (
                    <p className="mt-2 text-[11px] text-gray-500 border-t border-gray-50 pt-1.5">
                      <span className="font-semibold text-gray-600">
                        Pembahasan:
                      </span>{" "}
                      {s.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setPreview(null)}
                className="flex-1"
              >
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
