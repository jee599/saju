# 복연구소 (FortuneLab) Status

> Updated: 2026-02-27
> Canonical root: `/Users/jidong/saju_global`
> Master plan: `docs/PRODUCTION_MASTER_PLAN_2026-02-25.md` (v3)

## Phase Progress

| Phase | Status | Gate |
|------:|:------:|------|
| Phase 0/1: 기반+엔진 | ✅ | `pnpm test` + `pnpm typecheck` + `pnpm -C apps/web build` |
| Phase A: DB 스키마+인프라 | ✅ (코드) | Prisma schema 업데이트 + .env.example + 엔진 오행 분석 |
| Phase B1: 런칭 필수 | ✅ (코드) | 다크테마 + 히어로탭 + 오행차트 + 블러Paywall + 로딩UX + 궁합 + 에러핸들링 |
| Phase B2: 런칭 직후 | ✅ (코드) | GA4 11 이벤트 + Rate Limit 미들웨어 + 법적 4페이지 + 공유 |
| Phase C: 디자인+바이럴 | ✅ (코드) | 랜딩v2 + Coming Soon + FAQ + Stats + 로테이팅카피 |
| Phase D: 글로벌 | ✅ (스캐폴딩) | CountryConfig 3국 + i18n 딕셔너리(ko/en) |
| Phase E: 캐싱 | 📋 스키마만 | LlmUsage + PromptCache 모델 존재 |
| Phase F: 리텐션 | 📋 스키마만 | EmailSubscription 모델 존재 |

## QA Gate (2026-02-27 통과)

```bash
pnpm test          # 99 tests passed ✅
pnpm typecheck     # All packages passed ✅
pnpm -C apps/web build  # 22 routes, 0 errors ✅
```

## North Star / Guardrails
- North Star: 결제 완료 / 일
- Guardrails: 무료 1건 비용(USD), LLM 실패율, 입력 완료율
- PMF 기준: 일 500건 + CVR 2%, 4주 연속

## 런칭 전 사용자 액션

자세한 내용은 아래 "사용자 액션 아이템" 참조.

1. Supabase 프로젝트 생성 + Prisma migrate 실행
2. Vercel 환경변수 설정
3. GA4 Measurement ID 설정
4. Toss Payments 키 설정
5. 도메인 연결
6. 스모크 테스트

## Worklog
- dev_blog 자동 로그: `/Users/jidong/dev_blog/logs/YYYY-MM-DD/saju-<sha>.md`
