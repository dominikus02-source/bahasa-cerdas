"use client";

/**
 * JUMPA — beranda /jumpa: ruang aktif + mulai ruang baru (guru↔guru,
 * belajar bareng murid). Ruang kelas tetap dimulai dari KelasKu.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Crown, Loader2, Plus, Radio, ShieldCheck, Users, Video } from "lucide-react";
import type { JumpaHomeData } from "@/lib/jumpa/service";
import { JUMPA_MURID_ROOM } from "@/lib/jumpa/tiers";
import { UpgradeSheet } from "./TierUi";

const KIND_LABEL = { KELAS: "Kelas", GURU: "Guru", MURID: "Belajar bareng" } as const;

export default function JumpaHome({ data, displayName, dashboardHref }: { data: JumpaHomeData; displayName: string; dashboardHref: string }) {
  const router = useRouter();
  const [limitHit, setLimitHit] = useState(false);
  const plan = data.plan;
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
      const json = (await res.json().catch(() => null)) as { url?: string; error?: string; code?: string } | null;
      if (!res.ok || !json?.url) {
        // Kuota habis: lembar upgrade sudah menjelaskan — jangan ulangi di banner.
        if (json?.code === "TIER_DAILY_LIMIT") { setLimitHit(true); return; }
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

  const fade = (i: number) => ({ style: { animationDelay: `${i * 50}ms` } });

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col gap-5 px-4 pb-10 pt-[max(20px,env(safe-area-inset-top))] sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="jumpa-brand !text-[11px]"><span className="jumpa-mark jumpa-mark-sm" aria-hidden>J</span>JUMPA <span className="jumpa-brand-by">dari BahasaCerdas</span></p>
          <h1 className="text-2xl font-extrabold">Halo, {displayName.split(" ")[0]}</h1>
        </div>
        <Link href={dashboardHref} className="jumpa-ghost !min-h-[44px]">Dasbor</Link>
      </header>

      {error && (
        <p role="alert" className="jumpa-card px-4 py-3 text-sm text-[var(--clr-warning)]">{error}</p>
      )}

      {plan && (
        <section {...fade(0)} className="jumpa-card jumpa-in-up jumpa-plan-strip p-4" aria-label="Paket JUMPA kamu">
          <span className="jumpa-tier" data-tier={plan.tier}>{plan.tier === "PREMIUM" && <Crown size={12} aria-hidden />}{plan.tier === "PREMIUM" ? (plan.trialing ? "Premium (coba)" : "Premium") : "Gratis"}</span>
          <p className="min-w-[12rem] flex-1 text-sm text-[var(--jp-text-2)]">
            Kelas {plan.kelas.maxParticipants} orang · {plan.kelas.maxDurationMin} menit
            {plan.roomsPerDay !== null ? ` · sisa ${Math.max(0, plan.roomsPerDay - plan.roomsToday)}/${plan.roomsPerDay} ruang hari ini` : " · ruang tanpa batas"}
          </p>
          {plan.tier === "FREE" && (
            <a href={plan.upgradeUrl} className="jumpa-chip">
              <Crown size={14} /> Lihat Premium
            </a>
          )}
        </section>
      )}

      {isGuru && (
        <section {...fade(1)} className="jumpa-card jumpa-in-up p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Users size={20} className="text-[var(--jp-accent)]" /> Ruang guru</h2>
          <p className="mt-1 text-sm text-[var(--jp-text-2)]">Rapat MGMP & diskusi guru · {plan?.guru.maxParticipants ?? 25} orang · {plan?.guru.maxDurationMin ?? 120} menit</p>
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
        </section>
      )}

      {data.effective === "MURID" && !data.isJunior && data.groups.length > 0 && (
        <section {...fade(1)} className="jumpa-card jumpa-in-up p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><BookOpen size={20} className="text-[var(--jp-accent)]" /> Belajar bareng</h2>
          <p className="mt-1 text-sm text-[var(--jp-text-2)]">Bersama teman sekelas · gratis · {JUMPA_MURID_ROOM.maxParticipants} orang · {JUMPA_MURID_ROOM.maxDurationMin} menit. Obrolan bisa dilihat guru kelas.</p>
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
        </section>
      )}

      <section {...fade(2)} className="jumpa-in-up">
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-[.12em] text-[var(--jp-text-3)]">
          <Radio size={16} /> Ruang aktif
        </h2>
        {data.rooms.length === 0 ? (
          <p className="jumpa-card px-5 py-8 text-center text-sm text-[var(--jp-text-2)]">Belum ada ruang aktif.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {data.rooms.map((r) => (
              <li key={r.code} className="min-w-0">
                <Link href={`/jumpa/${r.code}`} className="jumpa-card jumpa-room-row flex items-center gap-3 rounded-2xl px-4 py-3">
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
                  {r.status === "LIVE" && <span className="jumpa-live">Berlangsung</span>}
                  <ArrowRight size={18} className="shrink-0 text-[var(--jp-text-3)]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.canSeePanel && (
        <div {...fade(3)} className="jumpa-in-up">
          <Link href="/jumpa/pantau" className="jumpa-ghost w-full">
            <ShieldCheck size={18} /> Pantau ruang & laporan
          </Link>
        </div>
      )}
      {limitHit && plan && (
        <UpgradeSheet reason="daily" tier={{ maxDurationMin: plan.kelas.maxDurationMin, upgradeUrl: plan.upgradeUrl }} onClose={() => setLimitHit(false)} />
      )}
    </main>
  );
}
