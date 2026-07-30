"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Search, Send, Users, BookOpen, GraduationCap, X, Check, ChevronDown
} from "lucide-react";

const KELAS = ["1","2","3","4","5","6","7","8","9","10","11","12"];

const THEME_EMOJI: Record<string, string> = {
  "SPOK": "🔤", "Kalimat Efektif": "✏️", "Cerpen": "📖", "Puisi": "📝",
  "Pantun": "🎵", "Teks Deskripsi": "🏔️", "Teks Prosedur": "📋",
  "Teks Eksplanasi": "🔬", "Teks Persuasi": "💬", "Teks Argumentasi": "⚖️",
  "Teks Eksposisi": "📰", "Teks Berita": "📺", "Fabel": "🦊", "Legenda": "🏯",
  "Hikayat": "👑", "Drama": "🎭", "Surat Dinas": "📄", "Surat Pribadi": "💌",
  "Iklan": "📢", "Poster": "🖼️", "Resensi": "📚", "Novel": "📕", "Majas": "🎨",
  "EYD/PUEBI": "✅", "Imbuhan": "🔗", "Sinonim": "🔄", "Antonim": "⚡",
  "Paragraf": "📑", "Ide Pokok": "💡", "Makna Kata": "📖",
  "Kalimat": "📝", "Gagasan Utama": "🎯", "Simpulan": "🔍",
  "Kata Baku": "📗", "Kata Tidak Baku": "📕", "Tanda Baca": "❗",
  "Ejaan": "✍️", "Syair": "🎶", "Gurindam": "🎼", "Anekdot": "😄",
  "Artikel": "📰", "Editorial": "🗞️", "Cerita Inspiratif": "🌟",
  "Mitos": "🏛️", "Teks Narasi": "📖", "Teks Ulasan": "📋",
  "Proposal": "📑", "Pidato": "🎤", "Slogan": "🏷️",
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

export default function BankSoalPage() {
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
                {cat.themes.map(t => (
                  <button
                    key={t.name}
                    onClick={() => handleOpenSend(t)}
                    className="group text-left p-3 rounded-xl border border-gray-100 bg-white hover:border-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <div className="text-2xl mb-1.5">{THEME_EMOJI[t.name] || "📚"}</div>
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{t.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700">{t.total} soal</Badge>
                      {t.kelas.length > 0 && (
                        <span className="text-[10px] text-gray-400">Kls {t.kelas.sort((a,b) => Number(a)-Number(b)).join(",")}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send Modal */}
      <Modal isOpen={!!selectedTheme} onClose={() => setSelectedTheme(null)} title="Kirim Latihan ke Kelas" className="max-w-md">
        {selectedTheme && (
          <div className="space-y-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl text-white">
              <span className="text-2xl">{THEME_EMOJI[selectedTheme.name] || "📚"}</span>
              <p className="text-sm font-bold mt-1">{selectedTheme.name}</p>
              <p className="text-[10px] opacity-80">{selectedTheme.total} soal tersedia</p>
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
                onClick={handleSend}
                disabled={sending || !sendKelas || selectedGroups.length === 0}
                className="flex-1 bg-emerald-600"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} className="mr-1" />}
                {sending ? "Mengirim..." : `Kirim ke ${selectedGroups.length} Kelas`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
