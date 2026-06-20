"use client";

import { useState } from "react";
import { Clock, FileText, PenTool, Monitor, ClipboardCheck, Bot, Trash2, ExternalLink, Loader2, Search, Check, X, Edit3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SavedAiResult, AgentId } from "../lib/saved-results-api";

interface HistoryPanelProps {
  items: SavedAiResult[];
  loading: boolean;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onOpen: (item: SavedAiResult) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  deleteConfirmId?: string | null;
  onCancelDelete?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onUpdateTitle?: (id: string, newTitle: string) => void;
  editingTitleId?: string | null;
  onEditingTitleChange?: (id: string | null) => void;
  onExportDocx?: (item: SavedAiResult) => void;
  exportDocxId?: string | null;
  onExportPptx?: (item: SavedAiResult) => void;
  exportPptxId?: string | null;
  onExportPdf?: (item: SavedAiResult) => void;
  exportPdfId?: string | null;
}

const AGENT_ICONS: Record<string, React.ReactNode> = {
  rpp: <FileText className="w-3.5 h-3.5" />,
  soal: <PenTool className="w-3.5 h-3.5" />,
  ppt: <Monitor className="w-3.5 h-3.5" />,
  review: <ClipboardCheck className="w-3.5 h-3.5" />,
  "bc-assistant": <Bot className="w-3.5 h-3.5" />,
  eyd: <FileText className="w-3.5 h-3.5" />,
  feedback: <PenTool className="w-3.5 h-3.5" />,
  grading: <ClipboardCheck className="w-3.5 h-3.5" />,
  "text-analysis": <FileText className="w-3.5 h-3.5" />,
};

const AGENT_LABELS: Record<string, string> = {
  rpp: "RPP",
  soal: "Soal",
  ppt: "PPT",
  review: "Review",
  "bc-assistant": "AI BC",
  eyd: "EYD",
  feedback: "Feedback",
  grading: "Nilai",
  "text-analysis": "Analisis",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  if (days < 7) return `${days} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function HistoryPanel({ items, loading, activeFilter, onFilterChange, onOpen, onDelete, deletingId, deleteConfirmId, onCancelDelete, searchQuery, onSearchChange, onUpdateTitle, editingTitleId, onEditingTitleChange, onExportDocx, exportDocxId, onExportPptx, exportPptxId, onExportPdf, exportPdfId }: HistoryPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [editValue, setEditValue] = useState("");
  const displayItems = showAll ? items : items.slice(0, 10);

  const filterOptions = [
    { value: "", label: "Semua" },
    { value: "rpp", label: "RPP" },
    { value: "soal", label: "Soal" },
    { value: "ppt", label: "PPT" },
    { value: "eyd", label: "EYD" },
    { value: "feedback", label: "Feedback" },
    { value: "grading", label: "Nilai" },
    { value: "text-analysis", label: "Analisis" },
    { value: "review", label: "Review" },
    { value: "bc-assistant", label: "AI BC" },
  ];

  const handleStartEdit = (item: SavedAiResult) => {
    setEditValue(item.title);
    onEditingTitleChange?.(item.id);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed.length <= 200) {
      onUpdateTitle?.(id, trimmed);
    }
  };

  const handleCancelEdit = () => {
    onEditingTitleChange?.(null);
    setEditValue("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <CardTitle className="text-base">Riwayat AI Saya</CardTitle>
          </div>
          {items.length > 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {showAll ? "Tampilkan sedikit" : `Lihat semua (${items.length})`}
            </button>
          )}
        </div>
        <CardDescription>Hasil AI yang sudah disimpan</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        {onSearchChange !== undefined && (
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari riwayat AI..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none"
            />
          </div>
        )}

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFilterChange(opt.value)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                activeFilter === opt.value
                  ? "bg-emerald-100 border-emerald-200 text-emerald-700 font-medium"
                  : "bg-white border-gray-200 text-gray-500 hover:border-emerald-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">
              {searchQuery ? "Tidak ada hasil untuk pencarian ini" : activeFilter ? "Belum ada riwayat untuk filter ini" : "Belum ada riwayat. Simpan hasil AI untuk mulai."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="p-1.5 rounded-lg bg-gray-50 text-gray-400 flex-shrink-0">
                  {AGENT_ICONS[item.agentId] ?? <FileText className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  {editingTitleId === item.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(item.id); if (e.key === "Escape") handleCancelEdit(); }}
                        maxLength={200}
                        className="flex-1 text-xs px-1.5 py-0.5 border border-emerald-300 rounded focus:ring-2 focus:ring-emerald-400 outline-none"
                        autoFocus
                      />
                      <button onClick={() => handleSaveEdit(item.id)} className="p-0.5 text-emerald-600 hover:text-emerald-700"><Check className="w-3 h-3" /></button>
                      <button onClick={handleCancelEdit} className="p-0.5 text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-gray-800 truncate">{item.title}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {AGENT_LABELS[item.agentId] ?? item.agentId}
                    </span>
                    <span className="text-[10px] text-gray-400">{formatDate(item.createdAt)}</span>
                    {item.qualityScore != null && (
                      <span className="text-[10px] text-gray-400">
                        Skor: {item.qualityScore}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onUpdateTitle && (
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                      title="Edit judul"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onOpen(item)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                    title="Buka"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  {(item.agentId === "rpp" || item.agentId === "soal") && onExportDocx && (
                    <button
                      onClick={() => onExportDocx(item)}
                      disabled={exportDocxId === item.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                      title="Download DOCX"
                    >
                      {exportDocxId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  {(item.agentId === "rpp" || item.agentId === "soal") && onExportPdf && (
                    <button
                      onClick={() => onExportPdf(item)}
                      disabled={exportPdfId === item.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                      title="Download PDF"
                    >
                      {exportPdfId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  {item.agentId === "ppt" && onExportPptx && (
                    <button
                      onClick={() => onExportPptx(item)}
                      disabled={exportPptxId === item.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                      title="Download PPTX"
                    >
                      {exportPptxId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Monitor className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  {deleteConfirmId === item.id ? (
                    <>
                      <span className="text-[10px] text-red-500 font-medium">Yakin hapus?</span>
                      <button onClick={() => onDelete(item.id)} disabled={deletingId === item.id} className="p-1 rounded-lg text-red-600 hover:bg-red-50" title="Konfirmasi hapus">
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={onCancelDelete} className="p-1 rounded-lg text-gray-400 hover:text-gray-600" title="Batal">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                      title="Hapus"
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
