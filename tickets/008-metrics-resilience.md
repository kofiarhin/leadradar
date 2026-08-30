---
ticket_schema: 1
status: ready
---

# 008 — Metrics, retention, resilience, and full-flow verification

## Outcome
LeadRadar exposes outcome metrics, applies retention rules, provides resilient MongoDB-backed job processing with retry/idempotency/failure visibility, and the full V1 flow is verification-ready.

## Acceptance criteria
- Campaign metrics snapshot is recomputed from authoritative records.
- Dashboard exposes active campaigns, qualified, verified, replies, opportunities, ready-to-book, and booked counts.
- Rejected temporary signals expire after the configured retention window; qualified durable/review/suppression records follow PRD rules.
- Job claiming is concurrency-safe, has attempts/runAt/lock/error/dead handling, and retries only according to configured policy.
- Integration/provider failures remain visible and do not silently corrupt lifecycle state.
- Separate worker process drains the MongoDB jobs collection.
- Leads screen supports required search/filters/source navigation.
- Full user-facing flow has automated coverage plus desktop/mobile/loading/empty/error/success/keyboard/accessibility verification where tooling exists.
- Project truth documents reflect observed implementation and verification without claiming deployment.
