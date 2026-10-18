"use client";

import { memo, useEffect, useState } from "react";
import { VideoTrack, isTrackReference, useConnectionQualityIndicator, useIsMuted, useIsSpeaking, type TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { ConnectionQuality, Track, TrackEvent, type TrackPublication } from "livekit-client";
import { AudioLines, MicOff, MonitorUp, WifiLow } from "lucide-react";
import { avatarTone, initials, parseParticipantMeta, shortName } from "./format";

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

/** Ikon sinyal lemah — hanya tampil saat koneksi peserta Buruk/Hilang. */
function PoorSignal({ trackRef, size }: { trackRef: TrackReferenceOrPlaceholder; size: number }) {
  const { quality } = useConnectionQualityIndicator({ participant: trackRef.participant });
  if (quality !== ConnectionQuality.Poor && quality !== ConnectionQuality.Lost) return null;
  return <WifiLow size={size} className="shrink-0 text-[var(--clr-warning)]" aria-label="Sinyal lemah" />;
}

/**
 * Track milik publikasi, reaktif. Publikasi adalah objek yang sama saat
 * track tiba/dilepas (berlangganan/berhenti), jadi memo tile tidak melihat
 * perubahan itu — hook ini yang memicu render ulang tile itu saja.
 */
function usePublicationTrack(pub: TrackPublication | undefined): Track | undefined {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!pub) return;
    const on = () => bump((n) => n + 1);
    pub.on(TrackEvent.Subscribed, on);
    pub.on(TrackEvent.Unsubscribed, on);
    on();
    return () => {
      pub.off(TrackEvent.Subscribed, on);
      pub.off(TrackEvent.Unsubscribed, on);
    };
  }, [pub]);
  return pub?.track;
}

function Tile({ trackRef, compact = false, screen = false }: Props) {
  const participant = trackRef.participant;
  const speaking = useIsSpeaking(participant);
  const cameraMuted = useIsMuted(trackRef);
  const micMuted = useIsMuted({ participant, source: Track.Source.Microphone });
  const meta = parseParticipantMeta(participant.metadata);
  const name = participant.name || "Peserta";
  // Video hanya bila track benar-benar ada (mode audio saja = tidak berlangganan).
  const pubTrack = usePublicationTrack(trackRef.publication);
  const showVideo = isTrackReference(trackRef) && !cameraMuted && Boolean(pubTrack);

  if (screen) {
    return (
      <div className="jumpa-tile h-full w-full" data-screen="true">
        {isTrackReference(trackRef) && <VideoTrack trackRef={trackRef} />}
        <span className="jumpa-nameplate">
          <MonitorUp size={14} className="shrink-0 text-[var(--jp-accent)]" />
          <span className="truncate">{participant.isLocal ? "Layarmu sedang dibagikan" : `Layar ${name}`}</span>
        </span>
      </div>
    );
  }

  const talking = speaking && !micMuted;
  const role: keyof typeof ROLE_LABEL | null = meta.roomRole === "HOST" ? "HOST" : meta.bcRole;
  const label = participant.isLocal ? `${name} (Kamu)` : name;

  return (
    <div className="jumpa-tile h-full w-full" data-speaking={talking} data-local={participant.isLocal} data-compact={compact} title={label}>
      {showVideo ? (
        <VideoTrack trackRef={trackRef} />
      ) : (
        <div className="jumpa-tile-empty" data-tone={avatarTone(participant.identity)}>
          <span className="jumpa-avatar-wrap" data-speaking={talking}>
            <span className={`jumpa-avatar ${compact ? "h-10 w-10 text-[14px]" : "h-20 w-20 text-[28px] sm:h-24 sm:w-24 sm:text-[32px]"}`}>{initials(name)}</span>
          </span>
        </div>
      )}
      {!compact ? (
        <span className="jumpa-nameplate">
          {talking ? (
            <AudioLines size={14} className="jumpa-speaking-icon shrink-0" aria-label="Sedang berbicara" />
          ) : micMuted ? (
            <MicOff size={14} className="shrink-0 text-[var(--jp-danger)]" aria-label="Mikrofon mati" />
          ) : null}
          {/* Tile sempit: nama depan saja + peran 1 huruf (container query di CSS). */}
          <span className="jumpa-name-full truncate">{label}</span>
          <span className="jumpa-name-short truncate">{participant.isLocal ? "Kamu" : firstName(name)}</span>
          {role && (
            <>
              <span className="jumpa-badge jumpa-badge-full" data-role={role}>{ROLE_LABEL[role]}</span>
              <span className="jumpa-badge jumpa-badge-mini" data-role={role} title={ROLE_LABEL[role]} aria-label={ROLE_LABEL[role]}>{ROLE_LABEL[role][0]}</span>
            </>
          )}
          {!participant.isLocal && <PoorSignal trackRef={trackRef} size={14} />}
        </span>
      ) : (
        // Strip: nama pendek ("Dewi P.") supaya tidak terpotong; nama lengkap di title/aria.
        <span className="jumpa-nameplate jumpa-nameplate-mini" aria-label={label}>
          {talking ? (
            <AudioLines size={11} className="jumpa-speaking-icon shrink-0" aria-hidden />
          ) : micMuted ? (
            <MicOff size={11} className="shrink-0 text-[var(--jp-danger)]" aria-hidden />
          ) : null}
          <span className="jumpa-mini-name">{participant.isLocal ? "Kamu" : shortName(name)}</span>
          {!participant.isLocal && <PoorSignal trackRef={trackRef} size={11} />}
        </span>
      )}
    </div>
  );
}

/**
 * Memo: tile hanya render ulang bila peserta/publikasi/track berubah.
 * Status bicara, mute, dan sinyal datang dari hook di dalam tile sendiri,
 * jadi obrolan, reaksi, atau toast tidak lagi me-render ulang semua video.
 */
const ParticipantTile = memo(Tile, (a, b) => {
  if (a.compact !== b.compact || a.screen !== b.screen) return false;
  const x = a.trackRef;
  const y = b.trackRef;
  return x.participant === y.participant && x.source === y.source && x.publication === y.publication;
});

export default ParticipantTile;
