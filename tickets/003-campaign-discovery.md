---
ticket_schema: 1
status: verifying
---

# 003 — Campaign intake and public comment discovery

## Outcome
An authenticated owner can create a campaign from a supported public LinkedIn post URL. LeadRadar starts public-comment discovery asynchronously through the Apify adapter, records provider run state, and exposes discovery progress/failure without blocking the request.

## Scope
- Campaign and Job persistence required by this slice.
- Shared campaign/job contracts.
- Supported LinkedIn public-post URL validation.
- `POST /api/v1/campaigns`, campaign list/detail reads.
- Config-driven Apify Actor/token adapter with no LinkedIn credentials or cookies.
- Asynchronous discovery job creation and worker handling.
- Normalized discovery-result envelope ready for downstream ingestion.
- New Campaign and Campaign Detail UI states.

## Acceptance criteria
- Campaign stores workspace, vertical profile/version, source URL, status, sequence defaults, metrics defaults.
- Creating a valid campaign returns immediately and schedules discovery work.
- Invalid/non-supported source URLs are rejected deterministically.
- Apify provider-specific behavior stays behind its adapter and Actor ID is configuration-driven.
- No authenticated LinkedIn session material is accepted or stored.
- Discovery provider run ID/start/completion/failure state is persisted.
- Provider failures are visible and retryable through job state rather than silently swallowed.
- Automated tests cover validation, workspace scoping, job creation, and adapter contract behavior.
- `npm test`, typecheck, lint, build and relevant browser flow are reported only from observed evidence.

## Out of scope
Prospect normalization, NVIDIA qualification, Hunter enrichment, outreach, reply handling, deployment.
