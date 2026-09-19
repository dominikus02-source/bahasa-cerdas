import { Suspense } from "react";
import { StudentJoinClient } from "@/components/main-bersama/student/join-client";

/**
 * Surface siswa (Tahap 7 §7) — representative route untuk future
 * `ayo.bahasacerdas.com` (§37: belum ada konfigurasi subdomain).
 * Publik: guest cukup nama; siswa login memakai identitas BC via API.
 * Scope design `.mb-scope` + token CSS disediakan layout segment.
 * PIN bisa prefill dari query (?pin=123456 — dari QR/URL guru).
 */
export const metadata = {
  title: "Gabung Main Bersama — BahasaCerdas",
  robots: { index: false, follow: false },
};

export default function StudentJoinPage() {
  return (
    <Suspense fallback={null}>
      <StudentJoinClient />
    </Suspense>
  );
}
