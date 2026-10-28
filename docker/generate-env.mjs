#!/usr/bin/env node
// Prints a .env for docker-compose.yml with fresh secrets and Supabase API keys:
//   node generate-env.mjs > .env
// Then set SITE_URL, MAIL_FROM and the SMTP_* values. No dependencies needed.
import { createHmac, randomBytes } from 'node:crypto'

const secret = (bytes = 32) => randomBytes(bytes).toString('base64url')
const base64url = value => Buffer.from(JSON.stringify(value)).toString('base64url')

/** HS256 JWT for a Supabase API key (anon or service_role), valid for 10 years. */
function apiKey(role, jwtSecret) {
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ role, iss: 'supabase', iat: now, exp: now + 10 * 365 * 24 * 3600 })}`
  return `${unsigned}.${createHmac('sha256', jwtSecret).update(unsigned).digest('base64url')}`
}

const jwtSecret = secret(48)

process.stdout.write(`# StaticDesk self-hosting: generated ${new Date().toISOString()}. Keep this file secret.

# Public URL of StaticDesk. https://… gets a certificate automatically (ports 80
# and 443 must be reachable). Use http://localhost to try it on your machine.
SITE_URL=http://localhost
HTTP_PORT=80
HTTPS_PORT=443

# Email: the sign-in links (Supabase Auth) and StaticDesk's notifications.
# With --profile local, Mailpit catches everything at http://localhost:8025.
MAIL_FROM="StaticDesk <staticdesk@example.com>"
SMTP_ADMIN_EMAIL=staticdesk@example.com
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_SENDER_NAME=StaticDesk

# Set to true once your team has signed up, to refuse new accounts.
# Invited members then need an account created by an admin.
DISABLE_SIGNUP=false

# Optional: GitHub and Google sign-in (callback URL: <SITE_URL>/auth/v1/callback).
# List the enabled ones in AUTH_PROVIDERS, e.g. github,google.
AUTH_PROVIDERS=
GITHUB_ENABLED=false
GITHUB_CLIENT_ID=
GITHUB_SECRET=
GOOGLE_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_SECRET=

# Optional: Cloudflare Turnstile for sites that require a challenge.
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Secrets (generated). Changing JWT_SECRET requires new ANON_KEY and SERVICE_ROLE_KEY.
POSTGRES_PASSWORD=${secret(24)}
JWT_SECRET=${jwtSecret}
ANON_KEY=${apiKey('anon', jwtSecret)}
SERVICE_ROLE_KEY=${apiKey('service_role', jwtSecret)}
REALTIME_DB_ENC_KEY=${randomBytes(8).toString('hex')}
REALTIME_SECRET_KEY_BASE=${secret(48)}
CRON_SECRET=${secret()}
FINGERPRINT_SECRET=${secret()}
MAIL_REPLY_SECRET=${secret()}
`)
