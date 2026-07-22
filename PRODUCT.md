# Product

<!-- impeccable:product-schema 1 -->

## Platform

web — Vue 桌面端 (`frontend/`) + React 移动 web (`react-app/`)，按设备自动分流。无原生端、无 PWA 上架。

## Users

- **Primary (author)**: a single admin (`user.id in ADMIN_USER_IDS`, default `[1, 2]`) who runs the site as a private workshop — tracks personal reading, fishes, and writes about both. Every tool on the site is shaped to be pleasant for this one person to use every day.
- **Secondary (returning technical readers)**: developers, AI / data / reading-tracker enthusiasts who find the blog or the WeRead pipeline, then return for the fishing map, the WeRead RSS bridge, the AI weather analysis, or the dev/AI writing. They arrive with low context and expect the site to read as one voice, not as a product page.

Visitors are not customers, do not sign up, and will not be sold anything. The site is a portfolio of work-in-progress and a working toolset at the same time — the same audience reads both, and the two surfaces have to feel like one site.

## Product Purpose

A single-author site that does three things under one roof:

1. **Track reading.** WeRead (微信读书) import, manual book entry, reading stats, year heatmap, comments. The reading surface is the historical reason the site exists.
2. **Track fishing.** Current-location weather, 24h trend, expert-rule index (9-feature weighted score) + ML residual calibration (Ridge regression), user feedback loop, AI weather analysis (LLM streaming). A side-project that grew into a real feature set.
3. **Write about it.** Long-form Markdown blog (categories, Twikoo comments, views), short "moments" / 碎碎念 microblog, plus a dev todo kanban (DevTasks), friend links, bookmarks / websites gallery, image toolbox / gallery (waterfall), service status page, subscription tracker, device tracker, RSS workspace, changelog, color showcase, server analytics.

Success looks like: the author uses the tools every day; returning readers find something worth reading; the site stays on a single design language across content and tools.

## Positioning

A personal study, not a storefront. The site's claim is that every tool on it is *actually used* by its author — reading, fishing, writing, tinkering — and the design is honest about that. There is no growth layer, no audience persona, no "join N readers" copy. What you see is one person's working workshop, opened to visitors, in a single literary-meets-technical voice. A neighboring product could copy the feature list but not the fact that the author genuinely lives in it.

## Operating Context

- **Author's day**: imports WeRead shelves, logs fishing trips (weather/tide/feedback), writes blog posts and 碎碎念 moments, triages DevTasks, checks server status and RSS. The site is both the workshop and the public notebook.
- **Returning reader's path**: arrives via search / link → reads a blog post or lands on the fishing map → stays for the WeRead RSS bridge, AI weather analysis, or dev writing. Low context on arrival; the site must read as one voice.
- **Runtime**: Docker Compose (FastAPI + Go + PostgreSQL + MongoDB + Redis + RabbitMQ). Desktop Vue and mobile React auto-routed by device. Task queue (Taskiq + RabbitMQ) handles RSS refresh, email, boot notifications, log persistence.
- **Content language**: Chinese-first, with restrained English subheadings. Codebase and configs are in English; all visible copy is Chinese.

## Capabilities and Constraints

- **Dual frontend**: Vue 3.5 (desktop) + React 19 (mobile), independent state stores (Pinia / Zustand), shared theme tokens via `packages/brand/`. API contract changes **must** sync `frontend/src/features/<domain>/api/` and `react-app/src/services/`.
- **Dual backend**: FastAPI (Python) is the incumbent; Go (`go-backend/`, prefix `/api/v3/*`) is progressively migrating auth, blog, admin, devtask, monitor, fishing, deploy, system, and upload. Both share the same PostgreSQL user library and Redis. JWT issue / refresh / logout must stay consistent across both (see `docs/rules/auth.md` / `docs/rules/go-backend.md`).
- **Admin**: hardcoded `user.id in ADMIN_USER_IDS` (not RBAC, not a DB field). Go's AdminMiddleware runs after AuthMiddleware.
- **Fishing index**: two-step — expert rule (9-feature weighted sum) → Ridge regression residual calibration. `FishingModelMeta` persists model version / training time / weights in MongoDB.
- **Design system**: 3-layer token architecture (raw oklch vars → per-scheme theme files → semantic Tailwind classes). **4 named color schemes** (paper / sage / mist / blush) in `packages/brand/themes/`, shared across both frontends. Hardcoded colors are a code review red flag, not a stylistic choice.
- **Auth methods**: password, passkey, GitHub OAuth (Go backend owns these; Python passkey code still present).
- **Undecided / in flux**: the Go-for-Python migration is ongoing and its final scope is not fixed.

## Brand Commitments

- **Name**: kanocifer.chat, branded as "kuro neko" / 黒猫 (black cat) — quiet, independent, deliberate.
- **Voice**: 书卷气 · 准 · 适 (literary · exact · measured). Chinese-first, lowercase-keyboard English subheadings. Opinions stated, decisions committed, design taste encoded in code (design-system.md, 禁止事项 list), not just prose.
- **Fonts**: HarmonyOS Sans (body, including CJK), Averia Gruesa Libre (display headings, 文学味), `font-serif` (blog / literary pages). Display fonts reserved for headings, never body.
- **What it is not** (anti-references): generic SaaS cream-bg dashboard; AI bento / eyebrow / glass-card default (2024–2026); tech-company marketing site (no `/pricing`, no social proof); identical-card grids.

## Evidence on Hand

- No external press, testimonials, or customer quotes exist — future work must not fabricate them.
- Real content: the author's own blog posts, reading records, fishing records, moments, and changelog, all driven by live data in PostgreSQL / MongoDB.
- Design decision artifacts live in `docs/rules/design-system.md` and `docs/rules/code-style.md` (rejected directions are recorded there, not in a standalone `design-demos/` directory).

## Product Principles

1. **作供自用 — practice what you preach.** The site is a workshop, not a storefront. Every affordance that exists for the author is honest; nothing is kept solely for an imagined visitor.
2. **不推销 — decide, don't sell.** The site states; it does not persuade. Blog, moments, tools share one voice: this is what I made, this is what I read, this is what I think. No growth layer.
3. **中文书房 — Chinese-first literary surface.** All visible copy is Chinese, restrained English subheadings. The font system carries this. The site reads Chinese, even though the codebase is in English.
4. **代码即品味 — encode the taste.** Taste is a function, not a feeling. The 3-layer token architecture, the 4 named schemes, the explicit 禁止事项, the decision artifacts in `docs/rules/` — these are how the site stays on-brand across two frontends and one author.

## Accessibility & Inclusion

- **Author + Chinese-first ergonomics.** Technically literate, CJK-native audience; the a11y target is "comfortable for the author at the end of a long day", not a corporate WCAG audit. In practice:
  - Body text contrast ≥ 4.5:1 in every theme (no "muted gray for elegance" regressions).
  - CJK font legibility at body size: not too thin, not too dense. Display fonts reserved for headings.
  - Full keyboard navigation; visible focus rings via `ring-ring`.
  - `prefers-reduced-motion: reduce` honored on every animation; reveal animations never gate content visibility.
  - Mobile (React-app) is the primary form factor for the author on the go; it is a parallel surface under the same design system, not a stripped-down mirror.
- No external screen-reader / a11y audit is in scope; the rules above are the contract.
