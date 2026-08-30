# LeadRadar Current State

## Specified

- `docs/PRD.md` — approved LeadRadar V1 product requirements.
- `docs/SPEC.md` — approved LeadRadar V1 technical specification.

## In Progress / Verifying

- `tickets/001-owner-login.md` — `verifying`; automated owner-auth checks previously passed, browser pass remains outstanding.
- `tickets/002-vertical-profile.md` — merged to `main`; implementation exists, exact-head CI/browser evidence remains incomplete.
- `tickets/003-campaign-discovery.md` through `tickets/008-metrics-resilience.md` — implemented through the stacked branch chain.
- `feat/009-spec-gap-closure` — closes the V1 spec gaps identified by the 2026-08-30 repository audit; exact-head verification remains pending.

## Implemented on feature branches

The current branch chain implements the approved V1 architecture and primary workflow, including:

- public LinkedIn campaign intake and asynchronous Apify discovery;
- MongoDB-backed jobs with atomic claiming, retry scheduling, dead state, stale `RUNNING` lease recovery, and a separate worker process;
- operational workspace-scoped daily rejected-signal retention jobs;
- canonical workspace-scoped Prospects, Signals, and CampaignProspects with provider-event/dedupe indexes;
- NVIDIA structured qualification with `QUALIFIED | REVIEW | REJECTED` routing and retention-class updates;
- explicit human resolution for qualification `REVIEW` and outreach-policy `REVIEW`;
- Hunter business-email discovery/verification adapter;
- deterministic outreach-policy evaluations with version/reason persistence, including release-time recheck evidence;
- durable suppression checks and active-relationship blocking;
- NVIDIA 2–3 step sequence drafting, user edits, approval versioning, and reapproval on post-approval edits;
- durable snapshot of the exact prospect batch approved with the reviewed sequence;
- one campaign-level Hunter sequence configured from the reviewed copy before approved recipients are added;
- immediate release-time rechecks of approval, verification, policy, suppression, and active relationship state;
- Hunter campaign terminal-state reconciliation from the provider's pending-message queue;
- outbound provider writes disabled by default through `OUTBOUND_MODE=disabled`;
- Hunter webhook idempotency using `IntegrationEvent` plus a fail-closed configured shared-secret URL token because Hunter's current public webhook documentation does not expose a request-signature mechanism;
- inbound reply persistence, provider-side scheduled-email cancellation, then deterministic local pause before NVIDIA classification;
- separate `PROCESS_REPLY` and `CLASSIFY_REPLY` jobs;
- reply intent classification and AI draft responses;
- explicit human review/edit/send action for conversational replies, using a configured Hunter sender account and idempotency key;
- durable outbound `MANUAL_REPLY` persistence only after Hunter reports successful send;
- manual `READY_TO_BOOK`, `BOOKED`, and follow-up opportunity controls;
- campaign metric recomputation from authoritative records;
- dashboard aggregate outcome cards;
- Leads search plus qualification/contact/outreach/intent/campaign filters;
- full Prospect Detail payload and UI with signal history, campaign decisions, conversation history, opportunities, and review actions;
- Campaign Detail prospect rows with qualification/contact/policy/release state and attention states;
- separate Heroku `web` and `worker` process declarations through `Procfile`;
- focused regression coverage for deterministic policy decisions, NVIDIA structured output, Hunter sequence/cancellation/manual-send contracts, webhook authentication, stale worker leases, and the outbound-disabled human-reply boundary;
- configurable Apify Actor ID, NVIDIA model, Hunter API key, Hunter sender account, webhook secret, and outbound mode through environment configuration.

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

For the current stacked V1 implementation ending at `feat/009-spec-gap-closure`:

- `npm test` — **Not yet observed** on the exact branch head.
- `npm run typecheck` — **Not yet observed** on the exact branch head.
- `npm run lint` — **Not yet observed** on the exact branch head.
- `npm run build` — **Not yet observed** on the exact branch head.
- GitHub Actions — no usable exact-head run has yet been observed through the connector.
- browser desktop/mobile/keyboard/accessibility verification — **Not run**.
- safe credentialed Apify/NVIDIA/Hunter smoke tests — **Not run**.
- live outbound email — **Not run by design**.

The V1 implementation therefore remains `verifying`, not `delivered`.

## Released

None. No production deployment or release evidence exists.

## Unresolved

- Exact-head automated verification and browser review are outstanding.
- Safe credentialed provider smoke tests remain outstanding.
- Hunter webhook protection currently uses a configured shared-secret callback URL because Hunter's current public documentation does not document webhook request signatures. Revalidate and prefer a native signature mechanism if Hunter adds one.
- The login rate limiter remains per-process memory storage and must become shared before horizontal web scaling.
- No real customer evidence exists under `customers/` yet.
