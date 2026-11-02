"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarPlus, GraduationCap, History, KeyRound, Plus, Video } from "lucide-react";
import type { JumpaHomeData } from "@/lib/jumpa/service";
import { JUMPA_TRIAL } from "@/lib/jumpa/trial-policy";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseRoomInput } from "./format";
import JumpaThemeToggle from "./JumpaThemeToggle";

export default function JumpaHome({ data, displayName, dashboardHref }: { data: JumpaHomeData; displayName: string; dashboardHref: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const creating = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const limits = data.trialLimits ?? JUMPA_TRIAL;
  const canCreate = Boolean(data.effective) && !data.isJunior;
  const join = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseRoomInput(code);
    if (!parsed) { setError("Periksa kembali kode atau tautan ruang."); return; }
    router.push(`/jumpa/${parsed}`);
  };
  const create = async () => {
    if (creating.current) return;
    creating.current = true;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/jumpa/rooms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "GURU", title: title.trim() || undefined }),
      });
      const body = await response.json().catch(() => null) as { url?: string; error?: string } | null;
      if (!response.ok || !body?.url) { setError(body?.error ?? "Ruang belum dapat dibuat. Coba lagi."); return; }
      router.push(body.url);
    } catch { setError("Koneksi bermasalah. Periksa internet, lalu coba lagi."); }
    finally { creating.current = false; setBusy(false); }
  };
  return (
    <main className="jumpa-home mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col gap-5 px-4 pb-10 pt-6 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <p className="jumpa-brand"><span className="jumpa-mark jumpa-mark-sm" aria-hidden>J</span>JUMPA</p>
        <div className="flex items-center gap-2"><JumpaThemeToggle /><Link href={dashboardHref} className="ui-btn ui-btn--ghost">Dasbor</Link></div>
      </header>
      <section className="py-4">
        <h1 className="text-2xl font-bold">Halo, {displayName.split(" ")[0]}</h1>
        <p className="mt-2 text-sm text-bc-text-3">Uji coba bersama · {limits.maxParticipants} peserta · {limits.maxDurationMin} menit per ruang</p>
      </section>
      {error && <p role="alert" className="text-sm text-bc-danger">{error}</p>}
      <Card variant="surface" className="p-5">
        <h2 className="flex items-center gap-2 text-base font-bold"><KeyRound size={20} /> Gabung ruang</h2>
        <form onSubmit={join} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input id="jumpa-code" variant="bc" value={code} onChange={(e) => setCode(e.target.value)} maxLength={200} placeholder="Kode atau tautan ruang" aria-label="Kode atau tautan ruang" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="min-w-0 flex-1" />
          <Button type="submit" variant="secondary">Gabung <ArrowRight size={17} /></Button>
        </form>
      </Card>
      {canCreate && <Card variant="surface" className="p-5">
        <h2 className="flex items-center gap-2 text-base font-bold"><Video size={20} /> Mulai ruang baru</h2>
        <p className="mt-2 text-sm text-bc-text-2">Bagikan tautannya kepada peserta yang ingin kamu undang.</p>
        <Input variant="bc" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Topik (opsional)" aria-label="Topik ruang" className="mt-4" />
        <Button type="button" variant="primary" block loading={busy} onClick={() => void create()} className="mt-3"><Plus size={18} /> Mulai sekarang</Button>
      </Card>}
      {data.rooms.length > 0 && <section>
        <h2 className="mb-3 text-base font-bold">Ruangmu</h2>
        <ul className="grid gap-2">{data.rooms.map((room) => <li key={room.code}>
          <Link href={`/jumpa/${room.code}`} className="flex items-center gap-3 rounded-bc-card border border-bc-line bg-bc-surface p-4">
            <Video size={20} className="shrink-0 text-bc-accent" /><span className="min-w-0 flex-1"><span className="block break-words font-semibold">{room.title}</span><span className="text-xs text-bc-text-3">{room.status === "LIVE" ? "Berlangsung" : "Belum dimulai"}</span></span><ArrowRight size={18} className="shrink-0" />
          </Link>
        </li>)}</ul>
      </section>}
      <div className="flex flex-wrap gap-3">
        <Link href="/jumpa/riwayat" className="ui-btn ui-btn--ghost"><History size={18} /> Riwayat</Link>
        {data.effective === "GURU" && <><Link href="/guru/kelasku" className="ui-btn ui-btn--ghost"><GraduationCap size={18} /> KelasKu</Link><Link href="/jumpa/jadwal" className="ui-btn ui-btn--ghost"><CalendarPlus size={18} /> Jadwal kelas</Link></>}
      </div>
      <p className="text-sm text-bc-text-3">Kamu mengatur kamera dan mikrofon sendiri. Pemandu dapat membisukan, mengeluarkan peserta, atau mengunci ruang. Rekaman belum tersedia.</p>
    </main>
  );
}
