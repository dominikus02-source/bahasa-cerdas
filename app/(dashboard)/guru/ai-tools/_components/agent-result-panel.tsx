"use client";

import { useState, useCallback } from "react";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, RotateCw, X, Copy, FileText, Monitor, ArrowRight, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "./copy-button";

export interface AgentResultData {
  success: boolean;
  output: Record<string, unknown> | null;
  text: string | null;
  error: string | null;
  warnings: string[];
  qualityScore: number;
  provider: string;
  model: string;
  latencyMs: number;
}

interface AgentResultPanelProps {
  agentId: string;
  result: AgentResultData | null;
  loading: boolean;
  error: string | null;
  isStreaming?: boolean;
  streamingText?: string;
  streamingProvider?: string;
  streamingModel?: string;
  streamProgress?: string;
  streamCancelled?: boolean;
  streamIncomplete?: boolean;
  onCancelStream?: () => void;
  onRegenerate: () => void;
  onClear: () => void;
  onSuggestedAgent?: (agentId: string) => void;
  onSave?: () => void;
  saveState?: "idle" | "saving" | "saved" | "error";
  saveError?: string | null;
  onExportDocx?: () => void;
  exportDocxState?: "idle" | "loading" | "error";
  onExportPptx?: () => void;
  exportPptxState?: "idle" | "loading" | "error";
  onExportPdf?: () => void;
  exportPdfState?: "idle" | "loading" | "error";
  resultSource?: "generated" | "history" | null;
  savedResultId?: string | null;
}

function QualityBadge({ score }: { score: number }) {
  if (score >= 80) return <Badge variant="success">{score}/100</Badge>;
  if (score >= 50) return <Badge variant="warning">{score}/100</Badge>;
  return <Badge variant="destructive">{score}/100</Badge>;
}

function RPPDisplay({ output }: { output: Record<string, unknown> }) {
  const editableText = output.editableText as string | undefined;
  const displayText = output.displayText as string | undefined;
  const text = output.text as string | undefined;

  // Prioritize editableText > displayText > text > structured rendering
  const mainContent = editableText || displayText || text || "";

  if (mainContent.trim().length > 0) {
    return (
      <div className="p-4 bg-white border border-gray-100 rounded-xl">
        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-ul:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
          <RPPContent text={mainContent} />
        </div>
      </div>
    );
  }

  // Fallback: structured rendering
  return <StructuredRPPFallback output={output} />;
}

function RPPContent({ text }: { text: string }) {
  const lines = text.split("\n").filter(Boolean);
  return (
    <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
      {lines.map((line, i) => {
        // Headings
        if (line.startsWith("### ")) {
          return <h3 key={i} className="text-base font-semibold text-gray-900 mt-4 mb-2">{line.replace("### ", "")}</h3>;
        }
        if (line.startsWith("## ")) {
          return <h2 key={i} className="text-lg font-bold text-gray-900 mt-5 mb-2">{line.replace("## ", "")}</h2>;
        }
        if (line.startsWith("# ")) {
          return <h1 key={i} className="text-xl font-bold text-gray-900 mt-5 mb-3">{line.replace("# ", "")}</h1>;
        }
        // Bullet points
        if (line.startsWith("- ")) {
          return <p key={i} className="text-gray-700 ml-4 mb-1">• {line.slice(2)}</p>;
        }
        if (/^\d+\.\s/.test(line)) {
          return <p key={i} className="text-gray-700 ml-4 mb-1">{line}</p>;
        }
        // Bold markers
        if (line.includes("**") && line.includes("**", line.indexOf("**") + 2)) {
          return <p key={i} className="text-gray-700 mb-1"><strong>{line.split("**").filter((_, idx) => idx % 2 === 1).join("")}</strong></p>;
        }
        // Regular text
        if (line.trim()) {
          return <p key={i} className="text-gray-700 mb-1">{line}</p>;
        }
        // Empty line
        return <div key={i} className="h-2" />;
      })}
    </div>
  );
}

function StructuredRPPFallback({ output }: { output: Record<string, unknown> }) {
  const steps = output.learningSteps as Record<string, string[]> | undefined;
  const assessment = output.assessmentPlan as Record<string, string[]> | undefined;
  const diff = output.differentiationStrategy as Record<string, string[]> | undefined;
  const rubric = output.rubric as Record<string, unknown> | undefined;

  return (
    <div className="space-y-3 text-sm">
      <Section title="Identitas">
        <p><span className="text-gray-500">Mata Pelajaran:</span> {(output.identity as any)?.subject}</p>
        <p><span className="text-gray-500">Kelas:</span> {(output.identity as any)?.grade}</p>
        <p><span className="text-gray-500">Topik:</span> {(output.identity as any)?.topic}</p>
        <p><span className="text-gray-500">Durasi:</span> {(output.identity as any)?.duration}</p>
      </Section>
      <Section title="Tujuan Pembelajaran" items={output.learningObjectives as string[]} />
      {steps && <Section title="Kegiatan Pembelajaran">
        <SubSection label="Pendahuluan" items={steps.opening} />
        <SubSection label="Inti" items={steps.core} />
        <SubSection label="Penutup" items={steps.closing} />
      </Section>}
      {assessment && <Section title="Asesmen">
        {assessment.diagnostic?.length > 0 && <SubSection label="Diagnostik" items={assessment.diagnostic} />}
        {assessment.formative?.length > 0 && <SubSection label="Formatif" items={assessment.formative} />}
        {assessment.summative?.length > 0 && <SubSection label="Sumatif" items={assessment.summative} />}
      </Section>}
      {diff && <Section title="Diferensiasi">
        {diff.content?.length > 0 && <SubSection label="Konten" items={diff.content} />}
        {diff.process?.length > 0 && <SubSection label="Proses" items={diff.process} />}
        {diff.product?.length > 0 && <SubSection label="Produk" items={diff.product} />}
      </Section>}
      {rubric && <Section title="Rubrik Penilaian">
        <div className="space-y-2">
          {(Array.isArray((rubric as any)?.criteria) ? (rubric as any).criteria : []).map((c: any, i: number) => (
            <div key={i} className="p-2 bg-blue-50 rounded-lg text-xs">
              <p className="font-medium text-blue-700 mb-1">{c?.name ?? ""}</p>
              <p className="text-blue-600">Unggul: {c?.excellent ?? ""}</p>
              <p className="text-blue-500">Baik: {c?.good ?? ""}</p>
              <p className="text-blue-400">Perlu Perbaikan: {c?.needsImprovement ?? ""}</p>
            </div>
          ))}
        </div>
      </Section>}
    </div>
  );
}

function StructuredSoal({ output }: { output: Record<string, unknown> }) {
  const questions = output.questions as any[] | undefined;
  return (
    <div className="space-y-3 text-sm">
      {(questions ?? []).map((q, i) => (
        <div key={i} className="p-3 bg-white border border-gray-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
              {q.number ?? i + 1}
            </span>
            <Badge variant="outline" className="text-[10px]">{q.type?.replace(/_/g, ' ')}</Badge>
            <Badge variant="outline" className="text-[10px]">{q.difficulty}</Badge>
            <Badge variant="outline" className="text-[10px]">{q.bloomLevel}</Badge>
          </div>
          <p className="font-medium text-gray-800 mb-2">{q.question}</p>
          {q.options && (
            <div className="space-y-1 mb-2">
              {q.options.map((o: string, j: number) => (
                <p key={j} className={cn(
                  "text-xs px-2 py-1 rounded",
                  o === q.answer ? "bg-green-50 text-green-700 font-medium" : "text-gray-600"
                )}>
                  {String.fromCharCode(65 + j)}. {o}
                </p>
              ))}
            </div>
          )}
          {q.explanation && (
            <p className="text-xs text-gray-500 mt-1 italic">{q.explanation}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function StructuredPPT({ output }: { output: Record<string, unknown> }) {
  const slides = output.slides as any[] | undefined;
  return (
    <div className="space-y-3 text-sm">
      {(slides ?? []).map((s) => (
        <div key={s.slideNumber} className="p-3 bg-white border border-gray-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
              {s.slideNumber}
            </span>
            <p className="font-semibold text-gray-800">{s.title}</p>
            {s.subtitle && <span className="text-xs text-gray-400">{s.subtitle}</span>}
          </div>
          {s.bullets?.length > 0 && (
            <ul className="space-y-1 mb-2">
              {s.bullets.map((b: string, j: number) => (
                <li key={j} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-400 italic mb-1">
            <span className="font-medium">Narasi:</span> {s.speakerNotes}
          </p>
          <p className="text-xs text-gray-400">
            <span className="font-medium">Visual:</span> {s.visualSuggestion}
          </p>
          {s.activityPrompt && (
            <p className="text-xs text-emerald-600 font-medium mt-1">
              Aktivitas: {s.activityPrompt}
            </p>
          )}
          {s.quiz && (
            <div className="mt-2 p-2 bg-amber-50 rounded-lg">
              <p className="text-xs font-medium text-amber-700 mb-1">Kuis: {s.quiz.question}</p>
              {s.quiz.options?.map((o: string, j: number) => (
                <p key={j} className="text-xs text-amber-600">{String.fromCharCode(65 + j)}. {o}</p>
              ))}
              <p className="text-xs text-green-600 font-medium mt-1">Jawaban: {s.quiz.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StructuredReview({ output }: { output: Record<string, unknown> }) {
  return (
    <div className="space-y-3 text-sm">
      <Section title="Kekuatan" items={output.strengths as string[]} icon="check" />
      <Section title="Masalah Ditemukan" items={output.issues as string[]} icon="alert" />
      <Section title="Rekomendasi" items={output.recommendations as string[]} icon="bulb" />
    </div>
  );
}

function StructuredEYD({ output }: { output: Record<string, unknown> }) {
  const changes = output.changes as any[] | undefined;
  const suggestions = output.suggestions as string[] | undefined;
  return (
    <div className="space-y-3 text-sm">
      <Section title="Teks Terkoreksi">
        <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
          <p className="text-gray-700 whitespace-pre-wrap">{(output.correctedText as string) ?? ""}</p>
        </div>
      </Section>
      {(output.summary as string) && (
        <Section title="Ringkasan">
          <p className="text-gray-600">{(output.summary as string) ?? ""}</p>
        </Section>
      )}
      {changes && changes.length > 0 && (
        <Section title={`Perubahan (${changes.length})`}>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {changes.map((c: any, i: number) => (
              <div key={i} className="p-2 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-600 line-through text-xs">{c.before}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <span className="text-green-600 font-medium text-xs">{c.after}</span>
                </div>
                <p className="text-[10px] text-gray-500">{c.reason}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
      {suggestions && suggestions.length > 0 && (
        <Section title="Saran" icon="check" items={suggestions} />
      )}
    </div>
  );
}

function StructuredFeedback({ output }: { output: Record<string, unknown> }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="p-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100">
        <p className="text-gray-700 whitespace-pre-wrap">{(output.overallFeedback as string) ?? ""}</p>
      </div>
      {(output.strengths as string[] ?? []).length > 0 && (
        <Section title="Kekuatan" items={output.strengths as string[]} icon="check" />
      )}
      {(output.areasToImprove as string[] ?? []).length > 0 && (
        <Section title="Area Perbaikan" items={output.areasToImprove as string[]} icon="alert" />
      )}
      {(output.revisionTips as string[] ?? []).length > 0 && (
        <Section title="Tips Revisi" items={output.revisionTips as string[]} icon="bulb" />
      )}
      {(output.exampleRevision as string) && (
        <Section title="Contoh Revisi">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{(output.exampleRevision as string) ?? ""}</p>
          </div>
        </Section>
      )}
    </div>
  );
}

function StructuredGrading({ output }: { output: Record<string, unknown> }) {
  const breakdown = output.rubricBreakdown as any[] | undefined;
  const score = output.score as number ?? 0;
  const maxScore = output.maxScore as number ?? 100;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const gradeColor = pct >= 85 ? "text-green-600" : pct >= 70 ? "text-blue-600" : pct >= 55 ? "text-yellow-600" : pct >= 40 ? "text-orange-600" : "text-red-600";
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
        <div>
          <p className="text-xs text-gray-500">Skor</p>
          <p className={`text-2xl font-bold ${gradeColor}`}>{score}/{maxScore}</p>
          <p className="text-xs text-gray-400">{pct}% — Grade {(output.gradeLabel as string) ?? ""}</p>
        </div>
        {(output.feedbackForStudent as string) && (
          <div className="flex-1 ml-4">
            <p className="text-[10px] font-medium text-gray-500 mb-0.5">Feedback untuk Siswa</p>
            <p className="text-xs text-gray-600 line-clamp-3">{(output.feedbackForStudent as string) ?? ""}</p>
          </div>
        )}
      </div>
      {breakdown && breakdown.length > 0 && (
        <Section title="Rincian Rubrik">
          <div className="space-y-2">
            {breakdown.map((c: any, i: number) => (
              <div key={i} className="p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-700">{c.criterion}</p>
                  <p className="text-xs text-gray-500">{c.score}/{c.maxScore}</p>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.maxScore > 0 ? (c.score / c.maxScore) * 100 : 0}%` }} />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">{c.comment}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
      {(output.teacherNotes as string[] ?? []).length > 0 && (
        <Section title="Catatan Guru" items={output.teacherNotes as string[]} />
      )}
    </div>
  );
}

function StructuredTextAnalysis({ output }: { output: Record<string, unknown> }) {
  return (
    <div className="space-y-3 text-sm">
      {(output.summary as string) && (
        <Section title="Ringkasan Analisis">
          <p className="text-gray-600">{(output.summary as string) ?? ""}</p>
        </Section>
      )}
      {(output.mainIdeas as string[] ?? []).length > 0 && (
        <Section title="Gagasan Utama" items={output.mainIdeas as string[]} />
      )}
      {(output.structureAnalysis as string[] ?? []).length > 0 && (
        <Section title="Analisis Struktur" items={output.structureAnalysis as string[]} />
      )}
      {(output.languageAnalysis as string[] ?? []).length > 0 && (
        <Section title="Analisis Bahasa" items={output.languageAnalysis as string[]} />
      )}
      {(output.strengths as string[] ?? []).length > 0 && (
        <Section title="Kekuatan" items={output.strengths as string[]} icon="check" />
      )}
      {(output.weaknesses as string[] ?? []).length > 0 && (
        <Section title="Kelemahan" items={output.weaknesses as string[]} icon="alert" />
      )}
      {(output.suggestions as string[] ?? []).length > 0 && (
        <Section title="Saran Perbaikan" items={output.suggestions as string[]} icon="bulb" />
      )}
    </div>
  );
}

function StructuredBCAssistant({ output, onSuggestedAgent }: { output: Record<string, unknown>; onSuggestedAgent?: (agentId: string) => void }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="p-4 bg-white border border-gray-100 rounded-xl">
        <p className="text-gray-800 whitespace-pre-wrap">{(output.reply as string) ?? ""}</p>
      </div>
      {(output.suggestedAgent as string) && onSuggestedAgent && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
          <p className="text-xs font-medium text-emerald-700 mb-2">
            AI menyarankan untuk menggunakan agent berikut:
          </p>
          <button
            onClick={() => onSuggestedAgent(output.suggestedAgent as string)}
            className="text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
          >
            Beralih ke {output.suggestedAgent as string}
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, items, icon, children }: { title: string; items?: string[]; icon?: string; children?: React.ReactNode }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="font-medium text-gray-700 mb-2">{title}</p>
      {items && items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
              {icon === "check" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />}
              {icon === "alert" && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />}
              {!icon && <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />}
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SubSection({ label, items }: { label: string; items?: string[] }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <ul className="space-y-0.5">
        {(items ?? []).map((item, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
            <span className="w-1 h-1 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AgentResultPanel({ agentId, result, loading, error, isStreaming = false, streamingText = "", streamingProvider = "", streamingModel = "", streamProgress = "", streamCancelled = false, streamIncomplete = false, onCancelStream, onRegenerate, onClear, onSuggestedAgent, onSave, saveState = "idle", saveError, onExportDocx, exportDocxState = "idle", onExportPptx, exportPptxState = "idle", onExportPdf, exportPdfState = "idle", resultSource, savedResultId }: AgentResultPanelProps) {
  if (loading) {
    if (isStreaming && (streamingText || streamProgress || streamingProvider)) {
      return (
        <div className="space-y-4">
          {streamingProvider && (
            <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span className="text-xs text-gray-500">
                  {streamingProvider}/{streamingModel || "..."}
                </span>
                {streamProgress && (
                  <span className="text-xs text-gray-400 ml-1">{streamProgress}</span>
                )}
              </div>
              <span className="text-[10px] text-gray-400">Hasil sementara</span>
            </div>
          )}
          {streamingText ? (
            <div className="p-4 bg-white border border-gray-100 rounded-xl">
              <p className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto">
                {streamingText}
                <span className="inline-block w-1.5 h-4 bg-emerald-500 animate-pulse ml-0.5 align-middle rounded-sm" />
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
              <p className="text-sm font-medium text-gray-600">AI sedang menulis...</p>
              {streamProgress && (
                <p className="text-xs text-gray-400 mt-1">{streamProgress}</p>
              )}
            </div>
          )}
          {onCancelStream && (
            <div className="flex justify-center">
              <button
                onClick={onCancelStream}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Hentikan
              </button>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="text-sm font-medium text-gray-600">AI sedang memproses permintaan...</p>
        <p className="text-xs text-gray-400 mt-1">Ini bisa memakan waktu beberapa detik</p>
      </div>
    );
  }

  if (error) {
    if (streamIncomplete && streamingText) {
      return (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 mb-1">
                  {streamCancelled ? "Pembuatan dihentikan" : "Streaming terputus"}
                </p>
                <p className="text-xs text-amber-600">{error}</p>
              </div>
            </div>
          </div>
          {streamingText && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">Hasil sementara (belum lengkap)</p>
              </div>
              <div className="p-4 bg-white border border-gray-200 rounded-xl max-h-60 overflow-y-auto">
                <pre className="text-xs text-gray-500 whitespace-pre-wrap font-sans leading-relaxed">
                  {streamingText}
                </pre>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRegenerate}>
              <RotateCw className="w-3.5 h-3.5 mr-1" />
              Coba Lagi
            </Button>
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="w-3.5 h-3.5 mr-1" />
              Hapus
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 mb-1">Gagal memproses</p>
            <p className="text-xs text-red-600">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onRegenerate}>
              <RotateCw className="w-3.5 h-3.5 mr-1" />
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Sparkles className="w-12 h-12 mb-4" />
        <p className="text-sm font-medium text-gray-500">Belum ada hasil</p>
        <p className="text-xs text-gray-400 mt-1">Pilih agent dan isi form untuk mulai</p>
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 mb-1">{result.error || "Gagal memproses"}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onRegenerate}>
              <RotateCw className="w-3.5 h-3.5 mr-1" />
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isAlreadySaved = savedResultId !== null && savedResultId !== undefined;
  const canSave = onSave && !isAlreadySaved && saveState !== "saved";

  return (
    <div className="space-y-4">
      {/* Quality + Metadata bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
        <div className="flex items-center gap-3">
          <QualityBadge score={result.qualityScore} />
          <span className="text-xs text-gray-500">
            {result.provider}/{result.model}
          </span>
          <span className="text-xs text-gray-400">{result.latencyMs}ms</span>
        </div>
        <div className="flex items-center gap-2">
          {resultSource === "history" && (
            <span className="text-[10px] text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
              Riwayat
            </span>
          )}
          {result.warnings.length > 0 && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {result.warnings.length} peringatan
            </span>
          )}
          <button onClick={onClear} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Structured view based on agent type */}
      {result.output && (
        <>
          {agentId === "rpp" && <RPPDisplay output={result.output} />}
          {agentId === "soal" && <StructuredSoal output={result.output} />}
          {agentId === "ppt" && <StructuredPPT output={result.output} />}
          {agentId === "review" && <StructuredReview output={result.output} />}
          {agentId === "eyd" && <StructuredEYD output={result.output} />}
          {agentId === "feedback" && <StructuredFeedback output={result.output} />}
          {agentId === "grading" && <StructuredGrading output={result.output} />}
          {agentId === "text-analysis" && <StructuredTextAnalysis output={result.output} />}
          {agentId === "bc-assistant" && <StructuredBCAssistant output={result.output} onSuggestedAgent={onSuggestedAgent} />}
        </>
      )}

        {/* Editable text output */}
      {result.text && !result.output && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Hasil (format teks mentah)</p>
            <CopyButton text={result.text} />
          </div>
          <div className="p-3 bg-white border border-gray-200 rounded-xl max-h-80 overflow-y-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {result.text}
            </pre>
          </div>
        </div>
      )}
      {/* Editable text when output also exists (RPP/Soal/PPT have both) */}
      {result.text && result.output && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Dokumen Siap Edit</p>
            <CopyButton text={result.output?.editableText as string ?? result.text} />
          </div>
          <div className="p-3 bg-white border border-gray-200 rounded-xl max-h-80 overflow-y-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {(result.output?.editableText as string) || result.text}
            </pre>
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-xs font-medium text-amber-700 mb-1">Peringatan</p>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-600 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RotateCw className="w-3.5 h-3.5 mr-1" />
          Generate Ulang
        </Button>
        {canSave ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Menyimpan...</>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Simpan</>
            )}
          </Button>
        ) : onSave ? (
          <Button variant="outline" size="sm" disabled className="text-emerald-600 border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
            Sudah tersimpan
          </Button>
        ) : null}
        {/* DOCX Export (RPP/Soal) */}
        {(agentId === "rpp" || agentId === "soal") && onExportDocx ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportDocx}
            disabled={exportDocxState === "loading"}
          >
            {exportDocxState === "loading" ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Menyiapkan DOCX...</>
            ) : (
              <><FileText className="w-3.5 h-3.5 mr-1" /> Download DOCX</>
            )}
          </Button>
        ) : (agentId === "rpp" || agentId === "soal") ? (
          <Button variant="outline" size="sm" disabled className="opacity-50" title="Ekspor untuk fitur ini segera hadir.">
            <FileText className="w-3.5 h-3.5 mr-1" /> DOCX
          </Button>
        ) : null}
        {/* PDF Export (RPP/Soal) */}
        {(agentId === "rpp" || agentId === "soal") && onExportPdf ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPdf}
            disabled={exportPdfState === "loading"}
          >
            {exportPdfState === "loading" ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Menyiapkan PDF...</>
            ) : (
              <><FileText className="w-3.5 h-3.5 mr-1" /> Download PDF</>
            )}
          </Button>
        ) : (agentId === "rpp" || agentId === "soal") ? (
          <Button variant="outline" size="sm" disabled className="opacity-50" title="Ekspor untuk fitur ini segera hadir.">
            <FileText className="w-3.5 h-3.5 mr-1" /> PDF
          </Button>
        ) : null}
        {/* PPTX Export (PPT) */}
        {agentId === "ppt" && onExportPptx ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportPptx}
            disabled={exportPptxState === "loading"}
          >
            {exportPptxState === "loading" ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Menyiapkan PPTX...</>
            ) : (
              <><Monitor className="w-3.5 h-3.5 mr-1" /> Download PPTX</>
            )}
          </Button>
        ) : agentId === "ppt" ? (
          <Button variant="outline" size="sm" disabled className="opacity-50" title="Ekspor untuk fitur ini segera hadir.">
            <Monitor className="w-3.5 h-3.5 mr-1" /> PPTX
          </Button>
        ) : null}
        {/* Export untuk agent baru — disabled, coming soon */}
        {(agentId === "eyd" || agentId === "feedback" || agentId === "grading" || agentId === "text-analysis") && (
          <>
            <Button variant="outline" size="sm" disabled className="opacity-50 text-[10px]" title="Ekspor untuk fitur ini segera hadir.">
              <FileText className="w-3.5 h-3.5 mr-1" /> DOCX
            </Button>
            <Button variant="outline" size="sm" disabled className="opacity-50 text-[10px]" title="Ekspor untuk fitur ini segera hadir.">
              <Monitor className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
          </>
        )}
      </div>
      {saveError && saveState === "error" && (
        <div className="p-2 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-xs text-red-600">{saveError}</p>
        </div>
      )}
    </div>
  );
}
