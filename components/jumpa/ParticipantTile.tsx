"use client";

import { VideoTrack, isTrackReference, useIsMuted, useIsSpeaking, type TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { Track } from "livekit-client";
import { MicOff } from "lucide-react";
import { initials, parseParticipantMeta } from "./format";

interface Props {
  trackRef: TrackReferenceOrPlaceholder;
  compact?: boolean;
}

export default function ParticipantTile({ trackRef, compact = false }: Props) {
  const participant = trackRef.participant;
  const speaking = useIsSpeaking(participant);
  const cameraMuted = useIsMuted(trackRef);
  const micMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const meta = parseParticipantMeta(participant.metadata);
  const name = participant.name || "Peserta";
  const showVideo = isTrackReference(trackRef) && !cameraMuted;

  return (
    <div
      className="jumpa-tile h-full w-full"
      data-speaking={speaking && !micMuted}
      data-local={participant.isLocal}
    >
      {showVideo ? (
        <VideoTrack trackRef={trackRef} />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <span className={`jumpa-avatar ${compact ? "h-10 w-10 text-sm" : "h-20 w-20 text-2xl sm:h-24 sm:w-24"}`}>{initials(name)}</span>
        </div>
      )}
      {!compact ? (
        <span className="jumpa-nameplate jumpa-glass">
          {micMuted && <MicOff size={14} className="shrink-0 text-[var(--jp-danger)]" aria-label="Mikrofon mati" />}
          <span className="truncate">{participant.isLocal ? `${name} (Kamu)` : name}</span>
          {meta.roomRole === "HOST" ? (
            <span className="jumpa-badge" data-role="HOST">Host</span>
          ) : meta.bcRole ? (
            <span className="jumpa-badge" data-role={meta.bcRole}>{meta.bcRole === "GURU" ? "Guru" : "Murid"}</span>
          ) : null}
        </span>
      ) : (
        <span className="jumpa-nameplate jumpa-glass !bottom-1.5 !left-1.5 !px-2 !py-0.5 !text-[11px]">
          {micMuted && <MicOff size={11} className="shrink-0 text-[var(--jp-danger)]" aria-label="Mikrofon mati" />}
          <span className="truncate">{participant.isLocal ? "Kamu" : name}</span>
        </span>
      )}
    </div>
  );
}
