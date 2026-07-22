---
name: kanocifer.chat
description: A single-author reading tracker and blog — a black cat's study with four themed rooms, a liquid-glass nav, and literary typography, not a SaaS.
colors:
  ink: "oklch(0.2 0.018 50)"
  paper: "oklch(0.97 0.013 50)"
  surface: "oklch(0.97 0.013 50 / 0.75)"
  warm-gray: "oklch(0.95 0.018 50)"
  secondary: "oklch(0.92 0.022 50)"
  muted-text: "oklch(0.42 0.015 50)"
  border: "oklch(0.88 0.02 50)"
  card-bg: "oklch(0.99 0.008 50)"
  accent: "oklch(0.5 0.08 50)"
  accent-slate: "oklch(0.55 0.025 245)"
  accent-rose: "oklch(0.58 0.13 28)"
  destructive: "oklch(0.644 0.21 25)"
  success: "oklch(0.696 0.17 162)"
  warning: "oklch(0.769 0.188 70)"
  chart-1: "oklch(0.6 0.14 50)"
  chart-2: "oklch(0.55 0.08 145)"
  chart-3: "oklch(0.55 0.1 245)"
  chart-4: "oklch(0.58 0.13 28)"
  chart-5: "oklch(0.7 0.13 85)"
  gradient-primary-from: "oklch(0.5 0.08 50)"
  gradient-primary-to: "oklch(0.6 0.14 50)"
  gradient-decorative-from: "oklch(0.92 0.025 50)"
  gradient-decorative-to: "oklch(0.78 0.06 50)"
typography:
  display:
    fontFamily: "Averia Gruesa Libre, system-ui"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "normal"
  body:
    fontFamily: "'HarmonyOS Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  serif:
    fontFamily: "ui-serif, Georgia, 'Times New Roman', serif"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  mono:
    fontFamily: "ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', 'Roboto Mono', monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
  display-cn:
    fontFamily: "'阿里妈妈方圆体 VF Regular', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontWeight: 400
    lineHeight: 1.1
  brush-cn:
    fontFamily: "'阿里妈妈东方大楷 Regular', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontWeight: 400
    lineHeight: 1.1
rounded:
  sm: "calc(var(--radius) - 4px)"
  md: "calc(var(--radius) - 2px)"
  lg: "0.625rem"
  xl: "calc(var(--radius) + 4px)"
  2xl: "calc(var(--radius) + 8px)"
  squircle: "48px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    rounded: "{rounded.xl}"
    padding: "0.5rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.muted-text}"
    rounded: "{rounded.xl}"
    padding: "0.5rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-text}"
    rounded: "{rounded.xl}"
    padding: "0.5rem 1rem"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.paper}"
    rounded: "{rounded.xl}"
    padding: "0.5rem 1rem"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
  tag-pill:
    backgroundColor: "{colors.warm-gray}"
    textColor: "{colors.muted-text}"
    rounded: "9999px"
    padding: "0.25rem 0.625rem"
  nav-island:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "14px"
---

# Design System: kanocifer.chat

## Overview

**Creative North Star: "The Black Cat's Study"**

This is one person's private study, opened to visitors — a site that reads as a personal library and workshop, not a product dashboard. The design is Chinese-first and literary in register (书卷气): warm paper grounds, committed copper accents, serif headings with tightened tracking, and a black cat (kuro neko / 黒猫) as the quiet brand animal. Every visual decision is encoded as code — a three-layer token architecture, four named color schemes, and an explicit 禁止事項 (bans) list — because the site's taste lives in its design system, not in its prose.

The system spans two frontends that share one visual brain: a Vue desktop client and a React mobile web client both import the same theme files from `packages/brand/themes/` and bridge them to Tailwind semantic classes through an identical `@theme inline` layer. The result is one design language expressed across two independent codebases, so a visitor moving between phone and desktop feels continuity, not duplication.

**Key Characteristics:**
- **Literary, not commercial.** No CTAs, no growth copy, no social proof. The site states; it does not sell.
- **Four themed rooms.** Paper (warm copper), Sage (botanical green), Mist (cool blue), Blush (muted rose) — one study with four moods.
- **Theme as infrastructure.** A 3-layer token architecture (raw oklch → per-scheme activation → semantic Tailwind classes) makes hardcoded colors a code review red flag.
- **Squircle form language.** A signature 48px superellipse (with `corner-shape: squircle` fallback) marks the home bento; standard surfaces use a restrained 0.625rem radius.
- **Measured motion.** Spring-based motion primitives (snug / bounce / crisp / reveal) with `prefers-reduced-motion` honored everywhere; reveal animations never gate content.
- **Editorial prose system.** A bespoke `.prose` with drop caps, section counters (§ 1), ink-tinted code blocks, and language-label (not traffic-light) code headers.

## Colors

The palette is built in oklch, organized into four named schemes that share one token skeleton but shift hue. Values below are canonical for **Paper** (the default `data-color-scheme`); the same tokens take different hues in Sage (145°), Mist (225°), and Blush (355°). Every surface and text color is theme-driven — there are no hardcoded hex values in components.

**The One Accent Rule.** The warm copper accent is the single strongest color on any screen. It is used on ≤10% of a given viewport — primary buttons, focus rings, the drop cap, active states. Its rarity is the point; once it stops being rare, the site starts shouting.

### Primary
- **Warm Copper** (`oklch(0.5 0.08 50)`): The sole accent. Primary buttons, focus rings (`ring-ring` maps to accent-slate, but accent drives interactive fills), drop caps, active nav states, chart series 1, gradient endpoints. In dark mode it lifts to `oklch(0.74 0.1 50)` to hold contrast.

### Secondary
- **Slate Blue** (`oklch(0.55 0.025 245)`): The focus-ring source (`--ring`). A cool counterpoint to the warm copper, used only for keyboard focus and chart series 3 — never as a fill for interactive surfaces.
- **Vermillion Rose** (`oklch(0.58 0.13 28)`): Destructive actions, danger text, error states (`--destructive`). Chart series 4. The only saturated warm besides copper.

### Neutral
- **Ink** (`oklch(0.2 0.018 50)`): Primary text, headings, body copy. Holds ≥4.5:1 against paper in every scheme and theme. In dark mode it inverts to `oklch(0.94 0.012 50)`.
- **Paper** (`oklch(0.97 0.013 50)`): Page background, card surfaces, modal backgrounds. The warm off-white ground the whole system is built on.
- **Warm Gray** (`oklch(0.95 0.018 50)`): Secondary backgrounds, muted surfaces, hover highlights (`bg-muted`), code block tints, tag-pill fills, input borders.
- **Secondary** (`oklch(0.92 0.022 50)`): The next tonal step up from warm-gray — used for table header tints and the dark-mode blockquote wash.
- **Muted Text** (`oklch(0.42 0.015 50)`): Captions, labels, helper text, ghost-button default text. Deliberately muted but never below the contrast floor.
- **Border** (`oklch(0.88 0.02 50)`): Hairlines, card outlines, divider rules, table borders. Also drives the global border-as-shadow system (a layered box-shadow that replaces hard 1px borders).
- **Card Bg** (`oklch(0.99 0.008 50)`): The lightest surface, one step above paper — used where a card must read as distinct from its background.
- **Surface** (`oklch(0.97 0.013 50 / 0.75)`): Translucent floating layers — modals, overlays, frosted nav. The alpha is the difference between "paper" and "glass over paper."

### Status
- **Success** (`oklch(0.696 0.17 162)`): Positive states, online indicators, the Dynamic Island status dot.
- **Warning** (`oklch(0.769 0.188 70)`): Cautions, chart markLines, chart series 5, the task-count dot.
- **Destructive** (`oklch(0.644 0.21 25)`): Delete, error, irreversible actions.

### Charts
Five fixed chart colors (`chart-1`…`chart-5`) feed ECharts via `useChartJSColors()` / `useChartColors()`, spanning warm copper, sage green, slate blue, vermillion rose, and amber — chosen to stay distinguishable in all four schemes.

### Gradients
- **Primary gradient** (`gradient-primary-from` → `gradient-primary-to`): A copper-to-brighter-copper sweep for the bento hero and theme bridge.
- **Decorative gradient** (`gradient-decorative-from` → `gradient-decorative-to`): A subtle warm wash for ornamental surfaces; desaturates in dark mode.

## Typography

**Display Font:** Averia Gruesa Libre (Latin display headings, literary flavor)
**Body Font:** HarmonyOS Sans (includes CJK; the body standard across both frontends)
**Serif Font:** ui-serif / Georgia (prose headings h1–h6, drop caps, blockquote marks)
**Mono Font:** ui-monospace / Cascadia Mono (code blocks, language tags, the § section counter)
**Chinese Display:** 阿里妈妈方圆体 (VF) and 阿里妈妈东方大楷 — reserved for deliberate display moments, never body text

**Character:** A warm, literary pairing — the humanist serif and Averia give headings a bookish authority, while HarmonyOS Sans keeps CJK body text clean and legible at small sizes. Code is set in a compact monospace with generous line height. The result reads like a well-set essay, not a documentation site.

### Hierarchy
- **Display** (Averia Gruesa Libre, 400, clamp for headings): Hero moments, the site name, literary display. Used sparingly.
- **Headline** (serif 700, clamp(1.75rem, 1.2rem + 1.6vw, 2.25rem), 1.2): Prose h1 and major section titles. Tightened tracking (-0.02em).
- **Title** (serif 600, clamp(1.375rem, 1.1rem + 0.8vw, 1.75rem), 1.2): Prose h2, with a 1px bottom border and § section counter prefix.
- **Body** (HarmonyOS Sans 400, 1rem, 1.65): All body copy, max line length governed by container. CJK line height is deliberately generous.
- **Label / Mono** (ui-monospace 400–500, 0.6875–0.875rem, 1.7): Code, language tags, tabular numbers, status readouts.

**The Drop Cap Rule.** The opening paragraph of a prose article begins with a 3.4em serif drop cap in accent (`prose-body > p:first-of-type::first-letter`) — an editorial signature that collapses gracefully below 30rem.

## Layout

The spatial model is a single-column, content-first rhythm with a generous paper ground. The desktop shell (`BasicLayout`) is a three-row grid (`auto / 1fr / auto`) switching to a full-viewport column on the entry view. The mobile shell is a full-screen React view with bottom-anchored navigation.

- **Containers** control max-width; prose inherits no intrinsic max-width (`.prose { max-width: none }`).
- **Spacing** follows a 0.25rem–3rem scale; cards use a 1.5rem (6) internal padding with 1.5rem gap between header/content/footer blocks.
- **Bento grid** (home) uses CSS grid cards with a layered ambient + inset-white shadow (`bento-card`). It is the only bento on the site — not a repeating pattern.
- **Navigation** is a bottom-fixed Dynamic Island (`fixed bottom-6`): a compact 28px pill that springs open (260×96px, `SPRING_CRISP`) to reveal latency, visitor count, and active-task status. A separate squircle (48px) decorates the home entry.
- **Responsive** behavior is token-driven; the four schemes switch via `data-color-scheme` on the root, dark mode via `html.dark`.

## Elevation & Depth

Depth is conveyed through a hybrid of tonal layering and a restrained shadow vocabulary — surfaces are flat at rest and gain shadow only as a state response.

**The Flat-By-Default Rule.** Cards and surfaces rest flat (a 1px `border-border` hairline plus the global border-as-shadow). Shadows appear only on hover, focus, or lift — never as a static decoration.

### Shadow Vocabulary
- **Border-as-shadow** (`0 0 0 1px rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06), 0 2px 4px 0 rgba(0,0,0,0.04)`): Applied globally to every element with a Tailwind `border` class — a layered, theme-adaptive outline that replaces hard borders. Hover deepens each layer.
- **Card ambient** (`0 1px 1px ink·6%, 0 6px 14px ink·10%, 0 18px 32px ink·8%`): Standard and Polaroid cards at rest or on hover lift.
- **Bento card** (`ink·12% 0 40px 50px -32px, ink·8% 0 60px 80px -48px, white·35% 0 0 20px inset`): The home-page bento card — layered ambient plus an inset white sheen.
- **Modal panel** (`0 12px 32px ink·10%`): Default modal lift.
- **Nav liquid-glass** (inset white highlights + soft ambient): The floating nav pill in its glass variant.
- **Drawer settings** (3-layer ambient + top paper highlight): The settings drawer.

## Shapes

**The Squircle Signature.** A 48px superellipse (`corner-shape: squircle` where supported, else 48–64px border-radius) is the home entry's signature shape — the one moment the system curves decisively. Everywhere else, corners are restrained: the base radius is 0.625rem (`--radius`), with sm/md/xl/2xl derived by ±4px/+8px. Buttons use `rounded-xl`; pills and tags use full rounding (9999px).

**The Hairline Rule.** Dividers, card outlines, and table borders are a 1px `border-border` hairline — never thick, never colored, never decorative. The global border-as-shadow system gives them a soft, layered presence without weight.

## Components

### Buttons
- **Shape:** Rounded capsule (`rounded-xl`, 0.625rem).
- **Primary:** `bg-accent text-accent-foreground` (copper fill, paper text), hover darkens to 90%. Press scales to 0.96 (`active:scale-[0.96]`).
- **Outline:** Transparent fill, `border-border` hairline, `text-muted-foreground` → hover `bg-muted text-ink`.
- **Ghost:** Transparent, `text-muted-foreground` → hover `bg-muted text-ink`.
- **Destructive:** `bg-destructive text-white` (vermillion rose) → hover 90%.
- **Focus:** `ring-ring` (slate blue) 2px ring with 2px offset. Disabled: 50% opacity, no pointer.
- **Sizes:** sm (h-8, px-3), md (h-9, px-4), lg (h-10, px-6), icon (9×9).

### Tag / Pill
- **Style:** `bg-muted text-muted-foreground rounded-full px-2.5 text-xs` (py-1, or py-0.5 compact). The quiet meta-label for counts, categories, and filters.

### Cards / Containers
- **Corner Style:** `rounded-xl` (0.625rem).
- **Background:** `bg-paper text-ink` with a `border-border` hairline and `shadow-sm`.
- **Shadow Strategy:** Flat at rest (border-as-shadow); hover lift via the card-ambient shadow on interactive variants (`.summary-card:hover` lifts 1px with a faint accent glow).
- **Internal Padding:** 1.5rem (py-6 px-6) with 1.5rem gap.
- **Modal:** `bg-paper border-border/60 rounded-2xl shadow-2xl`, spring entrance (scale 0.95→1, y 12→0, `SPRING_SNUG`).

### Inputs / Slider
- **Slider:** Native `<input type=range>` with a 6px rounded track (`var(--track-fill)`) and an 18px paper thumb ringed in 2px accent. Hover scales 1.12 with an accent focus glow; active scales 1.05.
- **Focus:** `ring-ring` (slate blue) across all interactive elements.

### Navigation
- **Dynamic Island:** Bottom-fixed, `bg-black text-white` pill (220×28px → springs to 260×96px). Shows latency dot (green/yellow/red), visitor count, and active-task count in 10px tracking-wider tabular text. `SPRING_CRISP` (Apple-style, zero bounce).
- **Prose:** The `.prose` system governs all long-form content — blog posts, RSS, AI summaries, weather analysis. Drop caps, § section counters, ink-tinted code blocks with language labels (not traffic lights), and a left-thin-line blockquote with an opening quotation mark.

### Signature: Prose System
The editorial prose layer (`packages/brand/prose.css`, shared across both frontends) is the system's most distinctive surface. Key decisions: no Tailwind Typography plugin (it locks hue and breaks theming); headings in serif with tightened tracking; h2 prefixed by a § counter; code blocks tinted with `color-mix(in oklch, var(--ink) 6%, var(--paper))` and labeled by language in the top-right corner; blockquotes with a 2px left accent line, tinted background, and a 2.25rem opening quote at 35% opacity.

## Do's and Don'ts

### Do:
- **Do** build every surface from the three-layer token stack — raw oklch → theme activation → semantic Tailwind class. `bg-paper`, `text-ink`, `bg-accent`, `border-border`, `text-muted-foreground`, `ring-ring`.
- **Do** keep the accent rare — copper on ≤10% of any screen. Its scarcity carries the hierarchy.
- **Do** use `color-mix(in oklch, var(--ink) X%, var(--paper))` for tinted surfaces (code blocks, hover washes) rather than introducing new hex values.
- **Do** honor `prefers-reduced-motion: reduce` — every animation already degrades to `transition: none` or shorter durations.
- **Do** reserve Averia, 阿里妈妈方圆体, and 东方大楷 for display moments only; body text is always HarmonyOS Sans.

### Don't:
- **Don't** hardcode colors (`bg-black/75`, `text-white/90`, `from-violet-500 …`). Hardcoded color is a code review red flag, not a stylistic choice.
- **Don't** reference tokens across layers — no `var(--ink)` in a component template, no `bg-amber-400` in a card. Stay on Layer 3.
- **Don't** add decorative blur glows, traffic-light code headers, glass-card backdrops (`bg-black/45 backdrop-blur-md`), or eyebrow labels (`text-xs tracking-[0.3em] uppercase`). These are the 2024–2026 AI-default slop the site explicitly rejects.
- **Don't** override component built-in styles — no `border-white/[0.06] bg-black/80 backdrop-blur-2xl` on dialogs or modals.
- **Don't** use `text-white` for body text (invisible on light surfaces); use `text-foreground`.
- **Don't** ship identical-card grids — never a list of N cards with the same icon + heading + text unless uniformity is genuinely required.
- **Don't** promote a single surface's composition into a system-wide pattern. The 13-card bento is the kitchen, not the wallpaper.
