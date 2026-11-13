"use client";
import { useCallback, useEffect, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { Circle, Download, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useJumpa } from "./room-controller";
import { useMedia } from "./media-controller";

interface RecordingState { enabled: boolean; active: boolean; recordings: { id: string; status: number; ready: boolean }[] }
export default function RecordingControl() {
  const room = useRoomContext();
  const { info, self, api, toast } = useJumpa();
  const { tier } = useMedia();
  const [state, setState] = useState<RecordingState | null>(null);
  const [recording, setRecording] = useState(room.isRecording);
  const [busy, setBusy] = useState(false);
  const host = self.roomRole === "HOST";
  const base = `/api/jumpa/rooms/${encodeURIComponent(info.code)}/recording`;
  const refresh = useCallback(async () => {
    const result = await api(base);
    if (result.ok) setState(result.data as unknown as RecordingState);
  }, [api, base]);
  useEffect(() => {
    const changed = () => setRecording(room.isRecording);
    room.on(RoomEvent.RecordingStatusChanged, changed);
    return () => { room.off(RoomEvent.RecordingStatusChanged, changed); };
  }, [room]);
  useEffect(() => {
    if (!host) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 10000);
    return () => clearInterval(timer);
  }, [host, refresh]);
  async function toggle() {
    if (busy || !state) return;
    setBusy(true);
    try {
      const result = await api(base, { method: "POST", body: JSON.stringify({ action: state.active ? "stop" : "start" }) });
      if (!result.ok) toast(result.message, "warn");
      else toast(state.active ? "Rekaman sedang disimpan." : "Rekaman sedang dimulai.");
      await refresh();
    } finally { setBusy(false); }
  }
  const ready = state?.recordings.filter(r => r.ready) ?? [];
  return <div className="flex max-w-full flex-wrap items-center justify-center gap-2 px-2" aria-label="Rekaman rapat">
    {recording && <span role="status" className="text-sm text-bc-danger">Rapat sedang direkam</span>}
    {host && state?.enabled && (tier.tier === "PREMIUM" || state.active) &&
      <Button type="button" size="sm" variant={state.active ? "danger" : "secondary"} loading={busy} onClick={() => void toggle()}>
        {state.active ? <Square size={16} /> : <Circle size={16} />}
        {state.active ? "Hentikan rekaman" : "Rekam rapat"}
      </Button>}
    {host && ready.map((r, index) => <a key={r.id} className="ui-btn ui-btn--secondary ui-btn--sm" href={`${base}/${encodeURIComponent(r.id)}`}>
      <Download size={16} /> Unduh rekaman {index + 1}
    </a>)}
  </div>;
}
