---
ticket_schema: 1
status: verifying
---

# 005 — Enrichment and deterministic contact eligibility

## Outcome
Qualified prospects are enriched through Hunter, business email is verified, deterministic outreach policy is evaluated, and suppression/relationship safety determines eligibility.

## Acceptance criteria
- Hunter finder/verifier adapter is isolated and API V2 configuration is explicit.
- Only acceptable verified business email can automatically become ELIGIBLE.
- Webmail/personal, invalid, unknown, or insufficient results do not automatically proceed.
- Outreach policy returns ALLOWED/REVIEW/BLOCKED with version and reason codes; unknown jurisdiction/type defaults REVIEW.
- Suppression records are durable and override ALLOWED.
- Duplicate active outreach/existing active conversation blocks automatic release.
- CampaignProspect release state reflects deterministic decisions.
- Tests cover provider mapping, policy defaults, suppression override, relationship checks, and workspace isolation.
