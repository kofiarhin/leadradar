# LeadRadar

Turns public LinkedIn post engagement into a focused list of prospects worth contacting.

Product authority: [`docs/PRD.md`](docs/PRD.md). Technical authority: [`docs/SPEC.md`](docs/SPEC.md).

## Status

Owner authentication only. Campaigns, prospects, qualification, enrichment, outreach, and
opportunities are specified but not implemented — see [`roadmap.md`](roadmap.md).

## Requirements

- Node `>=20.19.0` (declared in `engines`)
- npm 10+
- A MongoDB instance for running the app. Tests do not need one.

## Setup

```bash
npm install
cp .env.example .env   # then fill in real values
```

`.env` is git-ignored and must never be committed. `.env.example` holds placeholders only.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production`. |
| `PORT` | API port. |
| `APP_URL` | Public origin of the app. Supplies the trusted-origin allowlist. |
| `MONGODB_URI` | MongoDB connection string. |
| `SESSION_SECRET` | Session signing secret, 32 characters minimum. |
| `ADMIN_EMAIL` | Seeded owner account. |
| `ADMIN_INITIAL_PASSWORD` | Initial password. Read only by the seed command. |

## Running

```bash
npm run seed         # create the workspace and owner; safe to re-run
npm run dev:server   # API on $PORT
npm run dev:client   # client on 5173, proxying /api to the API
```

Seeding is explicit and idempotent: re-running it never duplicates records and never
overwrites a password changed after the first seed.

## Checks

```bash
npm test         # server (Jest) and client (Vitest)
npm run typecheck
npm run lint
npm run build
```

Tests run against an in-memory MongoDB started by the suite, so they need no external
database, no credentials, and no network.

## Layout

```text
client/            React + Vite + Tailwind
server/            Express API, domain modules, provider adapters
packages/shared/   Types, zod schemas, and constants used by both
```

Domain modules own business behaviour; provider-specific code belongs behind adapters.
