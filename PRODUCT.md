# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: the site owner (站主)** — kanocifer.chat is a personal digital garden whose core consumer is the owner themselves. Reading tracking (WeRead, RSS), writing (blog, Moments), life logging (fishing records, subscriptions, devices), and the dev task workspace are all daily-use personal tools. The site is the owner's operating surface for thinking, making, and managing.

**Secondary: visitors** — a readership that encounters the owner's writing, reading notes, and life fragments through the public-facing surfaces (blog, Moments, changelog, status page). No paywall, no login wall — all content is open to the public.

## Product Purpose

kanocifer.chat exists to give one person's reading, writing, and daily life a single coherent home on the web. It is not a content platform, not a SaaS, and not a portfolio — it is the owner's externalized memory and creative surface. Success looks like: the owner genuinely wants to open it every day to read, write, record, and track; a small readership finds something worth returning to.

## Positioning

What a neighboring product cannot truthfully copy: **a unified personal narrative**. Reading (WeRead / RSS), writing (blog / Moments), life (fishing / subscriptions / devices), and making (dev tasks) are not features bolted together — they are all facets of one person's life, presented as one coherent digital identity. The mechanism is *the owner's sustained presence*, not a category template. It is closer to a digital garden than to a blog platform or a multi-tool dashboard.

## Operating Context

- **Daily personal use**: the owner opens the site to log what they read, publish a post, post a Moment, check a subscription's billing cycle, record a fishing session, or move a dev task forward. These are real recurring rituals, not hypothetical workflows.
- **Reading scene**: visitors arrive via search, shared links, or RSS readers. They read a blog article, browse the Moments feed, check the changelog, or look at the public status page. No account required.
- **Technical operating context**: the owner works on the site itself as a full-stack project — design, frontend (Vue + React dual-client), backend (FastAPI + Go migration), ML (fishing index), and infrastructure (Docker / CI / monitoring). The site is simultaneously a product and a practice ground.
- **Devices**: desktop (Vue app, primary creation surface) and mobile (React app, consumption + light interaction). UA-based automatic routing splits the two.

## Capabilities and Constraints

**Confirmed capabilities** (runnable today):
- Auth: registration (email verification), login, profile, JWT/Cookie, WebAuthn/Passkey, GitHub OAuth
- Blog: Markdown editor with autosave drafts, categories, Twikoo comments, moderation
- WeRead: bookshelf sync, reading stats (weekly/monthly/yearly/total), progress tracking (dual-client)
- RSS reader: subscription parsing, article aggregation, read/unread, image proxy, scheduled refresh
- AI assistant: article summary + conversational AI (SSE streaming), model selection, session history
- Moments: Twitter-like lightweight posts with images/links/books/quotes, tags, mood, location, visibility control (dual-client)
- Fishing index: expert rules (9-feature weighted scoring) → ML residual calibration (Ridge regression), weather/tide data fusion, feedback loop for retraining
- Subscription management: billing cycle tracking, monthly cost stats, multi-channel expiry reminders (Feishu/Bark/Email)
- Device management: asset tracking, milestone reminders (100-day / 1-year), daily cost analysis
- Dev task workspace: three-view workspace (push / plan / review), P0–P3 priority, dependencies, spec, global frontier drawer (Vue desktop)
- Guestbook, friend links, gallery (waterfall + fullscreen), image toolbox (client-side compress/convert)
- Multi-theme system: 4 color schemes (paper / sage / mist / blush), CSS custom properties, light/dark
- Bento homepage: draggable + layout save (Vue), CSS grid (React)
- Real-time visitor stats (WebSocket), server monitoring, public status page, SEO (robots + sitemap)

**Confirmed constraints:**
- Dual-client split (Vue desktop / React mobile) with UA-based auto-routing is fixed architecture — not merging into one client.
- Each client maintains its own independent state store (Pinia / Zustand); API contract changes must be synced across `frontend/src/api/` and `react-app/src/services/`.
- Multi-theme system (4 schemes + light/dark) is a committed product feature.
- Admin is hardcoded via `ADMIN_USER_IDS` env var — not RBAC, not a DB field.
- Python (FastAPI, `/api/v1` + `/api/v2`) and Go (Gin, `/api/v3`) share one Postgres user DB and one Redis; JWT issuance / refresh rotation / logout must stay consistent across both backends.
- Fishing index is a two-step computation: expert rules → Ridge residual calibration.

**Undecided / not confirmed:**
- Whether the fishing index, dev task workspace, and other "tool" surfaces are public-facing or owner-only.
- Whether the site actively grows a readership or remains a write-lightly, read-rarely personal archive.

## Brand Commitments

- **Name & identity**: "kanocifer.chat" originates from Japanese "kuro neko" (黒猫, black cat). The black cat is a confirmed **naming origin with light visual accent** (logo / icon touches) — not a mandatory full-site visual theme.
- **Voice**: **warm, human, everyday** — like a friend's share, not a technical showcase and not a minimalist gallery. This should guide the expression direction of future design work.

## Evidence on Hand

- Full feature list, tech stack, and architecture: [README.md](README.md)
- Domain glossary and key constraints: [CONTEXT.md](CONTEXT.md)
- API endpoint reference: see README "API 端点" section
- Screenshots: `docs/images/` (首页, 关于, 主题系统)
- Live product: https://kanocifer.chat
- Design system documentation: none yet (no DESIGN.md exists)
- Imagery assets: not audited — future work should not fabricate branded imagery without checking `frontend/src/assets/` and `react-app/src/assets/`

**Absences future work must not fabricate:**
- Testimonials, customer counts, or readership metrics
- Pricing, licensing, or deployment claims (MIT license, personal project)
- Case studies or press

## Product Principles

1. **It's one person's place.** Every surface — reading, writing, fishing, dev tasks — is a facet of a single digital identity. Design should feel coherent, not like a feature catalog.
2. **Tools earn their place by daily use.** Surfaces exist because the owner actually uses them, not to impress. Design should respect the owner's real rituals over visual novelty.
3. **Warm over impressive.** The voice is a friend's share, not a portfolio. Expression should invite, not perform.
4. **Open by default.** Content is public. No paywall, no login wall. Design assumes a visitor who arrived without credentials.
5. **Dual-native, not dual-compromised.** Desktop and mobile are first-class, independent clients sharing a backend — not one responsive site pretending to serve both.

## Accessibility & Inclusion

No product-specific accessibility requirement was established beyond the general expectation that a public web site should be operable. The multi-theme system (light/dark + 4 schemes) is the primary confirmed mechanism for visual preference accommodation. Future design work should preserve theme compatibility and not break contrast in any single scheme.
