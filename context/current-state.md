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
- `tickets/002-vertical-profile.md` — `verifying`. Implementation is present; exact-head automated verification now passes locally, and browser review remains outstanding.
- `tickets/003-stabilize-foundation.md` — `verifying` on `fix/003-stabilize-foundation`. The four red checks are repaired and all local checks pass; browser verification remains outstanding, so the ticket is not complete.

## Implemented

Owner authentication and the application skeleton it required:

- root npm workspace (`client/`, `server/`, `packages/shared/`) with `engines.node: ">=22.22.2"`;
- zod-validated server configuration and a Mongoose connection using `MONGODB_URI`;
- `Workspace` and `AdminUser` models per `docs/SPEC.md` §5.1/§5.2, with `unique(email)` and `passwordHash` excluded from ordinary queries;
- explicit idempotent seeding (`npm run seed`) that never overwrites a rotated password;
- scrypt password hashing with per-hash stored parameters, unique random salts, and timing-safe comparison;
- `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/session`, `GET /api/v1/workspace`;
- MongoDB-backed `express-session` with an HttpOnly cookie, session regeneration on login, and destruction on logout;
- strict allowed-origin validation on state-changing routes, default-deny CORS, a JSON content-type guard, and login rate limiting;
- a React login screen and authenticated route guard using TanStack Query.

Vertical profile implementation on `feat/002-vertical-profile` / PR #3:

- shared zod contracts and response types for the V1 vertical profile;
- workspace-scoped `VerticalProfile` Mongoose model with versioning;
- authenticated `GET /api/v1/vertical-profile` and guarded `PUT /api/v1/vertical-profile` create/update flow;
- editable authenticated dashboard form with loading, empty, success, and error states;
- server and client automated coverage for the profile flow;
- `.github/workflows/ci.yml` to run tests, typecheck, lint, and build for pull requests.

Campaigns, provider adapters, jobs, worker processes, qualification, enrichment, outreach, replies, opportunities, and metrics are not implemented yet.

## Verified

Previously verified on the owner-auth implementation:

- `npm test` — Passed. 59 server tests (Jest + Supertest) and 15 client tests (Vitest + RTL), run with no `MONGODB_URI`, no credentials, and no network.
- `npm run typecheck`, `npm run lint`, `npm run build` — Passed.
- Runtime verification against a real server process backed by an in-memory MongoDB — Passed for the owner-auth flow.

Vertical-profile exact-head verification:

- GitHub Actions — Not observed for this head. The branch has not been pushed.
- Browser verification — Not run.

Foundation stabilization (`tickets/003-stabilize-foundation.md`), observed 2026-09-11 at `fix/003-stabilize-foundation` on Node 22.22.2 / npm 10.9.7:

Four red checks existed on `main` (`8468dc2`); all four are now repaired and observed green locally:

- `npm test` — Passed — 9 server suites / 66 tests and 3 client files / 16 tests. Previously: `PUT /api/v1/vertical-profile` returned 500 instead of 400 for invalid input, and `DashboardPage.test.tsx` failed because `@tanstack/react-query` 5.102.8 calls a `mutationFn` as `(variables, context)`.
- `npm run typecheck` — Passed (exit 0). Previously exit 2: Mongoose 9 `InferSchemaType` types the optional `companySize` subdocument fields as `number | null`, which the shared `VerticalProfileCompanySize` DTO does not accept.
- `npm run lint` — Passed (exit 0). Was already green.
- `npm run build` — Passed (exit 0). Previously failed in the server workspace for the same `companySize` type error; the client bundle is 731 kB (176 kB gzip).
- HTTP-level runtime verification (built server process, in-memory MongoDB) — Passed — 37/37 checks across seeding idempotency, unauthenticated refusal, invalid/valid login, session, logout and post-logout refusal, profile empty/create/load/edit/reload, optional `companySize`, validation 400s, untrusted origin 403, non-JSON 415, malformed JSON 400, and log hygiene.
- Node baseline — `engines.node` and CI moved from `20.19.0` to `22.22.2`, the strictest lower bound in the installed dependency set (`jsdom@30.0.1` requires `^22.22.2 || ^24.15.0 || >=26.0.0`). No dependency versions changed and `package-lock.json` is untouched.
- Browser verification — **Not run**. No browser automation is available in this environment and no browser-testing dependency was added.

## Released

None. No deployment or release evidence exists.

## Unresolved

- Exact provider endpoints/model/Actor identifiers require implementation-time verification.
- No real customer evidence has been stored under `customers/` yet.
- The browser pass for the login flow remains outstanding.
- Browser review for tickets 002 and 003 remains outstanding; exact-head automated verification for ticket 002 now passes locally.
- No GitHub Actions run has been observed for `fix/003-stabilize-foundation`; the branch is unpushed, so CI is unverified for the fixed head.
- `engines.node: ">=22.22.2"` permits Node 23 and 25, which `jsdom@30` excludes. npm does not enforce `engines` by default and CI pins `22.22.2`, so this is a documentation gap rather than an observed failure.
- The login rate limiter uses a per-process memory store. Correct for the single-dyno V1 target; it must become a shared store before the web process scales.
