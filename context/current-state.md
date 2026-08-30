# LeadRadar Current State

## Specified

- `docs/PRD.md` — approved LeadRadar V1 product requirements.
- `docs/SPEC.md` — approved LeadRadar V1 technical specification.

## In Progress / Verifying

- `tickets/001-owner-login.md` — `verifying`; automated owner-auth checks previously passed, browser pass remains outstanding.
- `tickets/002-vertical-profile.md` — merged to `main`; implementation exists, exact-head CI/browser evidence remains incomplete.
- `tickets/003-campaign-discovery.md` through `tickets/008-metrics-resilience.md` — implementation-complete on the stacked feature branch chain ending at `feat/008-metrics-resilience`; verification is not yet proven.

## Implemented on stacked branches

The branch chain implements the approved V1 architecture and primary workflow:

- public LinkedIn campaign intake and asynchronous Apify discovery;
- MongoDB-backed jobs with atomic claiming, retry scheduling, dead state, and a separate worker process;
- canonical workspace-scoped Prospects, Signals, and CampaignProspects with provider-event/dedupe indexes;
- NVIDIA structured qualification with `QUALIFIED | REVIEW | REJECTED` routing and retention-class updates;
- Hunter business-email discovery/verification adapter;
- deterministic outreach-policy evaluations with version/reason persistence;
- durable suppression checks and active-relationship blocking;
- NVIDIA 2–3 step sequence drafting, user edits, approval versioning, and reapproval on post-approval edits;
- immediate release-time rechecks of approval, verification, policy, suppression, and active relationship state;
- outbound provider writes disabled by default through `OUTBOUND_MODE=disabled`;
- Hunter webhook idempotency using `IntegrationEvent`;
- inbound reply persistence and deterministic outreach pause before NVIDIA classification;
- reply intent classification and AI draft responses;
- explicit human review/edit/send action for conversational replies, with live send blocked unless outbound mode is separately enabled;
- durable outbound `MANUAL_REPLY` message persistence only after Hunter reports successful send;
- manual `READY_TO_BOOK`, `BOOKED`, and follow-up opportunity controls;
- campaign metric recomputation from authoritative records;
- dashboard aggregate outcome cards for active campaigns, qualified prospects, verified prospects, replies, opportunities, ready-to-book, and booked calls;
- rejected-temporary signal retention cleanup;
- Leads search/filter API and UI, Opportunities Inbox UI, campaign creation/detail/sequence-review UI;
- focused automated coverage for deterministic outreach-policy decisions, NVIDIA structured-output validation, and the outbound-disabled human-reply boundary;
- configurable Apify Actor ID, NVIDIA model, Hunter API key, and provider secrets through environment configuration.

## Deliberately excluded by approved V1 scope / execution contract

- production deployment/release;
- public signup, teams/RBAC, billing;
- authenticated LinkedIn scraping, LinkedIn credentials/cookies, DMs, or reactions;
- autonomous conversational replies;
- calendar OAuth or automatic meeting creation;
- native Gmail/Microsoft OAuth or custom email infrastructure;
- live outbound execution under the current implementation contract.

## Verification

Previously observed on the owner-auth foundation:

- `npm test` — Passed: 59 server tests and 15 client tests at that earlier revision.
- `npm run typecheck`, `npm run lint`, `npm run build` — Passed at that earlier revision.
- owner-auth runtime verification against in-memory MongoDB — Passed at that earlier revision.

For the new stacked V1 implementation ending at `feat/008-metrics-resilience`:

- `npm test` — **Not run / not observed** on the exact branch head.
- `npm run typecheck` — **Not run / not observed** on the exact branch head.
- `npm run lint` — **Not run / not observed** on the exact branch head.
- `npm run build` — **Not run / not observed** on the exact branch head.
- GitHub Actions — no usable exact-head run has been observed through the connector.
- browser desktop/mobile/keyboard/accessibility verification — **Not run**.
- live Apify/NVIDIA/Hunter calls — **Not run**; adapters were implemented against revalidated provider contracts without exercising customer credentials.
- live outbound email — **Not run by design**.

The new V1 work is therefore implementation-complete but remains `verifying`, not `delivered`.

## Released

None. No production deployment or release evidence exists.

## Unresolved

- Exact-head automated verification and browser review for the stacked V1 branch are outstanding.
- Provider contract tests and safe credentialed smoke tests remain outstanding.
- Hunter webhook authenticity/signature verification must be confirmed against the exact production webhook mechanism before production exposure.
- The login rate limiter remains per-process memory storage and must become shared before horizontal web scaling.
- No real customer evidence exists under `customers/` yet.
