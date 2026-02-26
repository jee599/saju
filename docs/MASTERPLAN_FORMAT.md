# Master Plan Format (Project Standard)

> 목적: 모든 프로젝트가 같은 형식으로 운영되게 하는 템플릿
> 원칙: **STATUS는 1장**, Master Plan은 “헌법”, 커밋마다 dev_blog worklog 자동 생성

---

## 0) Header
- Project name / repo / canonical root
- Owner
- Updated date

---

## 1) One-liner
- 지금 프로젝트가 뭘 하는지

---

## 2) North Star + Metrics
- North Star Metric 1개
- Guardrail metrics 2~3개 (비용/리스크/만족도)
- 이벤트/로그(추적 방식)

---

## 3) Business / UX / Design principles
- Business: 수익/비용 구조, 가격/패키징
- UX: 핵심 플로우, 마찰 제거
- Design: 가독성/신뢰/정보 구조

각 항목마다 **Gate**를 명시한다.

---

## 4) Architecture snapshot
- 주요 폴더/컴포넌트
- 외부 서비스(결제, DB, LLM, 배포)

---

## 5) Phases & Gates
- Phase 0~N 표
- 각 Phase에:
  - 목표
  - Gate 커맨드(재현 가능)
  - 태스크 목록(P0/P1)

---

## 6) Runbook (운영)
- 배포/롤백
- 장애 대응
- env/secrets 규칙

---

## 7) Status/Worklog linkage
- `docs/STATUS.md` (single source of truth)
- dev_blog worklog 자동 경로

---

## 8) Decisions
- 큰 결정은 `docs/DECISIONS.md`로 남김(선택)
