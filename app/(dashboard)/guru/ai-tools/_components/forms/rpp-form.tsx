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
  { value: "Kurikulum Merdeka", label: "Kurikulum Merdeka" },
  { value: "K13", label: "K13" },
  { value: "Custom", label: "Custom" },
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
  const [curriculum, setCurriculum] = useState("Kurikulum Merdeka");
  const [topic, setTopic] = useState("");
  const [objectives, setObjectives] = useState<string[]>([""]);
  const [duration, setDuration] = useState("2 JP x 45 menit");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAddObjective = () => setObjectives([...objectives, ""]);
  const handleRemoveObjective = (i: number) => {
    if (objectives.length > 1) setObjectives(objectives.filter((_, idx) => idx !== i));
  };
  const handleObjectiveChange = (i: number, v: string) => {
    const next = [...objectives]; next[i] = v; setObjectives(next);
  };

  const handleSubmit = () => {
    const filteredObjectives = objectives.filter((o) => o.trim().length > 0);
    if (!topic.trim() || filteredObjectives.length === 0) return;
    onSubmit({
      subject: subject.trim(),
      grade,
      curriculum,
      topic: topic.trim(),
      learningObjectives: filteredObjectives,
      duration,
      meetingCount: 1,
      languageStyle: "praktis",
      includeWorksheet: true,
      includeRubric: true,
      includeRemedialEnrichment: true,
    });
  };

  return (
    <div className="space-y-4">
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
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> AI sedang menyusun RPP yang siap diedit...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Buat RPP</>
        )}
      </Button>
    </div>
  );
}
