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
- `tickets/002-vertical-profile.md` — `verifying` on PR #3. Implementation is present; exact-head automated verification and browser review remain outstanding.

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

- GitHub Actions — pending/not observed yet for PR #3.
- Local execution in the current Architect environment — Not run because the executor has no outbound network access to clone/install the repository.
- Browser verification — Not run.

## Released

None. No deployment or release evidence exists.

## Unresolved

- Exact provider endpoints/model/Actor identifiers require implementation-time verification.
- No real customer evidence has been stored under `customers/` yet.
- The browser pass for the login flow remains outstanding.
- Exact-head automated verification and browser review for ticket 002 remain outstanding.
- The login rate limiter uses a per-process memory store. Correct for the single-dyno V1 target; it must become a shared store before the web process scales.
