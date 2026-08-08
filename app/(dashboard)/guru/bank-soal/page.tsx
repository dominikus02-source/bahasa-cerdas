"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Search, Send, Users, BookOpen, GraduationCap, X, Check, ChevronDown,
  FileText, Sparkles, Quote, PenLine, ScrollText, Newspaper, MessageSquare,
  BookMarked, Library, PenTool, Globe, Megaphone, Star, ListChecks, FilePlus2,
} from "lucide-react";

const KELAS = ["1","2","3","4","5","6","7","8","9","10","11","12"];

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
  _count?: { members: number };
}

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
  const [themes, setThemes] = useState<ThemeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeData | null>(null);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [sendKelas, setSendKelas] = useState("");
  const [sendJumlah, setSendJumlah] = useState(10);
  const [sendDifficulty, setSendDifficulty] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [latihans, setLatihans] = useState<LatihanItem[]>([]);
  const [latihanLoading, setLatihanLoading] = useState(true);
  const [preview, setPreview] = useState<{
    tema: string;
    kelas: string;
    totalAvailable: number;
    soal: { id: string; nomor: number; text: string; options: string[]; correctAnswer: string | null; explanation: string | null; difficulty: string | null }[];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handlePreview = async () => {
    if (!selectedTheme || !sendKelas) return;
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams({
        tema: selectedTheme.name,
        kelas: sendKelas,
        jumlah: String(sendJumlah),
      });
      if (sendDifficulty) params.set("difficulty", sendDifficulty);
      const res = await fetch(`/api/guru/bank-soal/preview?${params.toString()}`);
      const data = await res.json();
      if (data.success) setPreview(data);
      else setSuccess(`❌ ${data.error || "Gagal memuat preview"}`);
    } catch {
      setSuccess("❌ Gagal menghubungi server");
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
    setSelectedGroups([]);
    setSendKelas("");
    setSendJumlah(10);
    setSendDifficulty("");
    fetchGroups();
  };

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (!selectedTheme || !sendKelas || selectedGroups.length === 0) return;
    setSending(true);
    try {
      const res = await fetch("/api/guru/bank-soal/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tema: selectedTheme.name,
          kelas: sendKelas,
          groupIds: selectedGroups,
          jumlah: sendJumlah,
          difficulty: sendDifficulty || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`✅ "${selectedTheme.name}" terkirim ke ${selectedGroups.length} kelas`);
        setTimeout(() => setSuccess(null), 4000);
        setSelectedTheme(null);
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

  const getInitials = (name: string) => {
    const parts = name.split(/[\s/]+/);
    return parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  };

  const getCategoryKey = (name: string) => {
    for (const c of CATEGORIES) {
      if (c.pattern.test(name)) return c.name;
    }
    return "Lainnya";
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

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Soal</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? "Memuat..." : `${totalQuestions} soal dari ${themes.length} tema — klik tema untuk kirim ke kelas`}
          </p>
        </div>
      </div>

      {/* Navigasi internal (bukan submenu sidebar) */}
      <div className="flex gap-1.5 bg-white border border-slate-100 rounded-2xl p-1.5 w-fit overflow-x-auto max-w-full">
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

      {/* Stats */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100"><BookOpen size={18} className="text-emerald-600" /></div>
            <div><p className="text-lg font-bold text-gray-900">{themes.length}</p><p className="text-xs text-gray-500">Tema</p></div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100"><GraduationCap size={18} className="text-blue-600" /></div>
            <div><p className="text-lg font-bold text-gray-900">{totalQuestions}</p><p className="text-xs text-gray-500">Total Soal</p></div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100"><Users size={18} className="text-purple-600" /></div>
            <div><p className="text-lg font-bold text-gray-900">{new Set(themes.flatMap(t => t.kelas)).size}</p><p className="text-xs text-gray-500">Jenjang</p></div>
          </Card>
          <Card className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100"><Send size={18} className="text-amber-600" /></div>
            <div><p className="text-lg font-bold text-gray-900">1 Klik</p><p className="text-xs text-gray-500">Kirim ke Kelas</p></div>
          </Card>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari tema..."
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
        />
      </div>

      {/* Theme Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
      ) : (
        <div className="space-y-8">
          {grouped.map(cat => (
            <div key={cat.name}>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">{cat.name}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {cat.themes.map(t => {
                  const cc = CAT_COLORS[getCategoryKey(t.name)] || CAT_COLORS["Lainnya"];
                  const initials = getInitials(t.name);
                  return (
                    <button
                      key={t.name}
                      onClick={() => handleOpenSend(t)}
                      className={`group text-left p-3 rounded-xl border bg-white hover:shadow-md hover:-translate-y-0.5 transition-all ${cc.ring} hover:border-current border-gray-100`}
                    >
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cc.from} ${cc.to} flex items-center justify-center mb-2 shadow-sm`}>
                        <span className="text-white text-xs font-bold tracking-wider uppercase">{initials}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{t.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge className={`text-[10px] px-1.5 py-0 ${cc.light} ${cc.text}`}>{t.total} soal</Badge>
                        {t.kelas.length > 0 && (
                          <span className="text-[10px] text-gray-400">Kls {t.kelas.sort((a,b) => Number(a)-Number(b)).join(",")}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Latihan Saya */}
      <div className="pt-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Latihan Saya</h2>
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
      </div>

      {/* Send Modal */}
      <Modal isOpen={!!selectedTheme} onClose={() => setSelectedTheme(null)} title="Kirim Latihan ke Kelas" className="max-w-md">
        {selectedTheme && (() => {
          const catKey = getCategoryKey(selectedTheme.name);
          const cc = CAT_COLORS[catKey] || CAT_COLORS["Lainnya"];
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

            <div>
              <label className="block text-sm font-medium mb-1">Kelas *</label>
              <select
                value={sendKelas}
                onChange={e => setSendKelas(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
              >
                <option value="">Pilih kelas</option>
                {KELAS.filter(k => selectedTheme.kelas.includes(k) || selectedTheme.kelas.length === 0).map(k => (
                  <option key={k} value={k}>Kelas {k}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Jumlah Soal (5-30)</label>
              <input
                type="number" min={5} max={30}
                value={sendJumlah}
                onChange={e => setSendJumlah(Math.min(30, Math.max(5, parseInt(e.target.value) || 5)))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tingkat Kesulitan (opsional)</label>
              <select
                value={sendDifficulty}
                onChange={e => setSendDifficulty(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm bg-white"
              >
                <option value="">Semua</option>
                <option value="MUDAH">Mudah</option>
                <option value="SEDANG">Sedang</option>
                <option value="SULIT">Sulit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Kirim ke Kelas</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {groups.map(g => {
                  const sel = selectedGroups.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => toggleGroup(g.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                        sel ? "border-emerald-500 bg-emerald-50" : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        sel ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                      }`}>
                        {sel && <Check size={12} className="text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{g.name}</p>
                        <p className="text-xs text-gray-400">{g._count?.members || 0} murid</p>
                      </div>
                    </button>
                  );
                })}
                {groups.length === 0 && (
                  <p className="text-sm text-gray-400 italic">Belum ada kelas. Buat kelas di menu KelasKu.</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setSelectedTheme(null)} className="flex-1">Batal</Button>
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={previewLoading || !sendKelas}
                className="flex-1"
              >
                {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen size={16} className="mr-1" />}
                Lihat Soal
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !sendKelas || selectedGroups.length === 0}
                className="flex-1 bg-emerald-600"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} className="mr-1" />}
                {sending ? "Mengirim..." : `Kirim ke ${selectedGroups.length} Kelas`}
              </Button>
            </div>
          </div>);
        })()}
      </Modal>

      {/* Preview Modal */}
      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title="Lihat Soal" className="max-w-2xl">
        {preview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                {preview.tema} · Kelas {preview.kelas}
              </p>
              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">
                {preview.soal.length} soal dari {preview.totalAvailable} tersedia
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
                Tutup
              </Button>
              <Button
                onClick={() => { setPreview(null); setSelectedTheme(null); }}
                disabled={!sendKelas || selectedGroups.length === 0}
                className="flex-1 bg-emerald-600"
              >
                <Send size={16} className="mr-1" /> Kirim Sekarang
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
