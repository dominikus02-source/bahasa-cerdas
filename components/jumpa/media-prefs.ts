/**
 * Pilihan media terakhir, disimpan di localStorage (kunci tetap v1; field
 * baru Fase 3 dibaca dengan default sehingga data lama tetap sah).
 * Default seperti Zoom/Meet: kamera NYALA, mikrofon NYALA, kualitas Otomatis.
 */
export type JumpaQuality = "auto" | "hemat" | "hd";

export interface JumpaDevicePrefs {
  videoinput?: string;
  audioinput?: string;
  audiooutput?: string;
}

export interface JumpaMediaPrefs {
  camera: boolean;
  mic: boolean;
  /** Fase 3: Otomatis / Hemat Data / HD. */
  quality: JumpaQuality;
  /** Fase 3: mode audio saja — tidak kirim & tidak terima video kamera. */
  audioOnly: boolean;
  /** Fase 3: peredam bising bawaan browser (gratis, tanpa WASM). */
  noiseSuppression: boolean;
  devices: JumpaDevicePrefs;
}

export const JUMPA_PREFS_KEY = "bc-jumpa-media-v1";
export const DEFAULT_MEDIA_PREFS: JumpaMediaPrefs = {
  camera: true,
  mic: true,
  quality: "auto",
  audioOnly: false,
  noiseSuppression: true,
  devices: {},
};

const QUALITIES: readonly JumpaQuality[] = ["auto", "hemat", "hd"];
const DEVICE_ID_RE = /^[A-Za-z0-9+/=_-]{1,200}$/;

function cleanDevices(v: unknown): JumpaDevicePrefs {
  if (!v || typeof v !== "object") return {};
  const out: JumpaDevicePrefs = {};
  for (const k of ["videoinput", "audioinput", "audiooutput"] as const) {
    const id = (v as Record<string, unknown>)[k];
    if (typeof id === "string" && DEVICE_ID_RE.test(id)) out[k] = id;
  }
  return out;
}

export function parseMediaPrefs(raw: string | null | undefined): JumpaMediaPrefs {
  const d = DEFAULT_MEDIA_PREFS;
  if (!raw) return { ...d, devices: {} };
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof JumpaMediaPrefs, unknown>>;
    return {
      camera: typeof v.camera === "boolean" ? v.camera : d.camera,
      mic: typeof v.mic === "boolean" ? v.mic : d.mic,
      quality: QUALITIES.includes(v.quality as JumpaQuality) ? (v.quality as JumpaQuality) : d.quality,
      audioOnly: typeof v.audioOnly === "boolean" ? v.audioOnly : d.audioOnly,
      noiseSuppression: typeof v.noiseSuppression === "boolean" ? v.noiseSuppression : d.noiseSuppression,
      devices: cleanDevices(v.devices),
    };
  } catch {
    return { ...d, devices: {} };
  }
}

export function readMediaPrefs(): JumpaMediaPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_MEDIA_PREFS, devices: {} };
  try {
    return parseMediaPrefs(window.localStorage.getItem(JUMPA_PREFS_KEY));
  } catch {
    return { ...DEFAULT_MEDIA_PREFS, devices: {} };
  }
}

/** Simpan sebagian pilihan; field lain dipertahankan. */
export function writeMediaPrefs(patch: Partial<JumpaMediaPrefs>): JumpaMediaPrefs {
  const next = { ...readMediaPrefs(), ...patch };
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(JUMPA_PREFS_KEY, JSON.stringify(next));
  } catch {
    // Mode privat / kuota penuh — pilihan tetap berlaku untuk sesi ini.
  }
  return next;
}
