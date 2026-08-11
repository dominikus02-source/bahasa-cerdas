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
      className="mb-6 rounded-2xl px-5 py-4 text-white ring-1 ring-white/10"
      style={{ background: "linear-gradient(120deg, #0F1230 0%, #17163F 70%)" }}
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
            <p className="text-sm leading-relaxed text-white/80">{bio}</p>
          ) : (
            isOwn && (
              <p className="text-sm text-white/45 italic">
                Belum ada moto.{" "}
                <button onClick={onEditProfile} className="underline text-white/70 hover:text-white">
                  Tulis moto singkat?
                </button>
              </p>
            )
          )}
          {joinedText && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-white/40">
              <CalendarDays size={12} /> Bergabung sejak {joinedText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}