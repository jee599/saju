# PROJECT_HANDOFF_LOG

업데이트: 2026-02-22 17:06 KST

## 0) 초기 기획 니즈 (확정)
- 제품: 사주 웹 우선, 앱은 후속
- 핵심 가치: 답변 퀄리티(장문/전문성/가독성) + 트렌디한 UI
- 리포트 톤: 대화형, 확률형 문장, 용어를 본문에서 쉽게 풀어 설명
- 구조: 성격/직업/연애/금전/건강/가족·배우자 × 과거-현재-미래
- 결제: 단일 상품(멀티 티어 제거)
- 마지막 섹션: 대운 타임라인(연령 구간별)

## 1) 현재 병렬 작업 트랙
- Claude only: 완료(1차 결과 산출)
- GPT only: 진행 중 (세션 `wild-daisy`)
- Hybrid(Claude 기획 + GPT 구현): 진행 중 (세션 `wild-basil`)

## 2) 지금까지 완료된 공통 기반
- 웹 배포 URL 확보: https://web-indol-psi.vercel.app
- 웹 빌드/타입체크 통과 상태 확보
- 장문 리포트 엔진/반응형 디자인 1차 반영
- 블로그 발행 직전본 폴더 구조 생성

## 3) 작업 방식 (재현 가능)
1. 각 트랙은 `/tmp/saju-variants/{gpt-only|claude-only|hybrid}` 독립 폴더에서 실행
2. 각 폴더 독립 git 초기화 (상호 참조 금지)
3. 모델 분업
   - GPT only: Codex 중심 구현
   - Claude only: Claude 중심 기획/카피/구현 방향
   - Hybrid: Claude가 계획 산출 → GPT가 구현
4. 완료 후 공통 검증
   - `pnpm --filter @saju/web typecheck`
   - `pnpm --filter @saju/web build`
5. 배포 후 링크 수집/비교

## 4) 남은 작업
- [ ] GPT only 완료 + 빌드/배포 링크
- [ ] Hybrid 완료 + 빌드/배포 링크
- [ ] 3개 버전 비교표 작성 (문체/디자인/전환 UX/속도/리스크)
- [ ] 블로그 초안(각 5,000~7,000자) 진행 로그 반영
- [ ] 최종 QA 리포트(기능별 pass/fail) 작성

## 5) 다음 AI가 바로 이어받을 때 실행 순서
1. 이 파일(`docs/PROJECT_HANDOFF_LOG.md`) 최신 상태 확인
2. 진행 세션 확인: `process list`
3. 트랙별 디렉토리에서 결과물 확인
4. 미완료 트랙 먼저 마무리
5. 빌드/배포/링크 수집 후 비교 리포트 작성

## 6) 진행 로그 (간단)
- 17:00 블로그 드래프트 구조 생성
- 17:02~17:04 GPT/Hybrid 독립 실행환경 재구성
- 17:04 GPT only 재시작 (`wild-daisy`)
- 17:04 Hybrid 재시작 (`wild-basil`)

## 7) 2026-02-22 17:40 추가 업데이트
- GPT only / Claude only / Hybrid 병렬 구현 완료
- 각 트랙에서 `pnpm --filter @saju/web typecheck` / `build` 통과 확인
- 배포 URL(Production 원본)
  - GPT only: https://web-b4qv0gj46-jidongs45-3347s-projects.vercel.app
  - Claude only: https://web-8u86odu94-jidongs45-3347s-projects.vercel.app
  - Hybrid: https://web-5gfr8w4q7-jidongs45-3347s-projects.vercel.app
- 주의: 동일 Vercel 프로젝트 alias(`web-indol-psi.vercel.app`)를 공유해 마지막 배포본으로 덮어씀.

## 8) 2026-02-22 18:12 QA/배포 검증 추가
- 3개 프로덕션 URL 재배포(원본 deployment URL 기준)
  - GPT only: https://web-ri2udhshj-jidongs45-3347s-projects.vercel.app
  - Claude only: https://web-r78eemgci-jidongs45-3347s-projects.vercel.app
  - Hybrid: https://web-2doyqr1ag-jidongs45-3347s-projects.vercel.app
- 외부 HTTP 접근 점검 결과: 전 경로 401 (Vercel Deployment Protection 활성)
- 로컬 런타임 QA(포트 3101/3102/3103) 결과: 주요 경로 전부 200
  - /, /free-fortune, /result, /paywall, /terms, /privacy, /disclaimer
- 결론: 기능은 동작하나, 공개 접근은 Vercel 보호설정 해제 필요

## 9) 2026-02-23 모델 라우팅 세팅 반영
- `docs/MODEL_ROUTING.md` 생성
- `docs/prompts/claude_planning_prompt.md` 생성
- `docs/prompts/gpt_implementation_prompt.md` 생성
- 운영 정책 고정: Claude=기획/문체, GPT=구현/수정, 교차 QA 필수
