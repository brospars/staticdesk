# StaticDesk roadmap

> **Pitch:** embeddable forms and interactions for static sites
> (GitHub Pages, GitLab Pages, MkDocs, Docusaurus, Jekyll, Hugo, VitePress, Astro…).
> Disqus + Crisp/Intercom, **without the live chat**: contact form, comments,
> likes, reviews, shared inbox, auto-replies and simple analytics.
> Open source, free to self-host, or a paid SaaS.

**Stack:** Nuxt 4 · Nuxt UI 4 · Vercel · Supabase · Resend · Stripe

Legend: 🧑 = manual action (account, configuration, decision) · 💻 = development

---

## Phase 0: name, brand and key decisions

### Name and domain
- [x] Check `formdesk.app` → **taken** (as are `formdesk.com`, `.io` and `.so`)
- [x] Drop "FormDesk": a product named *Formdesk* already exists (online form builder, formdesk.com) in the same category, so there is a risk of confusion and a trademark dispute
- [x] Shortlist available names (checked on 2026-10-27):
  - **StaticDesk**: `staticdesk.app` ✅, `staticdesk.dev` ✅ (`staticdesk.com` ❌). **Recommended.**
  - SiteBell: `sitebell.app` ✅
  - KnockBox: `knockbox.app` ✅
  - FormNook: `formnook.app` ✅
  - StaticBox: `staticbox.app` ✅, `staticbox.dev` ✅
- [x] 🧑 Confirm the final name → **StaticDesk**
- [ ] 🧑 Search for registered trademarks on the chosen name (INPI, EUIPO, USPTO)
- [ ] 🧑 Check that handles are free: GitHub org, npm (`@staticdesk/*`), X/Twitter, Bluesky, Mastodon, LinkedIn, Product Hunt, Discord
- [ ] 🧑 Register `staticdesk.app` with the free domain included in Vercel Pro (still available on 2026-10-27)
- [ ] 🧑 (Optional) Buy `staticdesk.dev` for the docs and demo, or as a redirect
- [x] 🧑 Rename the GitHub repository `formdesk` to `staticdesk` (GitHub redirects the old URL)
- [ ] 🧑 Register the trademark (optional at first, do it before the public launch)

### Product and technical decisions
- [ ] 🧑 License: **AGPL-3.0** (recommended for an open-core SaaS: it prevents a competitor from reselling the service without publishing their changes) or MIT/Apache-2.0 (wider adoption, less protection). AGPL-3.0 is currently applied by default; MIT could suit the widget and plugins
- [ ] 🧑 Open source model: all code in the public repository, SaaS features (billing, quotas) enabled by environment variables, no closed `ee/` folder
- [ ] 🧑 Self-hosting strategy: self-hosted Supabase (official Docker setup) **or** Postgres + simple auth. Recommendation: support self-hosted Supabase in v1, without tight coupling (database access through a repository layer)
- [ ] 🧑 Email when self-hosted: Resend **or** generic SMTP (shared adapter)
- [ ] 🧑 Initial pricing (proposal):
  - **Self-hosted**: free, unlimited
  - **Free (SaaS)**: 1 site, 100 submissions/month, 500 comments/month, "Powered by" branding
  - **Pro** (~€9/month): 5 sites, unlimited submissions, auto-replies, no branding, 3 members
  - **Team** (~€29/month): unlimited sites, unlimited members, custom sending domain, export, priority support
- [ ] 🧑 Write the MVP definition (v0.1 scope: see phase 10)

---

## Phase 1: accounts and configuration (manual)

### Company and legal
- [ ] 🧑 Choose a legal structure (e.g. sole proprietorship / single-shareholder company) to receive payments through Stripe
- [ ] 🧑 Open a business bank account
- [ ] 🧑 Create contact addresses (`hello@`, `support@`, `security@`, `abuse@`, `conduct@`)

### Code and tooling
- [ ] 🧑 Create the `staticdesk` GitHub organization, then transfer or create the repository there
- [ ] 🧑 Enable GitHub Discussions, Issues (with templates), Dependabot and secret scanning
- [ ] 🧑 Reserve the `@staticdesk` npm scope
- [ ] 🧑 Create a Docker Hub account or use GHCR for the self-hosted images

### Vercel
- [ ] 🧑 Create the Vercel project linked to the GitHub repository
- [ ] 🧑 Configure the Production / Preview / Development environments
- [ ] 🧑 Add the domains: `staticdesk.app` (app + landing), `cdn.staticdesk.app` or `/widget.js`, `docs.staticdesk.dev`
- [ ] 🧑 Enable Vercel Analytics and Speed Insights (for the landing page)

### Supabase
- [ ] 🧑 Create the organization and two projects: `staticdesk-prod` and `staticdesk-staging` (EU region for GDPR)
- [ ] 🧑 Configure Auth: magic link, GitHub OAuth and Google OAuth, Vercel redirect URLs
- [ ] 🧑 Create a GitHub OAuth App and Google Cloud credentials for auth
- [ ] 🧑 Enable backups (PITR in production once the volume justifies it)
- [ ] 🧑 Customize the Auth emails (or send them through Resend's SMTP)

### Resend
- [ ] 🧑 Create the account and verify the sending domain (`mail.staticdesk.app`): SPF, DKIM, DMARC
- [ ] 🧑 Configure inbound email for the shared inbox: `reply+<thread>@in.staticdesk.app`, MX and webhook
- [ ] 🧑 Create the API keys (production and staging) and the events webhook (bounce, complaint, delivered)
- [ ] 🧑 Connect Supabase Auth to Resend's SMTP

### Stripe
- [ ] 🧑 Create and activate the account (KYC, bank account)
- [ ] 🧑 Create the products and prices (Pro and Team, monthly and yearly)
- [ ] 🧑 Configure the Customer Portal (plan changes, cancellation, invoices)
- [ ] 🧑 Enable Stripe Tax (EU VAT) and configure invoices
- [ ] 🧑 Create the webhooks (live and test) and collect their secrets

### Observability
- [ ] 🧑 Create a Sentry account (or equivalent) for the app and the widget
- [ ] 🧑 Set up uptime monitoring and a status page (Better Stack, Instatus or Upptime on GitHub Pages)

### Environment variables
- [ ] 🧑 Set in Vercel (see `apps/web/.env.example`): `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY`, `NUXT_SUPABASE_SECRET_KEY`, `NUXT_MAIL_DRIVER=resend`, `NUXT_MAIL_FROM`, `NUXT_MAIL_RESEND_API_KEY`, `NUXT_PUBLIC_APP_URL`, `NUXT_PUBLIC_AUTH_PROVIDERS`, `NUXT_PUBLIC_EDITION=saas`, `NUXT_FINGERPRINT_SECRET` (long random string), optionally `NUXT_PUBLIC_TURNSTILE_SITE_KEY` and `NUXT_TURNSTILE_SECRET_KEY`, then the Resend webhook, Stripe and Sentry secrets when those phases land
- [ ] 🧑 Create an npm access token for the `@staticdesk` scope and add it as the `NPM_TOKEN` GitHub Actions secret (used by the release workflow)

---

## Phase 2: project foundations

### Monorepo
- [x] 💻 Set up an npm workspaces + Turborepo monorepo (`apps/docs` and `packages/integrations/*` are still to be created):
  - `apps/web`: Nuxt 4 (landing, dashboard, API)
  - `apps/docs`: documentation (Nuxt Content / Docus, or VitePress)
  - `packages/widget`: browser SDK in vanilla TS, Web Components and Shadow DOM, bundled as a Vite library
  - `packages/core`: shared types, Zod schemas and API client
  - `packages/integrations/*`: framework plugins (phase 9)
- [x] 💻 Scaffold Nuxt 4 + Nuxt UI 4 (`main.css` with `@import "tailwindcss"; @import "@nuxt/ui";`)
- [x] 💻 Enable strict TypeScript and ESLint (`@nuxt/eslint`), with Prettier or ESLint stylistic → ESLint stylistic chosen
- [x] 💻 Tests: Vitest (unit), `@nuxt/test-utils`, Playwright (e2e, and the widget on a static test page)
- [x] 💻 GitHub Actions CI: lint, typecheck, tests, build, widget bundle size (**< 15 kB gzip** budget for the loader)
- [x] 💻 Conventional Commits, Changesets to version npm packages, Renovate or Dependabot
- [x] 💻 Community files: `README`, `LICENSE`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY.md`, issue and PR templates
- [x] 💻 Write an up-to-date `AGENTS.md` / `CLAUDE.md` (stack, commands, conventions)

### Local Supabase
- [x] 💻 Use the Supabase CLI (`supabase init`, `supabase start`), with versioned migrations in `supabase/migrations`
- [x] 💻 Generate TS types (`supabase gen types`) in CI
- [x] 💻 Write a development seed (a workspace, a site, sample forms and messages)
- [x] 💻 Set up `@nuxtjs/supabase` or a custom server-side client (service-role key **server-side only**)

### Data model (v1)
- [x] 💻 `workspaces` (plan, `stripe_customer_id`, quotas)
- [x] 💻 `members` (user ↔ workspace, role: owner / admin / member)
- [x] 💻 `sites` (allowed domain(s), public key, settings, theme)
- [x] 💻 `widgets` (kind: contact / comments / reactions / reviews; JSON configuration)
- [x] 💻 `threads` and `messages` (shared inbox: status, assignee, labels, inbound/outbound direction)
- [x] 💻 `contacts` (visitors identified by email)
- [x] 💻 `comments` (page_url / page_id, parent_id, moderation status, nullable author, `is_anonymous` flag, edit token hash, salted fingerprint)
- [x] 💻 `reactions` (likes, emoji, upvotes per page)
- [x] 💻 `reviews` (1 to 5 rating, text, status)
- [x] 💻 `auto_replies` (rules, templates, delays)
- [x] 💻 `events` (widget page views, opens, submissions, for analytics)
- [x] 💻 `subscriptions` (Stripe mirror)
- [x] 💻 **Row Level Security** on every table, with policy tests (pgTAP or integration tests)

### Auth and onboarding
- [x] 💻 Sign-in with magic link, GitHub and Google
- [x] 💻 Workspace creation on first sign-in
- [x] 💻 Invite members by email (Resend)
- [x] 💻 Onboarding: create a site, pick a widget, copy the snippet, verify the installation ("first event received")

---

## Phase 3: widget core and public API

- [x] 💻 Single `widget.js` loader: `<script src=".../widget.js" data-site="pk_xxx" defer></script>` (served by the app, 5.8 kB gzip)
- [ ] 💻 Web Components, plus a floating button mode:
  - [x] 💻 `<staticdesk-contact>` (inline and floating)
  - [ ] 💻 `<staticdesk-comments>`, `<staticdesk-reactions>`, `<staticdesk-reviews>` (phase 7)
- [x] 💻 Shadow DOM isolation, theming with CSS variables, automatic dark mode (`prefers-color-scheme`), customizable colors, font and copy
- [x] 💻 Widget i18n (English and French to start, `navigator.language` detection, overridable)
- [x] 💻 Accessibility: focus trap, ARIA, keyboard navigation, contrast (WCAG AA)
- [x] 💻 SPA compatibility: detect route changes (Docusaurus, VitePress), configurable canonical page ID
- [x] 💻 Public API `/api/v1/public/*`: CORS limited to the site's declared domains, one public key per site
- [x] 💻 Anti-spam: honeypot, minimum fill time, rate limiting per IP and per site (Upstash or a Postgres table → Postgres), optional Cloudflare Turnstile
- [x] 💻 Privacy: no third-party cookies by default and hashed IPs, so no cookie banner is needed
- [ ] 💻 Publish to npm (`@staticdesk/widget`) and to a CDN (jsDelivr/unpkg and a versioned `staticdesk.app/widget.js`)
  - [x] 💻 Publishable package and Changesets release workflow
  - [ ] 🧑 Add the `NPM_TOKEN` secret, then merge the "Version packages" PR to publish 0.1.0
- [ ] 💻 Dashboard settings for a site: allowed origins, theme, language, Turnstile (the API reads them; editing them needs a settings page)

---

## Phase 4: contact form

- [ ] 💻 Default fields (name, email, message) plus custom fields (text, select, checkbox)
- [ ] 💻 Client and server validation (shared Zod schema)
- [ ] 💻 Attachments (Supabase Storage, size limit, optional antivirus)
- [ ] 💻 Customizable success and error messages, optional redirect
- [ ] 💻 "Plain HTML form" mode: `<form action="https://staticdesk.app/f/xxx" method="POST">`, works without JS
- [ ] 💻 Email notification to the team for each new message (Resend)
- [ ] 💻 Outgoing webhooks (Slack, Discord, custom URL)

---

## Phase 5: shared inbox

- [ ] 💻 Inbox view: conversation list, filters (status, site, assignee, label), full-text search (Postgres FTS)
- [ ] 💻 Conversation view: history, reply from the dashboard, sent through Resend from a `reply+<id>@` address
- [ ] 💻 Receive visitor replies through Resend's inbound webhook, attached to the right thread
- [ ] 💻 Statuses (open / pending / resolved), assignment, labels, internal notes
- [ ] 💻 Realtime (Supabase Realtime): new messages and a "X is replying" indicator
- [ ] 💻 Saved replies (canned responses)
- [ ] 💻 Notifications: email, daily digest, per-member preferences
- [ ] 💻 Custom sending domain per workspace (Team plan): DNS verification through the Resend API
- [ ] 💻 Bounce and complaint handling (Resend webhook, then contact suppression)

---

## Phase 6: auto-replies

- [ ] 💻 Automatic acknowledgement to the visitor (editable template, `{{name}}` and `{{site}}` variables)
- [ ] 💻 Out-of-office message and opening hours
- [ ] 💻 Simple rules: per site, per form, per keyword or per field, with auto-labeling and auto-assignment
- [ ] 💻 Automatic follow-up when there is no reply after X hours (internal reminder)
- [ ] 💻 Email editor (Markdown or React Email / Vue Email) with preview
- [ ] 💻 Later: AI-suggested replies based on the site's documentation (optional)

---

## Phase 7: comments, likes and reviews

### Comments
- [ ] 💻 One thread per page, nested replies (2 levels), sorting, pagination
- [ ] 💻 Identity: guest (nickname + optional email), GitHub OAuth, or email magic link
- [ ] 💻 **Fully anonymous posting** (comments and likes): no name or email required, auto-generated nickname ("Visitor #a1b2") or optional
  - [ ] 💻 Per-site settings: allow anonymous posting or not, force pre-moderation for anonymous posts, require Turnstile for anonymous posts
  - [ ] 💻 Secret author token stored in `localStorage` to edit or delete one's own anonymous post (limited window)
  - [ ] 💻 Stronger anti-abuse: stricter rate limiting, link and spam detection, blocking by fingerprint (salted IP hash) from the dashboard
  - [ ] 💻 "Anonymous" badge in the UI and in the moderation queue, without exposing IPs or fingerprints to other visitors
- [ ] 💻 Safe Markdown rendering (sanitization), preview
- [ ] 💻 Moderation: pre- or post-moderation, banned words list, moderation queue in the dashboard, reporting
- [ ] 💻 Reply notifications to commenters by email, with unsubscribe
- [ ] 💻 Import from Disqus (XML) and Giscus/Utterances (GitHub Discussions) to ease migration
- [ ] 💻 Optional SEO-friendly rendering: static HTML or JSON endpoint to include at build time (plugins)

### Reactions and likes
- [ ] 💻 "Was this page helpful? 👍 / 👎" with an optional comment (documentation feedback)
- [ ] 💻 Emoji reactions per page, public counter
- [ ] 💻 Cookie-free deduplication (salted, rotating hash of IP + UA + page)
- [ ] 💻 Anonymous likes by default (no account required), can be removed by the same visitor

### Reviews
- [ ] 💻 1 to 5 rating with text, moderated before publication
- [ ] 💻 Public display with `schema.org/Review` and `AggregateRating` structured data
- [ ] 💻 "Wall of love" / testimonials widget

---

## Phase 8: simple analytics

- [ ] 💻 Lightweight collection from the widget: views, opens, submissions, conversion rate
- [ ] 💻 Dashboard: messages per day, time to first reply, time to resolution, volume per site and per form
- [ ] 💻 Most commented and liked pages, "helpful / not helpful" score per docs page
- [ ] 💻 CSV export, configurable retention
- [ ] 💻 Daily aggregates (materialized view or a Vercel Cron job)

---

## Phase 9: framework integrations

- [ ] 💻 Universal HTML snippet (copy-paste), enough for GitHub Pages, GitLab Pages, Netlify and Cloudflare Pages
- [ ] 💻 **Docusaurus**: `@staticdesk/docusaurus-plugin` (swizzle `DocItem/Footer` and floating button)
- [ ] 💻 **MkDocs / Material for MkDocs**: `mkdocs-staticdesk` PyPI package (template override)
- [ ] 💻 **VitePress**: component or theme plugin
- [ ] 💻 **Astro / Starlight**: `@staticdesk/astro` integration
- [ ] 💻 **Jekyll**: `jekyll-staticdesk` gem and `{% include staticdesk.html %}` include
- [ ] 💻 **Hugo**: Hugo module or partial
- [ ] 💻 **Eleventy**: plugin and shortcode
- [ ] 💻 **Nuxt / Nuxt Content**: `@staticdesk/nuxt` module
- [ ] 💻 **Next.js / React**: `@staticdesk/react` components
- [ ] 💻 **Vue**: `@staticdesk/vue` components
- [ ] 💻 Later: Sphinx, GitBook (via script), Ghost, WordPress
- [ ] 💻 One example site per integration (`examples/` folder), tested in CI with Playwright

---

## Phase 10: MVP (v0.1, private beta)

> Goal: ship a first complete end-to-end use case quickly.

- [ ] 💻 Auth, workspace and sites (phase 2)
- [ ] 💻 Contact widget and floating button (phases 3 and 4)
- [ ] 💻 Minimal shared inbox: list, read, reply by email, status (phase 5)
- [ ] 💻 Automatic acknowledgement (phase 6)
- [ ] 💻 HTML snippet and Docusaurus plugin (phase 9)
- [ ] 💻 Self-hosting with `docker compose` (phase 12)
- [ ] 🧑 Dogfooding: install StaticDesk on our own docs and landing page
- [ ] 🧑 Recruit 10 to 20 beta testers (open source maintainers, technical writers)

## v0.2: comments and reactions
- [ ] 💻 Phase 7 (comments, likes, docs feedback)
- [ ] 💻 MkDocs, VitePress and Astro/Starlight plugins

## v0.3: monetization
- [ ] 💻 Phase 11 (Stripe)
- [ ] 💻 Analytics (phase 8)

## v1.0: public launch
- [ ] 💻 Reviews, auto-reply rules, custom sending domain, all phase 9 integrations
- [ ] 🧑 Launch (phase 16)

---

## Phase 11: Stripe billing (SaaS edition)

- [ ] 💻 Stripe Checkout to subscribe and the Customer Portal to manage the subscription
- [ ] 💻 Webhooks: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`, idempotent
- [ ] 💻 Sync the `subscriptions` table, per-plan entitlements (feature flags)
- [ ] 💻 Quotas: monthly counters, alerts at 80% and 100%, graceful degradation (no lost messages: queue rather than reject)
- [ ] 💻 14-day free trial of the Pro plan
- [ ] 💻 Billing code disabled when `NUXT_PUBLIC_EDITION=selfhost`
- [ ] 💻 Tests with the Stripe CLI (`stripe listen`) and test clocks

---

## Phase 12: self-hosting

- [ ] 💻 `Dockerfile` (Nuxt with the `node-server` preset) and `docker-compose.yml` (app + self-hosted Supabase, or Postgres)
- [ ] 💻 Email adapter: Resend or generic SMTP
- [ ] 💻 Migrations applied on startup, admin account created on first launch
- [ ] 💻 Images published to GHCR on every release (multi-arch amd64/arm64)
- [ ] 💻 "Deploy" buttons: Vercel (with the Supabase integration), Railway, Render, Coolify
- [ ] 💻 Documentation: requirements, variables, backups, upgrades, reverse proxy
- [ ] 💻 Anonymous telemetry, **opt-in** only (number of instances), can be disabled

---

## Phase 13: security, compliance and GDPR

- [ ] 💻 Review the RLS policies, cross-workspace access tests
- [ ] 💻 Security headers (dashboard CSP, HSTS), origin validation on the public API
- [ ] 💻 Sanitize all user content (XSS in comments and in the inbox)
- [ ] 💻 Encrypt secrets (webhook keys, tokens), rotate site public keys
- [ ] 💻 Export and delete a visitor's data (right of access and right to be forgotten), workspace deletion
- [ ] 💻 Audit log (admin actions)
- [ ] 🧑 Write the terms of service, privacy policy, DPA (data processing agreement), list of subprocessors (Vercel, Supabase, Resend, Stripe) and cookie policy
- [ ] 🧑 Give customers a GDPR notice template to add under their forms
- [ ] 🧑 Publish `SECURITY.md` and a responsible disclosure program
- [ ] 🧑 Run regular dependency audits (Dependabot, `npm audit`), and possibly a light pentest before v1

---

## Phase 14: documentation

- [ ] 💻 Docs site (`docs.staticdesk.dev`) with **the StaticDesk widget embedded** (dogfooding: "helpful?" feedback and contact)
- [ ] 🧑 2-minute quickstart (HTML snippet)
- [ ] 🧑 One guide per framework (Docusaurus, MkDocs, Jekyll, Hugo, VitePress, Astro, GitHub Pages, GitLab Pages)
- [ ] 🧑 Widget configuration reference (attributes, CSS variables, JS events)
- [ ] 🧑 REST API and webhooks reference (OpenAPI)
- [ ] 🧑 Self-hosting guide
- [ ] 🧑 Migration guides: from Disqus, Giscus, Formspree, Netlify Forms
- [ ] 🧑 Public changelog

---

## Phase 15: SEO

### Technical
- [ ] 💻 Landing page rendered with SSR/prerendering (Nuxt `routeRules` with `prerender`), green Core Web Vitals
- [ ] 💻 `@nuxtjs/seo`: sitemap, robots, meta tags, Open Graph and generated OG images, structured data (`SoftwareApplication`, `FAQPage`, `Organization`)
- [ ] 💻 Canonical URLs, `hreflang` for EN/FR if the landing page is bilingual
- [ ] 🧑 Register the site in Google Search Console and Bing Webmaster Tools, submit the sitemap

### Content (target keywords)
- [ ] 🧑 Keyword research: "contact form github pages", "comments for static site", "disqus alternative", "docusaurus comments", "mkdocs feedback widget", "jekyll contact form", "formspree alternative"
- [ ] 🧑 Integration pages (one per framework): `/integrations/docusaurus`, etc.
- [ ] 🧑 Comparison pages: StaticDesk vs Disqus, Giscus, Utterances, Formspree, Netlify Forms, Crisp, Intercom, Commento, Cusdis, Remark42
- [ ] 🧑 "Alternative to" pages: `/alternatives/disqus`, `/alternatives/formspree`
- [ ] 🧑 Blog tutorials: "Add a contact form to GitHub Pages without a backend", "Add comments to Docusaurus", "Collect feedback on your MkDocs documentation"
- [ ] 🧑 Free tools that attract traffic: HTML form snippet generator, deliverability tester, etc.

### Link building
- [ ] 🧑 "Powered by StaticDesk" link in the free plan's widget
- [ ] 🧑 Submit to "awesome" lists: awesome-static-website-services, awesome-docusaurus, awesome-mkdocs, awesome-jekyll, awesome-selfhosted
- [ ] 🧑 List in directories: AlternativeTo, SaaSHub, Product Hunt, OpenAlternative, BetaList, There's An AI For That (if an AI feature exists)
- [ ] 🧑 Official plugin pages: Docusaurus community plugins, MkDocs catalog, Astro integrations, Jekyll plugins, Hugo themes/modules

---

## Phase 16: marketing and launch

### Pre-launch
- [ ] 💻 Landing page: hero, live interactive widget demo, features, integrations, pricing, FAQ, comparison, "Start free" and "Self-host" CTAs
- [ ] 💻 Waitlist (Resend Audiences) with a confirmation email
- [ ] 🧑 Visual identity: logo, palette, screenshots, 60-second demo video
- [ ] 🧑 Build in public: regular posts on X, Bluesky, Mastodon and LinkedIn (progress, numbers, technical choices)
- [ ] 🧑 Create a Discord or use GitHub Discussions as the community space
- [ ] 🧑 Reach out directly to maintainers of open source projects with Docusaurus or MkDocs docs (free plan for open source)

### Launch
- [ ] 🧑 v1.0 release on GitHub with polished release notes
- [ ] 🧑 Show HN (Hacker News)
- [ ] 🧑 Product Hunt (prepare visuals, video and the first comment, and notify the community)
- [ ] 🧑 Reddit: r/selfhosted, r/webdev, r/opensource, r/jekyll, r/docusaurus, r/SideProject
- [ ] 🧑 dev.to, Hashnode, Medium: "How I built…" article
- [ ] 🧑 Newsletters: Console.dev, JavaScript Weekly, Vue.js Developers, Nuxt newsletter, selfh.st
- [ ] 🧑 French-speaking communities: Journal du Hacker, LinuxFr, French dev Discord/Slack groups

### Growth
- [ ] 🧑 Free "Open Source" plan (Pro offered to OSS projects), a lever for adoption and backlinks
- [ ] 🧑 Affiliate program (Stripe or Rewardful)
- [ ] 🧑 Customer case studies, logos on the landing page
- [ ] 🧑 GitHub Sponsors and Open Collective for the self-hosted edition
- [ ] 🧑 Lifecycle emails (Resend): welcome, installation help if no event is received after 48 h, trial ending, quota exceeded
- [ ] 🧑 Track KPIs: sign-ups, active sites (at least 1 event per week), Free → Pro conversion, churn, MRR, GitHub stars

---

## Phase 17: after the launch

- [ ] 💻 Public roadmap with voting (dogfooding: StaticDesk reactions widget)
- [ ] 💻 Public API and API keys for third-party integrations
- [ ] 💻 Integrations: Slack (reply from Slack), Discord, Zapier, Make, n8n
- [ ] 💻 Knowledge base / FAQ inside the widget (search the docs before sending)
- [ ] 💻 Embeddable surveys and NPS
- [ ] 💻 Optional AI assistant (reply suggestions, classification, summaries)
- [ ] 💻 Mobile apps or a PWA for the inbox
- [ ] 🧑 Quarterly roadmap review based on user feedback
