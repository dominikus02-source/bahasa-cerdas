/**
 * Pencetakan token join LiveKit. Grant dibangun oleh fungsi murni
 * buildJoinGrant() supaya bisa dites: klien TIDAK PERNAH mendapat
 * roomAdmin/roomCreate/roomRecord, dan tidak bisa mengubah metadata
 * sendiri (peran tidak bisa dipalsukan).
 */
import { AccessToken, TrackSource, type ParticipantPermission, type VideoGrant } from "livekit-server-sdk";
import { JUMPA_TOKEN_TTL_SEC } from "./caps";

const SOURCE_MAP = {
  camera: TrackSource.CAMERA,
  microphone: TrackSource.MICROPHONE,
  screen_share: TrackSource.SCREEN_SHARE,
  screen_share_audio: TrackSource.SCREEN_SHARE_AUDIO,
} as const;

export type GrantSource = keyof typeof SOURCE_MAP;

export function buildJoinGrant(
  roomName: string,
  sources: GrantSource[],
): VideoGrant {
  return {
    roomJoin: true,
    room: roomName,
    canSubscribe: true,
    canPublish: sources.length > 0,
    canPublishSources: sources.map((s) => SOURCE_MAP[s]),
    canPublishData: true,
    canUpdateOwnMetadata: false,
    roomAdmin: false,
    roomCreate: false,
    roomRecord: false,
    roomList: false,
    hidden: false,
    recorder: false,
  };
}

export interface JumpaParticipantMetadata {
  v: 1;
  bcRole: "GURU" | "MURID" | "UMUM";
  roomRole: "HOST" | "COHOST" | "MEMBER";
  avatar: string | null;
}

export async function mintJoinToken(params: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  name: string;
  metadata: JumpaParticipantMetadata;
  grant: VideoGrant;
  ttlSec?: number;
}): Promise<string> {
  const at = new AccessToken(params.apiKey, params.apiSecret, {
    identity: params.identity,
    name: params.name,
    metadata: JSON.stringify(params.metadata),
    ttl: params.ttlSec ?? JUMPA_TOKEN_TTL_SEC,
  });
  at.addGrant(params.grant);
  return at.toJwt();
}

/**
 * Izin peserta untuk RoomServiceClient.updateParticipant (mis. saat host
 * mengizinkan/mencabut berbagi layar murid). Sama ketatnya dengan token:
 * tanpa admin, tanpa ubah metadata sendiri.
 */
export function buildParticipantPermission(sources: GrantSource[]): Partial<ParticipantPermission> {
  return {
    canSubscribe: true,
    canPublish: sources.length > 0,
    canPublishSources: sources.map((s) => SOURCE_MAP[s]),
    canPublishData: true,
    canUpdateMetadata: false,
    hidden: false,
    recorder: false,
  };
}
