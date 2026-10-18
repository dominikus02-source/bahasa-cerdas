import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { loadRoomSummary } from "@/lib/jumpa/scheduling";
import { MeetingSummaryView } from "@/components/jumpa/MeetingSummary";

export const dynamic = "force-dynamic";

/** /jumpa/riwayat/[kode] — ringkasan satu JUMPA; kehadiran per orang untuk guru pemilik & admin. */
export default async function JumpaRingkasanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isValidRoomCode(code)) notFound();
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/jumpa/riwayat/${code}`)}`);
  const s = await loadRoomSummary(user, code);
  if (!s) notFound();
  const heading = s.endReason === "CANCELLED" ? "JUMPA dibatalkan" : s.status === "ENDED" ? "Ringkasan JUMPA" : s.status === "LIVE" ? "Sedang berlangsung" : "Belum dimulai";
  return (
    <main className="mx-auto grid min-h-[100dvh] w-full max-w-md place-items-center px-4 py-8">
      <MeetingSummaryView s={s} heading={heading} />
    </main>
  );
}
