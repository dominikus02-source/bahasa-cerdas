/** Server-only adapter. Tidak diekspos sebagai endpoint sampai autentikasi, audit,
 * webhook finalisasi dan download privat selesai diuji. */
import "server-only";
import { randomUUID } from "node:crypto";
import { EncodedFileOutput, EncodedFileType, S3Upload } from "@livekit/protocol";
import { EgressClient } from "livekit-server-sdk";
import { getLivekitServerConfig } from "./config";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`JUMPA_RECORDING_CONFIG_MISSING:${name}`);
  return value;
}

function egressClient(): EgressClient {
  const config = getLivekitServerConfig();
  if (!config) throw new Error("LIVEKIT_NOT_CONFIGURED");
  return new EgressClient(config.url, config.apiKey, config.apiSecret);
}

/** Path dibangkitkan server, tidak menerima path dari pengguna. */
export async function startPrivateRoomRecording(roomName: string, roomId: string) {
  if (process.env.JUMPA_RECORDING_ENABLED !== "1") throw new Error("JUMPA_RECORDING_DISABLED");
  if (!/^bc-[a-zA-Z0-9-]+$/.test(roomName) || !/^[a-zA-Z0-9-]{8,64}$/.test(roomId)) throw new Error("JUMPA_RECORDING_INVALID_ROOM");
  const s3 = new S3Upload({
    accessKey: required("JUMPA_RECORDING_S3_ACCESS_KEY"),
    secret: required("JUMPA_RECORDING_S3_SECRET_KEY"),
    bucket: required("JUMPA_RECORDING_S3_BUCKET"),
    region: required("JUMPA_RECORDING_S3_REGION"),
    endpoint: required("JUMPA_RECORDING_S3_ENDPOINT"),
    forcePathStyle: true,
  });
  const filepath = `jumpa/${roomId}/${randomUUID()}.mp4`;
  const output = new EncodedFileOutput({ fileType: EncodedFileType.MP4, filepath, output: { case: "s3", value: s3 } });
  return egressClient().startRoomCompositeEgress(roomName, output, { layout: "grid" });
}

export async function stopPrivateRoomRecording(egressId: string) {
  if (process.env.JUMPA_RECORDING_ENABLED !== "1") throw new Error("JUMPA_RECORDING_DISABLED");
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(egressId)) throw new Error("JUMPA_RECORDING_INVALID_EGRESS");
  return egressClient().stopEgress(egressId);
}
