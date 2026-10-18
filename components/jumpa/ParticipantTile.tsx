"use client";

import { VideoTrack, isTrackReference, useIsMuted, useIsSpeaking, type TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Track } from "livekit-client";
import { AudioLines, MicOff, MonitorUp } from "lucide-react";
import { avatarTone, initials, parseParticipantMeta } from "./format";

interface Props {
  trackRef: TrackReferenceOrPlaceholder;
  compact?: boolean;
  /** Track berbagi layar: tampil utuh (contain), tanpa cermin. */
  screen?: boolean;
}

const ROLE_LABEL = { HOST: "Host", GURU: "Guru", MURID: "Murid" } as const;

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export default function ParticipantTile({ trackRef, compact = false, screen = false }: Props) {
  const participant = trackRef.participant;
  const speaking = useIsSpeaking(participant);
  const cameraMuted = useIsMuted(trackRef);
  const micMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const meta = parseParticipantMeta(participant.metadata);
  const name = participant.name || "Peserta";
  const showVideo = isTrackReference(trackRef) && !cameraMuted;

  if (screen) {
    return (
      <div className="jumpa-tile h-full w-full" data-screen="true">
        {isTrackReference(trackRef) && <VideoTrack trackRef={trackRef} />}
        <span className="jumpa-nameplate jumpa-glass">
          <MonitorUp size={14} className="shrink-0 text-[var(--jp-accent)]" />
          <span className="truncate">{participant.isLocal ? "Layarmu sedang dibagikan" : `Layar ${name}`}</span>
        </span>
      </div>
    );
  }

  const talking = speaking && !micMuted;
  const role: keyof typeof ROLE_LABEL | null = meta.roomRole === "HOST" ? "HOST" : meta.bcRole;

  return (
    <div
      className="jumpa-tile h-full w-full"
      data-speaking={talking}
      data-local={participant.isLocal}
      data-compact={compact}
    >
      {showVideo ? (
        <VideoTrack trackRef={trackRef} />
      ) : (
        <div className="jumpa-tile-empty" data-tone={avatarTone(participant.identity)}>
          <span className="jumpa-avatar-wrap" data-speaking={talking}>
            <span className={`jumpa-avatar ${compact ? "h-11 w-11 text-[15px]" : "h-20 w-20 text-[28px] sm:h-24 sm:w-24 sm:text-[32px]"}`}>{initials(name)}</span>
          </span>
        </div>
      )}
      {!compact ? (
        <span className="jumpa-nameplate jumpa-glass">
          {talking ? (
            <AudioLines size={14} className="jumpa-speaking-icon shrink-0" aria-label="Sedang berbicara" />
          ) : micMuted ? (
            <MicOff size={14} className="shrink-0 text-[var(--jp-danger)]" aria-label="Mikrofon mati" />
          ) : null}
          {/* Tile sempit: nama depan saja + peran 1 huruf (container query di CSS). */}
          <span className="jumpa-name-full truncate">{participant.isLocal ? `${name} (Kamu)` : name}</span>
          <span className="jumpa-name-short truncate">{participant.isLocal ? "Kamu" : firstName(name)}</span>
          {role && (
            <>
              <span className="jumpa-badge jumpa-badge-full" data-role={role}>{ROLE_LABEL[role]}</span>
              <span className="jumpa-badge jumpa-badge-mini" data-role={role} title={ROLE_LABEL[role]} aria-label={ROLE_LABEL[role]}>{ROLE_LABEL[role][0]}</span>
            </>
          )}
        </span>
      ) : (
        <span className="jumpa-nameplate jumpa-glass !bottom-1.5 !left-1.5 !px-2 !py-0.5 !text-[11px]">
          {talking ? (
            <AudioLines size={11} className="jumpa-speaking-icon shrink-0" aria-label="Sedang berbicara" />
          ) : micMuted ? (
            <MicOff size={11} className="shrink-0 text-[var(--jp-danger)]" aria-label="Mikrofon mati" />
          ) : null}
          <span className="truncate">{participant.isLocal ? "Kamu" : name}</span>
        </span>
      )}
    </div>
  );
}
