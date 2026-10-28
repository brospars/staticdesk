# StaticDesk

Embeddable contact forms, comments, likes and reviews for static sites
(GitHub Pages, GitLab Pages, MkDocs, Docusaurus, Jekyll, Hugo, VitePress, Astro…),
with a shared inbox, auto-replies and simple analytics.
Think Disqus + Crisp/Intercom, without the live chat.

Open source and free to self-host, or use the hosted SaaS.

> **Status:** early development. See the [roadmap](ROADMAP.md).

## Embedding

```html
<script src="https://staticdesk.app/widget.js" data-site="pk_your_site_key" defer></script>
<staticdesk-contact mode="floating"></staticdesk-contact>
```

See [packages/widget](packages/widget/README.md) for attributes and styling.

Without JavaScript, post a plain HTML form to the contact form's endpoint (the
dashboard generates the markup, including custom fields):

```html
<form action="https://staticdesk.app/f/<contact form id>" method="POST">
  <input name="email" type="email" required>
  <textarea name="message" required></textarea>
  <input name="_honeypot" style="display:none" tabindex="-1" autocomplete="off">
  <button type="submit">Send</button>
</form>
```

To accept attachments (enable them on the form), post the form as
`enctype="multipart/form-data"` with `<input type="file" name="attachments" multiple>`.

Optional inputs: `_redirect` (a page on one of the site's allowed origins to
open after sending). If the site requires Cloudflare Turnstile, add the Turnstile
widget inside the form: its `cf-turnstile-response` input is verified. Send
`Accept: application/json` to get JSON responses.

### Webhooks

Each new contact message can be sent to Slack, Discord or a custom HTTPS URL
(site page in the dashboard). Custom endpoints receive a `contact.submitted` JSON
body with these headers:

- `StaticDesk-Event`: `contact.submitted`
- `StaticDesk-Delivery`: unique delivery id (also the body's `id`)
- `StaticDesk-Signature`: `t=<unix seconds>,v1=<signature>`, where the signature
  is the hex HMAC-SHA256 of `<t>.<raw body>` with the webhook's signing secret.
  Compare it in constant time and reject old timestamps.

## Self-hosting

Run StaticDesk on your own server with Docker Compose (the app, Supabase and
Caddy with automatic HTTPS):

```sh
cd docker
node generate-env.mjs > .env   # then set SITE_URL and the SMTP settings
docker compose up -d --build
```

See the [self-hosting guide](docs/self-hosting.md).

## Integrations

- Any static site: the HTML snippet above.
- Docusaurus: [`@staticdesk/docusaurus-plugin`](packages/integrations/docusaurus/README.md).

## Stack

Nuxt 4 · Nuxt UI 4 · Supabase · Resend · Stripe · Vercel

## Repository layout

| Path | Description |
| --- | --- |
| `apps/web` | Nuxt app: landing page, dashboard and API |
| `packages/core` | Shared Zod schemas and types |
| `packages/widget` | Browser SDK (`widget.js`), Shadow DOM web components |
| `packages/integrations/docusaurus` | Docusaurus plugin |
| `docker` | Docker Compose setup for self-hosting (`Dockerfile` at the root) |

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
