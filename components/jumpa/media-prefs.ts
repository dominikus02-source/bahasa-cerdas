/**
 * Pilihan kamera/mikrofon terakhir, disimpan di localStorage.
 * Default seperti Zoom/Meet: kamera NYALA, mikrofon NYALA.
 */
export interface JumpaMediaPrefs {
  camera: boolean;
  mic: boolean;
}

export const JUMPA_PREFS_KEY = "bc-jumpa-media-v1";
export const DEFAULT_MEDIA_PREFS: JumpaMediaPrefs = { camera: true, mic: true };

export function parseMediaPrefs(raw: string | null | undefined): JumpaMediaPrefs {
  if (!raw) return { ...DEFAULT_MEDIA_PREFS };
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof JumpaMediaPrefs, unknown>>;
    return {
      camera: typeof v.camera === "boolean" ? v.camera : DEFAULT_MEDIA_PREFS.camera,
      mic: typeof v.mic === "boolean" ? v.mic : DEFAULT_MEDIA_PREFS.mic,
    };
  } catch {
    return { ...DEFAULT_MEDIA_PREFS };
  }
}

export function readMediaPrefs(): JumpaMediaPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_MEDIA_PREFS };
  try {
    return parseMediaPrefs(window.localStorage.getItem(JUMPA_PREFS_KEY));
  } catch {
    return { ...DEFAULT_MEDIA_PREFS };
  }
}

export function writeMediaPrefs(prefs: JumpaMediaPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(JUMPA_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Mode privat / kuota penuh — pilihan tetap berlaku untuk sesi ini.
  }
}
