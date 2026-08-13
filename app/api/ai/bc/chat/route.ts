/**
 * POST /api/ai/bc/chat — AI BC 2.0 Chat (SSE streaming)
 *
 * AI BC — Teman cerdas untuk belajar dan mengajar Bahasa Indonesia.
 *
 * Desain (Phase 5.3):
 * - Peran pengguna DITENTUKAN DARI SESI (server-side) — payload klien
 *   TIDAK pernah membawa peran/mode. Tidak ada mode switch manual.
 * - Persona: murid → "Teman Belajarmu", guru → "Teman Guru"
 *   (src/ai/bc/personas.ts, pure).
 * - Konteks ringkas best-effort per pengguna (lib/ai-bc/context.ts).
 * - Provider chain yang sama dengan agent lain (deepseek → groq → gemini,
 *   multi-key, fallback) via streamProviderText.
 * - Guardrails input (PII/profanitas) + rate limit 30/menit (bc-assistant).
 * - Usage tercatat ke AIUsage (fire-and-forget, feature `agent:bc-assistant`).
 * - TIDAK ada pemotongan kredit/quota — chat tetap gratis, konsisten dengan
 *   perilaku legacy /api/ai/chat (bukan alat generasi berkuota).
 *
 * SSE event format: data: { "type": "delta"|"done"|"error", ... }\n\n
 */

import { NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { checkInput } from "@/src/ai/core/guardrails";
import { checkAgentRateLimit } from "@/src/ai/core/rate-limit";
import { streamProviderText } from "@/src/ai/core/provider";
import { logUsage } from "@/src/ai/core/usage-logger";
import {
  buildChatHistory,
  buildSystemPrompt,
  classifyIntent,
  getPersonaForRole,
} from "@/src/ai/bc/personas";
import { buildContextText, gatherBcContext } from "@/lib/ai-bc/context";

export const maxDuration = 60;

const AI_BC_ERROR = "Maaf, layanan AI sedang sibuk. Coba lagi sebentar ya.";

function sse(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

interface ChatBody {
  messages?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as ChatBody;
    const history = buildChatHistory(body.messages);
    if (history.length === 0) {
      return new Response(JSON.stringify({ error: "messages is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Peran murni dari sesi — payload klien tidak dipercaya untuk ini.
    const persona = getPersonaForRole(user.role);

    // Guardrails: catat peringatan, tidak memblokir (konsisten dengan core).
    const lastUserMsg = [...history].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      const guard = checkInput(lastUserMsg.content);
      if (!guard.passed) {
        console.warn(`[ai-bc] guardrail violations: ${JSON.stringify(guard.violations)}`);
      }
    }

    // Rate limit (30/menit, premium 2x).
    const rl = await checkAgentRateLimit(req, "bc-assistant", user.isPremium);
    if (rl) return rl;

    // Konteks best-effort — tidak pernah menggagalkan chat.
    const context = await gatherBcContext(user).catch(() => ({ role: persona.key as "student" | "teacher", items: [] }));
    const contextText = buildContextText(context);

    const intentMode = classifyIntent(lastUserMsg?.content ?? "");
    const systemPrompt = buildSystemPrompt({ persona, contextText, intentMode });

    const model = process.env.AI_DEFAULT_MODEL || "deepseek-chat";
    const encoder = new TextEncoder();
    const startedAt = Date.now();

    let usedProvider = "";
    let usedModel = "";
    let streamedText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await streamProviderText(
            {
              model,
              messages: [{ role: "system", content: systemPrompt }, ...history],
              temperature: 0.6,
              maxTokens: 1024,
              timeoutMs: 45000,
              responseFormat: "text",
            },
            (delta) => {
              streamedText += delta;
              controller.enqueue(encoder.encode(sse({ type: "delta", text: delta })));
            }
          );
          usedProvider = result.provider;
          usedModel = result.model;
          controller.enqueue(encoder.encode(sse({ type: "done", provider: result.provider, model: result.model })));
          controller.close();
        } catch (e) {
          const message = e instanceof Error ? e.message : "unknown";
          console.error(`[ai-bc] stream failed: ${message}`);
          controller.enqueue(encoder.encode(sse({ type: "error", message: AI_BC_ERROR })));
          controller.enqueue(encoder.encode(sse({ type: "done", provider: usedProvider || null, model: usedModel || null })));
          controller.close();
        } finally {
          void logUsage({
            userId: user.id,
            agentId: "bc-assistant",
            feature: "ai-bc-chat",
            input: { messages: history.slice(-2) },
            output: streamedText ? { reply: streamedText } : null,
            success: streamedText.length > 0,
            error: streamedText.length > 0 ? null : "empty_response",
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            costUSD: 0,
            provider: usedProvider,
            model: usedModel,
            latencyMs: Date.now() - startedAt,
            durationMs: Date.now() - startedAt,
            createdAt: new Date(),
          });
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    console.error(`[ai-bc] error: ${e instanceof Error ? e.message : "unknown"}`);
    return new Response(JSON.stringify({ error: AI_BC_ERROR }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}