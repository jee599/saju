---
title: "4 readability fixes + favicon after Three.js cosmic background"
project: "saju_global"
date: 2026-03-05
lang: en
pair: "2026-03-05-cosmic-bg-ui-polish-ko"
tags: [threejs, css, favicon, ui-polish]
---

## What I did

The day after shipping a Three.js starfield background, four readability bugs surfaced in a row. Cards were see-through, the BaZi table (四柱 — Four Pillars of Destiny, the core Korean/Chinese fortune-telling chart) was unreadable, and there was no favicon. Fixed everything in 4 commits.

## How it went

The root cause was that all the card CSS variables — `--bg-card`, `--bg-card-glass`, `.glassCard` — were designed with near-zero opacity. Fine when the background was a flat dark gradient, catastrophic against a moving 3D starfield.

First thing I cut was the constellation lines. 36 lines of Three.js code drawing faint purple line segments between stars at `opacity: 0.12`. They were invisible on most screens and just added render overhead. Prompt was literally: *"these constellation lines are visual noise at 12% opacity, delete them."* One turn.

Then bumped card backgrounds to `rgba(13,11,20,0.72)` — dark enough to read against stars, still translucent enough to feel layered. The BaZi table needed more work: row dividers for separation, `text-shadow` glow on the heavenly stem / earthly branch characters (천간/지지), tighter highlight column contrast. All in `globals.css`, one file, maybe 15 lines changed.

Favicon was a fun one. Next.js App Router auto-detects `app/icon.svg` with no config. Dropped in 10 lines of SVG — a ☆ character with a purple→cyan gradient inside a dark circle — and it just worked on deploy.

## Commit log

- `cc721f1` fix(ui): remove constellation lines from CosmicBackground
- `4aec609` fix(ui): increase card background opacity for readability over 3D background
- `b5a348d` fix(ui): enhance Four Pillars table readability and color emphasis
- `ae7f7eb` feat(ui): add favicon (SVG star icon with gradient)

## Results

| | Before | After |
|---|---|---|
| Constellation code | 36 lines | 0 |
| Card background opacity | ~10% | ~72% |
| Favicon | none | 10-line SVG |

Visual bugs like these are where Claude Code shines — paste a screenshot and it pinpoints exactly which CSS variable to change. The favicon was a good example of framework-convention knowledge: I just said "Next.js App Router way" and it went straight to the right file path with the right SVG.
