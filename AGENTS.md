# StaticDesk: notes for coding agents

Embeddable forms, comments, likes and reviews for static sites, with a shared
inbox. Open source (AGPL-3.0), self-hostable, and offered as a SaaS.
Product plan: `ROADMAP.md` (French).

## Stack

- **Nuxt 4** (`app/` directory structure) and **Nuxt UI 4** (Tailwind CSS 4, imported
  in `apps/web/app/assets/css/main.css`). Wrap pages in `<UApp>`.
- **Supabase** (Postgres, Auth, Realtime, Storage), **Resend** (email),
  **Stripe** (billing, SaaS edition only), deployed on **Vercel**.
- pnpm workspaces + Turborepo, TypeScript 6 strict, Zod 4.

Check the docs for these exact versions when unsure: APIs differ from older
Nuxt 3 / Nuxt UI 2-3 / Tailwind 3 / Zod 3 examples.

## Layout

- `apps/web`: Nuxt app (landing, dashboard, API in `server/`)
- `packages/core`: Zod schemas and types shared by the API and the widget
- `packages/widget`: browser SDK, built as an IIFE `widget.js` (15 kB gzip budget)
- `packages/integrations/*`: framework plugins (to come)

## Commands (from the repo root)

- `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`
- E2E: `pnpm build && pnpm --filter @staticdesk/web test:e2e`
  (set `PLAYWRIGHT_CHROMIUM_PATH` to use a preinstalled Chromium)

## Conventions

- ESLint with Nuxt stylistic rules: 2 spaces, single quotes, no semicolons.
  Run `pnpm lint --fix` (or `eslint . --fix` in a package).
- Validate every external input with a Zod schema from `@staticdesk/core`.
- The Supabase service-role key is server-only. Never expose it to the client or the widget.
- Every table has Row Level Security enabled, with policies and pgTAP tests
  (`supabase/tests/database`). Some tables use column-level grants (e.g. visitor
  fingerprints and edit tokens are hidden): select explicit columns, not `*`.
- Public widget traffic never queries tables directly: it goes through the Nuxt
  server API, which validates input and uses the service-role client.
- Regenerate `packages/core/src/database.types.ts` with `pnpm db:types` after a migration.
- Billing code must be inert when `STATICDESK_EDITION=selfhost`.
- Conventional Commits. Add a changeset when a published package changes.
