import { StudentGameClient } from '@/components/main-bersama/student/game-client';

/**
 * Ruang siswa (Tahap 7 §9/§11/§15/§16/§20) — client mengambil
 * StudentSessionView via GET authoritative dengan credential dari
 * credential-store. Bila credential tidak ada/invalid → kembali ke
 * join. Representative route untuk future ayo.bahasacerdas.com.
 */
export const metadata = {
  title: 'Main Bersama — Ruang Siswa',
  robots: { index: false, follow: false },
};

export default async function StudentRoomPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <StudentGameClient sessionId={sessionId} />;
}
