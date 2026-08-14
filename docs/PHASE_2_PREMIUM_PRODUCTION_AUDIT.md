# PHASE 2 PREMIUM PRODUCTION AUDIT

Status: SELESAI — audit menyeluruh premium/payment/entitlement/usage + perbaikan P0.
Legenda: 🟢 GREEN (production-ready) · 🟡 YELLOW (perlu hardening) · 🔴 RED (unsafe/broken) · 🔵 BLUE (deferred).

| # | Component | Location | Current Behavior | DB Dep | API Dep | UI Dep | Security Risk | Business Risk | Test Coverage | Status | Required Action | Priority |
|---|-----------|----------|------------------|--------|---------|--------|---------------|---------------|---------------|--------|-----------------|----------|
| 1 | Plan resolver | lib/premium-economy/plans.ts | FREE/PRO/FOUNDER dari flag server (isFounder, isPremium+premiumUntil>now, trialEndsAt>now, Subscription aktif) | User, Subscription | — | SidebarPremiumBadge, berlangganan | tidak percaya client ✓ | plan salah → fitur salah | test:premium-economy | 🟢 | — | — |
| 2 | Entitlement matrix | lib/premium-economy/matrix.ts | canonical FREE/PRO/FOUNDER: SIMULATION_MONTHLY_LIMIT 3/10/∞, PREMIUM_PROFILE/COSMETICS/ADVANCED_STATS, STREAK_FREEZE | — | — | — | — | — | (baru, tercakup engine) | 🟢 | — | — |
| 3 | Entitlement DB-first | lib/premium-economy/entitlement.ts | DB `Entitlement` first, fallback matrix; getFeatureLimit/userHasEntitlement | Entitlement | — | — | server-only ✓ | — | — | 🟢 | — | — |
| 4 | Period (WIB) | lib/premium-economy/period.ts | periodKey MONTH/DAY UTC+7, startOfMonth/DayWIB | — | — | — | — | salah zona → kuota salah reset | — | 🟢 | — | — |
| 5 | Usage atomic | lib/premium-economy/usage.ts | canUseFeature read-only; consumeUsage atomic updateMany WHERE used<limit + catch P2002 | PremiumUsage unique(user,feature,period) | — | — | race-safe ✓ | overshoot = kehilangan revenue | test:premium-economy | 🟢 | — | — |
| 6 | Premium gate simulasi | app/api/kompetensi/[paketId]/route.ts | consumeUsageGuarded dalam $transaction dengan create/reset sesi | PremiumUsage | — | kompetisi UI | ✓ | ✓ | test:premium-economy (63) | 🟢 | — | — |
| 7 | Premium status API | app/api/player/premium/status/route.ts | auth-gated GET; plan/entitlements/usage server-computed; tanpa input klien | — | — | — | ✓ | ✓ | — | 🟢 | — | — |
| 8 | Checkout | app/api/payment/create-invoice/route.ts | auth-gated; validasi plan monthly/yearly; createTransaction Midtrans; buat Transaksi PENDING | Transaksi | Midtrans Snap | berlangganan UI | plan whitelist ✓ | DB timeout → transaksi tak tercatat (webhook unknown order, aman) | — | 🟡 | log saat DB write timeout (sudah); pertimbangkan retry | P2 |
| 9 | Midtrans config/server | lib/payments/midtrans-server.ts, lib/midtrans.ts | serverKey/clientKey; mode mismatch guard; error codes | — | Midtrans | — | kunci tak ter-expose ke klien ✓ | — | — | 🟢 | — | — |
| 10 | Webhook signature | app/api/payment/webhook/route.ts | SHA512(order_id+status_code+gross_amount+ServerKey) — serverKey posisi TERAKHIR (formula resmi) | — | — | — | replay tanpa kunci server gagal ✓ | — | — | 🟢 | — | — |
| 11 | Webhook idempotency | app/api/payment/webhook/route.ts | **CLAIM-FIRST ATOMIK (diperbaiki fase ini)**: updateMany status not SUCCESS di dalam $transaction interaktif; hanya pemenang klaim memproses efek; rollback penuh bila gagal → retry Midtrans aman; KARYA memakai klaim Pembelian not PAID | Transaksi, Pembelian | — | — | race double-extension/double-saldo TERTUTUP | dobel kredit = kerugian | test:premium-production (BARU) | 🟢 (was 🔴) | SELESAI fase ini | P0 |
| 12 | Manual grant | scripts/cleanup-promo-premium.ts + SQL | dev/admin-only, ada alasan + audit | — | — | — | tidak API publik ✓ | — | — | 🟢 | — | — |
| 13 | Subscription model | prisma/schema.prisma (Subscription) | belum dipakai checkout (Transaksi legacy) | Subscription | — | — | — | — | — | 🔵 | wire ke checkout bila renewal dibutuhkan | — |
| 14 | Observability | webhook/log | signature mismatch detail; + fase ini: premium.activated, duplicate, unknown order | — | — | — | tanpa PII/secrets ✓ | — | — | 🟢 | — | — |
| 15 | Transaksi.orderId unique | prisma/schema.prisma | orderId nullable TANPA unique | Transaksi | — | — | order dobel → findFirst ambigu | mitigasi claim-first | — | 🟡 | partial unique index setelah cek duplikat produksi | P2 |

## Kesimpulan
- 🔴→🟢 P0: idempotensi webhook (klaim atomik) — DIPERBAIKI.
- 🟡 P2: unique index orderId (butuh cek data produksi dulu); retry penulisan Transaksi saat checkout timeout.
- Sisanya 🟢 — sistem premium sudah canonical & server-authoritative.
