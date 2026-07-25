# RentTrack — Property Tenant & Payment Management PWA

A lightweight, mobile-first Progressive Web App for managing tenants, leases,
documents, and monthly rent payments.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + hand-rolled shadcn/ui-style components (no external UI runtime deps)
- PostgreSQL + Prisma ORM
- File uploads to local disk or Supabase Storage (env-toggle, one `lib/storage.ts` abstraction)
- Installable PWA: manifest.json + a hand-written service worker (no framework dependency)

## Features

- **Dashboard** — active tenants, rent collected this month, pending payments, overdue alerts.
- **Tenant management** — add/edit/delete, lease dates, upload tenant ID and lease/TnC documents.
- **Monthly payment tracker** — month-by-month view of every active tenant's rent status
  (Paid / Pending / Overdue), with payment date, method, and receipt upload. Pending rows
  for the active month are generated automatically; anything left unpaid after its month
  ends flips to Overdue automatically.
- **Bottom tab navigation** for mobile, add-to-home-screen on iOS and Android.

## Getting started locally

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL
npx prisma migrate dev --name init
npm run seed               # optional: adds 3 sample tenants + payment history
npm run dev
```

Open http://localhost:3000. Add to your phone's home screen (Safari: Share → Add to
Home Screen; Chrome: menu → Install app) to try it as a PWA.

## File storage

Set `STORAGE_PROVIDER` in `.env`:

- `local` (default) — files saved under `public/uploads/<tenantId>/…`. Simplest option
  for a single-server deployment, but the filesystem is **not** persistent on most
  container platforms (including Railway) across redeploys — use `supabase` for anything
  beyond a demo.
- `supabase` — uploads go to a Supabase Storage bucket. Set `NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` (create the bucket and make
  it public, or adapt `lib/storage.ts` to sign URLs instead).

## Database

Prisma models (`prisma/schema.prisma`): `Tenant`, `Document`, `Payment`. Payments are
unique per `(tenantId, month)`, where `month` is always normalized to the 1st of the
billing month — see `lib/payments.ts` for the helpers that auto-create pending rows and
flip stale pending rows to overdue.

## Deploying to Railway

1. Push this repo to GitHub and create a new Railway project from it (Railway
   auto-detects the `Dockerfile`, or use `railway.json` which points at it explicitly).
2. Add a PostgreSQL plugin in Railway and copy its connection string into the service's
   `DATABASE_URL` variable.
3. Set `STORAGE_PROVIDER=supabase` plus the Supabase env vars (recommended — Railway's
   container filesystem is ephemeral, so local uploads won't survive a redeploy).
4. After the first deploy, run migrations against the Railway database:
   `npx prisma migrate deploy` (via Railway's shell, or a one-off deploy step).
5. Railway sets `PORT` automatically; the Dockerfile's `CMD` already respects it.

The Dockerfile builds a `next build` standalone output, so the runtime image only ships
`node_modules/.prisma` + the compiled server — no dev dependencies in production.

## Project structure

```
src/app/                 App Router pages + API routes
src/app/api/             REST endpoints (tenants, payments, upload, dashboard)
src/components/          UI primitives (button, card, dialog, ...) + feature components
src/lib/                 prisma client, storage abstraction, payment helpers, utils
prisma/schema.prisma     Tenant / Document / Payment models
public/manifest.json     PWA manifest
public/sw.js             Service worker (network-first pages, cache-first static assets)
Dockerfile               Multi-stage build for Railway / any Docker host
```

## Notes

- Data validation uses `zod` on every write endpoint.
- Uploads are limited to 10MB and JPG/PNG/WEBP/HEIC/PDF.
- All read endpoints are marked `export const dynamic = "force-dynamic"` so Next.js
  never tries to prerender them at build time against a database that isn't reachable
  during the build step.
