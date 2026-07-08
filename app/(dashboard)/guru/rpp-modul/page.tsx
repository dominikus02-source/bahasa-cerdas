// Deprecated: AI generation is centralized in /guru/ai-tools.
// Halaman generator RPP lama (job-based /api/ai/rpp) sudah dikonsolidasikan ke
// agent "rpp" di Alat AI — route ini dipertahankan agar link/bookmark lama
// tidak 404 dan langsung membuka tool RPP.
import { redirect } from "next/navigation";

export default function RppModulRedirect() {
  redirect("/guru/ai-tools?tool=rpp");
}
