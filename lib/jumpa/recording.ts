import { EgressClient, EncodedFileOutput, EncodedFileType, EncodingOptions, AudioCodec, VideoCodec, EgressStatus } from "livekit-server-sdk";
import { randomUUID } from "node:crypto";
import { statfs } from "node:fs/promises";
import { getLivekitServerConfig } from "./config";

export const RECORDING_ROOT = "/recordings";
export function recordingEnabled(): boolean {
  return process.env.JUMPA_RECORDING_ENABLED === "1";
}
export function egressClient(): EgressClient {
  const config = getLivekitServerConfig();
  if (!config) throw new Error("LIVEKIT_NOT_CONFIGURED");
  return new EgressClient(config.url, config.apiKey, config.apiSecret, { requestTimeout: 15 });
}
export function recordingActive(status: EgressStatus): boolean {
  return [EgressStatus.EGRESS_STARTING, EgressStatus.EGRESS_ACTIVE, EgressStatus.EGRESS_ENDING].includes(status);
}
export function canManageRecording(input: { creator: boolean; premium: boolean; live: boolean }): boolean {
  return input.creator && input.premium && input.live;
}
/** Leave at least 8 GiB available before accepting a new job. Runtime disk monitoring is also required. */
export async function startRecording(roomName: string, roomId: string) {
  const disk = await statfs(RECORDING_ROOT, { bigint: true });
  if (disk.bavail * disk.bsize < BigInt(8) * BigInt(1024) ** BigInt(3)) throw new Error("RECORDING_STORAGE_LOW");
  const filepath = `${RECORDING_ROOT}/${roomId}-${randomUUID()}.mp4`;
  return egressClient().startRoomCompositeEgress(roomName,
    new EncodedFileOutput({ fileType: EncodedFileType.MP4, filepath, disableManifest: true }),
    { layout: "speaker", encodingOptions: new EncodingOptions({ width: 1280, height: 720, framerate: 30, videoCodec: VideoCodec.H264_MAIN, videoBitrate: 3000, audioCodec: AudioCodec.AAC, audioBitrate: 128 }) });
}
