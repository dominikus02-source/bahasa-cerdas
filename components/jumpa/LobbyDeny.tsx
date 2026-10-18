"use client";

/**
 * Status "belum bisa masuk" di lobby: judul singkat + satu kalimat + aksi.
 * NOT_STARTED menyegarkan halaman sendiri saat ruang dibuka.
 */
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarX2, CheckCircle2, Clock, Lock, RotateCcw, ShieldCheck, UserX, Users, type LucideIcon } from "lucide-react";
import { JUMPA_EARLY_JOIN_MIN } from "@/lib/jumpa/caps";
import { formatWibTime } from "@/lib/jumpa/schedule";

interface DenyView { icon: LucideIcon; title: string; body: string | null; retry?: boolean; history?: boolean }

function view(code: string | null, message: string | null, scheduledAt: string | null, max: number): DenyView {
  switch (code) {
    case "NOT_STARTED": {
      const open = scheduledAt ? new Date(new Date(scheduledAt).getTime() - JUMPA_EARLY_JOIN_MIN * 60_000) : null;
      return { icon: Clock, title: "JUMPA belum dibuka", body: open ? `Dibuka pukul ${formatWibTime(open)} WIB. Halaman ini akan terbuka sendiri.` : "Tunggu pemandu memulai." };
    }
    case "ROOM_CANCELLED":
      return { icon: CalendarX2, title: "JUMPA dibatalkan", body: "Cek jadwal terbaru di riwayat.", history: true };
    case "ROOM_ENDED":
    case "ROOM_EXPIRED":
      return { icon: CheckCircle2, title: "JUMPA sudah selesai", body: null, history: true };
    case "ROOM_LOCKED":
      return { icon: Lock, title: "Ruang dikunci", body: "Tunggu pemandu membukanya.", retry: true };
    case "ROOM_FULL":
      return { icon: Users, title: "Ruang penuh", body: `Batas paket ${max} orang. Coba lagi saat ada yang keluar.`, retry: true };
    case "NOT_INVITED":
    case "NOT_GROUP_MEMBER":
    case "NOT_COMMUNITY_MEMBER":
      return { icon: UserX, title: "Kamu tidak terdaftar", body: message };
    case "REMOVED":
      return { icon: UserX, title: "Kamu sudah dikeluarkan", body: null };
    case "JUNIOR_NOT_ALLOWED":
      return { icon: ShieldCheck, title: "Belum untuk akun Junior", body: message };
    default:
      return { icon: Lock, title: message ?? "Kamu belum bisa masuk ke ruang ini.", body: null };
  }
}

export default function LobbyDeny({ code, message, scheduledAt, maxParticipants }: { code: string | null; message: string | null; scheduledAt: string | null; maxParticipants: number }) {
  const router = useRouter();
  const v = view(code, message, scheduledAt, maxParticipants);
  const Icon = v.icon;

  useEffect(() => {
    if (code !== "NOT_STARTED") return;
    const openAt = scheduledAt ? new Date(scheduledAt).getTime() - JUMPA_EARLY_JOIN_MIN * 60_000 : 0;
    const wait = Math.max(5_000, Math.min(60_000, openAt - Date.now() + 1_000));
    const t = window.setTimeout(() => router.refresh(), wait);
    return () => window.clearTimeout(t);
  });

  return (
    <div role="alert" className="jumpa-card grid w-full justify-items-center gap-2 p-5 text-center md:justify-items-start md:text-left">
      <span className="jumpa-empty-icon" aria-hidden><Icon size={22} /></span>
      <p className="text-base font-extrabold">{v.title}</p>
      {v.body && <p className="text-sm text-[var(--jp-text-2)]">{v.body}</p>}
      {v.retry && (
        <button type="button" className="jumpa-ghost mt-1" onClick={() => router.refresh()}><RotateCcw size={16} /> Coba lagi</button>
      )}
      {v.history && <Link href="/jumpa/riwayat" className="jumpa-ghost mt-1">Lihat riwayat</Link>}
    </div>
  );
}
