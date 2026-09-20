// ─── API: Teacher Commands (Tahap 6 §3/§4) ──────────────────
// POST /api/main-bersama/teacher/commands
// SATU endpoint command: { sessionId, action, ... }.
// Identity guru SELALU dari resolveVerifiedTeacherActor() (cookie
// Supabase) — teacherId di body TIDAK PERNAH dipercaya (§4).

import { NextRequest, NextResponse } from 'next/server';
import { resolveVerifiedTeacherActor } from '@/src/main-bersama/adapters/auth/teacher-actor';
import { getOrchestratorDeps } from '@/src/main-bersama/infrastructure/orchestrator-composition';
import {
  openLobby,
  startSession,
  closeRound,
  startDiscussion,
  nextRound,
  pauseSession,
  resumeSession,
  endSession,
  type TeacherCommandErrorCode,
} from '@/src/main-bersama/application/services/session-commands';
import { createMainSession } from '@/src/main-bersama/application/use-cases/create-main-session';
import {
  PrismaBankSoalQuestionSource,
} from '@/src/main-bersama/adapters/bank-soal/bank-soal-source';
import {
  PrismaBankThemeQuestionSource,
} from '@/src/main-bersama/infrastructure/repositories/prisma-bank-theme-source';
import {
  PrismaMainBersamaClassDirectory,
} from '@/src/main-bersama/adapters/kelas/class-directory';
import {
  PrismaMainSessionCreationStore,
} from '@/src/main-bersama/infrastructure/repositories/prisma-session-creation-store';
import {
  UuidIdGenerator,
  SixDigitPinGenerator,
} from '@/src/main-bersama/application/use-cases/id-generator';
import { mapHttpError } from '@/src/main-bersama/presentation/http-errors';

const ACTIONS = [
  'create-session',
  'open-lobby',
  'start',
  'close-round',
  'discuss',
  'next-round',
  'pause',
  'resume',
  'end',
] as const;

type Action = (typeof ACTIONS)[number];

function isAction(v: unknown): v is Action {
  return typeof v === 'string' && (ACTIONS as readonly string[]).includes(v);
}


/** Bungkus mapped error → NextResponse (mapper-nya framework-agnostic). */
function errorResponse(code: string, reason?: string) {
  const mapped = mapHttpError(code, reason);
  return NextResponse.json(mapped.body, { status: mapped.status });
}

export async function POST(req: NextRequest) {
  // 1. Auth — actor dari server context, bukan body (§4).
  const actor = await resolveVerifiedTeacherActor();
  if (!actor) return errorResponse('UNAUTHORIZED');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse('INTERNAL');
  }
  const action = body.action;
  if (!isAction(action)) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_PHASE', message: 'Aksi tidak dikenal.' },
      { status: 400 },
    );
  }

  const deps = getOrchestratorDeps();

  // 2. create-session: use-case Tahap 5 (actor → teacherId).
  if (action === 'create-session') {
    const result = await createMainSession(
      {
        actor,
        // Composition root: sumber tema Bank Soal (util BC) diinjeksi
        // dari luar adapter — lihat ports.ts BankThemeQuestionSource.
        bankSoal: new PrismaBankSoalQuestionSource(new PrismaBankThemeQuestionSource()),
        classes: new PrismaMainBersamaClassDirectory(),
        store: new PrismaMainSessionCreationStore(),
        ids: new UuidIdGenerator(),
        pins: new SixDigitPinGenerator(),
      },
      {
        gameMode: body.gameMode as never,
        packageRef: body.packageRef as never,
        ...(typeof body.classId === 'string' ? { classId: body.classId } : {}),
        ...(body.config !== undefined && body.config !== null
          ? { config: body.config as { roundDurationMs?: number; kotaTargetCorrect?: number } }
          : {}),
        ...(body.useSupportedQuestions === true ? { useSupportedQuestions: true } : {}),
      },
    );
    if (!result.ok) {
      return errorResponse(result.code, result.reason);
    }
    return NextResponse.json({
      ok: true,
      session: {
        id: result.session.id,
        pin: result.session.pin,
        gameMode: result.session.gameMode,
        phase: result.session.phase,
        totalRounds: result.session.totalRounds,
      },
      unused: result.unused,
    });
  }

  // 3. Semua command lain wajib sessionId milik guru (ownership di
  //    orchestrator: query scoped teacherId — Teacher B tidak bisa
  //    mengontrol Teacher A, §4).
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) {
    return NextResponse.json(
      { ok: false, code: 'SESSION_NOT_FOUND', message: 'sessionId wajib.' },
      { status: 400 },
    );
  }

  const run = async <T>(
    fn: () => Promise<
      | { ok: true; value: T }
      | { ok: false; code: TeacherCommandErrorCode; reason?: string }
    >,
  ) => {
    const result = await fn();
    if (!result.ok) return errorResponse(result.code, result.reason);
    return NextResponse.json({ ok: true, ...(result.value as object) });
  };

  switch (action) {
    case 'open-lobby':
      return run(() => openLobby(deps, actor, sessionId as never));
    case 'start':
      return run(() => startSession(deps, actor, sessionId as never));
    case 'close-round':
      return run(() => closeRound(deps, actor, sessionId as never));
    case 'discuss':
      return run(() => startDiscussion(deps, actor, sessionId as never));
    case 'next-round':
      return run(() => nextRound(deps, actor, sessionId as never));
    case 'pause':
      return run(() => pauseSession(deps, actor, sessionId as never));
    case 'resume':
      return run(() => resumeSession(deps, actor, sessionId as never));
    case 'end':
      return run(() => endSession(deps, actor, sessionId as never));
  }
}
