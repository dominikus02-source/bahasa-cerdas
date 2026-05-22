"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Zap, Trash2, Loader2, Eye, BookOpen, Layers, Check, Printer, Save, School, User, Calendar, Clock, FileDown } from "lucide-react";

type Tab = "generate" | "list";
type DocType = "RPP" | "MODUL";
type Curriculum = "K13" | "MERDEKA" | "MERDEKA_DL";

const KELAS = ["1","2","3","4","5","6","7","8","9","10","11","12"];
const SEMESTER = ["1 (Ganjil)", "2 (Genap)"];

const CURRICULUMS: { value: Curriculum; label: string; desc: string; color: string }[] = [
  { value: "K13", label: "Kurikulum 2013", desc: "KI, KD, Indikator, Penilaian sikap/pengetahuan/keterampilan", color: "from-blue-500 to-blue-600" },
  { value: "MERDEKA", label: "Kurikulum Merdeka", desc: "Capaian Pembelajaran, Tujuan, Profil Pelajar Pancasila", color: "from-emerald-500 to-teal-600" },
  { value: "MERDEKA_DL", label: "Kurikulum Merdeka Deep Learning", desc: "Pembelajaran mendalam, diferensiasi, proyek bermakna", color: "from-violet-500 to-purple-600" },
];

const METODE_OPTIONS = [
  { value: "Diskusi", label: "Diskusi", icon: "💬" },
  { value: "Ceramah", label: "Ceramah", icon: "🎤" },
  { value: "Pembelajaran Berbasis Proyek", label: "Berbasis Proyek", icon: "🔨" },
  { value: "Pembelajaran Berbasis Masalah", label: "Berbasis Masalah", icon: "🧩" },
  { value: "Penemuan Terbimbing", label: "Penemuan", icon: "🔍" },
  { value: "Pembelajaran Berbasis Permainan", label: "Berbasis Permainan", icon: "🎮" },
  { value: "Pembelajaran Campuran", label: "Campuran", icon: "💻" },
  { value: "Pembelajaran Kooperatif", label: "Kooperatif", icon: "🤝" },
  { value: "Pembelajaran Berbasis Penemuan", label: "Berbasis Penemuan", icon: "🔎" },
];

export default function RPPModulPage() {
  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const [docType, setDocType] = useState<DocType>("RPP");
  const [curriculum, setCurriculum] = useState<Curriculum>("MERDEKA");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [genError, setGenError] = useState("");
  const [docList, setDocList] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [schoolInfo, setSchoolInfo] = useState({
    schoolName: "",
    teacherName: "",
    nip: "",
    principalName: "",
    academicYear: "2025/2026",
  });

  const [genForm, setGenForm] = useState({
    kd1: "",
    kd2: "",
    kd3: "",
    kelas: "10",
    semester: "1 (Ganjil)",
    topik: "",
    alokasi: "2x40",
    metode1: "",
    metode2: "",
    metode3: "",
  });

  const fetchDocs = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/guru/generated-rpp?type=${docType}`);
      const data = await res.json();
      if (data.data) setDocList(data.data);
    } catch (e) {
      console.error(e);
    }
    setFetching(false);
  }, [docType]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleGenerate = async () => {
    setLoading(true);
    setGenError("");
    setGenerated(null);
    try {
      const kds = [genForm.kd1, genForm.kd2, genForm.kd3].filter(Boolean);
      const methods = [genForm.metode1, genForm.metode2, genForm.metode3].filter(Boolean);
      const res = await fetch("/api/ai/rpp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kd: kds.join(", "),
          kelas: genForm.kelas,
          topik: genForm.topik,
          alokasi: genForm.alokasi,
          metode: methods.join(", "),
          type: docType,
          curriculum,
          schoolName: schoolInfo.schoolName,
          teacherName: schoolInfo.teacherName,
          semester: genForm.semester,
        }),
      });
      const data = await res.json();
      if (data.rpp) {
        setGenerated(data.rpp);
      } else {
        setGenError(data.error || "Gagal generate. Periksa GROQ_API_KEY di .env");
      }
    } catch (e) {
      setGenError("Gagal terhubung ke server");
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!generated || !genForm.topik) return;
    setSaving(true);
    try {
      const kds = [genForm.kd1, genForm.kd2, genForm.kd3].filter(Boolean);
      const methods = [genForm.metode1, genForm.metode2, genForm.metode3].filter(Boolean);
      const res = await fetch("/api/guru/generated-rpp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: docType,
          title: generated.title || `${docType} ${genForm.topik}`,
          description: generated.description || "",
          kelas: genForm.kelas,
          semester: genForm.semester,
          tahunAjaran: schoolInfo.academicYear,
          kds,
          methods,
          curriculum,
          schoolInfo,
          content: generated,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGenerated(null);
        setActiveTab("list");
        fetchDocs();
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/guru/generated-rpp?id=${id}`, { method: "DELETE" });
      fetchDocs();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMetode = (num: 1 | 2 | 3, value: string) => {
    const key = `metode${num}` as keyof typeof genForm;
    setGenForm({ ...genForm, [key]: genForm[key] === value ? "" : value });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "generate", label: `Generate AI`, icon: <Zap className="h-4 w-4" /> },
    { id: "list", label: `Daftar ${docType} (${docList.length})`, icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">RPP & Modul Ajar</h1>
        <p className="mt-1 text-sm text-gray-600">Generate dengan AI, langsung siap print</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Generate AI Tab */}
      {activeTab === "generate" && (
        <div className="max-w-3xl space-y-6">
          {/* Type Selector */}
          <div className="flex gap-3">
            <button onClick={() => setDocType("RPP")} className={`flex-1 p-4 rounded-2xl border-2 transition-all text-center ${docType === "RPP" ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}>
              <BookOpen size={24} className={`mx-auto mb-2 ${docType === "RPP" ? "text-emerald-600" : "text-gray-400"}`} />
              <p className={`font-bold ${docType === "RPP" ? "text-emerald-700" : "text-gray-700"}`}>RPP</p>
              <p className="text-xs text-gray-500">Rencana Pelaksanaan Pembelajaran</p>
            </button>
            <button onClick={() => setDocType("MODUL")} className={`flex-1 p-4 rounded-2xl border-2 transition-all text-center ${docType === "MODUL" ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"}`}>
              <Layers size={24} className={`mx-auto mb-2 ${docType === "MODUL" ? "text-blue-600" : "text-gray-400"}`} />
              <p className={`font-bold ${docType === "MODUL" ? "text-blue-700" : "text-gray-700"}`}>Modul Ajar</p>
              <p className="text-xs text-gray-500">Modul Pembelajaran Lengkap</p>
            </button>
          </div>

          {/* Curriculum Selector */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><School size={18} className="text-emerald-600" /> Kurikulum</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CURRICULUMS.map((c) => (
                <button key={c.value} onClick={() => setCurriculum(c.value)} className={`p-3 rounded-xl border-2 text-left transition-all ${curriculum === c.value ? `border-emerald-500 bg-emerald-50` : "border-gray-200 hover:border-gray-300"}`}>
                  <p className={`font-bold text-sm ${curriculum === c.value ? "text-emerald-700" : "text-gray-900"}`}>{c.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{c.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          {/* School Info */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><School size={18} className="text-blue-600" /> Informasi Sekolah & Guru</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Nama Sekolah</label>
                <input value={schoolInfo.schoolName} onChange={(e) => setSchoolInfo({ ...schoolInfo, schoolName: e.target.value })} className="w-full rounded-lg border px-4 py-2" placeholder="SMA Negeri 1 Jakarta" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nama Guru</label>
                <input value={schoolInfo.teacherName} onChange={(e) => setSchoolInfo({ ...schoolInfo, teacherName: e.target.value })} className="w-full rounded-lg border px-4 py-2" placeholder="Drs. Budi Santoso, M.Pd." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">NIP</label>
                <input value={schoolInfo.nip} onChange={(e) => setSchoolInfo({ ...schoolInfo, nip: e.target.value })} className="w-full rounded-lg border px-4 py-2" placeholder="19850101 201001 1 001" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nama Kepala Sekolah</label>
                <input value={schoolInfo.principalName} onChange={(e) => setSchoolInfo({ ...schoolInfo, principalName: e.target.value })} className="w-full rounded-lg border px-4 py-2" placeholder="Dr. Ahmad Fauzi, M.Pd." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tahun Pelajaran</label>
                <input value={schoolInfo.academicYear} onChange={(e) => setSchoolInfo({ ...schoolInfo, academicYear: e.target.value })} className="w-full rounded-lg border px-4 py-2" placeholder="2025/2026" />
              </div>
            </div>
          </Card>

          {/* Generate Form */}
          <Card className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" /> Detail Pembelajaran
            </h2>
            <div className="space-y-5">
              {/* Kelas, Semester, Mapel */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Kelas</label>
                  <select value={genForm.kelas} onChange={(e) => setGenForm({ ...genForm, kelas: e.target.value })} className="w-full rounded-lg border px-4 py-2">
                    {KELAS.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Semester</label>
                  <select value={genForm.semester} onChange={(e) => setGenForm({ ...genForm, semester: e.target.value })} className="w-full rounded-lg border px-4 py-2">
                    {SEMESTER.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mata Pelajaran</label>
                  <input value="Bahasa Indonesia" disabled className="w-full rounded-lg border px-4 py-2 bg-gray-50 text-gray-600" />
                </div>
              </div>

              {/* KD (3) */}
              <div>
                <label className="block text-sm font-medium mb-2">KD / Kompetensi Dasar (isi sendiri)</label>
                <div className="space-y-2">
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400 w-8">KD {num}</span>
                      <input value={genForm[`kd${num}` as keyof typeof genForm] as string} onChange={(e) => setGenForm({ ...genForm, [`kd${num}`]: e.target.value })} className="flex-1 rounded-lg border px-4 py-2 text-sm" placeholder={`Contoh: 3.${num} Menganalisis teks...`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Metode (3) */}
              <div>
                <label className="block text-sm font-medium mb-2">Metode Pembelajaran (pilih sampai 3)</label>
                <div className="grid grid-cols-3 gap-2">
                  {METODE_OPTIONS.map((m) => {
                    const isSelected = genForm.metode1 === m.value || genForm.metode2 === m.value || genForm.metode3 === m.value;
                    return (
                      <button key={m.value} onClick={() => {
                        if (!genForm.metode1) toggleMetode(1, m.value);
                        else if (!genForm.metode2) toggleMetode(2, m.value);
                        else if (!genForm.metode3) toggleMetode(3, m.value);
                        else toggleMetode(1, m.value);
                      }} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-sm transition-all ${isSelected ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 hover:border-gray-300"}`}>
                        <span>{m.icon}</span>
                        <span className="font-medium">{m.label}</span>
                        {isSelected && <Check size={14} className="ml-auto text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Alokasi & Topik */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Alokasi Waktu</label>
                  <input value={genForm.alokasi} onChange={(e) => setGenForm({ ...genForm, alokasi: e.target.value })} className="w-full rounded-lg border px-4 py-2" placeholder="2x40 menit" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Topik / Materi</label>
                <textarea value={genForm.topik} onChange={(e) => setGenForm({ ...genForm, topik: e.target.value })} className="w-full rounded-lg border px-4 py-2" rows={2} placeholder="Teks Negosiasi" />
              </div>

              <Button onClick={handleGenerate} disabled={loading} className="w-full">
                <Zap className="h-4 w-4" /> {loading ? "Generating..." : `Generate ${docType} dengan AI`}
              </Button>
              {genError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {genError}
                </div>
              )}
            </div>
          </Card>

          {/* Generated Result */}
          {generated && (
            <Card className="p-0 overflow-hidden border-2 border-emerald-200">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-white/20 text-white border-0">{curriculum === "K13" ? "RPP K13" : curriculum === "MERDEKA_DL" ? "Modul Deep Learning" : "Modul Ajar"} Generated</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setPreviewDoc(generated)}>
                      <Eye className="h-4 w-4" /> Preview
                    </Button>
                    <Button size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Saving..." : "Simpan"}
                    </Button>
                  </div>
                </div>
                <h3 className="text-xl font-bold">{generated.title || `${docType} ${genForm.topik}`}</h3>
                <p className="text-white/70 text-sm mt-1">Kelas {genForm.kelas} • {genForm.semester} • Bahasa Indonesia</p>
              </div>
              <div className="p-6 space-y-3 bg-white">
                {curriculum === "K13" ? (
                  <>
                    {(generated.ki1 || generated.ki3) && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Kompetensi Inti</p><p className="text-sm text-gray-800">KI-3: {generated.ki3 || "-"}{generated.ki4 ? <><br />KI-4: {generated.ki4}</> : ""}</p></div>}
                    {(generated.kdPengetahuan || generated.kdKeterampilan) && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Kompetensi Dasar</p><p className="text-sm text-gray-800">{generated.kdPengetahuan || generated.kdKeterampilan}</p></div>}
                    {generated.tujuanPembelajaran && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tujuan Pembelajaran</p><ol className="text-sm text-gray-800 list-decimal list-inside space-y-1">{generated.tujuanPembelajaran.map((s: string, i: number) => (<li key={i}>{s}</li>))}</ol></div>}
                    {(generated.kegiatanPendahuluan || generated.kegiatanIntiMengamati) && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Kegiatan Pembelajaran</p><p className="text-sm text-gray-800">{generated.kegiatanPendahuluan?.length || 0} langkah pendahuluan, {generated.kegiatanIntiMengamati ? "5M lengkap" : (generated.kegiatanInti?.length || 0)} langkah inti</p></div>}
                    {(generated.penilaianSikap || generated.penilaianPengetahuan) && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Penilaian</p><p className="text-sm text-gray-800">Sikap, Pengetahuan, Keterampilan</p></div>}
                  </>
                ) : (
                  <>
                    {generated.capaianPembelajaran && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Capaian Pembelajaran</p><p className="text-sm text-gray-800">{generated.capaianPembelajaran}</p></div>}
                    {generated.tujuanPembelajaran && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tujuan Pembelajaran</p><ol className="text-sm text-gray-800 list-decimal list-inside space-y-1">{generated.tujuanPembelajaran.map((s: string, i: number) => (<li key={i}>{s}</li>))}</ol></div>}
                    {generated.tujuanPembelajaranBermakna && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tujuan Pembelajaran Bermakna</p><ol className="text-sm text-gray-800 list-decimal list-inside space-y-1">{generated.tujuanPembelajaranBermakna.map((s: string, i: number) => (<li key={i}>{s}</li>))}</ol></div>}
                    {generated.pertanyaanPemantik && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pertanyaan Pemantik</p><ol className="text-sm text-gray-800 list-decimal list-inside space-y-1">{generated.pertanyaanPemantik.map((s: string, i: number) => (<li key={i}>{s}</li>))}</ol></div>}
                    {(generated.kegiatanPendahuluan || generated.kegiatanInti || generated.aktivasiPengetahuan) && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Kegiatan Pembelajaran</p><p className="text-sm text-gray-800">{generated.aktivasiPengetahuan ? "Deep Learning (5 fase)" : `${(generated.kegiatanPendahuluan?.length || 0) + (generated.kegiatanInti?.length || 0) + (generated.kegiatanPenutup?.length || 0)} langkah`}</p></div>}
                    {(generated.asesmenDiagnostik || generated.asesmenFormatif) && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Asesmen</p><p className="text-sm text-gray-800">Diagnostik, Formatif, Sumatif</p></div>}
                  </>
                )}
                {generated.competency && !generated.capaianPembelajaran && !generated.ki1 && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Kompetensi</p><p className="text-sm text-gray-800">{generated.competency}</p></div>}
                {generated.indicators && !generated.ipkPengetahuan && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Indikator</p><p className="text-sm text-gray-800">{generated.indicators}</p></div>}
                {generated.learningSteps && !generated.kegiatanPendahuluan && !generated.kegiatanIntiMengamati && !generated.kegiatanInti && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Langkah Pembelajaran</p><ol className="text-sm text-gray-800 list-decimal list-inside space-y-1">{generated.learningSteps.map((step: string, i: number) => (<li key={i}>{step}</li>))}</ol></div>}
                {generated.assessment && !generated.penilaianSikap && !generated.asesmenDiagnostik && <div className="bg-gray-50 rounded-xl p-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Penilaian</p><p className="text-sm text-gray-800">{generated.assessment}</p></div>}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Daftar Tab */}
      {activeTab === "list" && (
        <div>
          {fetching ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
          ) : docList.length === 0 ? (
            <Card className="py-16 text-center">
              <FileText className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 font-semibold">Belum ada {docType}</h3>
              <p className="mt-2 text-sm text-gray-500">Generate dengan AI</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {docList.map((doc) => (
                <Card key={doc.id} className="p-5 hover:shadow-md transition-shadow border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={doc.type === "MODUL" ? "default" : "secondary"}>{doc.type || docType}</Badge>
                        <Badge>Kelas {doc.kelas}</Badge>
                        {doc.curriculum && <Badge variant="outline">{doc.curriculum}</Badge>}
                        {doc.isPublished && <Badge variant="success">Published</Badge>}
                      </div>
                      <h3 className="font-semibold text-gray-900">{doc.title}</h3>
                      {doc.description && <p className="text-sm text-gray-500 mt-1">{doc.description}</p>}
                      {doc.schoolInfo?.schoolName && <p className="text-xs text-gray-400 mt-1">{doc.schoolInfo.schoolName}</p>}
                      {doc.kds && doc.kds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {doc.kds.map((kd: string, i: number) => (<span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{kd}</span>))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">{new Date(doc.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => setPreviewDoc(doc.content || doc)}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(doc.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">{previewDoc.title || "Preview"}</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => window.print()}><Printer size={14} className="mr-1" /> Print</Button>
                <Button size="sm" variant="outline" onClick={() => setPreviewDoc(null)}>Tutup</Button>
              </div>
            </div>

            <div className="p-8">
              <PrintContent previewDoc={previewDoc} schoolInfo={schoolInfo} docType={docType} genForm={genForm} />
            </div>
          </div>
        </div>
      )}

      {/* Hidden print-only container */}
      {previewDoc && (
        <div id="print-container" className="hidden">
          <PrintContent previewDoc={previewDoc} schoolInfo={schoolInfo} docType={docType} genForm={genForm} />
        </div>
      )}
    </div>
  );
}

function PrintContent({ previewDoc, schoolInfo, docType, genForm }: { previewDoc: any; schoolInfo: any; docType: string; genForm: any }) {
  const curriculum = previewDoc.curriculum || "MERDEKA";
  const resolvedKelas = previewDoc.kelas || genForm.kelas;
  const resolvedSemester = previewDoc.semester || genForm.semester;
  const resolvedKds = [genForm.kd1, genForm.kd2, genForm.kd3, ...(previewDoc.kds || [])].filter(Boolean);
  const resolvedMethods = [genForm.metode1, genForm.metode2, genForm.metode3, ...(previewDoc.methods || [])].filter(Boolean);
  const resolvedSchoolName = schoolInfo.schoolName || previewDoc.schoolInfo?.schoolName || "NAMA SEKOLAH";
  const resolvedTeacherName = schoolInfo.teacherName || previewDoc.schoolInfo?.teacherName || "...........................";
  const resolvedNip = schoolInfo.nip || previewDoc.schoolInfo?.nip || "...........................";
  const resolvedPrincipalName = schoolInfo.principalName || previewDoc.schoolInfo?.principalName || "...........................";
  const resolvedTahunAjaran = previewDoc.tahunAjaran || schoolInfo.academicYear;
  const resolvedAlokasi = genForm.alokasi || previewDoc.alokasi || "2x40";

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">{children}</h3>
  );

  const SectionContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`mb-5 print-break-inside-avoid ${className}`}>{children}</div>
  );

  const ListItems = ({ items, ordered = false }: { items: string[] | string; ordered?: boolean }) => {
    if (typeof items === "string") return <p className="text-sm text-gray-700 leading-relaxed">{items}</p>;
    if (ordered) return <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">{items.map((item, i) => (<li key={i}>{item}</li>))}</ol>;
    return <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">{items.map((item, i) => (<li key={i}>{item}</li>))}</ul>;
  };

  return (
    <div className="print-content">
      {/* Letterhead + Identity */}
      <div className="print-break-inside-avoid">
        <div className="text-center mb-6 pb-4 border-b-2 border-gray-800">
          <p className="text-sm font-bold text-gray-900 uppercase">{resolvedSchoolName}</p>
          <p className="text-xs text-gray-500">{docType === "RPP" || curriculum === "K13" ? "RENCANA PELAKSANAAN PEMBELAJARAN" : "MODUL AJAR"}</p>
          <p className="text-xs text-gray-500">Kurikulum {curriculum === "K13" ? "2013" : curriculum === "MERDEKA_DL" ? "Merdeka Deep Learning" : "Merdeka"}</p>
        </div>

        <div className="mb-6">
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="py-1 pr-4 font-medium w-40">Mata Pelajaran</td><td>: Bahasa Indonesia</td></tr>
              <tr><td className="py-1 font-medium">Kelas / Semester</td><td>: {resolvedKelas} / {resolvedSemester}</td></tr>
              <tr><td className="py-1 font-medium">Tahun Pelajaran</td><td>: {resolvedTahunAjaran}</td></tr>
              <tr><td className="py-1 font-medium">Alokasi Waktu</td><td>: {resolvedAlokasi} menit</td></tr>
              {curriculum === "K13" && resolvedKds.length > 0 && <tr><td className="py-1 font-medium align-top">Kompetensi Dasar</td><td>: {resolvedKds.join("; ")}</td></tr>}
              {resolvedMethods.length > 0 && <tr><td className="py-1 font-medium align-top">Model/Metode</td><td>: {resolvedMethods.join(", ")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* K13 RPP Content */}
      {curriculum === "K13" && (
        <>
          <SectionContent>
            <SectionTitle>Kompetensi Inti (KI)</SectionTitle>
            <div className="text-sm text-gray-700 space-y-1 mt-2">
              {previewDoc.ki1 && <p><span className="font-medium">KI-1:</span> {previewDoc.ki1}</p>}
              {previewDoc.ki2 && <p><span className="font-medium">KI-2:</span> {previewDoc.ki2}</p>}
              {previewDoc.ki3 && <p><span className="font-medium">KI-3:</span> {previewDoc.ki3}</p>}
              {previewDoc.ki4 && <p><span className="font-medium">KI-4:</span> {previewDoc.ki4}</p>}
            </div>
          </SectionContent>

          {(previewDoc.kdPengetahuan || previewDoc.kdKeterampilan) && (
            <SectionContent>
              <SectionTitle>Kompetensi Dasar</SectionTitle>
              <div className="text-sm text-gray-700 space-y-1 mt-2">
                {previewDoc.kdPengetahuan && <p><span className="font-medium">KD Pengetahuan:</span> {previewDoc.kdPengetahuan}</p>}
                {previewDoc.kdKeterampilan && <p><span className="font-medium">KD Keterampilan:</span> {previewDoc.kdKeterampilan}</p>}
              </div>
            </SectionContent>
          )}

          {(previewDoc.ipkPengetahuan || previewDoc.ipkKeterampilan) && (
            <SectionContent>
              <SectionTitle>Indikator Pencapaian Kompetensi (IPK)</SectionTitle>
              <div className="text-sm text-gray-700 space-y-2 mt-2">
                {previewDoc.ipkPengetahuan && <div><p className="font-medium">IPK Pengetahuan:</p><ListItems items={previewDoc.ipkPengetahuan} /></div>}
                {previewDoc.ipkKeterampilan && <div><p className="font-medium">IPK Keterampilan:</p><ListItems items={previewDoc.ipkKeterampilan} /></div>}
              </div>
            </SectionContent>
          )}

          {previewDoc.tujuanPembelajaran && (
            <SectionContent>
              <SectionTitle>Tujuan Pembelajaran</SectionTitle>
              <ListItems items={previewDoc.tujuanPembelajaran} ordered />
            </SectionContent>
          )}

          {previewDoc.materiPokok && (
            <SectionContent>
              <SectionTitle>Materi Pembelajaran</SectionTitle>
              <p className="text-sm font-medium text-gray-800">{previewDoc.materiPokok}</p>
              {previewDoc.uraianMateri && <p className="text-sm text-gray-700 leading-relaxed mt-1">{previewDoc.uraianMateri}</p>}
            </SectionContent>
          )}

          {(previewDoc.kegiatanPendahuluan || previewDoc.kegiatanIntiMengamati) && (
            <SectionContent>
              <SectionTitle>Kegiatan Pembelajaran</SectionTitle>
              <div className="text-sm text-gray-700 space-y-3 mt-2">
                {previewDoc.kegiatanPendahuluan && (
                  <div>
                    <p className="font-semibold text-gray-800">a. Pendahuluan (10-15 menit)</p>
                    <ListItems items={previewDoc.kegiatanPendahuluan} ordered />
                  </div>
                )}
                {(previewDoc.kegiatanIntiMengamati || previewDoc.kegiatanInti) && (
                  <div>
                    <p className="font-semibold text-gray-800">b. Kegiatan Inti — Pendekatan Saintifik (5M)</p>
                    {previewDoc.kegiatanIntiMengamati && <p className="mt-1"><span className="font-medium">Mengamati:</span> {previewDoc.kegiatanIntiMengamati}</p>}
                    {previewDoc.kegiatanIntiMenanya && <p><span className="font-medium">Menanya:</span> {previewDoc.kegiatanIntiMenanya}</p>}
                    {previewDoc.kegiatanIntiMengumpulkan && <p><span className="font-medium">Mengumpulkan Informasi:</span> {previewDoc.kegiatanIntiMengumpulkan}</p>}
                    {previewDoc.kegiatanIntiMengasosiasi && <p><span className="font-medium">Mengasosiasi:</span> {previewDoc.kegiatanIntiMengasosiasi}</p>}
                    {previewDoc.kegiatanIntiMengomunikasikan && <p><span className="font-medium">Mengomunikasikan:</span> {previewDoc.kegiatanIntiMengomunikasikan}</p>}
                    {previewDoc.kegiatanInti && !previewDoc.kegiatanIntiMengamati && <ListItems items={previewDoc.kegiatanInti} ordered />}
                  </div>
                )}
                {previewDoc.kegiatanPenutup && (
                  <div>
                    <p className="font-semibold text-gray-800">c. Penutup (10-15 menit)</p>
                    <ListItems items={previewDoc.kegiatanPenutup} ordered />
                  </div>
                )}
              </div>
            </SectionContent>
          )}

          {(previewDoc.penilaianSikap || previewDoc.penilaianPengetahuan || previewDoc.penilaianKeterampilan) && (
            <SectionContent>
              <SectionTitle>Penilaian</SectionTitle>
              <div className="text-sm text-gray-700 space-y-2 mt-2">
                {previewDoc.penilaianSikap && <p><span className="font-medium">a. Penilaian Sikap:</span> {previewDoc.penilaianSikap}</p>}
                {previewDoc.penilaianPengetahuan && <p><span className="font-medium">b. Penilaian Pengetahuan:</span> {previewDoc.penilaianPengetahuan}</p>}
                {previewDoc.penilaianKeterampilan && <p><span className="font-medium">c. Penilaian Keterampilan:</span> {previewDoc.penilaianKeterampilan}</p>}
              </div>
            </SectionContent>
          )}

          {(previewDoc.media || previewDoc.alat || previewDoc.sumberBelajar) && (
            <SectionContent>
              <SectionTitle>Media, Alat, dan Sumber Belajar</SectionTitle>
              <div className="text-sm text-gray-700 space-y-1 mt-2">
                {previewDoc.media && <p><span className="font-medium">Media:</span> {previewDoc.media}</p>}
                {previewDoc.alat && <p><span className="font-medium">Alat:</span> {previewDoc.alat}</p>}
                {previewDoc.sumberBelajar && <p><span className="font-medium">Sumber Belajar:</span> {previewDoc.sumberBelajar}</p>}
              </div>
            </SectionContent>
          )}
        </>
      )}

      {/* Kurikulum Merdeka Content */}
      {curriculum === "MERDEKA" && (
        <>
          <SectionContent>
            <SectionTitle>Informasi Umum</SectionTitle>
            <div className="text-sm text-gray-700 space-y-1 mt-2">
              {previewDoc.fase && <p><span className="font-medium">Fase:</span> {previewDoc.fase}</p>}
              {previewDoc.kompetensiAwal && <p><span className="font-medium">Kompetensi Awal:</span> {previewDoc.kompetensiAwal}</p>}
              {previewDoc.profilPelajarPancasila && (
                <div><p className="font-medium">Profil Pelajar Pancasila:</p><ListItems items={previewDoc.profilPelajarPancasila} /></div>
              )}
              {previewDoc.saranaPrasarana && <p><span className="font-medium">Sarana & Prasarana:</span> {previewDoc.saranaPrasarana}</p>}
              {previewDoc.targetPesertaDidik && <p><span className="font-medium">Target Peserta Didik:</span> {previewDoc.targetPesertaDidik}</p>}
              {previewDoc.modelPembelajaran && <p><span className="font-medium">Model Pembelajaran:</span> {previewDoc.modelPembelajaran}</p>}
            </div>
          </SectionContent>

          {previewDoc.capaianPembelajaran && (
            <SectionContent>
              <SectionTitle>Capaian Pembelajaran</SectionTitle>
              <p className="text-sm text-gray-700 leading-relaxed">{previewDoc.capaianPembelajaran}</p>
            </SectionContent>
          )}

          {previewDoc.tujuanPembelajaran && (
            <SectionContent>
              <SectionTitle>Tujuan Pembelajaran</SectionTitle>
              <ListItems items={previewDoc.tujuanPembelajaran} ordered />
            </SectionContent>
          )}

          {previewDoc.pemahamanBermakna && (
            <SectionContent>
              <SectionTitle>Pemahaman Bermakna</SectionTitle>
              <p className="text-sm text-gray-700 leading-relaxed">{previewDoc.pemahamanBermakna}</p>
            </SectionContent>
          )}

          {previewDoc.pertanyaanPemantik && (
            <SectionContent>
              <SectionTitle>Pertanyaan Pemantik</SectionTitle>
              <ListItems items={previewDoc.pertanyaanPemantik} ordered />
            </SectionContent>
          )}

          {(previewDoc.kegiatanPendahuluan || previewDoc.kegiatanInti) && (
            <SectionContent>
              <SectionTitle>Kegiatan Pembelajaran</SectionTitle>
              <div className="text-sm text-gray-700 space-y-3 mt-2">
                {previewDoc.kegiatanPendahuluan && (
                  <div><p className="font-semibold text-gray-800">a. Pendahuluan (10-15 menit)</p><ListItems items={previewDoc.kegiatanPendahuluan} ordered /></div>
                )}
                {previewDoc.kegiatanInti && (
                  <div><p className="font-semibold text-gray-800">b. Kegiatan Inti</p><ListItems items={previewDoc.kegiatanInti} ordered /></div>
                )}
                {previewDoc.kegiatanPenutup && (
                  <div><p className="font-semibold text-gray-800">c. Penutup (10-15 menit)</p><ListItems items={previewDoc.kegiatanPenutup} ordered /></div>
                )}
              </div>
            </SectionContent>
          )}

          {(previewDoc.asesmenDiagnostik || previewDoc.asesmenFormatif || previewDoc.asesmenSumatif) && (
            <SectionContent>
              <SectionTitle>Asesmen</SectionTitle>
              <div className="text-sm text-gray-700 space-y-2 mt-2">
                {previewDoc.asesmenDiagnostik && <p><span className="font-medium">a. Diagnostik:</span> {previewDoc.asesmenDiagnostik}</p>}
                {previewDoc.asesmenFormatif && <p><span className="font-medium">b. Formatif:</span> {previewDoc.asesmenFormatif}</p>}
                {previewDoc.asesmenSumatif && <p><span className="font-medium">c. Sumatif:</span> {previewDoc.asesmenSumatif}</p>}
              </div>
            </SectionContent>
          )}

          {previewDoc.lkpd && (
            <SectionContent>
              <SectionTitle>Lembar Kerja Peserta Didik (LKPD)</SectionTitle>
              <p className="text-sm text-gray-700 leading-relaxed">{previewDoc.lkpd}</p>
            </SectionContent>
          )}

          {previewDoc.pengayaanRemedial && (
            <SectionContent>
              <SectionTitle>Pengayaan dan Remedial</SectionTitle>
              <p className="text-sm text-gray-700 leading-relaxed">{previewDoc.pengayaanRemedial}</p>
            </SectionContent>
          )}

          {previewDoc.bahanBacaan && (
            <SectionContent>
              <SectionTitle>Bahan Bacaan</SectionTitle>
              <p className="text-sm text-gray-700 leading-relaxed">{previewDoc.bahanBacaan}</p>
            </SectionContent>
          )}

          {previewDoc.glosarium && typeof previewDoc.glosarium === "object" && (
            <SectionContent>
              <SectionTitle>Glosarium</SectionTitle>
              <div className="text-sm text-gray-700 space-y-1 mt-2">
                {Object.entries(previewDoc.glosarium).map(([term, def]) => (
                  <p key={term}><span className="font-medium">{term}:</span> {def as string}</p>
                ))}
              </div>
            </SectionContent>
          )}

          {previewDoc.daftarPustaka && (
            <SectionContent>
              <SectionTitle>Daftar Pustaka</SectionTitle>
              <p className="text-sm text-gray-700 leading-relaxed">{previewDoc.daftarPustaka}</p>
            </SectionContent>
          )}
        </>
      )}

      {/* Kurikulum Merdeka Deep Learning Content */}
      {curriculum === "MERDEKA_DL" && (
        <>
          <SectionContent>
            <SectionTitle>Informasi Umum</SectionTitle>
            <div className="text-sm text-gray-700 space-y-1 mt-2">
              {previewDoc.fase && <p><span className="font-medium">Fase:</span> {previewDoc.fase}</p>}
              {previewDoc.kompetensiAwal && <p><span className="font-medium">Kompetensi Awal:</span> {previewDoc.kompetensiAwal}</p>}
              {previewDoc.profilPelajarPancasila && (
                <div><p className="font-medium">Profil Pelajar Pancasila:</p><ListItems items={previewDoc.profilPelajarPancasila} /></div>
              )}
              {previewDoc.saranaPrasarana && <p><span className="font-medium">Sarana & Prasarana:</span> {previewDoc.saranaPrasarana}</p>}
              {previewDoc.targetPesertaDidik && <p><span className="font-medium">Target Peserta Didik:</span> {previewDoc.targetPesertaDidik}</p>}
              {previewDoc.modelPembelajaran && <p><span className="font-medium">Model Pembelajaran:</span> {previewDoc.modelPembelajaran}</p>}
            </div>
          </SectionContent>

          {previewDoc.capaianPembelajaran && (
            <SectionContent>
              <SectionTitle>Capaian Pembelajaran</SectionTitle>
              <p className="text-sm text-gray-700 leading-relaxed">{previewDoc.capaianPembelajaran}</p>
            </SectionContent>
          )}

          {previewDoc.tujuanPembelajaranBermakna && (
            <SectionContent>
              <SectionTitle>Tujuan Pembelajaran Bermakna</SectionTitle>
              <ListItems items={previewDoc.tujuanPembelajaranBermakna} ordered />
            </SectionContent>
          )}

          {previewDoc.pemahamanBermakna && (
            <SectionContent>
              <SectionTitle>Pemahaman Bermakna</SectionTitle>
              <p className="text-sm text-gray-700 leading-relaxed">{previewDoc.pemahamanBermakna}</p>
            </SectionContent>
          )}

          {previewDoc.pertanyaanPemantik && (
            <SectionContent>
              <SectionTitle>Pertanyaan Pemantik</SectionTitle>
              <ListItems items={previewDoc.pertanyaanPemantik} ordered />
            </SectionContent>
          )}

          <SectionContent>
            <SectionTitle>Kegiatan Pembelajaran Deep Learning</SectionTitle>
            <div className="text-sm text-gray-700 space-y-3 mt-2">
              {previewDoc.aktivasiPengetahuan && (
                <div><p className="font-semibold text-gray-800">a. Aktivasi Pengetahuan Awal</p><ListItems items={previewDoc.aktivasiPengetahuan} ordered /></div>
              )}
              {previewDoc.eksplorasiMendalam && (
                <div><p className="font-semibold text-gray-800">b. Eksplorasi Mendalam</p><ListItems items={previewDoc.eksplorasiMendalam} ordered /></div>
              )}
              {previewDoc.elaborasiDiferensiasi && (
                <div>
                  <p className="font-semibold text-gray-800">c. Elaborasi & Diferensiasi</p>
                  <div className="ml-4 mt-1 space-y-1">
                    {previewDoc.elaborasiDiferensiasi.diferensiasiKonten && <p><span className="font-medium">Diferensiasi Konten:</span> {previewDoc.elaborasiDiferensiasi.diferensiasiKonten}</p>}
                    {previewDoc.elaborasiDiferensiasi.diferensiasiProses && <p><span className="font-medium">Diferensiasi Proses:</span> {previewDoc.elaborasiDiferensiasi.diferensiasiProses}</p>}
                    {previewDoc.elaborasiDiferensiasi.diferensiasiProduk && <p><span className="font-medium">Diferensiasi Produk:</span> {previewDoc.elaborasiDiferensiasi.diferensiasiProduk}</p>}
                  </div>
                </div>
              )}
              {previewDoc.kreasiKolaborasi && (
                <div><p className="font-semibold text-gray-800">d. Kreasi & Kolaborasi</p><ListItems items={previewDoc.kreasiKolaborasi} ordered /></div>
              )}
              {previewDoc.refleksiMetakognitif && (
                <div><p className="font-semibold text-gray-800">e. Refleksi Metakognitif</p><ListItems items={previewDoc.refleksiMetakognitif} ordered /></div>
              )}
            </div>
          </SectionContent>

          {(previewDoc.asesmenDiagnostik || previewDoc.asesmenFormatif || previewDoc.asesmenSumatif) && (
            <SectionContent>
              <SectionTitle>Asesmen Autentik</SectionTitle>
              <div className="text-sm text-gray-700 space-y-2 mt-2">
                {previewDoc.asesmenDiagnostik && <p><span className="font-medium">a. Diagnostik:</span> {previewDoc.asesmenDiagnostik}</p>}
                {previewDoc.asesmenFormatif && <p><span className="font-medium">b. Formatif:</span> {previewDoc.asesmenFormatif}</p>}
                {previewDoc.asesmenSumatif && <p><span className="font-medium">c. Sumatif:</span> {previewDoc.asesmenSumatif}</p>}
                {previewDoc.rubrikPenilaian && <p><span className="font-medium">Rubrik:</span> {previewDoc.rubrikPenilaian}</p>}
              </div>
            </SectionContent>
          )}

          {previewDoc.lkpd && (
            <SectionContent>
              <SectionTitle>LKPD Deep Learning</SectionTitle>
              <p className="text-sm text-gray-700 leading-relaxed">{previewDoc.lkpd}</p>
            </SectionContent>
          )}

          {previewDoc.pengayaanRemedial && (
            <SectionContent>
              <SectionTitle>Pengayaan dan Remedial</SectionTitle>
              <p className="text-sm text-gray-700 leading-relaxed">{previewDoc.pengayaanRemedial}</p>
            </SectionContent>
          )}

          {previewDoc.bahanBacaan && (
            <SectionContent>
              <SectionTitle>Bahan Bacaan</SectionTitle>
              <p className="text-sm text-gray-700 leading-relaxed">{previewDoc.bahanBacaan}</p>
            </SectionContent>
          )}

          {previewDoc.glosarium && typeof previewDoc.glosarium === "object" && (
            <SectionContent>
              <SectionTitle>Glosarium</SectionTitle>
              <div className="text-sm text-gray-700 space-y-1 mt-2">
                {Object.entries(previewDoc.glosarium).map(([term, def]) => (
                  <p key={term}><span className="font-medium">{term}:</span> {def as string}</p>
                ))}
              </div>
            </SectionContent>
          )}

          {previewDoc.daftarPustaka && (
            <SectionContent>
              <SectionTitle>Daftar Pustaka</SectionTitle>
              <p className="text-sm text-gray-700 leading-relaxed">{previewDoc.daftarPustaka}</p>
            </SectionContent>
          )}
        </>
      )}

      {/* Fallback for old format */}
      {!previewDoc.ki1 && !previewDoc.capaianPembelajaran && !previewDoc.fase && (
        <>
          {previewDoc.competency && <SectionContent><SectionTitle>Kompetensi / Tujuan Pembelajaran</SectionTitle><p className="text-sm text-gray-700 leading-relaxed">{previewDoc.competency}</p></SectionContent>}
          {previewDoc.indicators && <SectionContent><SectionTitle>Indikator Pencapaian</SectionTitle><ListItems items={previewDoc.indicators} /></SectionContent>}
          {previewDoc.learningSteps && <SectionContent><SectionTitle>Langkah Pembelajaran</SectionTitle><ListItems items={previewDoc.learningSteps} ordered /></SectionContent>}
          {previewDoc.assessment && <SectionContent><SectionTitle>Penilaian</SectionTitle><p className="text-sm text-gray-700 leading-relaxed">{previewDoc.assessment}</p></SectionContent>}
          {previewDoc.differentiation && <SectionContent><SectionTitle>Diferensiasi</SectionTitle><p className="text-sm text-gray-700 leading-relaxed">{previewDoc.differentiation}</p></SectionContent>}
          {previewDoc.materials && <SectionContent><SectionTitle>Materi & Referensi</SectionTitle><p className="text-sm text-gray-700 leading-relaxed">{previewDoc.materials}</p></SectionContent>}
        </>
      )}

      {/* Last Page: Signatures */}
      <div className="mt-16 pt-6 border-t border-gray-200 print-break-inside-avoid">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <p className="text-sm text-gray-500">Mengetahui,</p>
            <p className="text-sm text-gray-500">Kepala Sekolah</p>
            <div className="h-20" />
            <p className="text-sm font-bold text-gray-900 underline">{resolvedPrincipalName}</p>
            <p className="text-xs text-gray-500">NIP. {resolvedNip}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">{resolvedTahunAjaran}</p>
            <p className="text-sm text-gray-500">Guru Mata Pelajaran</p>
            <div className="h-20" />
            <p className="text-sm font-bold text-gray-900 underline">{resolvedTeacherName}</p>
            <p className="text-xs text-gray-500">NIP. {resolvedNip}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
