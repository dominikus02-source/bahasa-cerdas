# BANK SOAL 2.0 — Forensic UI Audit

## Current Architecture

### Data Flow
```
GET /api/guru/bank-soal → { themes: ThemeData[] }  (in-memory groupBy topik)
GET /api/guru/latihan  → { latihans: LatihanItem[] }
GET /api/group         → { groups: GroupItem[] }
GET /api/guru/bank-soal/preview?tema=&jumlah=&seed= → preview set
POST /api/guru/bank-soal/send → Kirim ke kelas
```

Themes are grouped client-side via regex into 5 categories (Tata Bahasa, Sastra, Jenis Teks, Fungsional, Lainnya).

### Reusable Components Found
- `components/guru/bank-soal/ThemeCard.tsx` — card with procedural cover, metadata, hover. GOOD foundation.
- `components/guru/bank-soal/theme-cover.tsx` — `CATEGORY_VISUALS`, `categoryVisual()`, `themeVariant()`, `ThemeCoverArt`. SOLID category token system.
- `components/ui/card.tsx` — shadcn Card, but Bank Soal uses raw buttons/divs with Tailwind.
- `components/ui/badge.tsx` — Badge with variant system.
- `components/ui/modal.tsx` — Modal (portal-free, overlay + panel).
- `components/ui/button.tsx` — Button with 8 variants.

### Reusable Design Tokens
- `--clr-*` semantic tokens (globals.css :root) — accent, surface, text, border, etc.
- `.bc-badge-*` primitives — success/warning/danger/info/violet (global, no scope).
- `CATEGORY_VISUALS` in theme-cover.tsx — 5 category color configs.
- Game card pattern: `bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5`.

### GIM Visual DNA (Reference)
- Card: `rounded-xl border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5`
- Hero gradient: `from-emerald-600 via-green-700 to-teal-900`
- Section spacing: `mb-8` between sections
- Section heading: `text-base font-bold text-gray-800` + dot + badge
- Typography: Inter sans, Georgia display
- Icon containers: `w-9 h-9 rounded-xl bg-gradient-to-br`
- Badge: `text-[10px] px-2 py-0.5 rounded-full font-semibold`

### Current UX Problems
1. **Flat list feel** — 77 themes in flat grid, no visual hierarchy or discovery.
2. **No horizontal shelves** — no carousel/shelf pattern for browsing.
3. **Category sections** exist but are just grids of identical cards.
4. **No featured collections** — GB4 (Tokoh Sastra) has no special treatment.
5. **Hero is basic** — no editorial feel, just a search box.
6. **"Latihan Saya" at the bottom** — should be higher if there's active progress.
7. **Main Bersama CTA** is good but could be more prominent.
8. **No exploration narrative** — the page doesn't tell a story.

### Recommended Component Architecture
```
components/guru/bank-soal/
├── theme-cover.tsx          (EXISTING — reuse as-is)
├── ThemeCard.tsx            (EXISTING — enhance with featured variant)
├── BankSoalHero.tsx         (NEW — editorial hero)
├── BankSoalSearch.tsx       (NEW — prominent search)
├── BankSoalCategoryNav.tsx  (NEW — horizontal category chips)
├── ThemeShelf.tsx           (NEW — horizontal carousel section)
├── FeaturedCollection.tsx   (NEW — GB4 Tokoh Sastra showcase)
├── ContinuePractice.tsx     (NEW — active latihan cards)
├── theme-config.ts          (NEW — visual config for featured themes)
└── collection-config.ts     (NEW — collection definitions)
```

### Theme Engine Architecture
- `theme-cover.tsx` already has the category system (5 categories, gradients, icons).
- Need to ADD: featured theme config, collection config, theme images.
- `ThemeCard` needs a featured variant (larger card with more visual weight).
- Shelf component needs horizontal scrolling with snap.

### Image Strategy
- Primary: procedural covers (existing `ThemeCoverArt`) — no images needed.
- Featured collections: editorial images for hero/featured cards.
- Images from Unsplash/Pexels (permissive license) downloaded locally.
- Fallback: procedural gradient + pattern (existing system).
