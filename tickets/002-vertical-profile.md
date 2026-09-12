---
ticket_schema: 1
id: "002"
title: "Editable vertical profile"
status: verifying
---

# Editable vertical profile

## Outcome

The authenticated owner can create, view, and edit the single V1 vertical profile that defines qualification targeting and outreach intent.

## Acceptance criteria

- [x] Shared validated contract covers name, offer, target roles, target industries, optional company size, target regions, positive/negative signals, `BOOK_CALL`, outreach tone, and versioned responses.
- [x] Durable `VerticalProfile` records are scoped by `workspaceId`.
- [x] Authenticated `GET /api/v1/vertical-profile` returns the current workspace profile or 404 when none exists.
- [x] Authenticated `PUT /api/v1/vertical-profile` creates or updates the workspace profile and increments its version.
- [x] State-changing requests use the existing trusted-origin and JSON-content guards.
- [x] The authenticated dashboard provides an editable profile form and handles loading, empty, success, and error states.
- [x] Server and client automated tests are included for the vertical-profile flow.
- [x] `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass on the exact branch head.
- [ ] Browser desktop/mobile/keyboard/console verification is complete or explicitly accounted for.

## Verification state

Automated checks were red on `main` and were repaired under `tickets/003-stabilize-foundation.md`. Observed locally on 2026-09-11 at `fix/003-stabilize-foundation` (Node 22.22.2, npm 10.9.7):

- `npm test` — Passed — 66 server (Jest + Supertest) and 16 client (Vitest + RTL) tests.
- `npm run typecheck` — Passed — exit 0 across all three workspaces.
- `npm run lint` — Passed — exit 0.
- `npm run build` — Passed — shared, server, and client build.
- HTTP-level runtime verification against the built server and an in-memory MongoDB — Passed — 37/37 checks, covering profile empty/404, create (v1), load, edit (v2), persisted reload, optional `companySize` round-trip, invalid input → 400 `VALIDATION_ERROR`, untrusted origin → 403, non-JSON → 415, and malformed JSON → 400.

GitHub Actions has **not** been observed for this head; the branch has not been pushed.

Browser desktop/mobile/keyboard/console verification remains **Not run** — no browser automation is available in this environment and none was added. This criterion is outstanding, not waived.

## Scope boundary

No campaigns, discovery providers, qualification, enrichment, outreach, replies, deployment, or live outbound execution are part of this ticket.
