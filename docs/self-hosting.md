# Self-hosting StaticDesk

StaticDesk runs on your own server with Docker Compose: the app, the Supabase
services it needs (Postgres, Auth, PostgREST, Realtime, Storage) and Caddy,
which serves everything on one origin with automatic HTTPS.

## Requirements

- A Linux server with Docker and the Compose plugin, 2 GB of RAM or more.
- A domain name pointing to the server, with ports 80 and 443 open (Let's Encrypt).
- An SMTP server for sign-in links and notifications (your provider, Amazon SES,
  Postmark, Resend's SMTP…).
- Node.js 22+ only to generate the secrets (or run the script in a container).

## Install

```sh
git clone https://github.com/brospars/staticdesk.git
cd staticdesk/docker
node generate-env.mjs > .env
```

Edit `.env`:

- `SITE_URL`: the public URL, e.g. `https://desk.example.com`.
- `MAIL_FROM`, `SMTP_ADMIN_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASS` (`SMTP_SECURE=true` for port 465).

Then start it:

```sh
docker compose up -d --build
```

The first start builds the app image, initializes the database and applies the
migrations. Open `SITE_URL`, sign in with your email (a magic link is sent) and
follow the onboarding to create your workspace and first site.

### Try it on your machine

Keep `SITE_URL=http://localhost` and the default SMTP settings, and add the
`local` profile: [Mailpit](https://mailpit.axllent.org) catches every email at
http://localhost:8025.

```sh
docker compose --profile local up -d --build
```

## What runs

| Service | Role |
| --- | --- |
| `gateway` | Caddy: HTTPS, the app on `/`, the Supabase APIs on `/auth/v1`, `/rest/v1`, `/storage/v1`, `/realtime/v1`. |
| `app` | StaticDesk (dashboard, public API, `widget.js`). Runs the scheduled jobs itself (`NUXT_SCHEDULER=internal`). |
| `migrate` | Applies `supabase/migrations` on each start, then exits. |
| `db` | Postgres 17 (Supabase image). Data in the `db-data` volume. |
| `auth`, `rest`, `realtime`, `storage` | Supabase Auth, PostgREST, Realtime and Storage. Files in the `storage-data` volume. |
| `mailpit` | Only with `--profile local`. |

The Supabase Studio is not included. To inspect the database, use
`docker compose exec db psql -U postgres`.

## Configuration

Everything is set in `docker/.env`; `docker-compose.yml` passes it to the
services. Besides `SITE_URL` and SMTP:

| Variable | Description |
| --- | --- |
| `DISABLE_SIGNUP` | `true` refuses new accounts once your team has signed up. Invited members then cannot create their account: leave it `false` while inviting. |
| `AUTH_PROVIDERS`, `GITHUB_*`, `GOOGLE_*` | GitHub and Google sign-in. The OAuth callback URL is `<SITE_URL>/auth/v1/callback`. |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile, for sites that require a challenge. |
| `MAIL_DRIVER=resend`, `RESEND_API_KEY` | Send StaticDesk emails with Resend instead of SMTP. With `MAIL_INBOUND_DOMAIN` and `RESEND_WEBHOOK_SECRET`, visitors can reply to emails and their replies land in the inbox (see the main README). Sign-in emails always use SMTP. |
| `HTTP_PORT`, `HTTPS_PORT` | Published ports of Caddy. |
| `STATICDESK_IMAGE` | Image of the app, when you do not build it from source. |

Without Resend inbound, replies from the inbox are sent with your team member's
address as Reply-To, so the visitor's answers reach their mailbox directly.

## Upgrades

```sh
git pull
docker compose up -d --build
```

New migrations are applied by the `migrate` service before the app starts.

## Backups

Back up the two volumes that hold data:

```sh
docker compose exec db pg_dump -U postgres -Fc postgres > staticdesk-$(date +%F).dump
docker run --rm -v staticdesk_storage-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/staticdesk-files-$(date +%F).tar.gz -C /data .
```

Keep `.env` too: without `JWT_SECRET` and the keys, existing sessions and API
keys stop working.

## Behind your own reverse proxy

To use an existing proxy (nginx, Traefik…) for HTTPS, keep `SITE_URL` as the
public HTTPS URL, replace `{$SITE_URL}` with `:80` in `Caddyfile`, publish Caddy
on a local port (`HTTP_PORT=127.0.0.1:8080`) and forward all traffic for the
domain to it, including WebSocket upgrades on `/realtime/v1/`.

## Without Docker

The app is a regular Node server: `NITRO_PRESET=node-server npm run build`, then
`node apps/web/.output/server/index.mjs`. Point it to a Supabase project (hosted
or self-hosted) with the variables of `apps/web/.env.example`, apply the
migrations with `supabase db push`, and either run the scheduled jobs with
`NUXT_SCHEDULER=internal` or call `/api/cron/*` with your own scheduler
(`Authorization: Bearer <NUXT_CRON_SECRET>`, schedules in `apps/web/shared/cron-jobs.ts`).
