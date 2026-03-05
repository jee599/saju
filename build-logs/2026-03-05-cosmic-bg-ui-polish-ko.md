---
title: "Three.js 우주 배경 위 가독성 4연타 픽스 + 파비콘 추가"
project: "saju_global"
date: 2026-03-05
lang: ko
pair: "2026-03-05-cosmic-bg-ui-polish-en"
tags: [threejs, css, favicon, ui-polish]
---

## 뭘 했나

Three.js CosmicBackground를 도입한 직후, 배경 위에서 텍스트와 카드가 흐릿하게 보이는 가독성 문제가 4개 연속으로 터졌다. 별자리 선 제거, 카드 불투명도 강화, 사주 四柱 테이블 대비 강화, 파비콘 추가까지 커밋 4개로 마무리했다.

## 어떻게 구현했나

Three.js 배경이 들어오면서 기존 CSS 변수들이 반투명으로 설계되어 있었던 게 문제였다. `--bg-card`, `--bg-card-glass`, `.glassCard` 배경색이 거의 투명에 가까워서 3D 별빛 위에서 텍스트가 뭉개졌다.

먼저 별자리 선(constellation lines)을 제거했다. 3개 별자리에 36줄 코드를 썼지만 실제 화면에서 opacity 0.12라 거의 안 보이면서 렌더링 부담만 줬다. `> "별자리 선이 너무 옅어서 시각적 노이즈가 되고 있다. 삭제해줘."` 한 줄로 끝났다.

카드 배경 불투명도는 CSS 변수 4개를 `rgba(13,11,20,0.72)` 계열로 올렸다. 사주 테이블은 더 세밀했는데, 천간/지지 한자에 `text-shadow` glow를 넣고, 행 구분선을 추가하고, highlight 열 대비를 끌어올리는 작업을 `globals.css` 한 파일에서 처리했다.

파비콘은 Next.js App Router가 `app/icon.svg`를 자동 인식하는 관례를 활용했다. 별 문자(☆)에 보라→시안 그라디언트를 적용한 SVG 10줄로 완성했다. 별도 설정 없이 배포 즉시 반영된다.

## 커밋 로그

- `cc721f1` fix(ui): remove constellation lines from CosmicBackground
- `4aec609` fix(ui): increase card background opacity for readability over 3D background
- `b5a348d` fix(ui): enhance Four Pillars table readability and color emphasis
- `ae7f7eb` feat(ui): add favicon (SVG star icon with gradient)

## 결과

| 항목 | Before | After |
|------|--------|-------|
| 별자리 코드 | 36줄 | 0줄 |
| 카드 배경 불투명도 | ~10% | ~72% |
| 파비콘 | 없음 | SVG 10줄 |

## 문체

작업 자체보다 Claude Code 활용 흐름이 흥미로웠다. 비주얼 문제는 스크린샷을 붙이면 한 번에 정확히 잡는다. `globals.css`가 커져도 "이 파일에서 테이블 관련 CSS만 찾아서 수정" 같은 지시가 통했다. 파비콘처럼 프레임워크 관례를 알아야 하는 작업도 "Next.js App Router 방식으로"라는 한 마디로 올바른 경로까지 안내받았다.
