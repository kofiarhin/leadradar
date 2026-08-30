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
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` pass on the exact branch head.
- [ ] Browser desktop/mobile/keyboard/console verification is complete or explicitly accounted for.

## Verification state

Automated checks are pending. GitHub Actions CI was added on this branch and PR #3 is open to trigger verification. Browser verification has not yet been run.

## Scope boundary

No campaigns, discovery providers, qualification, enrichment, outreach, replies, deployment, or live outbound execution are part of this ticket.
