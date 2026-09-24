"use client";
// ─── Projector Client (Tahap 8A — hero surface) ─────────────
// Layar kelas: teatrikal, read-only, TANPA data privat. State
// SELALU dari GET projector authoritative (useSessionView); sinyal
// Broadcast hanya pemicu refetch. Identitas sesi via query ?pin=
// atau ?sessionId= (tidak ada secret — PIN memang publik).
// Logic Tahap 6/7 TIDAK berubah — hanya presentation.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProjectorSessionView } from "@/src/main-bersama/contracts/views/projector";
import { fetchProjectorState } from "@/lib/main-bersama/api-client";
import { useSessionView } from "@/lib/main-bersama/use-session-view";
import { PinDisplay } from "@/components/main-bersama/shared/PinDisplay";
import { ParticipantCount } from "@/components/main-bersama/shared/ParticipantCount";
import { TeamProgress } from "@/components/main-bersama/shared/TeamProgress";
import { CityProgress } from "@/components/main-bersama/shared/CityProgress";
import { QuestionCard } from "@/components/main-bersama/shared/QuestionCard";
import { ConnectionBanner } from "@/components/main-bersama/shared/ConnectionBanner";
import { JelajahTrail } from "@/components/main-bersama/art/jelajah/JelajahTrail";
import { KotaScene } from "@/components/main-bersama/art/kota/KotaScene";
import { TeamBadge } from "@/components/main-bersama/art/shared/TeamBadge";
import { TeamMascot } from "@/components/main-bersama/art/registry";
import { Podium } from "@/components/main-bersama/art/jelajah/Podium";
import { useTrailMotion } from "@/components/main-bersama/art/jelajah-motion/useTrailMotion";
import {
  useKotaMotion,
  type KotaMotion,
} from "@/components/main-bersama/art/kota-motion/useKotaMotion";

const MODE_LABEL = {
  "jelajah-kata": "Jelajah Kata",
  "kota-cahaya": "Kota Cahaya",
} as const;

/** Label regu dari teamId (domain Jelajah — 4 regu tetap). */
const TEAM_LABEL: Record<string, string> = {
  elang: "Elang",
  harimau: "Harimau",
  rusa: "Rusa",
  badak: "Badak",
};
const TEAM_COLOR_VAR: Record<string, string> = {
  elang: "var(--mb-team-elang)",
  harimau: "var(--mb-team-harimau)",
  rusa: "var(--mb-team-rusa)",
  badak: "var(--mb-team-badak)",
};

/**
 * Stable empty team-progress fallback for non-Jelajah modes (8C.2 blockerfix).
 * An inline `{}` literal here would create a new identity on EVERY render,
 * retriggering useTrailMotion's [progress, phase] effect → setPoses cascade
 * (observed ~3674 renders / ~4s on Kota projector). Module constant keeps
 * one reference; no useMemo needed. Read-only downstream (never mutated).
 */
const EMPTY_TEAM_PROGRESS: Record<string, number> = {};

export function ProjectorClient() {
  const search = useSearchParams();
  const router = useRouter();
  const pin = search.get("pin");
  const sessionIdParam = search.get("sessionId");

  const [lookupError, setLookupError] = useState<string | null>(null);
  const resolvedSessionId = useResolvedSessionId(
    pin,
    sessionIdParam,
    setLookupError,
  );

  const fetchView = useCallback(
    () =>
      fetchProjectorState(
        resolvedSessionId
          ? { sessionId: resolvedSessionId }
          : pin
            ? { pin }
            : { sessionId: sessionIdParam ?? "" },
      ),
    [resolvedSessionId, pin, sessionIdParam],
  );
  const { view, connection } = useSessionView<ProjectorSessionView>(
    resolvedSessionId,
    fetchView,
    {
      onError: () =>
        setLookupError("Ruang tidak ditemukan. Periksa PIN di URL layar."),
    },
  );

  // 8C.1 — motion hook derives transient pose from authoritative progress.
  const gameMode = view?.gameProgress.gameMode ?? null;
  const teamProgress =
    gameMode === "jelajah-kata"
      ? (
          view as ProjectorSessionView & {
            gameProgress: {
              gameMode: "jelajah-kata";
              teamProgress: Record<string, number>;
            };
          }
        ).gameProgress.teamProgress
      : EMPTY_TEAM_PROGRESS;
  const phase = view?.phase ?? "";
  const { getPose } = useTrailMotion(teamProgress, phase);

  // 8C.2 — kota motion derives transient reveal from authoritative
  // progress + unlockedMilestones. Unconditional (hooks rules); snaps
  // to authoritative whenever mode/phase/motion forbids animation.
  const kotaProgressPercent =
    gameMode === "kota-cahaya"
      ? (
          view as ProjectorSessionView & {
            gameProgress: {
              gameMode: "kota-cahaya";
              progressPercent: number;
              unlockedMilestones: string[];
            };
          }
        ).gameProgress.progressPercent
      : 0;
  const kotaUnlocked =
    gameMode === "kota-cahaya"
      ? (
          view as ProjectorSessionView & {
            gameProgress: {
              gameMode: "kota-cahaya";
              progressPercent: number;
              unlockedMilestones: string[];
            };
          }
        ).gameProgress.unlockedMilestones
      : [];
  const kotaMotion = useKotaMotion(kotaProgressPercent, kotaUnlocked, phase);

  if (lookupError && !view) {
    return (
      <main className="mb-pj-idle mb-fade-in">
        <h1 className="mb-display mb-pj-title">Main Bersama</h1>
        <p className="mb-pj-idle-msg">{lookupError}</p>
        <button
          type="button"
          className="mb-pj-retry"
          onClick={() => router.refresh()}
        >
          Coba lagi
        </button>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="mb-pj-idle mb-fade-in">
        {connection === "offline" ? <ConnectionBanner visible /> : null}
        <p role="status" className="mb-pj-idle-msg">
          Menyambung ke layar kelas…
        </p>
      </main>
    );
  }

  return (
    <main className="mb-pj">
      <ConnectionBanner visible={connection === "offline"} />
      <header className="mb-pj-head">
        <div className="mb-pj-brand">
          <h1 className="mb-display mb-pj-title">MAIN BERSAMA</h1>
          <p className="mb-pj-sub">
            Kuis kelas <strong>langsung</strong> bersama BahasaCerdas
          </p>
        </div>
        <div className="mb-pj-head-meta">
          {/* Nama konten lebih dulu: terlihat dari jauh dan tetap ada
              sampai summary/ended (§11/§12). */}
          <span className="mb-pj-pkg">{view.contentTitle}</span>
          <span className="mb-pj-mode">{MODE_LABEL[view.gameMode]}</span>
          {view.className ? (
            <span className="mb-pj-class">Kelas {view.className}</span>
          ) : null}
        </div>
      </header>

      {view.phase === "lobby" || view.phase === "preparing" ? (
        <ProjectorLobby view={view} getPose={getPose} kotaMotion={kotaMotion} />
      ) : view.phase === "question" ? (
        <ProjectorQuestion view={view} kotaMotion={kotaMotion} />
      ) : view.phase === "closed" || view.phase === "paused" ? (
        <section className="mb-pj-phase mb-fade-in" role="status">
          <h2 className="mb-display mb-pj-closed">
            {view.phase === "closed"
              ? "Waktu menjawab selesai!"
              : "Permainan dijeda"}
          </h2>
          <ParticipantCount count={view.participation.playerCount} />
          {/* 8C.2 — payoff Kota Cahaya tepat setelah "Tutup Jawaban":
              engine meng-commit progres Kota pada close-round, jadi bar
              dan langit kota HARUS ter-mount di sini. Memakai state motion
              yang SAMA dari parent (satu state machine per sesi) — bukan
              hook kedua. Hanya Kota; Jelajah tetap seperti sebelumnya. */}
          {view.phase === "closed" &&
          view.gameProgress.gameMode === "kota-cahaya" ? (
            <div className="mb-pj-closed-kota" aria-hidden>
              <div className="mb-pj-world mb-pj-world-strip">
                <KotaScene
                  unlocked={kotaMotion.litMilestones}
                  reveal={kotaMotion.revealMilestones}
                  mini
                />
              </div>
              <CityProgress
                progressPercent={kotaMotion.displayedProgress}
                unlockedMilestones={kotaMotion.litMilestones}
                animate={kotaMotion.animateProgress}
                growFrom={kotaMotion.growFrom}
                revealMilestones={kotaMotion.revealMilestones}
              />
            </div>
          ) : null}
        </section>
      ) : view.phase === "discussion" && view.revealedRound ? (
        <ProjectorDiscussion
          view={view}
          getPose={getPose}
          kotaMotion={kotaMotion}
        />
      ) : (
        <ProjectorSummary view={view} />
      )}
    </main>
  );
}

/**
 * Resolusi sessionId dari PIN (lobby sebelum sesi diketahui).
 * GET projector by-pin — diulang hanya bila PIN berubah; efek samping
 * di useEffect, BUKAN saat render.
 */
function useResolvedSessionId(
  pin: string | null,
  sessionIdParam: string | null,
  onError: (message: string) => void,
): string | null {
  const [resolved, setResolved] = useState<string | null>(sessionIdParam);
  const triedPinRef = useRef<string | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (resolved || !pin || triedPinRef.current === pin) return;
    triedPinRef.current = pin;
    let cancelled = false;
    void fetchProjectorState({ pin })
      .then((v) => {
        if (!cancelled) setResolved(v.sessionId);
      })
      .catch(() => {
        if (!cancelled) {
          onErrorRef.current(
            "Ruang tidak ditemukan. Periksa PIN di URL layar.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pin, resolved]);

  return resolved;
}

// ─── Lobby (§24) — brand + PIN sangat besar + regu/kota ─────

function ProjectorLobby({
  view,
  getPose,
  kotaMotion,
}: {
  view: ProjectorSessionView;
  getPose: (id: string) => "ready" | "move" | "celebrate";
  kotaMotion: KotaMotion;
}) {
  const pin = view.joinInfo?.pin ?? "------";
  return (
    <section className="mb-pj-phase mb-fade-in">
      <PinDisplay pin={pin} scale="projector" />
      <p className="mb-pj-wait" role="status">
        Buka halaman <strong>Gabung Main Bersama</strong> lalu masukkan PIN di
        atas
      </p>
      <ParticipantCount
        count={view.participation.playerCount}
        label="siswa bergabung"
      />
      {view.gameProgress.gameMode === "jelajah-kata" ? (
        <div className="mb-pj-world mb-pj-world-strip" aria-hidden>
          <JelajahTrail
            teams={view.teams.map((t) => ({ id: t.id, name: t.name }))}
            progress={view.gameProgress.teamProgress}
            compact
            poses={(
              view.teams.map((t) => t.id) as Array<
                "elang" | "harimau" | "rusa" | "badak"
              >
            ).reduce<Record<string, "ready" | "move" | "celebrate">>(
              (acc, id) => ({ ...acc, [id]: getPose(id) }),
              {},
            )}
          />
        </div>
      ) : null}
      {view.gameProgress.gameMode === "jelajah-kata" ? (
        <div className="mb-pj-heroes" aria-hidden>
          {view.teams.map((t) => (
            <TeamMascot key={t.id} teamId={t.id} pose="ready" size={64} eager />
          ))}
        </div>
      ) : null}
      {view.gameProgress.gameMode === "jelajah-kata" ? (
        <div className="mb-pj-teams">
          {view.teams.map((t) => (
            <span
              key={t.id}
              className="mb-pj-team"
              style={
                {
                  "--mb-tc": TEAM_COLOR_VAR[t.id] ?? "var(--mb-primary)",
                } as React.CSSProperties
              }
            >
              <TeamBadge teamId={t.id} size={22} />
              {TEAM_LABEL[t.id] ?? t.name}
            </span>
          ))}
        </div>
      ) : (
        <div className="mb-pj-world" aria-hidden>
          <KotaScene
            unlocked={kotaMotion.litMilestones}
            reveal={kotaMotion.revealMilestones}
          />
        </div>
      )}
      {view.gameProgress.gameMode === "jelajah-kata" ? null : (
        <div className="mb-pj-kota-preview" aria-hidden>
          <CityProgress
            progressPercent={kotaMotion.displayedProgress}
            unlockedMilestones={kotaMotion.litMilestones}
            animate={kotaMotion.animateProgress}
            growFrom={kotaMotion.growFrom}
            revealMilestones={kotaMotion.revealMilestones}
          />
        </div>
      )}
    </section>
  );
}

// ─── Question (§24) — agregat, TANPA answer/individu/key ────

function ProjectorQuestion({
  view,
  kotaMotion,
}: {
  view: ProjectorSessionView;
  kotaMotion: KotaMotion;
}) {
  const q = view.currentQuestion;
  return (
    <section className="mb-pj-phase mb-fade-in">
      {q ? (
        <div className="mb-pj-q">
          <QuestionCard
            question={q}
            roundLabel={`Soal ${(view.currentRoundIndex ?? 0) + 1} / ${view.totalRounds}`}
          />
        </div>
      ) : null}
      <div className="mb-pj-participation">
        <span className="mb-count mb-number">
          {view.participation.submittedCount}
          <small> / {view.participation.eligibleCount} menjawab</small>
        </span>
        <ParticipantCount count={view.participation.playerCount} />
      </div>
      <div className="mb-pj-progress">
        {view.gameProgress.gameMode === "jelajah-kata" ? (
          <>
            <div className="mb-pj-world mb-pj-world-strip" aria-hidden>
              <JelajahTrail
                teams={view.teams.map((t) => ({ id: t.id, name: t.name }))}
                progress={view.gameProgress.teamProgress}
                compact
              />
            </div>
            <TeamProgress
              teams={view.teams}
              progress={view.gameProgress.teamProgress}
            />
          </>
        ) : (
          <>
            <div className="mb-pj-world mb-pj-world-strip" aria-hidden>
              <KotaScene
                unlocked={kotaMotion.litMilestones}
                reveal={kotaMotion.revealMilestones}
                mini
              />
            </div>
            <CityProgress
              progressPercent={kotaMotion.displayedProgress}
              unlockedMilestones={kotaMotion.litMilestones}
              animate={kotaMotion.animateProgress}
              growFrom={kotaMotion.growFrom}
              revealMilestones={kotaMotion.revealMilestones}
            />
          </>
        )}
      </div>
    </section>
  );
}

// ─── Discussion (§27) — kunci + ringkasan + progres hasil ───

function ProjectorDiscussion({
  view,
  getPose,
  kotaMotion,
}: {
  view: ProjectorSessionView;
  getPose: (id: string) => "ready" | "move" | "celebrate";
  kotaMotion: KotaMotion;
}) {
  const r = view.revealedRound!;
  return (
    <section className="mb-pj-phase mb-fade-in">
      <div className="mb-pj-q">
        <QuestionCard
          question={r.question}
          roundLabel={`Soal ${(view.currentRoundIndex ?? 0) + 1} / ${view.totalRounds}`}
        />
      </div>
      <div className="mb-pj-reveal mb-entrance">
        <p className="mb-pj-reveal-label">Jawaban benar:</p>
        <p className="mb-pj-reveal-answer mb-display">
          {r.question.options.find((o) => o.id === r.correctOptionId)?.text ??
            "—"}
        </p>
        {r.explanation ? (
          <p className="mb-pj-reveal-explain">{r.explanation}</p>
        ) : null}
      </div>
      {view.gameProgress.gameMode === "jelajah-kata" ? (
        <DiscussionLeader
          teams={view.teams.map((t) => ({ id: t.id, name: t.name }))}
          progress={view.gameProgress.teamProgress}
        />
      ) : null}
      <div className="mb-pj-progress">
        {view.gameProgress.gameMode === "jelajah-kata" ? (
          <>
            <div className="mb-pj-world mb-pj-world-strip" aria-hidden>
              <JelajahTrail
                teams={view.teams.map((t) => ({ id: t.id, name: t.name }))}
                progress={view.gameProgress.teamProgress}
                compact
                poses={(
                  view.teams.map((t) => t.id) as Array<
                    "elang" | "harimau" | "rusa" | "badak"
                  >
                ).reduce<Record<string, "ready" | "move" | "celebrate">>(
                  (acc, id) => ({ ...acc, [id]: getPose(id) }),
                  {},
                )}
              />
            </div>
            <TeamProgress
              teams={view.teams}
              progress={view.gameProgress.teamProgress}
            />
          </>
        ) : (
          <>
            <div className="mb-pj-world mb-pj-world-strip" aria-hidden>
              <KotaScene
                unlocked={kotaMotion.litMilestones}
                reveal={kotaMotion.revealMilestones}
                mini
              />
            </div>
            <CityProgress
              progressPercent={kotaMotion.displayedProgress}
              unlockedMilestones={kotaMotion.litMilestones}
              animate={kotaMotion.animateProgress}
              growFrom={kotaMotion.growFrom}
              revealMilestones={kotaMotion.revealMilestones}
            />
          </>
        )}
      </div>
    </section>
  );
}

/** Leading-team celebrate mini (discussion payoff, restrained). */
function DiscussionLeader({
  teams,
  progress,
}: {
  teams: Array<{ id: string; name: string }>;
  progress: Record<string, number>;
}) {
  if (teams.length === 0) return null;
  let leader = teams[0];
  for (const t of teams) {
    if ((progress[t.id] ?? 0) > (progress[leader.id] ?? 0)) leader = t;
  }
  return (
    <div className="mb-pj-leader" aria-hidden>
      <TeamMascot teamId={leader.id} pose="celebrate" size={52} />
      <span>
        Regu <strong>{leader.name}</strong> memimpin!
      </span>
      <style jsx>{`
        .mb-pj-leader {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--mb-space-3);
          margin-top: var(--mb-space-3);
          font-weight: 700;
          color: var(--mb-text-primary);
        }
      `}</style>
    </div>
  );
}

// ─── Summary (§28) — ranking tie-safe / misi kota positif ───
function ProjectorSummary({ view }: { view: ProjectorSessionView }) {
  const final = view.finalResult;
  if (!final) return null;

  if (final.gameMode === "jelajah-kata") {
    // Ranking domain: 1,1,3,4 — tie ditampilkan apa adanya (§28);
    // beberapa pemenang didukung (semua rank 1 = juara bersama).
    const winners = final.teamRanking.filter(
      (t) => t.progress === final.teamRanking[0].progress,
    );
    const finalProgress: Record<string, number> = {};
    for (const t of final.teamRanking) finalProgress[t.teamId] = t.progress;
    // teamIds untuk trail final: pakai view.teams bila ada, fallback ranking.
    const trailTeams = (
      view.teams.length > 0
        ? view.teams
        : final.teamRanking.map((t) => ({
            id: t.teamId,
            name: TEAM_LABEL[t.teamId] ?? t.teamId,
          }))
    ).map((t) => ({ id: t.id, name: t.name }));
    return (
      <section className="mb-pj-phase mb-pj-phase-final mb-fade-in">
        <h2 className="mb-display mb-pj-final-title">
          {winners.length > 1 ? "Juara Bersama!" : "Papan Peringkat"}
        </h2>
        <div className="mb-pj-world mb-pj-world-final" aria-hidden>
          <JelajahTrail teams={trailTeams} progress={finalProgress} />
        </div>
        <Podium
          ranking={final.teamRanking.map((t) => ({
            teamId: t.teamId,
            name: TEAM_LABEL[t.teamId] ?? t.teamId,
            progress: t.progress,
            rank:
              final.teamRanking.findIndex((o) => o.progress === t.progress) + 1,
          }))}
        />
        <ol className="mb-pj-ranking">
          {final.teamRanking.map((t) => {
            const rank =
              final.teamRanking.findIndex((o) => o.progress === t.progress) + 1;
            const isWinner = rank === 1;
            return (
              <li
                key={t.teamId}
                className={`mb-pj-rank-row ${isWinner ? "mb-pj-winner" : ""}`}
                style={
                  {
                    "--rank-color":
                      TEAM_COLOR_VAR[t.teamId] ?? "var(--mb-primary)",
                  } as React.CSSProperties
                }
              >
                <span className="mb-pj-rank mb-number">{rank}</span>
                <span className="mb-pj-rank-team">
                  {isWinner ? <TeamBadge teamId={t.teamId} size={26} /> : null}
                  {TEAM_LABEL[t.teamId] ?? t.teamId}
                  {/* Catatan "seri" diletakkan DI DALAM sel nama regu.
                      Sebelumnya ia grid-item sendiri di `grid-column: 2`
                      yang tabrakan dengan nama regu, sehingga grid membuat
                      BARIS IMPLISIT kedua dan tinggi baris melonjak
                      (46px → 80px) — bikin kasus tie meluber. */}
                  {isWinner && winners.length > 1 ? (
                    <span className="mb-pj-tie-note">seri</span>
                  ) : null}
                </span>
                <span className="mb-pj-rank-pct mb-number">
                  {Math.round(t.progress)}%
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    );
  }

  // Kota (§28): misi tercapai = rayakan; belum = copy positif progress
  // kelas — tanpa kata "gagal", tanpa menyalahkan siswa.
  // Final tidak membawa unlockedMilestones: turunkan dari threshold
  // 25/50/75/100 yang sama dengan track (display-only).
  const pct = Math.round(final.progressPercent);
  const finalUnlocked = ["garden", "library", "homes", "town-center"].filter(
    (_, i) => pct >= [25, 50, 75, 100][i],
  );
  return (
    <section className="mb-pj-phase mb-fade-in">
      <h2 className="mb-display mb-pj-final-title">
        {final.missionAchieved
          ? "Kota Cahaya berhasil dinyalakan!"
          : `Kota Cahaya menyala ${pct}%!`}
      </h2>
      <div className="mb-pj-world" aria-hidden>
        <KotaScene unlocked={finalUnlocked} />
      </div>
      <CityProgress
        progressPercent={final.progressPercent}
        unlockedMilestones={finalUnlocked}
      />
      <p className="mb-pj-mission" role="status">
        {final.missionAchieved
          ? "Seluruh kelas berhasil mencapai misi — hebat!"
          : "Kerja bagus, kelas sudah berjuang keras bersama-sama!"}
      </p>
    </section>
  );
}
