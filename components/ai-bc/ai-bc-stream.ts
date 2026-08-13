/**
 * AI BC 2.0 — SSE stream parser (client).
 *
 * Menarik respons dari POST /api/ai/bc/chat yang mengalir sebagai
 * Server-Sent Events: `data: {"type":"delta"|"done"|"error", ...}`.
 * Parser tahan terhadap chunk yang terbelah di tengah frame.
 */

export interface BcStreamResult {
  text: string;
  provider: string | null;
  model: string | null;
}

export interface BcStreamRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}

export class BcStreamError extends Error {}

/** Parsing frame SSE tunggal — diekspor agar dapat diuji tanpa jaringan. */
export function parseSseData(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function streamBcChat(req: BcStreamRequest): Promise<BcStreamResult> {
  const res = await fetch("/api/ai/bc/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: req.messages }),
    signal: req.signal,
  });

  if (!res.ok) {
    let detail = "Layanan AI sedang sibuk.";
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) detail = data.error;
    } catch {
      // abaikan — pakai pesan default
    }
    throw new BcStreamError(detail);
  }

  if (!res.body) {
    throw new BcStreamError("Respons tidak dapat dibaca.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let provider: string | null = null;
  let model: string | null = null;

  const handleFrame = (frame: string) => {
    const data = parseSseData(frame);
    if (!data) return;
    switch (data.type) {
      case "delta": {
        if (typeof data.text === "string") {
          text += data.text;
          req.onDelta(data.text);
        }
        break;
      }
      case "done": {
        if (typeof data.provider === "string") provider = data.provider;
        if (typeof data.model === "string") model = data.model;
        break;
      }
      case "error": {
        throw new BcStreamError(typeof data.message === "string" ? data.message : "Layanan AI sedang sibuk.");
      }
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        if (frame.trim()) handleFrame(frame);
      }
    }

    // Sisa buffer (frame terakhir tanpa penutup ganda).
    if (buffer.trim()) {
      try {
        handleFrame(buffer);
      } catch {
        // frame tak lengkap — abaikan
      }
    }

    return { text, provider, model };
  } catch (e) {
    if (e instanceof BcStreamError) throw e;
    throw new BcStreamError("Koneksi terputus. Coba lagi.");
  } finally {
    reader.releaseLock();
  }
}