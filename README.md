# FormDesk backend foundation

This repository contains the FormDesk Nuxt backend foundation with Drizzle ORM and Neon PostgreSQL.

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
