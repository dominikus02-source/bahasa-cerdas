// ─── HTTP Client untuk API Main Bersama (Tahap 7) ────────────
// Wrapper fetch role-aware: student otomatis menyisipkan credential
// via HEADER (bukan query string — §11 Tahap 6), parsing typed error
// menjadi pesan Indonesia user-friendly (§22). SATU tempat —
// komponen tidak memanggil fetch mentah ke API Main Bersama.

import { loadCredential } from './credential-store';

export class MbApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'MbApiError';
  }
}

/** Pesan Indonesia user-friendly per error code (§22). */
const ERROR_MESSAGES: Record<string, string> = {
  NAME_EMPTY: 'Nama tidak boleh kosong.',
  NAME_TOO_SHORT: 'Nama terlalu pendek (minimal 2 karakter).',
  NAME_TOO_LONG: 'Nama terlalu panjang (maksimal 24 karakter).',
  NAME_CONTROL_CHARS: 'Nama mengandung karakter yang tidak diizinkan.',
  INVALID_OPTION: 'Pilihan jawaban tidak valid.',
  MALFORMED_CREDENTIAL: 'Sesi tidak dikenali. Silakan gabung ulang dengan PIN.',
  CREDENTIAL_INVALID: 'Sesi tidak dikenali. Silakan gabung ulang dengan PIN.',
  CREDENTIAL_MISMATCH: 'Sesi tidak dikenali. Silakan gabung ulang dengan PIN.',
  SESSION_NOT_FOUND: 'Ruang tidak ditemukan. Periksa PIN lagi, ya.',
  PLAYER_NOT_FOUND: 'Pemain tidak ditemukan. Silakan gabung ulang dengan PIN.',
  UNAUTHORIZED: 'Sesi sudah tidak tersedia. Silakan gabung ulang.',
  INVALID_PHASE: 'Aksi tidak valid pada fase permainan sekarang.',
  ROUND_NOT_OPEN: 'Waktu menjawab sudah berakhir.',
  PLAYER_NOT_ELIGIBLE: 'Kamu belum ikut pada putaran ini.',
  ANSWER_ALREADY_EXISTS: 'Jawaban untuk putaran ini sudah tersimpan.',
  SUBMISSION_ID_CONFLICT: 'Terjadi konflik pengiriman. Coba lagi.',
  DEADLINE_PASSED: 'Waktu menjawab sudah berakhir.',
  ROUND_MISMATCH: 'Putaran tidak cocok dengan sesi.',
  SESSION_ENDED: 'Permainan sudah selesai.',
  NO_ELIGIBLE_PLAYERS: 'Belum ada peserta. Minta siswa bergabung dulu.',
  PACKAGE_NOT_FOUND: 'Paket soal tidak ditemukan.',
  PACKAGE_INCOMPATIBLE: 'Paket soal berisi tipe soal yang belum didukung.',
  NO_SUPPORTED_QUESTIONS: 'Tidak ada soal yang bisa dimainkan dari paket ini.',
  INVALID_GAME_CONFIG: 'Konfigurasi permainan tidak valid.',
  PIN_TAKEN: 'PIN bentrok. Coba buka ruang lagi.',
  INTERNAL: 'Terjadi kesalahan. Coba lagi sebentar.',
};

export function friendlyError(code: string): string {
  return ERROR_MESSAGES[code] ?? 'Terjadi kesalahan. Coba lagi sebentar.';
}

interface MbErrorBody {
  ok: false;
  code: string;
  message?: string;
}

async function parseError(res: Response): Promise<MbApiError> {
  let code = 'INTERNAL';
  try {
    const body = (await res.json()) as Partial<MbErrorBody>;
    if (body && typeof body.code === 'string') code = body.code;
  } catch {
    // Body bukan JSON — pakai kode default.
  }
  return new MbApiError(code, friendlyError(code), res.status);
}

// ─── Guru ───────────────────────────────────────────────────

export interface TeacherStateResponse {
  ok: true;
  view: import('@/src/main-bersama/contracts/views/teacher').TeacherSessionView;
}

export async function fetchTeacherState(sessionId: string): Promise<TeacherStateResponse> {
  const res = await fetch(
    `/api/main-bersama/teacher/state?sessionId=${encodeURIComponent(sessionId)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as TeacherStateResponse;
}

export type TeacherAction =
  | 'create-session'
  | 'open-lobby'
  | 'start'
  | 'close-round'
  | 'discuss'
  | 'next-round'
  | 'pause'
  | 'resume'
  | 'end';

export async function postTeacherCommand(payload: {
  action: TeacherAction;
  sessionId?: string;
  gameMode?: string;
  /**
   * Sumber soal untuk create-session. `BANK_THEME` = tema Bank Soal
   * (referensi sumber, bukan paket baru) dengan parameter pilihan.
   * Server menormalisasi ulang — bentuk tak dikenal ditolak.
   */
  packageRef?:
    | { kind: 'SOAL_SET'; soalSetId: string }
    | {
        kind: 'BANK_THEME';
        topic: string;
        count?: number;
        difficulty?: string | null;
        seed?: string;
      };
  classId?: string;
  useSupportedQuestions?: boolean;
}): Promise<Record<string, unknown>> {
  const res = await fetch('/api/main-bersama/teacher/commands', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok || !body || (body as { ok?: boolean }).ok !== true) {
    const code =
      body && typeof (body as MbErrorBody).code === 'string'
        ? (body as MbErrorBody).code
        : 'INTERNAL';
    throw new MbApiError(code, friendlyError(code), res.status);
  }
  return body as Record<string, unknown>;
}

// ─── Siswa ──────────────────────────────────────────────────

export interface JoinResponse {
  ok: true;
  session: { id: string; teamId?: string };
  player: {
    id: string;
    displayName: string;
    eligibleFromRoundIndex: number;
    lateJoin: boolean;
    rejoin: boolean;
  };
  credential: string;
  view: import('@/src/main-bersama/contracts/views/student').StudentSessionView;
}

export async function joinSession(input: {
  pin: string;
  displayName?: string;
}): Promise<JoinResponse> {
  const res = await fetch('/api/main-bersama/student/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok || !body || (body as { ok?: boolean }).ok !== true) {
    const code =
      body && typeof (body as MbErrorBody).code === 'string'
        ? (body as MbErrorBody).code
        : 'INTERNAL';
    throw new MbApiError(code, friendlyError(code), res.status);
  }
  return body as JoinResponse;
}

export async function fetchStudentState(sessionId: string): Promise<
  import('@/src/main-bersama/contracts/views/student').StudentSessionView
> {
  const credential = loadCredential(sessionId);
  if (!credential) {
    throw new MbApiError('CREDENTIAL_INVALID', friendlyError('CREDENTIAL_INVALID'), 401);
  }
  // Credential via HEADER — tidak pernah di query string (§11).
  const res = await fetch('/api/main-bersama/student/state', {
    headers: { 'x-mb-credential': credential },
    cache: 'no-store',
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { ok: true; view: import('@/src/main-bersama/contracts/views/student').StudentSessionView };
  return body.view;
}

export async function submitAnswer(sessionId: string, input: {
  roundId: string;
  selectedOptionId: string;
  submissionId: string;
}): Promise<{ status: 'saved' | 'already-saved' }> {
  const credential = loadCredential(sessionId);
  if (!credential) {
    throw new MbApiError('CREDENTIAL_INVALID', friendlyError('CREDENTIAL_INVALID'), 401);
  }
  const res = await fetch('/api/main-bersama/student/answers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-mb-credential': credential,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { ok: true; status: 'saved' | 'already-saved' };
  return { status: body.status };
}

// ─── Proyektor ──────────────────────────────────────────────

export async function fetchProjectorState(query: {
  pin?: string;
  sessionId?: string;
}): Promise<import('@/src/main-bersama/contracts/views/projector').ProjectorSessionView> {
  const params = new URLSearchParams();
  if (query.pin) params.set('pin', query.pin);
  if (query.sessionId) params.set('sessionId', query.sessionId);
  const res = await fetch(`/api/main-bersama/projector/state?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as {
    ok: true;
    view: import('@/src/main-bersama/contracts/views/projector').ProjectorSessionView;
  };
  return body.view;
}
