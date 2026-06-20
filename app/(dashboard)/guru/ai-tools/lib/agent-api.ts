/**
 * Agent API client — typed helper for POST /api/ai/agents/run
 *
 * Maps error codes to user-friendly Indonesian messages.
 */

export type AgentId = "rpp" | "soal" | "ppt" | "review" | "bc-assistant" | "eyd" | "feedback" | "grading" | "text-analysis";

export interface AgentRunResponse {
  success: boolean;
  agentId: AgentId;
  output: Record<string, unknown> | null;
  text: string | null;
  error: string | null;
  warnings: string[];
  qualityScore: number;
  provider: string;
  model: string;
  latencyMs: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUSD: number;
    provider: string;
    model: string;
    durationMs: number;
  };
}

export interface AgentErrorResponse {
  error: string;
}

export interface QuotaErrorInfo {
  error: string;
  message: string;
  quota?: {
    plan: string;
    creditsRequired: number;
    creditsUsed: number;
    creditsTotal: number;
    remainingCredits: number;
    resetAt: string | null;
    upgradeRecommended: boolean;
  };
}

export function isQuotaError(data: unknown): data is QuotaErrorInfo {
  return typeof data === "object" && data !== null && "error" in data && (data as any).error === "QUOTA_EXCEEDED";
}

function getUserFriendlyMessage(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes("auth") || lower.includes("unauthorized") || lower.includes("login")) {
    return "Sesi Anda sudah berakhir. Silakan login kembali.";
  }
  if (lower.includes("rate") || lower.includes("limit") || lower.includes("429")) {
    return "Batas penggunaan AI sementara tercapai. Coba lagi sebentar lagi atau tingkatkan paket Anda.";
  }
  if (lower.includes("provider") || lower.includes("busy") || lower.includes("timeout")) {
    return "AI sedang sibuk. Silakan coba lagi beberapa saat.";
  }
  if (lower.includes("validasi") || lower.includes("validation") || lower.includes("output")) {
    return "Hasil AI belum sesuai format. Silakan coba ulangi dengan instruksi yang lebih spesifik.";
  }
  if (lower.includes("input") || lower.includes("required") || lower.includes("invalid")) {
    return "Data belum lengkap. Mohon periksa kembali isian Anda.";
  }
  if (lower.includes("quota_exceeded") || lower.includes("quota")) {
    return "Credit AI Anda sudah habis.";
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}

export async function runAgent(
  agentId: AgentId,
  input: Record<string, unknown>
): Promise<AgentRunResponse> {
  const res = await fetch("/api/ai/agents/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, input }),
  });

  if (res.status === 401) {
    throw new Error("Sesi Anda sudah berakhir. Silakan login kembali.");
  }

  if (res.status === 429) {
    throw new Error("Batas penggunaan AI sementara tercapai. Coba lagi sebentar lagi atau tingkatkan paket Anda.");
  }

  const data = await res.json();

  // Handle quota exceeded (402)
  if (res.status === 402 && isQuotaError(data)) {
    throw new QuotaExceededError(data.message, data.quota);
  }

  if (!res.ok || data.success === false) {
    const msg = data.error || "Terjadi kesalahan. Silakan coba lagi.";
    throw new Error(getUserFriendlyMessage(msg));
  }

  return data as AgentRunResponse;
}

export class QuotaExceededError extends Error {
  public quota: QuotaErrorInfo["quota"];

  constructor(message: string, quota?: QuotaErrorInfo["quota"]) {
    super(message);
    this.name = "QuotaExceededError";
    this.quota = quota;
  }
}

// ─── Streaming support (Phase 7) ──────────────────────────

export interface StreamCallbacks {
  onStart?: () => void;
  onTextDelta?: (text: string) => void;
  onProgress?: (message: string) => void;
  onProvider?: (provider: string, model: string) => void;
  onFinalResult?: (result: AgentRunResponse) => void;
  onError?: (code: string, message: string) => void;
  onDone?: () => void;
}

export interface StreamEvent {
  type: string;
  agentId?: string;
  text?: string;
  message?: string;
  result?: AgentRunResponse;
  code?: string;
  error?: string;
  provider?: string;
  model?: string;
}

/**
 * Run an agent with streaming support.
 * Calls callbacks as SSE events arrive.
 * Falls back to non-streaming runAgent() if stream connection fails.
 *
 * Returns an AbortController so the caller can cancel the stream.
 */
export function runAgentStream(
  agentId: AgentId,
  input: Record<string, unknown>,
  callbacks: StreamCallbacks
): { abort: () => void } {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch("/api/ai/agents/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, input }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = "Terjadi kesalahan. Silakan coba lagi.";
        try {
          const err = await res.json();
          msg = err.error || msg;
        } catch {}
        callbacks.onError?.("HTTP_ERROR", msg);
        callbacks.onDone?.();
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onError?.("STREAM_UNAVAILABLE", "Stream tidak tersedia.");
        callbacks.onDone?.();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: AgentRunResponse | null = null;
      let hasErrorEvent = false;

      callbacks.onStart?.();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          // Skip empty lines, keepalives, comments
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (!trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6).trim();
          // Skip [DONE] marker
          if (data === "[DONE]") continue;
          // Skip if data field is empty (malformed)
          if (!data) continue;

          try {
            const event = JSON.parse(data);

            // Validate event has a type field
            if (!event || typeof event !== "object" || !event.type) {
              continue;
            }

            const type = String(event.type);

            switch (type) {
              case "start":
                callbacks.onStart?.();
                break;
              case "text_delta":
                callbacks.onTextDelta?.(event.text ?? "");
                break;
              case "progress":
                callbacks.onProgress?.(event.message ?? "");
                break;
              case "provider":
                if (event.provider && event.model) {
                  callbacks.onProvider?.(event.provider, event.model);
                }
                break;
              case "final_result":
                if (event.result) {
                  finalResult = event.result as AgentRunResponse;
                  callbacks.onFinalResult?.(finalResult);
                }
                break;
              case "quota_error":
                hasErrorEvent = true;
                callbacks.onError?.("QUOTA_EXCEEDED", event.message ?? "Credit AI Anda sudah habis.");
                break;
              case "error":
                hasErrorEvent = true;
                callbacks.onError?.(event.code ?? "UNKNOWN", event.error ?? event.message ?? "Terjadi kesalahan.");
                break;
              case "done":
                callbacks.onDone?.();
                break;
              // Unknown event types are silently ignored (dev logging only)
            }
          } catch {
            // Malformed JSON in SSE data field — skip silently, don't crash
          }
        }
      }

      // After stream fully consumed:
      // If we got a final_result, don't send extra error
      if (!finalResult && !hasErrorEvent) {
        callbacks.onError?.("INCOMPLETE", "Koneksi streaming terputus. Silakan coba ulangi.");
      }
    } catch (e) {
      // AbortError means user cancelled — handled separately
      if (e instanceof Error && e.name === "AbortError") {
        callbacks.onError?.("CANCELLED", "Pembuatan dihentikan.");
      } else {
        const msg = e instanceof Error
          ? "Koneksi streaming terganggu. Silakan coba lagi."
          : "Koneksi streaming terputus. Silakan coba ulangi.";
        callbacks.onError?.("CONNECTION_ERROR", msg);
      }
      callbacks.onDone?.();
    }
  })();

  return {
    abort: () => {
      try { controller.abort(); } catch {}
    },
  };
}

export async function listAgents(): Promise<{ agents: { id: string; name: string; description: string }[] }> {
  const res = await fetch("/api/ai/agents");
  if (!res.ok) return { agents: [] };
  return res.json();
}
