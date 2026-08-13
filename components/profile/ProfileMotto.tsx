"use client";

import { Quote, CalendarDays } from "lucide-react";

/**
 * ProfileMotto — kartu "moto pribadi". Hanya menampilkan bio asli dan tanggal
 * bergabung asli; bila bio kosong, kartu menampilkan tanggal bergabung saja
 * (tanpa mengarang moto).
 */
export default function ProfileMotto({
  bio,
  joinedAt,
  isOwn,
  onEditProfile,
}: {
  bio?: string | null;
  /** ISO date (atau string tanggal) kapan akun dibuat. */
  joinedAt?: string | null;
  isOwn?: boolean;
  onEditProfile?: () => void;
}) {
  if (!bio && !joinedAt) return null;

  const joinedText = joinedAt
    ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
        new Date(joinedAt),
      )
    : null;

  return (
    <div
      className="mb-6 rounded-2xl px-5 py-4 text-slate-900 dark:text-white ring-1 ring-slate-900/10 dark:ring-white/10 bc-card-premium"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-400/20"
        >
          <Quote size={16} className="text-violet-300" />
        </span>
        <div className="min-w-0">
          {bio ? (
            <p className="text-sm leading-relaxed text-slate-900/80 dark:text-white/80">{bio}</p>
          ) : (
            isOwn && (
              <p className="text-sm text-slate-900/45 dark:text-white/45 italic">
                Belum ada moto.{" "}
                <button onClick={onEditProfile} className="underline text-slate-900/70 dark:text-white/70 hover:text-slate-900 dark:text-white">
                  Tulis moto singkat?
                </button>
              </p>
            )
          )}
          {joinedText && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-slate-900/40 dark:text-white/40">
              <CalendarDays size={12} /> Bergabung sejak {joinedText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}