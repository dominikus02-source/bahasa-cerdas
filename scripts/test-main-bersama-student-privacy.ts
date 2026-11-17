import assert from 'node:assert/strict';
import { joinSession, type JoinSessionInput } from '../src/main-bersama/application/services/student-flows';
import type { SessionOrchestratorDeps } from '../src/main-bersama/application/services/orchestrator-ports';
import type { RuntimePlayer } from '../src/main-bersama/domain/entities/session-runtime-state';

function fixture(sessionId: string) {
  const players = new Map<string, RuntimePlayer>();
  const session = { id: sessionId, gameMode: 'kuis' };
  const engine = {
    state: { session, players },
    joinPlayer({ playerId, ...input }: Omit<RuntimePlayer, "id"> & { playerId: RuntimePlayer["id"] }) {
      const rejoin = players.has(playerId);
      if (!rejoin) players.set(playerId, { ...input, id: playerId });
      return { ok: true, value: { playerId, eligibleFromRoundIndex: 0, lateJoin: false, rejoin } };
    },
  };
  const deps = {
    sessions: { findByPin: async () => session },
    resolver: { resolve: async () => ({ ok: true, engine }) },
    players: {
      findBySession: async () => [...players.values()],
      saveRuntime: async () => undefined,
    },
    credentials: { issue: () => 'credential-fixture' },
    realtimeSignal: { sendSessionUpdate: async () => undefined },
  } as unknown as SessionOrchestratorDeps;
  return (input: Partial<JoinSessionInput>) => joinSession(deps, { pin: '123456', avatarId: '2', ...input });
}

async function main() {
  const join = fixture('sesi-a');
  const input = { userId: 'murid-fixture', useStudentAlias: true, displayName: 'Nama dari permintaan' };
  const student = await join({ ...input, authenticatedDisplayName: 'A' });
  assert(student.ok);
  assert.match(student.value.displayName, /^Murid [a-f0-9]{10}$/);
  assert.equal(student.value.credential, 'credential-fixture');

  const rejoin = await join({ ...input, authenticatedDisplayName: '' });
  assert(rejoin.ok);
  assert.equal(rejoin.value.displayName, student.value.displayName);
  assert.equal(rejoin.value.playerId, student.value.playerId);
  assert.equal(rejoin.value.rejoin, true);

  const another = await fixture('sesi-b')(input);
  assert(another.ok);
  assert.notEqual(another.value.displayName, student.value.displayName);

  const named = await join({ ...input, authenticatedDisplayName: 'Nama Panggilan' });
  assert(named.ok);
  assert.equal(named.value.displayName, 'Nama Panggilan');
  assert.equal(named.value.playerId, student.value.playerId);

  const teacher = await join({ userId: 'guru-fixture', authenticatedDisplayName: 'Guru Uji' });
  assert(teacher.ok);
  assert.equal(teacher.value.displayName, 'Guru Uji');

  const guest = await join({ displayName: ' Tamu Uji ' });
  assert(guest.ok);
  assert.equal(guest.value.displayName, 'Tamu Uji');
  const invalidGuest = await join({ displayName: 'A' });
  assert.deepEqual(invalidGuest, { ok: false, code: 'NAME_TOO_SHORT' });
  console.log('PASS: nama samaran murid, label antarsesi, rejoin, guru, dan tamu');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
