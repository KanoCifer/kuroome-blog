# `/impeccable audit` — `frontend/src/views/books/`

**Scope**: 35 files — `BookShelf.vue`, `BookStats.vue`, `ImportBook.vue`, all `components/`,
`bookStats/{components,composables}/`, `weread/`, and the top-level `composables/`.
Read in full: both main views, toolbar, hero, reading/recommend rails, stats bar, state
view, all 7 book-stats sections, recommend grid, detail panel, ImportBook, 5 composables,
the 4 brand themes (`packages/brand/themes/*.css`), `base.css`, `resolveCssColor`, the
cover-gradient palette. Not edited — audit only.

**Audited**: 2026-07-12

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2 | `--muted-text` fails WCAG AA on the light `--paper` (all 4 themes); focus-visible missing on sort/search/` Dot`; heatmap cells not keyboard-operable |
| 2 | Performance | 2 | `ResizeObserver` never disconnected in reading rail (leak); per-keystroke search filter with no debounce; `backdrop-filter` on sticky toolbar + hero repaints every scroll-frame |
| 3 | Responsive Design | 3 | Fluid grids + snap rails handle mobile well; heatmap forces a `min-w-[640px]` horizontal scroll on phones; grid cards under-width at 2-cols |
| 4 | Theming | 2 | Cover-gradient palette and chart hex fallbacks ignore the 4 scheme tokens → switch theme, these go stale; several decorative animations ignore `prefers-reduced-motion` |
| 5 | Anti-Patterns | 4 | Clean. No gradient text, no glassmorphism spam, no identical grids, no hero metrics. Restrained, intentional UI. |
| **Total** | | **13 / 20** | **Good** — address weak dimensions (a11y contrast, the two theming leaks, the observer leak) |

**Rating bands**: 18–20 Excellent · 14–17 Good · 10–13 Acceptable · 6–9 Poor · 0–5 Critical.

---

## Anti-Patterns Verdict

**Pass — does not read as AI-generated.** The books surface is a restrained product UI, not a brand page, and it behaves like one: a single serif display family used only for headings and big numbers, accent (`--primary`) reserved for active states and data, four real OKLCH themes that each retint neutrals toward their own hue. Cards have three genuinely different variants (standard/compact/list) instead of an identical grid; the hover affordance is purposeful (the open-book chevron), not decorative noise. The only tells worth noting are (a) the sticky toolbar leaning on glassmorphism, which is used sparingly and with intent here, and (b) one genuinely solid `#fff` over a hero photo with only a faint gradient underneath — the one spot where the restraint slips toward the "default" (covered in detail below).

---

## Executive Summary

- **Audit Health Score: 13 / 20 (Good)**
- **Issues by severity**: P0 × 0 · P1 × 4 · P2 × 7 · P3 × 4
- **Top critical issues**:
  1. `--muted-text` (L 0.42) on `--paper` (L 0.97) ≈ **3.7:1 — fails WCAG AA 4.5:1**. Body-scale muted copy across *both* pages — subtitles, time/recency labels, stat labels, footer, toolbar counts, chip secondary text — rides on this token. Brightens to ~7.9:1 in dark mode, so this is a light-mode regression shared by all 4 color schemes. *(P1)*
  2. The hero "看详情" stats bar + hero book count sit on `text-white` / `text-white/60` over a real photo with only a `from-background/40 via-background/5 to-background/40` gradient — `white/60` works out to roughly **2.4:1** against the mid-stops, failing AA. Contrast is hostage to whatever the background JPEG happens to contain. *(P1)*
  3. `BookShelfReadingRail` builds a `ResizeObserver` in `onMounted` but never stores or disconnects it in `onBeforeUnmount` → leaks the rail element and its observer on every mount/unmount cycle. *(P1)*
  4. The cover-gradient palette (`utils/format.ts`) and the ECharts hex fallbacks (`useEChartsTheme.ts`) are **hard-coded literal colors that ignore the 4 scheme tokens**. Switch paper→sage→mist→blush and the book covers, list/card fallbacks, and SSR/hydration-mismatch charts all still render the same caramel/blue/ros palette — a theme breach the rest of the app handles correctly. *(P1)*
- **Recommended next steps**: fix the `--muted-text` lightness first (one token edit × 4 files that repairs ~12 components at once); then the observer leak (one line); then route the two hard-coded color sites through tokens; then the reduced-motion passes.

---

## Detailed Findings by Severity

### [P1] `--muted-text` fails WCAG AA on light background (all 4 schemes)
- **Location**: `packages/brand/themes/{paper,sage,mist,blush}.css` → `--muted-text` token; consumed by every `text-muted-foreground` element across both pages.
- **Category**: Accessibility / Theming
- **Impact**: Body-scale muted copy reads at roughly **3.7:1** against `--paper` (L 0.97 paper vs L 0.42 muted, ΔL ≈ 0.55). Every element in this surface that conveys meaning in muted text — `BookStats` subtitle, eyebrow, time/recency labels, the four stat labels, the refresh footer, the toolbar density/sort labels, chip secondary text, the hero book count, the stats-bar recency link, rail headings' counts, section subtitles in rhythm/top-books/preferences/recommend — rides on this single token, so they all fail AA together in light mode.
- **WCAG/Standard**: 1.4.3 Contrast (Minimum) — AA requires ≥4.5:1 for text <18px / <14px bold.
- **Verification**: `--paper` is OKLCH L 0.97 C 0.013 across all four schemes; `--muted-text` is OKLCH L 0.42. ΔL = 0.55 → ~3.7:1 (the slight chroma in the neutral is too small to matter). In dark mode the same token is L 0.78 against L 0.22 paper → ~7.9:1, so the regression is *light-mode only*.
- **Recommendation**: refactor so the token carries sufficient contrast on the tinted paper. Two clean options: (a) keep the semantic token but darken the light-mode value to roughly `oklch(0.34 0.015 <hue>)` → just over 4.5:1 on L 0.97 paper while keeping the warm/chroma tint; or (b) make `--muted-text` paper-tint-aware. Either one edit × 4 files repairs every muted element on both pages at once.
- **Suggested command**: `/impeccable colorize` (contrast repair across a token system).

### [P1] White text over hero background fails AA — contrast hostage to the photo
- **Location**: `PageHero.vue:88` `text-white drop-shadow-lg`; `:93–95` eyebrow/subtitle `text-white/75`; `:98` dot `bg-white/40`; consumed by `BookShelfHero.vue` (book count "N 本书") and the `BookShelfStatsBar.vue` ribbon (`text-white` base, `text-white/60` label, `text-white/70` CTA).
- **Category**: Accessibility
- **Impact**: White text over a real background image, dimmed only by `bg-gradient-to-b from-background/40 via-background/5 to-background/40`. The `via-background/5` mid-stop is essentially transparent — `text-white/60` works out to roughly **2.4:1** against it (well under AA), and where the underlying JPEG is light (sky, page-white, fog) even `text-white` fails. Contrast is fully hostage to whatever the background image contains.
- **WCAG/Standard**: 1.4.3. The `drop-shadow-lg` hack is not reliably measurable and is explicitly not a substitute for contrast.
- **Recommendation**: two parts. (1) Tighten the scrim: make it opaque enough to guarantee ≥4.5:1 for `text-white/75` and ≥3:1 for the large heading (e.g. `from-black/55 via-black/35 to-black/55`, a true footer-to-header scrim, **or** a radial scrim centered on the text). (2) For the stats bar at the hero base, swap `text-white` → `--foreground` ink over the bar's own `bg-black/30`, so the bar self-determines its own contrast instead of borrowing the hero's image.
- **Suggested command**: `/impeccable colorize`.

### [P1] `ResizeObserver` never disconnected in `BookShelfReadingRail`
- **Location**: `BookShelfReadingRail.vue:80–87` (created in `onMounted`); `onBeforeUnmount` (lines 88–90) only runs `ro?.disconnect()` — but `ro` is declared with `let ro: ResizeObserver | null = null` *inside* `onMounted`, so `onBeforeUnmount`'s `ro` is always `null` → no disconnect ever fires.
- **Category**: Performance
- **Impact**: every mount leaks the rail `HTMLDivElement` + its observer (the observer keeps the element reachable from the detached DOM until navigation GC). Not catastrophic at one rail, but the leak repeats on every shelf visit and is the textbook "dangling observer" pattern.
- **WCAG/Standard**: n/a.
- **Recommendation**: declare `ro` at module/setup scope so both hooks share it, then disconnect in `onBeforeUnmount`. One-line fix (move the `let` up one scope). Verify the same scope pattern isn't duplicated elsewhere — audited `useEChartsTheme.ts` (its `observer` is correctly scoped) but it's the one place the same shape appears.
- **Suggested command**: `/impeccable harden` (memory-leak hardening).

### [P1] Hard-coded colors ignore the 4 scheme tokens (two sites)
- **Location**:
  - `frontend/src/views/books/weread/utils/format.ts:23–32` `PAPER_PALETTE` — 8 hard-coded hex pairs → `deterministicCoverGradient`. Consumed by `WereadBookCard.vue` (grid + list cover fallback), `BookShelfRecommendRail`, and `WereadBookDetailPanel`.
  - `bookStats/composables/useEChartsTheme.ts:31–48` — `resolveCssColor('--muted-foreground', '#6b7280')`, …`('#e5e7eb')`, …`('#f3f4f6')`, …`('#3b82f6')`, …`('#e5e7eb')` fallbacks. Used to theme the rhythm charts.
- **Category**: Theming
- **Impact**: switching color scheme (paper/sage/mist/blush) leaves these untouched — cover fallbacks stay the same caramel/blue/ros regardless of theme; on SSR or any frame before the canvas probe mounts, the ECharts fallback renders literal Tailwind grays (`#3b82f6` blue, `#e5e7eb` gray) that don't exist in any of the four palettes. A light-mode chart fallback built from `#e5e7eb` axis lines has effectively no contrast on a `#fff`-adjacent surface if the real `--border` is warm-tinted — they fight each other when hydration resolves.
- **WCAG/Standard**: n/a (consistency / theme integrity, not a WCAG failure, but it breaches the project's own token rule from `CLAUDE.md`: "Styles must use semantic Tailwind classes, no hard-coded color").
- **Recommendation**: (a) Replace `PAPER_PALETTE` hex pairs with OKLCH stops derived from the existing scheme tokens, e.g. read `--secondary` + `--border-color` or a `--chart-*` pair and build `linear-gradient(135deg, var(--secondary), var(--accent-slate))` so the fallback retints with the theme. They'll still read as "paper / old book" because the tokens themselves carry that warmth. (b) For the chart fallbacks, either remove the literal hex entirely (the canvas probe works on the client; for SSR, render a skeleton instead of a guessed-palette chart) or source the fallbacks from the same scheme tokens via `:root` reads.
- **Suggested command**: `/impeccable colorize` (route hard-coded colors through the token system).

### [P2] Focus-visible missing on sort button, search input, and the `Dot` divider-dot-as-button illusion
- **Location**:
  - `BookShelfToolbar.vue:47–52` — sort toggle button has no `:focus-visible` ring.
  - `BookShelfToolbar.vue:12–17` — search input uses `outline-none` and relies on `focus:ring-2` / `focus:border-primary`, but the ring color (`--primary` at default alpha) is the very accent it competes with; a clear, high-contrast ring (`--ring` / `accent-slate`) is the accessible default.
  - `BookShelfStatsBar.vue` — the whole stats bar is a `<button>` but its focus state is only the default browser outline plus `hover:bg-black/40`.
- **Category**: Accessibility
- **Impact**: keyboard users see no clear indication of focus on the sort popover trigger, the search field, or the stats-bar CTA. All three are primary interactions on their respective pages.
- **WCAG/Standard**: 2.4.7 Focus Visible (AA).
- **Recommendation**: add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` (the same pattern `WereadBookCard` and `ImportBook`'s inputs already use) to the sort button, the search input, and the stats-bar button. Same fix the project already applies elsewhere — just inconsistent here.
- **Suggested command**: `/impeccable polish` (consistency pass).

### [P2] Heatmap cells not keyboard-operable; tooltip is mouse-only
- **Location**: `StatsYearHeatmapSection.vue:137–147` — `<div role="img" ...>` grid of cell `<div>`s with `@mouseenter` / `@mouseleave` only, no `tabindex`, `@keydown`, or `aria-label` per cell; tooltip is a `<Teleport>` driven purely by mouse coords.
- **Category**: Accessibility
- **Impact**: a screen-reader user encounters one giant `role="img"` landmark with a year summary and no per-cell data at all; a keyboard user cannot reach any cell. The heatmap is one of the two flagship stats sections.
- **WCAG/Standard**: 2.1.1 Keyboard; 1.1.1 Non-text Content (the per-cell "3 小时 on 2026-03·三" data is conveyed only through a mouse-dependent tooltip).
- **Recommendation**: (a) Wrap every cell in a focusable element (`<button tabindex="-1">` for the empty slots, `<button tabindex="0">` for data cells) with `aria-label="{date}, {duration or 未读}"` so keyboard + AT users get the same info the tooltip shows. (b) Trigger tooltip on `@focus` / `@blur` in addition to mouse. (c) Give the container a real accessible name already present (`aria-label` on the `role="img"` is good), and consider a parallel visually-hidden data table for screen-reader users who'd rather skim than navigate 371 buttons — but that's a P3 stretch.
- **Suggested command**: `/impeccable harden`.

### [P2] Carousel "更多" / "更多推荐" scroll buttons lack context; stats-bar CTA is a `<button>` with no accessible name source
- **Location**:
  - `BookShelfReadingRail.vue:14–19` "更多 →" button has no `aria-label`.
  - `BookShelfStatsBar.vue:53–59` the right-edge "看详情" link is a `<button>` wrapping an arrow, relying on the visible `看详情`/chevron for its name — fine visually, but it behaves as a button doing `router.push`, which is semantically an `<a href>`.
- **Category**: Accessibility
- **Impact**: a screen-reader user hears "更多 button" with no clue what it expands; the stats-bar CTA reads as button but acts like a link (breaks the "buttons do, links go" expectation; breaks middle-click / cmd-click).
- **WCAG/Standard**: 2.4.4 Link Purpose; 4.1.2 Role computation mismatch (minor).
- **Recommendation**: `aria-label="更多正在读的书"` on the rail button; change the stats-bar root from `<button>` to `<a :href="/bookshelf/stats">` so pointer + keyboard + AT all get link semantics.
- **Suggested command**: `/impeccable clarify`.

### [P2] `BookStats.vue:126–137` Mode Tabs use `role="tab"` styling but lack real tab semantics
- **Location**: `BookStats.vue:13–28` — the mode pill row is `<button>`s with `transition-colors` and an active class, but no `role="tablist"`/`role="tab"`/`aria-selected`/`tabindex`.
- **Category**: Accessibility
- **Impact**: AT doesn't know these are tabs, so the user gets no "tab 2 of 4, selected" announcement; they're just four buttons. The visible state is clear, so this is an announcement gap rather than a real block, but it's the classic half-wiring.
- **WCAG/Standard**: 4.1.2 Name, Role, Value.
- **Recommendation**: wrap in `<div role="tablist" aria-label="统计周期">`, mark each `<button role="tab" :aria-selected="activeMode === m.key" :tabindex="...">`, and wire `ArrowLeft/Right` roving tabindex between them. The project already uses `role="tab"`/`role="tablist"` correctly on the `BookShelfToolbar` chips — just reuse that pattern.
- **Suggested command**: `/impeccable harden`.

### [P2] Banner/snackbar `text-success` / `text-destructive` on tinted backgrounds — two real failures
- **Location**:
  - `ImportBook.vue:27` — success banner `bg-success/10 text-success`, fine at the default/light value.
  - `WereadBookCard.vue:80–82` — the "已读" badge `bg-success/90 text-primary-foreground`. At the paper default `--success` = emerald-500 on `--primary-contrast` this is fine, but **at the sage scheme the `--success` token is still the Tailwind `color-emerald-500` while `--primary-contrast` is re-tinted to sage ink** → the badge briefly contradicts its own theme. Minor today (the contrast still clears), but it's the same "success token isn't re-tinted per scheme" gap as `base.css` hard-codes `--color-success: var(--color-emerald-500)`.
  - `BookStats.vue:108` — error retry button `bg-destructive/10 text-destructive`. With `--destructive` = rose-500 on paper it's fine; at blush the muted accent and the destructive share a red-adjacent hue and the combination softens. Verify once `--destructive` is set under blush.
- **Category**: Theming / Accessibility
- **Impact**: low today but it's the warm-up to the same bug in [P1]#4 — state colors are the one palette layer *not* re-tinted per scheme, so a scheme someday that deliberately picks a destructive close to its paper will instantly fail AA.
- **Recommendation**: make `--color-success` / `--color-warning` / `--color-destructive` scheme-driven in `base.css`, the same way background/foreground/muted already are.
- **Suggested command**: `/impeccable colorize`.

### [P2] Book-cover gradient text is a hard-coded `text-white/85 drop-shadow-md` — appearance hostage to the palette
- **Location**: `WereadBookCard.vue:186–190` and `WereadBookDetailPanel.vue:156–159` — the big fallback-book-initial uses `text-foreground/85` (good) but the detail panel uses hard-coded `text-white/85 drop-shadow-md`, and the grid card uses `drop-shadow-sm`. Both rely on the *chosen palette's darkness* to be legible against a gradient whose luminosity range varies wildly across the 8 `PAPER_PALETTE` entries.
- **Category**: Theming / Accessibility
- **Impact**: the lightest gradient (`#A89A7B → #5C4F36`) leaves `text-white` at the top and over the `#A89A7B` stop at roughly **2.8:1** — fails AA even though it's large text, and that matters because this is the *only* title affordance for a cover-less book.
- **Recommendation**: derive the text color from the same tokenized gradient (use `text-primary-foreground` or `text-background`, both of which are guaranteed contrast-safe against anything built from their partner tokens), or compute text color from the palette entry's luminance at render.
- **Suggested command**: `/impeccable colorize`.

### [P2] Compact grid density chosen but never exposed — dead variant
- **Location**: `WereadBookCard.vue` declares `variant?: 'standard' | 'compact' | 'list'`, and `useShelfView.ts:159` maps `density === 'compact'` to a `grid-cols-3 … xl:grid-cols-8` track — but `BookShelfToolbar` `DENSITY_OPTIONS` (`useShelfView.ts:164`) only offers `compact / standard / list` where the "compact" key in the toolbar maps to the *standard* card (icon `Grid3x3`, 2→5 cols), while the real 8-col compact card is never reachable.
- **Category**: Performance / UX (dead code, misleading sandbox)
- **Impact**: the `compact`-card branch in `WereadBookCard` (`titleSize`, `authorSize`, `px-1 py-1.5`) is dead — the toolbar's "Compact" key actually maps to the grid variant `compact` in `gridClass`, so the cards themselves never render at compact sizing. Not a user-facing bug (the grid still lays out), but ~30 lines of dead size logic and a future foot-gun.
- **Recommendation**: one of: (a) wire the toolbar "Compact" key to actually invoke the compact card variant and 8-col grid; or (b) delete the dead `compact` card variant from `WereadBookCard` and the 8-col grid track. Don't leave it half-wired.
- **Suggested command**: `/impeccable distill` (remove the half-wired variant).

### [P3] Decorative animations ignore `prefers-reduced-motion` (systemic, low severity)
- **Location**:
  - `base.css:75–87` — `.animate-enter` / `book-card-fade` (translateY + blur + opacity reveal). Used by every grid card `WereadBookCard.vue:168`.
  - `base.css:50–57` — `--animate-breathe` (opacity 1↔0 at 1s infinite, used to signal syncing in `BookShelfHero.vue:20`). Infinite, un-paused.
  - `BookShelfStateView.vue:33` — skeleton pulse with a per-card `animationDelay * 60ms` staircase (fine, but should still honor reduced-motion to pause the pulse).
- **Category**: Accessibility
- **Impact**: vestibular/motor-sensitivity users see every card blur-and-rise in on scroll + the sync icon pulse forever; neither honors the OS-level reduced-motion toggle. Because the book-card reveal uses `animation-fill-mode: backwards`, the `reduced-motion: reduce` fallback should *also* short-circuit these to a crossfade (otherwise the default already shows them opaque once painted — they don't gate on the animation — so the residual annoyance is the motion, not visibility).
- **WCAG/Standard**: 2.3.3 Animation from Interactions (AAA) / respects 2.2.2 as best practice.
- **Recommendation**: a single `@media (prefers-reduced-motion: reduce)` block in `base.css` that sets `--animate-breathe` to a no-op and shortens `.animate-enter` to a ~150ms opacity crossfade with `animation-fill-mode: none`, and `WereadBookCard` to a plain opacity reveal. The project already does this on at least one other surface — make it global so the books code inherits it.
- **Suggested command**: `/impeccable animate`.

### [P3] Search filter fires on every keystroke with no debounce / `requestIdleCallback`
- **Location**: `BookShelfToolbar.vue:176–178` → `emit('update:searchQuery', …)` bound to `@input`, and `useShelfView.ts:138–155` re-filters + re-sorts the full `visibleBooks` on every change.
- **Category**: Performance
- **Impact**: on a large shelf, every keystroke walks the full array + locale-aware `localeCompare` sort. Typing a 6-char query = 6 full re-filters. No crash, but visible jank on a 300-book shelf in slow-scroll / low-end devices.
- **Recommendation**: debounce `searchQuery` by ~120ms (or compute `displayedBooks` on a `requestIdleCallback`-scheduled microtask) so the intermediate "AB", "ABC" queries don't each re-sort; the committed query does.
- **Suggested command**: `/impeccable optimize`.

### [P3] Sticky toolbar + hero both use `backdrop-filter` every scroll frame
- **Location**: `BookShelfToolbar.vue:3` `backdrop-blur-md` (sticky, `-mx-4 … top-0 z-20`); `PageHero.vue:51` sync button and the hero close button `backdrop-blur-md`.
- **Category**: Performance
- **Impact**: `backdrop-filter` is repainted on every frame it's over moving content. The toolbar lives directly under the hero and over the scrolling card grid, so every scroll frame re-rasterizes the blur over the largest paint region on the page.
- **Recommendation**: the toolbar is the high-value fix — replace `bg-background/85 backdrop-blur-md` with a flat opaque `bg-background` or at most `bg-background/95` plus a 1px bottom border; the glassmorphic look is pleasant but the repaint cost is paid constantly. The hero's two small buttons are cheap and fine to keep.
- **Suggested command**: `/impeccable optimize`.

### [P3] Heatmap `<Teleport to="body">` tooltip is `position:fixed` but never re-struck on viewport resize / scroll
- **Location**: `StatsYearHeatmapSection.vue:172–201` — tooltip placed via `getBoundingClientRect()` on `mouseenter`, stored in `tooltipLeft/Top`, and rendered `position:fixed`.
- **Category**: Responsive / UX
- **Impact**: if the user scrolls or the viewport resizes between `mouseenter` and `mouseleave`, the tooltip floats detached from its cell. Minor (120ms delay, short-lived), but it's a known footgun of the fixed-tooltip pattern.
- **Recommendation**: recompute on scroll while a tooltip is active, or anchor the tooltip to the cell element directly with a CSS anchor-positioning / `poppoly` approach instead of viewport coords.
- **Suggested command**: `/impeccable adapt`.

---

## Patterns & Systemic Issues

1. **One token, twelve components**: `--muted-text`/`text-muted-foreground` is the single most-consumed token on both pages and it fails AA on the light `--paper`. One value change × 4 theme files repairs every subtitle, label, count, stat label, and footer simultaneously. This is the highest-leverage fix in the surface.
2. **`backdrop-filter` in sticky/hero surfaces**: recurs on PageHero (2 small targets, keep) + the BookShelfToolbar (large sticky target over scrolling content, expensive). Same instinct, two different outcomes — split the rule by surface size, not by "it looks nice here."
3. **State colors not scheme-driven**: `--color-success / --warning / --destructive` in `base.css` point at literal Tailwind `color-*-500` instead of scheme tokens, so every scheme that deliberately tints its accent toward red/green/amber will soften state contrast. Minor today, same bug-class as [P1]#4.
4. **`role="tab"` done well / done halfway**: `BookShelfToolbar` chips get `role="tablist"` + `role="tab"` + `aria-selected` done correctly; `BookStats` mode pills get only the visual style and skip the ARIA. Same authorial surface, inconsistent convention — adopt one pattern.
5. **Dead `compact` card variant**: `WereadBookCard` ships a compact sizing branch the toolbar never invokes — ~30 lines of dead code and a foot-gun for a future developer.

---

## Positive Findings

- **Theme system done properly.** OKLCH throughout, neutrals tinted toward each scheme's own hue, dark mode re-mapping every token (not just inverting). This is the real thing — it makes almost every book-surface element recolor correctly on scheme switch. The two hard-coded holdouts in [P1]#4 stand out *because* the rest is token-clean.
- **Genuinely distinct card variants.** standard / compact / list differ in proportions, typography, and affordance — not the "identical grid" tell.
- **Composables are well-decomposed.** `useShelfView`, `usePeriodNavigation`, the narrow section composables (`useOverviewView`, `useRhythmView`, `usePreferenceView`, `useYearHeatmapView`) each expose exactly the template's contract and nothing more — easy to audit, easy to test. `useEChartsTheme`'s canvas-probe approach is the right fix for ECharts' oklch gap.
- **Glassmorphism with restraint.** `--surface` glass is reserved for on-hero buttons, the on-photo sync CTA, and the toolbar — never the default card treatment.
- **Real empty / error / loading states.** `BookShelfStateView` teaches ("你的微信读书书架还是空的") instead of "nothing here"; `BookRecommendGrid` ships default + slot-override skeletons for every section.
- **`role`/`aria` conventions mostly applied well.** density button group has `role="group"` + `aria-pressed`; filter chips have `role="tablist"`/`aria-selected`; rails count in `aria-label` on the heatmap; ImportBook input wires `aria-invalid` / `aria-describedby` correctly. The [P2] gaps (stats pills, heatmap cells) read as inconsistency against a base that's genuinely good.

---

## Recommended Actions

1. **[P1] `/impeccable colorize`** — fix `--muted-text` lightness (one token × 4 files), tighten the hero scrim, and route `deterministicCoverPalette` + ECharts fallbacks through scheme tokens. The biggest single share of issues.
2. **[P1] `/impeccable harden`** — disconnect the `ResizeObserver` in `BookShelfReadingRail` (one line) and give the heatmap cells focus + `aria-label`.
3. **[P2] `/impeccable adapt`** — `min-w-[640px]` heatmap scroll on mobile + the detaching fixed tooltip.
4. **[P2] `/impeccable clarify`** — "更多 →" `aria-label`; stats-bar `<button>` → `<a>`.
5. **[P2] `/impeccable distill`** — remove or wire the half-reachable compact card variant.
6. **[P3] `/impeccable animate`** — add the global `prefers-reduced-motion` block; debounce search in the same pass.
7. **[P3] `/impeccable optimize`** — flatten the sticky toolbar's `backdrop-blur` in the same pass.
8. `/impeccable polish` — final consistency ring + chip/tab ARIA sweep once the above land.

You can ask me to run these one at a time, all at once, or in any order you prefer.

Re-run `/impeccable audit` after fixes to see your score improve.
