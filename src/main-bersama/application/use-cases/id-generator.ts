// ─── Default Generators ─────────────────────────────────────
// Implementasi produksi IdGenerator/PinGenerator. Diinjeksi ke
// use-case; test memakai fake deterministik.
//
// randomUUID bawaan Node (crypto) — TANPA dependency baru
// (keputusan ketat Tahap 1-4: jangan install npm package).

import { randomUUID } from 'crypto';
import type { IdGenerator, PinGenerator } from './ports';

export class UuidIdGenerator implements IdGenerator {
  newId(): string {
    return randomUUID();
  }
}

/** PIN join 6 digit — angka, leading zero boleh (bukan secret). */
export class SixDigitPinGenerator implements PinGenerator {
  newPin(): string {
    return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  }
}
