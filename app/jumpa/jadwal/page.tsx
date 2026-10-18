import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col gap-5 px-4 pb-10 pt-[max(20px,env(safe-area-inset-top))] sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--jp-accent)]">JUMPA</p>
        <Link href={backHref} className="jumpa-ghost !min-h-[44px]"><ArrowLeft size={16} /> Kembali</Link>
      </header>
      {!data ? (
        <section className="jumpa-card jumpa-lobby-info text-center">
          <h1 className="text-xl font-extrabold">Hanya guru yang bisa menjadwalkan</h1>
          <p className="mt-2 text-sm text-[var(--jp-text-2)]">Kamu tetap bisa bergabung saat gurumu memulai JUMPA.</p>
          <Link href="/jumpa" className="jumpa-primary mt-5 w-full">Buka JUMPA</Link>
        </section>
      ) : ubah && !editing ? (
        <section className="jumpa-card jumpa-lobby-info text-center">
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
