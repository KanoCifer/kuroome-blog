---
name: kanocifer.chat
description: A curated-shelf personal site — warm, human, everyday. One identity, many facets.
colors:
  ink: "oklch(20% 0.018 50)"
  page: "oklch(97% 0.013 50)"
  secondary: "oklch(92% 0.022 50)"
  border: "oklch(88% 0.02 50)"
  contrast: "oklch(97% 0.018 50)"
  muted-text: "oklch(42% 0.015 50)"
  accent: "oklch(50% 0.08 50)"
  accent-slate: "oklch(55% 0.025 245)"
  accent-rose: "oklch(58% 0.13 28)"
  card: "oklch(93% 0.015 50)"
  surface: "oklch(94% 0.015 50 / 0.75)"
  chart-1: "oklch(60% 0.14 50)"
  chart-2: "oklch(55% 0.08 145)"
  chart-3: "oklch(55% 0.1 245)"
  chart-4: "oklch(58% 0.13 28)"
  chart-5: "oklch(70% 0.13 85)"
typography:
  display:
    fontFamily: "ui-serif, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.75rem, 1.2rem + 1.6vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "ui-serif, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.375rem, 1.1rem + 0.8vw, 1.75rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "ui-serif, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.125rem, 1rem + 0.4vw, 1.375rem)"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "var(--font-sans)"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "var(--font-sans)"
    fontSize: "0.8125rem"
    fontWeight: 500
    letterSpacing: "0.01em"
rounded:
  sm: "0.375rem"
  md: "0.625rem"
  pill: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.contrast}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1.5rem"
  button-primary-hover:
    backgroundColor: "oklch(from {colors.accent} l c h / 0.9)"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors['muted-text']}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1.5rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors['muted-text']}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1.5rem"
  button-destructive:
    backgroundColor: "var(--color-rose-500)"
    textColor: "{colors.contrast}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1.5rem"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "{colors.card}"
  tag-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors['muted-text']}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.625rem"
  input:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
---

# Design System: kanocifer.chat

## Overview

**Creative North Star: "The Curated Shelf"**

Like a well-kept personal bookshelf where every object has its place — not a museum, not a showroom, but a lived-in surface that reflects one person's daily reading, writing, and making. The design stays quiet and warm so the content (words, books, photos, fishing logs) can be the voice. Each surface is a shelf in the same room: related, coherent, but with its own small role.

The palette is intentionally low-saturation and high-lightness — paper, sage, mist, blush — four moods of the same quiet room rather than competing accents. Depth comes from tonal layering and a signature border-as-shadow technique rather than heavy drop shadows, keeping the world flat and readable while letting key surfaces (modals, hover states, the glass nav) lift gently when they need attention. Spring-physics motion gives the interface a subtle "alive" quality — the nav pill slides and stretches, panels snap in with a soft settle, cards lift on hover — without ever performing.

Rounded, friendly, everyday: corners are generous (10px default, full pills for tags and nav), touch targets are soft, and the liquid-glass nav bar is the one place the system lets itself be a little magical. The result feels less like "a web app" and more like a personal object you return to.

**Key Characteristics:**
- Four hue themes (paper / sage / mist / blush) share one structural skeleton — only the hue pivot changes
- Border-as-shadow: transparent borders replaced with layered `box-shadow` in `color-mix(in oklch, var(--ink) N%)`
- Spring-physics motion (stiffness 320 / damping 32 family) for panels, nav, cards
- Editorial serif for headings, CJK-optimized sans for body, decorative Chinese display for branding
- Liquid-glass nav as the single expressive surface; everything else stays matte and quiet
- OKLCH throughout for perceptually uniform theming and smooth gradients

## Colors

The color system is a single structural skeleton that pivots on hue. Each of the four themes (paper / sage / mist / blush) defines the same set of semantic tokens at different hue angles, so switching theme is like changing the light in the same room. All values are OKLCH for perceptual uniformity. The frontmatter records the **paper** theme (default) as canonical; the other three share the same structure at hue 145 / 225 / 355.

### Primary
- **Warm Earth** (`oklch(50% 0.08 50)`): The primary accent — links, active states, primary buttons, drop-cap first letters, chart series 1. Used sparingly; its warmth is the quiet voice of the whole system.
- **Slate Blue** (`oklch(55% 0.025 245)`): Cool secondary accent — charts, the rare cool-warm contrast moment. Kept desaturated so it never shouts.
- **Rose** (`oklch(58% 0.13 28)`): Destructive actions, danger states, chart series 4. The most saturated token by design — reserved for things that need attention.

### Secondary
- No independent secondary accent. The system runs on **one accent + neutrals**, with rose and slate as functional satellites. This is intentional — a second chromatic accent would break the "one quiet voice" doctrine.

### Tertiary
- No tertiary accent. See above.

### Neutral
- **Ink** (`oklch(20% 0.018 50)`): Primary text. Never pure black — carries the theme's hue at very low lightness for a softer read.
- **Page** (`oklch(97% 0.013 50)`): Page background. Near-white with a faint warm tint — the "paper" the content sits on.
- **Secondary Surface** (`oklch(92% 0.022 50)`): Input backgrounds, subtle row striping, the "next level down" from page.
- **Border** (`oklch(88% 0.02 50)`): Border color (when visible) and hr elements. Also the base for the border-as-shadow `color-mix`.
- **Muted Text** (`oklch(42% 0.015 50)`): Secondary text, labels, placeholders, timestamps. Readable but recedes.
- **Card** (`oklch(93% 0.015 50)`): Card and panel backgrounds — slightly darker than page for tonal separation.
- **Surface** (`oklch(94% 0.015 50 / 0.75)`): Overlay surfaces with alpha — tag pills, slider tracks, ghost hover states. The 0.75 alpha lets it work as a subtle layer.
- **Contrast** (`oklch(97% 0.018 50)`): Text color on accent backgrounds (primary buttons). Near-white, hue-matched to page.

### Named Rules
**The One Voice Rule.** Each theme has exactly one chromatic accent. It appears on ≤10% of any given screen — links, the active nav pill, a primary button, a single chart bar. Its rarity is what gives it weight. Never introduce a second chromatic accent to "make things pop."

**The Hue-Pivot Rule.** Switching theme changes only hue — never saturation strategy, never token roles. Paper at 50°, sage at 145°, mist at 225°, blush at 355°. If you add a fifth theme, pick a new hue and reuse every token's lightness/chroma exactly.

## Typography

**Display/Headline Font:** ui-serif, Georgia, Times New Roman (system serif)
**Body Font:** HarmonyOS Sans VF (variable weight) with PingFang SC / Microsoft YaHei CJK fallback
**Decorative Display:** 阿里妈妈东方大楷 (ALiMaMa DongFangDaKai) — Chinese display for the "Kuroome Blog" wordmark
**Branding Font:** Averia Gruesa Libre — used for the nav wordmark
**Mono:** ui-monospace, Cascadia Mono, SFMono-Regular, Menlo

**Character:** A literary serif for headings gives long-form content an editorial, settled feeling, while the variable-weight sans body stays clean and readable at small sizes across CJK and Latin. The decorative Chinese font appears only in the nav logo — a single cultural flourish, never body text. The overall effect is "a well-printed personal journal" rather than "a tech blog."

### Hierarchy
- **Display** (700, `clamp(1.75rem, 1.2rem + 1.6vw, 2.25rem)`, 1.2): H1 — article titles, hero headings. Bottom border on h2+ creates section rhythm.
- **Headline** (600, `clamp(1.375rem, 1.1rem + 0.8vw, 1.75rem)`, 1.2): H2 — major section headings. Carries a `§ N` counter via CSS for long-form navigation feel.
- **Title** (600, `clamp(1.125rem, 1rem + 0.4vw, 1.375rem)`, 1.2): H3 — sub-section headings, card titles.
- **Body** (400, 1rem, 1.65): Article body, UI text, descriptions. 1.65 line-height for CJK readability. Max line length controlled by container (65–75ch target in prose).
- **Label** (500, 0.8125rem, 1.5, +0.01em): Timestamps, tags, form labels, nav items. Slightly tracked for legibility at small sizes.

### Named Rules
**The Serif-Is-For-Headings Rule.** System serif appears only at h1–h6 and the drop cap. Body text, UI, buttons, inputs — always sans. Mixing the two roles loses the editorial signal.

**The One Decorative Font Rule.** 阿里妈妈东方大楷 appears only in the nav wordmark. Never use it for body, buttons, or headings — it's a signature, not a workhorse.

## Layout

The spatial model is a single-column reading surface for content pages (blog, articles) and a Bento-style CSS grid for the homepage and dashboard surfaces. Container width is controlled per-surface — prose targets 65–75ch; tool surfaces (tasks, subscriptions, devices) expand to a comfortable working width.

**Spacing rhythm** follows a 4px base grid. Component-internal padding uses 0.5rem / 0.75rem / 1rem / 1.5rem / 2rem steps. Section gaps run 1.5rem–2rem on desktop, tightening to 1rem–1.5rem on mobile.

**Responsive behavior** is dual-native, not responsive-adaptive: the Vue desktop app and the React mobile app are separate clients split by UA routing. Each has its own breakpoints and layout logic. Desktop starts expressing multi-column at ≥1024px; mobile is a single column with bottom-sheet patterns.

**Bento homepage** (Vue): draggable CSS grid cards with layout persistence. **Bento homepage** (React): static CSS grid.

## Elevation & Depth

The system is **tonal-layering first, shadow second**. Most surfaces are flat — depth is conveyed by background color (page → card → secondary → border) and by the signature border-as-shadow technique. Real `box-shadow` is reserved for moments that need to physically lift.

**Border-as-shadow** (`@layer base`): any element with a `border` class gets its border-color forced to `transparent` and receives a layered `box-shadow` of `color-mix(in oklch, var(--ink) 5–8%)`. This creates a soft, theme-adaptive outline that stays visible in both light and dark modes. On hover, the alpha increases (8–12%) for a subtle "lift" without any position change. State borders (border-accent, border-destructive) override back to a visible color.

**Real shadows** appear on:
- Cards at rest: `0 1px 2px` + `0 4px 12px` at 3–4% ink
- Card hover: a gentle `translateY(-1px)` plus accent-tinted shadow
- Modal/drawer panels: `shadow-2xl`
- Liquid-glass nav: dual inner highlights + outer ambient shadow

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, elevation, focus) or on genuinely elevated surfaces (modals, drawers, the glass nav). Never decorate a static card with a heavy shadow.

**The Glass-Is-The-Exception Rule.** The liquid-glass nav is the only surface that uses backdrop-filter, SVG color-dispersion, and inner highlights. This technique does not spread to cards, modals, or panels — it's the room's one window, not the walls.

## Shapes

**Corner language is consistently rounded.** The base radius is 10px (`--radius: 0.625rem`). Cards and buttons use this default. Tags, nav pills, and the glass nav use full `9999px` rounding. Modals step up to `rounded-2xl` (16px) for a slightly softer feel. Images and book covers may use the `.squircle` class (48px with `corner-shape: squircle` when supported) for a superellipse silhouette.

**Borders** are mostly invisible — the border-as-shadow system means most "outlines" are actually layered shadows, not stroke lines. Visible 1px borders appear on: blockquotes (left 2px accent + full border), inline code, hr, and state-indicator borders.

**The liquid-glass nav** uses a custom SVG filter (`#nav-liquid-glass`) for chromatic dispersion, layered with `blur(4–7px) saturate(1.4)` backdrop-filter, inner highlights (`inset 0 0 2px 1px white/55`), and ambient shadow. Safari falls back to plain `blur(12px) saturate(1.4)`.

## Components

### Buttons
- **Shape:** Rounded corners (10px / `rounded-md`), inline-flex centering
- **Primary:** Accent background (`bg-accent`), contrast text, hover darkens to 90% opacity
- **Hover / Focus:** `focus-visible:ring-2 ring-ring`, `active:scale-[0.96]` press feedback, 280ms color/transform transition
- **Outline:** Transparent bg, muted text, visible border (uses border-as-shadow), hover fills surface
- **Ghost:** Transparent bg, muted text, hover fills surface — for toolbar/icon contexts
- **Destructive:** Rose background, contrast text — for delete/danger actions
- **Sizes:** sm (h-8, px-3), md (h-9, px-4), lg (h-10, px-6), icon (h-9 w-9)

### Chips / Tags
- **Style:** Surface background, muted text, full pill (`rounded-full`), 0.625rem horizontal padding
- **Compact mode:** Tighter vertical padding (py-0.5) for inline/dense contexts
- **Use:** Category tags, metadata pills, filter indicators

### Cards / Containers
- **Corner Style:** 10px (`rounded-xl`); modals use 16px (`rounded-2xl`)
- **Background:** Card token (`bg-card`); modals add `/60` alpha + backdrop blur
- **Shadow Strategy:** Resting shadow at 3–4% ink; hover adds `translateY(-1px)` + accent-tinted glow
- **Border:** Uses the global border-as-shadow system (1px `border` class)
- **Internal Padding:** 1.5rem (`p-6`) default; card sub-pieces use `px-6` / `py-6`
- **Composition:** Card → CardHeader / CardTitle / CardDescription / CardContent / CardFooter / CardAction

### Inputs / Fields
- **Style:** Surface background at 30% alpha (`bg-surface/30`), rounded-md, transparent border (border-as-shadow)
- **Focus:** `ring-2 ring-ring/40`, outline-none
- **Slider variant:** Custom thumb — 16px page-colored circle with 2px accent border, hover ring at 15% accent, track is 6px rounded-full
- **Error / Disabled:** Disabled gets `opacity-50 cursor-not-allowed`; error states use rose accent

### Navigation
- **Style:** Liquid-glass bar — full pill (`rounded-full`), `blur(4–7px) saturate(1.4)`, SVG color-dispersion filter, dual inner highlights + ambient shadow
- **Brand:** Avatar ringed in white/50 + Averia Gruesa Libre wordmark "Kuroome Blog"
- **Active indicator:** A sliding glass pill (`liquid-glass-button`) that measures the active tab's `offsetLeft`/`offsetWidth` and tweens between them with `cubic-bezier(0.32, 0.72, 0, 1)` spring
- **Items:** Icon (20px, stroke 1.75) + English label (13px, weight 600); inactive at 40% opacity, hover to 70%
- **Others dropdown:** Hover-triggered, `bg-page/80 backdrop-blur`, rounded-2xl, ring border
- **Mobile:** Bottom-sheet patterns (React), `rounded-t-3xl`, drag handle, pull-to-close

### Modal / Dialog
- **Shell:** Teleported to body, `bg-card/60 backdrop-blur-[10px]`, rounded-2xl, `shadow-2xl`
- **Animation:** Spring `stiffness: 320, damping: 32, mass: 0.8` — scale 0.95→1, y 12→0, opacity 0→1
- **Backdrop:** `bg-black/45 backdrop-blur-[10px]`, fade 180ms
- **Sizes:** sm 420px / md 560px (default) / lg 720px / xl 880px
- **Scroll lock:** Body overflow hidden + scrollbar-width compensation

### Prose (Article Body)
- **Scope:** Blog articles, RSS content, AI summaries, weather analysis, markdown preview
- **Font:** Body in system sans (line-height 1.65), headings in system serif (weight 600, tracked -0.02em)
- **Drop cap:** First paragraph's first letter — 3.4em serif float in accent color (disabled <30rem)
- **Section counters:** H2 carries `§ N` in monospace muted text
- **Links:** Accent color, 1px underline at 4px offset, hover thickens to 2px
- **Blockquotes:** Left 2px accent border + warm-gray wash + opening `"` glyph (2.25rem, 30% accent)
- **Code:** Inline — `rounded` (radius-4px), warm-gray bg, 0.875em, weight 500. Blocks — no traffic-light chrome, theme-tinted bg, copy button

### Backgrounds (Decorative)
- **Iridescent cloud gradients:** 4-stop OKLCH gradients with `::after` noise texture overlay (pixelated noise, overlay blend)
- **Animation:** `hero-gradient-shift` — 14s ease-in-out infinite background-position drift
- **Named gradients:** `.gradient-saiun` (moon white → lapis → peach pink → ancient purple), `.gradient-hisui` (spring celadon → young willow → pine leaf → black moss)

## Do's and Don'ts

### Do:
- **Do** use semantic Tailwind classes (`bg-card`, `text-muted`, `border-input`) — never hardcode hex/oklch in components; the theme tokens handle light/dark
- **Do** keep the accent rare — one primary action per screen, one active nav state, one link cluster
- **Do** use the border-as-shadow system (the `border` class) for card/input outlines rather than `border-visible-color`
- **Do** animate with spring physics for panels and nav (`stiffness: 320, damping: 32` family), ease-out for simple state changes
- **Do** respect `prefers-reduced-motion` — all animations have a `:reduce` guard that snaps to final state
- **Do** use `color-mix(in oklch, var(--ink) N%)` for any shadow or overlay that must adapt to both light and dark themes

### Don't:
- **Don't** introduce a second chromatic accent — no blue + orange, no purple + green. One voice per theme
- **Don't** use the liquid-glass technique (backdrop-filter + SVG dispersion + inner highlights) outside the nav bar — it's the room's one window
- **Don't** add heavy drop shadows to static surfaces — no `shadow-lg` on resting cards, no shadow borders on every div
- **Don't** use decorative Chinese font (阿里妈妈东方大楷) for anything other than the nav wordmark
- **Don't** use Tailwind's `prose prose-slate` (or any prose color lock-in) — it breaks theme switching; the project's `.prose` class rewrites all color vars
- **Don't** use traffic-light dots (Mac-style red/yellow/green) on code blocks — explicitly rejected as "AI default slop"
- **Don't** split the source of truth: tokens live in the theme CSS files (`packages/brand/themes/*.css`) and DESIGN.md frontmatter. Don't redefine a token value in component code with a different number
