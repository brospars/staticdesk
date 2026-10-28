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

Requirements: Node.js 22+, npm 10, Docker (for local Supabase).

```bash
npm install
npm run db:start     # local Supabase (Postgres, Auth, Studio…) via Docker
npm run db:reset     # re-apply migrations and seed
npm run db:types     # regenerate database types into packages/core
npm run db:test      # pgTAP tests (row level security)
npm run dev          # start the web app on http://localhost:3000
npm run lint
npm run typecheck
npm test             # unit tests in every package
npm run build

# end-to-end tests (after `npm run build`)
npm run test:e2e -w @staticdesk/web
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: see [SECURITY.md](SECURITY.md).

## License

[AGPL-3.0](LICENSE)
