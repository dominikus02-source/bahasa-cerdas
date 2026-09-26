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
  SMP: <BookOpen size={20} className="text-violet-700" />,
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-8 text-center dark:border-blue-900/70 dark:bg-blue-950/25">
          <Folder className="mx-auto mb-3 h-12 w-12 text-blue-300 dark:text-blue-600" />
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Belum ada data</h2>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">{error}</p>
        </div>
      </div>
    );
  }

  if (selectedGrade) {
    return (
      <div className="max-w-5xl mx-auto py-6 px-4">
        <button
          onClick={() => { setSelectedGrade(null); setSearch(""); }}
          className="mb-4 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-blue-600 dark:hover:text-blue-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke {selectedGrade.educationLevel}
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="guru-section-heading-icon flex h-10 w-10 items-center justify-center rounded-xl text-xl">
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
                className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition group"
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
                    className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 transition"
                    title="Buka di Drive"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a
                    href={previewUrl(f.sourceUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 transition"
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
      <section className="guru-hero-strong mb-6 rounded-[24px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10">
              <BookOpen className="h-6 w-6 text-white" />
            </span>
            <div className="min-w-0">
              <p className="guru-hero-eyebrow text-[10px] font-bold uppercase tracking-[.14em]">Alat Ajar</p>
              <h1 className="mt-0.5 text-xl font-extrabold text-white sm:text-2xl">Perangkat Ajar</h1>
              <p className="guru-hero-muted mt-1 text-sm">
                Perangkat pembelajaran Bahasa Indonesia Kurikulum Merdeka.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["SD", "SMP", "SMA"] as LevelTab[]).map((level) => {
              const count = grades
                .filter((g) => g.educationLevel === level)
                .reduce((sum, g) => sum + g.fileCount, 0);
              return (
                <span key={level} className="guru-hero-chip rounded-xl px-3 py-2 text-xs font-semibold">
                  {level} · {count}
                </span>
              );
            })}
          </div>
        </div>
      </section>

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
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
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
            className="guru-surface-card group rounded-xl p-4 text-left transition hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <div className="guru-section-heading-icon flex h-10 w-10 items-center justify-center rounded-lg">
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
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 dark:group-hover:text-blue-300 transition shrink-0" />
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
