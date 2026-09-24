# Pendekar Suryakerta — Masterpiece Quality Matrix

## Purpose

Dokumen ini menjadi quality gate pengembangan **Pendekar Suryakerta — Legenda Nusantara**. Targetnya bukan sekadar vertical slice yang selesai, tetapi RPG yang terasa utuh, konsisten, aman, mudah dipelihara, dan layak dibuka ke pemain ketika Founder menyatakan siap.

**Prinsip utama:** setiap sistem yang terlihat pemain harus mempunyai pemilik state yang jelas, jalur error yang jelas, persistence yang jelas, feedback yang jelas, dan test gate yang jelas.

## 1. Player Experience

- [x] Movement keyboard melalui command pipeline
- [x] Mobile virtual joystick melalui command pipeline yang sama
- [x] Camera follow dengan restrained look-ahead
- [x] Collision dan world bounds
- [x] Interaction prompt
- [ ] Directional/animated interaction prompt
- [ ] Footstep / movement feedback
- [ ] Damage / hit feedback yang konsisten
- [ ] Defeat / recovery feedback
- [ ] Loading / hydration feedback
- [ ] Explicit offline/network degraded-state feedback
- [ ] Accessibility pass: text size, contrast, reduced-motion consideration

## 2. World & Atmosphere

- [x] Canonical tile maps
- [x] Depth sorting untuk entities
- [x] Water shimmer presentation
- [x] Portals
- [x] Chests
- [x] NPC interaction
- [ ] Ambient particles with deterministic seed
- [ ] Local environmental effects per biome
- [ ] Idle/breathing/bob presentation for actors where art permits
- [ ] Day/night or equivalent atmosphere only when it has gameplay/content value
- [ ] World landmark readability
- [ ] Map transition presentation
- [ ] World-state persistence for meaningful changes

## 3. Characters & Art

- [x] Arga visual canon locked
- [x] Canonical walk-down/up/side runtime sheets
- [x] Explicit asset manifest statuses
- [x] No unverified visual asset promoted as READY
- [x] Entity resolver
- [x] Ki Jaka READY asset path
- [ ] Production-ready non-walk Arga states
- [ ] Production-ready NPC sheets
- [ ] Production-ready enemy sheets
- [ ] Production-ready boss sheets
- [ ] Standalone prop sprites from approved source packs
- [ ] Final visual scale calibration
- [ ] Sprite loading/error diagnostics
- [ ] Final art consistency review

## 4. Combat Feel

- [x] Authoritative battle core
- [x] Learning challenge integrated into battle
- [x] Hit-stop
- [x] Camera shake
- [x] Flash feedback
- [x] Floating damage
- [x] Deterministic impact burst
- [ ] Attack anticipation / recovery presentation
- [ ] Enemy hit reaction
- [ ] Critical-hit presentation
- [ ] Skill-specific presentation
- [ ] Victory presentation
- [ ] Defeat presentation
- [ ] Battle transition in/out
- [ ] Audio feedback layer when approved assets are available

## 5. Learning Loop

- [x] Learning challenge selection
- [x] Server-side answer validation
- [x] Correct answer feedback
- [x] Learning effect can influence combat
- [ ] Explain-why feedback
- [ ] Difficulty/readiness adaptation
- [ ] Learning history/progression reflection
- [ ] Anti-grind / anti-pay-to-win safeguards
- [ ] Content-quality gate for every RPG question pool

## 6. Progression & Economy

- [x] XP
- [x] Level progression
- [x] Gold ledger
- [x] Inventory
- [x] Equipment state
- [x] Chest rewards
- [x] Server reward settlement
- [x] Idempotency/dedup boundaries
- [ ] Equipment visual representation
- [ ] Loot presentation
- [ ] Meaningful build choices
- [ ] Economy sink/source audit
- [ ] Reward pacing audit

## 7. Quest & Narrative

- [x] Main quest state
- [x] Dialogue state machine
- [x] Quest objectives
- [x] Boss progression
- [x] Reward signals
- [ ] Dialogue portrait/character presentation
- [ ] Quest acceptance/completion feedback
- [ ] Optional side quests
- [ ] Journal
- [ ] Story recap
- [ ] Choice design, if introduced
- [ ] Narrative continuity audit

## 8. Persistence & Multiplayer Readiness

- [x] Server snapshot hydration
- [x] Local cache fallback
- [x] Legacy save migration path
- [x] Server-authoritative battle boundary
- [x] Server revision protection
- [x] Reward reconciliation
- [x] Multiplayer-ready command vocabulary
- [ ] World-state conflict/reconciliation audit
- [ ] Reconnect/resume UX
- [ ] Duplicate command protection audit
- [ ] Cross-device resume test
- [ ] Multiplayer simulation test before any online rollout

## 9. UI / UX

- [x] HUD
- [x] Quest panel
- [x] Dialogue panel
- [x] Battle panel
- [x] Mobile controls
- [ ] Responsive landscape/portrait pass
- [ ] Context-aware controls by game mode
- [ ] Inventory screen
- [ ] Equipment screen
- [ ] Journal/map screen
- [ ] Pause/settings screen
- [ ] Confirmation for irreversible actions
- [ ] Clear error/retry states
- [ ] Reduced-motion/accessibility options

## 10. Reliability & Safety

- [x] RPG unpublished while unfinished
- [x] Explicit asset readiness statuses
- [x] Authoritative server boundaries
- [x] Regression scripts
- [x] CI visual regression gates
- [ ] Full RPG typecheck gate
- [ ] Full RPG lint gate
- [ ] Full RPG gameplay regression suite
- [ ] Browser smoke playtest
- [ ] Mobile touch playtest
- [ ] Slow-network playtest
- [ ] Refresh/resume playtest
- [ ] Long-session memory/performance test
- [ ] Production route visibility gate before launch

## 11. Performance

- [x] Fixed timestep with spiral-of-death cap
- [x] Off-screen tile culling
- [x] Sprite caching
- [x] Asset preload boundary
- [ ] Draw-call profiling
- [ ] Large-map stress test
- [ ] Mobile low-end performance test
- [ ] Asset memory budget
- [ ] Long-session leak test
- [ ] Network latency simulation

## 12. Launch Gate

Pendekar Suryakerta tidak boleh dipublikasikan hanya karena fitur utama sudah bekerja.

Release candidate membutuhkan:

1. **Art Gate** — production assets lengkap dan tervalidasi.
2. **Gameplay Gate** — core loop menyenangkan dan tidak memiliki soft-lock.
3. **Learning Gate** — pembelajaran benar-benar menjadi bagian dari progression.
4. **Persistence Gate** — refresh, reconnect, dan cross-device tidak merusak state.
5. **Economy Gate** — reward tidak dapat digandakan melalui retry/race condition.
6. **Performance Gate** — desktop dan mobile memenuhi target runtime.
7. **UX Gate** — pemain selalu tahu apa yang dapat dilakukan berikutnya.
8. **Content Gate** — quest, dialogue, battle, dan learning content telah direview.
9. **Safety Gate** — normal users tetap tidak dapat mengakses preview selama gate belum dibuka.
10. **Founder Gate** — Founder melakukan final playthrough dan menyatakan build siap.

## Current Strategic Rule

**Jangan mengisi gap visual dengan asset yang belum tervalidasi. Jangan menambah sistem hanya demi terlihat banyak. Setiap fitur baru harus memperkuat salah satu dari: feel, world, learning, progression, narrative, reliability, atau replayability.**

Status dokumen ini sengaja hidup selama development dan harus diperbarui setiap kali sebuah gate benar-benar selesai.
