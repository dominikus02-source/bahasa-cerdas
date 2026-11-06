"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
export default function RecordingDownloads({ code }: { code: string }) {
  const [items, setItems] = useState<{ id: string; ready: boolean }[]>([]);
  useEffect(() => {
    let alive = true;
    const update = () => fetch(`/api/jumpa/rooms/${encodeURIComponent(code)}/recording`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (alive && Array.isArray(data?.recordings)) setItems(data.recordings.filter((r: { ready: boolean }) => r.ready)); })
      .catch(() => undefined);
    void update();
    const timer = setInterval(() => void update(), 15000);
    return () => { alive = false; clearInterval(timer); };
  }, [code]);
  if (!items.length) return null;
  return <div className="grid gap-2" aria-label="Unduhan rekaman">
    {items.map((item, index) => <a key={item.id} className="ui-btn ui-btn--secondary" href={`/api/jumpa/rooms/${encodeURIComponent(code)}/recording/${encodeURIComponent(item.id)}`}>
      <Download size={18} /> Unduh rekaman {index + 1}
    </a>)}
  </div>;
}
