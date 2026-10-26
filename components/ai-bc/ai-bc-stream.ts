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
    let detail =
      res.status === 401
        ? "Sesi kamu sudah berakhir. Silakan masuk lagi untuk ngobrol dengan Nara."
        : res.status === 429
          ? "Kamu mengirim pesan terlalu cepat. Tunggu sebentar, lalu coba lagi ya."
          : "Maaf, Nara sedang sibuk. Coba lagi sebentar ya.";
    try {
      const data = (await res.json()) as { error?: string };
      // Hanya pesan server untuk galat 5xx (salinan ramah dari route); galat 4xx
      // bisa berisi teks teknis berbahasa Inggris, jadi pakai pesan bawaan.
      if (data.error && res.status >= 500) detail = data.error;
    } catch {
      // abaikan — pakai pesan default
    }
    throw new BcStreamError(detail);
  }

  if (!res.body) {
    throw new BcStreamError("Jawaban Nara tidak dapat dibaca. Coba lagi ya.");
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
        throw new BcStreamError(typeof data.message === "string" ? data.message : "Maaf, Nara sedang sibuk. Coba lagi sebentar ya.");
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

    // Selesaikan decoding karakter UTF-8 yang mungkin terbelah antar-chunk.
    buffer += decoder.decode();

    // Sisa buffer (frame terakhir tanpa penutup ganda).
    if (buffer.trim()) {
      try {
        handleFrame(buffer);
      } catch {
        // frame tak lengkap — abaikan
      }
    }

    if (!text.trim()) {
      throw new BcStreamError("Nara belum mengirim jawaban. Silakan coba lagi.");
    }

    return { text, provider, model };
  } catch (e) {
    if (e instanceof BcStreamError) throw e;
    throw new BcStreamError("Koneksi ke Nara terputus. Periksa internetmu, lalu coba lagi.");
  } finally {
    reader.releaseLock();
  }
}