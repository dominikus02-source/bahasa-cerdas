"use client";

import { useState, useEffect } from "react";
import {
  BookOpen, FileText, Presentation, File, Download,
  ExternalLink, Search, ChevronRight, Loader2, Folder,
  ArrowLeft, Eye, GraduationCap, BookMarked,
} from "lucide-react";

interface InventoryFile {
  sourceDriveFileId: string;
  sourceDriveFolderId: string;
  sourceFileName: string;
  mimeType: string;
  fileSize: string;
  modifiedTime: string;
  sourcePath: string;
  sourceUrl: string;
  detectedExtension: string;
  educationLevel: string;
  grade: string;
  parentSubjectFolder: string;
}

interface GradeGroup {
  educationLevel: string;
  grade: string;
  label: string;
  fileCount: number;
  totalSize: number;
  files: InventoryFile[];
}

type LevelTab = "SD" | "SMP" | "SMA";

const LEVEL_ICONS: Record<string, React.ReactNode> = {
  SD: <BookMarked size={20} className="text-emerald-700" />,
  SMP: <BookOpen size={20} className="text-blue-700" />,
  SMA: <GraduationCap size={20} className="text-blue-700" />,
};

function extractDriveId(url: string): { id: string; type: "doc" | "slides" | "file" } | null {
  const docMatch = url.match(/\/document\/d\/([^/]+)/);
  if (docMatch) return { id: docMatch[1], type: "doc" };
  const slideMatch = url.match(/\/presentation\/d\/([^/]+)/);
  if (slideMatch) return { id: slideMatch[1], type: "slides" };
  const fileMatch = url.match(/\/file\/d\/([^/]+)/);
  if (fileMatch) return { id: fileMatch[1], type: "file" };
  return null;
}

function previewUrl(sourceUrl: string): string {
  const info = extractDriveId(sourceUrl);
  if (!info) return sourceUrl;
  if (info.type === "doc") return `https://docs.google.com/document/d/${info.id}/preview`;
  if (info.type === "slides") return `https://docs.google.com/presentation/d/${info.id}/preview`;
  return `https://drive.google.com/file/d/${info.id}/preview`;
}

function extIcon(ext: string) {
  if (ext === ".pptx" || ext === ".ppt") return Presentation;
  if (ext === ".pdf") return FileText;
  if (ext === ".xlsx" || ext === ".xls") return File;
  return FileText;
}

function extColor(ext: string) {
  if (ext === ".pptx" || ext === ".ppt") return "text-orange-600 bg-orange-50";
  if (ext === ".pdf") return "text-red-600 bg-red-50";
  if (ext === ".xlsx" || ext === ".xls") return "text-emerald-700 bg-emerald-50";
  return "text-blue-600 bg-blue-50";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function PerangkatAjarPage() {
  const [grades, setGrades] = useState<GradeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [levelTab, setLevelTab] = useState<LevelTab>("SD");
  const [selectedGrade, setSelectedGrade] = useState<GradeGroup | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/guru/perangkat-ajar")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setGrades(d.grades || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredGrades = grades.filter(
    (g) => g.educationLevel === levelTab,
  );

  const filteredFiles = selectedGrade
    ? selectedGrade.files.filter((f) =>
        f.sourceFileName.toLowerCase().includes(search.toLowerCase()) ||
        f.parentSubjectFolder.toLowerCase().includes(search.toLowerCase()),
      )
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <Folder className="w-12 h-12 text-violet-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-blue-800">Belum ada data</h2>
          <p className="text-sm text-blue-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (selectedGrade) {
    return (
      <div className="max-w-5xl mx-auto py-6 px-4">
        <button
          onClick={() => { setSelectedGrade(null); setSearch(""); }}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke {selectedGrade.educationLevel}
        </button>

        <div className="bc-guru-card rounded-2xl p-5 flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
            {LEVEL_ICONS[selectedGrade.educationLevel]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{selectedGrade.label}</h1>
            <p className="text-sm text-slate-500">
              {selectedGrade.fileCount} file perangkat ajar Bahasa Indonesia
            </p>
          </div>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama file..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
          />
        </div>

        <div className="space-y-2">
          {filteredFiles.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">Tidak ada file yang cocok</p>
          )}
          {filteredFiles.map((f) => {
            const Icon = extIcon(f.detectedExtension);
            const colorCls = extColor(f.detectedExtension);
            return (
              <div
                key={f.sourceDriveFileId}
                className="bc-guru-card flex items-center gap-3 px-4 py-3 rounded-xl hover:shadow-sm transition group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorCls}`}>
                  <Icon className="w-4.5 h-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {f.sourceFileName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatSize(Number(f.fileSize))} · {formatDate(f.modifiedTime)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={f.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-700 transition"
                    title="Buka di Drive"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a
                    href={previewUrl(f.sourceUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-700 transition"
                    title="Pratinjau"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 text-center mt-6">
          {filteredFiles.length} dari {selectedGrade.files.length} file ditampilkan
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Perangkat Ajar</h1>
          <p className="text-sm text-slate-500">
            Perangkat pembelajaran Bahasa Indonesia Kurikulum Merdeka
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(["SD", "SMP", "SMA"] as LevelTab[]).map((lv) => {
          const count = grades
            .filter((g) => g.educationLevel === lv)
            .reduce((sum, g) => sum + g.fileCount, 0);
          return (
            <button
              key={lv}
              onClick={() => setLevelTab(lv)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                levelTab === lv
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {LEVEL_ICONS[lv]} {lv}
              <span className="ml-1.5 text-xs opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGrades.map((g) => (
          <button
            key={`${g.educationLevel}-${g.grade}`}
            onClick={() => setSelectedGrade(g)}
            className="bc-guru-card text-left rounded-xl p-4 hover:shadow-md transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                {LEVEL_ICONS[g.educationLevel]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  Kelas {g.grade}
                </p>
                <p className="text-xs text-slate-400">
                  {g.fileCount} file · {formatSize(g.totalSize)}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition shrink-0" />
            </div>
          </button>
        ))}
      </div>

      {filteredGrades.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-12">
          Belum ada data untuk jenjang {levelTab}
        </p>
      )}

      <p className="text-xs text-slate-400 text-center mt-8">
        {grades.reduce((sum, g) => sum + g.fileCount, 0)} file · Perangkat Pembelajaran Bahasa Indonesia
      </p>
    </div>
  );
}
