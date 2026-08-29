# LeadRadar Roadmap

## Current goal

Implement the approved LeadRadar V1 product defined by `docs/PRD.md` and `docs/SPEC.md`, proving the core path from a public LinkedIn post signal to qualified prospects, approved outreach, reply handling, and call-ready opportunities while preserving deterministic safety controls and human approval boundaries.

Current lifecycle: **In progress**. Owner authentication is implemented and automatically verified; the rest of V1 remains specified.

## Ordered V1 outcomes

The following order reflects the dependency flow in the approved PRD/SPEC and is intended to be decomposed into small delivery tickets before implementation.

1. **Foundation and owner access — Partially implemented**
   - Establish the npm-workspace application structure, shared contracts, configuration, MongoDB connection, single-owner authentication, workspace, and editable vertical profile.
   - Delivered by `tickets/001-owner-login.md` (`verifying`): workspace structure, shared contracts, configuration, MongoDB connection, seeded owner/workspace, and the authenticated session. Automated checks pass; the browser pass is outstanding.
   - Remaining: the editable vertical profile (`docs/SPEC.md` §5.3, §8.2), which needs its own ticket.
2. **Campaign intake and public comment discovery — Specified**
   - Create a campaign from a supported public LinkedIn post URL and ingest public comments through the Apify adapter asynchronously.
3. **Canonical prospects, signals, deduplication, and qualification — Specified**
   - Normalize commenters into durable prospects/signals, deduplicate across campaigns, and apply schema-valid NVIDIA qualification with `QUALIFIED | REVIEW | REJECTED` outcomes.
4. **Enrichment and deterministic contact eligibility — Specified**
   - Enrich qualified prospects through Hunter, verify business email, evaluate versioned outreach policy, and enforce suppression/relationship safety rules.
5. **Sequence drafting, review, approval, and outreach release — Specified**
   - Generate the 2–3 email sequence, allow edits, show the eligible batch, require explicit campaign approval, then release only approved eligible prospects through Hunter.
6. **Reply ingestion and opportunity workflow — Specified**
   - Idempotently ingest genuine replies, pause automated follow-ups before AI classification, classify intent, draft human-reviewed responses, and surface Opportunity Inbox states through `READY_TO_BOOK` and `BOOKED`.
7. **Outcome metrics, retention, resilience, and full-flow verification — Specified**
   - Provide campaign funnel metrics, retention handling, retries/idempotency/failure visibility, and verified desktop/mobile/error/accessibility coverage for the complete V1 flow.

`/morning-brief` or `/deliver-ticket <task>` selects the smallest next outcome. The next one is the editable vertical profile, completing outcome 1.

## Explicit V1 exclusions

- public signup, teams, invitations, RBAC, or organization administration;
- billing/subscriptions;
- multiple saved vertical profiles in the UI;
- arbitrary workflow automation or advanced CRM pipelines;
- contact imports/exports and advanced task/tag automation;
- native Gmail/Microsoft OAuth or custom email-delivery infrastructure;
- autonomous AI replies;
- calendar OAuth, scheduling platform, or automatic meeting creation;
- LinkedIn DMs, authenticated LinkedIn scraping, credential/cookie storage, or reaction/like extraction;
- proprietary enrichment database;
- microservices, Kafka, or distributed event streaming;
- production deployment as part of the requirements package.

## Definition of done for V1

V1 is not complete because the PRD, specification, tickets, plans, commits, or pull requests exist. Completion requires observed evidence that the approved primary user journey and safety invariants are implemented and verified, required automated checks pass or are explicitly accounted for under an approved limitation, user-facing flows are reviewed at relevant desktop/mobile states, no in-scope `Must fix` remains, and project truth is synchronized.
