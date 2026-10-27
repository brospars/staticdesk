# StaticDesk

Embeddable contact forms, comments, likes and reviews for static sites
(GitHub Pages, GitLab Pages, MkDocs, Docusaurus, Jekyll, Hugo, VitePress, Astro…),
with a shared inbox, auto-replies and simple analytics.
Think Disqus + Crisp/Intercom, without the live chat.

Open source and free to self-host, or use the hosted SaaS.

> **Status:** early development. See the [roadmap](ROADMAP.md) (in French).

## Stack

Nuxt 4 · Nuxt UI 4 · Supabase · Resend · Stripe · Vercel

## Repository layout

| Path | Description |
| --- | --- |
| `apps/web` | Nuxt app: landing page, dashboard and API |
| `packages/core` | Shared Zod schemas and types |
| `packages/widget` | Browser SDK (`widget.js`), Shadow DOM web components |

## Development

Requirements: Node.js 22+, pnpm 10 (`corepack enable`), Docker (for local Supabase).

```bash
pnpm install
pnpm db:start     # local Supabase (Postgres, Auth, Studio…) via Docker
pnpm db:reset     # re-apply migrations and seed
pnpm db:types     # regenerate database types into packages/core
pnpm dev          # start the web app on http://localhost:3000
pnpm lint
pnpm typecheck
pnpm test         # unit tests in every package
pnpm build

# end-to-end tests (after `pnpm build`)
pnpm --filter @staticdesk/web test:e2e
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: see [SECURITY.md](SECURITY.md).

## License

[AGPL-3.0](LICENSE)
