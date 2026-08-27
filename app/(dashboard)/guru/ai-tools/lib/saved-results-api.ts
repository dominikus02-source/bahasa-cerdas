export type AgentId = "rpp" | "soal" | "review" | "bc-assistant" | "eyd" | "feedback" | "grading" | "text-analysis";

export interface SavedAiResult {
  id: string;
  userId: string;
  agentId: AgentId;
  title: string;
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
  editableText: string | null;
  qualityScore: number | null;
  provider: string | null;
  model: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveAiResultPayload {
  agentId: AgentId;
  title: string;
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
  editableText?: string | null;
  qualityScore?: number | null;
  provider?: string | null;
  model?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface ListSavedResultsParams {
  agentId?: string;
  limit?: number;
  cursor?: string;
}

interface ListSavedResultsResponse {
  success: boolean;
  data: SavedAiResult[];
  nextCursor: string | null;
  hasMore: boolean;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan. Silakan coba lagi.";
}

async function handleResponse(res: Response): Promise<{ success: boolean; data?: unknown; error?: string }> {
  if (res.status === 401) {
    throw new Error("Sesi Anda sudah berakhir. Silakan login kembali.");
  }
  if (res.status === 403) {
    throw new Error("Anda tidak memiliki akses ke riwayat ini.");
  }
  if (res.status === 404) {
    throw new Error("Riwayat tidak ditemukan.");
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Terjadi kesalahan. Silakan coba lagi.");
  }
  return data;
}

export async function saveAiResult(payload: SaveAiResultPayload): Promise<SavedAiResult> {
  const res = await fetch("/api/ai/agents/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  return data.data as SavedAiResult;
}

export async function listSavedResults(
  params?: ListSavedResultsParams
): Promise<ListSavedResultsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.agentId) searchParams.set("agentId", params.agentId);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.cursor) searchParams.set("cursor", params.cursor);

  const url = `/api/ai/agents/saved${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const res = await fetch(url);
  const data = await handleResponse(res);
  return data as ListSavedResultsResponse;
}

export async function getSavedResult(id: string): Promise<SavedAiResult> {
  const res = await fetch(`/api/ai/agents/saved/${id}`);
  const data = await handleResponse(res);
  return data.data as SavedAiResult;
}

export async function updateSavedResult(
  id: string,
  payload: { title?: string; metadata?: Record<string, unknown> }
): Promise<SavedAiResult> {
  const res = await fetch(`/api/ai/agents/saved/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  return data.data as SavedAiResult;
}

export async function deleteSavedResult(id: string): Promise<void> {
  const res = await fetch(`/api/ai/agents/saved/${id}`, { method: "DELETE" });
  await handleResponse(res);
}
