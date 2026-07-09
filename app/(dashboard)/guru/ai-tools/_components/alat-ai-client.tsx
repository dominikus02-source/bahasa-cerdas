"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { FileText, PenTool, Monitor, ClipboardCheck, Bot, SpellCheck, MessageSquare, CheckSquare, BookOpen, AlertTriangle, RefreshCw } from "lucide-react";
import { AiCreditBalance } from "@/components/guru/AiCreditBalance";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentCard } from "./agent-card";
import { AgentResultPanel, type AgentResultData } from "./agent-result-panel";
import { HistoryPanel } from "./history-panel";
import { RPPForm } from "./forms/rpp-form";
import { SoalForm } from "./forms/soal-form";
import { PPTForm } from "./forms/ppt-form";
import { ReviewForm } from "./forms/review-form";
import { BCAssistantForm } from "./forms/bc-assistant-form";
import { EydForm } from "./forms/eyd-form";
import { FeedbackForm } from "./forms/feedback-form";
import { GradingForm } from "./forms/grading-form";
import { TextAnalysisForm } from "./forms/text-analysis-form";
import { runAgent, runAgentStream, QuotaExceededError, AgentErrorWithCodeClass, type StreamCallbacks, type QuotaErrorInfo } from "../lib/agent-api";
import { saveAiResult, listSavedResults, deleteSavedResult, updateSavedResult } from "../lib/saved-results-api";
import { downloadDocxExport, downloadPptxExport, downloadPdfExport } from "../lib/export-api";
import type { AgentId } from "../lib/agent-api";
import type { SavedAiResult } from "../lib/saved-results-api";

type AgentCategory = "buat-materi" | "evaluasi" | "bahasa";

interface AgentConfig {
  id: AgentId;
  name: string;
  description: string;
  useCase: string;
  icon: React.ReactNode;
  category: AgentCategory;
}

const AGENTS: AgentConfig[] = [
  // Buat Materi
  { id: "rpp", name: "RPP / Modul Ajar", description: "Buat RPP dan modul ajar Bahasa Indonesia siap pakai sesuai kurikulum.", useCase: "Guru yang ingin menyusun RPP cepat", icon: <FileText className="w-5 h-5" />, category: "buat-materi" },
  { id: "soal", name: "Buat Soal", description: "Hasilkan soal PG, essay, AKM, PISA dengan kunci jawaban dan pembahasan.", useCase: "Guru yang perlu bank soal variatif", icon: <PenTool className="w-5 h-5" />, category: "buat-materi" },
  { id: "ppt", name: "Buat PPT", description: "Rancang slide presentasi mengajar dengan narasi dan aktivitas interaktif.", useCase: "Guru yang butuh presentasi siap pakai", icon: <Monitor className="w-5 h-5" />, category: "buat-materi" },
  // Evaluasi & Review
  { id: "review", name: "Review Materi", description: "Dapatkan feedback dan saran perbaikan untuk materi pembelajaran Anda.", useCase: "Guru yang ingin mengecek kualitas materi", icon: <ClipboardCheck className="w-5 h-5" />, category: "evaluasi" },
  { id: "feedback", name: "Feedback Siswa", description: "Beri umpan balik konstruktif untuk tulisan siswa dengan nada sesuai jenjang.", useCase: "Guru yang ingin memberi feedback personal", icon: <MessageSquare className="w-5 h-5" />, category: "evaluasi" },
  { id: "grading", name: "Penilaian Otomatis", description: "Nilai jawaban esai siswa dengan rubrik jelas dan skor otomatis.", useCase: "Guru yang menilai esai dan tugas uraian", icon: <CheckSquare className="w-5 h-5" />, category: "evaluasi" },
  { id: "text-analysis", name: "Analisis Teks", description: "Analisis teks dari struktur, gagasan, diksi, dan gaya bahasa.", useCase: "Guru yang ingin analisis mendalam teks", icon: <BookOpen className="w-5 h-5" />, category: "evaluasi" },
  // Bahasa & Asisten
  { id: "eyd", name: "Korektor EYD", description: "Perbaiki ejaan, tanda baca, dan tata bahasa sesuai EYD/PUEBI.", useCase: "Guru yang butuh koreksi ejaan cepat", icon: <SpellCheck className="w-5 h-5" />, category: "bahasa" },
  { id: "bc-assistant", name: "AI BC Assistant", description: "Tanya apa pun tentang Bahasa Indonesia dan dapatkan arahan ke agent tepat.", useCase: "Butuh bantuan cepat atau bingung mulai dari mana", icon: <Bot className="w-5 h-5" />, category: "bahasa" },
];

const CATEGORY_LABELS: Record<AgentCategory, string> = {
  "buat-materi": "Buat Materi",
  evaluasi: "Evaluasi & Review",
  bahasa: "Bahasa & Asisten",
};

const CATEGORY_ORDER: AgentCategory[] = ["buat-materi", "evaluasi", "bahasa"];

function generateTitle(agentId: string, input: Record<string, unknown>, resultText: string | null): string {
  const subject = (input.subject as string) || "Bahasa Indonesia";
  const topic = (input.topic as string) || "";
  const message = (input.message as string) || "";
  const text = (input.text as string) || "";
  switch (agentId) {
    case "rpp":
      return topic ? `RPP ${subject} — ${topic}` : `RPP ${subject}`;
    case "soal":
      return topic ? `Soal ${subject} — ${topic}` : `Soal ${subject}`;
    case "ppt":
      return topic ? `PPT ${subject} — ${topic}` : `PPT ${subject}`;
    case "review":
      return "Review Materi";
    case "feedback":
      return "Feedback Siswa";
    case "grading":
      return "Penilaian Otomatis";
    case "text-analysis":
      return "Analisis Teks";
    case "eyd":
      return text ? `Koreksi EYD — ${text.slice(0, 40)}${text.length > 40 ? "..." : ""}` : "Koreksi EYD";
    case "bc-assistant":
      return message ? `Percakapan AI BC — ${message.slice(0, 40)}${message.length > 40 ? "..." : ""}` : "Percakapan AI BC";
    default:
      return "Hasil AI";
  }
}

const VALID_AGENT_IDS = new Set(AGENTS.map((a) => a.id));

// Agent yang disembunyikan dari menu (belum diperlukan). Tetap terdaftar di
// AGENTS agar mudah diaktifkan lagi — cukup hapus id-nya dari set ini.
const HIDDEN_AGENT_IDS = new Set<AgentId>(["soal", "ppt"]);

export function AlatAiClient({ agentParam }: { agentParam?: string }) {
  const initialAgent = agentParam && VALID_AGENT_IDS.has(agentParam as AgentId) && !HIDDEN_AGENT_IDS.has(agentParam as AgentId) ? (agentParam as AgentId) : "rpp";
  const [selectedAgent, setSelectedAgent] = useState<AgentId>(initialAgent);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<AgentResultData | null>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [currentErrorCode, setCurrentErrorCode] = useState<string | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | undefined>(undefined);
  const [lastPayload, setLastPayload] = useState<Record<string, unknown> | null>(null);

  const [quotaError, setQuotaError] = useState<QuotaErrorInfo | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingProvider, setStreamingProvider] = useState("");
  const [streamingModel, setStreamingModel] = useState("");
  const [streamProgress, setStreamProgress] = useState("");
  const [streamCancelled, setStreamCancelled] = useState(false);
  const [streamIncomplete, setStreamIncomplete] = useState(false);

  const [resultSource, setResultSource] = useState<"generated" | "history" | null>(null);
  const [savedResultId, setSavedResultId] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [exportDocxState, setExportDocxState] = useState<"idle" | "loading" | "error">("idle");
  const [exportDocxId, setExportDocxId] = useState<string | null>(null);

  const [exportPptxState, setExportPptxState] = useState<"idle" | "loading" | "error">("idle");
  const [exportPptxId, setExportPptxId] = useState<string | null>(null);

  const [exportPdfState, setExportPdfState] = useState<"idle" | "loading" | "error">("idle");
  const [exportPdfId, setExportPdfId] = useState<string | null>(null);

  const [historyItems, setHistoryItems] = useState<SavedAiResult[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await listSavedResults({ limit: 50 });
      if (res.success) {
        setHistoryItems(res.data);
      }
    } catch {
      // silently fail
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRunAgent = useCallback(async (agentId: AgentId, input: Record<string, unknown>) => {
    setQuotaError(null);
    setIsLoading(true);
    setIsStreaming(true);
    setCurrentError(null);
    setCurrentResult(null);
    setStreamingText("");
    setStreamingProvider("");
    setStreamingModel("");
    setStreamProgress("");
    setStreamCancelled(false);
    setStreamIncomplete(false);
    setLastPayload(input);
    setSaveState("idle");
    setSaveError(null);
    setSavedResultId(null);
    setResultSource(null);

    let streamingResolved = false;
    let streamingStarted = false;
    let isCancelled = false;
    let streamResolve: (() => void) | null = null;

    const streamPromise = new Promise<void>((resolve) => {
      streamResolve = resolve;
    });

    const fallbackTimer = setTimeout(() => {
      if (!streamingStarted && !streamingResolved) {
        abortRef.current?.();
      }
    }, 15000);

    const callbacks: StreamCallbacks = {
      onTextDelta: (text) => {
        streamingStarted = true;
        setStreamingText((prev) => prev + text);
      },
      onProgress: (msg) => setStreamProgress(msg),
      onProvider: (provider, model) => {
        setStreamingProvider(provider);
        setStreamingModel(model);
      },
      onFinalResult: (data) => {
        streamingResolved = true;
        clearTimeout(fallbackTimer);
        setCurrentResult({
          success: data.success,
          output: data.output,
          text: data.text,
          error: data.error,
          warnings: data.warnings,
          qualityScore: data.qualityScore,
          provider: data.provider,
          model: data.model,
          latencyMs: data.latencyMs,
        });
        setResultSource("generated");
        setStreamIncomplete(false);
      },
      onError: (code, message, reqId) => {
        clearTimeout(fallbackTimer);
        setCurrentErrorCode(code || "STREAM_ERROR");
        if (reqId) setCurrentRequestId(reqId);
        if (message === "Pembuatan dihentikan.") {
          isCancelled = true;
          setStreamCancelled(true);
        } else if (streamingStarted) {
          setCurrentError(message);
          setStreamIncomplete(true);
        } else {
          setCurrentError(message);
        }
      },
      onDone: () => {
        clearTimeout(fallbackTimer);
        setIsStreaming(false);
        streamResolve?.();
      },
    };

    const stream = runAgentStream(agentId, input, callbacks);
    abortRef.current = stream.abort;

    await streamPromise;
    abortRef.current = null;

    // Fallback: stream gagal (belum mulai ATAU mati di tengah tanpa hasil final)
    // — coba jalur non-streaming yang punya salvage + fallback template sendiri.
    if (!streamingResolved && !isCancelled) {
      setStreamProgress("Menyambung ulang tanpa streaming...");
      setCurrentError(null);
      setStreamIncomplete(false);
      try {
        const data = await runAgent(agentId, input);
        setCurrentResult({
          success: data.success,
          output: data.output,
          text: data.text,
          error: data.error,
          warnings: data.warnings,
          qualityScore: data.qualityScore,
          provider: data.provider,
          model: data.model,
          latencyMs: data.latencyMs,
        });
        setCurrentErrorCode(null);
        setCurrentRequestId(data.requestId);
        setResultSource("generated");
        setStreamIncomplete(false);
      } catch (e) {
        if (e instanceof QuotaExceededError) {
          setQuotaError({ error: "QUOTA_EXCEEDED", message: e.message, quota: e.quota ?? undefined });
        } else if (e instanceof AgentErrorWithCodeClass) {
          setCurrentError(e.message);
          setCurrentErrorCode(e.code);
          setCurrentRequestId(e.requestId);
        } else {
          setCurrentError(e instanceof Error ? e.message : "Terjadi kesalahan. Silakan coba lagi.");
          setCurrentErrorCode("UNKNOWN_ERROR");
        }
      }
    }

    setIsLoading(false);
  }, []);

  const handleCancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
  }, []);

  const handleRegenerate = useCallback(() => {
    if (!lastPayload) return;
    setCurrentResult(null);
    setCurrentError(null);
    setCurrentErrorCode(null);
    setCurrentRequestId(undefined);
    setSavedResultId(null);
    setResultSource(null);
    setSaveState("idle");
    setSaveError(null);
    setStreamCancelled(false);
    setStreamIncomplete(false);
    handleRunAgent(selectedAgent, lastPayload);
  }, [selectedAgent, lastPayload, handleRunAgent]);

  const handleClear = useCallback(() => {
    setCurrentResult(null);
    setCurrentError(null);
    setSavedResultId(null);
    setResultSource(null);
    setSaveState("idle");
    setSaveError(null);
    setExportDocxState("idle");
    setExportPptxState("idle");
    setExportPdfState("idle");
  }, []);

  const handleSuggestedAgent = useCallback((agentId: string) => {
    const valid = AGENTS.find((a) => a.id === agentId);
    if (valid) {
      setSelectedAgent(agentId as AgentId);
      setCurrentResult(null);
      setCurrentError(null);
      setSavedResultId(null);
      setResultSource(null);
      setSaveState("idle");
    }
  }, []);

  const handleSelectAgent = useCallback((agentId: AgentId) => {
    setSelectedAgent(agentId);
    setCurrentResult(null);
    setCurrentError(null);
    setSavedResultId(null);
    setResultSource(null);
    setSaveState("idle");
  }, []);

  const handleExportDocx = useCallback(async (item?: SavedAiResult) => {
    if (item) {
      setExportDocxId(item.id);
      try {
        await downloadDocxExport({
          agentId: item.agentId as "rpp" | "soal",
          savedResultId: item.id,
          title: item.title,
        });
      } catch {
        // silent
      } finally {
        setExportDocxId(null);
      }
    } else if (currentResult?.success && lastPayload) {
      setExportDocxState("loading");
      try {
        const editableText = typeof (currentResult.output as Record<string, unknown>)?.editableText === "string"
          ? (currentResult.output as Record<string, unknown>).editableText as string
          : currentResult.text ?? undefined;
        await downloadDocxExport({
          agentId: selectedAgent as "rpp" | "soal",
          title: generateTitle(selectedAgent, lastPayload, currentResult.text),
          outputJson: (currentResult.output ?? {}) as Record<string, unknown>,
          editableText,
        });
      } catch {
        setExportDocxState("error");
        setTimeout(() => setExportDocxState("idle"), 3000);
        return;
      }
      setExportDocxState("idle");
    }
  }, [currentResult, lastPayload, selectedAgent]);

  const handleExportPptx = useCallback(async (item?: SavedAiResult) => {
    if (item) {
      setExportPptxId(item.id);
      try {
        await downloadPptxExport({
          agentId: "ppt",
          savedResultId: item.id,
          title: item.title,
        });
      } catch {
        // silent
      } finally {
        setExportPptxId(null);
      }
    } else if (currentResult?.success && lastPayload) {
      setExportPptxState("loading");
      try {
        const editableText = typeof (currentResult.output as Record<string, unknown>)?.editableText === "string"
          ? (currentResult.output as Record<string, unknown>).editableText as string
          : currentResult.text ?? undefined;
        await downloadPptxExport({
          agentId: "ppt",
          title: generateTitle(selectedAgent, lastPayload, currentResult.text),
          outputJson: (currentResult.output ?? {}) as Record<string, unknown>,
          editableText,
        });
      } catch {
        setExportPptxState("error");
        setTimeout(() => setExportPptxState("idle"), 3000);
        return;
      }
      setExportPptxState("idle");
    }
  }, [currentResult, lastPayload, selectedAgent]);

  const handleExportPdf = useCallback(async (item?: SavedAiResult) => {
    if (item) {
      setExportPdfId(item.id);
      try {
        await downloadPdfExport({
          agentId: item.agentId as "rpp" | "soal",
          savedResultId: item.id,
          title: item.title,
        });
      } catch {
        // silent
      } finally {
        setExportPdfId(null);
      }
    } else if (currentResult?.success && lastPayload) {
      setExportPdfState("loading");
      try {
        const editableText = typeof (currentResult.output as Record<string, unknown>)?.editableText === "string"
          ? (currentResult.output as Record<string, unknown>).editableText as string
          : currentResult.text ?? undefined;
        await downloadPdfExport({
          agentId: selectedAgent as "rpp" | "soal",
          title: generateTitle(selectedAgent, lastPayload, currentResult.text),
          outputJson: (currentResult.output ?? {}) as Record<string, unknown>,
          editableText,
        });
      } catch {
        setExportPdfState("error");
        setTimeout(() => setExportPdfState("idle"), 3000);
        return;
      }
      setExportPdfState("idle");
    }
  }, [currentResult, lastPayload, selectedAgent]);

  const handleSave = useCallback(async () => {
    if (!currentResult?.success || !lastPayload || savedResultId) return;
    setSaveState("saving");
    setSaveError(null);
    try {
      const title = generateTitle(selectedAgent, lastPayload, currentResult.text);
      const saved = await saveAiResult({
        agentId: selectedAgent,
        title,
        inputJson: lastPayload,
        outputJson: (currentResult.output ?? {}) as Record<string, unknown>,
        editableText: currentResult.text,
        qualityScore: currentResult.qualityScore,
        provider: currentResult.provider,
        model: currentResult.model,
        metadata: null,
      });
      setSavedResultId(saved.id);
      setSaveState("saved");
      loadHistory();
    } catch (e) {
      setSaveState("error");
      setSaveError(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }, [currentResult, lastPayload, selectedAgent, savedResultId, loadHistory]);

  const handleOpenFromHistory = useCallback((item: SavedAiResult) => {
    setSelectedAgent(item.agentId as AgentId);
    setCurrentResult({
      success: true,
      output: item.outputJson as Record<string, unknown>,
      text: item.editableText,
      error: null,
      warnings: [],
      qualityScore: item.qualityScore ?? 0,
      provider: item.provider ?? "",
      model: item.model ?? "",
      latencyMs: 0,
    });
    setCurrentError(null);
    setSavedResultId(item.id);
    setResultSource("history");
    setSaveState("saved");
  }, []);

  const handleDeleteFromHistory = useCallback(async (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }
    setDeleteConfirmId(null);
    setDeletingId(id);
    try {
      await deleteSavedResult(id);
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
      if (savedResultId === id) {
        setSavedResultId(null);
        setResultSource(null);
        setSaveState("idle");
      }
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  }, [deleteConfirmId, savedResultId]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  const handleUpdateTitle = useCallback(async (id: string, newTitle: string) => {
    try {
      await updateSavedResult(id, { title: newTitle });
      setHistoryItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item))
      );
      setEditingTitleId(null);
    } catch {
      // silently fail
    }
  }, []);

  const handleHistoryFilterChange = useCallback((filter: string) => {
    setHistoryFilter(filter);
  }, []);

  const handleHistorySearchChange = useCallback((search: string) => {
    setHistorySearch(search);
  }, []);

  const query = historySearch.toLowerCase();
  const filteredHistory = historyItems.filter((item) => {
    if (historyFilter && item.agentId !== historyFilter) return false;
    if (query) {
      const inTitle = item.title.toLowerCase().includes(query);
      const inAgent = item.agentId.toLowerCase().includes(query);
      return inTitle || inAgent;
    }
    return true;
  });

  const hasHistoryBadge = currentResult !== null && resultSource === "history";

  const getBadgeLabel = (id: string) => {
    switch (id) {
      case "rpp": return "RPP";
      case "soal": return "Soal";
      case "ppt": return "PPT";
      case "review": return "Review";
      case "feedback": return "Feedback";
      case "grading": return "Nilai";
      case "text-analysis": return "Analisis";
      case "eyd": return "EYD";
      case "bc-assistant": return "Asisten";
      default: return "";
    }
  };

  // Group agents by category (agent tersembunyi dikeluarkan; grup kosong dilewati)
  const groupedAgents = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    agents: AGENTS.filter((a) => a.category === cat && !HIDDEN_AGENT_IDS.has(a.id)),
  })).filter((group) => group.agents.length > 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Sidebar — Agent selector with grouped cards */}
      <div className="xl:col-span-1 space-y-4">
        <AiCreditBalance />
        {groupedAgents.map((group) => (
          <div key={group.category}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  id={agent.id}
                  name={agent.name}
                  description={agent.description}
                  useCase={agent.useCase}
                  icon={agent.icon}
                  active={selectedAgent === agent.id}
                  onClick={() => handleSelectAgent(agent.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Main workspace — Form + Result */}
      <div className="xl:col-span-3 space-y-6">
        {/* Quota error banner */}
        {quotaError && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="font-semibold text-amber-900">Credit AI Anda sudah habis.</p>
                  <p className="text-sm text-amber-800">
                    Anda tetap bisa mengakses dashboard dan riwayat.
                  </p>
                  {quotaError.quota && (
                    <div className="text-xs text-amber-700 space-y-1">
                      <p>Paket: {quotaError.quota.plan}</p>
                      <p>Kredit tersisa: {quotaError.quota.remainingCredits}</p>
                      {quotaError.quota.resetAt && (
                        <p>Reset: {new Date(quotaError.quota.resetAt).toLocaleDateString("id-ID")}</p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-700 border-amber-300 hover:bg-amber-100"
                      onClick={() => setQuotaError(null)}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Tutup
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                      onClick={() => window.location.href = "/guru/berlangganan"}
                    >
                      <span className="text-sm font-semibold">Upgrade ke PRO</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {AGENTS.find((a) => a.id === selectedAgent)?.name ?? "Agent AI"}
                </CardTitle>
                <CardDescription>
                  {AGENTS.find((a) => a.id === selectedAgent)?.description ?? ""}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50">
                {getBadgeLabel(selectedAgent)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {selectedAgent === "rpp" && <RPPForm onSubmit={(input) => handleRunAgent("rpp", input)} loading={isLoading} />}
            {selectedAgent === "soal" && <SoalForm onSubmit={(input) => handleRunAgent("soal", input)} loading={isLoading} />}
            {selectedAgent === "ppt" && <PPTForm onSubmit={(input) => handleRunAgent("ppt", input)} loading={isLoading} />}
            {selectedAgent === "review" && <ReviewForm onSubmit={(input) => handleRunAgent("review", input)} loading={isLoading} />}
            {selectedAgent === "eyd" && <EydForm onSubmit={(input) => handleRunAgent("eyd", input)} loading={isLoading} />}
            {selectedAgent === "feedback" && <FeedbackForm onSubmit={(input) => handleRunAgent("feedback", input)} loading={isLoading} />}
            {selectedAgent === "grading" && <GradingForm onSubmit={(input) => handleRunAgent("grading", input)} loading={isLoading} />}
            {selectedAgent === "text-analysis" && <TextAnalysisForm onSubmit={(input) => handleRunAgent("text-analysis", input)} loading={isLoading} />}
            {selectedAgent === "bc-assistant" && (
              <BCAssistantForm
                onSubmit={(input) => handleRunAgent("bc-assistant", input)}
                loading={isLoading}
              />
            )}
          </CardContent>
        </Card>

        {/* Result panel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Hasil</CardTitle>
              {hasHistoryBadge && (
                <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-200 bg-violet-50">
                  Dibuka dari Riwayat
                </Badge>
              )}
            </div>
            <CardDescription>
              {currentResult
                ? resultSource === "history"
                  ? "Hasil dimuat dari riwayat tersimpan"
                  : "Output dari agent AI"
                : "Hasil akan muncul di sini"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentResultPanel
              agentId={selectedAgent}
              result={currentResult}
              loading={isLoading}
              error={currentError}
              errorCode={currentErrorCode}
              requestId={currentRequestId}
              isStreaming={isStreaming}
              streamingText={streamingText}
              streamingProvider={streamingProvider}
              streamingModel={streamingModel}
              streamProgress={streamProgress}
              streamCancelled={streamCancelled}
              streamIncomplete={streamIncomplete}
              onCancelStream={handleCancelStream}
              onRegenerate={handleRegenerate}
              onClear={handleClear}
              onSuggestedAgent={handleSuggestedAgent}
              onSave={handleSave}
              saveState={saveState}
              saveError={saveError}
              onExportDocx={() => handleExportDocx()}
              exportDocxState={exportDocxState}
              onExportPptx={() => handleExportPptx()}
              exportPptxState={exportPptxState}
              onExportPdf={() => handleExportPdf()}
              exportPdfState={exportPdfState}
              resultSource={resultSource}
              savedResultId={savedResultId}
            />
          </CardContent>
        </Card>
      </div>

      {/* History panel */}
      <div className="xl:col-span-4">
        <HistoryPanel
          items={filteredHistory}
          loading={historyLoading}
          activeFilter={historyFilter}
          onFilterChange={handleHistoryFilterChange}
          searchQuery={historySearch}
          onSearchChange={handleHistorySearchChange}
          onOpen={handleOpenFromHistory}
          onDelete={handleDeleteFromHistory}
          deletingId={deletingId}
          deleteConfirmId={deleteConfirmId}
          onCancelDelete={handleCancelDelete}
          onUpdateTitle={handleUpdateTitle}
          editingTitleId={editingTitleId}
          onEditingTitleChange={setEditingTitleId}
          onExportDocx={(item) => handleExportDocx(item)}
          exportDocxId={exportDocxId}
          onExportPptx={(item) => handleExportPptx(item)}
          exportPptxId={exportPptxId}
          onExportPdf={(item) => handleExportPdf(item)}
          exportPdfId={exportPdfId}
        />
      </div>
    </div>
  );
}
