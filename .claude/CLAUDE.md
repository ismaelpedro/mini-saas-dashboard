# CLAUDE.md — Mini SaaS Dashboard

Project-level guidance for AI assistants working in this repo. Keep changes surgical and match existing conventions.

## What this is

A full-stack dashboard to list, filter, search, add and edit **projects** (status, deadline, assigned team member, budget). Authenticated, per-user data, REST API, seeded Postgres.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router) + React 19 + TypeScript |
| Styling | **Tailwind CSS v4** (CSS-first), Radix UI primitives, lucide-react |
| Data | **PostgreSQL** + **Prisma 7** (`@prisma/adapter-pg` driver adapter) |
| API | REST via Route Handlers under `app/api/**` |
| Auth | `jose` (JWT) + `bcryptjs`, httpOnly cookie, edge guard |
| Validation | **Zod** (one schema shared by client forms and the API) |
| Client | TanStack Query, React Hook Form, Sonner |
| Tests | Vitest + Testing Library |

## Bleeding-edge conventions (do not "fix" these to older patterns)

- **Next.js 16**: the middleware file is **`proxy.ts`** at the repo root and exports `proxy()` (not `middleware`). Dynamic route `params` is a `Promise` — `await` it. `cookies()` / `headers()` are async.
- **Prisma 7**:
  - Generator is `provider = "prisma-client"` with `output = "../app/generated/prisma"` (generated client is gitignored).
  - Import the client from `@/app/generated/prisma/client` (the `/client` suffix matters).
  - The datasource `url` is **not** in `schema.prisma` — it lives in `prisma.config.ts` (`datasource.url = env("DATABASE_URL")`), which also defines `migrations.seed`.
  - Runtime client uses a driver adapter: `new PrismaClient({ adapter })` with `@prisma/adapter-pg` — see [lib/db.ts](../lib/db.ts).
- **Tailwind v4**: no `tailwind.config.js`. Tokens live in `app/globals.css` under `@theme inline`.
- **Zod 4 + RHF**: `projectSchema` uses `z.coerce.number()` for budget, so the modal uses `useForm<ProjectFormValues, unknown, ProjectPayload>` (3 generics) so `onSubmit` receives the coerced output.

## Architecture

- **Edge / Node split.** [lib/session.ts](../lib/session.ts) is jose-only (Web Crypto), safe for the Edge `proxy.ts` and Node route handlers. `bcryptjs` and Prisma stay in Node route handlers. The server-only DAL [lib/dal.ts](../lib/dal.ts) re-verifies the session for data access.
- **Single source of validation.** [lib/validations.ts](../lib/validations.ts) Zod schemas back both the forms and the API. Do not add parallel validation.
- **Ownership.** Projects are scoped by `ownerId`; non-owned reads/writes return `404`.

## Layout

```
app/(auth)/{login,register}     auth pages
app/api/{auth,projects,team-members}   route handlers
app/page.tsx                    dashboard (protected)
components/ui/*                  Radix-based primitives
components/*                     table, modal, filters, header
lib/                            db, session, dal, validations, queries, api-client, utils
prisma/                         schema.prisma, migrations, seed.ts
proxy.ts                        edge auth guard
tests/{unit,integration}        Vitest suites
```

## Commands

```bash
npm run dev | build | start
npm run lint | typecheck
npm test                 # unit + integration (integration skips if no TEST_DATABASE_URL)
npm run test:unit
npm run test:integration
npm run db:migrate | db:seed | db:reset | db:studio
```

## Database & env

- `.env`: `DATABASE_URL`, `JWT_SECRET` (see `.env.example`).
- `.env.test`: `TEST_DATABASE_URL` (a **dedicated** DB — the integration suite wipes it), `JWT_SECRET` (see `.env.test.example`).
- Local Postgres example: `postgresql://USER@localhost:5432/mini_saas`; test DB `mini_saas_test`.
- Demo login: `demo@dimovtax.com` / `password123`.

## Testing strategy

- **Unit** (`tests/unit`): pure logic — Zod schemas, formatters, `jose` session round-trip, bcrypt hashing, and the `ProjectTable` component. No IO.
- **Integration** (`tests/integration`): real route handlers against a real Postgres test DB. `getSessionUserId` is the only stub (auth extraction); everything else hits the DB through Prisma. Requires `TEST_DATABASE_URL`; otherwise the suite skips so `npm test` stays green.

## Conventions

- Files: `kebab-case.tsx`; tests `*.test.ts(x)` under `tests/`.
- Prefer self-documenting code; comments only explain non-obvious *why*.
- Commits: Conventional Commits (`feat`, `fix`, `test`, `docs`, `chore`, …), imperative, atomic.
- After schema changes: `npm run db:migrate` then `npm run db:generate`.
