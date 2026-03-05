---
title: "CSS 배경 → Three.js CosmicBackground 전환, z-index 버그 4번 고치기"
project: "saju_global"
date: 2026-03-05
lang: ko
pair: "2026-03-05-threejs-cosmic-background-2-en"
tags: [three.js, css, z-index, ui, debugging]
---

## 뭘 했나

CSS `body::before/::after` 오로라·별자리 배경을 걷어내고 Three.js `CosmicBackground` 컴포넌트로 교체했다. globals.css에서 51줄을 삭제하고, z-index 충돌을 잡는 데만 커밋 4개가 나왔다.

## 어떻게 구현했나

Three.js 캔버스가 `position: fixed`로 붙어 있는데 화면에 아무것도 보이지 않는 상태였다. 가장 먼저 프롬프트는 "캔버스는 있는데 왜 안 보이냐"였고, Claude는 CSS reset의 `* { max-width: 100% }` 룰이 canvas를 죽이고 있다는 걸 찾아냈다. 첫 커밋(fcff7ec)에서 canvas를 reset에서 제외했다.

그다음 문제는 body 배경색이 불투명 navy(`#0a0b2a`)로 덮고 있어서 캔버스가 뒤에 숨어버리는 것이었다. `html` 엔티티에 기본 배경을 넘기고 `body`를 투명으로 바꿨다(96a5555). CSS aurora/star 코드 51줄도 이 시점에 일괄 삭제했다(1ec4fcb).

가장 오래 걸린 건 z-index 스택이었다. `CosmicBackground`의 캔버스가 `z-index: -2/-1`로 설정돼 있었는데, 이 값은 `html` 요소 스택 컨텍스트 밑으로 들어가 결국 숨어버렸다. 프롬프트로 "z-index -2는 html 뒤로 간다, 0/1로 올리고 main/footer에 z-index: 2를 줘라"를 지시했고 052de6e에서 해결됐다. 자기소개 페이지 CTA 버튼의 마그네틱 마우스 팔로우 효과도 이 커밋에서 같이 제거했다(복잡도 대비 효과가 없다고 판단).

마지막으로 husky pre-push 타임아웃을 60s → 180/240s으로 늘렸다(2d71d3a). Claude CLI 빌드 로그 생성에 시간이 더 필요했기 때문이다.

핵심 프롬프트 흐름:
> "canvas가 있는데 Three.js 배경이 안 보인다. globals.css와 CosmicBackground.tsx를 같이 봐줘."
> → "z-index -2는 html 루트 스택 컨텍스트 아래로 떨어진다. 캔버스를 0/1로 올리고 콘텐츠에 2를 줘."

삽질은 단순했다. CSS reset → body 불투명도 → z-index 음수 이 세 가지가 독립적인 원인이었는데 한 번에 하나씩 고쳐야 해서 커밋이 4개로 쪼개졌다.

## 커밋 로그

- `fcff7ec` fix(ui): exclude canvas from max-width reset to fix Three.js background
- `1ec4fcb` fix(ui): remove CSS aurora/star backgrounds and make header transparent
- `96a5555` fix(ui): make body transparent so Three.js canvas at z-index -2 is visible
- `052de6e` fix(ui): fix Three.js z-index stacking, add content z-index, remove magnetic CTA
- `2d71d3a` fix: increase hook timeout to 180/240s

## 결과

| | Before | After |
|---|---|---|
| globals.css 배경 코드 | 51줄 (CSS aurora + star) | 0줄 (Three.js로 이관) |
| 커밋 수 | — | 5개 (디버깅 4 + 설정 1) |
| husky timeout | 60s | 180s (pre-push) / 240s (fallback) |
