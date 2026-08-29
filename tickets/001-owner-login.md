---
ticket_schema: 1
status: verifying
source: morning-brief
created: 2026-08-29
spec: spec/001-owner-login.md
plan: plans/001-owner-login.md
---

# Owner can log in and hold an authenticated session

## Request

Begin roadmap outcome 1 ("Foundation and owner access") with its smallest complete vertical slice: the single owner can sign in to LeadRadar and hold a server-verifiable authenticated session.

## Problem

LeadRadar is specification-only. Every later V1 outcome — campaigns, prospects, qualification, outreach, opportunities — is workspace-scoped and reachable only behind an authenticated owner session (`docs/SPEC.md` §8, §9.4). Without a running application skeleton and a real login, no subsequent outcome can be built or verified. This ticket establishes the first executable, testable path through the system.

## User Outcome

The owner opens LeadRadar, enters the seeded admin email and password, and lands in an authenticated area. An unauthenticated visitor cannot reach it, and a wrong credential produces a generic failure that does not reveal whether the email exists.

## Current Behaviour

No application exists. Repository evidence at `9174493`:

- no root `package.json`, no `client/`, `server/`, or `packages/`;
- tracked non-workspace files are `docs/PRD.md` and `docs/SPEC.md` only;
- no `.gitignore` and no `.env.example`;
- no test, lint, type-check, or build tooling is configured;
- `context/current-state.md` and `context/architecture.md` both record that implementation has not started.

## Desired Behaviour

- The repository builds and runs as the npm-workspace application described in `docs/SPEC.md` §4, with at least the client, server, and shared-package boundaries needed for this slice.
- The server connects to MongoDB via `MONGODB_URI` using the normal Mongoose connection path.
- One workspace and one admin user are seeded from server-side environment configuration, explicitly and idempotently, so a restart never overwrites a rotated password (`docs/SPEC.md` §9.1).
- The owner can log in, log out, and have the current session read back from the server.
- Protected areas are unreachable without a valid session, and every protected query is scoped by the authenticated `workspaceId` rather than by a client-supplied id.
- A `.gitignore` and a placeholder-only `.env.example` exist before any secret-bearing configuration is introduced.

## Repository Evidence

- `docs/PRD.md` §10.1 — login screen: admin email, password, authenticated session creation, generic invalid-credential errors.
- `docs/PRD.md` §13 — single-owner account, seeded from server-side environment configuration, no public signup, no OAuth, no plaintext password, secure HTTP-only cookies, server-verifiable session data, `workspaceId` scoping on all business records.
- `docs/PRD.md` §16.3 — credentials are server-only, secrets never appear in client bundles or logs, login and state-changing endpoints require CSRF-aware/session-safe design.
- `docs/SPEC.md` §2 — locked stack: React, Vite, TypeScript, Tailwind, Node, Express, MongoDB/Mongoose, single root `package.json` with npm workspaces; Jest for backend tests, Vitest for client.
- `docs/SPEC.md` §4 — recommended repository structure including `.gitignore` and `.env.example`.
- `docs/SPEC.md` §5.1 / §5.2 — `Workspace` and `AdminUser` shapes; `AdminUser` carries `workspaceId`, normalized lowercase `email`, and `passwordHash`.
- `docs/SPEC.md` §8.1 — `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/session`; responses must not expose the password hash or provider secrets.
- `docs/SPEC.md` §9.1–§9.4 — seeded owner via `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` / `SESSION_SECRET`, current password hashing, `HttpOnly` / `Secure` / `SameSite=Lax` / `Path=/` cookie, CSRF-aware protection, server-side `workspaceId` authorization.
- `review.md` — plaintext password storage, or a session that is not secure, HTTP-only, and server-verifiable, is a `Must fix`.

## Shared Understanding

- Roadmap outcome 1 is deliberately split. This ticket covers the application skeleton, MongoDB connection, seeded owner/workspace, and authenticated session. The editable vertical profile (`docs/SPEC.md` §5.3, §8.2) is a separate follow-up ticket and is not delivered here.
- Automated tests run against `mongodb-memory-server`, added as a dev dependency under this ticket. Tests must not require external credentials or network access.
- MongoDB Atlas is used only for runtime and manual integration verification through `MONGODB_URI`. Production and runtime code use the normal MongoDB/Mongoose connection path; test-specific persistence must not leak into runtime code.

## Scope

- Root npm-workspace setup and the client/server/shared boundaries required by this slice.
- TypeScript, build, test, and lint configuration sufficient to run and verify this slice.
- `.gitignore` and placeholder-only `.env.example`.
- Server configuration loading and validation for the environment values this slice needs.
- Mongoose connection handling.
- `Workspace` and `AdminUser` models.
- Explicit, idempotent seeding of one workspace and one admin user.
- Login, logout, and session-read endpoints.
- Session/authentication middleware and server-side `workspaceId` scoping for protected routes.
- A login screen and one authenticated placeholder destination, with client-side route protection.
- Automated backend and client tests for this slice.

## Out of Scope

- The editable vertical profile and its endpoints.
- Campaigns, prospects, signals, qualification, enrichment, outreach policy, suppression, outreach, conversations, opportunities, metrics.
- The job queue and the worker process type.
- Any Apify, NVIDIA, or Hunter adapter or credential.
- Dashboard metrics content beyond an authenticated placeholder.
- Password reset, password change UI, multi-user, RBAC, public signup, OAuth.
- Heroku deployment configuration, deployment, and release.
- Data retention behaviour.

## Requirements

- The owner authenticates with the seeded admin email and password; there is no signup path.
- Stored credentials are hashed; no plaintext password is ever persisted or logged.
- A successful login establishes a session the server can independently verify on later requests.
- The session cookie is HTTP-only, and its production configuration matches `docs/SPEC.md` §9.3.
- State-changing requests are protected by strict allowed-origin validation as the primary CSRF control, with cookie `SameSite` as defence in depth rather than as the control itself.
- Cross-origin access is denied by default; no permissive CORS policy is introduced.
- Password hashes store their own cost parameters, use a unique random salt per hash, and are verified with a timing-safe comparison.
- Invalid email and invalid password produce the same generic failure and the same observable response shape.
- No response, client bundle, or log line exposes the password hash, the session secret, or any provider credential.
- Seeding is explicit and idempotent, and does not reset an already-changed stored password on restart.
- Protected server routes reject unauthenticated requests and derive `workspaceId` from the session, never from client input.
- Unauthenticated client navigation to a protected route redirects to login rather than rendering protected content.
- The login screen handles loading, validation, error, and success states, and is usable at desktop and mobile widths with keyboard navigation and accessible labels.

## Acceptance Criteria

- [x] The root `package.json` declares `engines.node: ">=20.19.0"`, and the local `node --version` was checked against it before any dependency was installed.
- [x] The repository installs and builds from a single root `package.json` using npm workspaces.
- [x] A documented command starts the server against `MONGODB_URI` and establishes a Mongoose connection.
- [x] Seeding creates exactly one workspace and one admin user from environment configuration, and running it a second time neither duplicates records nor overwrites a changed password hash.
- [x] The stored admin record contains a password hash and no plaintext password.
- [x] `POST /api/v1/auth/login` with the seeded credentials succeeds and establishes a session; the response body contains no password hash and no secret.
- [x] `POST /api/v1/auth/login` with a wrong password and with an unknown email return the same generic failure and status.
- [x] `GET /api/v1/auth/session` returns the authenticated owner's session for a valid session and rejects an absent or invalid one.
- [x] `POST /api/v1/auth/logout` ends the session, after which `GET /api/v1/auth/session` rejects the request.
- [x] A protected server route rejects an unauthenticated request and, when authenticated, resolves `workspaceId` from the session rather than from client-supplied input.
- [x] The session cookie is issued with `HttpOnly`, and its `Secure` / `SameSite` / `Path` configuration matches `docs/SPEC.md` §9.3 in production configuration.
- [x] A state-changing request carrying an untrusted `Origin` is rejected with `403 FORBIDDEN`, and one carrying the configured `APP_URL` origin succeeds.
- [x] Origin comparison is exact: an origin that merely contains, prefixes, or suffixes the allowed origin is rejected.
- [x] A request with no `Origin` but a cross-site `Sec-Fetch-Site` is rejected; `same-origin` and `none` are accepted.
- [x] Both `POST /api/v1/auth/login` and `POST /api/v1/auth/logout` enforce origin validation, and an untrusted origin is rejected without consuming a login rate-limit attempt.
- [x] No response carries an `Access-Control-Allow-Origin` header, including in response to a request bearing an `Origin`, so cross-origin access is denied by default.
- [x] Stored password hashes encode their own cost parameters, use a unique random salt per hash, and are compared with a timing-safe comparison; hashing one password twice yields two different stored values.
- [x] Automated tests run to completion with no `MONGODB_URI`, no external credentials, and no network access, using `mongodb-memory-server`.
- [x] `mongodb-memory-server` is a dev dependency only, and runtime code contains no test-specific persistence path.
- [x] `.gitignore` excludes `.env` and local secret files, and `.env.example` contains placeholders only.
- [ ] The login screen authenticates the owner in a browser and reaches an authenticated destination; an unauthenticated visit to that destination redirects to login.
- [ ] The login screen's loading, validation/error, and success states are inspected at desktop and mobile widths with no console errors.
- [x] The configured test, type-check, lint, and build commands are reported with actual results.

## Constraints

- The locked V1 stack in `docs/SPEC.md` §2 applies; do not substitute frameworks, the database, or the package manager.
- Keep the modular-monolith and provider-adapter boundaries of `docs/SPEC.md` §3–§4. No provider adapter is introduced by this ticket.
- All durable business records carry `workspaceId`, even though V1 has one owner.
- Authentication is a deterministic control and must not depend on AI judgment.
- Secrets live in environment variables; `.env.example` holds placeholders only; no credential may be committed.
- Node `>=20.19.0` is required and recorded in the root `package.json` `engines` field. `node --version` is verified before dependency installation; a version below the floor stops the work with a report. System-level Node is never installed, upgraded, downgraded, or switched automatically.
- The dependency set is exactly the list enumerated in `spec/001-owner-login.md`, each pinned to a current compatible stable version and installed at a named workspace. No dependency for a future provider, job queue, or scheduler may be pulled forward. Any addition beyond that list requires separate approval.
- npm workspaces produce one root `package-lock.json`; no per-workspace lockfile is created.
- Test infrastructure must not alter the runtime connection path.
- This ticket does not authorize commit, push, merge, deployment, or release.

## Dependencies

None identified. This is the first implementation ticket; `docs/PRD.md` and `docs/SPEC.md` are already approved.

## Open Questions

None.

## Delivery Evidence

- Implementation: complete across all nine planned slices. Every RED was observed failing for its intended reason before its GREEN.
- Acceptance criteria: 21 of 23 proven. The two browser-inspection criteria are **not** proven — no browser tooling was available in this environment.
- Automated checks:
  - `npm test` — Passed — 59 server (Jest + Supertest) and 15 client (Vitest + RTL) tests, run with no `MONGODB_URI`, no credentials, and no network.
  - `npm run typecheck` — Passed — clean across all three workspaces.
  - `npm run lint` — Passed — clean.
  - `npm run build` — Passed — shared, server, and client build; client bundle 726 kB (174 kB gzip).
  - Dependency contract — Passed — installed set matches `spec/001-owner-login.md`; one root `package-lock.json`, no per-workspace lockfile, `npm ls` reports no unmet peers, and `mongodb-memory-server` is dev-only with no runtime reference.
- Runtime verification (real server process, in-memory MongoDB supplying `MONGODB_URI`): Passed.
  - `npm run seed` first run created the workspace and admin; second run reported "already exists; nothing was changed".
  - Unauthenticated `GET /auth/session` and `GET /workspace` → 401.
  - Login from an untrusted `Origin` → 403; wrong password → 401 `AUTH_INVALID_CREDENTIALS`.
  - Valid login → 200 with user and workspace, no `Access-Control-Allow-Origin` header present.
  - `GET /auth/session` and `GET /workspace` → 200 with session-derived workspace.
  - `POST /auth/logout` → 204; both protected reads → 401 afterwards.
- Browser/manual verification: **Not run** — no browser tooling and no MongoDB instance available in this environment. The two unchecked acceptance criteria depend on it.
- Review: no in-scope `Must fix`. One `Should fix` (login rate limiter uses a per-process memory store; correct for the single-dyno V1 target, must become a shared store before the web process scales — recorded in `spec/001-owner-login.md`). One `Okay to ship` note: `prettier` is installed with a `format` script but no configuration file, so it runs on defaults.
- Spec: `spec/001-owner-login.md`
- Plan: `plans/001-owner-login.md`
- Human review: run the browser pass (`npm run seed`, `npm run dev:server`, `npm run dev:client`) against a real `MONGODB_URI` at desktop and mobile widths, then check the two remaining acceptance criteria.
- Not performed: no commit, push, pull request, merge, deployment, or release. No destructive operation.
