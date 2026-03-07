---
title: "4 readability fixes + favicon after Three.js cosmic background"
project: "saju_global"
date: 2026-03-05
lang: en
pair: "2026-03-05-cosmic-bg-ui-polish-ko"
tags: [threejs, css, favicon, ui-polish]
---

The day after shipping a Three.js starfield background, four readability bugs surfaced in a row.

Cards were see-through. The BaZi table was unreadable. There was no favicon.

Fixed everything in 4 commits.


## Constellation lines had to go

36 lines of Three.js code drawing faint purple line segments between stars at `opacity: 0.12`.

They were invisible on most screens and just added render overhead.

> "These constellation lines are visual noise at 12% opacity. Delete them."

One turn. **36 lines → 0 lines.**

Sometimes you just have to cut aggressively.


## Card backgrounds were nearly transparent

All the card CSS variables — `--bg-card`, `--bg-card-glass`, `.glassCard` — were designed with near-zero opacity.

Fine when the background was a flat dark gradient.

Catastrophic against a moving 3D starfield.

Bumped card backgrounds to `rgba(13,11,20,0.72)`. Dark enough to read against stars, still translucent enough to feel layered.


## BaZi table needed more work

Row dividers for separation.

`text-shadow` glow on the heavenly stem / earthly branch characters (천간/지지).

Tighter highlight column contrast.

All in `globals.css`, one file, maybe 15 lines changed.

Scoped the prompt to: *"find only table-related CSS in this file and fix it"* — and Claude nailed it.


## Favicon was a fun one

Next.js App Router auto-detects `app/icon.svg` with no config.

Dropped in 10 lines of SVG — a ☆ character with a purple→cyan gradient inside a dark circle.

```svg
<!-- app/icon.svg -->
<svg>
  <circle fill="url(#grad)"/>
  <text>☆</text>
  <!-- purple→cyan gradient, 10 lines total -->
</svg>
```

Just said "Next.js App Router way" and Claude went straight to the right file path.


<hr class="section-break">

<div class="commit-log">
<div class="commit-row"><span class="hash">cc721f1</span> <span class="msg">fix(ui): remove constellation lines</span></div>
<div class="commit-row"><span class="hash">4aec609</span> <span class="msg">fix(ui): increase card background opacity</span></div>
<div class="commit-row"><span class="hash">b5a348d</span> <span class="msg">fix(ui): enhance Four Pillars table readability</span></div>
<div class="commit-row"><span class="hash">ae7f7eb</span> <span class="msg">feat(ui): add favicon (SVG star icon)</span></div>
</div>

<div class="change-summary">
<table>
<thead><tr><th>Item</th><th>Before</th><th>After</th></tr></thead>
<tbody>
<tr><td class="label">Constellation code</td><td class="before">36 lines</td><td class="after">0 lines</td></tr>
<tr><td class="label">Card opacity</td><td class="before">~10%</td><td class="after">~72%</td></tr>
<tr><td class="label">Favicon</td><td class="before">none</td><td class="after">SVG 10 lines</td></tr>
</tbody>
</table>
</div>

Visual bugs are where Claude Code shines.

Paste a screenshot and it pinpoints exactly which CSS variable to change.
