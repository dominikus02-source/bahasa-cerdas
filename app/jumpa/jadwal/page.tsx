import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import JumpaThemeToggle from "@/components/jumpa/JumpaThemeToggle";
import { getUser } from "@/lib/supabase/server";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { loadEditableSchedule, loadScheduleForm } from "@/lib/jumpa/scheduling";
import ScheduleForm from "@/components/jumpa/ScheduleForm";

export const dynamic = "force-dynamic";

/** /jumpa/jadwal — guru menjadwalkan JUMPA (?kelas=<id>) atau mengubahnya (?ubah=<kode>). */
export default async function JumpaJadwalPage({ searchParams }: { searchParams: Promise<{ kelas?: string | string[]; ubah?: string | string[] }> }) {
  const sp = await searchParams;
  const kelas = typeof sp.kelas === "string" ? sp.kelas : null;
  const ubah = typeof sp.ubah === "string" && isValidRoomCode(sp.ubah) ? sp.ubah : null;
  const user = await getUser();
  if (!user) {
    const q = ubah ? `?ubah=${ubah}` : kelas ? `?kelas=${encodeURIComponent(kelas)}` : "";
    redirect(`/login?next=${encodeURIComponent(`/jumpa/jadwal${q}`)}`);
  }

  const [data, editing] = await Promise.all([loadScheduleForm(user), ubah ? loadEditableSchedule(user, ubah) : Promise.resolve(null)]);
  const groupId = editing?.groupId ?? kelas;
  const backHref = groupId ? `/guru/kelasku?kelas=${encodeURIComponent(groupId)}` : "/jumpa";

  return (
    <main className="jumpa-home mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col gap-5 px-4 pb-12 pt-[max(24px,env(safe-area-inset-top))] sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Link href="/jumpa" className="jumpa-brand" aria-label="Beranda JUMPA"><span className="jumpa-mark jumpa-mark-sm" aria-hidden>J</span>JUMPA</Link>
        <div className="flex items-center gap-2"><JumpaThemeToggle /><Link href={backHref} className="ui-btn ui-btn--ghost"><ArrowLeft size={16} /> Kembali</Link></div>
      </header>
      <section className="flex items-start gap-3 py-2 sm:py-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-bc-card border border-bc-line bg-bc-surface text-bc-accent"><CalendarClock size={22} /></span>
        <div><h1 className="text-2xl font-bold text-bc-text">{editing ? "Ubah jadwal JUMPA" : "Jadwalkan JUMPA"}</h1><p className="mt-1 text-sm text-bc-text-2">Atur waktu, peserta, dan pengingat dalam satu tempat.</p></div>
      </section>
      {!data ? (
        <section className="rounded-bc-card border border-bc-line bg-bc-surface p-6 text-center shadow-sm">
          <h1 className="text-xl font-extrabold">Hanya guru yang bisa menjadwalkan</h1>
          <p className="mt-2 text-sm text-[var(--jp-text-2)]">Kamu tetap bisa bergabung saat gurumu memulai JUMPA.</p>
          <Link href="/jumpa" className="jumpa-primary mt-5 w-full">Buka JUMPA</Link>
        </section>
      ) : ubah && !editing ? (
        <section className="rounded-bc-card border border-bc-line bg-bc-surface p-6 text-center shadow-sm">
          <h1 className="text-xl font-extrabold">Jadwal tidak bisa diubah</h1>
          <p className="mt-2 text-sm text-[var(--jp-text-2)]">JUMPA ini sudah dimulai, selesai, atau bukan buatanmu.</p>
          <Link href="/jumpa/riwayat" className="jumpa-primary mt-5 w-full">Lihat jadwal</Link>
        </section>
      ) : (
        <ScheduleForm data={data} initialGroupId={kelas} editing={editing} backHref={backHref} />
      )}
    </main>
  );
}
