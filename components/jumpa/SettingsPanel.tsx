"use client";

/**
 * JUMPA Fase 3 — panel Pengaturan (dipakai di lobby DAN di ruang).
 * Murni React + Web API (tanpa LiveKit) supaya lobby tetap ringan; ruang
 * menerapkan perubahan lewat onChange (switchActiveDevice, terbitkan ulang).
 */
import { useEffect, useState } from "react";
import { Camera, Crown, Headphones, Lock, Mic, Sparkles, AudioWaveform, Leaf, Gauge, MonitorPlay, Sun, Moon } from "lucide-react";
import { JUMPA_TIERS, type JumpaTierView } from "@/lib/jumpa/tiers";
import { QUALITY_LABEL } from "./media-policy";
import type { JumpaMediaPrefs, JumpaQuality } from "./media-prefs";
import { JUMPA_BACKGROUNDS } from "./backgrounds";
import { TierBadge, tierLimitsText } from "./TierUi";

type Kind = "videoinput" | "audioinput" | "audiooutput";

/** Daftar perangkat (enumerateDevices + devicechange). Tanpa izin: label generik. */
export function useDeviceList(kind: Kind, refreshKey = 0): MediaDeviceInfo[] {
  const [list, setList] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => {
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!md?.enumerateDevices) return;
    let alive = true;
    const load = () =>
      md
        .enumerateDevices()
        .then((all) => alive && setList(all.filter((d) => d.kind === kind && d.deviceId !== "")))
        .catch(() => undefined);
    void load();
    md.addEventListener?.("devicechange", load);
    return () => {
      alive = false;
      md.removeEventListener?.("devicechange", load);
    };
  }, [kind, refreshKey]);
  return list;
}

export function supportsSpeakerSelect(): boolean {
  return typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;
}

const DEVICE_FALLBACK: Record<Kind, string> = { videoinput: "Kamera", audioinput: "Mikrofon", audiooutput: "Pengeras suara" };

function DeviceSelect({ kind, value, onChange, icon, label, refreshKey }: { kind: Kind; value?: string; onChange: (id: string) => void; icon: React.ReactNode; label: string; refreshKey: number }) {
  const devices = useDeviceList(kind, refreshKey);
  const current = value && devices.some((d) => d.deviceId === value) ? value : devices.find((d) => d.deviceId === "default")?.deviceId ?? devices[0]?.deviceId ?? "";
  return (
    <label className="jumpa-field">
      <span className="jumpa-field-label">{icon} {label}</span>
      <select className="jumpa-input w-full" value={current} onChange={(e) => onChange(e.target.value)} disabled={devices.length === 0} aria-label={label}>
        {devices.length === 0 && <option value="">Belum ada izin perangkat</option>}
        {devices.map((d, i) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `${DEVICE_FALLBACK[kind]} ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}

function Switch({ on, onToggle, label, hint, icon, disabled }: { on: boolean; onToggle: () => void; label: string; hint: string; icon: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="jumpa-setting-row" onClick={onToggle} disabled={disabled}>
      <span className="jumpa-setting-icon" aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-[var(--jp-text-3)]">{hint}</span>
      </span>
      <span className="jumpa-switch" data-on={on} aria-hidden />
    </button>
  );
}

export interface SettingsPanelProps {
  prefs: JumpaMediaPrefs;
  onChange: (patch: Partial<JumpaMediaPrefs>) => void;
  tier: JumpaTierView;
  /** Ganti angka ini untuk memuat ulang daftar perangkat (mis. setelah izin). */
  refreshKey?: number;
  /** Mode otomatis menurunkan kualitas karena koneksi lemah. */
  degraded?: boolean;
}

export default function SettingsPanel({ prefs, onChange, tier, refreshKey = 0, degraded = false }: SettingsPanelProps) {
  const [speakerOk, setSpeakerOk] = useState(false);
  useEffect(() => setSpeakerOk(supportsSpeakerSelect()), []);
  const setDevice = (kind: Kind, id: string) => onChange({ devices: { ...prefs.devices, [kind]: id } });
  const hdLabel = `${tier.maxCameraHeight}p`;
  const blurAvailable = JUMPA_TIERS.PREMIUM.features.backgroundBlur && tier.tier === "PREMIUM";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-5 pt-1">
      <section aria-labelledby="jp-set-theme">
        <h3 id="jp-set-theme" className="jumpa-section-label">Tampilan</h3>
        <div className="jumpa-seg" role="radiogroup" aria-label="Tema">
          <button type="button" role="radio" aria-checked={prefs.theme !== "light"} className="jumpa-seg-btn" onClick={() => onChange({ theme: "dark" })}>
            <Moon size={16} /> <span>Gelap</span>
          </button>
          <button type="button" role="radio" aria-checked={prefs.theme === "light"} className="jumpa-seg-btn" onClick={() => onChange({ theme: "light" })}>
            <Sun size={16} /> <span>Terang</span>
          </button>
        </div>
      </section>

      <section aria-labelledby="jp-set-dev">
        <h3 id="jp-set-dev" className="jumpa-section-label">Perangkat</h3>
        <div className="grid gap-3">
          <DeviceSelect kind="videoinput" label="Kamera" icon={<Camera size={15} />} value={prefs.devices.videoinput} onChange={(id) => setDevice("videoinput", id)} refreshKey={refreshKey} />
          <DeviceSelect kind="audioinput" label="Mikrofon" icon={<Mic size={15} />} value={prefs.devices.audioinput} onChange={(id) => setDevice("audioinput", id)} refreshKey={refreshKey} />
          {speakerOk ? (
            <DeviceSelect kind="audiooutput" label="Pengeras suara" icon={<Headphones size={15} />} value={prefs.devices.audiooutput} onChange={(id) => setDevice("audiooutput", id)} refreshKey={refreshKey} />
          ) : (
            <p className="jumpa-field-note"><Headphones size={14} /> Pengeras suara: ikuti perangkat.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="jp-set-q">
        <h3 id="jp-set-q" className="jumpa-section-label">Kualitas video</h3>
        <div className="jumpa-seg" role="radiogroup" aria-label="Kualitas video">
          {(["auto", "hemat", "hd"] as JumpaQuality[]).map((q) => (
            <button key={q} type="button" role="radio" aria-checked={prefs.quality === q} className="jumpa-seg-btn" onClick={() => onChange({ quality: q })}>
              {q === "auto" ? <Gauge size={16} /> : q === "hemat" ? <Leaf size={16} /> : <MonitorPlay size={16} />}
              <span>{QUALITY_LABEL[q].title}</span>
            </button>
          ))}
        </div>
        <p className="jumpa-field-note mt-2">
          {prefs.quality === "hd" ? `Maks ${hdLabel} · ${QUALITY_LABEL.hd.hint}` : QUALITY_LABEL[prefs.quality].hint}
          {degraded && prefs.quality === "auto" ? " Koneksi sedang lemah, kualitas diturunkan sementara." : ""}
        </p>
      </section>

      <section aria-labelledby="jp-set-a" className="grid gap-2">
        <h3 id="jp-set-a" className="jumpa-section-label">Audio & data</h3>
        <Switch
          on={prefs.audioOnly}
          onToggle={() => onChange({ audioOnly: !prefs.audioOnly })}
          label="Mode audio saja"
          hint="Tanpa video kamera; layar bersama tetap tampil."
          icon={<AudioWaveform size={18} />}
        />
        <Switch
          on={prefs.noiseSuppression}
          onToggle={() => onChange({ noiseSuppression: !prefs.noiseSuppression })}
          label="Peredam bising"
          hint="Redam kipas, motor, dan kelas ramai."
          icon={<Mic size={18} />}
        />
        <div className="jumpa-setting-row" aria-disabled={!blurAvailable}>
          <span className="jumpa-setting-icon" aria-hidden><Sparkles size={18} /></span>
          <span className="min-w-0 flex-1 text-left">
            <span className="flex items-center gap-2 text-sm font-semibold">
              Latar blur <span className="jumpa-tier" data-tier="PREMIUM"><Crown size={11} aria-hidden /> Premium</span>
            </span>
            <span className="block text-xs text-[var(--jp-text-3)]">{blurAvailable ? "Samarkan latar kamera." : "Khusus pengguna Premium."}</span>
          </span>
          {blurAvailable ? (
            <button
              type="button"
              onClick={() => onChange({ background: prefs.background === "blur" ? "none" : "blur" as any })}
              className="jumpa-switch"
              data-on={prefs.background === "blur"}
              aria-pressed={prefs.background === "blur"}
            >
              <span className="jumpa-switch-knob" />
            </button>
          ) : (
            <Lock size={16} className="text-[var(--jp-text-3)]" aria-label="Premium" />
          )}
        </div>
      </section>


      <section aria-labelledby="jp-set-bg">
        <h3 id="jp-set-bg" className="jumpa-section-label">Latar ruang</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {JUMPA_BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              type="button"
              onClick={() => onChange({ background: bg.id as any })}
              className="jumpa-bg-option"
              data-selected={prefs.background === bg.id}
              aria-pressed={prefs.background === bg.id}
            >
              <span className="jumpa-bg-preview" aria-hidden>
                {bg.image ? <img src={bg.image} alt="" className="h-full w-full object-cover" /> : <span className="block h-full w-full bg-[var(--jp-surface-2)]" />}
              </span>
              <span className="jumpa-bg-label">{bg.label}</span>
            </button>
          ))}
        </div>
        {prefs.background === "custom" && (
          <label className="jumpa-field mt-3 block">
            <span className="jumpa-field-label">Unggah gambar sendiri</span>
            <input
              type="file"
              accept="image/*"
              className="jumpa-input w-full text-xs"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => onChange({ customBackgroundUrl: reader.result as string });
                reader.readAsDataURL(file);
              }}
            />
            {prefs.customBackgroundUrl && <img src={prefs.customBackgroundUrl} alt="Pratinjau" className="mt-2 h-16 w-full rounded object-cover" />}
          </label>
        )}
      </section>

      <section aria-labelledby="jp-set-t">
        <h3 id="jp-set-t" className="jumpa-section-label">Paket ruang ini</h3>
        <div className="jumpa-plan-card">
          <div className="flex items-center justify-between gap-2">
            <TierBadge tier={tier} />
            <span className="text-sm text-[var(--jp-text-2)]">{tierLimitsText(tier)} · {hdLabel}</span>
          </div>
          {tier.canUpgrade && tier.upgradeUrl && (
            <a href={tier.upgradeUrl} target="_blank" rel="noopener" className="jumpa-chip mt-3">
              <Crown size={14} /> Lihat Premium
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
