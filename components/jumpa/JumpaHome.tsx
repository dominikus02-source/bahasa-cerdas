"use client";

/**
 * JUMPA — beranda /jumpa: hero + gabung pakai kode, paket, mulai ruang
 * (guru↔guru, belajar bareng murid), dan ruang aktif.
 * Ruang kelas tetap dimulai dari KelasKu.
 */
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Crown, GraduationCap, KeyRound, Loader2, Plus, Radio, ShieldCheck, Users, Video } from "lucide-react";
import type { JumpaHomeData, RoomListItem } from "@/lib/jumpa/service";
import { JUMPA_MURID_ROOM } from "@/lib/jumpa/tiers";
import { UpgradeSheet } from "./TierUi";
import { avatarTone, elapsedLabel, parseRoomInput } from "./format";

const KIND_LABEL = { KELAS: "Kelas", GURU: "Ruang guru", MURID: "Belajar bareng" } as const;

function useMinuteTick(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function QuickJoin() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [bad, setBad] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = parseRoomInput(value);
    if (!code) return setBad(true);
    router.push(`/jumpa/${code}`);
  };
  return (
    <form onSubmit={submit} className="jumpa-join" noValidate>
      <label htmlFor="jumpa-code" className="sr-only">Kode ruang</label>
      <KeyRound size={18} className="jumpa-join-icon" aria-hidden />
      <input
        id="jumpa-code"
        value={value}
        onChange={(e) => { setValue(e.target.value.slice(0, 120)); setBad(false); }}
        placeholder="Kode ruang, mis. abc-defg-hij"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        inputMode="text"
        aria-invalid={bad}
        aria-describedby={bad ? "jumpa-code-err" : undefined}
        className="jumpa-join-input"
      />
      <button type="submit" className="jumpa-join-btn">Gabung <ArrowRight size={16} aria-hidden /></button>
      {bad && <p id="jumpa-code-err" role="alert" className="jumpa-join-err">Kode tidak dikenali.</p>}
    </form>
  );
}

function PlanCard({ plan }: { plan: NonNullable<JumpaHomeData["plan"]> }) {
  const premium = plan.tier === "PREMIUM";
  const left = plan.roomsPerDay === null ? null : Math.max(0, plan.roomsPerDay - plan.roomsToday);
  return (
    <section className="jumpa-card jumpa-plan jumpa-in-up" data-tier={plan.tier} aria-label="Paket JUMPA kamu">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="jumpa-tier" data-tier={plan.tier}>{premium && <Crown size={12} aria-hidden />}{premium ? (plan.trialing ? "Premium (coba)" : "Premium") : "Gratis"}</span>
          <span className="text-sm text-[var(--jp-text-2)]">Kelas {plan.kelas.maxParticipants} orang · {plan.kelas.maxDurationMin} menit</span>
        </div>
        {plan.roomsPerDay !== null && left !== null ? (
          <div className="mt-2.5 flex items-center gap-2.5">
            <span className="jumpa-dots" role="img" aria-label={`${left} dari ${plan.roomsPerDay} ruang tersisa hari ini`}>
              {Array.from({ length: plan.roomsPerDay }, (_, i) => <i key={i} data-used={i < plan.roomsToday} />)}
            </span>
            <span className="text-xs font-semibold text-[var(--jp-text-2)]">{left} ruang tersisa hari ini</span>
          </div>
        ) : (
          <p className="mt-2 text-xs font-semibold text-[var(--jp-text-2)]">Ruang tanpa batas</p>
        )}
      </div>
      {!premium && (
        <a href={plan.upgradeUrl} className="jumpa-cta-premium">
          <Crown size={15} aria-hidden /> Lihat Premium
        </a>
      )}
    </section>
  );
}

function Avatars({ room }: { room: RoomListItem }) {
  const { count, initials } = room.present;
  if (count === 0) return null;
  const more = count - initials.length;
  return (
    <span className="jumpa-stack" role="img" aria-label={`${count} orang di dalam`}>
      {initials.map((ini, i) => (
        <span key={i} className="jumpa-stack-ava" data-tone={avatarTone(`${room.code}${i}${ini}`)}>{ini}</span>
      ))}
      {more > 0 && <span className="jumpa-stack-ava jumpa-stack-more">+{more}</span>}
    </span>
  );
}

function RoomCard({ room, now }: { room: RoomListItem; now: number }) {
  const live = room.status === "LIVE";
  const elapsed = live ? elapsedLabel(room.startedAt, now) : null;
  const Icon = room.kind === "GURU" ? Users : room.kind === "MURID" ? BookOpen : GraduationCap;
  return (
    <Link href={`/jumpa/${room.code}`} className="jumpa-card jumpa-room-card">
      <span className="jumpa-icon-chip" data-kind={room.kind} aria-hidden><Icon size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="jumpa-room-title">{room.title}</span>
        <span className="jumpa-room-sub">
          {KIND_LABEL[room.kind]}{room.place ? ` · ${room.place}` : ""}
          {room.mine && <span className="jumpa-mine">Ruangmu</span>}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-2">
          {live ? <span className="jumpa-live">Berlangsung</span> : <span className="jumpa-soon">Belum mulai</span>}
          {elapsed && <span className="text-xs text-[var(--jp-text-3)]">{elapsed}</span>}
          <Avatars room={room} />
        </span>
      </span>
      <ArrowRight size={18} className="shrink-0 self-center text-[var(--jp-text-3)]" aria-hidden />
    </Link>
  );
}

export default function JumpaHome({ data, displayName, dashboardHref }: { data: JumpaHomeData; displayName: string; dashboardHref: string }) {
  const router = useRouter();
  const now = useMinuteTick();
  const [limitHit, setLimitHit] = useState(false);
  const plan = data.plan;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [communityId, setCommunityId] = useState("");
  const [groupId, setGroupId] = useState(data.groups[0]?.id ?? "");
  const isGuru = data.effective === "GURU";
  const firstName = displayName.split(" ")[0] || displayName;

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
    <main className="jumpa-home mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col gap-4 px-4 pb-10 pt-[max(16px,env(safe-area-inset-top))] sm:gap-5 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <p className="jumpa-brand"><span className="jumpa-mark jumpa-mark-sm" aria-hidden>J</span>JUMPA <span className="jumpa-brand-by">dari BahasaCerdas</span></p>
        <Link href={dashboardHref} className="jumpa-ghost !min-h-[40px] !px-4 text-sm">Dasbor</Link>
      </header>

      <section className="jumpa-hero jumpa-in-up" aria-labelledby="jumpa-hello">
        <h1 id="jumpa-hello" className="jumpa-hero-title">Halo, {firstName}</h1>
        <p className="jumpa-hero-sub">Belajar tatap muka, ringan di HP.</p>
        <QuickJoin />
      </section>

      {error && <p role="alert" className="jumpa-card px-4 py-3 text-sm text-[var(--clr-warning)]">{error}</p>}

      {plan && <PlanCard plan={plan} />}

      {isGuru && (
        <div {...fade(1)} className="jumpa-in-up grid gap-4 sm:grid-cols-[1.4fr_1fr]">
          <section className="jumpa-card jumpa-action-card">
            <div className="flex items-center gap-3">
              <span className="jumpa-icon-chip" data-kind="GURU" aria-hidden><Users size={20} /></span>
              <div className="min-w-0">
                <h2 className="text-base font-bold">Ruang guru</h2>
                <p className="text-xs text-[var(--jp-text-3)]">MGMP & diskusi · {plan?.guru.maxParticipants ?? 25} orang · {plan?.guru.maxDurationMin ?? 120} menit</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2.5">
              <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} placeholder="Topik (opsional)" aria-label="Topik ruang" className="jumpa-input w-full" />
              <select value={communityId} onChange={(e) => setCommunityId(e.target.value)} aria-label="Komunitas" className="jumpa-input w-full">
                <option value="">Tanpa komunitas</option>
                {data.communities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button type="button" className="jumpa-primary mt-4 w-full" disabled={busy !== null} onClick={() => void create({ kind: "GURU", title: title || undefined, communityId: communityId || undefined }, "guru")}>
              {busy === "guru" ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Mulai ruang guru
            </button>
          </section>
          <Link href="/guru/kelasku" className="jumpa-card jumpa-action-card jumpa-action-link">
            <span className="jumpa-icon-chip" data-kind="KELAS" aria-hidden><GraduationCap size={20} /></span>
            <span className="mt-3 block text-base font-bold">Ruang kelas</span>
            <span className="mt-0.5 block text-xs text-[var(--jp-text-3)]">Mulai dari KelasKu, murid langsung bisa masuk.</span>
            <span className="jumpa-action-go">Buka KelasKu <ArrowRight size={16} aria-hidden /></span>
          </Link>
        </div>
      )}

      {data.effective === "MURID" && !data.isJunior && data.groups.length > 0 && (
        <section {...fade(1)} className="jumpa-card jumpa-action-card jumpa-in-up">
          <div className="flex items-center gap-3">
            <span className="jumpa-icon-chip" data-kind="MURID" aria-hidden><BookOpen size={20} /></span>
            <div className="min-w-0">
              <h2 className="text-base font-bold">Belajar bareng</h2>
              <p className="text-xs text-[var(--jp-text-3)]">Gratis · {JUMPA_MURID_ROOM.maxParticipants} orang · {JUMPA_MURID_ROOM.maxDurationMin} menit · obrolan terlihat guru</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
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
        <h2 className="jumpa-section-title"><Radio size={16} aria-hidden /> Ruang aktif</h2>
        {data.rooms.length === 0 ? (
          <div className="jumpa-card jumpa-empty">
            <span className="jumpa-empty-icon" aria-hidden><Video size={26} /></span>
            <p className="text-sm font-semibold">Belum ada ruang aktif</p>
            <p className="text-xs text-[var(--jp-text-3)]">Ruang yang bisa kamu masuki muncul di sini.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {data.rooms.map((r) => (
              <li key={r.code} className="min-w-0"><RoomCard room={r} now={now} /></li>
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
