"use client";

import type { TeamId } from "@/src/main-bersama/domain/types/ids";

export interface LobbyRosterParticipant {
  displayName: string;
  teamId?: TeamId;
}

interface LobbyRosterProps {
  participants: LobbyRosterParticipant[];
  maxVisible?: number;
  tone?: "dark" | "light";
}

const TEAM_LABEL: Record<string, string> = {
  elang: "Elang",
  harimau: "Harimau",
  rusa: "Rusa",
  badak: "Badak",
};

const TEAM_COLOR: Record<string, string> = {
  elang: "var(--mb-team-elang)",
  harimau: "var(--mb-team-harimau)",
  rusa: "var(--mb-team-rusa)",
  badak: "var(--mb-team-badak)",
};

const AVATAR_PALETTES = [
  ["#22b8a9", "#d9fbf5"],
  ["#f2b93b", "#fff2bf"],
  ["#5ba9e8", "#dff2ff"],
  ["#e96b68", "#ffe4e1"],
  ["#7b74db", "#ece9ff"],
  ["#34b777", "#dcf8e9"],
] as const;

function hashName(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function AvatarFace({ name }: { name: string }) {
  const hash = hashName(name);
  const palette = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
  const eyeY = 19 + (hash % 3);
  const mouth = hash % 2 === 0 ? "M17 29 Q24 35 31 29" : "M18 30 Q24 33 30 30";
  const fringe = hash % 3;

  return (
    <span
      className="mb-lobby-avatar"
      style={
        {
          "--mb-avatar-bg": palette[0],
          "--mb-avatar-face": palette[1],
        } as React.CSSProperties
      }
      aria-hidden
    >
      <svg viewBox="0 0 48 48" focusable="false">
        <circle cx="24" cy="24" r="21" fill="var(--mb-avatar-bg)" />
        <circle cx="24" cy="25" r="15.5" fill="var(--mb-avatar-face)" />
        {fringe === 0 ? (
          <path d="M10 19 Q15 7 25 8 Q35 9 39 18 Q32 14 25 15 Q17 15 10 19" fill="var(--mb-avatar-bg)" />
        ) : fringe === 1 ? (
          <path d="M11 18 Q17 7 27 9 Q36 10 38 20 Q30 13 22 14 Q16 15 11 18" fill="var(--mb-avatar-bg)" />
        ) : (
          <path d="M12 18 Q18 8 27 9 Q35 10 38 18 L31 15 L25 18 L19 14 Z" fill="var(--mb-avatar-bg)" />
        )}
        <circle cx="18.5" cy={eyeY} r="1.8" fill="#17324a" />
        <circle cx="29.5" cy={eyeY} r="1.8" fill="#17324a" />
        <path d={mouth} fill="none" stroke="#17324a" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function LobbyRoster({
  participants,
  maxVisible = 16,
  tone = "dark",
}: LobbyRosterProps) {
  if (participants.length === 0) {
    return (
      <div className={`mb-lobby-roster mb-lobby-roster-${tone} mb-lobby-roster-empty`}>
        <span className="mb-lobby-empty-orbit" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <p>Menunggu siswa bergabung…</p>
      </div>
    );
  }

  const visible = participants.slice(0, maxVisible);
  const hidden = Math.max(0, participants.length - visible.length);

  return (
    <div className={`mb-lobby-roster mb-lobby-roster-${tone}`} aria-label="Siswa yang sudah bergabung">
      <div className="mb-lobby-roster-grid">
        {visible.map((participant, index) => (
          <article
            key={`${participant.displayName}-${index}`}
            className="mb-lobby-player mb-lobby-player-enter"
            style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
          >
            <span className="mb-lobby-player-avatar-wrap">
              <AvatarFace name={participant.displayName} />
              <span className="mb-lobby-online-dot" aria-hidden />
            </span>
            <span className="mb-lobby-player-copy">
              <strong title={participant.displayName}>{participant.displayName}</strong>
              {participant.teamId ? (
                <small
                  className="mb-lobby-player-team"
                  style={{ "--mb-team-c": TEAM_COLOR[participant.teamId] ?? "var(--mb-primary)" } as React.CSSProperties}
                >
                  <i aria-hidden />
                  Regu {TEAM_LABEL[participant.teamId] ?? participant.teamId}
                </small>
              ) : (
                <small>Siap bermain</small>
              )}
            </span>
          </article>
        ))}
      </div>
      {hidden > 0 ? (
        <div className="mb-lobby-more">+{hidden} siswa lainnya sudah bergabung</div>
      ) : null}
    </div>
  );
}
