# Owner Login and Authenticated Session Specification

## Source Ticket

`tickets/001-owner-login.md`

## Ticket Decisions

These intake decisions are settled and constrain this design:

- Roadmap outcome 1 is split. This slice delivers the application skeleton, MongoDB connection, seeded owner/workspace, and authenticated session. The editable vertical profile is a separate ticket.
- Automated tests run against `mongodb-memory-server` (dev dependency) and must not require external credentials or network access.
- MongoDB Atlas is used only for runtime/manual verification through `MONGODB_URI`. Runtime code uses the normal Mongoose connection path; no test-specific persistence path may exist in runtime code.

## Objective

Establish the first executable, testable path through LeadRadar: a root npm workspace containing a React client, an Express server, and a shared package; a Mongoose connection; an explicitly seeded workspace and admin user; and login, logout, and session-read endpoints backed by a server-verifiable session that gates a protected route and a protected client destination.

## Existing System

There is no application. Confirmed at commit `9174493`:

- tracked non-workspace files are `docs/PRD.md` and `docs/SPEC.md`;
- no root `package.json`, no `client/`, `server/`, or `packages/`;
- no `.gitignore`, no `.env.example`, no lockfile;
- no test, lint, type-check, or build tooling;
- local toolchain observed: Node v22.20.0, npm 10.9.3 (npm workspaces supported).

Everything below is therefore new construction. There are no existing conventions to match beyond the locked contract in `docs/SPEC.md`.

## Proposed Solution

Build the minimum slice of the `docs/SPEC.md` §4 structure needed to authenticate the owner, and no more. Domain modules under `server/src/modules/` own behaviour; only `auth` and `workspaces` are created. No provider adapter, no job queue, no worker process.

Authentication uses a **server-side session record in MongoDB**, addressed by an opaque signed cookie. This is required rather than preferred: `docs/PRD.md` §13 demands server-verifiable session data, and `docs/SPEC.md` line 1983 states that session state must not depend on local process memory alone because the web process may scale beyond one instance. A stateless signed token would also fail the ticket's logout criterion, since clearing a cookie does not invalidate a token an attacker already holds.

### Proposed dependencies

Every package below is required by a behaviour this ticket delivers, by the locked stack in `docs/SPEC.md` §2, or by a locked security requirement in §28. Nothing is installed for a future ticket: there is no Apify, NVIDIA, or Hunter client, no HTTP client, no job/queue library, and no scheduler. Versions were resolved from the registry on 2026-08-29 and are pinned as caret ranges at these resolved versions.

**Root** — `package.json` with `workspaces: ["client", "server", "packages/*"]`, dev dependencies only (shared tooling, hoisted):

| Package | Version | Reason |
| --- | --- | --- |
| `typescript` | `5.9.3` | Language. See the version constraint below. |
| `eslint` | `10.9.1` | `npm run lint`. |
| `typescript-eslint` | `8.68.0` | TypeScript rules for ESLint. |
| `prettier` | `3.9.6` | Formatting. |
| `@types/node` | `22.20.1` | Matches the observed Node 22.20.0 runtime. |

**`packages/shared/`** — runtime: `zod@4.5.1` (the login schema is shared by client and server and is evaluated at runtime on both). No dev dependency of its own; it consumes the hoisted root tooling.

**`server/`** — runtime:

| Package | Version | Reason |
| --- | --- | --- |
| `express` | `5.2.1` | `docs/SPEC.md` §2. |
| `mongoose` | `9.9.4` | `docs/SPEC.md` §2. |
| `express-session` | `1.19.0` | Server-verifiable session (`docs/PRD.md` §13). |
| `connect-mongo` | `6.0.0` | MongoDB session store (`docs/SPEC.md` line 1983). |
| `express-rate-limit` | `8.6.2` | Login rate limiting (`docs/SPEC.md` §28). |
| `zod` | `4.5.1` | Environment and request-body validation. |

**`server/`** — dev: `jest@30.5.0`, `ts-jest@29.4.12`, `supertest@7.2.2`, `mongodb-memory-server@11.2.0`, `tsx@4.23.12`, `@types/express@5.0.6`, `@types/express-session@1.19.0`, `@types/supertest@7.2.1`, `@types/jest@30.0.0`.

**`client/`** — runtime: `react@19.2.8`, `react-dom@19.2.8`, `react-router-dom@7.18.3`, `@tanstack/react-query@5.102.8`.

**`client/`** — dev: `vite@8.2.2`, `@vitejs/plugin-react@6.1.1`, `tailwindcss@4.3.3`, `@tailwindcss/vite@4.3.3`, `vitest@4.1.11`, `@testing-library/react@16.3.3`, `@testing-library/user-event@14.6.6`, `@testing-library/jest-dom@7.0.1`, `jsdom@30.0.1`, `@types/react@19.2.18`, `@types/react-dom@19.2.5`.

#### TypeScript is pinned to 5.9.3, not the newest release

The newest published TypeScript is `7.0.2`, but two tools in this stack exclude it:

- `ts-jest@29.4.12` declares peer `typescript: ">=4.3 <7"`;
- `typescript-eslint@8.68.0` declares peer `typescript: ">=4.8.4 <6.1.0"`.

`5.9.3` is the newest release satisfying both, so it is the current *compatible* stable version. This should be revisited when both tools publish TypeScript 7 support.

#### Packages deliberately not installed

- `postcss` and `autoprefixer` — Tailwind v4 through `@tailwindcss/vite` needs neither. Installing them would add configuration with no behaviour.
- `cors` — see CORS below; the correct default here is to install no CORS middleware at all.
- `mongodb` — `connect-mongo@6.0.0` declares peer `mongodb: ">=5.0.0"`, satisfied by the `mongodb@~7.5` that `mongoose@9.9.4` already depends on. The store is constructed from the existing Mongoose client rather than opening a second connection, so declaring `mongodb` directly would risk pinning a version against Mongoose's own.
- Any CSRF-token package — origin validation covers this without a token round-trip.
- `argon2` / `bcrypt` — see password hashing below.

#### Node runtime requirement

The root `package.json` declares:

```json
"engines": { "node": ">=20.19.0" }
```

`>=20.19.0` is the floor, not the target: it is the first Node 20 release carrying the ESM and `require(esm)` behaviour that `vite@8` and `vitest@4` expect, and it keeps a supported LTS line available rather than mandating Node 22.

Before any dependency is installed, `node --version` is run and compared against that range. The observed local version is **v22.20.0**, which satisfies it. If a future environment reports a version that does not, implementation **stops and reports the mismatch**. Node is never installed, upgraded, downgraded, or switched automatically, and no version manager is invoked — the system-level runtime is the operator's to change, and doing it silently could break unrelated work on the machine.

#### Lockfile

npm workspaces produce **one** lockfile: `package-lock.json` at the repository root, resolving all four workspaces. It does not exist today and will be **created** by this ticket. No other lockfile is added, and `client/`, `server/`, and `packages/shared/` must not carry their own. The lockfile is committed as part of the dependency contract; installs use `npm ci` where reproducibility matters.

### Password hashing

Node's built-in `crypto.scrypt`, not an `argon2` or `bcrypt` package. `docs/SPEC.md` §9.2 requires "a current password-hashing algorithm/library appropriate for Node.js, with parameters reviewed at implementation time" without naming one. scrypt is memory-hard, accepted by OWASP for password storage, available with zero dependencies, and avoids a native build step on the observed Windows development machine.

Three properties are required, not optional:

1. **Parameters are stored with the hash, never assumed.** The encoding is `scrypt$N$r$p$saltB64$hashB64`, so verification reads `N`, `r`, and `p` from the stored record rather than from current configuration. Raising the cost later cannot invalidate existing hashes, and the self-describing prefix leaves room for an `argon2id$…` variant without a data migration.
2. **Every hash uses its own fresh random salt** from `crypto.randomBytes` (16 bytes minimum). Salts are never derived, reused, or shared across records, so identical passwords never produce identical hashes.
3. **Comparison is timing-safe.** `crypto.timingSafeEqual` over the decoded buffers, with a length check first, since `timingSafeEqual` throws on a length mismatch. A byte-wise `===` or string comparison is prohibited.

Parameters start at an OWASP-aligned baseline (`N = 2^17`, `r = 8`, `p = 1`, 64-byte derived key) and are stated as named constants in code, not as inline literals.

### CSRF protection and CORS

`SameSite=Lax` alone is **not** treated as sufficient. State-changing routes are defended by strict origin validation, with the cookie attribute as defence in depth:

1. **Strict allowed-origin validation (primary control).** A `requireTrustedOrigin` middleware runs on every state-changing route — `POST /api/v1/auth/login` and `POST /api/v1/auth/logout` in this ticket, and every future non-`GET` route by construction, since it is applied at the router group rather than per handler. The allowlist is built from `APP_URL` in configuration plus the development client origin, compared by exact string match on the parsed origin — never by substring, prefix, or suffix test.
   - `Origin` present and not on the allowlist → `403 FORBIDDEN`.
   - `Origin` absent but `Sec-Fetch-Site` present and not `same-origin` or `none` → `403 FORBIDDEN`.
   - Neither header present → allowed. This is the non-browser case (a server-to-server or CLI client); CSRF requires a browser to attach the cookie, and every browser that can make a cross-site request sends at least one of the two headers.
2. **CORS defaults to deny.** No CORS middleware is installed and no `Access-Control-Allow-Origin` header is ever emitted, so a browser refuses to expose any cross-origin response by default. That is the strictest available posture, and it is a deliberate choice rather than an omission: in development the Vite dev server proxies `/api` to the server so the two share an origin, and in production Express serves the built client from the same origin (`docs/SPEC.md` §27). No approved cross-origin caller exists. If a future ticket needs one, it must add an explicit allowlist rather than a permissive default, and that is a security-posture change requiring its own approval.
3. **Cookie attributes as defence in depth.** `SameSite=Lax` and `HttpOnly` always, `Secure` in production (`docs/SPEC.md` §9.3). These narrow the attack surface but are no longer the primary control.
4. **JSON content type required** on state-changing routes, rejecting the `application/x-www-form-urlencoded`, `multipart/form-data`, and `text/plain` bodies an HTML form can produce without script.

Controls 1 and 2 are the CSRF defence; 3 and 4 are layered behind them. All four are covered by tests.

## Architecture

```text
client/                     React + Vite + Tailwind + TanStack Query
  src/api/                  fetch wrappers; no fetch calls inside components
  src/features/auth/        session query hook, login mutation, route guard
  src/pages/                LoginPage, DashboardPage (placeholder)
  src/routes/               router with /login and / (protected)

server/
  src/app.ts                Express app assembly (exported, no listen)
  src/server.ts             process entry: connect Mongoose, then listen
  src/seed.ts               explicit idempotent seed entry
  src/config/               zod-validated environment configuration
  src/db/                   Mongoose connection helper
  src/middleware/           requestId, session, requireAuth, error handler
  src/modules/auth/         AdminUser model, password hashing, auth service/routes
  src/modules/workspaces/   Workspace model, workspace service/routes

packages/shared/
  src/types/                session/auth response types
  src/schemas/              zod login schema shared by client and server
  src/constants/            API base path, error codes
```

`app.ts` builds the Express app without opening a connection or a port, so tests mount it with Supertest against an in-memory MongoDB. `server.ts` is the only place that listens.

## Data Model

Two collections, matching `docs/SPEC.md` §5.1 and §5.2 exactly.

```ts
interface Workspace {
  _id: ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminUser {
  _id: ObjectId;
  workspaceId: ObjectId;
  email: string;        // normalized lowercase, trimmed
  passwordHash: string; // scrypt$N$r$p$saltB64$hashB64
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes per `docs/SPEC.md` §6: `adminUsers` has `unique(email)`. No index is specified for `workspaces` and none is added — `rules/engineering.md` forbids indexes without a demonstrated query requirement.

`passwordHash` is excluded from query results by default (`select: false`) and is stripped by an explicit response mapper, so it cannot reach a response body by accident.

Sessions are stored in a third collection managed by `connect-mongo` (default `sessions`), with a TTL so expired sessions are removed. No LeadRadar business logic reads that collection directly.

This is new-collection creation, not a migration. No existing data is altered.

## API Contract

Base prefix `/api/v1` per `docs/SPEC.md` §8. Errors use the §16 shape:

```ts
interface AppErrorResponse {
  error: { code: string; message: string; requestId: string; details?: Record<string, unknown> };
}
```

### `POST /api/v1/auth/login`

Request: `{ "email": string, "password": string }`, validated by the shared zod schema.

- `200` → `{ "user": { "id", "email" }, "workspace": { "id", "name" } }`. The session id is regenerated before the session is populated, to defeat session fixation.
- `400 VALIDATION_ERROR` → malformed body or missing field.
- `401 AUTH_INVALID_CREDENTIALS` → wrong password **and** unknown email, identically. An unknown email still performs a dummy scrypt verification against a fixed synthetic hash so response timing does not disclose account existence.
- `403 FORBIDDEN` → untrusted `Origin`, or a cross-site `Sec-Fetch-Site`. Rejected before the body is parsed and before the rate limiter is consumed, so a cross-site attacker cannot exhaust a legitimate user's login attempts.
- `415 VALIDATION_ERROR` → non-JSON content type.
- `429 RATE_LIMITED` → login rate limit exceeded.

### `POST /api/v1/auth/logout`

- `204` → session destroyed server-side and the cookie cleared. Idempotent: calling it without a session also returns `204`.
- `403 FORBIDDEN` → untrusted origin, on the same terms as login.

### `GET /api/v1/auth/session`

- `200` → the same body shape as a successful login.
- `401 AUTH_REQUIRED` → no session, an expired session, or a session whose id no longer resolves to a stored record.

### `GET /api/v1/workspace`

The minimal protected business resource, used to prove session-derived workspace scoping before any campaign resource exists.

- `200` → `{ "workspace": { "id", "name" } }`, loaded by the `workspaceId` on the session. No client-supplied identifier participates in the lookup.
- `401 AUTH_REQUIRED` → unauthenticated.

`docs/SPEC.md` §8 presents its endpoint list as recommended and does not enumerate a workspace route. This is a **Proposed** addition, and it is the smallest way to satisfy the ticket's server-side-scoping acceptance criterion.

## Frontend Behaviour

Routes per `docs/SPEC.md` §21: `/login` and `/` (protected). Nothing else.

Session state lives in TanStack Query (`docs/SPEC.md` §20), not in component state and not in Redux. All fetch calls live in `client/src/api/`; components consume hooks.

- `useSession()` queries `GET /api/v1/auth/session`. A `401` resolves to "unauthenticated" rather than throwing, and does not retry.
- The route guard renders a loading state while the session query is pending, redirects to `/login` when unauthenticated, and renders the child otherwise. It never renders protected content while the session is unresolved.
- `LoginPage` submits through a mutation, disables the submit control and shows a pending state while in flight, then invalidates the session query and navigates to `/`.
- Errors render one generic message ("Invalid email or password") for `AUTH_INVALID_CREDENTIALS`, a distinct message for rate limiting, and a generic failure message otherwise. Client copy never distinguishes unknown email from wrong password.
- Client-side validation reports empty or malformed fields before submission without disclosing anything about the account.
- `DashboardPage` renders an authenticated placeholder with the workspace name from `GET /api/v1/workspace` and a working logout control. No metrics — those are out of scope.

Requests send `credentials: "include"` and `Content-Type: application/json`. Vite proxies `/api` to the server in development, so client and server share an origin and no CORS dependency is needed.

## Backend Behaviour

**Configuration.** `server/src/config/` validates the environment with zod at startup and exits with a clear message when a value is missing or invalid: `NODE_ENV`, `PORT`, `APP_URL`, `MONGODB_URI`, `SESSION_SECRET` (minimum length enforced), `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`. `APP_URL` (`docs/SPEC.md` §26) is parsed as a URL and supplies the trusted origin allowlist. No secret is ever logged; validation failure names the offending variable, never its value.

**Connection.** A single Mongoose connect helper reads `MONGODB_URI`. It has no test-aware branch. The test harness supplies `MONGODB_URI` from `mongodb-memory-server` through Jest `globalSetup`, so the production code path is exactly the path under test.

**Session.** `express-session` with `connect-mongo`, secret from `SESSION_SECRET`, `resave: false`, `saveUninitialized: false`, and cookie `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `secure: true` when `NODE_ENV === "production"` (`docs/SPEC.md` §9.3). The session holds only `adminUserId` and `workspaceId`.

**Seeding.** `npm run seed` runs `server/src/seed.ts`, which is explicit and idempotent per `docs/SPEC.md` §9.1:

1. find or create the single workspace;
2. find the admin by normalized `ADMIN_EMAIL`;
3. if absent, create it with a hash of `ADMIN_INITIAL_PASSWORD`;
4. **if present, change nothing** — the stored hash is never overwritten, so a rotated password survives restarts and re-runs;
5. report which branch was taken, without echoing credentials.

Seeding is a command, never a side effect of application startup.

**Authorization.** `requireAuth` rejects a request with no session, or whose session resolves to no stored record, with `401 AUTH_REQUIRED`. Protected handlers read `workspaceId` from the session only. `Model.findById(req.params.id)` on a workspace-owned record without a workspace constraint is prohibited (`docs/SPEC.md` §9.4). Protected routing is default-deny: the router applies `requireAuth` to the protected group rather than relying on each handler.

**Origin validation.** `requireTrustedOrigin` is applied to the state-changing router group ahead of body parsing and ahead of the rate limiter, per the CSRF design above. The allowlist comes from validated configuration; it is never read from a request header.

**Rate limiting.** `express-rate-limit` on the login route, keyed by IP, with a bounded window. `docs/SPEC.md` §28 lists login rate limiting as a locked security requirement, so it belongs with the endpoint that first needs it. The default memory store is per-process, which is sufficient for the single-dyno V1 target; when the web process scales beyond one instance this must become a shared store, and that limitation is recorded here rather than silently accepted.

**Request correlation and errors.** A `requestId` middleware assigns `crypto.randomUUID()` per request (`docs/SPEC.md` §25.1). One centralized error handler emits the §16 shape and maps unexpected errors to a generic `500` with no stack trace, no internal message, and no secret.

## Validation and Error Handling

- Every external input is validated by a zod schema at the boundary; handlers receive parsed, typed values.
- Email is normalized (trimmed, lowercased) before lookup and before storage.
- Invalid credentials produce one code, one status, one message shape, for both unknown email and wrong password.
- Config validation failure aborts startup rather than running with a partial configuration.
- Mongo connection failure at startup fails loudly and exits non-zero.

## Edge Cases

- Re-running the seed does not duplicate the workspace or admin and does not reset a changed password hash.
- Login with a session already present regenerates the session id rather than reusing it.
- Logout without a session returns `204` rather than an error.
- A session cookie whose backing record was deleted or expired is treated as unauthenticated, not as a server error.
- A request body that is valid JSON but the wrong shape yields `VALIDATION_ERROR`, not a `500`.
- Concurrent seed runs cannot create two admins: `unique(email)` is the enforcement point, and a duplicate-key error is handled as "already seeded".
- `ADMIN_INITIAL_PASSWORD` absent from the environment at runtime does not break login; it is only read by the seed command.

## Security / Privacy / Accessibility

- No plaintext password is persisted, logged, or returned. `passwordHash` is `select: false` and stripped by the response mapper.
- Password comparison uses `crypto.timingSafeEqual`; unknown-email login performs an equivalent dummy verification.
- Session cookie is `HttpOnly` always and `Secure` in production; the session id is regenerated on login and the record destroyed on logout.
- `.gitignore` excludes `.env` and local secret files before any secret-bearing configuration exists. `.env.example` holds placeholders only.
- The client bundle receives no secret; `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_INITIAL_PASSWORD` are read only in server code and never through a `VITE_`-prefixed variable.
- Login form fields carry real `<label>` associations, correct `type` and `autocomplete` attributes, a submit-capable form, and an error region announced to assistive technology. The flow is completable by keyboard alone at desktop and mobile widths.

## Affected Areas

### New application files

- root: `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `README.md`, ESLint and Prettier configuration;
- `packages/shared/`: `package.json`, `tsconfig.json`, `src/types/`, `src/schemas/`, `src/constants/`;
- `server/`: `package.json`, `tsconfig.json`, `jest.config`, test setup and `globalSetup`, `src/app.ts`, `src/server.ts`, `src/seed.ts`, `src/config/`, `src/db/`, `src/middleware/`, `src/modules/auth/`, `src/modules/workspaces/`, and their tests;
- `client/`: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest` setup, Tailwind configuration, `index.html`, `src/main.tsx`, `src/api/`, `src/features/auth/`, `src/pages/`, `src/routes/`, and their tests.

### Existing files the delivery lifecycle will modify

No existing *application* file is modified, because none exists. The delivery lifecycle does modify existing project-truth documents, and that is part of this ticket's footprint rather than an exception to it:

- `tickets/001-owner-login.md` — lifecycle metadata (`status`, `spec`, `plan`, later `delivered_at`), acceptance-criteria checkboxes, and a `## Delivery Evidence` section, written only from observed evidence;
- `spec/001-owner-login.md` and `plans/001-owner-login.md` — revised only if implementation evidence invalidates them, and a material revision reopens approval;
- after verified implementation, only those project-truth files whose truth actually changed:
  - `context/current-state.md` — moving this behaviour from *Specified* to *Implemented* and *Verified*, which its current text explicitly denies;
  - `context/architecture.md` — its `## Implemented` section currently reads "No application/runtime architecture is implemented", which stops being true;
  - `roadmap.md` — outcome 1's status, reflecting that this slice of it is delivered while the vertical profile remains outstanding;
  - `context/decisions.md` — only if a decision here (scrypt, origin validation, TypeScript 5.9.3 pinning) is worth recording durably;
  - `context/lessons.md` — only if a repository-specific lesson is actually learned.

Each of those is written only when its truth actually changed, per `AGENTS.md`. No unrelated existing file may be modified: `docs/PRD.md`, `docs/SPEC.md`, `AGENTS.md`, `CLAUDE.md`, `review.md`, `.claude/**`, and every other README or context file stay untouched.

## Testing Requirements

Backend (Jest + Supertest, `mongodb-memory-server` via `globalSetup`):

- seeding creates one workspace and one admin; a second run adds nothing and leaves a changed hash untouched;
- the stored admin record holds a hash, not the plaintext, and the hash verifies against the correct password and fails against a wrong one;
- hashing the same password twice produces two different stored values, proving a unique per-hash salt;
- a stored hash encodes its own `N`, `r`, and `p`, and still verifies after the configured baseline parameters are raised, proving parameters are read from the record rather than from configuration;
- login with correct credentials returns `200`, sets an `HttpOnly` cookie, and returns no `passwordHash`;
- login with a wrong password and login with an unknown email return an identical status, code, and body shape;
- login with a malformed body returns `VALIDATION_ERROR`; login with a non-JSON content type is rejected;
- a login carrying an untrusted `Origin` returns `403 FORBIDDEN`, and one carrying the configured `APP_URL` origin succeeds;
- an origin that merely contains or is prefixed/suffixed by the allowed origin (for example `https://app.example.com.attacker.test`) is rejected, proving exact-match comparison;
- a request with no `Origin` but `Sec-Fetch-Site: cross-site` is rejected; `same-origin` and `none` are accepted;
- logout is subject to the same origin validation;
- an untrusted origin is rejected without consuming a rate-limit attempt;
- no response carries an `Access-Control-Allow-Origin` header, including in response to a request bearing an `Origin`, proving CORS is default-deny;
- the session id changes across login (fixation defence);
- `GET /api/v1/auth/session` succeeds with the login cookie and returns `401 AUTH_REQUIRED` without it;
- `POST /api/v1/auth/logout` returns `204`, after which the same cookie yields `401` on the session route;
- `GET /api/v1/workspace` returns `401` unauthenticated, and when authenticated returns the workspace resolved from the session;
- the error handler emits `code`, `message`, and `requestId` and leaks no stack trace;
- config validation rejects a missing or too-short `SESSION_SECRET`.

Frontend (Vitest + React Testing Library, fetch mocked at the API-client boundary):

- the guard redirects to `/login` when the session query resolves unauthenticated, and renders a loading state while pending;
- a successful login navigates to the protected destination;
- a failed login renders the generic message and does not disclose whether the email exists;
- the submit control is disabled while the request is in flight;
- the login form is completable by keyboard and its fields have accessible names.

The suite must complete with no `MONGODB_URI` in the environment, no credentials, and no network access.

## Verification Requirements

- `npm test` (server Jest + client Vitest) — all pass;
- `npm run typecheck` — clean across all three workspaces;
- `npm run lint` — clean;
- `npm run build` — client and server build;
- `npm run seed` then `npm run dev` against a real `MONGODB_URI`, then a manual browser pass: login, protected destination, reload persistence, logout, blocked return to the protected route;
- browser inspection at desktop and mobile widths covering loading, validation, invalid-credential, and success states, with no console errors and a keyboard-only pass.

The manual pass requires a MongoDB instance the operator supplies. If no `MONGODB_URI` is available at verification time, the manual pass is reported `Not run` rather than assumed, and the automated suite still runs unaffected.

## Technical Risks

- **Login rate limiting is per-process.** Correct for the single-dyno V1 target; it must become a shared store before the web process scales. Recorded, not silently accepted.
- **`mongodb-memory-server` downloads a MongoDB binary on first use.** That first install needs network access, even though the tests themselves then run offline. A pre-populated cache or an explicit download step may be needed in a restricted environment.
- **scrypt parameters are a cost/latency tradeoff.** Parameters will be set to a current OWASP-aligned baseline and stated in code; they must be reviewed if login latency becomes a problem.
- **`connect-mongo` and the application share one MongoDB.** Session TTL cleanup is delegated to it; a misconfigured TTL would either accumulate sessions or expire them early. Covered by an explicit session-expiry behaviour test at the API level.
- **`connect-mongo@6.0.0` declares a `mongodb` peer that no workspace declares directly.** It is expected to resolve to the `mongodb@~7.5` hoisted from `mongoose@9.9.4`. If npm instead reports an unmet peer, the fix is to construct the store from the existing Mongoose client rather than to add a `mongodb` dependency that could conflict with Mongoose's own pin. If neither works, that is a dependency-contract change and returns for approval.
- **TypeScript is held at 5.9.3 by two peer ranges.** If `ts-jest` or `typescript-eslint` is upgraded later, the pin must be re-derived rather than assumed.
- **Origin validation allows requests carrying neither `Origin` nor `Sec-Fetch-Site`.** This is required for non-browser clients including the test suite, and is safe because a CSRF attack needs a browser to attach the session cookie, and browsers capable of cross-site requests send at least one of those headers. Should a supported browser ever omit both on a state-changing request, this control would need a token-based fallback.

## Open Technical Questions

None.
