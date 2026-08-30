---
ticket_schema: 1
status: ready
---

# 004 — Prospect normalization, signals, deduplication, and qualification

## Outcome
Discovery results become canonical workspace-scoped Prospects and Signals, deduplicated across campaigns, then NVIDIA returns schema-valid QUALIFIED/REVIEW/REJECTED decisions.

## Acceptance criteria
- Prospect, Signal, and CampaignProspect models/indexes match SPEC intent.
- One person discovered in multiple campaigns reuses the canonical Prospect when resolvable and adds distinct Signals.
- NVIDIA adapter is OpenAI-compatible, model configurable, and validates structured output.
- QUALIFIED schedules enrichment; REVIEW stops for manual resolution; REJECTED stops automatic processing.
- Qualification provenance stores confidence, reason, model, time, and vertical profile version.
- Retention class is updated according to outcome.
- Campaign detail shows qualification state/reason.
- Tests cover deduplication, schema rejection, transitions, and workspace isolation.
