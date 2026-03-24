# Parent Consultation Portal

Parent consultation booking portal built with Next.js and Supabase.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase
- React Hook Form
- Zod

## Routes

- `/` landing page
- `/auth` parent and teacher sign-in
- `/reserve` parent reservation flow
- `/dashboard` parent dashboard
- `/teacher/dashboard` teacher dashboard

## Environment Variables

Copy `.env.example` to `.env` and set these values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ACCESS_TOKEN`
- `SESSION_SECRET`

## Local Development

```bash
npm install
npx supabase login --token <SUPABASE_ACCESS_TOKEN>
npx supabase link --project-ref <SUPABASE_PROJECT_REF> --password <SUPABASE_DB_PASSWORD>
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Supabase Migration Workflow

Supabase migration files live in `supabase/migrations`.

This repository now includes the initial Supabase migration:

- `supabase/migrations/20260323160000_init.sql`

To push pending Supabase migrations:

```bash
npx supabase db push --linked
```

To seed data with Supabase service-role access:

```bash
npm run db:seed
```

## Vercel Deployment

Set the same environment variables from `.env.example` in the Vercel project settings.

Important for Vercel deployment:

- This app now uses Supabase-only server access via `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

Important notes:

- Production database changes should be applied with Supabase migrations before or during deployment.
- Seed data is not part of Vercel build. Run `npm run db:seed` manually only when you want sample data in the remote database.

## Verification

```bash
npm run build
npm run lint
```
