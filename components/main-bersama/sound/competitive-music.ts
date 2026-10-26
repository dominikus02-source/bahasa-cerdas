// ─── Musik kompetitif Main Bersama (Web Audio, disintesis di kode) ──
// Tidak ada file audio pihak ketiga: semua bunyi dibangkitkan oscillator
// + noise sehingga bebas lisensi, ringan (0 KB unduhan), dan selalu
// mengikuti tombol suara yang sama dengan efek suara lain.
//
// Gaya: "kuis game show" — four-on-the-floor kick, hi-hat offbeat, clap,
// bass berdenyut, dan arpeggio minor. Intensitas naik mengikuti sisa
// waktu permainan:
//   normal   → 124 BPM
//   tegang   → 138 BPM + lapisan arpeggio terbuka (≤ 3 menit)
//   menit akhir → 150 BPM + detak jam tiap ketukan + riser (≤ 60 detik)

export type MusicIntensity = 0 | 1 | 2;

const STEPS_PER_BAR = 16;
const BPM: Record<MusicIntensity, number> = { 0: 124, 1: 138, 2: 150 };
const MUSIC_VOLUME = 0.2;
const FADE_S = 0.6;

// A minor — Am | F | C | E (dominan mayor = ketegangan khas game show).
const PROGRESSION: { root: number; arp: number[] }[] = [
  { root: 45, arp: [57, 60, 64, 69] },
  { root: 41, arp: [53, 57, 60, 65] },
  { root: 48, arp: [55, 60, 64, 67] },
  { root: 40, arp: [56, 59, 64, 68] },
];

function midiToHz(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

export class CompetitiveMusic {
  private readonly context: AudioContext;
  private readonly bus: GainNode;
  /** Efek waktu (bip/bel) — terpisah dari fade musik, tujuan sama (mixer master). */
  private readonly sfx: GainNode;
  private readonly noise: AudioBuffer;
  private timer: number | null = null;
  private nextStepTime = 0;
  private step = 0;
  private bar = 0;
  private intensity: MusicIntensity = 0;
  private playing = false;

  constructor(context: AudioContext, destination: AudioNode) {
    this.context = context;
    this.bus = context.createGain();
    this.bus.gain.value = 0.0001;
    this.bus.connect(destination);
    this.sfx = context.createGain();
    this.sfx.gain.value = 1;
    this.sfx.connect(destination);
    this.noise = makeNoise(context);
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setIntensity(intensity: MusicIntensity): void {
    this.intensity = intensity;
  }

  start(): void {
    if (this.playing) return;
    this.playing = true;
    const now = this.context.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setValueAtTime(Math.max(0.0001, this.bus.gain.value), now);
    this.bus.gain.exponentialRampToValueAtTime(MUSIC_VOLUME, now + FADE_S);
    this.step = 0;
    this.bar = 0;
    this.nextStepTime = now + 0.08;
    this.timer = window.setInterval(() => this.schedule(), 40);
    this.schedule();
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    const now = this.context.currentTime;
    this.bus.gain.cancelScheduledValues(now);
    this.bus.gain.setValueAtTime(Math.max(0.0001, this.bus.gain.value), now);
    this.bus.gain.exponentialRampToValueAtTime(0.0001, now + FADE_S * 0.6);
  }

  /** Bip hitung mundur 10 detik terakhir (lebih tinggi di 3 detik akhir). */
  countdownBeep(secondsLeft: number): void {
    const t = this.context.currentTime + 0.01;
    const high = secondsLeft <= 3;
    this.tone(high ? 1318.5 : 987.8, t, 0.11, "square", high ? 0.09 : 0.07, this.sfx);
  }

  /** Peringatan "satu menit terakhir": dua nada naik. */
  oneMinuteSting(): void {
    const t = this.context.currentTime + 0.02;
    const out = this.sfx;
    this.tone(659.3, t, 0.16, "sawtooth", 0.07, out);
    this.tone(880, t + 0.17, 0.16, "sawtooth", 0.07, out);
    this.tone(1174.7, t + 0.34, 0.32, "sawtooth", 0.08, out);
  }

  /** Bel akhir ala game show saat waktu habis. */
  timeUpBuzzer(): void {
    const t = this.context.currentTime + 0.02;
    const out = this.sfx;
    for (const f of [220, 277.2, 329.6]) this.tone(f, t, 0.9, "sawtooth", 0.06, out, 0.9);
  }

  dispose(): void {
    this.stop();
    window.setTimeout(() => {
      try {
        this.bus.disconnect();
        this.sfx.disconnect();
      } catch {
        // sudah terputus
      }
    }, 1000);
  }

  // ── internal ─────────────────────────────────────────────

  private schedule(): void {
    const lookahead = typeof document !== "undefined" && document.hidden ? 1.5 : 0.25;
    while (this.nextStepTime < this.context.currentTime + lookahead) {
      this.playStep(this.step, this.nextStepTime);
      const secondsPerStep = 60 / BPM[this.intensity] / 4;
      this.nextStepTime += secondsPerStep;
      this.step = (this.step + 1) % STEPS_PER_BAR;
      if (this.step === 0) this.bar = (this.bar + 1) % PROGRESSION.length;
    }
  }

  private playStep(step: number, t: number): void {
    const chord = PROGRESSION[this.bar]!;
    const level = this.intensity;
    const stepDur = 60 / BPM[level] / 4;

    if (step % 4 === 0) this.kick(t);
    if (step % 4 === 2) this.hat(t, 0.05, 0.035);
    if (level >= 1 && step % 2 === 1) this.hat(t, 0.025, 0.02);
    if (step === 4 || step === 12) this.clap(t);

    // Bass berdenyut tiap 1/8 dengan oktaf bergantian.
    if (step % 2 === 0) {
      const note = chord.root + (step % 8 === 4 ? 12 : 0);
      this.bass(midiToHz(note), t, stepDur * 1.6);
    }

    // Arpeggio 1/16 — terbuka lebih terang saat waktu menipis.
    const arpNote = chord.arp[step % chord.arp.length]! + (level === 2 && step >= 8 ? 12 : 0);
    this.lead(midiToHz(arpNote), t, stepDur * 0.9, level);

    // Menit akhir: detak jam tiap ketukan + riser di bar terakhir progresi.
    if (level === 2) {
      if (step % 4 === 0) this.tick(t);
      if (step === 0 && this.bar === PROGRESSION.length - 1) this.riser(t, stepDur * 16);
    }
  }

  private envGain(t: number, peak: number, decay: number): GainNode {
    const g = this.context.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    g.connect(this.bus);
    return g;
  }

  private kick(t: number): void {
    const osc = this.context.createOscillator();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    osc.connect(this.envGain(t, 0.9, 0.22));
    osc.start(t);
    osc.stop(t + 0.25);
  }

  private hat(t: number, decay: number, peak: number): void {
    const src = this.context.createBufferSource();
    src.buffer = this.noise;
    const hp = this.context.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    src.connect(hp).connect(this.envGain(t, peak * 6, decay));
    src.start(t);
    src.stop(t + decay + 0.02);
  }

  private clap(t: number): void {
    const src = this.context.createBufferSource();
    src.buffer = this.noise;
    const bp = this.context.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1500;
    bp.Q.value = 0.8;
    src.connect(bp).connect(this.envGain(t, 0.35, 0.14));
    src.start(t);
    src.stop(t + 0.16);
  }

  private bass(freq: number, t: number, dur: number): void {
    const osc = this.context.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);
    const lp = this.context.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(220, t + dur);
    osc.connect(lp).connect(this.envGain(t, 0.32, dur));
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private lead(freq: number, t: number, dur: number, level: MusicIntensity): void {
    const osc = this.context.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, t);
    const lp = this.context.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = level === 0 ? 1800 : level === 1 ? 2800 : 4200;
    osc.connect(lp).connect(this.envGain(t, level === 0 ? 0.05 : 0.07, dur));
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private tick(t: number): void {
    const osc = this.context.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(2400, t);
    osc.connect(this.envGain(t, 0.08, 0.03));
    osc.start(t);
    osc.stop(t + 0.05);
  }

  private riser(t: number, dur: number): void {
    const src = this.context.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const bp = this.context.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(6000, t + dur);
    const g = this.context.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + dur * 0.95);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(this.bus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private tone(freq: number, t: number, dur: number, type: OscillatorType, peak: number, out: AudioNode, decay = dur): void {
    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const g = this.context.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + decay + 0.03);
  }
}

function makeNoise(context: AudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * 1);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}
