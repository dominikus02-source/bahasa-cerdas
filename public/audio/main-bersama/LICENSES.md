# Main Bersama audio assets

The waveform assets in this directory are selected from **Kenney Interface Sounds**.

- Original source: https://kenney.nl/assets/interface-sounds
- Mirrored source used for deterministic repository import: https://github.com/Calinou/kenney-interface-sounds
- Original creator: Kenney
- License: Creative Commons CC0 1.0 Universal
- Attribution: not required by the license; retained here for provenance and auditability.

Files in BahasaCerdas:
- `join.wav` ← `confirmation_001.wav`
- `start.wav` ← `maximize_005.wav`
- `close.wav` ← `close_002.wav`
- `reveal.wav` ← `glass_001.wav`
- `milestone.wav` ← `confirmation_004.wav`
- `move.wav` ← `select_007.wav`
- `summary.wav` ← `confirmation_002.wav`

These samples are intentionally used as layers inside the Main Bersama WebAudio mix.
The application may add synthesis, envelopes, filtering, dynamics and generated reverb on top of the source samples.

## Musik kompetitif (game-show)

- Source: `components/main-bersama/sound/competitive-music.ts`. It is synthesized in real time with the Web Audio API: kick, hi-hat, clap, sawtooth bass, square-wave arpeggio, ticks, and the countdown beep/buzzer.
- No sample files and no third-party recordings. The pattern and progression (Am–F–C–E, 124/138/150 BPM) were written for BahasaCerdas.
- License: original BahasaCerdas work. No external license or attribution obligations.
- Size: 0 bytes of audio assets (code only).
- Behaviour: it plays only while the game runs. The tempo rises at ≤3 minutes and again at ≤60 seconds, with a tick on every beat. A sting plays at 1 minute, beeps cover the last 10 seconds, and a buzzer sounds when time runs out. The same mute toggle stops everything.
