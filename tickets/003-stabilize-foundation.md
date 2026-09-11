---
ticket_schema: 1
id: "003"
title: "Restore green CI and verify foundation"
status: verifying
---

# 003: Restore green CI and verify login + vertical profile

Status: Verifying — implementation and automated verification complete; browser verification outstanding
Project: LeadRadar
Destination: Codex

## Goal

Restore a trustworthy green LeadRadar foundation by fixing the currently failing CI/test baseline and completing browser verification for the existing owner login and vertical-profile flows before any campaign/provider work begins.

## User

The LeadRadar owner/developer needs a verified application foundation so later campaign, qualification, enrichment, outreach, and opportunity work is built on code that passes required checks and behaves correctly in the browser.

## Context

Current repository evidence on `main` shows the owner-authentication and editable vertical-profile implementation are present, but verification is incomplete.

The latest observed `main` GitHub Actions run (`33288679513`, head `5576c230d33d0254b06affb60d74227fd7ae31ab`) failed during `npm test`. The server vertical-profile validation test expected `400 Bad Request` for invalid input but received `500 Internal Server Error`. The current route calls `updateVerticalProfileRequestSchema.parse(req.body)` and forwards thrown validation errors to the global error handler, whose generic fallback returns 500 for errors that are not `AppError` or malformed-JSON `SyntaxError`.

The same CI run also failed to start the client Vitest workers under Node `20.19.0`. The install log reported engine mismatches for current frontend test dependencies, including `@testing-library/jest-dom@7.0.1`, `jsdom@30.0.1`, `undici@8.10.0`, and related packages requiring newer Node versions. The root package currently declares Node `>=20.19.0`, while CI explicitly selects Node `20.19.0`.

Ticket `001` still has browser login verification outstanding. Ticket `002` still has exact-head automated checks and browser desktop/mobile/keyboard/console verification outstanding.

References:

- `tickets/001-owner-login.md`
- `tickets/002-vertical-profile.md`
- `context/current-state.md`
- `.github/workflows/ci.yml`
- `package.json`
- `client/package.json`
- `server/src/modules/verticals/vertical-profile.routes.ts`
- `server/src/middleware/error-handler.ts`
- GitHub Actions run `33288679513`

The failure details above are independently observed repository/CI evidence. No implementation fix or successful rerun is claimed by this ticket.

## Scope

- Resolve the server-side vertical-profile validation failure so invalid profile input produces the intended client-safe validation response rather than a generic 500.
- Resolve the Node/test-tooling compatibility mismatch so the declared supported runtime, CI runtime, lockfile, and frontend test dependencies are mutually compatible.
- Preserve the existing authentication/session, trusted-origin, workspace-scoping, and vertical-profile behavior while fixing the verification failures.
- Run the full configured automated verification on the exact implementation head: tests, typecheck, lint, and production build.
- Complete browser verification for owner login/session protection and vertical-profile create/view/edit behavior at relevant desktop and mobile widths, including keyboard use and console/network inspection.
- After verification, synchronize Ticket 001, Ticket 002, and project status documentation so they reflect observed evidence rather than stale pre-merge state.

## Exclusions

- No campaign creation, LinkedIn/Apify discovery, prospect qualification, enrichment, Hunter/NVIDIA integration, outreach, replies, opportunities, or metrics.
- No production deployment, release, merge, outbound execution, or provider credential changes.
- No branch-protection/ruleset administration as part of this ticket.
- No unrelated refactor, dependency modernization, or UI redesign beyond what is required to restore compatibility and verification.

## Expected Experience

1. The owner opens LeadRadar and can sign in with the seeded owner credentials.
2. Unauthenticated navigation to protected application areas redirects to login rather than exposing protected content.
3. After authentication, the owner can load the vertical profile, create it when empty, edit it, save valid changes, and see the persisted result after reload.
4. Invalid vertical-profile data is rejected as a validation error without producing an internal-server-error response.
5. The full automated verification suite passes on the exact implementation head, and browser review finds no blocking console/network/accessibility issue in the login/profile path.

Relevant states:

- Loading: Login/session/profile loading states remain usable and do not expose stale protected content.
- Empty: A workspace with no vertical profile presents the existing create-profile state and can successfully save the first profile.
- Validation: Invalid login/profile input is reported as an expected user-facing validation/auth error; invalid profile API input returns a 4xx validation response, not 500.
- Error: Server/network failures remain understandable to the owner and do not leak internal error details or secrets.
- Success: Login establishes a valid server-verifiable session; profile create/update persists and reloads successfully; automated checks are green.

## Constraints

- Preserve the approved LeadRadar V1 stack and modular-monolith boundaries.
- Keep authentication, origin protection, session storage, workspace scoping, and other deterministic controls intact.
- Do not expose raw Zod/internal exception details or secrets in API responses while correcting validation handling.
- Use one explicitly supported Node baseline consistently across `package.json`, CI, local verification instructions, and compatible dependencies. The exact version/remediation must be confirmed during implementation planning from current dependency and deployment-target compatibility rather than assumed.
- Prefer the smallest compatible dependency/version changes; do not add unrelated dependencies.
- `package-lock.json` changes must correspond only to approved compatibility changes.
- Preserve unrelated user/repository changes.

## Acceptance Criteria

- [x] Invalid `PUT /api/v1/vertical-profile` input covered by the existing failing test returns the intended `400` validation response with the project-standard safe error shape instead of `500`.
- [x] Client Vitest suites start and execute successfully under the same supported Node baseline used by CI, with no engine incompatibility that invalidates the test run.
- [x] `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` all pass on the exact implementation head and the results are recorded.
- [ ] In a browser, valid owner login reaches the protected application, logout/session expiry protection works as specified, and unauthenticated protected navigation redirects to login.
- [ ] In a browser, the vertical profile supports empty/create, load, edit, save, validation/error, and persisted-reload behavior.
- [ ] Login and vertical-profile flows are inspected at desktop and mobile widths with keyboard navigation plus console/network review; no in-scope `Must fix` remains.
- [x] Existing authentication/session/origin/workspace-scoping safety behavior remains unchanged except for the intended validation/compatibility fixes.
- [x] `tickets/001-owner-login.md`, `tickets/002-vertical-profile.md`, and relevant project-status documentation are updated only after verification to match observed results.

The three unchecked criteria are **Not run**, not waived: browser automation is unavailable in this environment, and by explicit instruction no browser-testing dependency was added. HTTP-level runtime verification was used as the best available automated evidence and covers the API contract only — not client-side redirects, rendered layout, focus order, or browser console output. This ticket stays `verifying` until the browser pass is actually performed.

## Implementation Plan — Complete After Inspection

Inspection:

- Reviewed current `tickets/README.md`, `tickets/002-vertical-profile.md`, `context/current-state.md`, `.github/workflows/ci.yml`, `package.json`, `client/package.json`, `server/src/modules/verticals/vertical-profile.routes.ts`, `server/src/middleware/error-handler.ts`, and the latest observed failing `main` workflow run/job logs.

Affected files:

- `server/src/modules/verticals/vertical-profile.routes.ts` and/or `server/src/middleware/error-handler.ts` — convert schema-validation failures into the established safe 4xx validation contract at the smallest appropriate boundary.
- `server/src/modules/verticals/vertical-profile.routes.test.ts` — preserve/extend regression coverage for invalid profile input as needed.
- `package.json`, `client/package.json`, `.github/workflows/ci.yml`, and `package-lock.json` — align the supported Node/test dependency/CI compatibility contract if required by the chosen remediation.
- Existing client/login/profile tests — modify only if required to make valid tests compatible and deterministic; do not weaken assertions merely to make CI green.
- `tickets/001-owner-login.md`, `tickets/002-vertical-profile.md`, `context/current-state.md`, `roadmap.md`, and `README.md` — synchronize verified lifecycle/status statements after successful checks and browser review where those files are stale.

Approach:

- Reproduce the two observed CI failure classes before changing code.
- Fix validation handling at the narrowest reusable boundary that preserves the API error contract and does not leak raw validation internals.
- Resolve runtime/test dependency incompatibility by selecting one supported Node baseline and compatible dependency set, preferring the smallest change that remains appropriate for LeadRadar's current runtime target.
- Run targeted regression tests first, then the full repository checks.
- Run the existing app with a test/runtime MongoDB configuration and perform the outstanding browser verification for login and vertical profile.
- Update lifecycle evidence only from observed results.

Dependencies:

- No new product dependency is expected.
- Version changes to existing test/runtime tooling may be required. Exact package/version changes are pending implementation planning and compatibility verification.

Risks and assumptions:

- Risk: changing the Node baseline can affect local development and future hosting compatibility; verify the selected baseline before committing the change.
- Risk: handling all Zod errors globally could accidentally change unrelated API behavior; prefer a deliberate validation-error contract with regression coverage.
- Risk: changing dependency versions solely to silence CI can hide a real runtime mismatch; verify tests actually execute.
- Assumption: the existing login/profile product requirements remain unchanged; this ticket is stabilization and verification, not redesign.

Unresolved questions:

- Exact Node version/dependency remediation is intentionally left to implementation planning after compatibility inspection; the required outcome is one consistent, supported, passing baseline.

Approval:

- Not requested. Ticket generation does not authorize implementation, commit, push, merge, deployment, or release.

## Verification

Automated:

- Reproduce the current failing vertical-profile validation test before the fix.
- Reproduce the current client test-environment failure under the repository/CI Node baseline before compatibility changes.
- Run targeted server vertical-profile tests and all client tests after the fixes.
- Run `npm test`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Inspect the GitHub Actions result for the exact branch/PR head; do not infer success from local checks alone when CI is part of the ticket finish line.

Experience:

- Seed/start the application against an appropriate MongoDB test/runtime configuration.
- Verify valid login, invalid login, protected-route redirect, authenticated session, and logout behavior.
- Verify vertical-profile empty/create, load, edit/save, invalid-input, server-error handling, and persisted reload.
- Check desktop and mobile widths, keyboard navigation/focus, console errors, and failed/unexpected network requests.

Review:

- Compare the diff with this ticket, `tickets/001-owner-login.md`, `tickets/002-vertical-profile.md`, `review.md`, and the applicable PRD/SPEC requirements.
- Confirm tests were fixed rather than bypassed or weakened.
- Confirm no campaign/provider/outreach work, unrelated refactor, or unapproved deployment/configuration change entered the diff.

## Completion Handoff

Implemented and automatically verified on 2026-09-11 at `fix/003-stabilize-foundation`, branched from `main` at `8468dc2`. **Not complete** — browser verification is outstanding.

Inspection found **four** red checks on `main`, not the two named in this ticket. CI run `33288679513` stopped at `npm test` and never reached typecheck or build, which understated the breakage.

Changes:

- `server/src/modules/verticals/vertical-profile.routes.ts` — `PUT` now uses `safeParse` and throws `validationError()` on failure, matching the existing pattern in `auth.routes.ts`. Added `toCompanySize()`, which drops the `null` min/max Mongoose reports for an unset optional subdocument field.
- `server/src/modules/verticals/vertical-profile.routes.test.ts` — the invalid-input test now asserts the `VALIDATION_ERROR` code and that no zod issues, stack, or field names leak. Two new tests cover the optional `companySize` round-trip and its omission when unset.
- `client/src/pages/DashboardPage.test.tsx` — the save assertion now reads the first `mutationFn` argument, because `@tanstack/react-query` 5.102.8 calls it as `(variables, context)`. Assertion strength is unchanged; no production code changed.
- `package.json`, `.github/workflows/ci.yml`, `package-lock.json` — Node baseline `20.19.0` to `22.22.2`. The lockfile change is the root `engines.node` field only; no dependency was added, removed, or re-resolved.
- `client/vite.config.ts`, `client/tsconfig.json` — the client now resolves `@leadradar/shared` to its TypeScript source instead of its CommonJS `dist`. The shared package compiles to CJS for the Node server, and Vite does not pre-bundle linked workspace packages, so the browser received `exports.API_BASE_PATH = …` and failed with `does not provide an export named 'API_BASE_PATH'`, rendering a blank page. A Vite `resolve.alias` plus a matching tsconfig `paths` entry keeps type and runtime resolution identical. Server consumption of `dist` is unchanged.
- `tickets/001-owner-login.md`, `tickets/002-vertical-profile.md`, `context/current-state.md`, `roadmap.md`, `README.md` — synchronized to observed evidence.

Acceptance criteria:

- Met: invalid `PUT /api/v1/vertical-profile` input returns 400 `VALIDATION_ERROR` with the safe error shape; client Vitest suites start and pass under the supported baseline; `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` all pass and are recorded; authentication, session, trusted-origin, and workspace-scoping behaviour is unchanged and re-verified.
- Not met: the three browser criteria (login/session in a browser, vertical profile in a browser, desktop/mobile/keyboard/console review). Browser automation is unavailable in this environment and none was added.

Checks (Node 22.22.2, npm 10.9.7):

- Passed: `npm test` (exit 0 — 9 server suites / 66 tests, 3 client files / 16 tests); `npm run typecheck` (exit 0); `npm run lint` (exit 0); `npm run build` (exit 0); HTTP-level runtime verification against the built server process and an in-memory MongoDB (37/37 checks).
- Failed: none after the fix. Before it: `npm test` 1 server + 1 client failure, `npm run typecheck` exit 2, `npm run build` exit 2.
- Not run: browser desktop/mobile/keyboard/console verification; GitHub Actions on the fixed head — the branch is unpushed, and no push, PR, merge, or deployment was performed.

Review findings:

- Must fix: none outstanding in code. The browser pass remains an open acceptance gap for this ticket.
- Should fix: `engines.node: ">=22.22.2"` permits Node 23 and 25, which `jsdom@30` excludes; a `<23` bound or a documented LTS-only policy would close the gap. Carried forward from ticket 001: the login rate limiter still uses a per-process memory store.
- Okay to ship: the client bundle is 731 kB (176 kB gzip) and emits Vite's 500 kB chunk warning; pre-existing and out of scope.

Limitations:

- Local evidence only. CI on the fixed head is unverified.
- HTTP-level runtime verification exercises the API contract, not the rendered UI: no evidence exists for client-side redirects, focus order, responsive layout, or browser console output.
- No deployment or production-health conclusion is in scope or supported.

Human-review items:

- The Node baseline moved from 20.19.0 to 22.22.2. Confirm this matches the intended hosting target before the change is published.
- Run the browser pass and then close the three outstanding acceptance criteria.
