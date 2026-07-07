// Deprecated: AI generation is centralized in /guru/ai-tools.
// Form lama di halaman ini memanggil endpoint terpisah /api/ai/grading —
// sekarang diarahkan ke agent "grading" di workspace Alat AI utama
// (endpoint tunggal /api/ai/agents/run) agar tidak ada dua logic AI.
import { redirect } from "next/navigation";

export default function LegacyRedirect() {
  redirect("/guru/ai-tools?agent=grading");
}
