---
title: "Loading screen polish: Three.js background bleed-through, slide arrows, smart ETA"
project: "saju_global"
date: 2026-03-05
lang: en
pair: "2026-03-05-loading-analysis-ui-ko"
tags: [ui, three.js, loading, ux]
---

## What I built

Two commits to clean up the loading-analysis page. First: removed opaque background CSS so the Three.js CosmicBackground finally shows through. Second: fixed a layout bug where education slides were colliding with the status bar, added manual prev/next arrow buttons for desktop, and wired up localStorage-averaged LLM response times to show a dynamic "~N seconds" estimate.

## How it went

The Three.js background issue was embarrassingly simple. `.loadingAnalysis`, `.loadingAurora`, and `.loadingParticles` all had hardcoded dark background colors in globals.css — they were sitting on top of the canvas at z-index -2. Switching them to `transparent` fixed it immediately. The entire change was 3 lines kept vs 18 lines removed.

The second commit was proper UX work. The `.eduSlide.in` class had a `translateY(-6vh)` that was visually overlapping the status bar at the top of the page. Resetting it to `translateY(0)` fixed the overlap and forced a rethink of the slide container layout. I added `.eduSlideWrap` as a relative-positioned wrapper for the arrows, with the arrows hidden on touch devices via `@media (hover: hover)`.

The smart ETA stores the last 3 LLM round-trip times in localStorage under a `fortuneTimings` key, averages them, and shows it below the "analyzing" label. First-time users see a static fallback. It's a small touch but makes the wait feel less ambiguous.

I split this into two separate Claude prompts deliberately. The first was scoped to just transparency. The second covered the overlap fix, arrows, and ETA logic. Bundling them would have invited too much refactoring outside the actual problem.

Key prompt: `"eduSlide is overlapping the status bar due to translateY(-6vh). Fix that. Also add prev/next arrows for desktop manual slide control. Track average LLM response time in localStorage and show it as estimated time below the stage label."`

## Commit log

- `5d100bc` fix(ui): make loading page backgrounds transparent for 3D cosmic background
- `88ef23f` feat(loading): fix UI overlap, add slide arrows, smart estimated time

## Numbers

globals.css: -18 lines (opaque backgrounds removed), +54 lines (arrows + timer layout) = +36 net. page.tsx: +49 lines for slide state management and localStorage averaging logic.
