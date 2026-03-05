---
title: "로딩 화면 UI 개선: Three.js 배경 투과, 슬라이드 화살표, 스마트 예상 시간"
project: "saju_global"
date: 2026-03-05
lang: ko
pair: "2026-03-05-loading-analysis-ui-en"
tags: [ui, three.js, loading, ux]
---

## 뭘 했나

로딩 분석 페이지(loading-analysis)의 UI를 2개 커밋으로 다듬었다. Three.js CosmicBackground가 로딩 화면에서도 보이도록 불투명 배경을 제거했고, 데스크탑에서 교육 슬라이드를 수동으로 넘길 수 있는 화살표 버튼을 추가했다. LLM 응답 시간을 localStorage에 누적해 "예상 약 N초" 문구를 동적으로 계산하게 바꿨다.

## 어떻게 구현했나

이번 작업은 "Three.js 배경이 왜 로딩 페이지에서만 안 보이냐"는 단순한 질문으로 시작했다. globals.css의 `.loadingAnalysis`, `.loadingAurora`, `.loadingParticles`에 불투명 배경색이 하드코딩돼 있어서 Three.js 캔버스(z-index -2)를 덮고 있었다. 배경을 `transparent`로 바꾸자 즉시 해결됐다.

두 번째 커밋은 UX 개선이었다. `.eduSlide.in`의 `translateY(-6vh)`가 상단 상태 바와 겹치는 버그가 있었는데, 이걸 `translateY(0)`으로 수정하면서 슬라이드 레이아웃 전체를 손봤다. 화살표 버튼은 데스크탑 전용으로 `@media (hover: hover)` 조건부로 표시했다. 스마트 예상 시간은 `localStorage`에 최근 3회 응답 시간을 저장하고 평균을 내는 방식으로 구현했다.

프롬프트 전략은 커밋 단위로 분리해서 넘겼다. 첫 번째는 "배경 투명화", 두 번째는 "슬라이드 UX + 예상 시간". 한 번에 다 요청하면 Claude가 과도하게 리팩토링하는 경향이 있어서 스코프를 나눴다.

핵심 프롬프트: `"eduSlide가 상태 바와 겹친다. translateY(-6vh) 문제. 데스크탑에서 슬라이드를 수동 조작할 수 있는 화살표 버튼도 추가해. LLM 평균 응답 시간을 localStorage에 저장해서 예상 시간 계산에 쓰게 해줘."`

## 커밋 로그

- `5d100bc` fix(ui): make loading page backgrounds transparent for 3D cosmic background
- `88ef23f` feat(loading): fix UI overlap, add slide arrows, smart estimated time

## 결과

globals.css 기준으로 `loadingAnalysis` 관련 CSS는 18줄이 3줄로 줄었다 (불투명 배경 제거). 반대로 슬라이드 화살표 + 타이머 레이아웃 추가로 전체 CSS는 54줄 순증가. page.tsx는 49줄 순증가로 슬라이드 상태 관리와 localStorage 로직이 들어갔다.
