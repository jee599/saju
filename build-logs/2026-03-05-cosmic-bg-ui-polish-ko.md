---
title: "Three.js 우주 배경 위 가독성 4연타 픽스 + 파비콘 추가"
project: "saju_global"
date: 2026-03-05
lang: ko
pair: "2026-03-05-cosmic-bg-ui-polish-en"
tags: [threejs, css, favicon, ui-polish]
---

Three.js 배경을 넣었더니 텍스트가 다 뭉개졌다.

4번 연속 고쳤다.


## 별자리 선부터 잘랐다

3개 별자리에 36줄 코드를 썼는데, 실제 화면에서 `opacity: 0.12`라 거의 안 보인다.

렌더링 부담만 주고 시각적 노이즈가 되길래 통째로 삭제했다.

> "별자리 선이 너무 옅어서 시각적 노이즈가 되고 있다. 삭제해줘."

한 줄이면 끝. **36줄 → 0줄.**

과감하게 잘라야 할 때가 있다.


## 카드가 투명했다

`--bg-card`, `--bg-card-glass`, `.glassCard` 배경색이 거의 투명이었다.

CSS 변수를 처음 잡을 때 반투명으로 설계했는데, 3D 별빛 위에서는 텍스트가 읽히질 않았다.

CSS 변수 4개를 `rgba(13,11,20,0.72)` 계열로 올렸다.


## 사주 테이블은 더 세밀했다

천간/지지 한자에 `text-shadow` glow를 넣었다.

행 구분선을 추가하고, highlight 열 대비를 끌어올렸다.

`globals.css` 한 파일에서 다 처리했는데, Claude한테 "이 파일에서 테이블 관련 CSS만 찾아서 수정"이라고 범위를 좁혀주니 정확히 잡았다.


## 파비콘 추가

Next.js App Router는 `app/icon.svg` 파일을 자동 인식한다.

별도 설정이 필요 없다.

```svg
<!-- app/icon.svg -->
<svg>
  <circle fill="url(#grad)"/>
  <text>☆</text>
  <!-- 보라→시안 그라디언트, 총 10줄 -->
</svg>
```

"Next.js App Router 방식으로 파비콘 추가해줘"라는 한 마디로 올바른 경로까지 안내받았다.


<hr class="section-break">

<div class="commit-log">
<div class="commit-row"><span class="hash">cc721f1</span> <span class="msg">fix(ui): remove constellation lines</span></div>
<div class="commit-row"><span class="hash">4aec609</span> <span class="msg">fix(ui): increase card background opacity</span></div>
<div class="commit-row"><span class="hash">b5a348d</span> <span class="msg">fix(ui): enhance Four Pillars table readability</span></div>
<div class="commit-row"><span class="hash">ae7f7eb</span> <span class="msg">feat(ui): add favicon (SVG star icon)</span></div>
</div>

<div class="change-summary">
<table>
<thead><tr><th>항목</th><th>Before</th><th>After</th></tr></thead>
<tbody>
<tr><td class="label">별자리 코드</td><td class="before">36줄</td><td class="after">0줄</td></tr>
<tr><td class="label">카드 불투명도</td><td class="before">~10%</td><td class="after">~72%</td></tr>
<tr><td class="label">파비콘</td><td class="before">없음</td><td class="after">SVG 10줄</td></tr>
</tbody>
</table>
</div>

비주얼 문제는 스크린샷을 붙이면 한 번에 정확히 잡힌다.
