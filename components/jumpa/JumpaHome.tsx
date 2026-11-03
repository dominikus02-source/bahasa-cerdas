"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarPlus, GraduationCap, History, KeyRound, Plus, Video } from "lucide-react";
import type { JumpaHomeData } from "@/lib/jumpa/service";
import { limitsFor } from "@/lib/jumpa/tiers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { parseRoomInput } from "./format";
import JumpaThemeToggle from "./JumpaThemeToggle";

export default function JumpaHome({ data, displayName, dashboardHref }: { data: JumpaHomeData; displayName: string; dashboardHref: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const creating = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const limits = data.trialLimits ?? limitsFor(data.packageTier ?? "FREE", "GURU");
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
        <p className="mt-2 text-sm text-bc-text-2">Mulai percakapan atau gabung lewat tautan.</p>
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
        <div className="mt-4 rounded-bc-ctl border border-bc-line bg-bc-surface-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Batas ruang baru</p>
            <Badge tone={data.packageTier === "PREMIUM" ? "premium" : "neutral"}>JUMPA {data.packageTier === "PREMIUM" ? "Premium" : "Free"}</Badge>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-4">
            <div><dt className="text-xs text-bc-text-2">Peserta maksimal</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{limits.maxParticipants} orang</dd></div>
            <div><dt className="text-xs text-bc-text-2">Durasi maksimal</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{limits.maxDurationMin} menit</dd></div>
          </dl>
          <p className="mt-3 text-xs text-bc-text-2">Batas mengikuti paket pembuat ruang. Peserta dapat bergabung dengan akun Free atau Premium.</p>
        </div>
        <p className="mt-4 text-sm text-bc-text-2">Setelah ruang dibuat, bagikan tautannya kepada peserta.</p>
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
      <section aria-labelledby="jumpa-rules" className="border-t border-bc-line pt-4">
        <h2 id="jumpa-rules" className="text-sm font-semibold">Saat di ruang</h2>
        <ul className="mt-2 space-y-2 text-sm text-bc-text-2">
          <li>Kamu mengatur kamera dan mikrofon sendiri.</li>
          <li>Pemandu dapat membisukan, mengeluarkan peserta, atau mengunci ruang.</li>
          <li>Rekaman belum tersedia.</li>
        </ul>
      </section>
    </main>
  );
}
