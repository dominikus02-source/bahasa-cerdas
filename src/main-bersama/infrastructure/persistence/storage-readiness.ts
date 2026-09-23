// ─── Main Bersama Storage Readiness (Diagnostic Ringan) ─────
// Deteksi cepat apakah skema Main Bersama VERSI APLIKASI SEKARANG
// benar-benar tersedia di database yang dipakai proses ini.
//
// Kenapa ada: kegagalan paling membingungkan yang pernah terjadi
// adalah deployment yang menunjuk database yang BELUM dimigrasi
// (tabel `MainSession` tidak ada) — gejalanya hanya "Buka Ruang"
// gagal berulang tanpa petunjuk. Helper ini membuat penyebab itu
// terlihat dalam SEKALI request, bukan setelah debugging panjang.
//
// `ready` harus berarti "aplikasi ini bisa langsung dipakai", bukan
// "tabel utama kelihatan ada". Karena itu yang diperiksa:
//   1. 9 tabel Main Bersama (hasil migration base);
//   2. kolom `MainSession.contentTitle` DAN statusnya NOT NULL
//      (hasil migration contentTitle) — memakai kolom yang belum
//      ada akan gagal walau tabel utamanya ada;
//   3. 4 enum Main Bersama.
//
// Batasan yang disengaja:
// - READ-ONLY: hanya katalog (`to_regclass`/`pg_type`/
//   `information_schema`) — tidak menyentuh data/DDL.
// - Hasil di-cache singkat supaya tidak jadi query per request.
// - Detail teknis (nama tabel/enum/error) HANYA untuk log server;
//   yang keluar ke pengguna cukup status.

import { db } from '@/lib/db';

/** 9 tabel yang dibuat migration base — semuanya WAJIB ada. */
const REQUIRED_TABLES = [
  'MainSession',
  'MainPlayer',
  'MainQuestionSnapshot',
  'MainRound',
  'MainRoundEligiblePlayer',
  'MainAnswer',
  'MainAnswerSubmission',
  'MainGameState',
  'MainGameRoundResult',
] as const;

/** 4 enum yang dibuat migration base. */
const REQUIRED_ENUMS = [
  'MainSessionPhase',
  'MainGameMode',
  'MainRoundStatus',
  'MainGameStateStatus',
] as const;

const CACHE_TTL_MS = 30_000;

type ReadinessState = 'ready' | 'unavailable' | 'unknown';

/** Rincian kekurangan — untuk log server, JANGAN ke respons HTTP. */
export interface StorageReadinessDetail {
  missingTables: string[];
  missingEnums: string[];
  /** `contentTitle` belum ada atau masih nullable. */
  contentTitleNotRequired: boolean;
}

interface CacheEntry {
  state: ReadinessState;
  checkedAt: number;
}

let cache: CacheEntry | null = null;

/**
 * Status kesiapan storage Main Bersama.
 * - `ready` — 9 tabel + 4 enum + `MainSession.contentTitle NOT NULL`.
 * - `unavailable` — minimal satu objek di atas belum ada (skema belum
 *   diterapkan / baru diterapkan sebagian).
 * - `unknown` — database tidak terjangkau / pemeriksaan gagal.
 */
export async function checkMainBersamaStorage(): Promise<{
  state: ReadinessState;
  detail: StorageReadinessDetail;
}> {
  const now = Date.now();
  if (cache && now - cache.checkedAt < CACHE_TTL_MS) {
    return { state: cache.state, detail: emptyDetail() };
  }

  try {
    const tables = REQUIRED_TABLES as unknown as string[];
    const enums = REQUIRED_ENUMS as unknown as string[];

    const [counts] = await db.$queryRaw<
      Array<{
        tables_present: number;
        enums_present: number;
        content_title_not_null: number;
      }>
    >`
      SELECT
        (SELECT count(*)::int
           FROM unnest(${tables}::text[]) AS n(name)
          WHERE to_regclass('public.' || quote_ident(n.name)) IS NOT NULL)
          AS tables_present,
        (SELECT count(*)::int
           FROM unnest(${enums}::text[]) AS e(name)
          WHERE EXISTS (
            SELECT 1 FROM pg_type t
             WHERE t.typtype = 'e' AND t.typname = e.name))
          AS enums_present,
        (SELECT count(*)::int
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'MainSession'
            AND column_name = 'contentTitle'
            AND is_nullable = 'NO')
          AS content_title_not_null
    `;

    const tablesOk = counts.tables_present === REQUIRED_TABLES.length;
    const enumsOk = counts.enums_present === REQUIRED_ENUMS.length;
    const contentTitleOk = counts.content_title_not_null === 1;
    const state: ReadinessState =
      tablesOk && enumsOk && contentTitleOk ? 'ready' : 'unavailable';
    cache = { state, checkedAt: now };

    if (state === 'ready') {
      return { state, detail: emptyDetail() };
    }

    // Jalur gagal (jarang): ambil nama objek yang hilang untuk log
    // server — supaya operator langsung tahu apa yang perlu di-apply.
    const detail = await loadMissingDetail(tables, enums, contentTitleOk);
    console.warn(
      '[main-bersama] preflight storage: skema belum lengkap —',
      `tabel hilang: [${detail.missingTables.join(', ') || '-'}],`,
      `enum hilang: [${detail.missingEnums.join(', ') || '-'}],`,
      `contentTitle NOT NULL: ${!detail.contentTitleNotRequired}`,
      '(jalankan runbook migrasi Main Bersama; detail hanya di log server)',
    );
    return { state, detail };
  } catch (error) {
    // Database tak terjangkau / kredensial salah: beda masalah,
    // status jujur `unknown` (bukan klaim "skema hilang").
    console.error(
      '[main-bersama] preflight storage gagal diperiksa:',
      error instanceof Error ? error.message : error,
    );
    cache = { state: 'unknown', checkedAt: now };
    return { state: 'unknown', detail: emptyDetail() };
  }
}

async function loadMissingDetail(
  tables: string[],
  enums: string[],
  contentTitleOk: boolean,
): Promise<StorageReadinessDetail> {
  const rows = await db.$queryRaw<Array<{ kind: string; name: string }>>`
    SELECT 'table' AS kind, n.name
      FROM unnest(${tables}::text[]) AS n(name)
     WHERE to_regclass('public.' || quote_ident(n.name)) IS NULL
    UNION ALL
    SELECT 'enum' AS kind, e.name
      FROM unnest(${enums}::text[]) AS e(name)
     WHERE NOT EXISTS (
       SELECT 1 FROM pg_type t WHERE t.typtype = 'e' AND t.typname = e.name)
  `;
  return {
    missingTables: rows.filter((r) => r.kind === 'table').map((r) => r.name),
    missingEnums: rows.filter((r) => r.kind === 'enum').map((r) => r.name),
    contentTitleNotRequired: !contentTitleOk,
  };
}

function emptyDetail(): StorageReadinessDetail {
  return {
    missingTables: [],
    missingEnums: [],
    contentTitleNotRequired: false,
  };
}

/** Buang cache (dipakai test / setelah operator memperbaiki skema). */
export function resetMainBersamaStorageCache(): void {
  cache = null;
}
