# Carrot

Personal finance management app. Monorepo with a Next.js frontend and an Express API, backed by Supabase.

## Structure

- `apps/web` — Next.js (App Router, TypeScript, Tailwind)
- `apps/api` — Express (TypeScript), talks to Supabase with the service role key

## Setup

1. Create a Supabase project at https://supabase.com.
2. Copy env files and fill in your Supabase keys:
   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env
   ```
3. Install dependencies from the repo root:
   ```bash
   npm install
   ```

## Development

Run both apps in separate terminals:

```bash
npm run dev:web   # http://localhost:3000
npm run dev:api   # http://localhost:4000
```
