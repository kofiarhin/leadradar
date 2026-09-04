---
ticket_schema: 1
id: "003"
title: "Restore green CI and verify foundation"
status: ready
---

# 003: Restore green CI and verify login + vertical profile

Status: Ready for planning
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

- [ ] Invalid `PUT /api/v1/vertical-profile` input covered by the existing failing test returns the intended `400` validation response with the project-standard safe error shape instead of `500`.
- [ ] Client Vitest suites start and execute successfully under the same supported Node baseline used by CI, with no engine incompatibility that invalidates the test run.
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` all pass on the exact implementation head and the results are recorded.
- [ ] In a browser, valid owner login reaches the protected application, logout/session expiry protection works as specified, and unauthenticated protected navigation redirects to login.
- [ ] In a browser, the vertical profile supports empty/create, load, edit, save, validation/error, and persisted-reload behavior.
- [ ] Login and vertical-profile flows are inspected at desktop and mobile widths with keyboard navigation plus console/network review; no in-scope `Must fix` remains.
- [ ] Existing authentication/session/origin/workspace-scoping safety behavior remains unchanged except for the intended validation/compatibility fixes.
- [ ] `tickets/001-owner-login.md`, `tickets/002-vertical-profile.md`, and relevant project-status documentation are updated only after verification to match observed results.

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

Pending implementation and verification.

Changes:

- Pending implementation.

Acceptance criteria:

- Not yet verified.

Checks:

- Passed: None for this ticket yet.
- Failed: Current observed `main` CI run `33288679513` fails during `npm test`; server vertical-profile validation returns 500 instead of expected 400, and client Vitest workers fail under the configured Node 20.19.0 baseline because installed test dependencies require newer Node versions.
- Not run: Post-fix exact-head checks and browser verification; implementation has not been authorized or performed by this ticket.

Review findings:

- Must fix: Current required verification is red and browser verification for the existing foundation remains incomplete.
- Should fix: Synchronize stale project lifecycle/status documentation after the underlying checks are actually completed.
- Okay to ship: Not established.

Limitations:

- No post-fix evidence exists yet.
- No deployment or production-health conclusion is in scope or supported.

Human-review items:

- Review any proposed Node baseline/dependency compatibility change during implementation planning if it materially changes supported runtime expectations.
