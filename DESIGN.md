---
name: kanocifer.chat
description: A single-author reading tracker and blog system with 10 themed color schemes — a study with twenty surfaces, not a SaaS.
colors:
  ink: "oklch(0.13 0.028 261.692)"
  paper: "oklch(0.985 0.013 260)"
  surface: "oklch(0.97 0.013 260 / 0.75)"
  warm-gray: "oklch(0.95 0.018 260)"
  secondary: "oklch(0.92 0.022 260)"
  muted-text: "oklch(0.551 0.027 264.364)"
  accent: "oklch(0.63 0.27 254)"
  accent-slate: "oklch(0.707 0.022 261.325)"
  accent-rose: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.88 0.02 260)"
  accent-contrast: "oklch(0.985 0.013 260)"
  chart-1: "oklch(0.626 0.202 261)"
  chart-2: "oklch(0.6 0.118 185)"
  chart-3: "oklch(0.398 0.07 227)"
  chart-4: "oklch(0.828 0.189 84)"
  chart-5: "oklch(0.769 0.188 70)"
  gradient-primary-from: "oklch(0.62 0.16 258)"
  gradient-primary-to: "oklch(0.55 0.14 218)"
  gradient-decorative-from: "oklch(0.7 0.12 262)"
  gradient-decorative-to: "oklch(0.7 0.12 218)"
  success: "oklch(0.696 0.17 162)"
  warning: "oklch(0.769 0.188 70)"
  destructive: "oklch(0.577 0.245 27)"
typography:
  display:
    fontFamily: "'Averia Gruesa Libre', system-ui, sans-serif"
    fontWeight: 400
    letterSpacing: "-0.02em"
  display-cjk:
    fontFamily: "'阿里妈妈东方大楷 Regular', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontWeight: 400
  serif:
    fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', serif"
    fontWeight: 500
  body:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, 'Segoe UI', sans-serif"
  body-cjk:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, 'Segoe UI', sans-serif"
    lineHeight: 1.7
  body-harmonyos:
    fontFamily: "'HarmonyOS Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif"
    note: "Toggled at runtime by user — :root[data-font='harmonyos'] overrides --font-sans and --default-font-family. This is the harmonic toggle, not the default."
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.8125rem"
  hero:
    fontFamily: "ui-serif, Georgia, serif"
    fontSize: "clamp(1.875rem, 4vw + 1rem, 4.5rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  label:
    fontFamily: "'HarmonyOS Sans', sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.18em"
    textTransform: "uppercase"
rounded:
  radius: "0.625rem"
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  2xl: "1.125rem"
  3xl: "1.375rem"
  4xl: "1.625rem"
  squircle: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-contrast}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  card-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "1.25rem"
  bento-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.squircle}"
  nav-floating-pill:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.squircle}"
  modal-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
  input-field:
    backgroundColor: "{colors.warm-gray}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "0.75rem 1rem"
  tag-pill:
    backgroundColor: "{colors.warm-gray}"
    textColor: "{colors.muted-text}"
    rounded: "9999px"
    padding: "0.25rem 0.625rem"
---

# Design System: kanocifer.chat

## 1. Overview

**Creative North Star: "The Black Cat's Study — Ten Rooms, Twenty Surfaces."**

kanocifer.chat is a personal study with a paint box. One author (Kuroome) reads, fishes, and writes; the site tracks all three and publishes the last. The interface reads as a quiet, deliberate workshop — paper-fold heroes, literary typography, and a single black cat (kuro neko, 黒猫) sitting in the corner. The brand voice is **书卷气 · 准 · 适** (literary register, exact, measured): every token name is opinionated, every decision is committed, and nothing is performed for an audience.

The system ships **ten complete color schemes** — sky-blue, forest-green, paper, sage, mist, blush, spring, autumn, clear-sky, midnight — each with its own light and dark variant. Twenty surfaces total, all sharing one token architecture. The palette is the brand: changing themes is not decoration but identity. `data-color-scheme="<name>"` on `<html>` swaps the entire surface vocabulary atomically, with a 600ms clip-path sun/moon/monitor transition as the visible "click" of the toggle. The default (`sky-blue`) is what visitors first see; the others are how the author lives in the site.

Density is comfortable, not tight. The dominant surface is paper; the dominant type is Chinese-set HarmonyOS Sans with Averia Gruesa Libre accents for English display. Shadows are **layered ambient + inset white highlight** (the "lifted paper" treatment), never flat, never glassmorphism. The system is explicitly **not** a SaaS cream-bg dashboard, an AI bento grid, an editorial-magazine layout, or a tech-company marketing site — those lanes are documented in `PRODUCT.md` as anti-references and in §6 as Don'ts. The site is the author's, used every day, and that single-author / multi-reader shape is what every choice serves.

**Key Characteristics:**
- 10 named themes × light/dark = 20 distinct surfaces, sharing one token architecture
- OKLCH color space throughout; `color-mix(in oklch, var(--ink) N%, transparent)` for shadow/rgba synthesis
- Three-layer token contract: raw theme vars → `data-color-scheme` activation → semantic Tailwind utilities (`bg-background`, `text-foreground`, etc.)
- Chinese-first typography; Latin display fonts (Averia Gruesa Libre) carry the literary register without competing with CJK
- Squircle (`corner-shape: squircle; border-radius: 90px`) is the signature card shape — iOS-adjacent but committed, not generic
- Inset white highlight + layered ambient shadow = "lifted paper" depth, not glassmorphism
- motion-v (Vue) + framer-motion (React) with explicit `prefers-reduced-motion` degradation
- Vue desktop + React mobile share the same token system; the mobile side is not a stripped-down mirror

## 2. Colors

The palette is **Restrained by token, Committed by choice**. Each theme uses tinted neutrals for ~80% of the surface and one saturated accent for ≤15%, but the *selection* of accent is a brand statement — vermillion for autumn, copper for paper, electric blue for sky-blue, royal blue for midnight. The default sky-blue is the "neutral" voice of the brand; the other nine are committed statements.

The default theme is **`sky-blue`** (the values in the frontmatter are sky-blue). All ten themes follow the same role schema; only the hue base and accent value change. `data-color-scheme="<theme-name>"` on the root element swaps the entire palette.

### Primary
- **Electric Indigo** (`{colors.accent}` — `oklch(0.63 0.27 254)`): the sky-blue accent. Used for primary actions, focused state, the bento nav indicator (`bg-primary/20`), and the Hero "back" button. Carries ≤10% of any given screen by rule. Other themes' accents: forest-green `oklch(0.405 0.101 131)`, paper `#8a653f` (copper, hex legacy), sage `#4f7657`, mist `#4f6d88`, blush `#a5656f`, spring `#35bfab`, autumn `#de4331` (vermillion), clear-sky `#2fcbe7` (cyan), midnight `#2a48f3` (royal blue).

### Secondary
- **Slate Blue** (`{colors.accent-slate}` — `oklch(0.707 0.022 261.325)`): focus-ring color, neutral secondary action. Quiet by intent — this is the "you can have this too, in a less loud voice" accent.

### Destructive
- **Vermillion Rose** (`{colors.accent-rose}` — `oklch(0.577 0.245 27.325)`): destructive actions, error states, danger. The same hue family across all themes so the meaning doesn't shift when the theme does.

### Neutral (Tinted with Hue)
- **Ink** (`{colors.ink}` — `oklch(0.13 0.028 261.692)`): body text, primary foreground. Dark per theme; this is the "ink on paper" voice.
- **Paper** (`{colors.paper}` — `oklch(0.985 0.013 260)`): page background, card surface, modal panel. Tinted 0.013 chroma toward the theme hue — not warm-by-default, not cool-by-default, **theme-by-default**.
- **Warm Gray** (`{colors.warm-gray}` — `oklch(0.95 0.018 260)`): the "low-weight surface" — input backgrounds, secondary buttons, tag pills, hover states.
- **Secondary** (`{colors.secondary}` — `oklch(0.92 0.022 260)`): step up from warm-gray; secondary button background, slightly more saturated.
- **Muted Text** (`{colors.muted-text}` — `oklch(0.551 0.027 264.364)`): auxiliary text, captions, labels. Hits ≥4.5:1 against `paper` in light mode; against `paper` dark equivalent in dark mode.
- **Border** (`{colors.border}` — `oklch(0.88 0.02 260)`): dividers, input borders, hairline rules.
- **Surface** (`{colors.surface}` — `oklch(0.97 0.013 260 / 0.75)`): translucent floating layer (nav, dropdowns, modals over imagery). The 0.75 alpha is the explicit ceiling.

### Charts
- **Chart 1–5** (`{colors.chart-1}` through `{colors.chart-5}`): five-series palette used in DevTasks, analytics, and `BentoTech`. All five carry 4.5:1+ against paper.

### Gradients
- **Primary gradient** (`from-{colors.gradient-primary-from}` → `to-{colors.gradient-primary-to}`): single CTA surfaces, ribbon backgrounds, top-of-page bento. Used in 2-3 places only, never as decoration on default surfaces.
- **Decorative gradient** (`from-{colors.gradient-decorative-from}` → `to-{colors.gradient-decorative-to}`): reserved for empty states and onboarding moments; never on solid content.

### The Ten Themes

| Theme | `data-color-scheme` | Hue | Accent (light/dark) | Character |
|---|---|---|---|---|
| Sky Blue (default) | `sky-blue` | 261° indigo | `oklch(0.63 0.27 254)` / `oklch(0.7 0.16 258)` | Default voice; electric blue over cool paper |
| Forest Green | `forest-green` | 145° green | `oklch(0.405 0.101 131)` / `oklch(0.72 0.13 145)` | Deep moss over pale paper; for a quiet day |
| Paper | `paper` | 50° warm | `#8a653f` copper / `#c08560` | 私人书房; legacy hex, parchment-and-copper |
| Sage | `sage` | 145° muted | `#4f7657` / `#7ab088` | 鼠尾草; herb-garden green |
| Mist | `mist` | 225° cool | `#4f6d88` / `#88a8ba` | 雾蓝; cool dusk-blue |
| Blush | `blush` | 355° warm | `#a5656f` / `#c47a85` | 薄红陶; dusty rose |
| Spring | `spring` | 160° teal | `#35bfab` / mint | 春暖; teal ink on teal-50 paper |
| Autumn | `autumn` | 40° warm | `#de4331` / vermillion | 秋实; vermillion on orange-50 |
| Clear Sky | `clear-sky` | 240° cool | `#2fcbe7` / cyan | 晴空; pure-white paper, cyan accent |
| Midnight | `midnight` | 280° indigo | `#2a48f3` / royal blue | 深夜; deep indigo, royal blue accent |

### Named Rules

**The Ten-Rooms Rule.** Every theme is a complete identity, not a recolor. Switching `data-color-scheme` swaps the entire token graph atomically — ink, paper, accent, gradients, charts all change together. The site is not a SaaS with a "dark mode toggle"; it is a study with ten rooms, each with its own paint.

**The One-Voice Rule.** A given screen uses ONE accent value, at ≤15% surface coverage. Bento nav indicator (`bg-primary/20`), primary CTA, focused ring, and one highlighted card are the entire accent vocabulary per view. The accent's rarity is the point.

**The Theme-Not-Warmth Rule.** Tinted neutrals add 0.005–0.015 chroma toward the **theme's own hue**, not toward warm or cool "because the brand feels that way." Sky-blue paper is tinted toward blue, not toward warmth; autumn paper is tinted toward orange, not toward red. There is no "always warm" or "always cool" paper.

**The Hex-Legacy Rule.** Four themes (paper, sage, mist, blush) are still expressed in hex; the other six are oklch. The oklch versions are being migrated to (see `react-app/src/assets/themes/paper.css` for the oklch shadow of the legacy `paper`). When extending a theme, match its existing format. Do not mix oklch and hex within one theme.

## 3. Typography

**Body Font (default):** `font-sans` resolves to the system stack — `'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, 'Segoe UI', sans-serif`. Chinese-set on every platform with a CJK system font.
**Body Font (HarmonyOS toggle):** When the user opts in via Settings → Appearance → Font → HarmonyOS, `:root[data-font='harmonyos']` overrides `--font-sans` and `--default-font-family` to `'HarmonyOS Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif`. This is a **user-level runtime switch**, not a theme-level change. Both frontends expose it; both pre-load the three HarmonyOS_Sans_{Regular,Medium,Bold}.ttf files in `index.html` so the toggle is instant.
**Display Font:** Averia Gruesa Libre (Latin) + 阿里妈妈东方大楷 (CJK brush) — used selectively, never for body
**Serif (Tailwind default):** system serif stack (ui-serif → Georgia → Cambria) — used for blog content, login heroes, literary views
**Mono:** system mono (ui-monospace → SFMono-Regular → Menlo) — for tabular nums, version strings, terminal chrome

**Character:** Literary register without being decorative. The display font is rounded, slightly informal, distinctly Latin (Averia has personality like a hand-drawn bookplate); the body font is whatever the user chose — by default the platform's CJK system stack, optionally HarmonyOS Sans. The body is meant to disappear into the content; the display is meant to carry the literary register where it actually appears (greetings, polaroid dates, AI analysis titles).

### Hierarchy
- **Display** (Averia Gruesa Libre, weight 400, `letter-spacing: -0.02em`): used in 9 Vue + 5 React sites — bento greeting, clock time, polaroid date label, fishing dashboard subtitle, device card label, AI analysis drawer title. CJK sibling: `font-family-dongfang` exclusively for Chinese display (not mixed with Averia).
- **Hero (h1)** (serif, weight 500, `clamp(1.875rem, 4vw + 1rem, 4.5rem)`, `line-height: 1.1`, `letter-spacing: -0.025em`): page titles on `BasicDetail` / `BasicDetail` (React) and `PageHero` — max ceiling 4.5rem (72px) so the page reads as composed, not as shouting. Word-by-word stagger animation gated on `prefers-reduced-motion`.
- **Headline (h2-h3)** (serif, weight 500–600, `text-3xl` to `text-5xl`): section titles, modal headers. Same family as Hero but smaller.
- **Title (h4-h5)** (sans, weight 500–600, `text-lg` to `text-2xl`): card titles, list-item titles, drawer section labels.
- **Body** (`font-sans` = `'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, sans-serif` by default; `'HarmonyOS Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif` when the user toggles `:root[data-font='harmonyos']`): primary body text. CJK body bumps to `line-height: 1.7` for legibility. Default size 15px (`0.9375rem`), `line-height: 1.65`. Max line length 65–75ch enforced by `max-w-6xl` containers.
- **Label** (HarmonyOS Sans Medium 500, `0.6875rem` (11px), `letter-spacing: 0.18em`, UPPERCASE): eyebrows, kickers, version chips, status badges. This is the ONLY place uppercase is used. Reserved for short labels (1–3 words), never applied to body.
- **Mono** (system mono, `0.8125rem` (13px)): tabular-nums timestamps, version strings, status codes, terminal/console chrome.

### Pairing Logic
- Latin display: **Averia Gruesa Libre** (rounded, slightly informal)
- CJK display: **阿里妈妈东方大楷** (brush-style CJK display)
- Body: **`font-sans`** — system CJK stack by default (`PingFang SC` / `Microsoft YaHei`); **HarmonyOS Sans** (Regular 400 / Medium 500 / Bold 700) only when the user opts in via Settings → Appearance → Font. The three `.ttf` files are preloaded so the toggle is instant.
- Blog/literary: **system serif** (Tailwind `font-serif`, 118 component usages)
- Tabular/code: **system mono** (Tailwind `font-mono`, 97 component usages)

The system is a **contrast-axis pairing** (rounded display + clean sans body, brush CJK display + quiet CJK body, serif for literary moments). No two fonts are similar-but-not-identical.

### Named Rules

**The CJK-First Rule.** The body stack must be CJK-capable on day one. The default is `PingFang SC` / `Microsoft YaHei` (every modern OS has one of these), and the HarmonyOS toggle adds `'HarmonyOS Sans'` at the front. Averia is Latin-only and must NEVER be set as `font-sans` or applied to CJK content. CJK display lives in `font-family-dongfang`; CJK body lives in the body stack (default or harmonyos, both fine for CJK).

**The HarmonyOS-Is-An-Opt-In Rule.** HarmonyOS Sans is not the default body font — it is a user-level runtime toggle exposed in Settings → Appearance → Font. Default visitors never load the three `.ttf` files for visible content; they only pay the preload cost. New components must not assume HarmonyOS is the active body font. If a feature is meant to use HarmonyOS for non-display purposes (e.g. clock numerals), use `font-family-harmonyos` explicitly rather than relying on the toggle.

**The One-Display-Font-Per-Moment Rule.** Averia and 东方大楷 do not appear in the same line of text. Averia carries Latin display, 东方大楷 carries CJK display. If a heading mixes scripts, the CJK portion uses 东方大楷 and the Latin portion uses Averia via `font-family-{averia|dongfang}` toggles per element.

**The Label-Is-Label Rule.** Uppercase tracked labels (the `Label` row above) appear as eyebrows, kickers, version chips, and status badges. They are NEVER applied to body or paragraph text. One kicker per major section is voice; eyebrow-on-every-section is the AI scaffolding reflex.

**The 4.5-Not-3 Rule.** Body text hits ≥4.5:1 against its surface; large display text (≥18px or bold ≥14px) hits ≥3:1. Muted gray "for elegance" is the single biggest reason AI designs feel hard to read; the muted-text token (`{colors.muted-text}`) is the floor, and any proposed token darker than that must justify itself.

## 4. Elevation

The system uses **layered ambient drop shadow + inset white highlight** as the default depth vocabulary. Surfaces do not float by glassmorphism; they lift by ambient occlusion underneath and a soft white reflection on top — the visual equivalent of a sheet of paper held under a reading lamp. Depth is **structural, not decorative**: a card lifts because it is a card, not because the design wants to feel expensive.

### Shadow Vocabulary

- **Card ambient** (`box-shadow: 0 1px 1px color-mix(in oklch, var(--ink) 6%, transparent), 0 6px 14px color-mix(in oklch, var(--ink) 10%, transparent), 0 18px 32px color-mix(in oklch, var(--ink) 8%, transparent)`): Polaroid cards, plain cards. Adapts to theme via `color-mix`.
- **Bento card layered** (`box-shadow: color-mix(in srgb, var(--color-foreground) 12%, transparent) 0px 40px 50px -32px, color-mix(in srgb, var(--color-foreground) 8%, transparent) 0px 60px 80px -48px, rgba(255, 255, 255, 0.35) 0px 0px 20px 0px inset`): the home-page bento card signature. Two-layer ambient + inset white.
- **Nav squircle** (light: `inset rgba(255,255,255,0.35) 0 0 20px 0, 0 6px 16px -4px rgba(0,0,0,0.12), 0 4px 8px -2px rgba(0,0,0,0.08)` / dark: `inset rgba(255,255,255,0.06) 0 0 20px 0, 0 0 24px -4px rgba(255,255,255,0.12), 0 0 8px -2px rgba(255,255,255,0.08)`): the floating pill nav swaps inset+outer colors for dark mode.
- **Modal panel** (`box-shadow: 0 12px 32px color-mix(in oklch, var(--ink) 10%, transparent)`): the standard modal lifts cleanly; heavy modals (settings, pic detail) add a second layer.
- **Tailwind utility shadows** (`shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`): use Tailwind's defaults for utility surfaces; reserve custom shadows for the signatures above.
- **Color-tinted shadows** (`shadow-primary/30`, `shadow-brand-devices/30`): for primary CTAs and the device tracker only.

### Modal Backdrop
- Standard: `bg-black/45 backdrop-blur-[10px]` (the project default; in active cleanup toward `bg-ink/45` or no-blur per design-system.md rules).
- Native dialog (AlertDialog): `backdrop:bg-black/80` (heavier 80% on `<dialog>`).
- **Forbidden**: arbitrary `bg-black/75 backdrop-blur-2xl` decorative glass on user content.

### Named Rules

**The Lift-From-Below Rule.** Surfaces lift by ambient occlusion underneath and a soft white inset highlight on top. They do not float by glassmorphism. `backdrop-blur-*` is reserved for floating UI over imagery (nav, dropdowns, modals); never for content cards on solid backgrounds.

**The Reduced-Motion-Honors-Depth Rule.** Every entrance animation gated on `prefers-reduced-motion: reduce` MUST still complete with the depth visible. Card entry by spring is fine; if reduced-motion is on, the card snaps in with its shadow intact. The shadow is the depth, not the entry.

**The 12% Ceiling.** Color-tinted shadows on primary actions use ≤30% alpha (`shadow-primary/30`). The shadow is the *hint* of an accent, not the accent itself. Going past 30% reads as a colored outline pretending to be a shadow.

**The Inset-White-Highlight Rule.** Bento cards, the floating nav, and the BasicDetail inner section all carry an inset white highlight at `rgba(255,255,255,0.35)` (light) or `rgba(255,255,255,0.06)` (dark). This is the "paper held under a lamp" effect. The highlight is what separates this system from flat SaaS cards with one drop shadow.

## 5. Components

### Buttons (Vue: `UiButton`; React: hand-written)

- **Shape:** `rounded-md` (8px). The only exception is the hero "back" button on `BasicDetail` / `LoginView`, which is `rounded-full`.
- **Primary:** `bg-primary text-primary-foreground hover:bg-primary/90`. Padding `0.5rem 1rem` (size default). font-medium. The single accent on the page.
- **Secondary:** `bg-secondary text-secondary-foreground hover:bg-secondary/80`. Used when a primary is already in view; quieter voice for the second action.
- **Ghost:** `hover:bg-muted hover:text-foreground`. The "no chrome" button; appears as text until hover.
- **Destructive:** `bg-destructive text-white hover:bg-destructive/90`. Used sparingly — confirm/delete flows only.
- **Focus:** `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`. Three-pixel focus ring, never a 1px outline.
- **Sizes:** default | sm | lg | icon (square 36×36) | icon-sm (28×28) | icon-lg (44×44).

### Cards / Containers

- **Default card** (Vue `UiCard`): `bg-background text-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm`. Border by default, light shadow. Used for static content panels.
- **Bento card** (Vue `BentoCard` / React `BentoCard`): `bg-background rounded-{squircle}`. Layered ambient + inset white highlight shadow. Used on the home page only. User-draggable.
- **Polaroid card** (Vue `PolaroidCard`): `bg-background rounded-{xl} p-3`. Three-layer color-mix shadow. Used for photo cards. Optionally `font-family-averia` for the date label and `font-family-dongfang` for CJK memo text.
- **Internal padding scale:** `p-3` (compact, polaroids) / `p-4` (list rows) / `p-6` (standard cards) / `p-8` (hero cards) / `py-12 px-6` (section containers).

### Inputs / Fields

- **Shape:** `rounded-xl` (14px). Larger radius than buttons — inputs feel softer, less "machine-like."
- **Background:** `bg-muted` (the warm-gray token) with `bg-background` for the search inputs in `BlogListView` and `LoginView`.
- **Border:** `border-border`. One hairline, no `border-2`.
- **Placeholder:** `placeholder:font-serif placeholder:italic` (used on login + blog search) — the literary voice is in the placeholder, not the value.
- **Focus:** `focus:ring-primary/30 focus:ring-2 focus:outline-none`. Two-pixel ring, primary tint at 30% alpha.
- **Padding:** `py-3 px-4`. Generous vertical padding for finger-friendly targets.

### Navigation

- **Vue floating nav** (`BasicNav.vue`): squircle floating pill, 6 nav items, `bg-background/90 backdrop-blur-sm`, `z-9999`. Spring-animated indicator (`stiffness: 320, damping: 30`) is `bg-primary/20 rounded-full h-12 w-12`. Avatar at the left edge.
- **React sidebar** (`BasicSidebar.tsx`): `bg-card/90 fixed top-0 left-0 z-100 flex h-screen w-80 flex-col gap-6 rounded-r-4xl p-6 backdrop-blur-sm`. Right-rounded squircle, full-height. Mobile uses a bottom-sheet `BasicNav.tsx` instead.
- **Nav indicator:** the active state is a soft accent fill, NOT a bold underline, NOT a colored bar, NOT an arrow. The indicator slides on `stiffness: 320, damping: 30` — fast enough to feel responsive, soft enough to feel paper.

### Modal

- **Vue `Modal.vue`:** `bg-background border-border/60 relative w-full overflow-hidden rounded-2xl border shadow-2xl`. Sizes: sm 420px / md 560px / lg 720px / xl 880px. Motion: fade overlay 180ms; panel spring `stiffness: 340, damping: 32, mass: 0.8` (scale 0.95→1, y 12→0). Body scroll lock with scrollbar compensation.
- **Vue `AlertDialog` (native `<dialog>`):** `bg-background backdrop:bg-black/80` + `data-[state=open]:animate-in fade-in-0 zoom-in-95` from `tw-animate-css`. Spring `duration: 200`.
- **Vue `PicDetailModal` (signature):** film-strip layout, `bg-card text-card-foreground border-border/60 max-w-5xl rounded-2xl md:grid-cols-[1.45fr_1fr]`. `bg-ink text-paper` film-label chip in top-left. Custom `0 12px 32px color-mix(in oklch, var(--ink) 10%, transparent)` shadow.
- **React `MomentDetailModal`:** `bg-background/60 backdrop-blur-sm` mask, `bg-card border-border/40 max-w-[720px] rounded-xl shadow-xl`. Motion `duration: 0.18` (scale 0.96→1, y 8→0).
- **React `SettingMoal`:** right-side drawer, `bg-card/95 border-border/50 rounded-l-2xl shadow-2xl`. Slides in from the right.

### Chips / Tag Pills

- **Vue `TagPill`:** `bg-muted text-muted-foreground rounded-full px-2.5 text-xs`. With `compact` prop: `px-1.5 text-[10px]`.
- **Blog category chip** (`BlogListView.vue`): `font-serif tracking-normal normal-case italic`. The literary voice carries through to the chip.
- **React:** no shared component; inline `rounded-full px-2.5 py-0.5 text-xs bg-muted text-muted-foreground`.

### Signature Component — BasicDetail (Hero)

The shared hero used by `/`, `/moments`, `/bookshelf`, `/bookshelf/stats`. Eyebrow chip (`font-mono text-[10px] tracking-[0.4em] uppercase text-muted-foreground`), `h1` with `font-serif text-7xl max-sm:text-3xl`, word-by-word stagger animation (`title-word-in` keyframe, 600ms, `cubic-bezier(0.22, 1, 0.36, 1)`), subtitle pill badge, scroll indicator, and a "back" button (squircle `rounded-full bg-primary`). Section card under the hero carries `shadow-[inset_0_0_20px_0px_rgba(255,255,255,0.35)]` — the inset highlight signature.

**Why it's a signature:** it is the only place the literary register and the bento card pattern meet. The hero says "this is a personal study"; the inset highlight underneath says "everything else follows from here."

### Signature Component — BentoCard (Home Grid)

The home-page bento grid. 14 draggable cards (`BentoCalendar`, `BentoCat`, `BentoClock`, `BentoClockTime`, `BentoGreeting`, `BentoLike`, `BentoMap`, `BentoMemo`, `BentoNewPost`, `BentoPic`, `BentoProfileCard`, `BentoReadingList`, `BentoTech`, `BentoWebsites`) on a free-position canvas, not a CSS grid. Squircle shape (`corner-shape: squircle; border-radius: 90px`). Layered ambient + inset white highlight shadow. motion-v `Motion` entry (spring `bounce: 0.3, duration: 0.5`).

**Why it's a signature:** the bento grid is the only place the system uses card-as-affordance for a whole page. Every other surface treats cards as a *list item*, not a *page primitive*. The 13-card count is a constraint of the home, not a template to apply elsewhere.

## 6. Do's and Don'ts

The strategic anti-references from `PRODUCT.md` carry through to the visual spec by name. The site is not a SaaS, not a magazine, not a tech-company marketing surface. The Don'ts below are force-multipliers of the brand line, not stylistic preferences.

### Do:

- **Do** use the semantic Tailwind utilities (`bg-background`, `text-foreground`, `bg-primary`, `bg-muted`, `border-border`, `ring-ring`, `bg-chart-1..5`, `from-gradient-primary-from`, `bg-surface`, `bg-brand-devices`). These are the Layer 3 contract. The project lints for hardcoded colors at the layer above.
- **Do** declare new colors as a new theme in `packages/brand/themes/<name>.css` with the same 41-variable schema. Themes are the only way to add a color to the system.
- **Do** use `color-mix(in oklch, var(--ink) N%, transparent)` for shadows that should adapt to the theme. Hardcoded `rgba(0,0,0,0.X)` shadows are a code review red flag.
- **Do** apply `prefers-reduced-motion` to every entrance animation. motion-v and framer-motion degrade `whileHover` etc. automatically; custom keyframes (`title-word-in`, `message-pop`, `card-breathe`) need an explicit `matchMedia` check.
- **Do** cap body line length at `max-w-6xl` (72rem). The blog, fishing, and bookshelf surfaces all use it.
- **Do** use the squircle (`corner-shape: squircle; border-radius: 90px`) for primary floating surfaces (nav, bento cards, hero back button). The 48px fallback works without `corner-shape` support.
- **Do** treat `font-family-averia` and `font-family-dongfang` as display-only. Body stays in the default stack.
- **Do** make the active nav indicator a soft accent fill (`bg-primary/20`), not a colored bar, not an underline.
- **Do** use the `Label` type style (uppercase, tracked, 11px) for short eyebrows, kickers, version chips. One kicker per major section.
- **Do** keep the modal backdrop at `bg-black/45 backdrop-blur-[10px]` or lighter. Anything heavier is glassmorphism-as-decoration, banned.
- **Do** when adding a new accent role (success, warning, destructive), match the existing `oklch(0.696 0.17 162)` / `oklch(0.769 0.188 70)` / `oklch(0.577 0.245 27)` values exactly across all ten themes. Semantic colors do not shift with the theme.
- **Do** round modal panels to `rounded-2xl` (18px) or larger. Smaller radii feel like alert dialogs.
- **Do** extend the `squircle.css` utility rather than redefining `border-radius: 90px` inline. One source for the signature shape.

### Don't:

- **Don't** hardcode color values in component code. `bg-black/75`, `text-white/90`, `from-violet-500/10 via-fuchsia-500/5 to-pink-500/10` are all banned by `docs/rules/design-system.md`. The `@theme incline` typo in `frontend/src/assets/base.css:76` is a pre-existing bug — when fixed, those Tailwind classes will start working; the hex/rgba bans stay.
- **Don't** ship a SaaS cream-bg dashboard. No `bg-amber-50` body, no navy-and-gold fintech palette, no Tailwind starter look. The 10-theme oklch palette exists precisely to make "cream default" impossible.
- **Don't** ship AI-bento / eyebrow / glass cards. No `text-xs tracking-[0.3em] uppercase` eyebrow above every section. No `bg-black/45 backdrop-blur-md` decorative glass on user content. No `bg-linear-to-br from-violet-500/10 via-fuchsia-500/5 to-pink-500/10` hover-glow on every card. The 13-card bento home is the only bento, and it is the kitchen, not the wallpaper.
- **Don't** ship a tech-company marketing site aesthetic. No `/pricing`, no `/enterprise`, no comparison tables, no "trusted by N teams" social proof. The site has no customers and does not want to look like it does.
- **Don't** ship a generic editorial-magazine layout. Display serif + italic + drop caps + broadsheet grid is a saturated 2026 lane; if the brief is not literally magazine-shaped, do not translate to it.
- **Don't** ship side-stripe borders. `border-left` or `border-right` greater than 1px as a colored accent on cards, list items, callouts, or alerts is banned. Use full borders, background tints, leading numbers, or nothing.
- **Don't** ship gradient text. `background-clip: text` combined with a gradient background is decorative, never meaningful. Use a single solid color; emphasis comes from weight or size.
- **Don't** ship the hero-metric template (big number, small label, supporting stats, gradient accent) — it is the SaaS cliché. Stats live as a chart or a list, not as a hero block.
- **Don't** ship identical card grids. Same-sized cards with icon + heading + text, repeated endlessly, is the AI-default card pattern. Vary the surface: a list, a table, a chart, a single emphasized card, or nothing.
- **Don't** ship the tiny uppercase tracked eyebrow above every section. One named kicker as a deliberate brand system is voice; an eyebrow on every section is AI grammar.
- **Don't** ship numbered section markers (`01 / 02 / 03`) as default scaffolding. Numbers earn their place when the section IS a sequence (a real 3-step process, an ordered flow, a typed timeline) and the order carries information the reader needs. One deliberate numbered sequence on one page is voice; numbered eyebrows on every section across the site is AI grammar.
- **Don't** ship a "hero big-number / small-label / supporting stats" SaaS metric block. If the data warrants a stat, make it a chart (`bg-chart-1..5`) or a labeled row, not a hero.
- **Don't** ship text that overflows its container. Test heading copy at every breakpoint; if it overflows, reduce the `clamp` max or rewrite the copy. The viewport is part of the design.
- **Don't** ship a specific rejected direction. The settings modal "文学手账 / 季节面板 / 命令中心" three-way (`design-demos/`), moments page v1/v2/v3, fishing weather card "诗意气象 / 天空剧场" (`weather-card-redesign/`) — these were walked and walked back. Do not propose them again.
- **Don't** animate CSS layout properties unless truly needed. Translate, scale, opacity are the defaults; clip-path, mask, and shadow/glow are the premium materials when they materially improve the effect. Width/height/margin/padding transitions are layout, not motion.
- **Don't** use motion as a fallback for missing depth. The lift-from-below shadow is the depth; motion is the *acknowledgment* of state change. If the shadow is missing, motion will not save it.
- **Don't** ship `bg-card` or `text-card-foreground` in Vue. The Vue `@theme incline` typo means those classes have no Tailwind source. They work in React (the `@theme inline` block exposes them) but not in Vue. Use `bg-background` and `text-foreground` on the Vue side.
- **Don't** ship the `阿里妈妈方圆体` (alibaba) font. It is defined in `@theme` but has zero component references. The display font is Averia (Latin) and 东方大楷 (CJK); the body font is HarmonyOS Sans.
- **Don't** set `font-family-averia` on CJK content. Averia has no CJK glyphs; it will fall back to the body stack and look broken.
- **Don't** ship a hero heading above 4.5rem (72px). `clamp(1.875rem, 4vw + 1rem, 4.5rem)` is the ceiling. Above that the page is shouting, not designing.
- **Don't** ship `tracking` tighter than -0.04em on display headings. Letters touch; cramped, not "designed."
- **Don't** ship z-index values like `999` or `9999` arbitrarily. The scale: `z-0` base → `z-10` sticky → `z-50` modals/dropdowns → `z-100` sidebar drawer → `z-9999` nav (sits above modals) → `z-99999` theme transition overlay. New layers pick from this scale.
- **Don't** ship a background `var(--ink)` on dark themes as a body. Dark mode ink is meant for text on paper, not paper itself. The dark paper token is already defined.
- **Don't** ship content visibility gated on a class-triggered transition. Reveal animations must enhance an already-visible default; transitions pause on hidden tabs and headless renderers, so the reveal never fires and the section ships blank.
