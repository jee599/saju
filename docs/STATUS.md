# FateSaju Status

> Updated: 2026-02-26
> Canonical root: `/Users/jidong/saju_global`
> Master plan: `docs/PRODUCTION_MASTER_PLAN_2026-02-25.md`

## Phase Progress

| Phase | Status | Gate |
|------:|:------:|------|
| Phase 0/1: 기반+엔진 | ✅ | `pnpm test` + `pnpm typecheck` + `pnpm -C apps/web build` |
| Phase A: DB 전환(Supabase Postgres) | ⏳ | Prisma migrate + QA PASS |
| Phase B: 런칭 블로커 | ⏳ | GA4/RateLimit/Paywall/i18n 등 |

## North Star / Guardrails
- North Star: 결제 완료 / 일
- Guardrails: 무료 1건 비용(USD), LLM 실패율, 입력 완료율

## Latest Change
- Master plan format upgraded (business/ux/design gates + phase gates)

## Verification Commands
```bash
cd /Users/jidong/saju_global
pnpm test
pnpm typecheck
pnpm -C apps/web build
```

## Launch Checklist (P0) — launch-first mode (DB migration deferred)

Phase A (Supabase migration) is intentionally deferred. The goal is to ship a
functional, measurable product on the current stack first.

- [x] QA Gate green: `pnpm test && pnpm typecheck && pnpm -C apps/web build`
- [x] GA4 funnel events scaffolded (input_start → checkout_success/fail)
- [x] Analytics no-ops safely without GA_MEASUREMENT_ID
- [ ] Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` in Vercel env (production)
- [ ] Verify Vercel deployment builds and serves correctly
- [ ] Smoke-test full funnel on production URL (input → result → paywall → report)
- [ ] Confirm GA4 events appear in GA4 DebugView
- [ ] Add basic error monitoring (Vercel Analytics or Sentry free tier)
- [ ] Review LLM API key env vars are set in Vercel
- [ ] DNS / custom domain setup (if applicable)

### Deferred (post-launch)
- Phase A: Supabase DATABASE_URL/DIRECT_URL + `prisma migrate dev`
- Rate limiting (IP + fingerprint)
- Paywall UX (CTA 3x, mobile sticky)
- i18n, mini-compatibility, design refresh

## Worklog
- dev_blog 자동 로그: `/Users/jidong/dev_blog/logs/YYYY-MM-DD/saju-<sha>.md`
