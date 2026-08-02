"use client";

import type { ReactNode } from "react";
import { PlayerHeader } from "./player-header";
import { usePlayerProfile } from "./player-context";

/** Shell halaman Player: judul + header profil pemain + konten. */
export function PlayerPageShell({ title, subtitle, name, children }: { title: string; subtitle?: string; name: string; children: ReactNode }) {
  const profile = usePlayerProfile();

  return (
    <div className="space-y-4 px-4 py-5">
      <div>
        <h1 className="text-xl font-black text-[var(--px-text)]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs font-medium text-[var(--px-text-dim)]">{subtitle}</p>}
      </div>
      {profile ? <PlayerHeader name={name} profile={profile} /> : null}
      {children}
    </div>
  );
}
