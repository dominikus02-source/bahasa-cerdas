/**
 * FIXTURE QA LOKAL — beranda JUMPA asli (components/jumpa/JumpaHome) dengan data
 * PALSU, di dalam .jumpa-scope + jumpa.css seperti app/jumpa/layout.tsx.
 * Hanya dikompilasi bila BC_QA_FIXTURE=1. Tanpa sesi, tanpa DB, tanpa LiveKit.
 */
import "@/components/jumpa/jumpa.css";
import { notFound } from "next/navigation";
import JumpaHome from "@/components/jumpa/JumpaHome";
import type { JumpaHomeData } from "@/lib/jumpa/service";
import { QaControls } from "../QaControls";
import { QaPathname } from "../QaPathname";

export const dynamic = "force-dynamic";

const room = (code: string, title: string, status: "LIVE" | "SCHEDULED", mine: boolean) => ({
  code, title, kind: "KELAS" as const, mode: "CLASS" as const, status, place: "Kelas 9A Bahasa Indonesia — SMP Negeri 1 Kabupaten Bandung Barat", mine,
  startedAt: status === "LIVE" ? "2026-11-09T02:00:00.000Z" : null, scheduledAt: status === "SCHEDULED" ? "2026-11-10T01:30:00.000Z" : null,
  present: { count: status === "LIVE" ? 27 : 0, initials: status === "LIVE" ? ["QA", "AB", "CD", "EF"] : [] },
});

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production" || process.env.BC_QA_FIXTURE !== "1") notFound();
  const q = await searchParams;
  const theme = q.theme === "dark" ? "dark" : "light";
  const font = Math.min(200, Math.max(80, Number(q.font) || 100));
  const data = {
    effective: "GURU", isJunior: false, canSeePanel: false,
    rooms: [room("qa-abc-def", "Diskusi Teks Eksplanasi dan Struktur Paragraf Argumentatif Panjang", "LIVE", true), room("qa-ghi-jkl", "Persiapan Asesmen Sumatif Akhir Semester", "SCHEDULED", false)],
    groups: [{ id: "g1", name: "Kelas 9A Bahasa Indonesia" }], communities: [{ id: "c1", name: "MGMP Bahasa Indonesia Kabupaten Bandung Barat" }],
    plan: { tier: "FREE", trialing: false, roomsToday: 1, roomsPerDay: 3, kelas: { maxParticipants: 40, maxDurationMin: 60 }, guru: { maxParticipants: 10, maxDurationMin: 40 }, upgradeUrl: "/guru/berlangganan" },
  } as unknown as JumpaHomeData;
  return (
    <>
      <QaControls theme={theme} app={q.app !== "0"} font={font} />
      <QaPathname pathname="/jumpa">
        <div className="jumpa-scope"><div data-qa-page="/jumpa"><JumpaHome data={data} displayName="QA Guru Palsu" dashboardHref="/guru/beranda" /></div></div>
      </QaPathname>
    </>
  );
}
