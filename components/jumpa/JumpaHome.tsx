"use client";

/**
 * JUMPA — beranda /jumpa: ruang aktif + mulai ruang baru (guru↔guru,
 * belajar bareng murid). Ruang kelas tetap dimulai dari KelasKu.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, Loader2, Plus, Radio, ShieldCheck, Users, Video } from "lucide-react";
import type { JumpaHomeData } from "@/lib/jumpa/service";

const KIND_LABEL = { KELAS: "Kelas", GURU: "Guru", MURID: "Belajar bareng" } as const;
const EASE = [0.22, 0.8, 0.24, 1] as const;

export default function JumpaHome({ data, displayName, dashboardHref }: { data: JumpaHomeData; displayName: string; dashboardHref: string }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [communityId, setCommunityId] = useState("");
  const [groupId, setGroupId] = useState(data.groups[0]?.id ?? "");
  const isGuru = data.effective === "GURU";

  const create = async (body: Record<string, string | undefined>, key: string) => {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/jumpa/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !json?.url) {
        setError(json?.error ?? "Gagal membuat ruang. Coba lagi.");
        return;
      }
      router.push(json.url);
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(null);
    }
  };

  const fade = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, delay: 0.05 * i, ease: EASE } });

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col gap-5 px-4 pb-10 pt-[max(20px,env(safe-area-inset-top))] sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[var(--jp-accent)]">JUMPA</p>
          <h1 className="text-2xl font-extrabold">Halo, {displayName.split(" ")[0]}</h1>
        </div>
        <Link href={dashboardHref} className="jumpa-ghost !min-h-[44px]">Dasbor</Link>
      </header>

      {error && (
        <p role="alert" className="jumpa-glass rounded-2xl px-4 py-3 text-sm text-[var(--clr-warning)]">{error}</p>
      )}

      {isGuru && (
        <motion.section {...fade(0)} className="jumpa-glass rounded-3xl p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Users size={20} className="text-[var(--jp-accent)]" /> Ruang guru</h2>
          <p className="mt-1 text-sm text-[var(--jp-text-2)]">Diskusi sesama guru — rapat MGMP, berbagi praktik baik. Maks 25 orang, 120 menit.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} placeholder="Topik (opsional)" aria-label="Topik ruang" className="jumpa-input w-full" />
            <select value={communityId} onChange={(e) => setCommunityId(e.target.value)} aria-label="Komunitas" className="jumpa-input w-full">
              <option value="">Tanpa komunitas (undang manual)</option>
              {data.communities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button type="button" className="jumpa-primary mt-4 w-full sm:w-auto" disabled={busy !== null} onClick={() => void create({ kind: "GURU", title: title || undefined, communityId: communityId || undefined }, "guru")}>
            {busy === "guru" ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Mulai ruang guru
          </button>
          <p className="mt-3 text-xs text-[var(--jp-text-3)]">
            Ruang kelas dimulai dari <Link href="/guru/kelasku" className="font-semibold text-[var(--jp-accent)] underline-offset-2 hover:underline">KelasKu</Link>.
          </p>
        </motion.section>
      )}

      {data.effective === "MURID" && !data.isJunior && data.groups.length > 0 && (
        <motion.section {...fade(0)} className="jumpa-glass rounded-3xl p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><BookOpen size={20} className="text-[var(--jp-accent)]" /> Belajar bareng</h2>
          <p className="mt-1 text-sm text-[var(--jp-text-2)]">Ruang belajar dengan teman sekelas. Maks 8 orang, 60 menit. Obrolan disimpan dan bisa dilihat guru kelas.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Kelas" className="jumpa-input w-full">
              {data.groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 60))} placeholder="Mau belajar apa? (opsional)" aria-label="Topik belajar" className="jumpa-input w-full" />
          </div>
          <button type="button" className="jumpa-primary mt-4 w-full sm:w-auto" disabled={busy !== null || !groupId} onClick={() => void create({ kind: "MURID", groupId, title: title || undefined }, "murid")}>
            {busy === "murid" ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Buat ruang belajar
          </button>
        </motion.section>
      )}

      <motion.section {...fade(1)}>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-[.12em] text-[var(--jp-text-3)]">
          <Radio size={16} /> Ruang aktif
        </h2>
        {data.rooms.length === 0 ? (
          <p className="jumpa-glass rounded-3xl px-5 py-8 text-center text-sm text-[var(--jp-text-2)]">Belum ada ruang aktif untukmu saat ini.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {data.rooms.map((r) => (
              <li key={r.code} className="min-w-0">
                <Link href={`/jumpa/${r.code}`} className="jumpa-glass jumpa-room-row flex items-center gap-3 rounded-2xl px-4 py-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--clr-accent-soft)] text-[var(--jp-accent)]">
                    <Video size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.title}</span>
                    <span className="block truncate text-xs text-[var(--jp-text-3)]">
                      {KIND_LABEL[r.kind]}
                      {r.place ? ` · ${r.place}` : ""}
                      {r.mine ? " · Ruangmu" : ""}
                    </span>
                  </span>
                  {r.status === "LIVE" && <span className="jumpa-live">Live</span>}
                  <ArrowRight size={18} className="shrink-0 text-[var(--jp-text-3)]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      {data.canSeePanel && (
        <motion.div {...fade(2)}>
          <Link href="/jumpa/pantau" className="jumpa-ghost w-full">
            <ShieldCheck size={18} /> Pantau ruang & laporan
          </Link>
        </motion.div>
      )}
    </main>
  );
}
