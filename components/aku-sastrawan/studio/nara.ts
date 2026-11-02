"use client";

export type HasilNara = { ok: true; teks: string } | { ok: false; pesan: string; terkunci: boolean };

const PESAN_UMUM = "NARA sedang beristirahat sebentar. Naskahmu tetap aman — coba lagi nanti.";

/** Panggil Pendamping Menulis AI (backend tidak diubah). Tidak pernah melempar galat. */
export async function tanyaNara(input: { prompt: string; track: "novel" | "cerpen"; task: string; context: string }): Promise<HasilNara> {
  try {
    const res = await fetch("/api/aku-sastrawan/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, context: input.context.slice(0, 12_000) }),
    });
    const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string; message?: string };
    if (res.ok && typeof data.reply === "string" && data.reply.trim()) return { ok: true, teks: data.reply.trim() };
    if (res.status === 403) return { ok: false, pesan: "NARA hanya menemani selama Premium aktif. Karyamu tetap aman.", terkunci: true };
    if (res.status === 429) return { ok: false, pesan: "Terlalu cepat. Tunggu sebentar, lalu coba lagi.", terkunci: false };
    return { ok: false, pesan: PESAN_UMUM, terkunci: false };
  } catch {
    return { ok: false, pesan: PESAN_UMUM, terkunci: false };
  }
}
