# BahasaCerdas — Production Launch Checklist

> **Status:** Ready for production launch after payment testing
> **Last updated:** June 20, 2026

---

## 1. Vercel Environment Variables

- [ ] `MIDTRANS_SERVER_KEY` — Server key from Midtrans Dashboard → Settings → Access Keys (PRODUCTION tab)
- [ ] `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` — Client key from Midtrans Dashboard (PRODUCTION tab, safe for frontend)
- [ ] `NEXT_PUBLIC_MIDTRANS_MERCHANT_ID` — Merchant ID
- [ ] `MIDTRANS_IS_PRODUCTION` — Set to `"true"` (server-side env)
- [ ] `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` — Set to `"true"` (client-side env, inlined at build)

> ⚠️ **PENTING:** `MIDTRANS_IS_PRODUCTION` dan `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` harus sama-sama `"true"`.
> Jika invoice Midtrans menampilkan **"TEST"** di pojok kanan atas, artinya salah satu env masih sandbox.
> Cek dengan `GET /api/billing/midtrans-status` (Founder login) untuk diagnosis.
- [ ] `DATABASE_URL` — PostgreSQL connection string
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Supabase admin key
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public key
- [ ] `NEXT_PUBLIC_SITE_URL` — `https://www.bahasacerdas.com`
- [ ] `NEXT_PUBLIC_GAME_SERVER_URL` — `https://game.bahasacerdas.com`
- [ ] `AI_CREDIT_HARD_MODE` — Should be unset (defaults to `true` in production)

## 2. Midtrans Dashboard

- [ ] **Production environment activated** — Sandbox → Production switch
- [ ] **Webhook URL**: `https://www.bahasacerdas.com/api/payment/webhook`
- [ ] **Finish redirect URL**: `https://www.bahasacerdas.com/guru/berlangganan?status=success`
- [ ] **Unfinish redirect URL**: `https://www.bahasacerdas.com/guru/berlangganan`
- [ ] **Error redirect URL**: `https://www.bahasacerdas.com/guru/berlangganan`
- [ ] **Payment methods enabled**: Credit Card, GoPay, ShopeePay, QRIS, Bank Transfer

## 3. Domain & SSL

- [ ] `bahasacerdas.com` → redirects to `www.bahasacerdas.com`
- [ ] `www.bahasacerdas.com` → resolves and loads
- [ ] SSL valid on all domains
- [ ] Webhook URL reachable from Midtrans (test via sandbox)

## 4. Payment Testing (Sandbox First, then Production)

### Sandbox
- [ ] Monthly plan checkout creates Snap popup
- [ ] Yearly plan checkout creates Snap popup
- [ ] Pay via bank transfer (VA) → payment succeeds → webhook fires
- [ ] Webhook activates premium: `isPremium=true`, `premiumPlan="PRO"`
- [ ] `premiumUntil` calculated correctly (stacked for active, fresh for new)
- [ ] AiCreditLedger synced (500 credits for GURU_PRO)
- [ ] Canceled payment → transaksi.status = CANCELLED, no premium activation
- [ ] Expired payment → transaksi.status = EXPIRED, no premium activation
- [ ] Duplicate settlement webhook → idempotent, no double-extend
- [ ] Founder/Admin bypass works without payment

### Production (after sandbox passes)
- [ ] Real credit card payment → succeeds
- [ ] Real GoPay payment → succeeds
- [ ] Webhook processes correctly
- [ ] Guru Pro status visible in sidebar
- [ ] Admin payment dashboard shows transaction

## 5. AI Credit System

- [ ] New Guru gets trial (30 days, 200 credits)
- [ ] Free quota (30 credits) blocks when exceeded
- [ ] Quota error banner shows "Upgrade ke PRO" CTA → links to `/guru/berlangganan`
- [ ] Pro user gets 500 credits/month
- [ ] DOCX export deducts 1 credit
- [ ] PPTX export deducts 1 credit
- [ ] PDF export is free (0 credits)
- [ ] Hard gating active in production
- [ ] Founder/Admin unlimited

## 6. Admin Dashboard

- [ ] `/admin/payments` shows transaction list
- [ ] Stats cards show correct numbers
- [ ] Search by user/email/orderId works
- [ ] Filter by status works
- [ ] Filter by plan works
- [ ] Detail modal shows transaction info
- [ ] Manual activate works for PENDING transactions
- [ ] Manual activate requires reason
- [ ] Manual activate writes audit log
- [ ] AdminPaymentAuditLog records created

## 7. Security

- [ ] No `MIDTRANS_SERVER_KEY` in frontend bundle or client code
- [ ] No raw prompts/outputs exposed in error messages
- [ ] Webhook SHA512 signature verification active
- [ ] No card data logged or stored
- [ ] Admin routes protected (Founder-only)
- [ ] Murid cannot access billing checkout (403)
- [ ] No destructive schema changes in production

## 8. Rollback Plan

| Emergency | Action |
|-----------|--------|
| Payment gateway down | Set `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false` |
| AI quota blocking users | Set `AI_CREDIT_HARD_MODE=false` |
| Upgrade CTA causing issues | Remove the button from `alat-ai-client.tsx` |
| Webhook spam | Disable webhook in Midtrans Dashboard |
| DB corruption | Restore from Vercel Postgres backup |
| Full rollback | `git revert` last commit + redeploy |

## 9. Post-Launch Monitoring

- [ ] Vercel logs: watch for webhook errors
- [ ] Midtrans dashboard: check settlement rate
- [ ] Database: verify Transaksi status updates
- [ ] Database: verify AiCreditLedger created for new Pro users
- [ ] Customer feedback: check for payment issues

---

## Launch Decision

**Ready for launch:** ☐ Yes / ☐ No

**Sign-off by:** _________________ **Date:** _________________

---

## First 24 Hours Monitoring

After launching, check every few hours:

- [ ] **Vercel logs** — watch for webhook errors (search: `[Webhook]`, `[Midtrans]`, `signature`)
- [ ] **Midtrans dashboard** — confirm transactions appear and settle correctly
- [ ] **/admin/payments** — check pending count, health card for anomalies
- [ ] **/admin/payments health API** — `GET /api/admin/payments/health`
- [ ] **/admin/ai-quota** — check for users at 0 remaining credits
- [ ] **/admin/ai-analytics** — monitor AI error rate
- [ ] **First Guru Pro upgrade** — verify premium activated, ledger created
- [ ] **First failed/canceled transaction** — verify no accidental activation
- [ ] **AI credit deduction** — confirm Pro user can generate with 500 credits

## Emergency Rollback

| Issue | Action |
|-------|--------|
| Payment gateway broken | Set `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false` |
| AI quotas blocking too aggressively | Set `AI_CREDIT_HARD_MODE=false` |
| Upgrade CTA causing confusion | Temporarily hide button in `alat-ai-client.tsx` |
| Webhook errors | Keep webhook active unless verified broken; use manual activate for recovery |
| Critical webhook failure | Disable webhook URL in Midtrans Dashboard, use manual activation only |
| Full rollback | `git revert` last commit + redeploy |
