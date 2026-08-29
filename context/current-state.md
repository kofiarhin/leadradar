# LeadRadar Current State

## Proposed

The complete V1 product journey in `docs/PRD.md` remains to be implemented.

## Specified

- `docs/PRD.md` — approved LeadRadar V1 product requirements.
- `docs/SPEC.md` — approved LeadRadar V1 technical specification for the modular-monolith architecture, domain model, provider boundaries, jobs, APIs/UI behaviour, safety controls, and verification approach.

## Planned

- `plans/001-owner-login.md` — nine TDD slices for owner authentication. Executed.

## In Progress

- `tickets/001-owner-login.md` — `verifying`. Implementation and automated verification are complete; the browser pass remains outstanding.

## Implemented

Owner authentication and the application skeleton it required:

- root npm workspace (`client/`, `server/`, `packages/shared/`) with `engines.node: ">=20.19.0"`;
- zod-validated server configuration and a Mongoose connection using `MONGODB_URI`;
- `Workspace` and `AdminUser` models per `docs/SPEC.md` §5.1/§5.2, with `unique(email)` and `passwordHash` excluded from ordinary queries;
- explicit idempotent seeding (`npm run seed`) that never overwrites a rotated password;
- scrypt password hashing with per-hash stored parameters, unique random salts, and timing-safe comparison;
- `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/session`, `GET /api/v1/workspace`;
- MongoDB-backed `express-session` with an HttpOnly cookie, session regeneration on login, and destruction on logout;
- strict allowed-origin validation on state-changing routes, default-deny CORS, a JSON content-type guard, and login rate limiting;
- a React login screen, route guard, and authenticated placeholder using TanStack Query.

Nothing else from the V1 journey is implemented. No provider adapter, job queue, worker process, or vertical profile exists.

## Verified

- `npm test` — Passed. 59 server tests (Jest + Supertest) and 15 client tests (Vitest + RTL), run with no `MONGODB_URI`, no credentials, and no network.
- `npm run typecheck`, `npm run lint`, `npm run build` — Passed.
- Runtime verification against a real server process backed by an in-memory MongoDB — Passed: idempotent seeding, 401 on unauthenticated reads, 403 on cross-site login, 401 on wrong password, successful login with no CORS header, session and workspace reads scoped from the session, 204 logout, and 401 on both protected reads afterwards.
- Browser verification — **Not run**. No browser tooling or MongoDB instance was available. Desktop/mobile widths, console checks, and the keyboard pass remain unverified.
- Provider integrations, workers, jobs, and deployment — Not run. None exists.

## Released

None. No deployment or release evidence exists in the repository setup checkpoint.

## Unresolved

- Exact provider endpoints/model/Actor identifiers require implementation-time verification.
- No real customer evidence has been stored under `customers/` yet.
- The browser pass for the login flow has not been run, so two acceptance criteria on `tickets/001-owner-login.md` remain unproven.
- The login rate limiter uses a per-process memory store. Correct for the single-dyno V1 target; it must become a shared store before the web process scales.
