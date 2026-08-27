# Carrot

Personal finance management app. Next.js (App Router), backed by Supabase, with server logic
(Mono Connect, categorization, subscriptions, health score) as Route Handlers under
`apps/web/src/app/api/`.

## Structure

- `apps/web` — Next.js (App Router, TypeScript)
  - `src/app/api/` — Route Handlers (bank linking/sync, categorization corrections, subscriptions,
    financial health score) — run as Vercel serverless functions in production
  - `src/server/` — server-only logic those routes call into (Supabase service-role client, Mono
    API client, categorization engine, subscription detection, health score)
  - `src/components/kobo/`, `src/lib/kobo/` — the app UI and client-side state

## Setup

1. Create a Supabase project at https://supabase.com.
2. Copy the env file and fill in your Supabase + Mono keys:
   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   ```
3. Install dependencies from the repo root:
   ```bash
   npm install
   ```

## Development

```bash
npm run dev:web   # http://localhost:3000
```

## Deploying (Vercel)

Set the Vercel project's Root Directory to `apps/web`. Set these environment variables in the
Vercel project settings (not committed anywhere — see `apps/web/.env.local.example` for the
client-side ones):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MONO_PUBLIC_KEY`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MONO_SECRET_KEY` (server-only — no `NEXT_PUBLIC_`
  prefix, never exposed to the browser)
