---
title: "Replacing CSS aurora backgrounds with Three.js CosmicBackground (4 z-index bugs)"
project: "saju_global"
date: 2026-03-05
lang: en
pair: "2026-03-05-threejs-cosmic-background-2-ko"
tags: [three.js, css, z-index, ui, debugging]
---

## What I did

Ripped out 51 lines of CSS `body::before/::after` aurora and star-field animations and replaced them with a Three.js `CosmicBackground` component. What should have been a one-commit swap turned into four debugging commits because the canvas was invisible in three independent ways at once.

## How it went

The Three.js canvas was mounted as `position: fixed` but nothing appeared on screen. I asked Claude to look at `globals.css` and `CosmicBackground.tsx` together. It immediately spotted that the global CSS reset had `* { max-width: 100% }` — which squashes canvas elements to zero width. First commit (`fcff7ec`): exclude canvas from that reset.

Still invisible. The `body` background was an opaque navy (`#0a0b2a`), painting over everything beneath it. The fix was to move the dark fallback color to `html` and make `body` transparent (`96a5555`). At the same time, I deleted the CSS aurora/star code in bulk — 51 lines gone in `1ec4fcb`.

The trickiest issue was z-index. The canvas was set to `z-index: -2/-1`, which sounds fine until you realize negative z-indexes slip *behind* the root HTML stacking context and disappear. The prompt that cracked it: "z-index -2 falls below the html element's stacking context — raise the canvas to 0/1 and give main/footer z-index: 2." That was `052de6e`. Bonus: also removed the magnetic mouse-follow effect from the CTA button in the same commit. The effect was complexity without payoff.

The last commit (`2d71d3a`) bumped the husky pre-push timeout from 60s to 180s. The automated build-log generation via Claude CLI needs more runway than originally estimated.

The prompting strategy here was minimal-context, iterative: each commit fixed exactly one layer of the problem, making it easy to isolate what each change actually did.

## Commit log

- `fcff7ec` fix(ui): exclude canvas from max-width reset to fix Three.js background
- `1ec4fcb` fix(ui): remove CSS aurora/star backgrounds and make header transparent
- `96a5555` fix(ui): make body transparent so Three.js canvas at z-index -2 is visible
- `052de6e` fix(ui): fix Three.js z-index stacking, add content z-index, remove magnetic CTA
- `2d71d3a` fix: increase hook timeout to 180/240s

## Results

| | Before | After |
|---|---|---|
| CSS background code | 51 lines (aurora + star keyframes) | 0 (moved to Three.js) |
| Commits needed | — | 5 (4 debug + 1 config) |
| Husky pre-push timeout | 60s | 180s / 240s fallback |
