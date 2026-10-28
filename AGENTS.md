# StaticDesk: notes for coding agents

Embeddable forms, comments, likes and reviews for static sites, with a shared
inbox. Open source (AGPL-3.0), self-hostable, and offered as a SaaS.
Product plan: `ROADMAP.md`. Write all code, docs, comments and commit messages in English.

## Stack

- **Nuxt 4** (`app/` directory structure) and **Nuxt UI 4** (Tailwind CSS 4, imported
  in `apps/web/app/assets/css/main.css`). Wrap pages in `<UApp>`.
- **Supabase** (Postgres, Auth, Realtime, Storage), **Resend** (email),
  **Stripe** (billing, SaaS edition only), deployed on **Vercel**.
- npm workspaces + Turborepo, TypeScript 6 strict, Zod 4. Use npm, not pnpm or yarn.

Check the docs for these exact versions when unsure: APIs differ from older
Nuxt 3 / Nuxt UI 2-3 / Tailwind 3 / Zod 3 examples.

## Layout

- `apps/web`: Nuxt app (landing, dashboard, API in `server/`)
- `packages/core`: Zod schemas and types shared by the API and the widget
- `packages/widget`: browser SDK, built as an IIFE `widget.js` (15 kB gzip budget)
- `packages/integrations/docusaurus`: `@staticdesk/docusaurus-plugin` (no runtime dependencies, compiled with tsc to `lib/`)
- `docker/`: self-hosting with Docker Compose (`Dockerfile` at the root); guide in `docs/self-hosting.md`

## Commands (from the repo root)

- `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`
- Run a script in one workspace: `npm run <script> -w @staticdesk/web`
- E2E: `npm run build && npm run test:e2e -w @staticdesk/web`
  (set `PLAYWRIGHT_CHROMIUM_PATH` to use a preinstalled Chromium)

## Conventions

- ESLint with Nuxt stylistic rules: 2 spaces, single quotes, no semicolons.
  Run `npm run lint:fix -w @staticdesk/web` (or `npx eslint . --fix` in a package).
- Validate every external input with a Zod schema from `@staticdesk/core`.
- The Supabase service-role key is server-only. Never expose it to the client or the widget.
- Every table has Row Level Security enabled, with policies and pgTAP tests
  (`supabase/tests/database`). Some tables use column-level grants (e.g. visitor
  fingerprints and edit tokens are hidden): select explicit columns, not `*`.
- Public widget traffic never queries tables directly: it goes through the Nuxt
  server API (`apps/web/server/api/v1/public`), which validates input and uses
  the service-role client. `server/middleware/public-api.ts` resolves the site
  and enforces its allowed origins; use `usePublicSite(event)` in those routes.
- Never store visitor IPs: use `visitorFingerprint()` (daily per-site HMAC) for
  rate limiting and deduplication.
- Validate database ids with `z.guid()`, not `z.uuid()` (Postgres accepts ids
  that are not RFC 4122, like the seed's).
- The widget (`packages/widget`) has no runtime dependencies and only imports
  types from `@staticdesk/core`. Keep it under the 15 kB gzip budget, render
  in the shadow root, never use innerHTML with visitor or site data (use `h()`),
  and add every visible string to `src/i18n.ts` in English and French.
- Regenerate `packages/core/src/database.types.ts` with `npm run db:types` after a migration.
- Billing code must be inert when `NUXT_PUBLIC_EDITION=selfhost` (`useRuntimeConfig().public.edition`).
- Conventional Commits. Add a changeset when a published package changes.

## Where things are

- Env vars: `apps/web/.env.example` (runtime config keys in `apps/web/nuxt.config.ts`).
- Migrations: `supabase/migrations`; seed (dev user `dev@staticdesk.local` / `password`,
  site key `pk_demo000000000000000000`): `supabase/seed.sql`.
- Dashboard pages: `apps/web/app/pages/app/*` (inbox, onboarding, sites, widgets/[id] for the
  contact form editor, settings/*); current workspace via `useWorkspaces()`. They use the
  `dashboard` layout (sidebar); pages that lay out their own `UDashboardPanel`s set
  `panels: true` in `definePageMeta` (see `pages/app/inbox.vue`).
- Shared inbox: `pages/app/inbox.vue` (list, filters through `search_threads()`) and
  `inbox/[id].vue` (conversation; `components/inbox/*`). Notes are inserted by the client;
  replies go through `server/api/threads/[id]/reply.post.ts`, which emails the visitor with a
  signed Reply-To (`server/utils/inbox/addresses.ts`). Visitor replies, bounces and complaints
  arrive at `server/api/inbound/resend.post.ts`. Members are notified per
  `notification_preferences` (`workspace_notification_emails(ws, kind, thread)`).
- Realtime: the dashboard subscribes to `threads` and `messages` changes (RLS applies) and uses
  presence on the private channel `inbox:<workspace id>` (`useInboxPresence()`).
- Contact submissions: `submitContactMessage()` in `apps/web/server/utils/contact/submit.ts`,
  shared by the widget API and the plain HTML form endpoint (`server/routes/f/[id].post.ts`).
  It sends the team email and webhooks (`server/utils/webhooks.ts`) after the response
  with `event.waitUntil()`.
- Auto-replies: rules in `auto_replies` (dashboard: `pages/app/settings/auto-replies.vue`, `components/automation/*`),
  opening hours and `follow_up_hours` on `workspaces`. Schemas, `planAutomation()` and `isWithinOpeningHours()` are in
  `packages/core/src/schemas/automation.ts`. `runAutomation()` (`server/utils/automation/auto-replies.ts`) runs after each
  contact submission: labels, assigns, and queues one `auto_reply_deliveries` row per thread, sent right away or by
  `server/api/cron/automation.get.ts` (claimed with `claim_auto_reply_deliveries()`), which also sends follow-up reminders
  (`claim_follow_up_reminders()`). Auto-replies are outbound messages without an author, flagged with `metadata.autoReply`.
- Markdown in emails: `renderMarkdown()` in `packages/core/src/utils/markdown.ts` (escapes everything; variables
  are inserted as text through its `variable` option, never parsed).
- Contact form configuration (`widgets.config`): `contactWidgetConfigSchema` in
  `packages/core/src/schemas/widget-config.ts`; custom fields in `schemas/contact-form.ts`.
- Email: `useMailer()` in `apps/web/server/utils/mailer.ts` (`log`, `resend` or `smtp` driver;
  `useResend()` for other Resend APIs); templates in `apps/web/server/emails`.
- Scheduled jobs: `server/api/cron/*`, listed once in `apps/web/shared/cron-jobs.ts` (Vercel Crons in
  `nuxt.config.ts`, and `server/plugins/scheduler.ts` with `NUXT_SCHEDULER=internal`), protected by a bearer `CRON_SECRET`.
- Attachments: `attachments` table and private `attachments` bucket. The widget asks
  `POST /api/v1/public/sites/:key/attachments` for a signed upload URL, PUTs the file to storage, then sends the ids
  with the submission; plain HTML forms post files (`server/utils/contact/attachments.ts`). `submit_contact()` links
  them (rejects files not uploaded, stale or from another site). Members download through signed URLs (storage RLS).
  Limits and types: `packages/core/src/schemas/attachments.ts` (keep the bucket's `allowed_mime_types` in sync).
- Self-hosting: `docker/docker-compose.yml` (Caddy serves the app and the Supabase APIs on one origin, `migrate`
  applies `supabase/migrations` as `postgres`). The app reaches Supabase through `NUXT_SUPABASE_INTERNAL_URL`
  (`server/plugins/supabase-internal-url.ts` rewrites server-side fetches). Secrets: `docker/generate-env.mjs`.
- Widget elements: `packages/widget/src/elements/*` (extend `StaticDeskElement`).
- Release: Changesets + `.github/workflows/release.yml` (needs the `NPM_TOKEN` secret).

## Known pitfalls

- `@nuxtjs/supabase` imports `h3` without declaring it: the root `package.json` pins
  `h3` v1 so it is the hoisted copy (h3 v2 breaks SSR on Nuxt 4).
- `#supabase/database` is aliased in `nuxt.config.ts` so server routes keep their
  database types when typechecked from the app (typed `$fetch`).
- Postgres function arguments without a default are generated as required non-null
  strings: give optional parameters `default null`.
- Type generation needs `sslmode=disable` on the local URL (see `npm run db:types`).
- Playwright: a page on a public origin loading from localhost needs
  `permissions: ['local-network-access']` (see `apps/web/test/e2e/widget.spec.ts`).
- Server unit tests (`apps/web/test/unit`) run without Nuxt: `#supabase/server` is
  aliased to a stub, and Nitro auto-imports are only available inside functions.
- PostgREST upserts update every column of the payload: with column-level update grants,
  update or insert explicitly instead (see `pages/app/settings/notifications.vue`).
- Docusaurus `injectHtmlTags` needs `customElement: true` for tags like `<staticdesk-contact>`.
- Supabase Auth sends at most one magic link per minute to an address: wait before retrying in E2E scripts.
- Self-hosted Supabase services do not answer CORS preflights: the gateway (Caddy) does, like Supabase's own.
- Docker Hub may rate-limit pulls (429): `mirror.gcr.io/<image>` mirrors it (then `docker tag` to the usual name).
- Sandboxed environments may not pull every Supabase Docker image. The Postgres image
  alone (`public.ecr.aws/supabase/postgres`) runs migrations and pgTAP tests: apply
  `supabase/migrations/*.sql` then each file in `supabase/tests/database` with `psql`.
