"use client";

import { Users, Trophy } from "lucide-react";
import UserAvatar from "@/components/arena/UserAvatar";

export interface ConnectionPreview {
  id: string;
  displayName: string;
  avatar: string | null;
}

/**
 * SocialConnections — kartu komunitas: pengikut & yang diikuti dengan
 * pratinjau avatar nyata (+N lain dihitung dari selisih nyata), plus chip
 * XP mingguan. Menggantikan tampilan kartu Komunitas lama tanpa kehilangan
 * informasinya.
 */
export default function SocialConnections({
  followerCount,
  followingCount,
  followers,
  following,
  onView,
  weeklyXp,
  weeklyLabel,
  leaderboardHref,
  likeNote,
}: {
  followerCount: number;
  followingCount: number;
  followers: ConnectionPreview[];
  following: ConnectionPreview[];
  onView?: (user: ConnectionPreview) => void;
  weeklyXp?: number;
  weeklyLabel?: string;
  leaderboardHref?: string;
  /** Catatan nyata, mis. "Profilmu disukai N murid". */
  likeNote?: string | null;
}) {
  const extraFollowers = Math.max(0, followerCount - followers.length);
  const extraFollowing = Math.max(0, followingCount - following.length);

  const stack = (list: ConnectionPreview[]) =>
    list.length === 0 ? (
      <span className="text-xs text-white/35">Belum ada</span>
    ) : (
      <div className="flex items-center">
        {list.slice(0, 6).map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onView?.(p)}
            title={p.displayName}
            aria-label={`Profil ${p.displayName}`}
            className="-ml-2 first:ml-0 rounded-full ring-2 ring-[#17163F] transition-transform hover:-translate-y-0.5"
            style={{ zIndex: 10 - i }}
          >
            <UserAvatar
              size={30}
              avatar={p.avatar}
              frame={null}
              initials={(p.displayName || "?").slice(0, 1).toUpperCase()}
              gradient=""
              className="bg-white bg-white/8 dark:bg-slate-900/8"
            />
          </button>
        ))}
        {extraFollowers + extraFollowing > 0 && (
          <span className="ml-1.5 text-[11px] font-semibold text-white/45 tabular-nums">
            +{extraFollowers + extraFollowing}
          </span>
        )}
      </div>
    );

  return (
    <div
      className="rounded-2xl text-white ring-1 ring-white/10 p-5"
      style={{ background: "linear-gradient(135deg, #17163F 0%, #21174F 100%)" }}
    >
      <h3 className="inline-flex items-center gap-2 text-sm font-bold text-white/90 mb-4">
        <Users size={15} className="text-violet-300" /> Komunitas
      </h3>

      {weeklyXp != null && (
        <button
          type="button"
          onClick={leaderboardHref ? () => (window.location.href = leaderboardHref) : undefined}
 className="mb-4 flex w-full items-center gap-2.5 rounded-xl bg-white /[0.06] ring-1 ring-white/10 px-3.5 py-3 text-left hover:bg-white dark:bg-slate-800/90/[0.09] transition-colors"
        >
          <Trophy size={16} className="text-amber-300 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/45">
              XP Mingguan
            </span>
            <span className="block text-base font-black text-white tabular-nums">
              {weeklyXp.toLocaleString("id-ID")} XP
            </span>
          </span>
          {weeklyLabel && (
            <span className="text-[10px] text-white/40 text-right leading-tight">{weeklyLabel}</span>
          )}
        </button>
      )}

      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            Pengikut <span className="text-white/80">· {followerCount.toLocaleString("id-ID")}</span>
          </p>
          {stack(followers)}
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            Mengikuti <span className="text-white/80">· {followingCount.toLocaleString("id-ID")}</span>
          </p>
          {stack(following)}
        </div>
      </div>

      {followers.length === 0 && following.length === 0 && (
        <p className="mt-4 text-xs text-white/35 leading-relaxed">
          Terhubung dengan pemain lain lewat halaman karya dan papan peringkat.
        </p>
      )}

      {likeNote && (
        <p className="mt-4 text-[11px] text-rose-300/90 font-semibold">{likeNote}</p>
      )}
    </div>
  );
}