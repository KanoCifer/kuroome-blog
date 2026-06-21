# Product

## Register

brand

## Users

- **Primary (author)**: a single admin (`user.id in (1, 2)`) who runs the site as a private workshop — tracks personal reading, fishes, and writes about both. Every tool on the site is shaped to be pleasant for this one person to use every day.
- **Secondary (returning technical readers)**: developers, AI / data / reading-tracker enthusiasts who find the blog or the WeRead pipeline, then return for the fishing map, the WeRead RSS bridge, the AI weather analysis, or the dev/AI writing. They arrive with low context and expect the site to read as one voice, not as a product page.

Visitors are not customers, do not sign up, and will not be sold anything. The site is a portfolio of work-in-progress and a working toolset at the same time — the same audience reads both, and the two surfaces have to feel like one site.

## Product Purpose

A single-author site that does three things under one roof:

1. **Track reading.** WeRead (微信读书) import, manual book entry, reading stats, year heatmap, comments. The reading surface is the historical reason the site exists.
2. **Track fishing.** Current-location weather, 24h trend, expert-rule index + ML residual model, user feedback loop, AI weather analysis. A side-project that grew into a real feature set.
3. **Write about it.** Long-form Markdown blog (categories, Twikoo comments, version log), short "moments" / 碎碎念 microblog, plus a dev todo kanban (DevTasks), friend links, bookmarks gallery, image toolbox, service status page, subscription tracker, device tracker.

Success looks like: the author uses the tools every day; returning readers find something worth reading; the site stays on a single design language across content and tools.

## Brand Personality

**书卷气 · 准 · 适**

- **书卷气 (literary register)**: the site reads as a personal library + study, not a SaaS dashboard. Paper-fold hero, Averia display, `font-serif` headings, "私人书房" / "碎碎念" micro-blog terminology, deliberate old-book typography in WeRead formatting.
- **准 (exact)**: opinions are stated, decisions are committed, and the design system encodes them in code (3-layer token architecture, oklch, 10 named themes, explicit 禁止事项 list). The site's taste is in the design-system.md, not just in the prose.
- **适 (measured / fit-for-purpose)**: nothing is performed for an audience. No CTAs, no growth hooks, no "join 10,000 readers" copy. The design adds only what the author would still want at the end of a long day.

Tone: Chinese-first, lowercase-keyboard English for subheadings ("Welcome back to the reading space", "Volume · 壹 / Recent"), kuro neko = 黒猫 as the brand animal — quiet, independent, deliberate.

## Anti-references

What this site explicitly is **not**:

- **Generic SaaS cream-bg dashboard.** No `bg-amber-50` body, no navy-and-gold fintech, no Tailwind starter look. The 10-theme oklch palette exists precisely to make "cream default" impossible.
- **AI bento / eyebrow / glass cards (2024-2026 default).** No `text-xs tracking-[0.3em] uppercase` eyebrow above every section. No `bg-black/45 backdrop-blur-md` decorative glass. No `bg-linear-to-br from-violet-500/10 via-fuchsia-500/5 to-pink-500/10` hover-glow on every card. The 13-card bento home is the only bento, and it is the kitchen, not the wallpaper. `docs/rules/design-system.md` lists the explicit bans; the codebase has been actively cleaning them up.
- **Tech-company marketing site aesthetic.** No `/pricing`, no `/enterprise`, no comparison tables, no "trusted by N teams" social proof. The site has no customers and does not want to look like it does.
- **Specific rejected directions** (the team has already walked these and walked back):
  - Settings modal: 文学手账 / 季节面板 / 命令中心 (three HTML mockups in `design-demos/`).
  - Moments page: v1 / v2 / v3 (in `design-demos/moments-*`).
  - Fishing weather card: 诗意气象 / 天空剧场 (in `weather-card-redesign/`).
  - "Hero big-number / small-label / supporting stats" SaaS metric block.
  - Identical-card grids: never ship a list of N cards with the same icon + heading + text, unless the cards actually need to be uniform.

## Design Principles

1. **作供自用 — practice what you preach.** The site is a workshop, not a storefront. Every affordance that exists for the author is honest; nothing is kept solely for an imagined visitor. If a feature is author-only, it can be author-grade. (The author is also the audience, and the design should not pretend otherwise.)
2. **不推销 — decide, don't sell.** The site does not persuade. It states. The blog, the moments, the tools all share a single voice: this is what I made, this is what I read, this is what I think. There is no growth layer between the author and the reader.
3. **中文书房 — Chinese-first literary surface.** All visible copy is Chinese, with restrained English subheadings. The font system carries this: HarmonyOS Sans (body, including CJK), Averia Gruesa Libre (display headings, 文学味), `font-serif` (blog list and literary pages). 阿里妈妈方圆体 / 东方大楷 are reserved for deliberate display, not body text. The site reads Chinese, even if the codebase is in English.
4. **代码即品味 — encode the taste.** Taste is a function, not a feeling. The 3-layer token architecture (raw theme vars → theme activation → semantic Tailwind classes), the 10 named color schemes, the explicit 禁止事项 in `design-system.md`, the design-demos/SPEC.md decision artifacts — these are how the site stays on-brand across two frontends (Vue desktop, React mobile) and one author. **Hardcoded colors (`bg-black/75`, `text-white/90`, `from-violet-500 …`) are a code review red flag, not a stylistic choice.** The hardcoded `BentoTech.vue` / `BentoReadingList.vue` color classes are open debt, not exceptions.

## Accessibility & Inclusion

- **Author + Chinese-first ergonomics.** The audience is technically literate and CJK-native; the a11y target is "comfortable for the author at the end of a long day", not a corporate WCAG audit. In practice this means:
  - Body text contrast ≥ 4.5:1 in every theme (no "muted gray for elegance" regressions).
  - CJK font legibility at body size: not too thin, not too dense. Display fonts (Averia, 东方大楷) reserved for headings, not body.
  - Full keyboard navigation; visible focus rings via `ring-ring`.
  - `prefers-reduced-motion: reduce` honored on every animation; reveal animations never gate content visibility.
  - Mobile (React-app) is the primary form factor for the author on the go; the React side is not a stripped-down mirror, it is a parallel surface that follows the same design system.
- No external screen-reader / a11y audit is in scope; the rules above are the contract.
