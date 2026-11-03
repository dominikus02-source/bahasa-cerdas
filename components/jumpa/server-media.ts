import type { ServerSignal } from "@/lib/jumpa/signals";

type MediaCommand = Extract<ServerSignal, { t: "mod.muted" | "room.ended" }>;
interface MediaTarget {
  localParticipant: {
    setMicrophoneEnabled: (enabled: boolean) => Promise<unknown>;
    setCameraEnabled: (enabled: boolean) => Promise<unknown>;
    setScreenShareEnabled: (enabled: boolean) => Promise<unknown>;
  };
  disconnect: () => Promise<unknown>;
}

/** Hanya dipanggil setelah parseServerSignal memverifikasi sumber server. */
export async function applyServerMediaCommand(room: MediaTarget, command: MediaCommand): Promise<void> {
  if (command.t === "room.ended") {
    await room.disconnect();
    return;
  }
  if (command.source === "microphone") await room.localParticipant.setMicrophoneEnabled(false);
  else if (command.source === "camera") await room.localParticipant.setCameraEnabled(false);
  else await room.localParticipant.setScreenShareEnabled(false);
}
