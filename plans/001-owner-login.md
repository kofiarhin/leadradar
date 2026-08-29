# Owner Login and Authenticated Session Implementation Plan

## Sources

- Ticket: `tickets/001-owner-login.md`
- Spec: `spec/001-owner-login.md`

## Goal

Deliver a running LeadRadar skeleton in which the seeded owner logs in through a browser, holds a server-verifiable session, reaches a protected destination, and logs out — with every behaviour above proven by tests that need no external credentials and no network.

## Preconditions

- Working branch `feat/001-foundation` (currently level with `main`, clean tree apart from this ticket's artifacts).
- Explicit approval of the execution contract, including the exact per-workspace dependency table in `spec/001-owner-login.md` and the creation of a root `package-lock.json`.
- **Node `>=20.19.0`.** Run `node --version` and compare it against that range **before installing any dependency**. Observed: v22.20.0 / npm 10.9.3, which satisfies it. If the local version does not, stop and report the mismatch — do not install, upgrade, downgrade, or switch Node, and do not invoke a version manager. The requirement is recorded in the root `package.json` `engines` field created in Slice 1.
- First `npm install` needs network access, including the `mongodb-memory-server` binary download. Tests then run offline.
- Dependencies are installed per workspace at the versions the spec names, not by installing "latest": TypeScript in particular is held at `5.9.3` by the `ts-jest` and `typescript-eslint` peer ranges.

## Implementation Strategy

Nine vertical slices. Slices 1–6 build the server outward from configuration to a fully guarded API; slices 7–9 build the client against that API. Each slice is independently testable and reviewable. No slice introduces a provider adapter, a job, a worker, or the vertical profile.

Scaffolding is not treated as its own slice — each slice creates only the configuration files its own RED test requires, so no file is added without a test that needs it.

---

## Slice 1 — Configuration loads and the database connects

### Outcome

The server validates its environment and opens a Mongoose connection through the ordinary runtime path, and the test harness can drive that path with no external database.

### Affected Areas

Root `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`; `server/package.json`, `server/tsconfig.json`, `server/jest.config`, `server/test/globalSetup`, `server/src/config/`, `server/src/db/`.

### RED

`server` test: `loadConfig()` rejects a missing `MONGODB_URI` and a `SESSION_SECRET` below the minimum length, naming the variable without echoing its value; `connectToDatabase()` reaches a ready connection state using the `MONGODB_URI` present in the environment. Fails because neither module exists.

### GREEN

Root workspace manifest with `client`, `server`, `packages/*` and `engines.node: ">=20.19.0"`, written before the first install; `.gitignore` excluding `.env` and local secret files; `.env.example` with placeholders only; Jest configured with a `globalSetup` that starts `mongodb-memory-server` and exports its URI as `MONGODB_URI`; a zod-validated config module; a Mongoose connect helper with no test-aware branch.

### REFACTOR

Settle the config module's exported shape so later slices import a typed value rather than reading `process.env`.

### VERIFY

`npm test --workspace server`; `npm run typecheck`. Confirm the suite passes with no `MONGODB_URI` set in the shell.

---

## Slice 2 — Seeding is explicit and idempotent

### Outcome

One workspace and one admin exist after seeding, and re-seeding never duplicates a record or resets a changed password.

### Affected Areas

`server/src/modules/workspaces/workspace.model.ts`, `server/src/modules/auth/admin-user.model.ts`, `server/src/modules/auth/password.ts`, `server/src/seed.ts`, plus tests.

### RED

`server` test: after one seed run, exactly one workspace and one admin exist; the admin's stored value is a scrypt hash that verifies the correct password and rejects a wrong one, and is not the plaintext. After a second run, counts are unchanged and a hash altered between runs is left untouched. Fails because the models, hashing, and seed do not exist.

### GREEN

`Workspace` and `AdminUser` schemas per `docs/SPEC.md` §5.1/§5.2, `unique(email)` index, `passwordHash` as `select: false`; scrypt hash/verify with `timingSafeEqual` and the self-describing encoding; a seed function that creates only what is absent and reports which branch it took without echoing credentials.

### REFACTOR

Extract email normalization so login and seeding share one implementation.

### VERIFY

`npm test --workspace server`.

---

## Slice 3 — Login authenticates the owner

### Outcome

Correct credentials establish a session; incorrect credentials are indistinguishable from an unknown account.

### Affected Areas

`server/src/app.ts`, `server/src/middleware/request-id.ts`, `server/src/middleware/error-handler.ts`, `server/src/middleware/session.ts`, `packages/shared/src/schemas/`, `packages/shared/src/constants/`, `server/src/modules/auth/` service and routes.

### RED

Supertest against the mounted app: correct credentials return `200` with a user and workspace body, set an `HttpOnly` cookie, and expose no `passwordHash`; a wrong password and an unknown email return an identical status, code, and body shape; a malformed body returns `400 VALIDATION_ERROR` carrying a `requestId`. Fails because no app or route exists.

### GREEN

`app.ts` assembling request-id, JSON parsing, session, routes, and the centralized error handler, exported without listening; the shared zod login schema; an auth service that normalizes the email, verifies the hash, and performs a dummy verification on an unknown email; the login route returning the mapped response.

### REFACTOR

Move response mapping into one place that cannot emit `passwordHash`.

### VERIFY

`npm test --workspace server`.

---

## Slice 4 — Session reads back, logout ends it

### Outcome

The session is server-verifiable across requests, is regenerated on login, and is genuinely destroyed on logout.

### Affected Areas

`server/src/middleware/require-auth.ts`, `server/src/modules/auth/` routes, plus tests.

### RED

Supertest: `GET /api/v1/auth/session` returns `200` with the login cookie and `401 AUTH_REQUIRED` without one; the session cookie value changes across login; `POST /api/v1/auth/logout` returns `204`, after which the same cookie yields `401`; logout without a session also returns `204`; a cookie whose stored record was removed yields `401`, not `500`. Fails because the routes and middleware do not exist.

### GREEN

`requireAuth` rejecting an absent or unresolvable session; session regeneration before populating on login; session-read and logout routes.

### REFACTOR

Consolidate the session payload (`adminUserId`, `workspaceId`) behind one typed accessor.

### VERIFY

`npm test --workspace server`.

---

## Slice 5 — A protected route scopes by session workspace

### Outcome

Protected routing is default-deny, and a workspace-owned resource resolves from the session rather than from client input.

### Affected Areas

`server/src/modules/workspaces/` service and routes, protected router group, plus tests.

### RED

Supertest: `GET /api/v1/workspace` returns `401 AUTH_REQUIRED` unauthenticated; authenticated, it returns the workspace named on the session; supplying a different workspace id as a query or body parameter does not change the result. Fails because the route does not exist.

### GREEN

Workspace read service scoped by the session's `workspaceId`; the route mounted behind `requireAuth` as a group rather than per-handler.

### REFACTOR

Establish the protected-router grouping the later tickets will extend.

### VERIFY

`npm test --workspace server`.

---

## Slice 6 — State-changing routes reject untrusted origins and throttle login

### Outcome

A cross-site request cannot reach a state-changing handler, cross-origin responses are never exposed, and repeated failed logins are throttled.

### Affected Areas

`server/src/middleware/require-trusted-origin.ts`, `server/src/middleware/` rate limit and content-type guard, `server/src/config/` (`APP_URL`), state-changing router group wiring, plus tests.

### RED

Supertest, ordered as the middleware chain runs:

- a login carrying an untrusted `Origin` returns `403 FORBIDDEN` in the §16 error shape; one carrying the configured `APP_URL` origin succeeds;
- `https://<allowed-host>.attacker.test` and `https://prefix-<allowed-host>` are rejected, proving exact-match rather than substring comparison;
- no `Origin` with `Sec-Fetch-Site: cross-site` is rejected; `same-origin` and `none` are accepted; neither header present is accepted;
- `POST /api/v1/auth/logout` enforces the same validation;
- an untrusted origin is rejected **without** consuming a rate-limit attempt, verified by exhausting the limiter afterwards;
- no response carries `Access-Control-Allow-Origin`, even when the request bears an `Origin`;
- failed logins beyond the threshold return `429 RATE_LIMITED`;
- a non-JSON content type returns `415 VALIDATION_ERROR`; a normal JSON login is unaffected.

Fails because none of the controls exist.

### GREEN

`APP_URL` added to validated config and parsed into an exact-match origin allowlist; `requireTrustedOrigin` mounted on the state-changing router group ahead of body parsing and ahead of the limiter; `express-rate-limit` on the login route keyed by IP; the content-type guard. No CORS middleware is installed — default-deny is achieved by emitting no CORS header at all.

### REFACTOR

Keep the allowlist, limiter window, and threshold in config rather than inline literals; confirm the middleware is applied at the group so a future non-`GET` route inherits it without opting in.

### VERIFY

`npm test --workspace server`; confirm the limiter state is isolated per test so it cannot leak across cases.

---

## Slice 7 — The client guards protected routes

### Outcome

An unauthenticated visitor never sees protected content.

### Affected Areas

`client/package.json`, `vite.config.ts` (with the `/api` dev proxy), Tailwind/PostCSS config, Vitest setup, `client/src/api/`, `client/src/features/auth/`, `client/src/routes/`, `client/src/pages/`, `client/src/main.tsx`.

### RED

React Testing Library, fetch mocked at the API-client boundary: the guard renders a loading state while the session query is pending, redirects to `/login` when it resolves unauthenticated, and renders the protected child when authenticated. Fails because no client exists.

### GREEN

Vite + React + Tailwind scaffold; TanStack Query provider; an API client that sends credentials and JSON and maps `401` to an unauthenticated result rather than throwing; `useSession`; the route guard; the router with `/login` and a protected `/`.

### REFACTOR

Keep every fetch call inside `client/src/api/`; components consume hooks only.

### VERIFY

`npm test --workspace client`; `npm run typecheck`.

---

## Slice 8 — The login screen signs the owner in

### Outcome

The owner completes login in the UI, and failures are legible without disclosing whether the account exists.

### Affected Areas

`client/src/pages/LoginPage.tsx`, `client/src/features/auth/` login mutation, plus tests.

### RED

RTL: a successful submission navigates to the protected destination; an invalid-credential response renders one generic message that names neither the email nor the field at fault; the submit control is disabled and a pending state shows while in flight; a rate-limited response renders its distinct message; the form has accessible field names and is completable by keyboard. Fails because the page does not exist.

### GREEN

The login form with labelled fields and correct `type`/`autocomplete`, the login mutation, session-query invalidation on success, an announced error region, and the mapped error copy.

### REFACTOR

Extract error-code-to-copy mapping so it stays testable and reusable.

### VERIFY

`npm test --workspace client`.

---

## Slice 9 — The authenticated destination and logout

### Outcome

The owner sees an authenticated placeholder identifying the workspace and can log out back to the login screen.

### Affected Areas

`client/src/pages/DashboardPage.tsx`, `client/src/features/auth/` logout mutation, plus tests.

### RED

RTL: the page renders the workspace name from the workspace query and a loading state before it arrives; activating logout calls the logout endpoint, clears session state, and returns to `/login`. Fails because the page does not exist.

### GREEN

The placeholder page consuming the workspace query, and a logout mutation that clears the query cache and navigates.

### REFACTOR

Nothing beyond shared layout extraction if two pages genuinely duplicate markup.

### VERIFY

`npm test --workspace client`.

---

## Final Verification

- `npm test` — server Jest and client Vitest, run with no `MONGODB_URI`, no credentials, and no network, to prove the ticket's offline criterion.
- `npm run typecheck` — all three workspaces.
- `npm run lint`.
- `npm run build` — client and server.
- Confirm `mongodb-memory-server` appears only under dev dependencies and that no runtime source file references it.
- Confirm the installed dependency set matches the spec's table exactly — no extra package, no per-workspace lockfile, one root `package-lock.json`, and no unmet peer warnings from `npm ls`.
- Confirm `.env` is ignored and `.env.example` contains placeholders only, including `APP_URL`.
- Manual browser pass against a real `MONGODB_URI`: `npm run seed`, `npm run dev`, then login, protected destination, reload persistence, logout, and a blocked return to the protected route — at desktop and mobile widths, covering loading, validation, invalid-credential, and success states, checking the console for errors and completing the flow by keyboard.

Every check is reported as `Passed`, `Failed`, or `Not run`. If no MongoDB instance is available, the manual pass is reported `Not run`; it is never assumed.

## Risks and Checkpoints

Stop and return for review if any of these appear:

- `node --version` reports below `20.19.0` — stop before installing anything and report it; changing the system Node is the operator's decision, not this plan's;
- the `mongodb-memory-server` binary cannot be downloaded, which would block the agreed offline test strategy and require a new decision;
- scrypt at OWASP-aligned parameters makes login latency unacceptable, which would reopen the hashing choice;
- origin validation proves insufficient as CSRF protection under review, which would introduce a token mechanism and reopen approval;
- `connect-mongo`'s `mongodb` peer does not resolve from Mongoose's hoisted copy, and the store cannot be built from the existing Mongoose client — adding a `mongodb` dependency is a contract change, not an implementation detail;
- any need arises for a dependency beyond the approved table, or for a version other than the one it names;
- any slice appears to require the vertical profile, a provider adapter, or the job queue — all out of scope.

## Completion Criteria

- All nine slices are green, with each RED observed failing for its intended reason before its GREEN.
- Every acceptance criterion in `tickets/001-owner-login.md` is supported by observed evidence.
- Automated checks pass; the manual browser pass is either passed or explicitly reported `Not run` with its reason.
- No in-scope `Must fix` finding remains under `review.md`.
- Nothing is committed, pushed, merged, or deployed by this plan.
