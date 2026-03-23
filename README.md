# Parent Consultation Portal

Parent consultation booking portal built with Next.js, Prisma, and Supabase Postgres.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Prisma
- Supabase Postgres
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

- `DATABASE_URL`
- `DIRECT_URL`
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
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Supabase Migration Workflow

Prisma schema lives in `prisma/schema.prisma`.

Supabase migration files live in `supabase/migrations`.

This repository now includes the initial Supabase migration:

- `supabase/migrations/20260323160000_init.sql`

To link a Supabase project:

```bash
npx supabase login --token <SUPABASE_ACCESS_TOKEN>
npx supabase link --project-ref <SUPABASE_PROJECT_REF> --password <SUPABASE_DB_PASSWORD>
```

To push pending Supabase migrations:

```bash
npx supabase db push --linked
```

To seed data with Prisma:

```bash
npm run db:seed
```

## Vercel Deployment

Set the same environment variables from `.env.example` in the Vercel project settings.

Important for Supabase + Prisma on Vercel:

- `DATABASE_URL` should use the Supabase transaction pooler / Supavisor connection string.
- `DIRECT_URL` should use the direct database connection string for Prisma CLI workflows.

Important notes:

- `postinstall` runs `prisma generate` automatically during install.
- Production database changes should be applied with Supabase migrations before or during deployment.
- Seed data is not part of Vercel build. Run `npm run db:seed` manually only when you want sample data in the remote database.
- If Vercel shows intermittent server errors or the app feels slow, check that `DATABASE_URL` is not pointing at the direct `db.<project-ref>.supabase.co:5432` host.

## Sample Teacher Accounts

- Grade 6 Class 1: `teacher6101`
- Grade 5 Class 2: `teacher5202`
- Grade 4 Class 3: `teacher4303`

## Verification

```bash
npm run build
npm run lint
```
