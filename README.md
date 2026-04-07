# FormDesk

This repository contains the complete FormDesk foundation built with Nuxt 4,
Nuxt UI v4, Tailwind CSS v4, Drizzle ORM, and Neon PostgreSQL.

Included in this codebase:

- Marketing landing page in [`app/app.vue`](app/app.vue)
- Database schema and migration for workspaces, forms, submissions, and users
- Submission API with CORS support in `server/api/submit/[formId].post.ts`
- Embeddable Shadow DOM widget in `public/widget.js`

## Local development

Install dependencies:

```bash
npm install
```

Run the Nuxt app:

```bash
npm run dev
```

## Database

Generate and apply migrations:

```bash
npm run db:generate
npm run db:migrate
```

## Submission API

Send a JSON `POST` request to `/api/submit/:formId`:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "message": "Hello from FormDesk"
}
```
