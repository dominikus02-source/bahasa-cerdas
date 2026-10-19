"use client";

/**
 * JUMPA — beranda /jumpa yang disederhanakan.
 * Guru: mulai ruang guru atau buka KelasKu.
 * Murid: gabung ruang aktif atau buat belajar bareng.
 * Ruang uji (judul mengandung "Uji" / "Test") disembunyikan.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, CalendarPlus, Crown, History, GraduationCap, KeyRound, Loader2, Moon, Plus, Sun, Users, Video } from "lucide-react";
import type { JumpaHomeData, RoomListItem } from "@/lib/jumpa/service";
import { formatWib, formatWibTime } from "@/lib/jumpa/schedule";
import { JUMPA_MURID_FREE, JUMPA_MURID_PREMIUM } from "@/lib/jumpa/tiers";
import { UpgradeSheet } from "./TierUi";
import { avatarTone, elapsedLabel, parseRoomInput } from "./format";

const KIND_LABEL = { KELAS: "Kelas", GURU: "Ruang guru", MURID: "Belajar bareng" } as const;

function useMinuteTick(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
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
        maxLength={120}
        onChange={(e) => { setValue(e.target.value); setBad(false); }}
        placeholder="Kode ruang"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        aria-invalid={bad}
        className="jumpa-join-input"
      />
      <button type="submit" className="jumpa-join-btn">Gabung <ArrowRight size={16} aria-hidden /></button>
      {bad && <p role="alert" className="jumpa-join-err">Kode tidak dikenali.</p>}
    </form>
  );
}

function PlanCard({ plan }: { plan: NonNullable<JumpaHomeData["plan"]> }) {
  const premium = plan.tier === "PREMIUM";
  return (
    <section className="jumpa-card jumpa-plan jumpa-in-up" data-tier={plan.tier}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="jumpa-tier" data-tier={plan.tier}>{premium && <Crown size={12} aria-hidden />}{premium ? "Premium" : "Gratis"}</span>
          <span className="text-sm text-[var(--jp-text-2)]">Kelas {plan.kelas.maxParticipants} orang · {plan.kelas.maxDurationMin} menit</span>
        </div>
        {plan.roomsPerDay === null ? (
          <p className="mt-2 text-xs font-semibold text-[var(--jp-text-2)]">Ruang tanpa batas</p>
        ) : (
          <p className="mt-2 text-xs font-semibold text-[var(--jp-text-2)]">Sisa {Math.max(0, plan.roomsPerDay - plan.roomsToday)} ruang hari ini</p>
        )}
      </div>
      {!premium && <a href={plan.upgradeUrl} className="jumpa-cta-premium"><Crown size={15} aria-hidden /> Premium</a>}
    </section>
  );
}

function scheduledLabel(scheduledAt: string | null, now: number | null): string {
  if (!scheduledAt) return "Belum mulai";
  const at = new Date(scheduledAt);
  if (now === null) return formatWibTime(at);
  return at.getTime() > now ? formatWib(at, new Date(now)) : "Belum mulai";
}

function RoomCard({ room, now }: { room: RoomListItem; now: number | null }) {
  const live = room.status === "LIVE";
  const Icon = room.kind === "GURU" ? Users : room.kind === "MURID" ? BookOpen : GraduationCap;
  return (
    <Link href={`/jumpa/${room.code}`} className="jumpa-card jumpa-room-card">
      <span className="jumpa-icon-chip" data-kind={room.kind} aria-hidden><Icon size={20} /></span>
      <span className="min-w-0 flex-1">
        <span className="jumpa-room-title">{room.title}</span>
        <span className="jumpa-room-sub">{KIND_LABEL[room.kind]}{room.mine && <span className="jumpa-mine">Ruangmu</span>}</span>
        <span className="mt-1.5 flex items-center gap-2 text-xs">
          {live ? <span className="jumpa-live">Berlangsung</span> : <span className="jumpa-soon">{scheduledLabel(room.scheduledAt, now)}</span>}
        </span>
      </span>
      <ArrowRight size={18} className="shrink-0 text-[var(--jp-text-3)]" aria-hidden />
    </Link>
  );
}

function isTestRoom(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes("uji") || t.includes("test") || t.includes("demo");
}

export default function JumpaHome({ data, displayName, dashboardHref }: { data: JumpaHomeData; displayName: string; dashboardHref: string }) {
  const router = useRouter();
  const now = useMinuteTick();
  const [light, setLight] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const plan = data.plan;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [groupId, setGroupId] = useState(data.groups[0]?.id ?? "");
  const isGuru = data.effective === "GURU";
  const firstName = displayName.split(" ")[0] || displayName;
  const rooms = data.rooms.filter((r) => !isTestRoom(r.title));

  const create = async (body: Record<string, string | boolean | undefined>) => {
    setBusy(true);
    setError(null);
    const title = titleRef.current?.value.trim() || undefined;
    try {
      const res = await fetch("/api/jumpa/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, title }) });
      const json = (await res.json().catch(() => null)) as { url?: string; error?: string; code?: string } | null;
      if (!res.ok || !json?.url) {
        if (json?.code === "TIER_DAILY_LIMIT") { setLimitHit(true); return; }
        setError(json?.error ?? "Gagal membuat ruang. Coba lagi.");
        return;
      }
      router.push(json.url);
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="jumpa-home jumpa-root mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col gap-5 px-4 pb-10 pt-[max(16px,env(safe-area-inset-top))] sm:px-6" data-theme={light ? "light" : "dark"}>
      <header className="flex items-center justify-between gap-3">
        <p className="jumpa-brand"><span className="jumpa-mark jumpa-mark-sm" aria-hidden>J</span>JUMPA</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setLight(!light)} className="jumpa-icon-btn" aria-label={light ? "Mode gelap" : "Mode terang"}>
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <Link href={dashboardHref} className="jumpa-ghost !min-h-[40px] !px-4 text-sm">Dasbor</Link>
        </div>
      </header>

      <section className="jumpa-hero jumpa-in-up">
        <h1 className="jumpa-hero-title">Halo, {firstName}</h1>
        <p className="jumpa-hero-sub">Masuk ke ruang dengan kode atau mulai ruang baru.</p>
        <QuickJoin />
      </section>

      {error && <p role="alert" className="jumpa-card px-4 py-3 text-sm text-[var(--clr-warning)]">{error}</p>}

      {plan && <PlanCard plan={plan} />}

      {isGuru ? (
        <section className="jumpa-card jumpa-action-card jumpa-in-up">
          <div className="flex items-center gap-3">
            <span className="jumpa-icon-chip" data-kind="GURU" aria-hidden><Users size={20} /></span>
            <div>
              <h2 className="text-base font-bold">Mulai ruang guru</h2>
              <p className="text-xs text-[var(--jp-text-3)]">{plan?.guru.maxParticipants ?? 25} orang · {plan?.guru.maxDurationMin ?? 120} menit</p>
            </div>
          </div>
          <input
            ref={titleRef}
            maxLength={80}
            placeholder="Topik (opsional)"
            aria-label="Topik ruang"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="jumpa-input mt-4 w-full"
          />
          <button type="button" className="jumpa-primary mt-3 w-full" disabled={busy} onClick={() => void create({ kind: "GURU" })}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Mulai sekarang
          </button>
          <Link href="/guru/kelasku" className="jumpa-ghost mt-2 w-full">
            <GraduationCap size={18} /> Mulai dari KelasKu
          </Link>
        </section>
      ) : data.effective === "MURID" && !data.isJunior && data.groups.length > 0 ? (
        <section className="jumpa-card jumpa-action-card jumpa-in-up">
          <div className="flex items-center gap-3">
            <span className="jumpa-icon-chip" data-kind="MURID" aria-hidden><BookOpen size={20} /></span>
            <div>
              <h2 className="text-base font-bold">Belajar bareng</h2>
              <p className="text-xs text-[var(--jp-text-3)]">Gratis {JUMPA_MURID_FREE.maxParticipants} · Premium {JUMPA_MURID_PREMIUM.maxParticipants} orang</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2.5">
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Kelas" className="jumpa-input w-full">
              {data.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input
              ref={titleRef}
              maxLength={60}
              placeholder="Mau belajar apa? (opsional)"
              aria-label="Topik belajar"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="jumpa-input w-full"
            />
          </div>
          <button type="button" className="jumpa-primary mt-3 w-full" disabled={busy || !groupId} onClick={() => void create({ kind: "MURID", groupId })}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Buat ruang
          </button>
        </section>
      ) : null}

      {rooms.length > 0 && (
        <section className="jumpa-in-up">
          <h2 className="jumpa-section-title">Ruang aktif</h2>
          <ul className="grid gap-2.5">
            {rooms.map((r) => <li key={r.code}><RoomCard room={r} now={now} /></li>)}
          </ul>
        </section>
      )}

      <div className="jumpa-in-up grid gap-2.5 sm:grid-cols-2">
        <Link href="/jumpa/riwayat" className="jumpa-ghost w-full"><History size={18} /> Riwayat</Link>
        {isGuru && <Link href="/jumpa/jadwal" className="jumpa-ghost w-full"><CalendarPlus size={18} /> Jadwalkan</Link>}
      </div>

      {limitHit && plan && (
        <UpgradeSheet reason="daily" tier={{ maxDurationMin: plan.kelas.maxDurationMin, upgradeUrl: plan.upgradeUrl }} onClose={() => setLimitHit(false)} />
      )}
    </main>
  );
}
