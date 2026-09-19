// ─── HTTP Error Mapping (Tahap 6 §31) ───────────────────────
// Domain/application expected error → status HTTP + pesan konsisten.
// Framework-agnostic (tanpa next/react — scanner boundary §24):
// return data polos; route handler yang membungkus dengan
// NextResponse.json. Stack trace TIDAK pernah bocor; pesan
// user-friendly Indonesia.

const STATUS_BY_CODE: Record<string, number> = {
  // 400 — payload tidak valid
  NAME_EMPTY: 400,
  NAME_TOO_SHORT: 400,
  NAME_TOO_LONG: 400,
  NAME_CONTROL_CHARS: 400,
  INVALID_OPTION: 400,
  INVALID_GAME_CONFIG: 400,
  MALFORMED_CREDENTIAL: 400,
  PACKAGE_EMPTY: 400,
  PACKAGE_INCOMPATIBLE: 400,
  NO_SUPPORTED_QUESTIONS: 400,
  // 401 — tidak terautentikasi
  UNAUTHORIZED: 401,
  CREDENTIAL_INVALID: 401,
  CREDENTIAL_MISMATCH: 401,
  // 403 — terautentikasi tapi tidak berhak
  CLASS_FORBIDDEN: 403,
  // 404 — tidak ditemukan
  CLASS_NOT_FOUND: 404,
  PACKAGE_NOT_FOUND: 404,
  SESSION_NOT_FOUND: 404,
  PLAYER_NOT_FOUND: 404,
  ROUND_NOT_FOUND: 404,
  // 409 — konflik state
  INVALID_PHASE: 409,
  ROUND_NOT_OPEN: 409,
  PLAYER_NOT_ELIGIBLE: 409,
  ANSWER_ALREADY_EXISTS: 409,
  SUBMISSION_ID_CONFLICT: 409,
  ROUND_MISMATCH: 409,
  ROUND_ALREADY_APPLIED: 409,
  NO_ELIGIBLE_PLAYERS: 409,
  // 410 — gone
  DEADLINE_PASSED: 410,
  SESSION_ENDED: 410,
  // 5xx — internal
  PIN_TAKEN: 500,
  SESSION_CREATION_FAILED: 500,
  INTERNAL: 500,
};

const MESSAGE_BY_CODE: Record<string, string> = {
  NAME_EMPTY: 'Nama tidak boleh kosong.',
  NAME_TOO_SHORT: 'Nama terlalu pendek (minimal 2 karakter).',
  NAME_TOO_LONG: 'Nama terlalu panjang (maksimal 24 karakter).',
  NAME_CONTROL_CHARS: 'Nama mengandung karakter yang tidak diizinkan.',
  INVALID_OPTION: 'Pilihan jawaban tidak valid.',
  INVALID_GAME_CONFIG: 'Konfigurasi permainan tidak valid.',
  MALFORMED_CREDENTIAL: 'Kredensial tidak valid.',
  UNAUTHORIZED: 'Anda tidak memiliki akses.',
  CREDENTIAL_INVALID: 'Sesi tidak dikenali — silakan gabung ulang dengan PIN.',
  CREDENTIAL_MISMATCH: 'Kredensial tidak cocok — gabung ulang dengan PIN.',
  SESSION_NOT_FOUND: 'Sesi tidak ditemukan. Periksa PIN dan coba lagi.',
  PLAYER_NOT_FOUND: 'Pemain tidak ditemukan pada sesi ini.',
  ROUND_NOT_FOUND: 'Round tidak ditemukan.',
  CLASS_NOT_FOUND: 'Kelas tidak ditemukan.',
  CLASS_FORBIDDEN: 'Kelas ini bukan milik Anda.',
  PACKAGE_NOT_FOUND: 'Paket soal tidak ditemukan.',
  PACKAGE_INCOMPATIBLE: 'Paket soal berisi tipe soal yang belum didukung.',
  NO_SUPPORTED_QUESTIONS: 'Tidak ada soal yang didukung di paket ini.',
  INVALID_PHASE: 'Aksi tidak valid pada fase sesi sekarang.',
  ROUND_NOT_OPEN: 'Round tidak sedang dibuka.',
  PLAYER_NOT_ELIGIBLE: 'Anda belum ikut pada round ini.',
  ANSWER_ALREADY_EXISTS: 'Jawaban untuk round ini sudah tersimpan.',
  SUBMISSION_ID_CONFLICT: 'Pengiriman konflik — muat ulang dan coba lagi.',
  DEADLINE_PASSED: 'Waktu menjawab sudah berakhir.',
  ROUND_MISMATCH: 'Round tidak cocok dengan sesi.',
  SESSION_ENDED: 'Sesi sudah berakhir.',
  NO_ELIGIBLE_PLAYERS: 'Belum ada peserta yang bisa ikut bermain.',
  PIN_TAKEN: 'PIN sudah dipakai sesi aktif lain.',
  SESSION_CREATION_FAILED: 'Gagal membuat sesi. Coba lagi.',
  INTERNAL: 'Terjadi kesalahan internal.',
};

export interface MappedHttpError {
  status: number;
  body: { ok: false; code: string; message: string; reason?: string };
}

/** Data error dari typed code — stack tidak pernah bocor. */
export function mapHttpError(code: string, reason?: string): MappedHttpError {
  return {
    status: STATUS_BY_CODE[code] ?? 500,
    body: {
      ok: false,
      code,
      message: MESSAGE_BY_CODE[code] ?? 'Terjadi kesalahan.',
      ...(reason !== undefined ? { reason } : {}),
    },
  };
}
