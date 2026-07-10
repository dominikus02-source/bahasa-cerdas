"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Plus, X } from "lucide-react";

interface RPPFormProps {
  onSubmit: (input: Record<string, unknown>) => void;
  loading: boolean;
}

const KURIKULUM_OPTIONS = [
  { value: "Kurikulum Merdeka", label: "Kurikulum Merdeka (Modul Ajar)" },
  { value: "K13", label: "Kurikulum 2013 / K13 (RPP)" },
  { value: "Custom", label: "Custom (Modul Ajar)" },
];

const PHASE_OPTIONS = [
  { value: "A", label: "A (SD Kelas I-II)" },
  { value: "B", label: "B (SD Kelas III-IV)" },
  { value: "C", label: "C (SD Kelas V-VI)" },
  { value: "D", label: "D (SMP Kelas VII-IX)" },
  { value: "E", label: "E (SMA Kelas X)" },
  { value: "F", label: "F (SMA Kelas XI-XII)" },
];

const SEMESTER_OPTIONS = [
  { value: "1 (Ganjil)", label: "1 (Ganjil)" },
  { value: "2 (Genap)", label: "2 (Genap)" },
];

const GRADE_OPTIONS = [
  "VII", "VIII", "IX", "X", "XI", "XII",
];

const LANGUAGE_STYLE_OPTIONS = [
  { value: "formal", label: "Formal" },
  { value: "praktis", label: "Praktis" },
  { value: "ringkas", label: "Ringkas" },
  { value: "lengkap", label: "Lengkap" },
];

const MODEL_OPTIONS = [
  "PBL", "Discovery Learning", "Inquiry", "Project Based Learning",
  "Cooperative Learning", "Contextual Teaching and Learning", "Saintifik",
];

export function RPPForm({ onSubmit, loading }: RPPFormProps) {
  const [subject, setSubject] = useState("Bahasa Indonesia");
  const [grade, setGrade] = useState("X");
  const [phase, setPhase] = useState("E");
  const [semester, setSemester] = useState("1 (Ganjil)");
  const [curriculum, setCurriculum] = useState("Kurikulum Merdeka");
  const [topic, setTopic] = useState("");
  const [objectives, setObjectives] = useState<string[]>([""]);
  const [promptingQuestions, setPromptingQuestions] = useState<string[]>([""]);
  const [meaningfulUnderstanding, setMeaningfulUnderstanding] = useState("");
  const [pancasilaValues, setPancasilaValues] = useState<string[]>([]);
  const [duration, setDuration] = useState("2 JP x 45 menit");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [nipGuru, setNipGuru] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [principalNip, setPrincipalNip] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [cityDate, setCityDate] = useState("");

  const PANCASILA_OPTIONS = [
    "Beriman, bertakwa kepada Tuhan YME, dan berakhlak mulia",
    "Berkebinekaan global",
    "Bergotong royong",
    "Kreatif",
    "Bernalar kritis",
    "Mandiri",
  ];

  const handleAddObjective = () => setObjectives([...objectives, ""]);
  const handleRemoveObjective = (i: number) => {
    if (objectives.length > 1) setObjectives(objectives.filter((_, idx) => idx !== i));
  };
  const handleObjectiveChange = (i: number, v: string) => {
    const next = [...objectives]; next[i] = v; setObjectives(next);
  };

  const handleAddQuestion = () => setPromptingQuestions([...promptingQuestions, ""]);
  const handleRemoveQuestion = (i: number) => {
    if (promptingQuestions.length > 1) setPromptingQuestions(promptingQuestions.filter((_, idx) => idx !== i));
  };
  const handleQuestionChange = (i: number, v: string) => {
    const next = [...promptingQuestions]; next[i] = v; setPromptingQuestions(next);
  };

  const togglePancasila = (value: string) => {
    setPancasilaValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = () => {
    const filteredObjectives = objectives.filter((o) => o.trim().length > 0);
    const filteredQuestions = promptingQuestions.filter((q) => q.trim().length > 0);
    if (!topic.trim() || filteredObjectives.length === 0) return;
    onSubmit({
      subject: subject.trim(),
      grade,
      phase: phase.trim() || undefined,
      semester: semester.trim() || undefined,
      curriculum,
      topic: topic.trim(),
      learningObjectives: filteredObjectives,
      promptingQuestions: filteredQuestions.length > 0 ? filteredQuestions : undefined,
      meaningfulUnderstanding: meaningfulUnderstanding.trim() || undefined,
      pancasilaProfile: pancasilaValues.length > 0 ? pancasilaValues : undefined,
      duration,
      meetingCount: 1,
      languageStyle: "praktis",
      includeWorksheet: true,
      includeRubric: true,
      includeRemedialEnrichment: true,
      teacherName: teacherName.trim() || undefined,
      nipGuru: nipGuru.trim() || undefined,
      schoolName: schoolName.trim() || undefined,
      principalName: principalName.trim() || undefined,
      principalNip: principalNip.trim() || undefined,
      academicYear: academicYear.trim() || undefined,
      cityDate: cityDate.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* Identitas Dokumen */}
      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
        <p className="text-xs font-semibold text-emerald-700 mb-2">Identitas Dokumen</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nama Guru</label>
            <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Cth: Siti Nurhaliza, S.Pd."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">NIP Guru</label>
            <input type="text" value={nipGuru} onChange={(e) => setNipGuru(e.target.value)}
              placeholder="Cth: 198507162010012001"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nama Sekolah</label>
            <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Cth: SMPN 1 Jakarta"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Kepala Sekolah</label>
            <input type="text" value={principalName} onChange={(e) => setPrincipalName(e.target.value)}
              placeholder="Cth: Drs. Ahmad Fauzi, M.Pd."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">NIP Kepala Sekolah</label>
            <input type="text" value={principalNip} onChange={(e) => setPrincipalNip(e.target.value)}
              placeholder="Cth: 197003152005011002"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Kota, Tanggal</label>
            <input type="text" value={cityDate} onChange={(e) => setCityDate(e.target.value)}
              placeholder="Cth: Jakarta, 1 Juli 2025"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tahun Ajaran</label>
            <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="Cth: 2025/2026"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fase</label>
            <select value={phase} onChange={(e) => setPhase(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none bg-white">
              {PHASE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
          <select value={semester} onChange={(e) => setSemester(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none bg-white">
            {SEMESTER_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mata Pelajaran</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kelas</label>
          <select value={grade} onChange={(e) => setGrade(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none bg-white">
            {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Kurikulum</label>
          <select value={curriculum} onChange={(e) => setCurriculum(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none bg-white">
            {KURIKULUM_OPTIONS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
          <p className="mt-1 text-[11px] text-gray-400">
            {curriculum === "K13"
              ? "Menghasilkan RPP (KI/KD, IPK, saintifik 5M, penilaian sikap-pengetahuan-keterampilan)."
              : "Menghasilkan Modul Ajar (CP/TP, Profil Pelajar Pancasila, pemahaman bermakna, pertanyaan pemantik)."}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Durasi</label>
          <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Topik</label>
        <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
          placeholder="Contoh: Teks Negosiasi"
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-600">Tujuan Pembelajaran</label>
          <button type="button" onClick={handleAddObjective}
            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5">
            <Plus className="w-3 h-3" /> Tambah
          </button>
        </div>
        <div className="space-y-2">
          {objectives.map((obj, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="text"
                value={obj}
                onChange={(e) => handleObjectiveChange(i, e.target.value)}
                placeholder={`Tujuan ${i + 1}`}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
              {objectives.length > 1 && (
                <button onClick={() => handleRemoveObjective(i)} className="text-gray-400 hover:text-red-500 p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {curriculum === "Kurikulum Merdeka" && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Pertanyaan Pemantik (opsional)</label>
          <div className="space-y-2">
            {promptingQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text"
                  value={q}
                  onChange={(e) => handleQuestionChange(i, e.target.value)}
                  placeholder={`Pertanyaan ${i + 1}`}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none" />
                {promptingQuestions.length > 1 && (
                  <button onClick={() => handleRemoveQuestion(i)} className="text-gray-400 hover:text-red-500 p-1">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={handleAddQuestion}
              className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5">
              <Plus className="w-3 h-3" /> Tambah pertanyaan
            </button>
          </div>
        </div>
      )}

      {curriculum === "Kurikulum Merdeka" && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Pemahaman Bermakna (opsional)</label>
          <textarea
            value={meaningfulUnderstanding}
            onChange={(e) => setMeaningfulUnderstanding(e.target.value)}
            placeholder="Contoh: Siswa memahami bahwa negosiasi adalah keterampilan hidup yang membantu mencapai kesepakatan tanpa konflik"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none resize-none"
            rows={2}
          />
        </div>
      )}

      {curriculum === "Kurikulum Merdeka" && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Profil Pelajar Pancasila (opsional)</label>
          <div className="flex flex-wrap gap-2">
            {PANCASILA_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => togglePancasila(v)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  pancasilaValues.includes(v)
                    ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {pancasilaValues.includes(v) && "✓ "}
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
      >
        {showAdvanced ? "Sembunyikan" : "Tampilkan"} opsi lanjutan
      </button>

      {showAdvanced && (
        <div className="p-3 bg-gray-50 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Model Pembelajaran</label>
              <select value={""} onChange={() => {}}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none bg-white text-gray-400">
                <option value="">Pilih model</option>
                {MODEL_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Gaya Bahasa</label>
              <select value={"praktis"}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 outline-none bg-white">
                {LANGUAGE_STYLE_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
            Sertakan LKPD
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
            Sertakan rubrik
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
            Sertakan remedial & pengayaan
          </label>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={loading || !topic.trim() || objectives.filter((o) => o.trim()).length === 0}
        className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI sedang menyusun {curriculum === "K13" ? "RPP" : "Modul Ajar"} yang siap diedit...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Buat {curriculum === "K13" ? "RPP" : "Modul Ajar"}</>
        )}
      </Button>
    </div>
  );
}
