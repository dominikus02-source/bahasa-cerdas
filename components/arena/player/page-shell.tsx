"use client";

import type { ReactNode } from "react";
import { PlayerHeader } from "./player-header";
import { usePlayerProfile } from "./player-context";

/** Shell halaman Player: judul + (opsional) header profil pemain + konten.
 *  ARENA 2.0: showProfile=false untuk halaman fokus (mis. Badge) agar tidak
 *  menampilkan XP/progres pemain di halaman yang bukan tempatnya. */
export function PlayerPageShell({
  title,
  subtitle,
  name,
  showProfile = true,
  children,
}: {
  title: string;
  subtitle?: string;
  name: string;
  showProfile?: boolean;
  children: ReactNode;
}) {
  const profile = usePlayerProfile();

  return (
    <div className="space-y-4 px-4 py-5">
      <div>
        <h1 className="text-xl font-black text-[var(--px-text)]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs font-medium text-[var(--px-text-dim)]">{subtitle}</p>}
      </div>
      {showProfile && profile ? <PlayerHeader name={name} profile={profile} /> : null}
      {children}
    </div>
  );
}
