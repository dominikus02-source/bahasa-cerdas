import { redirect } from "next/navigation";

/**
 * Main Bersama sekarang memakai 2 layar saja:
 * 1) layar Guru = pusat kendali + tampilan guru;
 * 2) perangkat Murid = layar bermain.
 *
 * Route lama Layar Kelas tetap diarahkan ke Ruang Guru agar bookmark lama
 * tidak membuka surface ketiga dan guru tidak kembali ke alur 3 layar.
 */
export const metadata = {
  title: "Main Bersama — Ruang Guru",
  robots: { index: false, follow: false },
};

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  redirect(`/guru/game/main-bersama/ruang/${sessionId}`);
}
