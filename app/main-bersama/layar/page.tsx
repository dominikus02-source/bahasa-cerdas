import { Suspense } from 'react';
import { ProjectorClient } from '@/components/main-bersama/projector/projector-client';

export const metadata = {
  title: 'Main Bersama — Layar Kelas',
  robots: { index: false, follow: false },
};

/**
 * Surface proyektor (Tahap 7 §10/§14/§19/§20) — representative route
 * untuk future `layar.bahasacerdas.com` (§37: belum ada config DNS).
 * Read-only: tanpa kontrol permainan, tanpa data privat. Identitas
 * sesi via query (?pin=123456 atau ?sessionId=...) sehingga satu URL
 * cukup di-bookmark guru untuk dipakai proyektor.
 */
export default function ProjectorPage() {
  return (
    <Suspense fallback={null}>
      <ProjectorClient />
    </Suspense>
  );
}
