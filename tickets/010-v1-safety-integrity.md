# 010 — V1 safety and integrity fixes

Status: verifying
Branch: `fix/010-v1-safety-integrity`
Base: `feat/009-spec-gap-closure`

## Goal

Close the six critical V1 audit gaps without expanding product scope.

## Locked decisions

- Automatic outreach: `GB` and `US` only; other or unknown countries go to `REVIEW`; suppression and active outreach relationships block new outreach.
- NVIDIA: confidence below `0.70` goes to `REVIEW`; invalid/failed output retries once, then fails safe to `REVIEW` for qualification/classification.
- Discovery identity: prefer provider comment ID; fallback is deterministic from post URL + profile identity + full comment text.
- Jobs: every new job receives a durable deterministic idempotency key.
- Manual replies: verified email, suppression, and current outreach policy are rechecked immediately before Hunter send.
- Reply routing: `OUT_OF_OFFICE` creates no sales opportunity; AI `REVIEW` maps to `NEEDS_REVIEW`.

## Acceptance criteria

- Duplicate logical job enqueue attempts do not create duplicate job records.
- GB/US known business contacts may be automatically allowed; unknown/other regions require review.
- Current manual policy approval can satisfy a release/send recheck, but suppression/BLOCKED always wins.
- Manual replies cannot bypass unresolved policy or suppression.
- Apify result ordering cannot change fallback Signal identity.
- NVIDIA calls have a timeout, one repair retry, confidence gating, constrained reply actions, and persisted model/prompt/schema metadata.
- OOO replies remain paused/replied without creating an Opportunity; uncertain classifications enter `NEEDS_REVIEW`.

## Verification

Required: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

Current evidence: Not run. The repository CI workflow does not run on ordinary feature-branch pushes, and this ticket does not authorize opening a pull request.

## Out of scope

Heroku frontend serving, API contract cleanup, broader metrics/workspace hardening, dark-theme integration, merge, and deployment.
